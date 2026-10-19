import test from 'node:test';
import assert from 'node:assert/strict';

import { EVIDENCE_IDS, ESSENTIAL_EVIDENCE } from '../src/data/evidence.js';
import { RELATIONS, CONFRONTATION_IDS, CORE_RELATIONS } from '../src/data/deductions.js';
import { PUZZLE_IDS } from '../src/data/puzzles.js';
import { FLAG_IDS } from '../src/data/storyFlags.js';
import { INTERACTIONS } from '../src/data/interactions.js';
import { WorldState } from '../src/game/WorldState.js';
import { canStartFinale } from '../src/game/StoryLogic.js';
import { interact } from '../src/systems/InteractionSystem.js';
import { testLink } from '../src/systems/DeductionSystem.js';
import { collect } from '../src/systems/EvidenceSystem.js';
import { createSession } from '../src/systems/PuzzleSystem.js';
import { DialogueRunner } from '../src/systems/DialogueSystem.js';
import { Bot, rng } from './helpers/bot.js';

test('playthrough: a fresh game can be completed up to the finale using only the real systems', () => {
  const bot = new Bot();
  const { finale, rounds } = bot.playToFixpoint();
  const w = bot.world;
  assert.ok(rounds < 40, `settled in ${rounds} rounds`);
  assert.equal(finale.ok, true, finale.missing.join('; '));

  // Everything was found, solved, confirmed and confronted.
  assert.deepEqual(EVIDENCE_IDS.filter((e) => !w.hasEvidence(e)), []);
  assert.deepEqual(PUZZLE_IDS.filter((p) => !w.isPuzzleSolved(p)), []);
  assert.deepEqual(Object.keys(RELATIONS).filter((r) => !w.hasRelation(r)), []);
  assert.deepEqual(CONFRONTATION_IDS.filter((c) => !w.confrontation(c).done), []);
  // Every location was visited.
  assert.deepEqual(['square', 'office', 'inn', 'bakery', 'police', 'archive', 'tower', 'home'].filter((l) => !w.data.visited.includes(l)), []);
  // Every story flag the game defines was reachable, except the two the finale itself sets.
  const never = FLAG_IDS.filter((f) => !w.hasFlag(f));
  assert.deepEqual(never.sort(), ['finale_started', 'game_completed']);
  // The finale object now starts it.
  assert.equal(interact(w, 'sq_stage').kind, 'finale');
});

test('playthrough: the minimal path (no confrontations, no optional puzzles) still reaches the finale', () => {
  const bot = new Bot(new WorldState(), { skipConfrontations: true, skipOptionalPuzzles: true });
  const { finale } = bot.playToFixpoint();
  const w = bot.world;
  assert.equal(finale.ok, true, finale.missing.join('; '));
  assert.equal(CONFRONTATION_IDS.some((c) => w.confrontation(c).done), false, 'really skipped them');
  assert.equal(w.isPuzzleSolved('puzzle_recipe'), false);
  assert.equal(w.isPuzzleSolved('puzzle_archive'), false);
  assert.equal(w.isPuzzleSolved('puzzle_star'), true);
  assert.equal(w.isPuzzleSolved('puzzle_toybox'), true);
  // The essential evidence the finale depends on is all there.
  for (const id of ['ev_dossier_12', 'ev_plaque_12', 'ev_star_inscription', 'ev_fire_report', 'ev_inventory', 'ev_missing_list', 'ev_eddie_ledger', 'ev_recipe_book', 'ev_silas_statement', 'ev_rowan_statement']) {
    assert.equal(w.hasEvidence(id), true, id);
  }
  assert.equal(w.hasEvidence('ev_recipe_key'), false);
});

test('playthrough: order never matters - 60 random orders with deliberate mistakes always reach the finale', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const random = rng(seed * 7919);
    const bot = new Bot(new WorldState(), {
      random, noise: seed % 4,
      skipConfrontations: seed % 5 === 0,
      skipOptionalPuzzles: seed % 7 === 0,
    });
    const { finale } = bot.playToFixpoint();
    assert.equal(finale.ok, true, `seed ${seed}: ${finale.missing.join('; ')}`);
    assert.equal(bot.world.hasFlag('thomas_office_searched'), true);
  }
});

test('playthrough: wrong deductions and wrong puzzle answers before every step never prevent progress', () => {
  const bot = new Bot(new WorldState(), { noise: 6 });
  const w = bot.world;
  const wrongLinks = [['ev_mayor_speech', 'ev_receipt'], ['ev_eddie_ledger', 'ev_thomas_diary'], ['ev_note_twelve', 'ev_inventory']];
  bot.opts.onStep = (world) => {
    // Spam wrong links between every step.
    for (const [a, b] of wrongLinks) {
      if (world.hasEvidence(a) && world.hasEvidence(b)) for (let i = 0; i < 3; i++) testLink(world, a, b);
    }
  };
  const { finale } = bot.playToFixpoint();
  assert.equal(finale.ok, true, finale.missing.join('; '));
  assert.ok(w.puzzle('puzzle_star').attempts >= 6, 'wrong puzzle moves were really made');
});

test('playthrough: the finale never opens early - checked after every single step', () => {
  let checks = 0;
  const bot = new Bot(new WorldState(), {
    onStep: (world) => {
      checks++;
      const gate = canStartFinale(world);
      const res = interact(world, 'sq_stage');
      if (gate.ok) assert.equal(res.kind, 'finale');
      else assert.equal(res.kind, 'blocked', `finale opened early after ${checks} steps`);
    },
  });
  bot.playToFixpoint();
  assert.ok(checks > 100, `${checks} checks`);
});

test('playthrough: the dossier needs BOTH the Star set and the copper plate - each reported separately', () => {
  // Fixture 1: Star solved, no plate.
  const a = new WorldState();
  collect(a, ['ev_star_mechanism', 'ev_star_inscription']);
  const sa = createSession(a, 'puzzle_star');
  sa.def.solution.forEach((p) => sa.press(p));
  assert.equal(a.isPuzzleSolved('puzzle_star'), true);
  const noPlate = interact(a, 'tw_twelfth');
  assert.equal(noPlate.kind, 'blocked');
  assert.match(noPlate.lines[0], /copper plate/);
  assert.equal(a.hasEvidence('ev_dossier_12'), false);

  // Fixture 2: plate in hand, Star not set.
  const b = new WorldState();
  collect(b, ['ev_plaque_12']);
  const noStar = interact(b, 'tw_twelfth');
  assert.equal(noStar.kind, 'blocked');
  assert.match(noStar.lines[0], /eleven/);
  assert.equal(b.hasEvidence('ev_dossier_12'), false);

  // Fixture 3: both. The compartment opens and yields the dossier.
  collect(a, ['ev_plaque_12']);
  const ok = interact(a, 'tw_twelfth');
  assert.equal(ok.kind, 'dialogue');
  const runner = new DialogueRunner(a);
  runner.startNode(ok.node);
  assert.equal(a.hasEvidence('ev_dossier_12'), true, 'granted on the very first line, so aborting cannot lose it');
  runner.abort();
  assert.equal(a.hasFlag('dossier_12_recovered'), true);
});

test('playthrough: at the moment the tower opens the dossier does not exist yet, and the Star is unsolved', () => {
  const w = new WorldState();
  const bot = new Bot(w, { stopWhen: (x) => x.hasFlag('committee_history_reconstructed') });
  bot.playToFixpoint();
  assert.equal(w.hasEvidence('ev_dossier_12'), false);
  assert.equal(w.isPuzzleSolved('puzzle_star'), false);
  assert.equal(interact(w, 'tw_twelfth').kind, 'blocked');
});

test('playthrough: essential evidence is never removed by any code path', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
  const offenders = [];
  for (const file of walk(new URL('../src', import.meta.url).pathname).filter((f) => f.endsWith('.js'))) {
    const text = readFileSync(file, 'utf8');
    if (/evidence\.(splice|pop|shift|length\s*=)|data\.evidence\s*=[^=]|evidence\s*=\s*\[\]/.test(text)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], 'evidence may only ever be added');
});

test('playthrough: every essential piece of evidence is held at the end of the minimal path as well', () => {
  const bot = new Bot(new WorldState(), { skipConfrontations: true, skipOptionalPuzzles: true });
  bot.playToFixpoint();
  const missing = ESSENTIAL_EVIDENCE.filter((e) => !bot.world.hasEvidence(e));
  // Thomas's letter is only handed over after Nora's confrontation: the one essential item behind a confrontation.
  assert.deepEqual(missing, ['ev_thomas_letter']);
});

test('playthrough: the core relations are exactly what gates the tower', () => {
  const w = new WorldState();
  const bot = new Bot(w, { stopWhen: (x) => x.hasFlag('committee_history_reconstructed') });
  bot.playToFixpoint();
  for (const id of CORE_RELATIONS) assert.equal(w.hasRelation(id), true, id);
});
