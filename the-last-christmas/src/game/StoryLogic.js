// Derived story rules. Pure functions over a WorldState; no Phaser, no DOM.
// `recompute` is idempotent and also *repairs* inconsistent state (for example after loading
// an older save) by deriving flags from the evidence the player actually holds.

import { CORE_RELATIONS, RELATIONS, CONFRONTATIONS } from '../data/deductions.js';
import { PUZZLES } from '../data/puzzles.js';
import { EVIDENCE, ESSENTIAL_EVIDENCE } from '../data/evidence.js';

// Holding this evidence implies this flag. Keeps flags and evidence from ever disagreeing.
export const EVIDENCE_IMPLIES_FLAG = Object.freeze({
  ev_recipe_book: 'bakery_ledger_found',
  ev_eddie_testimony: 'eddie_statement_heard',
  ev_rowan_statement: 'police_record_found',
  ev_star_mechanism: 'twelve_point_star_found',
  ev_plaque_12: 'plaque_12_found',
  ev_dossier_12: 'dossier_12_recovered',
});

export function recompute(world) {
  const changed = [];
  const set = (flag) => { if (world.setFlag(flag)) changed.push(flag); };

  for (const [ev, flag] of Object.entries(EVIDENCE_IMPLIES_FLAG)) if (world.hasEvidence(ev)) set(flag);
  if (world.hasEvidence('ev_note_twelve') && world.hasEvidence('ev_thomas_diary')) set('thomas_office_searched');

  // Relations confirmed always imply their flags (guards against hand-edited or older saves).
  for (const id of world.data.relations) {
    const rel = RELATIONS[id];
    if (rel) rel.sets.forEach(set);
  }

  // A solved puzzle / finished confrontation always carries its rewards, even if a save lost them.
  for (const [id, state] of Object.entries(world.data.puzzles)) {
    if (!state.solved || !PUZZLES[id]) continue;
    for (const ev of PUZZLES[id].rewards.evidence) world.addEvidence(ev);
    PUZZLES[id].rewards.flags.forEach(set);
  }
  for (const [id, state] of Object.entries(world.data.confrontations)) {
    if (!state.done || !CONFRONTATIONS[id]) continue;
    for (const ev of CONFRONTATIONS[id].reward.evidence) world.addEvidence(ev);
    CONFRONTATIONS[id].reward.flags.forEach(set);
  }
  for (const [ev, flag] of Object.entries(EVIDENCE_IMPLIES_FLAG)) if (world.hasEvidence(ev)) set(flag);

  if (CORE_RELATIONS.every((id) => world.data.relations.includes(id))) set('committee_history_reconstructed');
  return changed;
}

/**
 * Called after loading a save. Repairs what can be repaired and removes what cannot be trusted,
 * so a damaged or hand-edited save can never start the finale early or lock the game.
 * Returns a list of human-readable notes (empty when nothing needed fixing).
 */
export function repairState(world) {
  const notes = [];
  recompute(world);
  const hasDossier = world.data.evidence.includes('ev_dossier_12');
  const reconstructed = world.data.flags.committee_history_reconstructed === true;
  if (!(hasDossier && reconstructed)) {
    for (const f of ['finale_started', 'game_completed']) {
      if (world.data.flags[f]) { delete world.data.flags[f]; notes.push(`removed ${f}: prerequisites missing`); }
    }
  }
  if (world.data.flags.game_completed && !world.data.flags.finale_started) {
    world.data.flags.finale_started = true;
    notes.push('restored finale_started for a completed game');
  }
  return notes;
}

export function towerUnlocked(world) { return world.hasFlag('committee_history_reconstructed'); }
export function homeUnlocked(world) { return world.hasFlag('knows_twelve_meaning'); }

/** The finale cannot start without the twelfth dossier, and the history must be reconstructed. */
export function canStartFinale(world) {
  const missing = [];
  if (!world.hasFlag('committee_history_reconstructed')) missing.push('The history of the Committee has not been reconstructed yet.');
  if (!world.hasFlag('dossier_12_recovered') || !world.hasEvidence('ev_dossier_12')) missing.push('You do not have the twelfth dossier.');
  if (world.hasFlag('game_completed')) missing.push('The story is already complete.');
  return { ok: missing.length === 0, missing };
}

export function missingEssentialEvidence(world) {
  return ESSENTIAL_EVIDENCE.filter((id) => !world.data.evidence.includes(id));
}

/** A short, spoiler-light suggestion of what to do next. Shown in the journal. */
export function nextObjective(world) {
  const f = (id) => world.hasFlag(id);
  if (f('game_completed')) return 'The truth is out. Merry Christmas, Rowan.';
  if (f('finale_started')) return 'Go to the ceremony and tell the town.';
  if (!f('intro_complete')) return 'Thomas Bell is missing. Start in his office, the bell-tower side of the square.';
  if (!f('thomas_office_searched')) return 'Search Thomas Bell\'s office thoroughly: his desk, his blotter.';
  if (f('dossier_12_recovered')) return 'You have the twelfth dossier. Link it to your other evidence if you like, then go to the square. The ceremony is waiting.';

  if (f('committee_history_reconstructed')) {
    if (!f('twelve_point_star_found')) return 'The bell tower is open now. Find the Christmas Star.';
    if (!world.isPuzzleSolved('puzzle_star')) {
      return world.hasEvidence('ev_star_inscription')
        ? 'The Star has twelve points. Set them as the cornerstone inscription says.'
        : 'The Star must be set in a certain order. Look for an inscription in the church.';
    }
    if (!f('plaque_12_found')) {
      return f('knows_twelve_meaning')
        ? 'The twelfth point needs a copper plate. Rowan\'s old toy box might have it.'
        : 'The twelfth point needs a plate. Check Thomas\'s note against the festival photo on the Deduction Board.';
    }
    return 'Insert the copper plate into the twelfth point of the Star.';
  }

  const missingCore = CORE_RELATIONS.filter((id) => !world.data.relations.includes(id));
  const missingEv = missingEssentialEvidence(world).filter((id) => !['tower', 'home'].includes(EVIDENCE[id].foundIn));
  if (missingEv.length) {
    const places = [...new Set(missingEv.map((id) => EVIDENCE[id].foundIn))];
    const names = { square: 'the square', inn: 'the Holly Inn', bakery: 'the bakery', police: 'the police station', archive: 'the church and archive', office: 'Thomas\'s office' };
    return `There is still something to find at ${places.map((p) => names[p] || p).join(', ')}.`;
  }
  if (missingCore.length) return 'You have the evidence. Open the Deduction Board and look for which pieces contradict each other.';
  return 'Keep going.';
}

/** How thoroughly the player investigated. Only changes epilogue colour, never the ending. */
export function thoroughness(world) {
  const optional = Object.values(EVIDENCE).filter((e) => !e.essential).map((e) => e.id);
  const optHeld = optional.filter((id) => world.data.evidence.includes(id)).length;
  const relHeld = world.data.relations.length;
  const confHeld = ['nora_confronted', 'margot_confronted', 'eddie_confronted', 'silas_confronted'].filter((f) => world.hasFlag(f)).length;
  const score = optHeld + relHeld + confHeld;
  const max = optional.length + Object.keys(RELATIONS).length + 4;
  const ratio = score / max;
  const tier = ratio >= 0.85 ? 'complete' : ratio >= 0.55 ? 'thorough' : 'basic';
  return { score, max, tier, confrontations: confHeld };
}
