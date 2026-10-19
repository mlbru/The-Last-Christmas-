// The deduction board and contextual confrontations.
//
// Rules (from the design document):
//  1. A wrong link never blocks progress.            2. Cards can be combined as often as needed.
//  3. The first failure never gives the answer away. 4. No penalties, timers or game-overs.
//  5. The final reconstruction needs a predefined set of core relations, but each relation
//     can be reached through several pairs.           6. The UI explains why something is unavailable.

import { EVIDENCE } from '../data/evidence.js';
import { RELATIONS, NEAR_MISSES, MISSING_REASONS, CONFRONTATIONS, CORE_RELATIONS } from '../data/deductions.js';
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
 * status: 'confirmed' | 'known' | 'near' | 'unsupported' | 'invalid'
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
      unlocks: rel.unlocks, flags: [...rel.sets, ...flags],
      reconstructed: world.hasFlag('committee_history_reconstructed'),
    };
  }

  const near = NEAR_MISSES.find((n) => samePair(n.pair, a, b));
  if (near) return { status: 'near', message: near.message };

  // Deterministic variety, so the same wrong pair always gives the same sentence.
  const idx = (a.length * 7 + b.length * 3 + (a.charCodeAt(4) || 0) + (b.charCodeAt(4) || 0)) % UNSUPPORTED.length;
  return { status: 'unsupported', message: UNSUPPORTED[idx] };
}

/** Why a relation cannot be tested yet, or null if the player already holds a testable pair. */
export function whyNotAvailable(world, relationId) {
  const r = RELATIONS[relationId];
  if (!r) throw new Error(`Unknown relation: ${relationId}`);
  if (world.data.relations.includes(relationId)) return null;
  const held = new Set(world.data.evidence);
  return r.pairs.some(([a, b]) => held.has(a) && held.has(b)) ? null : MISSING_REASONS[relationId];
}

/** Progressive hint for a relation: 0 = which line, 1 = one card, 2 = both cards. */
export function relationHint(world, relationId, level = 0) {
  const r = RELATIONS[relationId];
  if (!r) throw new Error(`Unknown relation: ${relationId}`);
  const held = world.data.evidence;
  const pair = r.pairs.find(([a, b]) => held.includes(a) && held.includes(b)) || r.pairs[0];
  if (level <= 0) {
    const lineNames = { A: 'the official history of the fire', B: 'the people who stayed silent', C: 'Rowan and Elias' };
    return `Think about ${lineNames[r.line]}. Two pieces of evidence there contradict or confirm each other.`;
  }
  if (level === 1) return `One of the cards you want is "${EVIDENCE[pair[0]].name}".`;
  return `Link "${EVIDENCE[pair[0]].name}" with "${EVIDENCE[pair[1]].name}".`;
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
  return MISSING_REASONS[c.requiresRelation];
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
