import test from 'node:test';
import assert from 'node:assert/strict';

import { EVIDENCE_IDS } from '../src/data/evidence.js';
import { RELATIONS, CORE_RELATIONS, CONFRONTATIONS } from '../src/data/deductions.js';
import { WorldState } from '../src/game/WorldState.js';
import { canStartFinale } from '../src/game/StoryLogic.js';
import { collect } from '../src/systems/EvidenceSystem.js';
import {
  testLink, cardInfo, openLeads, establishedConclusions, coreProgress,
  confrontationAvailable, confrontationLockedReason, presentEvidence, confrontationHint,
} from '../src/systems/DeductionSystem.js';

const fresh = () => new WorldState();
const holdAll = (w) => collect(w, EVIDENCE_IDS);

test('deduction: every pair of every relation confirms it, in either order', () => {
  for (const rel of Object.values(RELATIONS)) {
    for (const [a, b] of rel.pairs) {
      for (const [x, y] of [[a, b], [b, a]]) {
        const w = fresh();
        collect(w, [x, y]);
        const res = testLink(w, x, y);
        assert.equal(res.status, 'confirmed', `${rel.id}: ${x}+${y}`);
        assert.equal(res.relation, rel.id);
        assert.equal(w.hasRelation(rel.id), true);
        rel.sets.forEach((f) => assert.equal(w.hasFlag(f), true, `${rel.id} sets ${f}`));
      }
    }
  }
});

test('deduction: core relations can be discovered in several ways (design rule 5)', () => {
  for (const id of CORE_RELATIONS) assert.ok(RELATIONS[id].pairs.length >= 2, id);
});

test('deduction: the design document asks for roughly 8-10 meaningful relations', () => {
  assert.ok(Object.keys(RELATIONS).length >= 8);
  assert.ok(CORE_RELATIONS.length >= 5);
});

test('deduction: confirming a relation twice reports it as known and changes nothing', () => {
  const w = fresh();
  collect(w, ['ev_fire_report', 'ev_inventory']);
  assert.equal(testLink(w, 'ev_fire_report', 'ev_inventory').status, 'confirmed');
  const before = JSON.stringify(w.data);
  const again = testLink(w, 'ev_inventory', 'ev_fire_report');
  assert.equal(again.status, 'known');
  assert.equal(JSON.stringify(w.data), before);
});

test('deduction: a WRONG link changes no progress and can be repeated forever (rules 1-4)', () => {
  const w = fresh();
  holdAll(w);
  // Snapshot of everything that matters for progress.
  const relBefore = [...w.data.relations];
  const flagsBefore = { ...w.data.flags };
  // Every pair that is not a relation:
  const realPairs = new Set(Object.values(RELATIONS).flatMap((r) => r.pairs.map((p) => [...p].sort().join('|'))));
  let wrong = 0;
  for (const a of EVIDENCE_IDS) {
    for (const b of EVIDENCE_IDS) {
      if (a >= b || realPairs.has([a, b].sort().join('|'))) continue;
      for (let i = 0; i < 3; i++) {
        const res = testLink(w, a, b);
        assert.equal(res.status, 'unsupported', `${a}+${b} -> ${res.status}`);
        assert.ok(res.message.length > 10);
      }
      wrong++;
    }
  }
  assert.ok(wrong > 100, 'tested a large number of wrong pairs');
  assert.deepEqual(w.data.relations, relBefore);
  assert.deepEqual(w.data.flags, flagsBefore);
});

test('deduction: wrong links never block the right ones afterwards', () => {
  const w = fresh();
  collect(w, ['ev_fire_report', 'ev_inventory', 'ev_eddie_ledger', 'ev_festival_photo']);
  for (let i = 0; i < 20; i++) testLink(w, 'ev_eddie_ledger', 'ev_festival_photo');
  assert.equal(testLink(w, 'ev_fire_report', 'ev_inventory').status, 'confirmed');
});

test('deduction: invalid inputs are rejected without throwing or changing state', () => {
  const w = fresh();
  collect(w, ['ev_fire_report']);
  assert.equal(testLink(w, 'ev_fire_report', 'ev_fire_report').status, 'invalid');
  assert.equal(testLink(w, 'ev_fire_report', 'ev_inventory').status, 'invalid', 'not held yet');
  assert.equal(testLink(w, 'ev_fire_report', 'nonsense').status, 'invalid');
  assert.deepEqual(w.data.relations, []);
});

test('board: a card explains its open questions without naming the answer until asked', () => {
  const w = fresh();
  collect(w, ['ev_eddie_ledger']);
  let info = cardInfo(w, 'ev_eddie_ledger');
  const q = info.open.find((o) => o.id === 'r_payments');
  assert.ok(q && q.core, 'the cash book belongs to the payments question');
  assert.deepEqual(q.partners, [], 'nothing to pair it with yet');
  assert.doesNotMatch(q.question, /Margot|recipe|receipt|speech/i, 'the question never names the other card');
  collect(w, ['ev_recipe_book']);
  info = cardInfo(w, 'ev_eddie_ledger');
  assert.deepEqual(info.open.find((o) => o.id === 'r_payments').partners, ['ev_recipe_book']);
  testLink(w, 'ev_eddie_ledger', 'ev_recipe_book');
  info = cardInfo(w, 'ev_eddie_ledger');
  assert.ok(!info.open.some((o) => o.id === 'r_payments'));
  assert.equal(info.established[0].id, 'r_payments');
  assert.deepEqual(establishedConclusions(w).map((r) => r.id), ['r_payments']);
});

test('board: every question is answerable, and open leads point at a pair the player holds', () => {
  for (const r of Object.values(RELATIONS)) assert.ok(r.question.endsWith('?') && r.label && r.conclusion, r.id);
  const w = fresh();
  assert.deepEqual(openLeads(w), []);
  collect(w, ['ev_silas_statement', 'ev_rowan_statement']);
  const lead = openLeads(w).find((l) => l.id === 'r_statements_copied');
  assert.ok(lead.pair.every((e) => w.hasEvidence(e)));
  testLink(w, ...lead.pair);
  assert.ok(!openLeads(w).some((l) => l.id === 'r_statements_copied'));
});

test('deduction: the reconstruction is announced once, by the link that completes it', () => {
  const w = fresh();
  holdAll(w);
  const results = [...CORE_RELATIONS, 'r_thomas_plan'].map((id) => testLink(w, ...RELATIONS[id].pairs[0]));
  assert.deepEqual(results.map((r) => r.reconstructed), [false, false, false, false, true, false]);
});

test('deduction: confirming all five core relations reconstructs the Committee history', () => {
  const w = fresh();
  holdAll(w);
  assert.equal(w.hasFlag('committee_history_reconstructed'), false);
  assert.deepEqual(coreProgress(w), { done: 0, total: CORE_RELATIONS.length });
  let last;
  for (const id of CORE_RELATIONS) {
    const [a, b] = RELATIONS[id].pairs[0];
    last = testLink(w, a, b);
    assert.equal(last.status, 'confirmed');
  }
  assert.equal(last.reconstructed, true);
  assert.equal(w.hasFlag('committee_history_reconstructed'), true);
  assert.equal(coreProgress(w).done, CORE_RELATIONS.length);
});

test('deduction: the reconstruction is reached even if only the alternative pairs are used', () => {
  const w = fresh();
  holdAll(w);
  for (const id of CORE_RELATIONS) {
    const pairs = RELATIONS[id].pairs;
    const [a, b] = pairs[pairs.length - 1];
    assert.equal(testLink(w, a, b).status, 'confirmed', id);
  }
  assert.equal(w.hasFlag('committee_history_reconstructed'), true);
});

test('deduction: the finale needs the dossier even after a full reconstruction', () => {
  const w = fresh();
  holdAll(w);
  w.data.evidence = w.data.evidence.filter((e) => e !== 'ev_dossier_12');
  w.data.flags = {};
  for (const id of CORE_RELATIONS) testLink(w, ...RELATIONS[id].pairs[0]);
  assert.equal(w.hasFlag('committee_history_reconstructed'), true);
  assert.equal(canStartFinale(w).ok, false);
});

// ---- confrontations --------------------------------------------------------

test('confrontation: unavailable until its relation is confirmed, with a reason', () => {
  const w = fresh();
  holdAll(w);
  for (const id of Object.keys(CONFRONTATIONS)) {
    assert.equal(confrontationAvailable(w, id), false, id);
    assert.ok(confrontationLockedReason(w, id).length > 10);
    assert.equal(presentEvidence(w, id, 'ev_fire_report').result, 'unavailable');
  }
});

test('confrontation: each one can be won with each of its correct pieces of evidence', () => {
  for (const conf of Object.values(CONFRONTATIONS)) {
    const correct = Object.entries(conf.answers).filter(([, a]) => a.result === 'correct').map(([id]) => id);
    assert.ok(correct.length >= 1, conf.id);
    for (const ev of correct) {
      const w = fresh();
      holdAll(w);
      const rel = RELATIONS[conf.requiresRelation];
      testLink(w, ...rel.pairs[0]);
      assert.equal(confrontationAvailable(w, conf.id), true, conf.id);
      const res = presentEvidence(w, conf.id, ev);
      assert.equal(res.result, 'correct', `${conf.id} with ${ev}`);
      assert.equal(res.node, conf.reward.node);
      conf.reward.flags.forEach((f) => assert.equal(w.hasFlag(f), true));
      conf.reward.evidence.forEach((e) => assert.equal(w.hasEvidence(e), true));
      assert.equal(confrontationAvailable(w, conf.id), false, 'done confrontations close');
    }
  }
});

test('confrontation: partial, wrong and irrelevant answers never block (many attempts, then success)', () => {
  const w = fresh();
  holdAll(w);
  testLink(w, ...RELATIONS.r_report_inventory.pairs[0]);
  for (let i = 0; i < 30; i++) {
    const r = presentEvidence(w, 'conf_nora', i % 2 ? 'ev_mayor_speech' : 'ev_fire_report');
    assert.ok(['partial', 'wrong'].includes(r.result));
  }
  assert.equal(w.confrontation('conf_nora').done, false);
  assert.equal(presentEvidence(w, 'conf_nora', 'ev_inventory').result, 'correct');
  assert.equal(w.hasEvidence('ev_thomas_letter'), true);
});

test('confrontation: evidence the player does not hold is rejected', () => {
  const w = fresh();
  collect(w, ['ev_fire_report', 'ev_inventory']);
  testLink(w, 'ev_fire_report', 'ev_inventory');
  assert.equal(presentEvidence(w, 'conf_nora', 'ev_dossier_12').result, 'invalid');
  assert.equal(w.confrontation('conf_nora').attempts, 0, 'invalid attempts are not counted');
});

test('confrontation: hints appear after the first miss and the last is explicit', () => {
  const w = fresh();
  holdAll(w);
  testLink(w, ...RELATIONS.r_statements_copied.pairs[0]);
  assert.equal(confrontationHint(w, 'conf_silas'), null, 'no hint before trying');
  presentEvidence(w, 'conf_silas', 'ev_mayor_speech');
  const h1 = confrontationHint(w, 'conf_silas');
  assert.ok(h1.length > 10);
  presentEvidence(w, 'conf_silas', 'ev_mayor_speech');
  presentEvidence(w, 'conf_silas', 'ev_mayor_speech');
  const h3 = confrontationHint(w, 'conf_silas');
  assert.match(h3, /pencil/);
});

test('confrontation: the data defines a real answer for every confrontation', () => {
  for (const c of Object.values(CONFRONTATIONS)) {
    assert.ok(c.claim.length > 20, c.id);
    assert.ok(Object.values(c.answers).some((a) => a.result === 'correct'), c.id);
    assert.ok(c.hints.length >= 2, c.id);
    assert.ok(c.defaultReply.length > 5, c.id);
  }
});
