// Puzzle logic for all four puzzles. Data lives in data/puzzles.js; the DOM overlay in
// ui/PuzzleUI.js only renders sessions and forwards clicks. No timers, no penalties.

import { PUZZLES } from '../data/puzzles.js';
import { collect } from './EvidenceSystem.js';
import { recompute } from '../game/StoryLogic.js';

export function canStart(world, id) {
  const def = PUZZLES[id];
  if (!def) throw new Error(`Unknown puzzle: ${id}`);
  const req = def.requires || {};
  const ok =
    (req.evidence || []).every((e) => world.hasEvidence(e)) &&
    (!req.anyEvidence || req.anyEvidence.some((e) => world.hasEvidence(e))) &&
    (req.flags || []).every((f) => world.hasFlag(f));
  return ok ? { ok: true } : { ok: false, message: def.lockedMessage };
}

/** Apply rewards exactly once; calling it again for a solved puzzle is harmless. */
export function complete(world, id) {
  const def = PUZZLES[id];
  const first = world.markPuzzleSolved(id);
  const got = collect(world, def.rewards.evidence);
  const flags = [];
  for (const f of def.rewards.flags) if (world.setFlag(f)) flags.push(f);
  recompute(world);
  return { first, newEvidence: got.added.map((e) => e.id), flags, successText: def.successText };
}

// ---- hints ---------------------------------------------------------------------

export function hintsUnlocked(world, id) {
  const def = PUZZLES[id];
  if (!def) throw new Error(`Unknown puzzle: ${id}`);
  return def.hints.slice(0, world.puzzle(id).hintLevel);
}

/** Reveal the next hint. The third is explicit. Returns null once everything is revealed. */
export function nextHint(world, id) {
  const def = PUZZLES[id];
  const st = world.puzzle(id);
  if (st.hintLevel >= def.hints.length) return null;
  st.hintLevel += 1;
  return { level: st.hintLevel, text: def.hints[st.hintLevel - 1], last: st.hintLevel === def.hints.length };
}

// ---- sessions ------------------------------------------------------------------

class Session {
  constructor(world, id) {
    this.world = world;
    this.id = id;
    this.def = PUZZLES[id];
    this.solved = world.isPuzzleSolved(id);
  }
  _miss() { this.world.puzzle(this.id).attempts += 1; }
  _win() { this.solved = true; return { status: 'solved', ...complete(this.world, this.id) }; }
}

/** Puzzle 1: pick every margin line that contradicts the fire report's timeline. */
class RecipeSession extends Session {
  constructor(w, id) { super(w, id); this.selected = new Set(); }
  toggle(lineId) {
    if (!this.def.lines.some((l) => l.id === lineId)) return false;
    if (this.selected.has(lineId)) this.selected.delete(lineId); else this.selected.add(lineId);
    return true;
  }
  submit() {
    if (this.solved) return { status: 'solved', ...complete(this.world, this.id) };
    const sol = new Set(this.def.solution);
    const picked = [...this.selected];
    const fb = this.def.feedback;
    if (picked.length === 0) return { status: 'wrong', feedback: fb.none };
    const wrong = picked.filter((p) => !sol.has(p));
    const missing = this.def.solution.filter((s) => !this.selected.has(s));
    if (wrong.length === 0 && missing.length === 0) return this._win();
    this._miss();
    if (wrong.length === 0) return { status: 'wrong', feedback: fb.tooFew };
    const specific = this.def.wrongPickFeedback[wrong[0]];
    return { status: 'wrong', feedback: missing.length ? fb.mixed : fb.tooMany, detail: specific || null };
  }
}

/** Puzzle 2: order the cards chronologically, then name the card that cannot be what it claims. */
class ArchiveSession extends Session {
  constructor(w, id) {
    super(w, id);
    // Start from a fixed, deliberately wrong arrangement so nothing is given away.
    this.order = ['C', 'E', 'A', 'D', 'B'].filter((c) => this.def.cards.some((x) => x.id === c));
    this.stage = 'order';
  }
  setOrder(order) {
    const ids = this.def.cards.map((c) => c.id).sort().join('');
    if (!Array.isArray(order) || [...order].sort().join('') !== ids) return false;
    this.order = [...order];
    return true;
  }
  move(from, to) {
    if (from < 0 || to < 0 || from >= this.order.length || to >= this.order.length) return false;
    const [c] = this.order.splice(from, 1);
    this.order.splice(to, 0, c);
    return true;
  }
  checkOrder() {
    if (this.solved) return { status: 'solved', ...complete(this.world, this.id) };
    if (this.order.join('') === this.def.solutionOrder.join('')) {
      this.stage = 'anomaly';
      return { status: 'orderRight', feedback: this.def.feedback.orderRight };
    }
    this._miss();
    // Say how many cards are in the right place, nothing more.
    const right = this.order.filter((c, i) => c === this.def.solutionOrder[i]).length;
    return { status: 'orderWrong', feedback: this.def.feedback.orderWrong, inPlace: right };
  }
  pickAnomaly(cardId) {
    if (this.stage !== 'anomaly') return { status: 'notYet', feedback: 'Put the cards in order first.' };
    if (cardId === this.def.anomaly) return { ...this._win(), explanation: this.def.anomalyExplanation };
    this._miss();
    return { status: 'anomalyWrong', feedback: this.def.feedback.anomalyWrong };
  }
}

/** Puzzle 3: press the twelve points in the order the inscription describes. */
class StarSession extends Session {
  constructor(w, id) { super(w, id); this.progress = []; }
  press(pointId) {
    if (this.solved) return { status: 'solved', ...complete(this.world, this.id) };
    if (!this.def.points.some((p) => p.id === pointId)) return { status: 'invalid' };
    if (this.progress.includes(pointId)) return { status: 'already', progress: this.progress.length };
    const expected = this.def.solution[this.progress.length];
    if (pointId === expected) {
      this.progress.push(pointId);
      if (this.progress.length === this.def.solution.length) return this._win();
      return { status: 'progress', progress: this.progress.length, feedback: this.def.feedback.progress };
    }
    this.progress = [];
    this._miss();
    return { status: 'wrong', progress: 0, feedback: this.def.feedback.wrong };
  }
}

/** Puzzle 4: recognise the plate from the photograph among the things in the toy box. */
class ToyboxSession extends Session {
  pick(itemId) {
    if (this.solved) return { status: 'solved', ...complete(this.world, this.id) };
    const item = this.def.items.find((i) => i.id === itemId);
    if (!item) return { status: 'invalid' };
    if (itemId === this.def.solution) return { ...this._win(), note: item.note };
    this._miss();
    return { status: 'wrong', feedback: this.def.feedback.wrong, note: item.note };
  }
}

const SESSION_TYPES = {
  'select-contradictions': RecipeSession,
  'chronological-order': ArchiveSession,
  'sequence': StarSession,
  'recognition': ToyboxSession,
};

export function createSession(world, id) {
  const def = PUZZLES[id];
  if (!def) throw new Error(`Unknown puzzle: ${id}`);
  const can = canStart(world, id);
  if (!can.ok) throw new Error(`Puzzle ${id} is not available: ${can.message}`);
  const Type = SESSION_TYPES[def.type];
  if (!Type) throw new Error(`No session type for ${def.type}`);
  return new Type(world, id);
}

/** Puzzles that can currently be attempted and have not been solved. For the journal hint list. */
export function openPuzzles(world) {
  return Object.keys(PUZZLES).filter((id) => !world.isPuzzleSolved(id) && canStart(world, id).ok);
}
