// The journal: Evidence, Persons, Conclusions and Hints tabs. Reads state through the journal
// functions in systems/EvidenceSystem.js, so it only ever shows what the player has found.

import { h, clear, pixelImg, evidenceIconURL, portraitURL } from './dom.js';
import { journalEvidence, journalPersons, journalConclusions, evidenceCount, INVESTIGATION_LINES } from '../systems/EvidenceSystem.js';
import { openPuzzles, nextHint, hintsUnlocked } from '../systems/PuzzleSystem.js';
import { relationHint, coreProgress } from '../systems/DeductionSystem.js';
import { PUZZLES } from '../data/puzzles.js';

const TABS = [['evidence', 'Evidence'], ['persons', 'Persons'], ['conclusions', 'Conclusions'], ['hints', 'Hints']];

export class JournalUI {
  constructor(overlay, ctrl) { this.overlay = overlay; this.ctrl = ctrl; this.tab = 'evidence'; this.line = null; this.nudges = {}; }

  open(tab) {
    if (tab) this.tab = tab;
    this.body = h('div', { class: 'journal-body' });
    this.tabs = h('nav', { class: 'tabs', role: 'tablist' });
    const wrap = h('div', { class: 'journal' }, this.tabs, this.body);
    this.overlay.open({ title: 'Journal', content: wrap, className: 'wide', onClose: () => this.ctrl.closeOverlay() });
    this.render();
  }

  render() {
    clear(this.tabs);
    for (const [id, label] of TABS) {
      this.tabs.append(h('button', { class: `tab ${this.tab === id ? 'on' : ''}`, role: 'tab', 'aria-selected': this.tab === id, onclick: () => { this.tab = id; this.render(); } }, label));
    }
    clear(this.body);
    ({ evidence: () => this.evidence(), persons: () => this.persons(), conclusions: () => this.conclusions(), hints: () => this.hints() })[this.tab]();
  }

  evidence() {
    const w = this.ctrl.world, n = evidenceCount(w);
    const filters = h('div', { class: 'filters' }, h('span', { class: 'count', text: `${n.held} of ${n.total} found` }));
    const mk = (id, label) => h('button', { class: `chip ${this.line === id ? 'on' : ''}`, onclick: () => { this.line = id; this.render(); } }, label);
    filters.append(mk(null, 'All'), ...Object.values(INVESTIGATION_LINES).map((l) => mk(l.id, l.name)));
    this.body.append(filters);
    const items = journalEvidence(w, this.line);
    if (!items.length) { this.body.append(h('p', { class: 'empty', text: 'Nothing here yet. Search, ask, and look again.' })); return; }
    const list = h('div', { class: 'cards' });
    for (const ev of items) {
      list.append(h('article', { class: 'card' }, pixelImg(evidenceIconURL(ev.icon), 'icon'),
        h('div', {}, h('h3', { text: ev.name }), h('p', { class: 'src', text: ev.source }), h('p', { text: ev.description }))));
    }
    this.body.append(list);
  }

  persons() {
    const list = h('div', { class: 'cards' });
    for (const p of journalPersons(this.ctrl.world)) {
      list.append(h('article', { class: 'card person' }, pixelImg(portraitURL(p.id, 'neutral'), 'portrait-sm', p.name),
        h('div', {}, h('h3', { text: p.name }), h('p', { class: 'src', text: p.role }), ...p.notes.map((t) => h('p', { text: t })))));
    }
    this.body.append(list);
  }

  conclusions() {
    const w = this.ctrl.world, prog = coreProgress(w);
    this.body.append(h('p', { class: 'count', text: `Core reconstruction: ${prog.done} of ${prog.total} established` }));
    const list = h('div', { class: 'cards' });
    for (const c of journalConclusions(w)) {
      list.append(h('article', { class: `card conclusion ${c.status}` },
        h('div', {}, h('h3', { text: c.title }), h('p', { text: c.text }), c.status === 'open' ? h('button', { class: 'btn small', onclick: () => { this.ctrl.closeOverlay(); this.ctrl.openOverlay('board'); } }, 'Open the Deduction Board') : null)));
    }
    this.body.append(list);
  }

  hints() {
    const w = this.ctrl.world;
    this.body.append(h('section', { class: 'box' }, h('h3', { text: 'What now?' }), h('p', { text: this.ctrl.objective() })));
    const open = openPuzzles(w);
    this.body.append(h('h3', { text: 'Puzzles you can attempt' }));
    if (!open.length) this.body.append(h('p', { class: 'empty', text: 'No open puzzles right now.' }));
    for (const id of open) {
      const box = h('section', { class: 'box' }, h('h4', { text: PUZZLES[id].name }));
      for (const [i, t] of hintsUnlocked(w, id).entries()) box.append(h('p', { class: 'hint', text: `Hint ${i + 1}: ${t}` }));
      const used = hintsUnlocked(w, id).length;
      if (used < PUZZLES[id].hints.length) {
        box.append(h('button', { class: 'btn small', onclick: () => { nextHint(w, id); this.render(); } }, used === PUZZLES[id].hints.length - 1 ? 'Show the solution' : 'Give me a hint'));
      }
      this.body.append(box);
    }
    const conclusions = journalConclusions(w).filter((c) => c.status !== 'confirmed');
    this.body.append(h('h3', { text: 'Deduction help' }));
    const tryable = conclusions.filter((c) => c.status === 'open');
    if (!tryable.length) this.body.append(h('p', { class: 'empty', text: 'You have no untested leads. Keep collecting evidence.' }));
    for (const c of tryable) {
      const level = this.nudges[c.id] || 0;
      const box = h('section', { class: 'box' }, h('p', { text: c.text }));
      for (let i = 0; i < level; i++) box.append(h('p', { class: 'hint', text: relationHint(w, c.id, i) }));
      if (level < 3) box.append(h('button', { class: 'btn small', onclick: () => { this.nudges[c.id] = level + 1; this.render(); } }, 'Nudge me'));
      this.body.append(box);
    }
  }
}
