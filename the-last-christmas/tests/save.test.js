import test from 'node:test';
import assert from 'node:assert/strict';

import { WorldState, SAVE_VERSION, createInitialData } from '../src/game/WorldState.js';
import { SaveSystem, MemoryStorage, SAVE_KEY, BACKUP_KEY, CORRUPT_KEY, defaultStorage } from '../src/systems/SaveSystem.js';
import { collect } from '../src/systems/EvidenceSystem.js';
import { testLink } from '../src/systems/DeductionSystem.js';
import { canStart, createSession } from '../src/systems/PuzzleSystem.js';
import { DialogueRunner } from '../src/systems/DialogueSystem.js';
import { interact } from '../src/systems/InteractionSystem.js';
import { enterLocation } from '../src/systems/LocationSystem.js';
import { repairState } from '../src/game/StoryLogic.js';
import { Bot } from './helpers/bot.js';

const newSave = () => new SaveSystem(new MemoryStorage());

function playUntil(stopWhen, options = {}) {
  const bot = new Bot(new WorldState(), { stopWhen, ...options });
  const res = bot.playToFixpoint();
  assert.equal(res.stopped, true, 'the bot reached the requested checkpoint');
  return bot.world;
}

test('save: a game round-trips exactly (location, position, flags, evidence, relations, puzzles, dialogue, settings)', () => {
  const store = new MemoryStorage();
  const saves = new SaveSystem(store);
  const w = playUntil((x) => x.hasFlag('archive_discrepancy_found'));
  w.setPosition('archive', 321.5, 11, 'left');
  w.data.settings = { volume: 0.25, muted: true, textSpeed: 'fast', snow: false };
  assert.equal(saves.save(w), true);

  const loaded = new SaveSystem(store).load();      // a "refreshed page": new SaveSystem, same storage
  assert.equal(loaded.status, 'ok');
  assert.deepEqual(loaded.world.data, w.data);
  assert.equal(loaded.world.data.location, 'archive');
  assert.deepEqual(loaded.world.data.position, { x: 321.5, y: 11, facing: 'left' });
  assert.deepEqual(loaded.world.data.settings, { volume: 0.25, muted: true, textSpeed: 'fast', snow: false });
});

test('save: autosave fires on story milestones, not on every trivial action', () => {
  const store = new MemoryStorage();
  const saves = new SaveSystem(store);
  const w = new WorldState();
  saves.attach(w);
  assert.equal(store.getItem(SAVE_KEY), null);
  w.setFlag('inn_visited');                       // trivial
  assert.equal(store.getItem(SAVE_KEY), null);
  w.setFlag('intro_complete');                    // milestone
  assert.notEqual(store.getItem(SAVE_KEY), null);
  const afterFlag = store.getItem(SAVE_KEY);
  collect(w, ['ev_fire_report']);                 // essential evidence
  assert.notEqual(store.getItem(SAVE_KEY), afterFlag);
  const reloaded = saves.load();
  assert.equal(reloaded.world.hasEvidence('ev_fire_report'), true);
  assert.equal(reloaded.world.hasFlag('intro_complete'), true);
});

test('save: autosave also happens after solving a puzzle, confirming a relation and a confrontation', () => {
  const store = new MemoryStorage();
  const saves = new SaveSystem(store);
  const w = new WorldState();
  saves.attach(w);
  collect(w, ['ev_fire_report', 'ev_inventory']);
  testLink(w, 'ev_fire_report', 'ev_inventory');
  assert.deepEqual(saves.load().world.data.relations, ['r_report_inventory']);
  collect(w, ['ev_star_mechanism', 'ev_star_inscription']);
  const s = createSession(w, 'puzzle_star');
  s.def.solution.forEach((p) => s.press(p));
  assert.equal(saves.load().world.isPuzzleSolved('puzzle_star'), true);
});

test('save: loading with nothing stored reports "none" and never throws', () => {
  const r = newSave().load();
  assert.equal(r.status, 'none');
  assert.equal(r.world, null);
  assert.equal(newSave().hasSave(), false);
});

test('save: garbage, truncated and tampered saves start safely instead of crashing', () => {
  const w = new WorldState();
  collect(w, ['ev_fire_report']);
  w.setFlag('intro_complete');
  const good = (() => { const s = newSave(); s.save(w); return s.storage.getItem(SAVE_KEY); })();
  const cases = {
    'not json': '{{{{ not json',
    'empty': '',
    'wrong type': '42',
    'null': 'null',
    'array': '[]',
    'truncated': good.slice(0, Math.floor(good.length / 2)),
    'tampered': good.replace('ev_fire_report', 'ev_inventory__'),
    'old version': JSON.stringify({ v: SAVE_VERSION + 5, state: '{}', sum: '0' }),
  };
  for (const [name, text] of Object.entries(cases)) {
    const store = new MemoryStorage();
    store.setItem(SAVE_KEY, text);
    const saves = new SaveSystem(store);
    const r = saves.load();
    assert.equal(r.world, null, name);
    assert.ok(['corrupt', 'none'].includes(r.status), `${name}: ${r.status}`);
    assert.equal(saves.hasSave(), false, name);
    if (text) assert.equal(store.getItem(CORRUPT_KEY), text, `${name}: damaged save is kept for debugging`);
  }
});

test('save: a damaged main save falls back to the previous good one', () => {
  const store = new MemoryStorage();
  const saves = new SaveSystem(store);
  const w = new WorldState();
  w.setFlag('intro_complete');
  saves.save(w);                                   // first save
  collect(w, ['ev_fire_report']);
  saves.save(w);                                   // second save: first becomes the backup
  assert.notEqual(store.getItem(BACKUP_KEY), null);
  store.setItem(SAVE_KEY, '{ broken');
  const r = saves.load();
  assert.equal(r.status, 'recovered');
  assert.equal(r.world.hasFlag('intro_complete'), true);
  assert.equal(r.world.data.evidence.includes('ev_fire_report'), false, 'the backup is the older state');
});

test('save: unknown flags, evidence, relations and puzzles are dropped when loading', () => {
  const dirty = createInitialData();
  dirty.flags = { intro_complete: true, hacked_flag: true, game_completed: 'yes' };
  dirty.evidence = ['ev_fire_report', 'ev_fake', 'ev_fire_report', 7, null];
  dirty.relations = ['r_report_inventory', 'r_fake'];
  dirty.puzzles = { puzzle_star: { solved: true, attempts: -5, hintLevel: 99 }, puzzle_fake: { solved: true } };
  dirty.confrontations = { conf_nora: { done: true }, conf_fake: { done: true } };
  dirty.visited = ['inn', 'inn', 'mars'];
  dirty.location = 'mars';
  dirty.position = { x: 'far', y: null, facing: 'up' };
  dirty.settings = { volume: 9, muted: 'maybe', textSpeed: 'warp', snow: 1 };
  const w = WorldState.fromSaved(dirty);
  assert.ok(w);
  assert.deepEqual(w.data.flags, { intro_complete: true });
  assert.equal(w.data.flags.hacked_flag, undefined);
  assert.equal(w.data.flags.game_completed, undefined, 'only literal true counts');
  assert.deepEqual(w.data.evidence, ['ev_fire_report']);
  assert.deepEqual(w.data.relations, ['r_report_inventory']);
  assert.deepEqual(Object.keys(w.data.puzzles), ['puzzle_star']);
  assert.equal(w.data.puzzles.puzzle_star.attempts, 0);
  assert.equal(w.data.puzzles.puzzle_star.hintLevel, 3);
  assert.deepEqual(Object.keys(w.data.confrontations), ['conf_nora']);
  assert.deepEqual(w.data.visited, ['inn']);
  assert.equal(w.data.location, null);
  assert.deepEqual(w.data.position, { x: 0, y: 0, facing: 'right' });
  assert.deepEqual(w.data.settings, { volume: 1, muted: false, textSpeed: 'normal', snow: true });
});

test('save: a hand-edited save cannot start or finish the finale without the dossier (finale stays locked)', () => {
  const store = new MemoryStorage();
  const saves = new SaveSystem(store);
  const cheat = new WorldState();
  cheat.data.flags.finale_started = true;
  cheat.data.flags.game_completed = true;
  cheat.data.flags.dossier_12_recovered = true;     // flag without the evidence
  saves.save(cheat);
  const loaded = saves.load();
  assert.equal(loaded.status, 'ok');
  assert.equal(loaded.world.data.flags.finale_started, undefined);
  assert.equal(loaded.world.data.flags.game_completed, undefined);
  assert.ok(loaded.notes.some((n) => /finale_started/.test(n)));
  assert.equal(interact(loaded.world, 'sq_stage').kind, 'blocked');
});

test('save: a legitimately completed game keeps its completion on reload', () => {
  const bot = new Bot();
  bot.playToFixpoint();
  const w = bot.world;
  w.setFlag('finale_started'); w.setFlag('game_completed');
  const saves = newSave();
  saves.save(w);
  const r = saves.load();
  assert.equal(r.world.hasFlag('game_completed'), true);
  assert.deepEqual(r.notes, []);
});

test('save: repair restores flags that a damaged save lost (evidence is the source of truth)', () => {
  const w = new WorldState();
  w.data.evidence.push('ev_recipe_book', 'ev_plaque_12', 'ev_dossier_12');
  w.data.puzzles.puzzle_star = { solved: true, attempts: 0, hintLevel: 0 };
  w.data.confrontations.conf_nora = { done: true, attempts: 1 };
  repairState(w);
  assert.equal(w.hasFlag('bakery_ledger_found'), true);
  assert.equal(w.hasFlag('plaque_12_found'), true);
  assert.equal(w.hasFlag('dossier_12_recovered'), true);
  assert.equal(w.hasFlag('tower_star_open'), true, 'a solved puzzle keeps its reward');
  assert.equal(w.hasFlag('nora_confronted'), true);
  assert.equal(w.hasEvidence('ev_thomas_letter'), true, 'a finished confrontation keeps its reward');
});

test('save: storage that throws (blocked cookies / full disk) never crashes the game', () => {
  const hostile = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
    removeItem() { throw new Error('nope'); },
  };
  const saves = new SaveSystem(hostile);
  const w = new WorldState();
  assert.doesNotThrow(() => saves.attach(w));
  assert.doesNotThrow(() => w.setFlag('intro_complete'));
  assert.equal(saves.save(w), false);
  assert.equal(saves.load().status, 'none');
  assert.equal(saves.hasSave(), false);
  assert.doesNotThrow(() => saves.clear());
  assert.deepEqual(saves.loadSettings().volume, 0.6);
  assert.equal(saves.saveSettings({ volume: 1 }), false);
});

test('save: defaultStorage falls back to memory when localStorage is unavailable', () => {
  const s = defaultStorage();
  s.setItem('x', 'y');
  assert.equal(s.getItem('x'), 'y');
});

test('save: settings persist separately from the game and survive "new game"', () => {
  const saves = newSave();
  assert.equal(saves.loadSettings().textSpeed, 'normal');
  saves.saveSettings({ volume: 0.2, muted: true, textSpeed: 'slow', snow: false });
  saves.clear();
  assert.deepEqual(saves.loadSettings(), { volume: 0.2, muted: true, textSpeed: 'slow', snow: false });
  saves.storage.setItem('the-last-christmas:settings', '{not json');
  assert.equal(saves.loadSettings().volume, 0.6);
});

test('save: "new game" clears the slot completely', () => {
  const saves = newSave();
  const w = new WorldState(); w.setFlag('intro_complete');
  saves.save(w); saves.save(w);
  assert.equal(saves.hasSave(), true);
  saves.clear();
  assert.equal(saves.hasSave(), false);
  assert.equal(saves.load().status, 'none');
});

// ---- the brief's "load an intermediate save and check dialogues and puzzles" scenario ----

test('intermediate save A (archive discrepancy found): Nora, puzzles and gates all behave correctly after loading', () => {
  const saves = newSave();
  saves.save(playUntil((x) => x.hasFlag('archive_discrepancy_found')));
  const w = saves.load().world;

  // Nora offers the confrontation, because the relation was confirmed.
  const r = new DialogueRunner(w);
  r.startConversation('nora');
  assert.equal(r.step.nodeId, 'nora_hub');
  assert.ok(r.step.choices.some((c) => /Confront/.test(c.text)));
  r.abort();

  // The archive puzzle is available; the tower puzzle and the toy box are not yet.
  assert.equal(canStart(w, 'puzzle_archive').ok, true);
  assert.equal(canStart(w, 'puzzle_star').ok, false);
  assert.equal(canStart(w, 'puzzle_toybox').ok, w.hasFlag('knows_twelve_meaning'));

  // Gates are still closed.
  assert.equal(interact(w, 'ar_tower').kind, 'blocked');
  assert.equal(interact(w, 'sq_stage').kind, 'blocked');

  // Already-found evidence is not presented as a new discovery.
  assert.match(interact(w, 'ar_inventory').lines[0], /already/i);
  // Position and location survived.
  assert.ok(w.data.location);
});

test('intermediate save B (history reconstructed): the tower opens, the Star puzzle works, the finale is still locked', () => {
  const saves = newSave();
  saves.save(playUntil((x) => x.hasFlag('committee_history_reconstructed')));
  const w = saves.load().world;
  assert.equal(w.hasFlag('committee_history_reconstructed'), true);
  assert.equal(interact(w, 'ar_tower').kind, 'transition');
  assert.equal(interact(w, 'sq_stage').kind, 'blocked');
  assert.equal(w.hasFlag('dossier_12_recovered'), false);
  const e = enterLocation(w, 'tower');
  assert.equal(e.firstVisit, true);
});

test('intermediate save C (dossier recovered): the finale opens, exactly once', () => {
  const saves = newSave();
  saves.save(playUntil((x) => x.hasFlag('dossier_12_recovered')));
  const w = saves.load().world;
  const first = interact(w, 'sq_stage');
  assert.equal(first.kind, 'finale');
  w.setFlag('finale_started');
  w.setFlag('game_completed');
  assert.equal(interact(w, 'sq_stage').kind, 'blocked', 'cannot be replayed after completion');
});
