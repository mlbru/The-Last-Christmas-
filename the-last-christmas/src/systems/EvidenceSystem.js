// Evidence collection and the three journal views (evidence, persons, conclusions).
// Pure logic; the DOM journal in ui/JournalUI.js only renders what this returns.

import { EVIDENCE, isValidEvidence } from '../data/evidence.js';
import { CHARACTERS } from '../data/characters.js';
import { RELATIONS, MISSING_REASONS } from '../data/deductions.js';
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
export function journalEvidence(world, line = null) {
  return world.data.evidence
    .map((id) => EVIDENCE[id])
    .filter((e) => e && (line === null || e.line === line));
}

const LINES = {
  A: { id: 'A', name: 'The official history', blurb: 'What the town says happened to the archive.' },
  B: { id: 'B', name: 'The people who stayed silent', blurb: 'Why the story lasted twenty-five years.' },
  C: { id: 'C', name: 'Rowan and Elias', blurb: 'What the detective had to do with it.' },
};
export const INVESTIGATION_LINES = LINES;

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

/**
 * The Conclusions tab. Confirmed relations show their conclusion. Open ones explain *why* a
 * conclusion is not available yet (never giving the answer away).
 */
export function journalConclusions(world) {
  const held = new Set(world.data.evidence);
  return Object.values(RELATIONS)
    .filter((r) => !r.final || held.has('ev_dossier_12') || world.data.relations.includes(r.id))
    .map((r) => {
      if (world.data.relations.includes(r.id)) {
        return { id: r.id, status: 'confirmed', line: r.line, title: r.label, text: r.conclusion };
      }
      const couldTry = r.pairs.some(([a, b]) => held.has(a) && held.has(b));
      return {
        id: r.id, status: couldTry ? 'open' : 'locked', line: r.line,
        title: 'An unanswered question',
        text: couldTry
          ? 'You hold evidence that might connect here. Try linking pieces on the Deduction Board.'
          : MISSING_REASONS[r.id],
      };
    });
}

export function evidenceCount(world) {
  return { held: world.data.evidence.length, total: Object.keys(EVIDENCE).length };
}
