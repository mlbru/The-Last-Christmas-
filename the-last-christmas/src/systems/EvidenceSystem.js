// Evidence collection and the journal's evidence and persons views.
// Pure logic; the DOM journal in ui/JournalUI.js only renders what this returns.

import { EVIDENCE, isValidEvidence } from '../data/evidence.js';
import { CHARACTERS } from '../data/characters.js';
import { recompute } from '../game/StoryLogic.js';
import { check } from './Conditions.js';

/**
 * Add evidence to the journal. Idempotent: collecting something twice changes nothing.
 * Returns { added: [evidence objects newly added], flags: [flag ids newly set by recompute] }.
 */
export function collect(world, ids) {
  const added = [];
  for (const id of ids) {
    if (!isValidEvidence(id)) throw new Error(`Unknown evidence: ${id}`);
    if (world.addEvidence(id)) added.push(EVIDENCE[id]);
  }
  const flags = recompute(world);
  return { added, flags };
}

/** Evidence the player holds, in the order found. */
export function journalEvidence(world) {
  return world.data.evidence.map((id) => EVIDENCE[id]).filter(Boolean);
}

/** Which characters are listed in the Persons tab. */
const KNOWN_WHEN = {
  rowan: null, // always
  thomas: null,
  elias: { any: [{ evidence: 'ev_fire_report' }, { evidence: 'ev_festival_photo' }, { evidence: 'ev_elias_letter' }] },
  ruth: { flag: 'home_visited' },
};

export function journalPersons(world) {
  const out = [];
  for (const c of Object.values(CHARACTERS)) {
    const rule = Object.prototype.hasOwnProperty.call(KNOWN_WHEN, c.id) ? KNOWN_WHEN[c.id] : { met: c.id };
    if (rule !== null && !check(world, rule)) continue;
    const notes = c.journal.filter((n) => {
      if (!n.when) return true;
      if (n.when.flag) return world.hasFlag(n.when.flag);
      if (n.when.evidence) return world.hasEvidence(n.when.evidence);
      return false;
    }).map((n) => n.text);
    out.push({ id: c.id, name: c.name, role: c.role, notes });
  }
  return out;
}

export function evidenceCount(world) {
  return { held: world.data.evidence.length, total: Object.keys(EVIDENCE).length };
}
