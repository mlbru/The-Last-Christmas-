// The deduction board and contextual confrontations.
//
// Rules (from the design document):
//  1. A wrong link never blocks progress.            2. Cards can be combined as often as needed.
//  3. The first failure never gives the answer away. 4. No penalties, timers or game-overs.
//  5. The final reconstruction needs a predefined set of core relations, but each relation
//     can be reached through several pairs.           6. The UI explains why something is unavailable.

import { EVIDENCE } from '../data/evidence.js';
import { RELATIONS, CONFRONTATIONS, CORE_RELATIONS } from '../data/deductions.js';
import { recompute } from '../game/StoryLogic.js';
import { collect } from './EvidenceSystem.js';

const samePair = (p, a, b) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a);

const UNSUPPORTED = [
  'Those two do not support each other, at least not with what you know so far.',
  'Nothing connects these yet. That does not mean nothing ever will.',
  'You turn them over side by side. They simply do not speak to each other.',
];

/**
 * Test a link between two evidence cards.
 * status: 'confirmed' | 'known' | 'unsupported' | 'invalid'
 */
export function testLink(world, a, b) {
  if (a === b || !EVIDENCE[a] || !EVIDENCE[b]) {
    return { status: 'invalid', message: 'Pick two different pieces of evidence.' };
  }
  if (!world.data.evidence.includes(a) || !world.data.evidence.includes(b)) {
    return { status: 'invalid', message: 'You do not have both of those yet.' };
  }

  const rel = Object.values(RELATIONS).find((r) => r.pairs.some((p) => samePair(p, a, b)));
  if (rel) {
    if (world.data.relations.includes(rel.id)) {
      return { status: 'known', relation: rel.id, title: rel.label, message: rel.conclusion };
    }
    world.confirmRelation(rel.id);
    rel.sets.forEach((f) => world.setFlag(f));
    const flags = recompute(world);
    return {
      status: 'confirmed', relation: rel.id, title: rel.label, message: rel.conclusion,
      flags: [...rel.sets, ...flags],
      reconstructed: flags.includes('committee_history_reconstructed'),   // only the link that completes it
    };
  }

  // Deterministic variety, so the same wrong pair always gives the same sentence.
  const idx = (a.length * 7 + b.length * 3 + (a.charCodeAt(4) || 0) + (b.charCodeAt(4) || 0)) % UNSUPPORTED.length;
  return { status: 'unsupported', message: UNSUPPORTED[idx] };
}

/** Held cards that complete a pair with `id` for this deduction. */
function heldPartners(world, r, id) {
  const held = new Set(world.data.evidence);
  return r.pairs.filter((p) => p.includes(id)).map((p) => (p[0] === id ? p[1] : p[0])).filter((e) => held.has(e));
}

/**
 * Everything the board shows about one card: the deductions it already proves and the open questions
 * it belongs to. `partners` are the held cards that would answer a question; the UI only reveals them
 * on request, so the question alone is the hint.
 */
export function cardInfo(world, id) {
  const established = [], open = [];
  for (const r of Object.values(RELATIONS)) {
    if (!r.pairs.some((p) => p.includes(id))) continue;
    if (world.data.relations.includes(r.id)) established.push({ id: r.id, label: r.label, conclusion: r.conclusion });
    else open.push({ id: r.id, question: r.question, core: r.core, partners: heldPartners(world, r, id) });
  }
  return { evidence: EVIDENCE[id], established, open };
}

/** Unsolved deductions the player could solve right now, with one pair that does it. */
export function openLeads(world) {
  const held = new Set(world.data.evidence);
  return Object.values(RELATIONS)
    .filter((r) => !world.data.relations.includes(r.id))
    .map((r) => ({ id: r.id, question: r.question, core: r.core, pair: r.pairs.find(([a, b]) => held.has(a) && held.has(b)) }))
    .filter((l) => l.pair);
}

/** Established deductions, in the order they were made. */
export function establishedConclusions(world) {
  return world.data.relations.map((id) => RELATIONS[id]).filter(Boolean);
}

export function coreProgress(world) {
  return { done: CORE_RELATIONS.filter((id) => world.data.relations.includes(id)).length, total: CORE_RELATIONS.length };
}

// ---- confrontations ---------------------------------------------------------

export function confrontationAvailable(world, id) {
  const c = CONFRONTATIONS[id];
  if (!c) throw new Error(`Unknown confrontation: ${id}`);
  return world.data.relations.includes(c.requiresRelation) && !world.confrontation(id).done;
}

export function confrontationLockedReason(world, id) {
  const c = CONFRONTATIONS[id];
  if (!c) throw new Error(`Unknown confrontation: ${id}`);
  if (world.confrontation(id).done) return 'You have already settled this.';
  if (world.data.relations.includes(c.requiresRelation)) return null;
  return `Not yet. First I need to answer this: ${RELATIONS[c.requiresRelation].question}`;
}

/**
 * Present a piece of evidence in a confrontation.
 * result: 'correct' | 'partial' | 'wrong' | 'invalid' | 'unavailable'. Never a penalty.
 */
export function presentEvidence(world, confId, evidenceId) {
  const c = CONFRONTATIONS[confId];
  if (!c) throw new Error(`Unknown confrontation: ${confId}`);
  if (!confrontationAvailable(world, confId)) {
    return { result: 'unavailable', reply: confrontationLockedReason(world, confId) || 'Nothing to confront right now.' };
  }
  if (!EVIDENCE[evidenceId] || !world.data.evidence.includes(evidenceId)) {
    return { result: 'invalid', reply: 'You do not have that.' };
  }
  const state = world.confrontation(confId);
  state.attempts += 1;
  const answer = c.answers[evidenceId];

  if (answer && answer.result === 'correct') {
    state.done = true;
    const got = collect(world, c.reward.evidence);
    c.reward.flags.forEach((f) => world.setFlag(f));
    const flags = recompute(world);
    world.milestone(`confrontation:${confId}`);
    return {
      result: 'correct', reply: answer.reply, node: c.reward.node,
      newEvidence: got.added.map((e) => e.id), flags: [...c.reward.flags, ...flags],
    };
  }
  if (answer) return { result: answer.result, reply: answer.reply, attempts: state.attempts };
  return { result: 'wrong', reply: c.defaultReply, attempts: state.attempts };
}

/** Hints become available after the first miss; the last one is explicit. */
export function confrontationHint(world, confId) {
  const c = CONFRONTATIONS[confId];
  if (!c) throw new Error(`Unknown confrontation: ${confId}`);
  const attempts = world.confrontation(confId).attempts;
  if (attempts < 1) return null;
  return c.hints[Math.min(c.hints.length - 1, attempts - 1)];
}
