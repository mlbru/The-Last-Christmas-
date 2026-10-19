// A single modal layer shared by the journal, deduction board, puzzles and menus.
import { h, clear } from './dom.js';

export class Overlay {
  constructor(root) {
    this.root = root;
    this.onClose = null;
    this.current = null;
    root.addEventListener('mousedown', (e) => { if (e.target === root && this.current && this.current.dismissable !== false) this.close(); });
  }

  get isOpen() { return !this.root.hidden; }

  /** Show a panel. `content` is a DOM node. Returns the panel element. */
  open({ title, content, className = '', onClose = null, dismissable = true, footer = null }) {
    this.close(true);
    this.onClose = onClose;
    this.current = { dismissable };
    clear(this.root).hidden = false;
    const head = h('header', { class: 'panel-head' }, h('h2', { text: title || '' }),
      dismissable ? h('button', { class: 'x', 'aria-label': 'Close', onclick: () => this.close() }, '×') : null);
    const panel = h('section', { class: `modal ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Panel' }, head,
      h('div', { class: 'panel-body' }, content), footer);
    this.root.append(panel);
    const focus = panel.querySelector('[data-autofocus]') || panel.querySelector('button');
    if (focus) focus.focus({ preventScroll: true });
    return panel;
  }

  close(silent = false) {
    if (this.root.hidden && !this.current) return;
    const cb = this.onClose;
    this.onClose = null; this.current = null;
    clear(this.root).hidden = true;
    if (!silent && cb) cb();
  }
}
