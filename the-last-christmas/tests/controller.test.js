import test from 'node:test';
import assert from 'node:assert/strict';
import { GameController } from '../src/game/GameController.js';
import { MemoryStorage } from '../src/systems/SaveSystem.js';
import { Bot } from './helpers/bot.js';

const make = () => new GameController({ storage: new MemoryStorage() });
const events = (c, names) => { const log = []; names.forEach((n) => c.on(n, (p) => log.push([n, p]))); return log; };

function finishDialogue(c, pick = 0) {
  let guard = 0;
  while (c.runner.active && guard++ < 300) {
    const s = c.runner.step;
    if (s.choices) c.dialogueChoose(s.choices[Math.min(pick, s.choices.length - 1)].index);
    else if (s.type === 'line') c.dialogueAdvance();
    else break;
  }
}

test('controller: a new game opens the prologue and ends in free exploration', () => {
  const c = make();
  const log = events(c, ['location', 'mode']);
  c.newGame();
  assert.equal(c.mode, 'dialogue');
  assert.equal(c.world.data.location, 'square');
  assert.ok(log.some(([n, p]) => n === 'location' && p.id === 'square'));
  // choose the last option each time: "I'll start in his office."
  finishDialogue(c, 2);
  assert.equal(c.mode, 'explore');
  assert.equal(c.world.hasFlag('intro_complete'), true);
});

test('controller: transitions move Rowan, play first-visit intros and autosave', () => {
  const c = make();
  c.newGame(); finishDialogue(c, 2);
  c.player = { x: 205, d: 15, facing: 'right' };
  const log = events(c, ['location']);
  const r = c.interactWith('sq_door_office');
  assert.equal(r.kind, 'transition');
  assert.equal(c.world.data.location, 'office');
  assert.equal(log[0][1].id, 'office');
  assert.equal(c.mode, 'dialogue', 'the office intro plays on the first visit');
  finishDialogue(c);
  assert.equal(c.mode, 'explore');
  assert.equal(c.save.hasSave(), true);
});

test('controller: continue restores position, evidence and flags; a missing save is reported', () => {
  const storage = new MemoryStorage();
  const a = new GameController({ storage });
  assert.equal(a.continueGame().status, 'none');
  a.newGame(); finishDialogue(a, 2);
  a.interactWith('sq_door_office'); finishDialogue(a);
  a.player = { x: 290, d: 7, facing: 'left' };
  a.interactWith('of_desk'); finishDialogue(a);
  a.saveNow();
  const b = new GameController({ storage });
  const log = events(b, ['location']);
  assert.equal(b.continueGame().status, 'ok');
  assert.equal(b.world.data.location, 'office');
  assert.deepEqual(log[0][1], { id: 'office', x: 290, d: 7, facing: 'left', restored: true });
  assert.ok(b.world.hasEvidence('ev_thomas_diary'));
  assert.equal(b.mode, 'explore');
  assert.deepEqual(b.world.toJSON().flags, a.world.toJSON().flags);
});

test('controller: a damaged save does not crash; the backup (or a fresh start) is used', () => {
  const storage = new MemoryStorage();
  const a = new GameController({ storage });
  a.newGame(); finishDialogue(a, 2); a.saveNow(); a.saveNow();
  storage.setItem('the-last-christmas:save', '{"broken');
  const b = new GameController({ storage });
  const r = b.continueGame();
  assert.ok(['recovered', 'corrupt'].includes(r.status));
  assert.doesNotThrow(() => b.hasSave());
});

test('controller: the stage stays locked until the dossier is held, then runs the finale into credits', () => {
  const c = make();
  c.newGame(); finishDialogue(c, 2);
  c.goTo('square'); finishDialogue(c);
  const blocked = events(c, ['bubble']);
  c.interactWith('sq_stage');
  assert.equal(c.mode, 'explore');
  assert.equal(blocked[0][1].kind, 'blocked');
  assert.equal(c.world.hasFlag('finale_started'), false);

  const bot = new Bot(); bot.playToFixpoint();
  c._adopt(bot.world);
  c.goTo('square'); c._setMode('explore');
  const cues = events(c, ['finaleCue', 'credits']);
  c.interactWith('sq_stage');
  assert.equal(c.mode, 'finale');
  assert.equal(c.dialogueAbort(), false, 'the finale cannot be skipped with Escape');
  const proofs = { fin_p1: 'ev_dossier_12', fin_p2: 'ev_rowan_statement', fin_p3: 'ev_elias_letter' };
  let guard = 0;
  while (c.runner.active && guard++ < 200) {
    const s = c.runner.step;
    if (s.type === 'present') assert.equal(c.dialoguePresent(proofs[s.nodeId]).result, 'correct');
    else if (s.choices) c.dialogueChoose(s.choices[0].index);
    else c.dialogueAdvance();
  }
  assert.equal(c.mode, 'credits');
  assert.equal(c.world.hasFlag('game_completed'), true);
  assert.ok(cues.some(([n, p]) => n === 'finaleCue' && p === 'fin_star'));
  assert.ok(cues.some(([n]) => n === 'credits'));
  // finished state survives a save and reload
  const d = new GameController({ storage: c.save.storage });
  assert.equal(d.continueGame().status, 'ok');
  assert.equal(d.world.hasFlag('game_completed'), true);
});

test('controller: a puzzle opens, its hints escalate, and solving it plays the memory scene', () => {
  const bot = new Bot(undefined, { stopWhen: (w) => w.hasFlag('knows_twelve_meaning') && w.hasEvidence('ev_festival_photo') });
  bot.playToFixpoint();
  assert.equal(bot.world.isPuzzleSolved('puzzle_toybox'), false);
  const c = make();
  c._adopt(bot.world); c.goTo('home'); finishDialogue(c);
  const log = events(c, ['puzzle', 'toast']);
  c.interactWith('hm_toybox');
  assert.equal(c.mode, 'puzzle');
  assert.equal(c.session.pick('marbles').status, 'wrong');
  assert.equal(c.mode, 'puzzle', 'a wrong answer never closes or blocks the puzzle');
  const h1 = c.puzzleHint(), h2 = c.puzzleHint(), h3 = c.puzzleHint();
  assert.deepEqual([h1.level, h2.level, h3.level, h3.last], [1, 2, 3, true]);
  assert.equal(c.puzzleHint(), null);
  const res = c.session.pick('copper_12');
  assert.equal(res.status, 'solved');
  c.puzzleSolved(res);
  c.closePuzzle();
  assert.equal(c.mode, 'dialogue');
  assert.equal(c.runner.step.nodeId, 'toybox_memory');
  finishDialogue(c);
  assert.equal(c.mode, 'explore');
  assert.ok(c.world.hasEvidence('ev_plaque_12'));
  assert.ok(log.some(([n, p]) => n === 'toast' && /copper plaque/i.test(p.text)));
  // solved: touching the box again just says so
  const again = c.interactWith('hm_toybox');
  assert.equal(again.kind, 'say');

  const f = make();
  f.newGame(); finishDialogue(f, 2);
  f.goTo('bakery'); finishDialogue(f);
  f.interactWith('bk_table');
  assert.equal(f.mode, 'explore', 'a locked puzzle explains what is missing instead of opening');
});

test('controller: linking evidence reports conclusions and wrong links never change the mode', () => {
  const bot = new Bot(); bot.playToFixpoint();
  const c = make(); c._adopt(bot.world); c._setMode('explore');
  const r = c.link('ev_fire_report', 'ev_mayor_speech');
  assert.notEqual(r.status, 'invalid');
  assert.equal(c.mode, 'explore');
});
