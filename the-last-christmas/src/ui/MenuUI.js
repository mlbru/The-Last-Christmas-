// Title menu, pause menu, settings, controls help and credits.

import { h, clear } from './dom.js';
import { LOCATIONS } from '../data/locations.js';
import { thoroughness } from '../game/StoryLogic.js';

const CONTROLS = [
  ['A / D or ← / →', 'Walk'], ['W / S or ↑ / ↓', 'Step toward / away from the camera'], ['E, Space or Enter', 'Interact, continue a conversation'],
  ['1 2 3', 'Choose a reply'], ['J', 'Journal'], ['B', 'Deduction board'], ['Esc', 'Pause menu, close panels'], ['Mouse', 'Click the ground to walk, click buttons and cards'],
];

export class MenuUI {
  constructor(overlay, ctrl, audio) { this.overlay = overlay; this.ctrl = ctrl; this.audio = audio; }

  title() {
    const c = this.ctrl;
    const has = c.hasSave();
    const box = h('div', { class: 'menu-box title' },
      h('div', { class: 'logo' }, h('span', { class: 'small', text: 'a detective story' }), h('h1', { text: 'The Last Christmas' })),
      h('p', { class: 'tag', text: 'Bellwether. Twenty-five years of snow on a story nobody checked.' }),
      h('div', { class: 'menu-list' },
        has ? h('button', { class: 'btn primary', 'data-autofocus': '', onclick: () => this.doContinue() }, 'Continue') : null,
        h('button', { class: `btn ${has ? '' : 'primary'}`, 'data-autofocus': has ? null : '', onclick: () => (has ? this.confirm('Start a new game? Your saved game will be replaced the first time the new one saves.', () => this.begin()) : this.begin()) }, 'New game'),
        h('button', { class: 'btn', onclick: () => this.settings(() => this.title()) }, 'Settings'),
        h('button', { class: 'btn', onclick: () => this.help(() => this.title()) }, 'Controls')),
      h('p', { class: 'foot', text: 'Best played with sound on, in the dark.' }));
    this.overlay.open({ title: '', content: box, className: 'title-modal', dismissable: false });
  }

  begin() { this.overlay.close(true); this.audio.unlock(); this.ctrl.newGame(); }

  doContinue() {
    this.audio.unlock();
    const r = this.ctrl.continueGame();
    if (r.status === 'ok' || r.status === 'recovered') this.overlay.close(true);
    else this.confirm('The saved game could not be read. Start a new game instead?', () => this.begin());
  }

  pause() {
    const c = this.ctrl;
    const box = h('div', { class: 'menu-box' },
      h('div', { class: 'menu-list' },
        h('button', { class: 'btn primary', 'data-autofocus': '', onclick: () => this.overlay.close() }, 'Resume'),
        h('button', { class: 'btn', onclick: () => { const ok = c.saveNow(); if (ok) c.toast('Game saved.', 'info'); } }, 'Save now'),
        h('button', { class: 'btn', onclick: () => this.settings(() => this.pause()) }, 'Settings'),
        h('button', { class: 'btn', onclick: () => this.help(() => this.pause()) }, 'Controls'),
        h('button', { class: 'btn', onclick: () => this.status() }, 'Where am I?'),
        h('button', { class: 'btn', onclick: () => this.confirm('Return to the title screen? Your progress is saved.', () => { this.overlay.close(true); c.quitToMenu(); this.title(); }) }, 'Quit to title'),
        h('button', { class: 'btn danger', onclick: () => this.confirm('Erase the saved game and start over?', () => { this.overlay.close(true); c.restartGame(); }) }, 'Restart game')));
    this.overlay.open({ title: 'Paused', content: box, className: 'small', onClose: () => c.closeOverlay() });
  }

  status() {
    const w = this.ctrl.world;
    const t = thoroughness(w);
    const mins = Math.round(w.data.playtimeMs / 60000);
    const box = h('div', { class: 'menu-box' },
      h('p', { text: `Location: ${LOCATIONS[w.data.location].name}` }),
      h('p', { text: `Playtime: ${mins} min` }),
      h('p', { text: `Evidence: ${w.data.evidence.length}, connections: ${w.data.relations.length}` }),
      h('p', { text: `Next: ${this.ctrl.objective()}` }),
      h('button', { class: 'btn', 'data-autofocus': '', onclick: () => this.pause() }, 'Back'));
    void t;
    this.overlay.open({ title: 'Where am I?', content: box, className: 'small', onClose: () => this.ctrl.closeOverlay() });
  }

  settings(back) {
    const c = this.ctrl, s = c.settings;
    const vol = h('input', { type: 'range', min: 0, max: 100, value: Math.round(s.volume * 100), 'aria-label': 'Volume', 'data-autofocus': '' });
    vol.addEventListener('input', () => { c.updateSettings({ volume: Number(vol.value) / 100 }); this.audio.apply(); });
    const mute = h('input', { type: 'checkbox', checked: s.muted ? 'checked' : null, id: 'mute' });
    mute.addEventListener('change', () => { c.updateSettings({ muted: mute.checked }); this.audio.apply(); });
    const speed = h('select', { 'aria-label': 'Text speed' }, ...['slow', 'normal', 'fast', 'instant'].map((v) => h('option', { value: v, selected: s.textSpeed === v ? 'selected' : null, text: v })));
    speed.addEventListener('change', () => c.updateSettings({ textSpeed: speed.value }));
    const snow = h('input', { type: 'checkbox', checked: s.snow ? 'checked' : null, id: 'snow' });
    snow.addEventListener('change', () => c.updateSettings({ snow: snow.checked }));
    const box = h('div', { class: 'menu-box settings' },
      h('label', {}, 'Volume', vol), h('label', {}, 'Mute', mute), h('label', {}, 'Text speed', speed), h('label', {}, 'Falling snow', snow),
      h('button', { class: 'btn', onclick: back }, 'Back'));
    this.overlay.open({ title: 'Settings', content: box, className: 'small', dismissable: false });
  }

  help(back) {
    const box = h('div', { class: 'menu-box' }, h('dl', { class: 'keys' }, ...CONTROLS.flatMap(([k, v]) => [h('dt', {}, h('kbd', { text: k })), h('dd', { text: v })])),
      h('button', { class: 'btn', 'data-autofocus': '', onclick: back }, 'Back'));
    this.overlay.open({ title: 'Controls', content: box, className: 'small', dismissable: false });
  }

  confirm(message, yes) {
    const box = h('div', { class: 'menu-box' }, h('p', { text: message }),
      h('div', { class: 'row' }, h('button', { class: 'btn danger', onclick: yes }, 'Yes'), h('button', { class: 'btn', 'data-autofocus': '', onclick: () => this.overlay.close() }, 'No')));
    this.overlay.open({ title: 'Are you sure?', content: box, className: 'small', dismissable: false });
    // "No" returns to whichever menu was showing
    box.querySelectorAll('button')[1].onclick = () => (this.ctrl.world && this.ctrl.mode === 'pause' ? this.pause() : this.title());
  }

  credits() {
    const w = this.ctrl.world;
    const t = thoroughness(w);
    const lines = [
      ['THE LAST CHRISTMAS', 'title'],
      ['Thomas Bell was found, and the story was not.', 'dim'],
      ['', 'gap'],
      ['Written and designed for the browser', 'dim'], ['Phaser 3 · Vite · pixel art made in code', 'dim'], ['', 'gap'],
      ['Rowan Hale · detective', ''], ['Thomas Bell · festival organiser', ''], ['Mayor Harold Voss', ''], ['Nora Quill · archivist', ''],
      ['Margot Finch · baker', ''], ['Eddie Marsh · landlord', ''], ['Silas Crane · bell-ringer', ''], ['Sergeant Dale Pruitt', ''], ['Ruth Hale', ''], ['', 'gap'],
      ['In memory of what was not said, and for Elias Wren,', 'dim'], ['wherever the story left him.', 'dim'], ['', 'gap'],
      [`You found ${w.data.evidence.length} pieces of evidence and made ${w.data.relations.length} connections.`, 'dim'],
      [`Investigation: ${t.tier}.`, 'dim'], ['', 'gap'], ['Merry Christmas, Bellwether.', 'title'],
    ];
    const scroll = h('div', { class: 'credits-scroll' }, ...lines.map(([t2, k]) => h('p', { class: k, text: t2 })));
    const box = h('div', { class: 'credits' }, scroll,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', 'data-autofocus': '', onclick: () => { this.overlay.close(true); this.ctrl.goTo('square'); this.ctrl._setMode('explore'); } }, 'Back to the square'),
        h('button', { class: 'btn', onclick: () => { this.overlay.close(true); this.ctrl.quitToMenu(); this.title(); } }, 'Title screen')));
    this.overlay.open({ title: '', content: box, className: 'credits-modal', dismissable: false });
  }
}
