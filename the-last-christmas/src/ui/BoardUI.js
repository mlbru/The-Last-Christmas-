// The deduction board: every card you hold in a grid, and a panel that explains the selected card:
// where it came from, what it already proves and which open questions it belongs to. To test a
// connection, choose "Link with another card" and click the second card. Wrong links cost nothing.

import { h, clear, pixelImg, evidenceIconURL } from './dom.js';
import { journalEvidence } from '../systems/EvidenceSystem.js';
import { cardInfo, coreProgress, establishedConclusions } from '../systems/DeductionSystem.js';
import { EVIDENCE } from '../data/evidence.js';

const RESULT_TITLE = { confirmed: 'New conclusion', known: 'Already established', unsupported: 'No connection', invalid: '' };

export class BoardUI {
  constructor(overlay, ctrl) { this.overlay = overlay; this.ctrl = ctrl; }

  open() {
    this.focus = null; this.linking = false; this.revealed = new Set(); this.message = null;
    this.deck = h('div', { class: 'deck', role: 'list' });
    this.detail = h('aside', { class: 'detail', 'aria-live': 'polite' });
    this.feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    this.conclusions = h('section', { class: 'concl' });
    const wrap = h('div', { class: 'board' }, h('div', { class: 'board-main' }, this.deck, this.detail), this.feedback, this.conclusions);
    this.overlay.open({ title: 'Deduction Board', content: wrap, className: 'wide', onClose: () => this.ctrl.closeOverlay() });
    this.render();
  }

  render() {
    const w = this.ctrl.world;
    const info = this.focus ? cardInfo(w, this.focus) : null;
    const hinted = new Set(info ? info.open.filter((q) => this.revealed.has(q.id)).flatMap((q) => q.partners) : []);

    clear(this.deck);
    const items = journalEvidence(w);
    if (!items.length) this.deck.append(h('p', { class: 'empty', text: 'No evidence yet. Come back after you have searched.' }));
    for (const ev of items) {
      const proves = cardInfo(w, ev.id).established.length;
      const cls = ['ev-card', ev.id === this.focus ? 'sel' : '', this.linking && ev.id !== this.focus ? 'target' : '', hinted.has(ev.id) ? 'hint' : ''].join(' ');
      this.deck.append(h('button', { class: cls, role: 'listitem', title: ev.name, onclick: () => this.pick(ev.id) },
        pixelImg(evidenceIconURL(ev.icon), 'icon'), h('span', { class: 'name', text: ev.name }),
        proves ? h('span', { class: 'proves', title: `${proves} established`, text: `✓${proves}` }) : null));
    }

    this.renderDetail(info);
    this.renderFeedback();
    this.renderConclusions();
  }

  renderDetail(info) {
    clear(this.detail);
    if (!info) {
      this.detail.append(h('p', { class: 'empty', text: 'Click a card to read it and to see which questions it might help answer.' }));
      return;
    }
    const ev = info.evidence;
    this.detail.append(
      h('div', { class: 'detail-head' }, pixelImg(evidenceIconURL(ev.icon), 'icon'), h('div', {}, h('h3', { text: ev.name }), h('p', { class: 'src', text: `Found: ${ev.source}` }))),
      h('p', { text: ev.description }),
      h('button', { class: `btn ${this.linking ? '' : 'primary'}`, onclick: () => { this.linking = !this.linking; this.message = null; this.render(); } },
        this.linking ? 'Cancel linking' : 'Link with another card…'));
    if (this.linking) this.detail.append(h('p', { class: 'hint', text: 'Now click the card you want to compare it with.' }));

    if (info.open.length) {
      this.detail.append(h('h4', { text: 'Open questions' }));
      for (const q of info.open) {
        const box = h('div', { class: 'lead' }, h('p', { class: 'q', text: q.question }),
          q.core ? h('span', { class: 'tag', text: 'needed for the ceremony' }) : null);
        if (!q.partners.length) box.append(h('p', { class: 'src', text: 'You have not found what answers this yet.' }));
        else if (!this.revealed.has(q.id)) {
          box.append(h('p', { class: 'src', text: 'You already hold a card that answers this.' }),
            h('button', { class: 'btn small', onclick: () => { this.revealed.add(q.id); this.render(); } }, 'Which card?'));
        } else {
          for (const p of q.partners) {
            box.append(h('p', { class: 'hint' }, `Try it with "${EVIDENCE[p].name}". `,
              h('button', { class: 'btn small', onclick: () => this.attempt(this.focus, p) }, 'Link them')));
          }
        }
        this.detail.append(box);
      }
    }
    if (info.established.length) {
      this.detail.append(h('h4', { text: 'Already proves' }));
      for (const c of info.established) this.detail.append(h('div', { class: 'lead done' }, h('p', { class: 'q', text: c.label }), h('p', { text: c.conclusion })));
    }
    if (!info.open.length && !info.established.length) {
      this.detail.append(h('p', { class: 'src', text: 'This card does not link to another card on its own. It matters in conversations and confrontations.' }));
    }
  }

  renderFeedback() {
    clear(this.feedback);
    const res = this.message;
    this.feedback.hidden = !res;
    if (!res) return;
    this.feedback.className = `feedback ${res.status}`;
    const title = RESULT_TITLE[res.status];
    if (title) this.feedback.append(h('strong', { text: res.title || title }));
    this.feedback.append(h('p', { text: res.message }));
  }

  renderConclusions() {
    clear(this.conclusions);
    const w = this.ctrl.world, pr = coreProgress(w), list = establishedConclusions(w);
    this.conclusions.append(h('h4', { text: `Conclusions (${list.length}). Needed for the ceremony: ${pr.done} of ${pr.total}` }));
    if (!list.length) this.conclusions.append(h('p', { class: 'empty', text: 'None yet. Link two cards that answer the same question.' }));
    for (const c of list) this.conclusions.append(h('details', { class: c.core ? 'core' : '' }, h('summary', { text: c.label }), h('p', { text: c.conclusion })));
  }

  pick(id) {
    if (this.linking && this.focus && id !== this.focus) { this.attempt(this.focus, id); return; }
    this.focus = id; this.linking = false; this.message = null;
    this.render();
  }

  attempt(a, b) {
    this.message = this.ctrl.link(a, b);
    this.linking = false;
    this.render();
  }
}
