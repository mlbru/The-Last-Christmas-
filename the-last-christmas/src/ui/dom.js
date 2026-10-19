// Tiny DOM helpers and cached pixel-art data URLs for the HTML interface.

import { CHARACTERS } from '../data/characters.js';
import { portrait } from '../art/portraits.js';
import { evidenceIcon, hudIcon } from '../art/icons.js';
import { PixelCanvas } from '../art/PixelCanvas.js';
import { christmasStar } from '../art/scenery.js';
import { PAL } from '../art/palette.js';

/** h('div', { class: 'x', onclick: fn, text: 'hi' }, child, 'string') */
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

const cache = new Map();
function url(key, make) {
  if (!cache.has(key)) cache.set(key, make().toCanvas().toDataURL('image/png'));
  return cache.get(key);
}

function narratorPortrait() {
  const c = new PixelCanvas(64, 64);
  c.vgradient(0, 0, 64, 64, '#1c2144', '#0c0f24');
  christmasStar(c, 32, 30, 20, { lit: false });
  c.frame(0, 0, 64, 64, '#0c0914'); c.frame(1, 1, 62, 62, '#5a4a6e', 0.7);
  return c;
}

export function portraitURL(charId, mood = 'neutral') {
  const ch = CHARACTERS[charId];
  if (!ch) return url('narrator', narratorPortrait);
  return url(`p:${charId}:${mood}`, () => portrait(ch.look, mood));
}
export function evidenceIconURL(name) { return url(`e:${name}`, () => evidenceIcon(name)); }
export function hudIconURL(name) { return url(`h:${name}`, () => hudIcon(name)); }

export function pixelImg(src, cls = '', alt = '') {
  return h('img', { src, class: `px ${cls}`.trim(), alt, draggable: 'false' });
}

export const COLORS = PAL;
