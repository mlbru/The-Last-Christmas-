// The journal: Case (what now, and the official 2001 story), Evidence, People and Hints.
// Reads state through the systems, so it only ever shows what the player has found. Conclusions live
// on the Deduction Board.

import { h, clear, pixelImg, evidenceIconURL, portraitURL } from './dom.js';
import { journalEvidence, journalPersons, evidenceCount } from '../systems/EvidenceSystem.js';
import { openPuzzles, nextHint, hintsUnlocked } from '../systems/PuzzleSystem.js';
import { openLeads } from '../systems/DeductionSystem.js';
import { EVIDENCE } from '../data/evidence.js';
import { PUZZLES } from '../data/puzzles.js';
import { LOCATIONS } from '../data/locations.js';
import { officialStory } from '../systems/HistorySystem.js';

const TABS = [['case', 'Case'], ['evidence', 'Evidence'], ['persons', 'People'], ['hints', 'Hints']];

export class JournalUI {
  constructor(overlay, ctrl) { this.overlay = overlay; this.ctrl = ctrl; this.tab = 'case'; this.shown = new Set(); }

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
    ({ case: () => this.case(), evidence: () => this.evidence(), persons: () => this.persons(), hints: () => this.hints() })[this.tab]();
  }

  evidence() {
    const w = this.ctrl.world, n = evidenceCount(w);
    this.body.append(h('p', { class: 'count', text: `${n.held} of ${n.total} found, in the order you found them. Open the Deduction Board (B) to connect them.` }));
    const items = journalEvidence(w);
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

  /** What to do next, and the official version of 2001, struck through as the evidence contradicts it. */
  case() {
    this.body.append(h('section', { class: 'box' }, h('h3', { text: 'What now?' }), h('p', { text: this.ctrl.objective() })));
    const claims = officialStory(this.ctrl.world);
    const left = claims.filter((c) => c.status === 'official').length;
    this.body.append(h('h3', { text: 'The story the town tells about Christmas Eve 2001' }),
      h('p', { class: 'count', text: left ? `${claims.length - left} of ${claims.length} claims contradicted so far.` : 'Every part of the official story is contradicted.' }));
    const list = h('div', { class: 'cards' });
    for (const c of claims) {
      list.append(h('article', { class: `card claim ${c.status}` },
        h('div', {}, h('h3', { text: c.claim }),
          c.reasons.length ? c.reasons.map((r) => h('p', { text: r })) : h('p', { class: 'src', text: 'Still the official story.' }))));
    }
    this.body.append(list);
  }

  hints() {
    const w = this.ctrl.world;
    const open = openPuzzles(w);
    this.body.append(h('h3', { text: 'Puzzles you can attempt' }));
    if (!open.length) this.body.append(h('p', { class: 'empty', text: 'No open puzzles right now.' }));
    for (const id of open) {
      const box = h('section', { class: 'box' }, h('h4', { text: PUZZLES[id].name }), h('p', { class: 'src', text: `Where: ${LOCATIONS[PUZZLES[id].location].name}` }));
      for (const [i, t] of hintsUnlocked(w, id).entries()) box.append(h('p', { class: 'hint', text: `Hint ${i + 1}: ${t}` }));
      const used = hintsUnlocked(w, id).length;
      if (used < PUZZLES[id].hints.length) {
        box.append(h('button', { class: 'btn small', onclick: () => { nextHint(w, id); this.render(); } }, used === PUZZLES[id].hints.length - 1 ? 'Show the solution' : 'Give me a hint'));
      }
      this.body.append(box);
    }
    this.body.append(h('h3', { text: 'Questions you can answer now' }));
    const leads = openLeads(w);
    if (!leads.length) this.body.append(h('p', { class: 'empty', text: 'No open questions you can answer with what you hold. Keep collecting evidence.' }));
    for (const l of leads) {
      const box = h('section', { class: 'box' }, h('p', { text: l.question }));
      if (this.shown.has(l.id)) box.append(h('p', { class: 'hint', text: `Link "${EVIDENCE[l.pair[0]].name}" with "${EVIDENCE[l.pair[1]].name}" on the Deduction Board.` }));
      else box.append(h('button', { class: 'btn small', onclick: () => { this.shown.add(l.id); this.render(); } }, 'Show me'));
      this.body.append(box);
    }
  }
}
