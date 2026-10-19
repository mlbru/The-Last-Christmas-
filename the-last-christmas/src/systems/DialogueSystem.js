// Dialogue runner. Knows nothing about Phaser or the DOM: the UI just renders `step`
// and calls advance() / choose(i) / present(id) / cancel().
//
// Node shape (see data/dialogue/*.js):
//   { speaker, text, mood?, next?, end?, choices?: [{ text, next?, when?, once?, confront?, end? }],
//     route?: [{ when?, next }],         // silent branching: no text shown, first match wins
//     present?: { prompt, correct:[ids], next, partial?:{id:text}, wrong, hints:[...] },
//     effects?: { flags:[], evidence:[], meet:[], relations? } }
//
// Rules enforced by tests: at most 3 choices per node, every `next` exists, every id is valid.

import { NODES, CONVERSATIONS } from '../data/dialogue.js';
import { CHARACTERS } from '../data/characters.js';
import { CONFRONTATIONS } from '../data/deductions.js';
import { EVIDENCE } from '../data/evidence.js';
import { check } from './Conditions.js';
import { collect } from './EvidenceSystem.js';
import { presentEvidence, confrontationHint, confrontationAvailable } from './DeductionSystem.js';
import { recompute } from '../game/StoryLogic.js';

export const MAX_CHOICES = 3;
const MAX_ROUTE_DEPTH = 20;

export function speakerName(id) {
  if (id === 'narrator') return '';
  return CHARACTERS[id] ? CHARACTERS[id].name : id;
}

export class DialogueRunner {
  constructor(world, { nodes = NODES, conversations = CONVERSATIONS } = {}) {
    this.world = world;
    this.nodes = nodes;
    this.conversations = conversations;
    this.step = null;
    this.active = false;
    this._returnTo = null;       // node to resume after a confrontation is cancelled
    this._attempts = 0;
    this._finishedCallbacks = [];
  }

  onFinish(fn) { this._finishedCallbacks.push(fn); }

  // ---- starting -------------------------------------------------------------
  /** Pick the first matching entry for a character and start it. Returns the first step. */
  startConversation(charId) {
    const entries = this.conversations[charId];
    if (!entries) throw new Error(`No conversation for ${charId}`);
    const hit = entries.find((e) => check(this.world, e.when));
    if (!hit) throw new Error(`No conversation entry matched for ${charId}`);
    return this.startNode(hit.node);
  }

  startNode(id) {
    this.active = true;
    this._attempts = 0;
    this._returnTo = null;
    return this._enter(id);
  }

  // ---- core -----------------------------------------------------------------
  _node(id) {
    const node = this.nodes[id];
    if (!node) throw new Error(`Unknown dialogue node: ${id}`);
    return node;
  }

  _enter(id, depth = 0) {
    if (depth > MAX_ROUTE_DEPTH) throw new Error(`Dialogue route loop at ${id}`);
    const node = this._node(id);

    if (node.route) {
      const hit = node.route.find((r) => check(this.world, r.when));
      if (!hit) throw new Error(`No route matched at ${id}`);
      this.world.markNodeSeen(id);
      return this._enter(hit.next, depth + 1);
    }

    this.world.markNodeSeen(id);
    if (node.speaker && node.speaker !== 'narrator' && node.speaker !== 'rowan' && CHARACTERS[node.speaker]) {
      this.world.meet(node.speaker);
    }

    const fx = node.effects || {};
    (fx.meet || []).forEach((c) => this.world.meet(c));
    (fx.flags || []).forEach((f) => this.world.setFlag(f));
    const got = collect(this.world, fx.evidence || []);
    recompute(this.world);

    const base = {
      nodeId: id,
      speaker: node.speaker || 'narrator',
      name: speakerName(node.speaker || 'narrator'),
      mood: node.mood || 'neutral',
      collected: got.added,
    };

    if (node.present) {
      this.step = {
        ...base, type: 'present', text: node.text || '', prompt: node.present.prompt,
        evidence: this._heldEvidence(), choices: null, canCancel: false,
      };
      return this.step;
    }

    const choices = this._visibleChoices(node, id);
    this.step = {
      ...base, type: 'line', text: node.text || '',
      choices: choices.length ? choices : null,
      // a node with neither choices nor next simply ends on advance()
      canAdvance: choices.length === 0,
    };
    return this.step;
  }

  _heldEvidence() {
    return this.world.data.evidence.map((id) => EVIDENCE[id]);
  }

  _visibleChoices(node, nodeId) {
    if (!node.choices) return [];
    const out = [];
    node.choices.forEach((c, index) => {
      if (!check(this.world, c.when)) return;
      if (c.once && this.world.tookChoice(`${nodeId}:${index}`)) return;
      out.push({ index, text: c.text });
    });
    return out;
  }

  /** Continue from a node without choices. Returns the next step, or null when finished. */
  advance() {
    if (!this.active || !this.step) return null;
    if (this.step.type !== 'line' || this.step.choices) return this.step;
    const node = this._node(this.step.nodeId);
    if (node.end || !node.next) return this._finish();
    return this._enter(node.next);
  }

  choose(visibleIndex) {
    if (!this.active || !this.step || this.step.type !== 'line' || !this.step.choices) return this.step;
    const picked = this.step.choices.find((c) => c.index === visibleIndex);
    if (!picked) return this.step;
    const nodeId = this.step.nodeId;
    const node = this._node(nodeId);
    const choice = node.choices[picked.index];
    this.world.markChoiceTaken(`${nodeId}:${picked.index}`);

    if (choice.confront) {
      const conf = CONFRONTATIONS[choice.confront];
      if (!conf) throw new Error(`Unknown confrontation ${choice.confront} at ${nodeId}`);
      if (!confrontationAvailable(this.world, choice.confront)) {
        // Cannot be reached through the UI (the choice is gated), but never crash on it.
        return this.step;
      }
      this._returnTo = nodeId;
      this._attempts = 0;
      this.step = {
        type: 'confront', nodeId, confrontation: choice.confront, speaker: conf.character,
        name: speakerName(conf.character), mood: 'neutral', text: conf.claim,
        evidence: this._heldEvidence(), choices: null, canCancel: true,
      };
      return this.step;
    }
    if (choice.end || !choice.next) return this._finish();
    return this._enter(choice.next);
  }

  /** Present a piece of evidence at a 'confront' or 'present' step. */
  present(evidenceId) {
    if (!this.active || !this.step) return { result: 'invalid', reply: '' };

    if (this.step.type === 'confront') {
      const confId = this.step.confrontation;
      const res = presentEvidence(this.world, confId, evidenceId);
      if (res.result === 'correct') {
        this._attempts = 0;
        const next = this._enter(res.node);
        return { ...res, step: next };
      }
      this._attempts += 1;
      return { ...res, hint: confrontationHint(this.world, confId), step: this.step };
    }

    if (this.step.type === 'present') {
      const node = this._node(this.step.nodeId);
      const p = node.present;
      if (!EVIDENCE[evidenceId] || !this.world.data.evidence.includes(evidenceId)) {
        return { result: 'invalid', reply: 'You do not have that.', step: this.step };
      }
      if (p.correct.includes(evidenceId)) {
        this._attempts = 0;
        const next = this._enter(p.next);
        return { result: 'correct', reply: '', step: next };
      }
      this._attempts += 1;
      const partial = p.partial && p.partial[evidenceId];
      const hints = p.hints || [];
      const hint = this._attempts >= 2 && hints.length ? hints[Math.min(hints.length - 1, this._attempts - 2)] : null;
      return { result: partial ? 'partial' : 'wrong', reply: partial || p.wrong, hint, step: this.step };
    }
    return { result: 'invalid', reply: '', step: this.step };
  }

  /** Back out of a confrontation to the conversation hub. Not allowed in 'present' steps. */
  cancel() {
    if (!this.step || this.step.type !== 'confront' || !this._returnTo) return this.step;
    const back = this._returnTo;
    this._returnTo = null;
    return this._enter(back);
  }

  _finish() {
    this.active = false;
    this.step = null;
    this._returnTo = null;
    const cbs = this._finishedCallbacks;
    this._finishedCallbacks = [];
    cbs.forEach((fn) => fn());
    return null;
  }

  /** Immediately end the dialogue (Escape). Safe at any time; progress already applied is kept. */
  abort() { return this._finish(); }
}
