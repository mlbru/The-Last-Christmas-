// DOM overlays for the four puzzles. They only render a PuzzleSystem session and forward clicks;
// every rule (what is right, what a wrong answer says) lives in systems/PuzzleSystem.js.

import { h, clear, pixelImg, evidenceIconURL } from './dom.js';
import { EVIDENCE } from '../data/evidence.js';

export class PuzzleUI {
  constructor(overlay, ctrl) { this.overlay = overlay; this.ctrl = ctrl; }

  open({ id, session, def }) {
    this.session = session; this.def = def; this.id = id;
    this.feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    this.hints = h('div', { class: 'hints' });
    this.work = h('div', { class: 'puzzle-work' });
    this.footer = h('footer', { class: 'panel-foot' });
    const intro = h('p', { class: 'hint-line', text: def.intro });
    this.panel = this.overlay.open({
      title: def.name, className: `puzzle ${def.type}`, content: h('div', { class: 'puzzle-box' }, intro, this.work, this.feedback, this.hints),
      footer: this.footer, onClose: () => this.ctrl.closePuzzle(),
    });
    this.renderFooter();
    this.renderHints();
    ({ 'select-contradictions': () => this.recipe(), 'chronological-order': () => this.archive(), sequence: () => this.star(), recognition: () => this.toybox() })[def.type]();
  }

  say(text, kind = 'info') { this.feedback.className = `feedback ${kind}`; this.feedback.textContent = text || ''; }

  renderFooter() {
    clear(this.footer);
    const used = this.ctrl.puzzleHintsShown().length;
    const total = this.def.hints.length;
    this.footer.append(
      h('button', { class: 'btn', disabled: used >= total, onclick: () => { this.ctrl.puzzleHint(); this.renderHints(); this.renderFooter(); } },
        used >= total ? 'No more hints' : used === total - 1 ? 'Show the solution' : 'Hint'),
      h('button', { class: 'btn ghost', onclick: () => this.overlay.close() }, 'Step away'));
  }

  renderHints() {
    clear(this.hints);
    this.ctrl.puzzleHintsShown().forEach((t, i) => this.hints.append(h('p', { class: 'hint', text: `Hint ${i + 1}: ${t}` })));
  }

  solved(res, extra) {
    this.ctrl.puzzleSolved(res);
    this.say('', 'good');
    clear(this.feedback).className = 'feedback good';
    this.feedback.append(h('strong', { text: 'Solved. ' }), this.def.successText);
    if (extra) this.feedback.append(h('p', { text: extra }));
    for (const id of res.newEvidence || []) {
      this.feedback.append(h('p', { class: 'found' }, pixelImg(evidenceIconURL(EVIDENCE[id].icon), 'icon'), ` New evidence: ${EVIDENCE[id].name}`));
    }
    clear(this.footer).append(h('button', { class: 'btn primary', 'data-autofocus': '', onclick: () => this.overlay.close() }, 'Continue'));
    this.work.classList.add('done');
  }

  // 1. recipe margins -------------------------------------------------------------------------------------
  recipe() {
    const s = this.session, d = this.def;
    const timeline = h('div', { class: 'timeline' }, h('h3', { text: 'The fire report' }), ...d.timeline.map((t) => h('p', { text: t })));
    const list = h('div', { class: 'lines' }, h('h3', { text: "Margot's margins" }));
    for (const l of d.lines) {
      list.append(h('button', { class: 'line', 'aria-pressed': 'false', onclick: (e) => {
        s.toggle(l.id); e.currentTarget.setAttribute('aria-pressed', s.selected.has(l.id)); e.currentTarget.classList.toggle('on', s.selected.has(l.id));
      } }, h('span', { class: 'num', text: l.margin }), l.text));
    }
    const check = h('button', { class: 'btn primary', onclick: () => {
      const r = s.submit();
      if (r.status === 'solved') this.solved(r); else this.say([r.feedback, r.detail].filter(Boolean).join(' '), 'bad');
    } }, 'Check these lines');
    this.work.append(h('div', { class: 'split' }, timeline, list), check);
  }

  // 2. archive cards ----------------------------------------------------------------------------------------------
  archive() {
    const s = this.session, d = this.def;
    const row = h('div', { class: 'cards-row' });
    const status = h('p', { class: 'hint-line' });
    const draw = () => {
      clear(row);
      s.order.forEach((cid, i) => {
        const c = d.cards.find((x) => x.id === cid);
        const card = h('div', { class: 'arch-card', draggable: s.stage === 'order' ? 'true' : 'false', dataset: { idx: i } },
          h('div', { class: 'date', text: c.label }), h('p', { text: c.text }),
          s.stage === 'order'
            ? h('div', { class: 'mv' },
              h('button', { class: 'btn small', 'aria-label': 'Move earlier', disabled: i === 0, onclick: () => { s.move(i, i - 1); draw(); } }, '◀'),
              h('button', { class: 'btn small', 'aria-label': 'Move later', disabled: i === s.order.length - 1, onclick: () => { s.move(i, i + 1); draw(); } }, '▶'))
            : h('button', { class: 'btn small', onclick: () => this.anomaly(cid) }, 'This one is wrong'));
        card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); });
        card.addEventListener('dragover', (e) => e.preventDefault());
        card.addEventListener('drop', (e) => { e.preventDefault(); const from = Number(e.dataTransfer.getData('text/plain')); if (s.stage === 'order' && !Number.isNaN(from)) { s.move(from, i); draw(); } });
        row.append(card);
      });
      status.textContent = s.stage === 'order' ? 'Oldest on the left. Drag cards, or use the arrows.' : 'The order holds. Which card cannot be what it claims to be?';
    };
    this.draw = draw;
    draw();
    this.check = h('button', { class: 'btn primary', onclick: () => {
      const r = s.checkOrder();
      if (r.status === 'orderRight') { this.say(r.feedback, 'good'); draw(); this.check.hidden = true; }
      else if (r.status === 'solved') this.solved(r);
      else this.say(`${r.feedback} (${r.inPlace} of ${s.order.length} cards are in the right place.)`, 'bad');
    } }, 'Check the order');
    this.work.append(status, row, this.check);
  }

  anomaly(cid) {
    const r = this.session.pickAnomaly(cid);
    if (r.status === 'solved') this.solved(r, r.explanation); else this.say(r.feedback, 'bad');
  }

  // 3. the Star ----------------------------------------------------------------------------------------------------------
  star() {
    const s = this.session, d = this.def;
    const ring = h('div', { class: 'star-ring', role: 'group', 'aria-label': 'The twelve points of the Star' });
    const lit = new Set();
    const buttons = new Map();
    d.points.forEach((p, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const b = h('button', { class: 'point', 'aria-label': p.label, style: `left:${50 + Math.cos(a) * 40}%;top:${50 + Math.sin(a) * 40}%`, onclick: () => {
        const r = s.press(p.id);
        if (r.status === 'progress') { lit.add(p.id); b.classList.add('lit'); this.say(`${r.progress} of 12. ${r.feedback}`, 'good'); }
        else if (r.status === 'solved') { buttons.forEach((x) => x.classList.add('lit')); this.solved(r); }
        else if (r.status === 'wrong') { lit.clear(); buttons.forEach((x) => x.classList.remove('lit')); ring.classList.add('shake'); setTimeout(() => ring.classList.remove('shake'), 400); this.say(r.feedback, 'bad'); }
        else if (r.status === 'already') this.say('That point is already lit.', 'info');
      } }, p.label);
      buttons.set(p.id, b); ring.append(b);
    });
    ring.append(h('div', { class: 'star-core', text: '12' }));
    this.work.append(ring);
  }

  // 4. toy box ----------------------------------------------------------------------------------------------------------------
  toybox() {
    const s = this.session, d = this.def;
    const grid = h('div', { class: 'toy-grid' });
    for (const it of d.items) {
      grid.append(h('button', { class: 'toy', onclick: (e) => {
        const r = s.pick(it.id);
        if (r.status === 'solved') { e.currentTarget.classList.add('right'); this.solved(r, r.note); }
        else { e.currentTarget.classList.add('wrong'); this.say(`${r.feedback} ${r.note}`, 'bad'); }
      } }, h('span', { class: 'toy-art', 'aria-hidden': 'true', text: ({ tin_soldier: '♞', brass_12: '▭', copper_21: '▭', copper_12: '▭', marbles: '●' })[it.id] || '?' }), h('span', { text: it.name })));
    }
    this.work.append(grid);
  }
}
