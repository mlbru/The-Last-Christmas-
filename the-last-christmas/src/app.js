// Wires the controller, the HTML interface and key routing together. The renderer (Phaser in the
// game, a plain canvas in the UI test harness) is injected: { goTo(entry), backdrop(), anchor() }.

import { GameController } from './game/GameController.js';
import { KeyState } from './game/KeyState.js';
import { GameAudio } from './audio/Audio.js';
import { Overlay } from './ui/Overlay.js';
import { Dock } from './ui/Dock.js';
import { Bubble, Toasts } from './ui/Bubble.js';
import { JournalUI } from './ui/JournalUI.js';
import { BoardUI } from './ui/BoardUI.js';
import { PuzzleUI } from './ui/PuzzleUI.js';
import { MenuUI } from './ui/MenuUI.js';
import { h, clear, pixelImg, hudIconURL } from './ui/dom.js';

const MOVE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ']);

export function createApp({ renderer, storage } = {}) {
  const $ = (id) => document.getElementById(id);
  const ctrl = new GameController({ storage });
  const audio = new GameAudio(ctrl);
  const keys = new KeyState();
  const overlay = new Overlay($('overlay'));
  const journal = new JournalUI(overlay, ctrl);
  const board = new BoardUI(overlay, ctrl);
  const puzzle = new PuzzleUI(overlay, ctrl);
  const menu = new MenuUI(overlay, ctrl, audio);

  const openJournal = () => { if (ctrl.openOverlay('journal')) journal.open(); };
  const openBoard = () => { if (ctrl.openOverlay('board')) board.open(); };
  const openMenu = () => { if (ctrl.openOverlay('pause')) menu.pause(); };
  const dock = new Dock($('dock'), ctrl, { openJournal, openBoard, openMenu });
  const bubble = new Bubble($('bubble'), ctrl, () => renderer.anchor && renderer.anchor());
  new Toasts($('toasts'), ctrl);

  // ---- HUD: objective bar and the three real buttons -------------------------------------------------------
  const objective = $('objective');
  const showObjective = () => {
    objective.hidden = !ctrl.world || ctrl.mode === 'menu' || ctrl.mode === 'credits';
    objective.textContent = ctrl.world ? ctrl.objective() : '';
    objective.prepend(h('span', { class: 'caret', text: '> ' }));
  };
  const rail = $('rail');
  const mkBtn = (icon, label, key, fn) => h('button', { class: 'rail-btn', title: `${label} (${key})`, 'aria-label': `${label} (${key})`, onclick: fn }, pixelImg(hudIconURL(icon), 'icon'), h('span', { class: 'rail-key', text: key }));
  clear(rail).append(mkBtn('journal', 'Journal', 'J', openJournal), mkBtn('board', 'Deduction board', 'B', openBoard), mkBtn('menu', 'Menu', 'Esc', openMenu));

  ctrl.on('objective', showObjective);
  ctrl.on('location', (p) => { showObjective(); renderer.goTo(p); });
  ctrl.on('puzzle', (p) => { if (p) puzzle.open(p); });
  ctrl.on('credits', () => menu.credits());
  ctrl.on('toast', ({ kind }) => { if (kind === 'evidence' || kind === 'conclusion') audio.chime(); });
  ctrl.on('mode', (m) => {
    document.body.dataset.mode = m;
    rail.hidden = !['explore'].includes(m);
    showObjective();
    keys.clear();
    if (m === 'menu') renderer.backdrop();
  });
  document.body.dataset.mode = 'menu';

  // ---- keyboard routing ---------------------------------------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.key !== 'Escape') return;
    const m = ctrl.mode;
    if (m === 'explore') {
      if (MOVE_KEYS.has(e.key)) e.preventDefault();
      if (bubble.visible && (e.key === 'Escape')) { bubble.hide(); return; }
      if (e.repeat) return;
      if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') {
        if (document.activeElement && document.activeElement.tagName === 'BUTTON' && e.key !== 'e') return;   // let focused buttons act
        const it = ctrl.world && ctrl.nearestInteraction(ctrl.player.x);
        if (it) { e.preventDefault(); ctrl.interactWith(it.id); }
      } else if (e.key === 'j' || e.key === 'J') openJournal();
      else if (e.key === 'b' || e.key === 'B') openBoard();
      else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') openMenu();
    } else if (m === 'dialogue' || m === 'finale') {
      if (dock.key(e)) e.preventDefault();
    } else if (['journal', 'board', 'pause', 'puzzle'].includes(m)) {
      if (e.key === 'Escape') { e.preventDefault(); overlay.close(); }
      else if (m === 'journal' && (e.key === 'j' || e.key === 'J')) overlay.close();
      else if (m === 'board' && (e.key === 'b' || e.key === 'B')) overlay.close();
    }
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden && ctrl.world && ctrl.mode !== 'menu') ctrl.saveNow(); });
  window.addEventListener('pagehide', () => { if (ctrl.world && ctrl.mode !== 'menu') ctrl.saveNow(); });

  return { ctrl, audio, keys, overlay, menu, dock, bubble, start: () => { renderer.backdrop(); menu.title(); showObjective(); } };
}
