// A headless player. It drives the *real* systems (interactions, dialogue runner, deduction board,
// puzzle sessions, locations), so a green playthrough proves the game logic can be completed.
// It deliberately knows nothing about the story beyond the data files' public puzzle answers.

import { INTERACTIONS } from '../../src/data/interactions.js';
import { PUZZLES } from '../../src/data/puzzles.js';
import { EVIDENCE_IDS } from '../../src/data/evidence.js';
import { WorldState } from '../../src/game/WorldState.js';
import { canStartFinale } from '../../src/game/StoryLogic.js';
import { interact, isUsable } from '../../src/systems/InteractionSystem.js';
import { DialogueRunner } from '../../src/systems/DialogueSystem.js';
import { createSession } from '../../src/systems/PuzzleSystem.js';
import { testLink } from '../../src/systems/DeductionSystem.js';
import { enterLocation } from '../../src/systems/LocationSystem.js';
import { START_LOCATION } from '../../src/data/locationIds.js';

/** Small deterministic PRNG so fuzz runs are reproducible. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

export function snapshot(world) {
  const d = world.data;
  return JSON.stringify([
    d.evidence.length, Object.keys(d.flags).length, d.relations.length,
    Object.values(d.puzzles).filter((p) => p.solved).length,
    Object.values(d.confrontations).filter((c) => c.done).length,
    Object.keys(d.dialogue.seen).length, Object.keys(d.dialogue.taken).length, d.visited.length,
  ]);
}

export class Bot {
  /**
   * options:
   *   skipConfrontations, skipOptionalPuzzles, skipIds (Set of interaction ids), random (rng fn)
   *   noise: number of deliberate wrong actions to try before each real one
   */
  constructor(world = new WorldState(), options = {}) {
    this.world = world;
    this.opts = { skipConfrontations: false, skipOptionalPuzzles: false, skipIds: new Set(), random: null, noise: 0, stopWhen: null, onStep: null, ...options };
    this.location = world.data.location || START_LOCATION;
    this.reachable = new Set([this.location]);
    this.log = [];
    this.picks = {};
    this.runner = new DialogueRunner(world);
    if (!world.data.location) enterLocation(world, START_LOCATION);
  }

  // ---- dialogue ---------------------------------------------------------------
  playDialogue() {
    const r = this.runner;
    let guard = 0;
    while (r.active && r.step && guard++ < 400) {
      const s = r.step;
      if (s.type === 'line') {
        if (s.choices) {
          // Like a curious human: always try the option chosen least often, so repeatable questions
          // (that only become useful later) are asked again and again, and 'Leave' comes last.
          const node = s.choices;
          const count = (c) => this.picks[`${s.nodeId}:${c.index}`] || 0;
          const isLeave = (c) => /^(Leave|Never mind|That's all|Nothing|Just gingerbread|I'll leave|Back)/i.test(c.text);
          let pool = node;
          if (this.opts.skipConfrontations) {
            const other = node.filter((c) => !/Confront/.test(c.text));
            if (other.length) pool = other;
          }
          const ranked = [...pool].sort((a, b) => (isLeave(a) - isLeave(b)) || (count(a) - count(b)) || (a.index - b.index));
          let pick = ranked[0];
          if (this.opts.random && this.opts.random() < 0.3) pick = node[Math.floor(this.opts.random() * node.length)];
          this.picks[`${s.nodeId}:${pick.index}`] = count(pick) + 1;
          r.choose(pick.index);
        } else {
          r.advance();
        }
      } else if (s.type === 'confront' || s.type === 'present') {
        // A real player may try wrong evidence first; the game must not punish it.
        for (let i = 0; i < this.opts.noise && s.type === 'confront'; i++) r.present('ev_mayor_speech');
        let solved = false;
        for (const ev of [...this.world.data.evidence]) {
          const res = r.present(ev);
          if (res.result === 'correct') { solved = true; break; }
        }
        if (!solved) { if (s.type === 'confront') r.cancel(); else break; }
      } else break;
    }
    if (r.active) r.abort();
  }

  // ---- puzzles ----------------------------------------------------------------
  solvePuzzle(id) {
    const def = PUZZLES[id];
    const s = createSession(this.world, id);
    for (let i = 0; i < this.opts.noise; i++) this._wrongPuzzleMove(s, def);
    switch (def.type) {
      case 'select-contradictions': def.solution.forEach((l) => s.toggle(l)); return s.submit();
      case 'chronological-order': s.setOrder([...def.solutionOrder]); s.checkOrder(); return s.pickAnomaly(def.anomaly);
      case 'sequence': { let last; for (const p of def.solution) last = s.press(p); return last; }
      case 'recognition': return s.pick(def.solution);
      default: throw new Error(`unknown puzzle type ${def.type}`);
    }
  }

  _wrongPuzzleMove(s, def) {
    switch (def.type) {
      case 'select-contradictions': s.toggle('L1'); s.submit(); s.toggle('L1'); break;
      case 'chronological-order': s.checkOrder(); s.pickAnomaly('A'); break;
      case 'sequence': s.press(def.points[5].id); break;
      case 'recognition': s.pick('tin_soldier'); break;
      default: break;
    }
  }

  // ---- the board --------------------------------------------------------------
  tryAllLinks() {
    const held = [...this.world.data.evidence];
    let any = false;
    for (let i = 0; i < held.length; i++) {
      for (let j = i + 1; j < held.length; j++) {
        const res = testLink(this.world, held[i], held[j]);
        if (res.status === 'confirmed') any = true;
      }
    }
    return any;
  }

  // ---- one interaction --------------------------------------------------------
  use(it) {
    const res = interact(this.world, it.id);
    this.log.push(`${this.location}:${it.id}:${res.kind}`);
    switch (res.kind) {
      case 'dialogue':
        if (res.conversation) this.runner.startConversation(res.conversation); else this.runner.startNode(res.node);
        this.playDialogue();
        break;
      case 'puzzle':
        if (this.opts.skipOptionalPuzzles && ['puzzle_recipe', 'puzzle_archive'].includes(res.puzzle)) break;
        this.solvePuzzle(res.puzzle);
        break;
      case 'transition':
        if (res.introNode) { this.runner.startNode(res.introNode); this.playDialogue(); }
        this.enter(res.to, res.spawn);
        break;
      default: break;
    }
    return res;
  }

  enter(to, spawn = 'default') {
    this.location = to;
    this.reachable.add(to);
    const e = enterLocation(this.world, to, spawn);
    if (e.introNode) { this.runner.startNode(e.introNode); this.playDialogue(); }
    return e;
  }

  // ---- the whole game ---------------------------------------------------------
  /** Play the intro, then keep doing everything possible until nothing changes any more. */
  playToFixpoint(maxRounds = 80) {
    if (!this.world.hasFlag('intro_complete')) {
      this.runner.startConversation('voss');
      this.playDialogue();
    }
    let rounds = 0;
    let before = '';
    let quiet = 0;
    const quietNeeded = this.opts.random ? 8 : 1;
    while (rounds++ < maxRounds) {
      before = snapshot(this.world);
      const order = this.opts.random
        ? [...INTERACTIONS].sort(() => this.opts.random() - 0.5)
        : INTERACTIONS;
      for (const it of order) {
        if (this.opts.skipIds.has(it.id)) continue;
        if (it.action.finale) continue;
        if (!this.reachable.has(it.location)) continue;
        if (!isUsable(this.world, it)) continue;
        // Walk to the right place: a transition changes our current location, others just need to be there.
        this.location = it.location;
        this.use(it);
        if (this.opts.onStep) this.opts.onStep(this.world, it);
        if (this.opts.stopWhen && this.opts.stopWhen(this.world)) return { rounds, stopped: true, finale: canStartFinale(this.world) };
      }
      this.tryAllLinks();
      if (snapshot(this.world) === before) { if (++quiet >= quietNeeded) break; } else quiet = 0;
    }
    return { rounds, finale: canStartFinale(this.world) };
  }

  holdsEverything() { return EVIDENCE_IDS.every((e) => this.world.hasEvidence(e)); }
}
