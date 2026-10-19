// The single central progress state. No Phaser, no DOM: this file runs in plain Node.
// Everything the player has learned or changed lives here and nowhere else.

import { isValidFlag } from '../data/storyFlags.js';
import { isValidEvidence, EVIDENCE } from '../data/evidence.js';
import { RELATIONS, CONFRONTATIONS } from '../data/deductions.js';
import { PUZZLES } from '../data/puzzles.js';
import { isValidLocation } from '../data/locationIds.js';

export const SAVE_VERSION = 1;

// Flags that count as story milestones and trigger an autosave.
export const MILESTONE_FLAGS = Object.freeze([
  'intro_complete', 'thomas_office_searched', 'bakery_ledger_found', 'eddie_statement_heard',
  'police_record_found', 'archive_discrepancy_found', 'committee_history_reconstructed',
  'twelve_point_star_found', 'plaque_12_found', 'dossier_12_recovered', 'finale_started', 'game_completed',
]);

export function defaultSettings() {
  return { volume: 0.6, muted: false, textSpeed: 'normal', snow: true };
}

export function createInitialData() {
  return {
    version: SAVE_VERSION,
    location: null,           // set by the first scene; null means "start of the game"
    position: { x: 0, y: 0, facing: 'right' },
    flags: {},
    evidence: [],             // ids in the order they were found
    relations: [],            // confirmed relation ids
    puzzles: {},              // id -> { solved, attempts, hintLevel }
    confrontations: {},       // id -> { done, attempts }
    visited: [],              // location ids
    met: [],                  // character ids the player has talked to
    interactions: {},         // interaction id -> times used
    dialogue: { seen: {}, taken: {} },
    settings: defaultSettings(),
    playtimeMs: 0,
  };
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export class WorldState {
  constructor(data) {
    this.data = data || createInitialData();
    this._listeners = {};
  }

  // ---- events ---------------------------------------------------------------
  on(event, fn) {
    (this._listeners[event] ||= []).push(fn);
    return () => { this._listeners[event] = this._listeners[event].filter((f) => f !== fn); };
  }

  emit(event, payload) {
    for (const fn of this._listeners[event] || []) fn(payload, this);
  }

  milestone(reason) { this.emit('milestone', reason); }

  // ---- flags ----------------------------------------------------------------
  hasFlag(id) {
    if (!isValidFlag(id)) throw new Error(`Unknown flag: ${id}`);
    return this.data.flags[id] === true;
  }

  hasAllFlags(ids = []) { return ids.every((id) => this.hasFlag(id)); }

  setFlag(id) {
    if (!isValidFlag(id)) throw new Error(`Unknown flag: ${id}`);
    if (this.data.flags[id] === true) return false;
    this.data.flags[id] = true;
    this.emit('flag', id);
    if (MILESTONE_FLAGS.includes(id)) this.milestone(`flag:${id}`);
    return true;
  }

  // ---- evidence -------------------------------------------------------------
  hasEvidence(id) {
    if (!isValidEvidence(id)) throw new Error(`Unknown evidence: ${id}`);
    return this.data.evidence.includes(id);
  }

  addEvidence(id) {
    if (!isValidEvidence(id)) throw new Error(`Unknown evidence: ${id}`);
    if (this.data.evidence.includes(id)) return false;
    this.data.evidence.push(id);
    this.emit('evidence', id);
    if (EVIDENCE[id].essential) this.milestone(`evidence:${id}`);
    return true;
  }

  // ---- relations ------------------------------------------------------------
  hasRelation(id) {
    if (!RELATIONS[id]) throw new Error(`Unknown relation: ${id}`);
    return this.data.relations.includes(id);
  }

  confirmRelation(id) {
    if (!RELATIONS[id]) throw new Error(`Unknown relation: ${id}`);
    if (this.data.relations.includes(id)) return false;
    this.data.relations.push(id);
    this.emit('relation', id);
    this.milestone(`relation:${id}`);
    return true;
  }

  // ---- puzzles --------------------------------------------------------------
  puzzle(id) {
    if (!PUZZLES[id]) throw new Error(`Unknown puzzle: ${id}`);
    return (this.data.puzzles[id] ||= { solved: false, attempts: 0, hintLevel: 0 });
  }

  isPuzzleSolved(id) { return this.puzzle(id).solved === true; }

  markPuzzleSolved(id) {
    const p = this.puzzle(id);
    if (p.solved) return false;
    p.solved = true;
    this.emit('puzzle', id);
    this.milestone(`puzzle:${id}`);
    return true;
  }

  // ---- confrontations -------------------------------------------------------
  confrontation(id) {
    if (!CONFRONTATIONS[id]) throw new Error(`Unknown confrontation: ${id}`);
    return (this.data.confrontations[id] ||= { done: false, attempts: 0 });
  }

  // ---- visits, interactions, dialogue --------------------------------------
  markVisited(location) {
    if (!isValidLocation(location)) throw new Error(`Unknown location: ${location}`);
    if (this.data.visited.includes(location)) return false;
    this.data.visited.push(location);
    return true;
  }

  meet(charId) {
    if (this.data.met.includes(charId)) return false;
    this.data.met.push(charId);
    return true;
  }

  hasMet(charId) { return this.data.met.includes(charId); }

  interactionCount(id) { return this.data.interactions[id] || 0; }
  bumpInteraction(id) { this.data.interactions[id] = this.interactionCount(id) + 1; return this.data.interactions[id]; }

  seenNode(id) { return (this.data.dialogue.seen[id] || 0) > 0; }
  markNodeSeen(id) { this.data.dialogue.seen[id] = (this.data.dialogue.seen[id] || 0) + 1; }
  tookChoice(key) { return this.data.dialogue.taken[key] === true; }
  markChoiceTaken(key) { this.data.dialogue.taken[key] = true; }

  setPosition(location, x, y, facing = 'right') {
    if (!isValidLocation(location)) throw new Error(`Unknown location: ${location}`);
    this.data.location = location;
    this.data.position = { x: num(x), y: num(y), facing: facing === 'left' ? 'left' : 'right' };
  }

  addPlaytime(ms) { this.data.playtimeMs += Math.max(0, num(ms)); }

  // ---- serialisation --------------------------------------------------------
  toJSON() { return JSON.parse(JSON.stringify(this.data)); }

  /**
   * Turn untrusted saved data into a valid state, or return null if it cannot be used.
   * Unknown flags / evidence / relations / puzzles are dropped, never thrown on.
   */
  static sanitize(raw) {
    if (!isPlainObject(raw)) return null;
    if (raw.version !== SAVE_VERSION) return null;
    const out = createInitialData();

    if (isValidLocation(raw.location)) out.location = raw.location;
    if (isPlainObject(raw.position)) {
      out.position = {
        x: num(raw.position.x), y: num(raw.position.y),
        facing: raw.position.facing === 'left' ? 'left' : 'right',
      };
    }
    if (isPlainObject(raw.flags)) {
      for (const [k, v] of Object.entries(raw.flags)) if (isValidFlag(k) && v === true) out.flags[k] = true;
    }
    if (Array.isArray(raw.evidence)) {
      for (const id of raw.evidence) if (isValidEvidence(id) && !out.evidence.includes(id)) out.evidence.push(id);
    }
    if (Array.isArray(raw.relations)) {
      for (const id of raw.relations) if (RELATIONS[id] && !out.relations.includes(id)) out.relations.push(id);
    }
    if (isPlainObject(raw.puzzles)) {
      for (const [id, p] of Object.entries(raw.puzzles)) {
        if (!PUZZLES[id] || !isPlainObject(p)) continue;
        out.puzzles[id] = { solved: p.solved === true, attempts: Math.max(0, num(p.attempts)), hintLevel: Math.min(3, Math.max(0, num(p.hintLevel))) };
      }
    }
    if (isPlainObject(raw.confrontations)) {
      for (const [id, c] of Object.entries(raw.confrontations)) {
        if (!CONFRONTATIONS[id] || !isPlainObject(c)) continue;
        out.confrontations[id] = { done: c.done === true, attempts: Math.max(0, num(c.attempts)) };
      }
    }
    if (Array.isArray(raw.visited)) out.visited = raw.visited.filter((l, i, a) => isValidLocation(l) && a.indexOf(l) === i);
    if (Array.isArray(raw.met)) out.met = raw.met.filter((c, i, a) => typeof c === 'string' && a.indexOf(c) === i);
    if (isPlainObject(raw.interactions)) {
      for (const [k, v] of Object.entries(raw.interactions)) if (typeof k === 'string' && num(v) > 0) out.interactions[k] = Math.floor(num(v));
    }
    if (isPlainObject(raw.dialogue)) {
      if (isPlainObject(raw.dialogue.seen)) {
        for (const [k, v] of Object.entries(raw.dialogue.seen)) if (num(v) > 0) out.dialogue.seen[k] = Math.floor(num(v));
      }
      if (isPlainObject(raw.dialogue.taken)) {
        for (const [k, v] of Object.entries(raw.dialogue.taken)) if (v === true) out.dialogue.taken[k] = true;
      }
    }
    if (isPlainObject(raw.settings)) {
      const d = defaultSettings();
      out.settings = {
        volume: Math.min(1, Math.max(0, num(raw.settings.volume, d.volume))),
        muted: raw.settings.muted === true,
        textSpeed: ['slow', 'normal', 'fast', 'instant'].includes(raw.settings.textSpeed) ? raw.settings.textSpeed : d.textSpeed,
        snow: raw.settings.snow !== false,
      };
    }
    out.playtimeMs = Math.max(0, num(raw.playtimeMs));
    return out;
  }

  static fromSaved(raw) {
    const data = WorldState.sanitize(raw);
    return data ? new WorldState(data) : null;
  }
}
