import test from 'node:test';
import assert from 'node:assert/strict';

import { FLAGS, FLAG_IDS, isValidFlag } from '../src/data/storyFlags.js';
import { EVIDENCE, EVIDENCE_IDS, ESSENTIAL_EVIDENCE } from '../src/data/evidence.js';
import { CHARACTERS } from '../src/data/characters.js';
import { RELATIONS, CONFRONTATIONS, NEAR_MISSES, MISSING_REASONS } from '../src/data/deductions.js';
import { PUZZLES } from '../src/data/puzzles.js';
import { LOCATION_IDS } from '../src/data/locationIds.js';
import { WorldState, createInitialData, MILESTONE_FLAGS } from '../src/game/WorldState.js';
import { recompute, canStartFinale, nextObjective, thoroughness, EVIDENCE_IMPLIES_FLAG } from '../src/game/StoryLogic.js';
import { collect, journalEvidence, journalPersons, journalConclusions } from '../src/systems/EvidenceSystem.js';

const fresh = () => new WorldState();

test('data: every flag named in the design document exists', () => {
  const required = [
    'intro_complete', 'thomas_office_searched', 'bakery_ledger_found', 'eddie_statement_heard',
    'police_record_found', 'archive_discrepancy_found', 'committee_history_reconstructed',
    'twelve_point_star_found', 'plaque_12_found', 'dossier_12_recovered', 'finale_started', 'game_completed',
  ];
  for (const f of required) assert.ok(isValidFlag(f), `missing flag ${f}`);
  assert.ok(FLAG_IDS.length >= required.length);
});

test('data: evidence records are complete and point at real locations', () => {
  for (const e of Object.values(EVIDENCE)) {
    assert.equal(typeof e.name, 'string', e.id);
    assert.ok(e.description.length > 30, `${e.id} description`);
    assert.ok(e.source.length > 3, `${e.id} source`);
    assert.ok(['A', 'B', 'C'].includes(e.line), `${e.id} line`);
    assert.ok(LOCATION_IDS.includes(e.foundIn), `${e.id} foundIn ${e.foundIn}`);
    assert.equal(e.id, EVIDENCE_IDS.find((id) => EVIDENCE[id] === e));
  }
  // The three investigation lines of the design document are all populated.
  for (const line of ['A', 'B', 'C']) assert.ok(EVIDENCE_IDS.some((id) => EVIDENCE[id].line === line));
});

test('data: the evidence named in the design document exists', () => {
  const named = ['ev_fire_report', 'ev_inventory', 'ev_recipe_book', 'ev_missing_list', 'ev_eddie_ledger',
    'ev_mayor_speech', 'ev_silas_statement', 'ev_thomas_diary', 'ev_thomas_letter', 'ev_festival_photo',
    'ev_rowan_statement', 'ev_plaque_12', 'ev_elias_letter', 'ev_dossier_12'];
  for (const id of named) assert.ok(EVIDENCE[id], id);
});

test('data: every character has a journal baseline entry and a valid look', () => {
  for (const c of Object.values(CHARACTERS)) {
    assert.ok(c.journal.length >= 1, c.id);
    assert.ok(c.journal[0].when === undefined, `${c.id} first note must be unconditional`);
    assert.match(c.look.skin, /^#[0-9a-f]{6}$/i);
    for (const n of c.journal) {
      if (n.when?.flag) assert.ok(isValidFlag(n.when.flag), `${c.id}: ${n.when.flag}`);
      if (n.when?.evidence) assert.ok(EVIDENCE[n.when.evidence], `${c.id}: ${n.when.evidence}`);
    }
  }
});

test('canon: the twelfth dossier does not prove Elias\'s fate', () => {
  const d = EVIDENCE.ev_dossier_12.description;
  assert.match(d, /does not say what happened to Elias/i);
  assert.match(EVIDENCE.ev_elias_letter.description, /stays unknown/i);
  // No evidence text may claim certainty about Elias's final moments.
  for (const e of Object.values(EVIDENCE)) {
    assert.doesNotMatch(e.description, /Elias (died|was killed|was murdered|escaped)/i, e.id);
  }
});

test('WorldState: refuses unknown ids instead of silently accepting typos', () => {
  const w = fresh();
  assert.throws(() => w.setFlag('not_a_flag'));
  assert.throws(() => w.hasFlag('not_a_flag'));
  assert.throws(() => w.addEvidence('ev_nope'));
  assert.throws(() => w.confirmRelation('r_nope'));
  assert.throws(() => w.puzzle('puzzle_nope'));
  assert.throws(() => w.markVisited('mars'));
});

test('WorldState: flags and evidence are idempotent and emit events once', () => {
  const w = fresh();
  const seen = [];
  w.on('flag', (f) => seen.push(f));
  assert.equal(w.setFlag('intro_complete'), true);
  assert.equal(w.setFlag('intro_complete'), false);
  assert.deepEqual(seen, ['intro_complete']);
  assert.equal(w.addEvidence('ev_fire_report'), true);
  assert.equal(w.addEvidence('ev_fire_report'), false);
  assert.deepEqual(w.data.evidence, ['ev_fire_report']);
});

test('WorldState: milestones fire for story flags and essential evidence only', () => {
  const w = fresh();
  const reasons = [];
  w.on('milestone', (r) => reasons.push(r));
  w.setFlag('inn_visited');                 // not a milestone
  assert.deepEqual(reasons, []);
  w.setFlag('intro_complete');
  w.addEvidence('ev_receipt');              // optional evidence: not a milestone
  w.addEvidence('ev_fire_report');          // essential
  assert.deepEqual(reasons, ['flag:intro_complete', 'evidence:ev_fire_report']);
  for (const f of MILESTONE_FLAGS) assert.ok(isValidFlag(f), f);
});

test('StoryLogic: evidence implies its story flags (flags can never disagree with the journal)', () => {
  const w = fresh();
  for (const [ev, flag] of Object.entries(EVIDENCE_IMPLIES_FLAG)) {
    const x = fresh();
    collect(x, [ev]);
    assert.equal(x.hasFlag(flag), true, `${ev} should set ${flag}`);
  }
  collect(w, ['ev_note_twelve']);
  assert.equal(w.hasFlag('thomas_office_searched'), false, 'one clue is not a searched office');
  collect(w, ['ev_thomas_diary']);
  assert.equal(w.hasFlag('thomas_office_searched'), true);
});

test('StoryLogic: recompute repairs a state that has evidence but lost its flags', () => {
  const w = fresh();
  w.data.evidence.push('ev_recipe_book', 'ev_eddie_testimony', 'ev_rowan_statement');
  assert.equal(w.hasFlag('bakery_ledger_found'), false);
  const changed = recompute(w);
  assert.deepEqual(changed.sort(), ['bakery_ledger_found', 'eddie_statement_heard', 'police_record_found']);
  assert.deepEqual(recompute(w), [], 'recompute is idempotent');
});

test('finale gate: locked without the dossier or without the reconstruction', () => {
  const w = fresh();
  let gate = canStartFinale(w);
  assert.equal(gate.ok, false);
  assert.equal(gate.missing.length, 2);

  // Only the dossier flag set by hand does not open it: the evidence must really be held.
  w.data.flags.dossier_12_recovered = true;
  gate = canStartFinale(w);
  assert.equal(gate.ok, false);

  collect(w, ['ev_dossier_12']);
  gate = canStartFinale(w);
  assert.equal(gate.ok, false, 'dossier alone is not enough');
  assert.match(gate.missing.join(' '), /Committee/);

  w.setFlag('committee_history_reconstructed');
  assert.equal(canStartFinale(w).ok, true);

  w.setFlag('game_completed');
  assert.equal(canStartFinale(w).ok, false, 'a finished game cannot start the finale twice');
});

test('nextObjective: always returns a non-empty string and never throws', () => {
  const w = fresh();
  assert.ok(nextObjective(w).length > 10);
  for (const f of FLAG_IDS) {
    w.setFlag(f);
    assert.equal(typeof nextObjective(w), 'string');
  }
});

test('journal: evidence keeps order found; persons appear only once met', () => {
  const w = fresh();
  collect(w, ['ev_fire_report', 'ev_receipt']);
  assert.deepEqual(journalEvidence(w).map((e) => e.id), ['ev_fire_report', 'ev_receipt']);
  assert.deepEqual(journalEvidence(w, 'A').length, 2);
  assert.deepEqual(journalEvidence(w, 'B').length, 0);

  let ids = journalPersons(w).map((p) => p.id);
  assert.ok(ids.includes('rowan') && ids.includes('thomas'));
  assert.ok(ids.includes('elias'), 'the fire report mentions Elias');
  assert.ok(!ids.includes('eddie'));
  w.meet('eddie');
  ids = journalPersons(w).map((p) => p.id);
  assert.ok(ids.includes('eddie'));
  const eddie = journalPersons(w).find((p) => p.id === 'eddie');
  assert.equal(eddie.notes.length, 1);
  w.setFlag('eddie_statement_heard');
  assert.equal(journalPersons(w).find((p) => p.id === 'eddie').notes.length, 2);
});

test('journal: conclusions explain why they are unavailable and hide final spoilers', () => {
  const w = fresh();
  let list = journalConclusions(w);
  assert.ok(list.every((c) => c.status === 'locked'));
  assert.ok(list.every((c) => c.text === MISSING_REASONS[c.id]));
  assert.ok(!list.some((c) => RELATIONS[c.id].final), 'final conclusions stay hidden until the dossier');
  collect(w, ['ev_fire_report', 'ev_inventory']);
  list = journalConclusions(w);
  assert.equal(list.find((c) => c.id === 'r_report_inventory').status, 'open');
  // Open conclusions must not reveal the answer.
  assert.doesNotMatch(list.find((c) => c.id === 'r_report_inventory').text, /0412/);
});

test('thoroughness only changes the tier, never anything that gates progress', () => {
  const w = fresh();
  assert.equal(thoroughness(w).tier, 'basic');
  for (const id of EVIDENCE_IDS) w.addEvidence(id);
  for (const id of Object.keys(RELATIONS)) w.confirmRelation(id);
  ['nora_confronted', 'margot_confronted', 'eddie_confronted', 'silas_confronted'].forEach((f) => w.setFlag(f));
  assert.equal(thoroughness(w).tier, 'complete');
});

test('data: puzzles reference only real evidence, flags and locations', () => {
  for (const p of Object.values(PUZZLES)) {
    assert.ok(LOCATION_IDS.includes(p.location), p.id);
    assert.equal(p.hints.length, 3, `${p.id} needs three escalating hints`);
    for (const e of [...(p.requires.evidence || []), ...(p.requires.anyEvidence || []), ...p.rewards.evidence]) assert.ok(EVIDENCE[e], `${p.id}: ${e}`);
    for (const f of [...(p.requires.flags || []), ...p.rewards.flags]) assert.ok(isValidFlag(f), `${p.id}: ${f}`);
  }
  assert.equal(Object.keys(PUZZLES).length, 4);
  assert.equal(new Set(Object.values(PUZZLES).map((p) => p.type)).size, 4, 'four different skills');
});

test('data: references inside deductions are valid', () => {
  for (const r of Object.values(RELATIONS)) {
    r.pairs.forEach((p) => { assert.equal(p.length, 2); p.forEach((e) => assert.ok(EVIDENCE[e], `${r.id}:${e}`)); assert.notEqual(p[0], p[1]); });
    r.sets.forEach((f) => assert.ok(isValidFlag(f), `${r.id}:${f}`));
    r.unlocks.forEach((u) => assert.ok(CONFRONTATIONS[u], `${r.id}:${u}`));
    assert.ok(MISSING_REASONS[r.id], r.id);
  }
  for (const n of NEAR_MISSES) {
    const rel = Object.values(RELATIONS).find((r) => r.pairs.some((p) => (p[0] === n.pair[0] && p[1] === n.pair[1]) || (p[0] === n.pair[1] && p[1] === n.pair[0])));
    assert.equal(rel, undefined, `near-miss ${n.pair} must not also be a real relation`);
  }
  assert.ok(ESSENTIAL_EVIDENCE.length > 15);
});

test('state data starts clean', () => {
  const d = createInitialData();
  assert.deepEqual(d.flags, {});
  assert.deepEqual(d.evidence, []);
  assert.equal(d.location, null);
  assert.equal(FLAGS.finale_started.length > 5, true);
});
