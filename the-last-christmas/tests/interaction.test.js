import test from 'node:test';
import assert from 'node:assert/strict';

import { INTERACTIONS, INTERACTION_IDS } from '../src/data/interactions.js';
import { LOCATIONS } from '../src/data/locations.js';
import { NODES, CONVERSATIONS } from '../src/data/dialogue.js';
import { EVIDENCE, EVIDENCE_IDS } from '../src/data/evidence.js';
import { PUZZLES } from '../src/data/puzzles.js';
import { CONFRONTATIONS } from '../src/data/deductions.js';
import { referencedIds } from '../src/systems/Conditions.js';
import { isValidFlag } from '../src/data/storyFlags.js';
import { WorldState } from '../src/game/WorldState.js';
import { interact, nearest, isUsable, prompt, INTERACT_RANGE } from '../src/systems/InteractionSystem.js';
import { enterLocation } from '../src/systems/LocationSystem.js';
import { collect } from '../src/systems/EvidenceSystem.js';

const fresh = () => new WorldState();
const TYPES = ['inspect', 'talk', 'collect', 'puzzle', 'transition'];

test('interactions: every one has the fields the design document requires', () => {
  assert.equal(new Set(INTERACTION_IDS).size, INTERACTION_IDS.length, 'ids are unique');
  for (const it of INTERACTIONS) {
    assert.ok(TYPES.includes(it.type), `${it.id} type ${it.type}`);
    assert.ok(LOCATIONS[it.location], `${it.id} location`);
    assert.equal(typeof it.x, 'number', `${it.id} x`);
    assert.ok(it.label && it.label.length < 40, `${it.id} label`);
    assert.ok(it.description && it.description.length > 5, `${it.id} description`);
    assert.ok(it.action && Object.keys(it.action).length === 1, `${it.id} has exactly one action`);
    const a = it.action;
    if (a.node) assert.ok(NODES[a.node], `${it.id} node ${a.node}`);
    if (a.conversation) assert.ok(CONVERSATIONS[a.conversation], `${it.id} conversation`);
    if (a.puzzle) { assert.ok(PUZZLES[a.puzzle], it.id); assert.equal(PUZZLES[a.puzzle].location, it.location, `${it.id} puzzle location`); }
    if (a.transition) {
      assert.ok(LOCATIONS[a.transition.to], `${it.id} -> ${a.transition.to}`);
      const spawn = a.transition.spawn || 'default';
      assert.ok(LOCATIONS[a.transition.to].spawns[spawn], `${it.id} spawn ${spawn}`);
      if (a.transition.intro) assert.ok(NODES[a.transition.intro], `${it.id} intro`);
    }
    if (a.say) assert.ok(a.say.length >= 1 && a.say.every((l) => l.length > 5), it.id);
    if (a.cycle) assert.ok(a.cycle.length >= 2, `${it.id} cycle needs variety`);
    // Examining twice must give an alternative reaction (design document), for every inspect/say object.
    if (a.say && it.type === 'inspect' && !it.adds) assert.ok(it.repeat && it.repeat.say.length, `${it.id} needs an alternative response`);
    const reqs = it.requires ? (Array.isArray(it.requires) ? it.requires : [it.requires]) : [];
    for (const r of reqs) {
      assert.ok(r.message && r.message.length > 10, `${it.id} requires message`);
      const ids = referencedIds(r.when);
      ids.flags.forEach((f) => assert.ok(isValidFlag(f), `${it.id} flag ${f}`));
      ids.evidence.forEach((e) => assert.ok(EVIDENCE[e], `${it.id} evidence ${e}`));
      ids.nodes.forEach((n) => assert.ok(NODES[n], `${it.id} node ${n}`));
      ids.puzzles.forEach((p) => assert.ok(PUZZLES[p], `${it.id} puzzle ${p}`));
    }
    for (const f of (it.adds && it.adds.flags) || []) assert.ok(isValidFlag(f), `${it.id} adds ${f}`);
    for (const e of (it.adds && it.adds.evidence) || []) assert.ok(EVIDENCE[e], `${it.id} adds ${e}`);
  }
});

test('interactions: every location can be entered and left (no dead-end rooms)', () => {
  const entries = new Map();
  const exits = new Map();
  for (const it of INTERACTIONS) {
    if (!it.action.transition) continue;
    exits.set(it.location, (exits.get(it.location) || 0) + 1);
    const to = it.action.transition.to;
    entries.set(to, (entries.get(to) || 0) + 1);
  }
  for (const id of Object.keys(LOCATIONS)) {
    assert.ok((entries.get(id) || 0) >= 1, `${id} has no way in`);
    assert.ok((exits.get(id) || 0) >= 1, `${id} has no way out`);
  }
});

test('interactions: interaction positions never overlap two things at the same spot', () => {
  for (const loc of Object.keys(LOCATIONS)) {
    const here = INTERACTIONS.filter((i) => i.location === loc).sort((a, b) => a.x - b.x);
    for (let i = 1; i < here.length; i++) {
      assert.ok(here[i].x - here[i - 1].x >= 30, `${here[i - 1].id} and ${here[i].id} are only ${here[i].x - here[i - 1].x}px apart in ${loc}`);
    }
  }
});

test('interactions: nearest() picks the closest object within reach, or nothing', () => {
  assert.equal(nearest('square', 5000), null);
  assert.equal(nearest('square', 470).id, 'sq_voss');
  const near = nearest('square', 470 + INTERACT_RANGE - 1);
  assert.ok(near);
  assert.equal(nearest('office', 60).id, 'of_door');
});

test('interactions: every piece of evidence can be obtained through some route', () => {
  const sources = new Map(EVIDENCE_IDS.map((e) => [e, []]));
  const add = (e, where) => sources.get(e).push(where);
  for (const [id, n] of Object.entries(NODES)) (n.effects?.evidence || []).forEach((e) => add(e, `node:${id}`));
  for (const p of Object.values(PUZZLES)) p.rewards.evidence.forEach((e) => add(e, `puzzle:${p.id}`));
  for (const c of Object.values(CONFRONTATIONS)) c.reward.evidence.forEach((e) => add(e, `confront:${c.id}`));
  for (const it of INTERACTIONS) (it.adds?.evidence || []).forEach((e) => add(e, `interaction:${it.id}`));
  for (const [e, where] of sources) assert.ok(where.length > 0, `${e} can never be obtained`);
});

test('interactions: every dialogue node is reachable from somewhere (no orphaned story)', () => {
  const reached = new Set();
  const visit = (id) => {
    if (!id || reached.has(id)) return;
    reached.add(id);
    const n = NODES[id];
    if (n.next) visit(n.next);
    (n.choices || []).forEach((c) => visit(c.next));
    (n.route || []).forEach((r) => visit(r.next));
    if (n.present) visit(n.present.next);
  };
  Object.values(CONVERSATIONS).forEach((entries) => entries.forEach((e) => visit(e.node)));
  INTERACTIONS.forEach((i) => { if (i.action.node) visit(i.action.node); if (i.action.transition?.intro) visit(i.action.transition.intro); });
  Object.values(LOCATIONS).forEach((l) => l.enterNode && visit(l.enterNode));
  Object.values(CONFRONTATIONS).forEach((c) => visit(c.reward.node));
  Object.values(PUZZLES).forEach((p) => p.successNode && visit(p.successNode));
  // Scene entry points (the finale scene starts these directly).
  ['fin_start'].forEach((id) => NODES[id] && visit(id));
  const orphans = Object.keys(NODES).filter((id) => !reached.has(id));
  assert.deepEqual(orphans, []);
});

// ---- behaviour --------------------------------------------------------------

test('interact: gated objects explain why and unlock when the condition is met', () => {
  const w = fresh();
  let r = interact(w, 'sq_door_inn');
  assert.equal(r.kind, 'blocked');
  assert.match(r.lines[0], /office/i);
  assert.equal(isUsable(w, INTERACTIONS.find((i) => i.id === 'sq_door_inn')), false);
  collect(w, ['ev_note_twelve', 'ev_thomas_diary']);
  assert.equal(w.hasFlag('thomas_office_searched'), true);
  r = interact(w, 'sq_door_inn');
  assert.equal(r.kind, 'transition');
  assert.equal(r.to, 'inn');
});

test('interact: a blocked interaction does not count as used', () => {
  const w = fresh();
  interact(w, 'in_ledger');
  assert.equal(w.interactionCount('in_ledger'), 0);
});

test('interact: examining something twice gives the alternative reaction, never a second discovery', () => {
  const w = fresh();
  const first = interact(w, 'sq_tree');
  const second = interact(w, 'sq_tree');
  assert.equal(first.kind, 'say');
  assert.equal(second.kind, 'say');
  assert.notDeepEqual(first.lines, second.lines);

  w.setFlag('thomas_office_searched');
  const d1 = interact(w, 'of_desk');
  assert.equal(d1.kind, 'dialogue');
  assert.equal(d1.node, 'find_diary');
});

test('interact: a collect that was interrupted before granting evidence replays instead of losing it', () => {
  const w = fresh();
  // Pretend the first attempt happened but the evidence never arrived.
  w.bumpInteraction('of_blotter');
  const r = interact(w, 'of_blotter');
  assert.equal(r.kind, 'dialogue');
  assert.equal(r.node, 'find_note_twelve');
});

test('interact: once collected, searching again says so and adds nothing', () => {
  const w = fresh();
  collect(w, ['ev_note_twelve']);
  interact(w, 'of_blotter');                 // count 0 -> dialogue (first look)
  const again = interact(w, 'of_blotter');
  assert.equal(again.kind, 'say');
  assert.match(again.lines[0], /already/i);
  assert.equal(w.data.evidence.filter((e) => e === 'ev_note_twelve').length, 1);
});

test('interact: cycling NPC lines rotate and wrap', () => {
  const w = fresh();
  const seen = [];
  for (let i = 0; i < 7; i++) seen.push(interact(w, 'sq_ames').lines[0]);
  assert.equal(seen[0], seen[3]);
  assert.notEqual(seen[0], seen[1]);
  assert.ok(new Set(seen).size >= 3);
});

test('interact: the tower chain scene plays once; later visits go straight up', () => {
  const w = fresh();
  w.markNodeSeen('nora_intro_end');
  w.setFlag('committee_history_reconstructed');
  const a = interact(w, 'ar_tower');
  assert.equal(a.kind, 'transition');
  assert.equal(a.introNode, 'tower_chain_cut');
  const b = interact(w, 'ar_tower');
  assert.equal(b.introNode, null);
});

test('interact: the finale object stays blocked without the dossier and says what is missing', () => {
  const w = fresh();
  let r = interact(w, 'sq_stage');
  assert.equal(r.kind, 'blocked');
  assert.ok(r.missing.length >= 1);
  w.setFlag('committee_history_reconstructed');
  r = interact(w, 'sq_stage');
  assert.equal(r.kind, 'blocked', 'reconstruction alone is not enough');
  collect(w, ['ev_dossier_12']);
  r = interact(w, 'sq_stage');
  assert.equal(r.kind, 'finale');
  assert.equal(prompt(w, INTERACTIONS.find((i) => i.id === 'sq_stage')).verb, 'Begin');
});

test('interact: after the game is completed the stage cannot start the finale again', () => {
  const w = fresh();
  w.setFlag('committee_history_reconstructed');
  collect(w, ['ev_dossier_12']);
  w.setFlag('game_completed');
  const r = interact(w, 'sq_stage');
  assert.equal(r.kind, 'blocked');
});

test('locations: entering sets the visited flag, position and a one-time intro', () => {
  const w = fresh();
  const a = enterLocation(w, 'inn');
  assert.equal(w.hasFlag('inn_visited'), true);
  assert.equal(a.firstVisit, true);
  assert.equal(w.data.location, 'inn');
  const t1 = enterLocation(w, 'tower');
  assert.equal(t1.introNode, 'tower_enter');
  assert.equal(w.hasFlag('thomas_hiding_known'), false, 'flag comes from the dialogue effect, not the bare entry');
  const t2 = enterLocation(w, 'tower');
  assert.equal(t2.introNode, null);
  assert.equal(t2.firstVisit, false);
});
