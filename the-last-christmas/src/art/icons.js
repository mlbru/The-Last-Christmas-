// 24x24 pixel-art icons for evidence cards and the HUD rail.

import { PixelCanvas, mix } from './PixelCanvas.js';
import { PAL } from './palette.js';

export const ICON_SIZE = 24;

function paper(c, tint = PAL.paper, lines = 4, x = 5, y = 3, w = 14, h = 18) {
  c.rect(x + 1, y + 1, w, h, '#00000055');
  c.rect(x, y, w, h, tint).frame(x, y, w, h, mix(tint, PAL.ink, 0.5));
  for (let i = 0; i < lines; i++) c.hline(x + 2, y + 3 + i * 3, w - 4 - (i % 2) * 3, mix(tint, PAL.ink, 0.45));
  c.rect(x, y, w, 1, mix(tint, '#ffffff', 0.4));
}

const DRAW = {
  paper: (c) => paper(c),
  statement: (c) => { paper(c, '#d9d2bd', 5); c.rect(14, 16, 4, 3, PAL.red, 0.7); },
  report: (c) => { paper(c, '#d4c9a6', 4); c.rect(7, 4, 10, 3, PAL.red2); },
  receipt: (c) => { paper(c, '#efe7d2', 5, 7, 2, 10, 20); },
  speech: (c) => { paper(c, '#e8e0c8', 4); c.rect(7, 5, 6, 2, PAL.ink, 0.7); c.rect(7, 9, 10, 1, PAL.red, 0.8); },
  note: (c) => { paper(c, '#f0e3b0', 2, 6, 6, 12, 12); c.rect(11, 4, 3, 3, PAL.red2); },
  letter: (c) => {
    c.rect(3, 6, 19, 14, '#00000055'); c.rect(2, 5, 19, 14, PAL.cream).frame(2, 5, 19, 14, mix(PAL.cream, PAL.ink, 0.5));
    c.line(2, 5, 11, 13, mix(PAL.cream, PAL.ink, 0.45)); c.line(20, 5, 12, 13, mix(PAL.cream, PAL.ink, 0.45)); c.rect(10, 12, 3, 3, PAL.red2);
  },
  rubbing: (c) => {
    c.rect(4, 3, 16, 18, '#9a9aa8').frame(4, 3, 16, 18, '#5a5a70');
    for (let y = 6; y < 20; y += 3) c.hline(6, y, 12 - (y % 2) * 3, '#3a3a4c');
    c.rect(6, 4, 4, 1, '#c8c8d8');
  },
  book: (c) => {
    c.rect(5, 3, 16, 19, '#00000055'); c.rect(4, 2, 16, 19, '#5a2a2a').frame(4, 2, 16, 19, PAL.ink);
    c.rect(6, 4, 12, 15, '#7a3a3a'); c.rect(9, 7, 6, 1, PAL.gold); c.rect(10, 10, 4, 1, PAL.gold); c.rect(4, 2, 2, 19, '#3a1a1a');
  },
  ledger: (c) => {
    c.rect(5, 3, 16, 19, '#00000055'); c.rect(4, 2, 16, 19, '#2f5a42').frame(4, 2, 16, 19, PAL.ink);
    c.rect(4, 2, 3, 19, '#1f3a2c'); c.rect(9, 5, 8, 4, PAL.paper); c.rect(10, 6, 6, 1, PAL.ink, 0.6); c.rect(9, 12, 8, 1, PAL.gold);
  },
  dossier: (c) => {
    c.rect(3, 6, 18, 15, '#00000055'); c.rect(2, 5, 18, 15, '#b9965a').frame(2, 5, 18, 15, PAL.ink);
    c.rect(2, 3, 8, 3, '#b9965a').frame(2, 3, 8, 3, PAL.ink); c.rect(6, 9, 10, 6, PAL.paper); c.rect(8, 10, 6, 1, PAL.red2); c.rect(8, 12, 6, 1, PAL.ink, 0.6);
    c.rect(15, 13, 4, 4, PAL.red); c.px(16, 14, '#ffd0d0');
  },
  photo: (c) => {
    c.rect(4, 4, 17, 17, '#00000055'); c.rect(3, 3, 17, 17, PAL.cream).frame(3, 3, 17, 17, PAL.ink, 0.6);
    c.rect(5, 5, 13, 11, '#4a5a7a'); c.circle(9, 11, 2, '#c8b090'); c.rect(7, 13, 5, 3, '#2a2a3a'); c.circle(14, 10, 2, '#d8b8a0'); c.rect(12, 12, 5, 4, '#7a2a2a');
    c.rect(5, 5, 13, 1, '#8aa0c0', 0.5);
  },
  drawing: (c) => {
    paper(c, '#f2efe4', 0);
    c.rect(7, 12, 8, 7, '#6a6a9a'); c.triangle(6, 12, 11, 7, 16, 12, '#8a4a4a'); c.rect(9, 5, 3, 1, '#e0a030', 0.0);
    c.rect(13, 14, 2, 5, '#c04040'); c.circle(14, 13, 1, '#c04040'); c.rect(6, 4, 12, 2, '#e08a40', 0.7);
  },
  key: (c) => {
    c.circle(8, 8, 5, PAL.gold); c.circle(8, 8, 2, '#00000066');
    c.rect(11, 11, 3, 11, PAL.gold); c.rect(14, 17, 4, 2, PAL.gold); c.rect(14, 20, 3, 2, PAL.gold); c.rect(11, 11, 1, 11, PAL.amberHi);
  },
  plaque: (c) => {
    c.rect(4, 6, 17, 14, '#00000055'); c.rect(3, 5, 17, 14, PAL.copper).frame(3, 5, 17, 14, '#5a2e12');
    c.rect(3, 5, 17, 2, PAL.copperHi); c.rect(3, 16, 17, 3, PAL.verdigris, 0.55); c.rect(5, 9, 1, 5, '#5a2e12'); c.rect(8, 9, 4, 1, '#5a2e12');
    c.rect(11, 10, 1, 1, '#5a2e12'); c.rect(8, 12, 4, 1, '#5a2e12'); c.rect(8, 13, 4, 1, '#5a2e12'); c.rect(14, 9, 4, 1, '#5a2e12'); c.rect(17, 10, 1, 3, '#5a2e12'); c.rect(14, 13, 4, 1, '#5a2e12');
  },
  star: (c) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      c.line(12, 12, 12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10, i % 2 ? PAL.copperHi : PAL.copper);
    }
    c.circle(12, 12, 4, PAL.copper); c.circle(12, 12, 2, PAL.amberHi);
  },
};

export function evidenceIcon(name) {
  const c = new PixelCanvas(ICON_SIZE, ICON_SIZE);
  (DRAW[name] || DRAW.paper)(c);
  return c;
}

/** HUD rail icons. */
const HUD = {
  journal: (c) => {
    c.rect(5, 3, 15, 19, '#00000066'); c.rect(4, 2, 15, 19, '#6a5a8a').frame(4, 2, 15, 19, PAL.ink);
    c.rect(6, 4, 11, 15, PAL.paper); for (let y = 6; y < 18; y += 3) c.hline(7, y, 8, '#6a5a50'); c.rect(4, 2, 2, 19, '#3a2a5a');
    for (let y = 4; y < 19; y += 4) c.rect(3, y, 3, 1, PAL.gold);
  },
  board: (c) => {
    c.rect(2, 3, 20, 17, '#5a3a22').frame(2, 3, 20, 17, PAL.ink); c.rect(4, 5, 16, 13, '#a07a4a');
    c.rect(5, 6, 5, 4, PAL.paper); c.rect(13, 7, 5, 4, PAL.cream); c.rect(8, 13, 5, 4, '#e8d8a0');
    c.line(8, 8, 15, 9, PAL.red2); c.line(15, 9, 10, 14, PAL.red2); c.px(8, 8, PAL.ink); c.px(15, 9, PAL.ink); c.px(10, 14, PAL.ink);
  },
  menu: (c) => { c.rect(4, 5, 16, 3, PAL.snow2); c.rect(4, 11, 16, 3, PAL.snow2); c.rect(4, 17, 16, 3, PAL.snow2); c.rect(4, 7, 16, 1, PAL.snow3); c.rect(4, 13, 16, 1, PAL.snow3); c.rect(4, 19, 16, 1, PAL.snow3); },
  star: DRAW.star,
  lock: (c) => { c.rect(6, 11, 12, 10, PAL.gold).frame(6, 11, 12, 10, PAL.ink); c.frame(8, 4, 8, 9, PAL.stone2); c.rect(11, 15, 2, 3, PAL.ink); },
};
export function hudIcon(name) { const c = new PixelCanvas(ICON_SIZE, ICON_SIZE); (HUD[name] || HUD.menu)(c); return c; }
