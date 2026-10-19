// Small speech bubbles above Rowan for brief interactions, plus the toast stack.

import { h, clear } from './dom.js';

export class Bubble {
  constructor(root, ctrl, anchor) {
    this.root = root; this.ctrl = ctrl; this.anchor = anchor;     // anchor() -> { x, y } in px inside root, or null
    this.timer = null; this.lines = []; this.idx = 0;
    ctrl.on('bubble', (p) => this.show(p.lines, p.kind));
    ctrl.on('mode', (m) => { if (m !== 'explore') this.hide(); });
    ctrl.on('location', () => this.hide());
    root.addEventListener('click', () => this.next());
  }

  show(lines, kind = 'say') {
    this.hide();
    this.lines = lines.slice(); this.idx = 0; this.kind = kind;
    this.render();
  }

  render() {
    clear(this.root).className = `bubble ${this.kind === 'blocked' ? 'blocked' : ''}`;
    this.root.hidden = false;
    this.root.append(h('div', { class: 'bubble-text', text: this.lines[this.idx] }),
      this.idx < this.lines.length - 1 ? h('div', { class: 'bubble-more', text: '▼' }) : null);
    this.place();
    clearTimeout(this.timer);
    const ms = Math.max(2800, this.lines[this.idx].length * 55);
    this.timer = setTimeout(() => this.next(), ms);
  }

  place() {
    const a = this.anchor && this.anchor();
    if (!a) return;
    const w = this.root.offsetWidth || 220;
    const parent = this.root.parentElement.getBoundingClientRect();
    const left = Math.min(Math.max(8, a.x - w / 2), parent.width - w - 8);
    this.root.style.left = `${left}px`;
    this.root.style.top = `${Math.max(8, a.y - this.root.offsetHeight - 10)}px`;
    this.root.style.setProperty('--tail', `${Math.min(w - 16, Math.max(12, a.x - left))}px`);
  }

  next() {
    if (this.root.hidden) return;
    if (this.idx < this.lines.length - 1) { this.idx += 1; this.render(); } else this.hide();
  }

  hide() { clearTimeout(this.timer); this.root.hidden = true; }
  get visible() { return !this.root.hidden; }
}

export class Toasts {
  constructor(root, ctrl) {
    this.root = root;
    ctrl.on('toast', ({ text, kind }) => this.push(text, kind));
  }
  push(text, kind = 'info') {
    const el = h('div', { class: `toast ${kind}`, role: 'status' }, text);
    this.root.append(el);
    while (this.root.children.length > 4) this.root.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 3800);
    setTimeout(() => el.remove(), 4400);
  }
}
