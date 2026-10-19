// Resolves an interaction against the world and says what should happen next.
// The scene/UI performs the result (shows bubbles, opens dialogue, changes scene); everything
// that changes story state happens here, so it can be tested without an engine.

import { INTERACTIONS, INTERACTIONS_BY_ID } from '../data/interactions.js';
import { NODES } from '../data/dialogue.js';
import { EVIDENCE } from '../data/evidence.js';
import { PUZZLES } from '../data/puzzles.js';
import { check } from './Conditions.js';
import { collect } from './EvidenceSystem.js';
import { canStart as puzzleCanStart } from './PuzzleSystem.js';
import { canStartFinale } from '../game/StoryLogic.js';

export const INTERACT_RANGE = 44;

const ACTION_VERB = { inspect: 'Examine', talk: 'Talk', collect: 'Search', puzzle: 'Try', transition: 'Enter' };

export function interactionsIn(location) {
  return INTERACTIONS.filter((i) => i.location === location);
}

export function getInteraction(id) {
  const it = INTERACTIONS_BY_ID[id];
  if (!it) throw new Error(`Unknown interaction: ${id}`);
  return it;
}

/** The closest interaction within reach of x, or null. */
export function nearest(location, x, range = INTERACT_RANGE) {
  let best = null;
  let bestDist = Infinity;
  for (const it of interactionsIn(location)) {
    const dist = Math.abs(it.x - x);
    if (dist <= range && dist < bestDist) { best = it; bestDist = dist; }
  }
  return best;
}

/** What the on-screen prompt should say for an interaction. */
export function prompt(world, it) {
  const verb = it.action.finale ? 'Begin' : (ACTION_VERB[it.type] || 'Use');
  return { verb, label: it.label, description: it.description };
}

function failedRequirement(world, it) {
  const reqs = it.requires ? (Array.isArray(it.requires) ? it.requires : [it.requires]) : [];
  return reqs.find((r) => !check(world, r.when)) || null;
}

/** Is it usable right now (used for UI hints such as dimming a locked door)? */
export function isUsable(world, it) {
  return failedRequirement(world, it) === null;
}

function applyAdds(world, it) {
  const out = { evidence: [], flags: [] };
  if (!it.adds) return out;
  out.evidence = collect(world, it.adds.evidence || []).added.map((e) => e.id);
  for (const f of it.adds.flags || []) if (world.setFlag(f)) out.flags.push(f);
  return out;
}

const say = (lines, extra = {}) => ({ kind: 'say', lines, ...extra });

/**
 * Perform an interaction.
 * kind: 'say' | 'dialogue' | 'puzzle' | 'transition' | 'finale' | 'blocked'
 */
export function interact(world, id) {
  const it = getInteraction(id);

  const failed = failedRequirement(world, it);
  if (failed) return { kind: 'blocked', lines: [failed.message], interaction: it };

  const count = world.interactionCount(id);
  const a = it.action;

  if (a.finale) {
    const gate = canStartFinale(world);
    if (world.data.flags.game_completed) {
      return { kind: 'blocked', lines: ['The ceremony is over. The square is quiet, and the Star is lit.'], interaction: it };
    }
    if (!gate.ok) {
      return {
        kind: 'blocked', interaction: it, missing: gate.missing,
        lines: ["The stage is ready for tomorrow's ceremony, but I have nothing to say on it yet. Not until I can prove all of it."],
      };
    }
    world.bumpInteraction(id);
    return { kind: 'finale', interaction: it };
  }

  if (a.transition) {
    world.bumpInteraction(id);
    return {
      kind: 'transition', interaction: it, to: a.transition.to, spawn: a.transition.spawn || 'default',
      introNode: count === 0 && a.transition.intro ? a.transition.intro : null,
    };
  }

  if (a.puzzle) {
    const def = PUZZLES[a.puzzle];
    if (world.isPuzzleSolved(a.puzzle)) {
      world.bumpInteraction(id);
      return say([def.successText], { interaction: it, puzzleSolved: true });
    }
    const can = puzzleCanStart(world, a.puzzle);
    if (!can.ok) return { kind: 'blocked', lines: [can.message], interaction: it };
    world.bumpInteraction(id);
    return { kind: 'puzzle', puzzle: a.puzzle, interaction: it };
  }

  if (a.conversation) {
    world.bumpInteraction(id);
    return { kind: 'dialogue', conversation: a.conversation, interaction: it };
  }

  if (a.node) {
    world.bumpInteraction(id);
    const node = NODES[a.node];
    const evIds = (node && node.effects && node.effects.evidence) || [];
    const allHeld = evIds.length > 0 && evIds.every((e) => world.hasEvidence(e));
    if (count > 0 && it.repeat) return say(it.repeat.say, { interaction: it });
    if (count > 0 && allHeld) {
      const names = evIds.map((e) => EVIDENCE[e].name).join(', ');
      return say([`I've already taken this: ${names}. It's in my journal.`], { interaction: it });
    }
    // First time, or the earlier attempt was interrupted before the evidence was granted.
    return { kind: 'dialogue', node: a.node, interaction: it };
  }

  if (a.say || a.cycle) {
    world.bumpInteraction(id);
    let lines;
    if (a.cycle) lines = [a.cycle[count % a.cycle.length]];
    else lines = count === 0 || !it.repeat ? a.say : it.repeat.say;
    const added = count === 0 ? applyAdds(world, it) : { evidence: [], flags: [] };
    return say(lines, { interaction: it, newEvidence: added.evidence, newFlags: added.flags });
  }

  throw new Error(`Interaction ${id} has no usable action`);
}
