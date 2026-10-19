// The bottom dock: portrait | choices or actions | text. In exploration it shows what is in reach;
// in conversation it shows the speaker, typewriter text, choices and the evidence picker.
// Keys: Space/Enter/E continue, 1-3 choose, Esc leaves optional conversations.

import { h, clear, portraitURL, evidenceIconURL, pixelImg } from './dom.js';
import { prompt as promptFor, isUsable } from '../systems/InteractionSystem.js';
import { LOCATIONS } from '../data/locations.js';

const SPEEDS = { slow: 28, normal: 55, fast: 140, instant: 100000 };

const LOCATION_LINE = {
  square: 'Snow falls on the square. The Star hangs dark above the fountain.',
  office: 'Cold tea, pencil shavings, a drawer left slightly open.',
  inn: 'Woodsmoke and a pint going flat. Everyone is listening and pretending not to.',
  bakery: 'Cloves, butter and the heat of an old oven.',
  police: 'Fluorescent hum. My old desk, my old coffee ring.',
  archive: 'The church is cold. Behind the grille the archive hums with green lamp light.',
  tower: 'Wind through the belfry. The bell hangs still, copper in the dark.',
  home: 'Mum\'s armchair. The clock in the hall, four minutes slow.',
};

export class Dock {
  constructor(root, ctrl, { openJournal, openBoard, openMenu }) {
    this.root = root; this.ctrl = ctrl;
    this.actions = { openJournal, openBoard, openMenu };
    this.portrait = h('div', { class: 'dock-portrait' });
    this.menu = h('div', { class: 'dock-menu panel', role: 'menu' });
    this.text = h('div', { class: 'dock-text panel', 'aria-live': 'polite' });
    root.append(this.portrait, this.menu, this.text);
    this.picker = document.getElementById('picker');
    this.step = null; this.nearby = null; this.typing = null; this.fullText = ''; this.replyTimer = null;
    ctrl.on('dialogue', (s) => this.onStep(s));
    ctrl.on('nearby', (it) => { this.nearby = it; if (!this.step) this.renderExplore(); });
    ctrl.on('location', () => { this.nearby = null; ctrl._nearbyId = null; if (!this.step) this.renderExplore(); });
    ctrl.on('mode', (m) => { if (m === 'explore' && !this.step) this.renderExplore(); });
    ctrl.on('settings', () => {});
    this.renderExplore();
  }

  speed() { return SPEEDS[this.ctrl.settings.textSpeed] || SPEEDS.normal; }

  // ---- exploration ------------------------------------------------------------------------------
  renderExplore() {
    this.hidePicker();
    const c = this.ctrl;
    if (!c.world) { clear(this.menu); clear(this.text); this.setPortrait('rowan', 'neutral', 'Rowan'); return; }
    this.setPortrait('rowan', 'neutral', 'Rowan Hale');
    clear(this.menu);
    const it = this.nearby;
    if (it) {
      const p = promptFor(c.world, it);
      const usable = isUsable(c.world, it);
      this.menu.append(h('button', { class: `opt hot ${usable ? '' : 'dim'}`, onclick: () => c.interactWith(it.id) },
        h('span', { class: 'caret', text: '▸' }), ` ${p.verb}: ${p.label}`, h('kbd', { text: 'E' })));
    } else {
      this.menu.append(h('div', { class: 'opt idle', text: 'Nothing in reach' }));
    }
    this.menu.append(
      h('button', { class: 'opt', onclick: this.actions.openJournal }, 'Journal', h('kbd', { text: 'J' })),
      h('button', { class: 'opt', onclick: this.actions.openBoard }, 'Deduction board', h('kbd', { text: 'B' })),
      h('button', { class: 'opt', onclick: this.actions.openMenu }, 'Menu', h('kbd', { text: 'Esc' })),
    );
    const loc = LOCATIONS[c.currentLocation()];
    const body = it ? it.description : (LOCATION_LINE[c.currentLocation()] || '');
    this.setText(loc ? loc.name : '', body, false);
  }

  // ---- dialogue ----------------------------------------------------------------------------------------
  onStep(step) {
    clearTimeout(this.replyTimer);
    this.step = step;
    if (!step) { this.hidePicker(); this.renderExplore(); return; }
    this.setPortrait(step.speaker, step.mood, step.name || '');
    this.setText(step.name, step.text, true);
    this.renderChoices();
  }

  renderChoices() {
    const s = this.step;
    clear(this.menu);
    this.hidePicker();
    if (!s) return;
    if (s.type === 'line' && s.choices) {
      s.choices.forEach((c, i) => this.menu.append(h('button', { class: 'opt', onclick: () => this.choose(c.index) },
        h('span', { class: 'caret', text: `${i + 1}` }), ` ${c.text}`)));
      this.menu.dataset.kind = 'choices';
    } else if (s.type === 'line') {
      this.menu.append(h('button', { class: 'opt hot', onclick: () => this.advance() }, h('span', { class: 'caret', text: '▸' }), ' Continue', h('kbd', { text: 'Space' })));
      this.menu.dataset.kind = 'continue';
    } else {
      // present / confront
      this.menu.append(
        h('button', { class: 'opt hot', onclick: () => this.showPicker() }, h('span', { class: 'caret', text: '▸' }), s.type === 'confront' ? ' Present evidence' : ' Show the town', h('kbd', { text: 'Space' })));
      if (s.canCancel) this.menu.append(h('button', { class: 'opt', onclick: () => this.ctrl.dialogueCancel() }, 'Back off', h('kbd', { text: 'Esc' })));
      this.menu.dataset.kind = s.type;
      if (!this.picker.dataset.seen) this.showPicker();
    }
  }

  // ---- actions --------------------------------------------------------------------------------------------
  advance() {
    if (this.typing) { this.finishTyping(); return; }
    if (this.step && this.step.type === 'line' && !this.step.choices) this.ctrl.dialogueAdvance();
  }
  choose(i) { if (this.typing) this.finishTyping(); this.ctrl.dialogueChoose(i); }

  showPicker() {
    const s = this.step;
    if (!s || !s.evidence) return;
    const p = this.picker;
    clear(p).hidden = false;
    p.append(h('div', { class: 'picker-head' },
      h('strong', { text: s.type === 'confront' ? 'What do you show?' : (s.prompt || 'What do you show?') }),
      h('button', { class: 'x', 'aria-label': 'Close the evidence list', onclick: () => this.hidePicker() }, '×')));
    const grid = h('div', { class: 'picker-grid' });
    for (const ev of s.evidence) {
      grid.append(h('button', { class: 'card small', title: ev.description, onclick: () => this.present(ev.id) },
        pixelImg(evidenceIconURL(ev.icon), 'icon'), h('span', { text: ev.name })));
    }
    p.append(grid);
  }
  hidePicker() { if (this.picker) { this.picker.hidden = true; delete this.picker.dataset.seen; } }

  present(id) {
    const res = this.ctrl.dialoguePresent(id);
    if (!res) return;
    if (res.result === 'correct') return;     // the controller already showed the next step
    this.hidePicker();
    const lines = [res.reply];
    if (res.hint) lines.push(`Hint: ${res.hint}`);
    this.setText(this.step.name, lines.join('\n\n'), true);
    this.menu.dataset.kind = this.step.type;
    this.picker.dataset.seen = '1';
  }

  // ---- text / typewriter ------------------------------------------------------------------------------------
  setPortrait(speaker, mood, name) {
    clear(this.portrait).append(pixelImg(portraitURL(speaker, mood), 'portrait', name), h('div', { class: 'dock-name', text: name }));
  }

  setText(name, body, type) {
    clear(this.text);
    this.nameEl = h('div', { class: 'speaker', text: name || '' });
    this.bodyEl = h('div', { class: 'body' });
    this.moreEl = h('div', { class: 'more', text: '▼', hidden: true });
    this.text.append(this.nameEl, this.bodyEl, this.moreEl);
    this.fullText = body || '';
    if (this.typing) { clearInterval(this.typing); this.typing = null; }
    if (!type || this.speed() >= 1000) { this.bodyEl.textContent = this.fullText; this.moreEl.hidden = !this.step; return; }
    let n = 0;
    const perTick = Math.max(1, Math.round(this.speed() / 40));
    this.typing = setInterval(() => {
      n += perTick;
      this.bodyEl.textContent = this.fullText.slice(0, n);
      if (n >= this.fullText.length) this.finishTyping();
    }, 25);
  }

  finishTyping() {
    if (this.typing) { clearInterval(this.typing); this.typing = null; }
    if (this.bodyEl) this.bodyEl.textContent = this.fullText;
    if (this.moreEl) this.moreEl.hidden = false;
  }

  // ---- keys ----------------------------------------------------------------------------------------------------
  /** Returns true when the key was used. */
  key(e) {
    const s = this.step;
    if (!s) return false;
    const k = e.key;
    if (k === ' ' || k === 'Enter' || k === 'e' || k === 'E') {
      if (this.typing) { this.finishTyping(); return true; }
      if (s.type === 'line' && !s.choices) { this.ctrl.dialogueAdvance(); return true; }
      if (s.type !== 'line') { if (this.picker.hidden) this.showPicker(); return true; }
      return true;
    }
    if (/^[1-3]$/.test(k) && s.type === 'line' && s.choices) {
      const c = s.choices[Number(k) - 1];
      if (c) this.choose(c.index);
      return true;
    }
    if (k === 'Escape') {
      if (!this.picker.hidden) { this.hidePicker(); return true; }
      if (s.type === 'confront') { this.ctrl.dialogueCancel(); return true; }
      this.ctrl.dialogueAbort();
      return true;
    }
    return false;
  }
}
