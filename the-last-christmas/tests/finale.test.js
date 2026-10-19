import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldState } from '../src/game/WorldState.js';
import { DialogueRunner } from '../src/systems/DialogueSystem.js';
import { interact } from '../src/systems/InteractionSystem.js';
import { canStartFinale } from '../src/game/StoryLogic.js';
import { Bot } from './helpers/bot.js';

/** Drive the finale like a player would: advance lines, answer each proof, pick the first choice. */
function runFinale(world, { wrongFirst = false } = {}) {
  const r = new DialogueRunner(world);
  let s = r.startNode('fin_start');
  const seen = [];
  let guard = 0;
  const proof = { fin_p1: 'ev_dossier_12', fin_p2: 'ev_rowan_statement', fin_p3: 'ev_elias_letter' };
  while (s && guard++ < 200) {
    seen.push(s.nodeId);
    if (s.type === 'present') {
      if (wrongFirst) assert.notEqual(r.present('ev_mayor_speech').result, 'correct');
      const res = r.present(proof[s.nodeId]);
      assert.equal(res.result, 'correct');
      s = res.step;
    } else if (s.choices) s = r.choose(s.choices[0].index);
    else s = r.advance();
  }
  return seen;
}

test('finale: cannot start early, and the stage blocks until the dossier is held', () => {
  const w = new WorldState();
  assert.equal(interact(w, 'sq_stage').kind, 'blocked');
  assert.equal(canStartFinale(w).ok, false);
  assert.equal(w.hasFlag('finale_started'), false);
});

test('finale: from a fully played game it runs to game_completed with all three proofs', () => {
  const bot = new Bot();
  bot.playToFixpoint();
  const w = bot.world;
  assert.equal(interact(w, 'sq_stage').kind, 'finale');
  const seen = runFinale(w);
  for (const id of ['fin_p1_ok', 'fin_p2_ok', 'fin_p3_ok', 'fin_thomas', 'fin_star', 'fin_home', 'fin_end']) assert.ok(seen.includes(id), id);
  assert.ok(seen.includes('fin_w_all') && seen.includes('fin_epi_full'));
  assert.equal(w.hasFlag('game_completed'), true);
  assert.equal(interact(w, 'sq_stage').kind, 'blocked', 'the ceremony cannot be played twice');
});

test('finale: wrong evidence is answered but never blocks, and the minimal path ends the same way', () => {
  const bot = new Bot(new WorldState(), { skipConfrontations: true, skipOptionalPuzzles: true });
  bot.playToFixpoint();
  const w = bot.world;
  assert.equal(canStartFinale(w).ok, true);
  const seen = runFinale(w, { wrongFirst: true });
  assert.ok(seen.includes('fin_w_none') && seen.includes('fin_epi_plain'));
  assert.equal(w.hasFlag('game_completed'), true);
});

test('finale: aborting midway keeps the finale replayable and does not complete the game', () => {
  const bot = new Bot();
  bot.playToFixpoint();
  const w = bot.world;
  const r = new DialogueRunner(w);
  r.startNode('fin_start'); r.advance(); r.advance();
  r.abort();
  assert.equal(w.hasFlag('finale_started'), true);
  assert.equal(w.hasFlag('game_completed'), false);
  assert.equal(interact(w, 'sq_stage').kind, 'finale');
});
