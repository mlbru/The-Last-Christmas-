// The deduction board: evidence cards on a cork board. Drag a card onto another, or click one
// card and then another (or press Enter on both), to test a connection. Wrong links cost nothing.

import { h, clear, pixelImg, evidenceIconURL } from './dom.js';
import { journalEvidence } from '../systems/EvidenceSystem.js';
import { coreProgress } from '../systems/DeductionSystem.js';
import { RELATIONS } from '../data/deductions.js';

const POS_KEY = 'the-last-christmas:board';
const CARD_W = 108, CARD_H = 64;

function loadPositions() { try { return JSON.parse(localStorage.getItem(POS_KEY)) || {}; } catch { return {}; } }
function savePositions(p) { try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* cosmetic only */ } }

export class BoardUI {
  constructor(overlay, ctrl) { this.overlay = overlay; this.ctrl = ctrl; this.selected = null; this.message = null; }

  open() {
    this.pos = loadPositions();
    this.cork = h('div', { class: 'cork', tabindex: '-1' });
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'strings');
    this.feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    this.progress = h('div', { class: 'count' });
    const intro = h('p', { class: 'hint-line', text: 'Drag one card onto another, or click two cards, to test whether they support, contradict or explain each other.' });
    const wrap = h('div', { class: 'board' }, intro, h('div', { class: 'cork-wrap' }, this.svg, this.cork), this.feedback, this.progress);
    this.overlay.open({ title: 'Deduction Board', content: wrap, className: 'wide', onClose: () => this.ctrl.closeOverlay() });
    this.render();
  }

  render() {
    clear(this.cork);
    const items = journalEvidence(this.ctrl.world);
    const cols = 6;
    items.forEach((ev, i) => {
      if (!this.pos[ev.id]) this.pos[ev.id] = { x: 10 + (i % cols) * (CARD_W + 10), y: 10 + Math.floor(i / cols) * (CARD_H + 14) };
      this.cork.append(this.card(ev));
    });
    this.updateLines();
    const pr = coreProgress(this.ctrl.world);
    this.progress.textContent = `Established: ${this.ctrl.world.data.relations.length} of ${Object.keys(RELATIONS).length} connections (${pr.done}/${pr.total} core)`;
    if (!items.length) this.cork.append(h('p', { class: 'empty', text: 'No evidence yet. Come back after you have searched.' }));
    this.show(this.message || { status: 'idle', message: 'Pick two pieces of evidence.' });
  }

  card(ev) {
    const p = this.pos[ev.id];
    const el = h('button', { class: `pin ${this.selected === ev.id ? 'sel' : ''}`, dataset: { id: ev.id }, title: ev.description, style: `left:${p.x}px;top:${p.y}px;width:${CARD_W}px` },
      pixelImg(evidenceIconURL(ev.icon), 'icon'), h('span', { text: ev.name }));
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = { sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true; el.classList.add('drag');
      const r = this.cork.getBoundingClientRect();
      p.x = Math.min(r.width - CARD_W, Math.max(0, drag.ox + dx)); p.y = Math.min(r.height - CARD_H, Math.max(0, drag.oy + dy));
      el.style.left = `${p.x}px`; el.style.top = `${p.y}px`;
      this.cork.querySelectorAll('.pin').forEach((o) => o.classList.toggle('over', o !== el && this.overlaps(el, o)));
      this.updateLines();
    });
    el.addEventListener('pointerup', (e) => {
      if (!drag) return;
      const moved = drag.moved; drag = null; el.classList.remove('drag');
      try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      const target = [...this.cork.querySelectorAll('.pin')].find((o) => o !== el && this.overlaps(el, o));
      this.cork.querySelectorAll('.pin').forEach((o) => o.classList.remove('over'));
      if (moved) {
        savePositions(this.pos);
        if (target) {
          this.attempt(ev.id, target.dataset.id);
          // nudge the dropped card aside so both stay readable
          p.x = Math.min(this.cork.clientWidth - CARD_W, p.x + CARD_W / 2 + 6); p.y = Math.min(this.cork.clientHeight - CARD_H, p.y + CARD_H / 2);
          el.style.left = `${p.x}px`; el.style.top = `${p.y}px`; savePositions(this.pos); this.updateLines();
        }
      } else this.pick(ev.id);
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); this.pick(ev.id); } });
    return el;
  }

  overlaps(a, b) {
    const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
    const cx = r1.left + r1.width / 2, cy = r1.top + r1.height / 2;
    return cx > r2.left && cx < r2.right && cy > r2.top && cy < r2.bottom;
  }

  pick(id) {
    if (!this.selected) { this.selected = id; this.message = { status: 'idle', message: 'Now pick the card you want to compare it with.' }; this.render(); return; }
    if (this.selected === id) { this.selected = null; this.message = null; this.render(); return; }
    const a = this.selected; this.selected = null;
    this.attempt(a, id);
  }

  attempt(a, b) {
    const res = this.ctrl.link(a, b);
    this.message = res;
    this.selected = null;
    this.render();
  }

  show(res) {
    clear(this.feedback);
    this.feedback.className = `feedback ${res.status}`;
    const title = { confirmed: 'New conclusion', known: 'Already established', near: 'Close, but not quite', unsupported: 'No connection', invalid: '', idle: '' }[res.status];
    this.feedback.append(title ? h('strong', { text: `${res.title || title}` }) : null, h('p', { text: res.message }));
  }

  updateLines() {
    clear(this.svg);
    const wr = this.cork.getBoundingClientRect();
    this.svg.setAttribute('width', wr.width || 1); this.svg.setAttribute('height', wr.height || 1);
    const w = this.ctrl.world;
    const held = new Set(w.data.evidence);
    for (const rel of w.data.relations) {
      const pair = RELATIONS[rel].pairs.find(([x, y]) => held.has(x) && held.has(y));
      if (!pair) continue;
      const [a, b] = pair;
      const pa = this.pos[a], pb = this.pos[b];
      if (!pa || !pb) continue;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pa.x + CARD_W / 2); line.setAttribute('y1', pa.y + CARD_H / 2);
      line.setAttribute('x2', pb.x + CARD_W / 2); line.setAttribute('y2', pb.y + CARD_H / 2);
      this.svg.append(line);
    }
  }
}
