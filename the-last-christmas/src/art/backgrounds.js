// Procedural, layered backgrounds for every location. Each location returns separate layers so the
// scene can scroll them at different speeds (parallax) and add light on top:
//   sky (0.05) -> far mountains (0.2) -> mid town/forest (0.45) -> near (1.0) -> fog (0.7) -> glow (1.0, additive)
// All layers are exactly the world width and 270 px tall.

import { PixelCanvas, mix } from './PixelCanvas.js';
import { PAL, TONE_COLOR } from './palette.js';
import { LOCATIONS } from '../data/locations.js';
import {
  snowGround, window_, door, building, pine, christmasTree, christmasStar, lampPost, lights, stars,
  barrel, crate, bookshelf, frameBox,
} from './scenery.js';

export const VIEW_W = 480;
export const VIEW_H = 270;
const FLOOR_Y = 220;      // where walls meet the floor in interiors, just behind Rowan's feet
const GROUND_TOP = 206;

// ---------- helpers ----------
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function fade(c, x, y, w, h, color, a0, a1, steps = 6) {
  for (let i = 0; i < h; i++) {
    const t = Math.floor((i / Math.max(1, h - 1)) * steps) / steps;
    c.rect(x, y + i, w, 1, color, a0 + (a1 - a0) * t);
  }
}
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export function halo(c, x, y, r, color = PAL.glow, a = 0.55) {
  for (let yy = Math.floor(y - r); yy <= y + r; yy++) {
    for (let xx = Math.floor(x - r); xx <= x + r; xx++) {
      const d = Math.hypot(xx - x, (yy - y) * 1.1) / r;
      if (d >= 1) continue;
      const band = Math.ceil((1 - d) * 5) / 5;      // quantised bands keep it pixel-art
      c.px(xx, yy, color, a * band * band);
    }
  }
}

function ridge(c, baseY, amp, seed, color, cap, capDepth = 4, freq = 1) {
  const w = c.width;
  for (let x = 0; x < w; x++) {
    const t = x * 0.011 * freq;
    const n = Math.sin(t + seed) * 0.5 + Math.sin(t * 2.3 + seed * 2.1) * 0.28 + Math.sin(t * 5.1 + seed * 0.7) * 0.12 + hash(Math.floor(x / 3) + seed) * 0.12;
    const y = Math.floor(baseY - amp * (0.55 + n * 0.5));
    c.rect(x, y, 1, c.height - y, color);
    if (cap) { for (let k = 0; k < capDepth; k++) if (y + k < baseY - amp * 0.35) c.px(x, y + k, cap, 0.9 - k * 0.18); }
  }
}

function skyLayer(w, { moonX = 330, moonY = 52, density = 140, seed = 3 } = {}) {
  const c = new PixelCanvas(w, VIEW_H);
  c.vgradient(0, 0, w, 150, PAL.night0, PAL.dusk, 28);
  c.vgradient(0, 150, w, 120, PAL.dusk, PAL.horizon, 12);
  stars(c, w, 120, density, seed);
  // moon with soft halo
  halo(c, moonX, moonY, 46, '#aab8ee', 0.22);
  c.circle(moonX, moonY, 12, PAL.moon);
  c.circle(moonX + 4, moonY - 3, 11, PAL.dusk); c.circle(moonX + 5, moonY - 4, 11, PAL.night1);  // bite = crescent-ish shadow
  c.circle(moonX, moonY, 12, PAL.moon, 0.0);
  // re-draw the lit part as a crescent so it reads clearly
  for (let yy = -12; yy <= 12; yy++) for (let xx = -12; xx <= 12; xx++) {
    if (xx * xx + yy * yy > 144) continue;
    const inShadow = (xx - 5) * (xx - 5) + (yy + 4) * (yy + 4) < 121;
    if (!inShadow) c.px(moonX + xx, moonY + yy, PAL.moon);
  }
  // dark cloud banks
  const r = rng(seed * 7);
  for (let i = 0; i < Math.max(4, w / 120); i++) {
    const cx = r() * w, cy = 28 + r() * 70, cw = 50 + r() * 90;
    for (let k = 0; k < 9; k++) c.ellipse(cx + (k - 4) * cw / 9, cy + Math.sin(k * 1.7) * 3, cw / 7, 5 + r() * 4, mix(PAL.night1, PAL.dusk, 0.35 + r() * 0.2), 0.55);
    c.ellipse(cx, cy + 5, cw / 2, 3, PAL.night0, 0.35);
  }
  return c;
}

function farLayer(w, seed = 2) {
  const c = new PixelCanvas(w, VIEW_H);
  ridge(c, 170, 130, seed, mix(PAL.dusk, PAL.night1, 0.45), '#7f8fc8', 5, 0.8);
  ridge(c, 182, 80, seed + 3, mix(PAL.night2, PAL.night1, 0.5), '#5c6ca8', 3, 1.3);
  halo(c, w * 0.6, 150, 90, '#8a6a8a', 0.08);
  return c;
}

/** Distant town across a frozen river, pine forest and a lit church spire. */
function midLayer(w, seed = 4) {
  const c = new PixelCanvas(w, VIEW_H);
  const glows = [];
  const r = rng(seed);
  // forest band
  for (let x = -10; x < w + 10; x += 9) pine(c, x + r() * 6, 176, 30 + r() * 26, { shade: 0.55, snow: false });
  // town on the far bank
  let x = 20;
  while (x < w - 20) {
    const bw = 22 + r() * 26, bh = 16 + r() * 22;
    const wall = mix(PAL.brickDark, PAL.night1, 0.55 + r() * 0.15);
    c.rect(x, 184 - bh, bw, bh, wall);
    c.triangle(x - 2, 184 - bh, x + bw / 2, 184 - bh - 9 - r() * 5, x + bw + 2, 184 - bh, mix(PAL.stoneDark, PAL.night0, 0.5));
    c.triangle(x, 184 - bh, x + bw / 2, 184 - bh - 6, x + bw, 184 - bh, '#5a6aa0', 0.5);
    for (let wx = x + 4; wx < x + bw - 4; wx += 7) for (let wy = 184 - bh + 5; wy < 180; wy += 8) {
      if (r() > 0.35) { c.rect(wx, wy, 3, 4, r() > 0.5 ? PAL.amber : PAL.amberDeep); glows.push([wx + 1, wy + 2]); }
    }
    x += bw + 2 + r() * 5;
  }
  // church spire
  const sx = Math.floor(w * 0.58);
  c.rect(sx - 7, 128, 14, 56, mix(PAL.stoneDark, PAL.night0, 0.45));
  c.triangle(sx - 9, 128, sx, 92, sx + 9, 128, mix(PAL.stoneDark, PAL.night0, 0.35));
  c.rect(sx - 1, 82, 2, 12, PAL.stone); c.rect(sx - 3, 86, 6, 1, PAL.stone);
  c.rect(sx - 3, 138, 6, 8, PAL.amber); c.rect(sx - 2, 154, 4, 7, PAL.amberDeep);
  halo(c, sx, 142, 18, PAL.glow, 0.3);
  // frozen river with reflections and ice glints
  c.vgradient(0, 184, w, 30, mix(PAL.night2, PAL.night0, 0.4), PAL.night0, 6);
  for (const [gx, gy] of glows) {
    for (let k = 0; k < 5; k++) c.rect(gx + (r() > 0.5 ? 1 : -1) * (k % 2), 186 + (gy - 140) * 0 + k * 5 + (gy % 3), 2, 1, PAL.amber, 0.38 - k * 0.06);
  }
  for (let i = 0; i < w / 14; i++) c.rect(r() * w, 187 + r() * 24, 4 + r() * 8, 1, '#7a8ccc', 0.25);
  // snowy bank
  c.rect(0, 205, w, 8, mix(PAL.snow3, PAL.night1, 0.4));
  return c;
}

function fogLayer(w, topY = 150, strength = 0.14) {
  const c = new PixelCanvas(w, VIEW_H);
  const r = rng(11);
  for (let i = 0; i < w / 35; i++) {
    const x = r() * w, y = topY + r() * 90, rw = 40 + r() * 70;
    c.ellipse(x, y, rw, 5 + r() * 6, '#8a9ad0', strength * (0.5 + r() * 0.7));
  }
  fade(c, 0, 180, w, 90, '#3a4a8a', 0, 0.12);
  return c;
}

function tonePass(c, tone) { if (tone > 0) c.rect(0, 0, c.width, c.height, TONE_COLOR, Math.min(0.5, tone * 0.45)); }

export function renderVignette() {
  const c = new PixelCanvas(VIEW_W, VIEW_H);
  for (let y = 0; y < VIEW_H; y++) for (let x = 0; x < VIEW_W; x++) {
    const dx = (x - VIEW_W / 2) / (VIEW_W / 2), dy = (y - VIEW_H / 2) / (VIEW_H / 2);
    const d = Math.min(1.4, Math.hypot(dx * 0.95, dy * 1.05));
    const a = Math.max(0, d - 0.55) / 0.85;
    const q = Math.round(a * 8) / 8;
    if (q > 0) c.px(x, y, '#04060f', Math.min(0.72, q * 0.78));
  }
  return c;
}

// ---------- exteriors ----------
function squareNear(w, glows) {
  const c = new PixelCanvas(w, VIEW_H);
  snowGround(c, GROUND_TOP, w, 0.1);
  // shovelled path and footprints
  c.rect(0, 226, w, 22, mix(PAL.snow3, PAL.night2, 0.35), 0.55);
  for (let x = 6; x < w; x += 29) c.rect(x, 232 + (x % 5) * 3, 5, 2, PAL.snowShade, 0.6);
  // houses: [x, w, h, wall, door x]
  const specs = [
    { x: 8, w: 120, h: 78, wall: PAL.wood2, door: 70, win: [30, 100] },
    { x: 150, w: 110, h: 84, wall: PAL.brick, door: 205, win: [170, 230] },
    { x: 296, w: 160, h: 92, wall: PAL.brick2, door: 375, win: [316, 424], sign: 'INN' },
    { x: 730, w: 110, h: 86, wall: '#8a5a3a', door: 775, win: [748, 806], sign: 'BAKERY' },
    { x: 858, w: 104, h: 90, wall: PAL.stoneDark, door: 905, win: [876, 934], sign: 'POLICE' },
  ];
  for (const s of specs) {
    const windows = s.win.map((wx) => ({ x: wx, y: GROUND_TOP - s.h + 22, w: 12, h: 15, lit: !(s.sign === 'POLICE' && wx === 876) }));
    building(c, s.x, GROUND_TOP, s.w, s.h, { wall: s.wall, windows, glows, shade: 0.35 });
    door(c, s.door, GROUND_TOP, 22, 38, { glass: true, lamp: true, glows });
    halo(glows.canvas, s.door, GROUND_TOP - 20, 30, PAL.glow, 0.28);
    if (s.sign) {
      c.rect(s.door - 16, GROUND_TOP - 56, 32, 9, PAL.woodDark).frame(s.door - 16, GROUND_TOP - 56, 32, 9, PAL.gold, 0.6);
      tinyText(c, s.sign, s.door, GROUND_TOP - 55, PAL.amberHi);
    }
  }
  // the church front
  const cx = 1000;
  c.rect(cx - 52, GROUND_TOP - 100, 112, 100, mix(PAL.stone, PAL.night1, 0.4));
  c.triangle(cx - 58, GROUND_TOP - 100, cx + 4, GROUND_TOP - 150, cx + 66, GROUND_TOP - 100, mix(PAL.stoneDark, PAL.night1, 0.4));
  c.triangle(cx - 52, GROUND_TOP - 100, cx + 4, GROUND_TOP - 143, cx + 60, GROUND_TOP - 100, PAL.snow2, 0.5);
  c.rect(cx - 2, GROUND_TOP - 168, 3, 20, PAL.stone); c.rect(cx - 6, GROUND_TOP - 162, 11, 2, PAL.stone);
  door(c, 1015, GROUND_TOP, 26, 46, { wood: PAL.woodDark, glass: false, glows });
  c.rect(1013, GROUND_TOP - 40, 3, 40, PAL.amberDeep, 0.5);     // ajar: light spilling through
  halo(glows.canvas, 1015, GROUND_TOP - 24, 32, PAL.glow, 0.35);
  window_(c, 978, GROUND_TOP - 82, 14, 22, { lit: true, glows, color: '#8a5ac8' });
  window_(c, 1038, GROUND_TOP - 82, 14, 22, { lit: true, glows, color: '#5a7ac8' });
  c.circle(cx + 3, GROUND_TOP - 116, 7, mix(PAL.stoneDark, PAL.night0, 0.3)); c.circle(cx + 3, GROUND_TOP - 116, 5, PAL.amber);
  // town centre: tree, fountain, podium, stage, clock
  christmasTree(c, 530, GROUND_TOP + 8, 98, glows);
  fountain(c, 582, GROUND_TOP + 8);
  christmasStar(c, 585, GROUND_TOP - 40, 14, { lit: false, glows });
  c.rect(584, GROUND_TOP - 26, 2, 22, PAL.stone);             // the Star hangs dark above the fountain
  c.rect(612, GROUND_TOP - 4, 32, 12, PAL.wood2).frame(612, GROUND_TOP - 4, 32, 12, PAL.woodDark);  // podium
  c.rect(618, GROUND_TOP - 12, 20, 8, PAL.paper); c.rect(626, GROUND_TOP - 17, 4, 5, PAL.amberHi);
  c.rect(656, GROUND_TOP, 74, 14, PAL.plank).frame(656, GROUND_TOP, 74, 14, PAL.woodDark);  // stage
  c.rect(658, GROUND_TOP - 30, 3, 30, PAL.woodDark); c.rect(724, GROUND_TOP - 30, 3, 30, PAL.woodDark);
  lights(c, 659, GROUND_TOP - 30, 725, GROUND_TOP - 30, 7, glows);
  for (let k = 0; k < 6; k++) c.triangle(662 + k * 10, GROUND_TOP - 30, 668 + k * 10, GROUND_TOP - 30, 665 + k * 10, GROUND_TOP - 20, k % 2 ? PAL.red : PAL.green, 0.9);
  c.rect(735, GROUND_TOP - 64, 3, 64, PAL.ink); c.circle(736, GROUND_TOP - 70, 9, PAL.stone2); c.circle(736, GROUND_TOP - 70, 7, PAL.cream);
  c.line(736, GROUND_TOP - 70, 736, GROUND_TOP - 75, PAL.ink); c.line(736, GROUND_TOP - 70, 739, GROUND_TOP - 68, PAL.ink);
  // lamps, light strings, pines, snowmen, benches
  for (const x of [120, 285, 480, 700, 835, 965]) { lampPost(c, x, GROUND_TOP + 4, 62, glows); }
  lights(c, 128, GROUND_TOP - 70, 285, GROUND_TOP - 62, 10, glows);
  lights(c, 285, GROUND_TOP - 62, 470, GROUND_TOP - 70, 12, glows);
  lights(c, 700, GROUND_TOP - 62, 835, GROUND_TOP - 66, 8, glows);
  for (const x of [20, 466, 826, 1100]) pine(c, x, GROUND_TOP + 6, 56 + (x % 17), { shade: 0.2 });
  bench(c, 330, GROUND_TOP + 12); bench(c, 800, GROUND_TOP + 14);
  barrel(c, 450, GROUND_TOP + 10); crate(c, 468, GROUND_TOP + 10);
  return c;
}

function tinyText(c, s, cx, y, color) {
  // a 3x5-ish micro font is overkill here: draw simple blocks per letter so signs read as lettering
  const x0 = Math.floor(cx - (s.length * 4) / 2);
  for (let i = 0; i < s.length; i++) { const k = s.charCodeAt(i); c.rect(x0 + i * 4, y, 3, 1, color); c.rect(x0 + i * 4 + (k % 2), y + 2, 2, 1, color); c.rect(x0 + i * 4, y + 4, 3, 1, color, 0.7); }
}

function fountain(c, x, baseY) {
  c.ellipse(x, baseY - 3, 26, 7, PAL.stoneDark); c.ellipse(x, baseY - 5, 24, 5, PAL.stone);
  c.ellipse(x, baseY - 6, 20, 3, mix(PAL.night2, '#8ac0ff', 0.4));            // frozen water
  c.rect(x - 3, baseY - 22, 6, 18, PAL.stone2); c.ellipse(x, baseY - 22, 9, 3, PAL.stone);
  c.ellipse(x, baseY - 24, 7, 2, PAL.snow);
  for (let k = 0; k < 5; k++) c.rect(x - 2 + k, baseY - 30 + (k % 2) * 2, 1, 6, '#9fd0ff', 0.5);      // frozen jets
}

function bench(c, x, baseY) {
  c.rect(x - 14, baseY - 12, 28, 3, PAL.wood2); c.rect(x - 14, baseY - 7, 28, 3, PAL.wood);
  c.rect(x - 13, baseY - 4, 3, 5, PAL.ink); c.rect(x + 10, baseY - 4, 3, 5, PAL.ink);
  c.rect(x - 15, baseY - 14, 30, 2, PAL.snow);      // snow on the back
  c.rect(x - 14, baseY - 9, 28, 1, PAL.snow2);
}

// ---------- interiors ----------
// Rooms are drawn at Rowan's scale: he is 48 px tall (about 1.8 m), so a metre is roughly 27 px.
// Doors are a little taller than he is, the wainscot reaches his hip, window sills sit at table
// height and the ceiling is about 3.4 m up. Everything on a wall is placed relative to FLOOR_Y.
const CEIL_Y = FLOOR_Y - 92;       // where the back wall meets the ceiling (living rooms, shops)
const WAIN_Y = FLOOR_Y - 30;       // top of the wainscot
const WIN_Y = FLOOR_Y - 80;        // top of a window pane; panes are WIN_H tall, the sill lands on the wainscot
const WIN_H = 46;

function roomShell(w, { wall = PAL.woodDark, wain = PAL.wood, floor = PAL.wood, paper = null, stone = false, trim = PAL.wood2, ceiling = true } = {}) {
  const c = new PixelCanvas(w, VIEW_H);
  c.rect(0, 0, w, FLOOR_Y, wall);
  if (stone) {
    for (let y = 0; y < FLOOR_Y; y += 14) for (let x = -((y / 14) % 2) * 12; x < w; x += 24) {
      c.rect(x, y, 23, 13, mix(wall, '#ffffff', hash(x * 3 + y) * 0.07));
      c.hline(x, y + 13, 24, mix(wall, PAL.ink, 0.35)); c.vline(x + 23, y, 14, mix(wall, PAL.ink, 0.35));
    }
  } else if (paper) {
    for (let x = 0; x < w; x += 12) { c.vline(x, 0, FLOOR_Y, mix(wall, paper, 0.18)); c.vline(x + 1, 0, FLOOR_Y, mix(wall, PAL.ink, 0.12)); }
    for (let y = CEIL_Y + 10; y < WAIN_Y - 4; y += 20) for (let x = 6; x < w; x += 24) c.px(x, y, mix(wall, paper, 0.4));
  }
  // wainscot and baseboard
  c.rect(0, WAIN_Y, w, FLOOR_Y - WAIN_Y, wain); c.rect(0, WAIN_Y - 2, w, 3, trim);
  for (let x = 0; x < w; x += 22) c.vline(x, WAIN_Y + 4, FLOOR_Y - WAIN_Y - 8, mix(wain, PAL.ink, 0.25));
  c.rect(0, FLOOR_Y - 5, w, 5, mix(trim, PAL.ink, 0.25));
  if (ceiling) {
    // the ceiling seen from below: boards that widen as they come towards the camera, then a cornice
    const ceil = mix(wall, PAL.ink, 0.55);
    c.rect(0, 0, w, CEIL_Y, ceil);
    for (let y = CEIL_Y - 3, gap = 4; y > 0; gap += 3, y -= gap) c.hline(0, y, w, mix(ceil, PAL.ink, 0.45));
    c.rect(0, CEIL_Y - 4, w, 4, mix(trim, PAL.ink, 0.15)); c.hline(0, CEIL_Y, w, mix(trim, PAL.ink, 0.5));
    fade(c, 0, CEIL_Y + 1, w, 10, '#000000', 0.25, 0, 4);    // shadow under the cornice
  }
  // floor planks, receding
  c.rect(0, FLOOR_Y, w, VIEW_H - FLOOR_Y, floor);
  for (let y = FLOOR_Y + 8; y < VIEW_H; y += 11) c.hline(0, y, w, mix(floor, PAL.ink, 0.35));
  for (let y = FLOOR_Y, row = 0; y < VIEW_H; y += 11, row++) for (let x = (row % 2) * 40; x < w; x += 80) c.vline(x, y, 11, mix(floor, PAL.ink, 0.3));
  fade(c, 0, FLOOR_Y, w, 8, '#000000', 0.4, 0, 4);       // contact shadow
  fade(c, 0, 0, w, 60, '#000000', 0.35, 0, 5);            // ceiling falls into dark
  return c;
}

function nightWindow(c, x, y, w, h, glows, { snowy = true } = {}) {
  c.rect(x - 3, y - 3, w + 6, h + 6, PAL.woodDark);
  c.vgradient(x, y, w, h, PAL.night0, PAL.dusk, 6);
  for (let i = 0; i < 9; i++) c.px(x + hash(x + i * 3) * w, y + hash(i * 7 + y) * h * 0.6, '#ffffff', 0.7);
  if (snowy) for (let i = 0; i < 14; i++) c.px(x + hash(i * 5 + x) * w, y + hash(i * 9 + 3) * h, '#dce6ff', 0.8);
  c.rect(x, y + h - 5, w, 5, PAL.snow3, 0.9);
  c.rect(x + Math.floor(w / 2), y, 2, h, PAL.woodDark); c.rect(x, y + Math.floor(h / 2), w, 2, PAL.woodDark);
  c.rect(x - 4, y + h + 3, w + 8, 3, PAL.wood2);
  glows.moon.push({ x: x + w / 2, y: y + h, w });
}

/** A window in a room wall, at human height: the sill rests on the wainscot. */
function wallWindow(c, x, w, glows, curtain = null) {
  nightWindow(c, x, WIN_Y, w, WIN_H, glows);
  if (!curtain) return;
  c.rect(x - 8, WIN_Y - 5, w + 16, 4, curtain);
  c.rect(x - 8, WIN_Y - 1, 11, WIN_H + 4, curtain, 0.75); c.rect(x + w - 3, WIN_Y - 1, 11, WIN_H + 4, curtain, 0.75);
}

function lamp(c, glows, x, y, { r = 54, color = PAL.glow, a = 0.45 } = {}) {
  c.rect(x - 4, y, 9, 5, PAL.amberDeep); c.rect(x - 3, y - 6, 7, 6, PAL.amberHi);
  c.rect(x - 5, y - 8, 11, 2, PAL.ink); c.rect(x - 1, y + 5, 3, 8, PAL.ink);
  halo(glows.canvas, x, y - 2, r, color, a);
}

/** A lamp hanging from the ceiling on a cord. */
function pendant(c, glows, x, y, opts) {
  c.rect(x, CEIL_Y, 1, y - CEIL_Y - 8, PAL.ink);
  lamp(c, glows, x, y, opts);
}

function doorHome(c, glows, x = 60) {
  door(c, x, FLOOR_Y, 24, 54, { wood: PAL.wood2, frame: PAL.woodDark, glows });
  c.rect(x - 8, FLOOR_Y - 48, 16, 12, '#2a3a6a'); c.rect(x - 8, FLOOR_Y - 48, 16, 1, PAL.woodDark);
  for (let i = 0; i < 6; i++) c.px(x - 7 + i * 3, FLOOR_Y - 46 + (i % 3) * 3, '#dce6ff', 0.7);
}

function rug(c, x, w, color, edge = PAL.gold) {
  c.rect(x, FLOOR_Y + 22, w, 18, color); c.frame(x, FLOOR_Y + 22, w, 18, edge, 0.7);
  for (let k = x + 6; k < x + w - 4; k += 8) c.rect(k, FLOOR_Y + 28, 3, 6, mix(color, edge, 0.35));
}

function furnishOffice(c, g) {
  doorHome(c, g, 60);
  wallWindow(c, 168, 44, g, PAL.red);
  c.rect(262, FLOOR_Y - 34, 120, 12, PAL.wood2).frame(262, FLOOR_Y - 34, 120, 12, PAL.woodDark);                   // desk top
  c.rect(266, FLOOR_Y - 22, 40, 22, PAL.wood); c.rect(338, FLOOR_Y - 22, 40, 22, PAL.wood);
  c.rect(270, FLOOR_Y - 18, 32, 8, PAL.woodDark); c.rect(272, FLOOR_Y - 16, 28, 4, PAL.wood2); c.rect(284, FLOOR_Y - 15, 4, 2, PAL.gold);
  c.rect(318, FLOOR_Y - 40, 22, 6, PAL.paper); c.rect(320, FLOOR_Y - 42, 18, 3, PAL.paperDark);              // blotter and scrap
  lamp(c, g, 358, FLOOR_Y - 48, { r: 70, a: 0.5 });
  crateStack(c, 396, FLOOR_Y + 8);
  // coat stand with one hat and no coat
  const top = FLOOR_Y - 62;
  c.rect(452, top, 3, 62, PAL.ink); c.rect(444, FLOOR_Y - 2, 19, 2, PAL.ink); c.rect(440, top, 27, 2, PAL.ink); c.rect(440, top, 4, 5, PAL.ink); c.rect(463, top, 4, 5, PAL.ink);
  c.rect(442, top + 2, 20, 8, PAL.red2); c.rect(440, top, 9, 3, PAL.red);
  // festival schedule, colour-coded
  c.rect(520, FLOOR_Y - 80, 56, 46, PAL.paperDark).frame(520, FLOOR_Y - 80, 56, 46, PAL.woodDark);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) c.rect(526 + k * 13, FLOOR_Y - 75 + r * 10, 10, 7, [PAL.red2, PAL.green, '#4a78c0', PAL.amber][(r + k) % 4], 0.85);
  bookshelf(c, 590, FLOOR_Y, 44, 74, { seed: 4 });
  pendant(c, g, 300, CEIL_Y + 18, { r: 40, a: 0.2 });
  rug(c, 230, 160, '#5a2030');
}

function crateStack(c, x, baseY) { crate(c, x - 8, baseY, 18, 14); crate(c, x + 12, baseY, 18, 14); crate(c, x + 2, baseY - 14, 18, 14); }

function furnishInn(c, g) {
  doorHome(c, g, 60);
  wallWindow(c, 120, 40, g);
  // ceiling beams
  for (let x = 40; x < c.width; x += 120) { c.rect(x, 0, 8, CEIL_Y, PAL.woodDark); c.rect(x - 2, CEIL_Y - 6, 12, 6, PAL.woodDark); }
  // bar and shelves of bottles
  c.rect(300, FLOOR_Y - 38, 130, 14, PAL.wood2).frame(300, FLOOR_Y - 38, 130, 14, PAL.woodDark);
  c.rect(300, FLOOR_Y - 24, 130, 24, PAL.wood); for (let x = 306; x < 426; x += 20) c.rect(x, FLOOR_Y - 20, 16, 16, PAL.woodDark);
  c.rect(388, FLOOR_Y - 41, 16, 3, PAL.cream); c.rect(390, FLOOR_Y - 43, 12, 2, PAL.paperDark);              // tea towel over the cash book
  const s1 = FLOOR_Y - 58, s2 = FLOOR_Y - 82;
  c.rect(300, s1, 130, 3, PAL.woodDark); c.rect(300, s2, 130, 3, PAL.woodDark);
  for (let x = 306; x < 426; x += 9) { c.rect(x, s1 - 12, 4, 12, [PAL.green, PAL.amberDeep, PAL.red, '#3a5a8a'][(x / 9 | 0) % 4]); c.rect(x, s2 - 12, 4, 12, [PAL.amberDeep, PAL.green, '#3a5a8a', PAL.red][(x / 9 | 0) % 4]); }
  pendant(c, g, 365, FLOOR_Y - 64, { r: 60 });
  // table + stools + patron seat
  c.rect(214, FLOOR_Y - 26, 36, 4, PAL.wood2); c.rect(228, FLOOR_Y - 22, 8, 22, PAL.wood); c.rect(216, FLOOR_Y - 4, 32, 3, PAL.woodDark);
  c.rect(176, FLOOR_Y - 18, 14, 3, PAL.wood2); c.rect(181, FLOOR_Y - 15, 4, 15, PAL.woodDark);
  // fireplace: chimney breast up to the ceiling, firebox at knee height
  c.rect(444, CEIL_Y, 52, FLOOR_Y - CEIL_Y, PAL.stoneDark); c.rect(440, FLOOR_Y - 52, 60, 6, PAL.stone2);
  c.rect(452, FLOOR_Y - 42, 36, 42, PAL.ink); c.rect(454, FLOOR_Y - 34, 32, 34, '#2a0f10');
  for (let k = 0; k < 7; k++) { c.triangle(456 + k * 5, FLOOR_Y, 458 + k * 5, FLOOR_Y - 24 - (k % 3) * 4, 462 + k * 5, FLOOR_Y, k % 2 ? PAL.amberDeep : PAL.amber); c.triangle(458 + k * 5, FLOOR_Y, 460 + k * 5, FLOOR_Y - 14 - (k % 2) * 4, 463 + k * 5, FLOOR_Y, PAL.amberHi); }
  halo(g.canvas, 470, FLOOR_Y - 20, 80, '#ff9a3c', 0.5);
  c.rect(442, FLOOR_Y - 58, 56, 6, PAL.pine2); for (let x = 444; x < 496; x += 7) c.px(x, FLOOR_Y - 57, PAL.red2);
  // photo wall and jukebox
  for (let i = 0; i < 6; i++) frameBox(c, 524 + (i % 3) * 22, FLOOR_Y - 82 + ((i / 3) | 0) * 24 + (i % 2) * 3, 16, 20, i % 2 ? '#b8b4a8' : '#9a9a9a');
  c.rect(632, FLOOR_Y - 52, 34, 52, PAL.red); c.rect(634, FLOOR_Y - 50, 30, 20, PAL.amberDeep); c.ellipse(649, FLOOR_Y - 46, 14, 8, PAL.amber);
  c.rect(638, FLOOR_Y - 26, 22, 4, PAL.gold); halo(g.canvas, 649, FLOOR_Y - 36, 32, PAL.amber, 0.3);
  rug(c, 150, 220, '#3a4a2a');
}

function furnishBakery(c, g) {
  doorHome(c, g, 60);
  wallWindow(c, 130, 56, g);
  // counter with display; the recipe book is tucked on the shelf underneath
  c.rect(266, FLOOR_Y - 34, 74, 14, PAL.paper).frame(266, FLOOR_Y - 34, 74, 14, PAL.woodDark);
  c.rect(266, FLOOR_Y - 20, 74, 20, PAL.wood); c.rect(272, FLOOR_Y - 46, 60, 12, '#9acaff', 0.25).frame(272, FLOOR_Y - 46, 60, 12, '#c8e4ff', 0.5);
  for (let k = 0; k < 5; k++) c.ellipse(278 + k * 11, FLOOR_Y - 38, 4, 2, k % 2 ? PAL.amberDeep : PAL.plank);
  c.rect(318, FLOOR_Y - 16, 18, 12, PAL.woodDark); c.rect(320, FLOOR_Y - 14, 14, 10, '#7a2a2a'); c.rect(326, FLOOR_Y - 14, 2, 10, PAL.gold);
  // side cabinet with the till and the old biscuit tin
  c.rect(392, FLOOR_Y - 32, 40, 32, PAL.wood).frame(392, FLOOR_Y - 32, 40, 32, PAL.woodDark); c.rect(390, FLOOR_Y - 34, 44, 3, PAL.wood2);
  c.rect(396, FLOOR_Y - 44, 16, 10, PAL.gold); c.rect(398, FLOOR_Y - 42, 12, 4, PAL.ink); c.rect(397, FLOOR_Y - 36, 14, 2, PAL.amberDeep);     // till
  c.rect(414, FLOOR_Y - 42, 14, 8, '#3a6a8a').frame(414, FLOOR_Y - 42, 14, 8, PAL.ink); c.rect(414, FLOOR_Y - 43, 14, 2, '#5a8aaa'); c.px(420, FLOOR_Y - 39, PAL.red2);   // tin
  // shelves of loaves above it
  const s1 = FLOOR_Y - 58, s2 = FLOOR_Y - 80;
  c.rect(360, s1, 80, 3, PAL.woodDark); c.rect(360, s2, 80, 3, PAL.woodDark);
  for (let k = 0; k < 6; k++) { c.ellipse(372 + k * 12, s2 - 3, 5, 3, PAL.plank); c.ellipse(372 + k * 12, s1 - 3, 5, 3, PAL.amberDeep); }
  // table with lamp (margin-comparison table)
  c.rect(448, FLOOR_Y - 30, 52, 4, PAL.wood2); c.rect(452, FLOOR_Y - 26, 4, 26, PAL.woodDark); c.rect(492, FLOOR_Y - 26, 4, 26, PAL.woodDark);
  c.rect(458, FLOOR_Y - 34, 18, 4, PAL.paper); c.rect(480, FLOOR_Y - 33, 14, 3, PAL.paperDark);
  lamp(c, g, 487, FLOOR_Y - 46, { r: 50, a: 0.35 });
  // brick oven, up to the ceiling
  c.rect(520, CEIL_Y, 56, FLOOR_Y - CEIL_Y, PAL.brick); for (let y = CEIL_Y + 2; y < FLOOR_Y - 2; y += 6) c.hline(520, y, 56, PAL.brickDark);
  c.rect(530, FLOOR_Y - 58, 36, 34, PAL.ink); c.rect(534, FLOOR_Y - 50, 28, 26, '#3a0f0a'); c.ellipse(548, FLOOR_Y - 32, 12, 6, PAL.amberDeep); c.ellipse(548, FLOOR_Y - 32, 7, 3, PAL.amberHi);
  halo(g.canvas, 548, FLOOR_Y - 34, 76, '#ff8a3c', 0.5);
  c.rect(512, FLOOR_Y - 62, 72, 4, PAL.stoneDark);
  // back door and order slips pinned by the front door
  door(c, 604, FLOOR_Y, 22, 52, { wood: PAL.wood, glows: g });
  for (let x = 84; x < 120; x += 11) c.rect(x, FLOOR_Y - 60, 8, 6, PAL.paper, 0.5);
  rug(c, 200, 180, '#6a3a2a');
}

function furnishPolice(c, g) {
  doorHome(c, g, 60);
  wallWindow(c, 168, 38, g);
  for (let k = 0; k < 4; k++) c.rect(170 + k * 9, WIN_Y + 2, 2, WIN_H - 4, PAL.ink, 0.75);                        // bars
  // front desk
  c.rect(110, FLOOR_Y - 40, 82, 14, PAL.stoneDark).frame(110, FLOOR_Y - 40, 82, 14, PAL.ink); c.rect(110, FLOOR_Y - 26, 82, 26, PAL.stone);
  c.rect(134, FLOOR_Y - 48, 14, 8, PAL.cream); c.rect(160, FLOOR_Y - 46, 10, 6, PAL.gold);
  // old desk w/ lamp
  c.rect(290, FLOOR_Y - 32, 66, 10, PAL.wood2); c.rect(294, FLOOR_Y - 22, 10, 22, PAL.woodDark); c.rect(342, FLOOR_Y - 22, 10, 22, PAL.woodDark);
  c.ellipse(320, FLOOR_Y - 35, 4, 2, PAL.cream); c.rect(326, FLOOR_Y - 38, 10, 5, PAL.paper);
  lamp(c, g, 344, FLOOR_Y - 46, { r: 52, a: 0.35 });
  // filing cabinets
  for (const x of [404, 454]) {
    c.rect(x, FLOOR_Y - 54, 40, 54, '#5a6a7a').frame(x, FLOOR_Y - 54, 40, 54, PAL.ink);
    for (let d = 0; d < 3; d++) { c.rect(x + 4, FLOOR_Y - 50 + d * 17, 32, 14, '#6c7c8c'); c.rect(x + 15, FLOOR_Y - 43 + d * 17, 10, 3, PAL.gold); c.rect(x + 10, FLOOR_Y - 48 + d * 17, 20, 3, PAL.paper); }
  }
  // noticeboard
  c.rect(534, FLOOR_Y - 84, 76, 52, PAL.woodDark); c.rect(538, FLOOR_Y - 80, 68, 44, '#8a6a42');
  for (let k = 0; k < 6; k++) { c.rect(542 + (k % 3) * 21, FLOOR_Y - 77 + ((k / 3) | 0) * 20, 16, 14, [PAL.paper, PAL.cream, '#d8c8a0'][k % 3]); c.px(550 + (k % 3) * 21, FLOOR_Y - 77 + ((k / 3) | 0) * 20, PAL.red2); }
  // flag on a floor stand and a wall clock
  c.rect(262, FLOOR_Y - 66, 3, 66, PAL.ink); c.rect(257, FLOOR_Y - 2, 13, 2, PAL.ink); c.rect(265, FLOOR_Y - 64, 22, 14, PAL.red);
  c.circle(236, FLOOR_Y - 74, 9, PAL.stone2); c.circle(236, FLOOR_Y - 74, 7, PAL.cream); c.line(236, FLOOR_Y - 74, 236, FLOOR_Y - 79, PAL.ink); c.line(236, FLOOR_Y - 74, 239, FLOOR_Y - 73, PAL.ink);
  pendant(c, g, 330, CEIL_Y + 20, { r: 40, color: '#cfe0ff', a: 0.18 });
  rug(c, 250, 160, '#2a3a4a', PAL.stone2);
}

function furnishHome(c, g) {
  doorHome(c, g, 60);
  // hallway clock, four minutes slow: a longcase clock just taller than Rowan
  const ct = FLOOR_Y - 60;
  c.rect(131, ct, 28, 60, PAL.wood2).frame(131, ct, 28, 60, PAL.woodDark); c.rect(129, ct - 4, 32, 5, PAL.woodDark);
  c.circle(145, ct + 12, 9, PAL.cream); c.circle(145, ct + 12, 7, PAL.paper); c.line(145, ct + 12, 145, ct + 6, PAL.ink); c.line(145, ct + 12, 149, ct + 15, PAL.ink);
  c.rect(140, ct + 26, 10, 28, PAL.woodDark); c.rect(144, ct + 27, 2, 18, PAL.gold); c.circle(145, ct + 47, 3, PAL.gold);
  // armchair
  c.rect(212, FLOOR_Y - 40, 46, 40, '#6a2a3a'); c.rect(206, FLOOR_Y - 28, 12, 28, '#7a3a4a'); c.rect(252, FLOOR_Y - 28, 12, 28, '#7a3a4a');
  c.rect(214, FLOOR_Y - 18, 42, 8, '#8a4a5a'); c.rect(206, FLOOR_Y - 32, 12, 6, PAL.cream, 0.8);
  // fireplace with a mantel at chest height; the note, the pine sprig and the photograph stand on it
  const m = FLOOR_Y - 40;
  c.rect(300, m, 112, FLOOR_Y - m, PAL.stoneDark); c.rect(292, m - 5, 128, 5, PAL.stone2);
  c.rect(326, m + 10, 60, 30, PAL.ink); c.rect(330, m + 14, 52, 26, '#1c0a0a');
  for (let k = 0; k < 4; k++) c.triangle(334 + k * 12, FLOOR_Y, 340 + k * 12, FLOOR_Y - 14 - (k % 3) * 4, 346 + k * 12, FLOOR_Y, k % 2 ? PAL.amberDeep : PAL.amber, 0.8);
  c.rect(332, FLOOR_Y - 4, 48, 4, '#2a1410'); halo(g.canvas, 356, FLOOR_Y - 14, 70, '#ff9a3c', 0.42);
  c.rect(316, m - 13, 10, 8, PAL.paper); c.rect(334, m - 17, 8, 12, PAL.pine2);
  frameBox(c, 384, m - 23, 22, 18, '#b8b4a8');
  // window with the toy box underneath: a long chest painted with stars
  wallWindow(c, 462, 44, g, '#6a3a4a');
  c.rect(456, FLOOR_Y - 26, 68, 26, '#3a5a8a').frame(456, FLOOR_Y - 26, 68, 26, PAL.woodDark);
  for (let k = 0; k < 7; k++) christmasStar(c, 463 + k * 9, FLOOR_Y - 14 + (k % 2) * 4, 3, {});
  c.rect(456, FLOOR_Y - 30, 68, 5, '#4a6aa0');
  // a calendar stuck on December
  c.rect(556, FLOOR_Y - 80, 26, 34, PAL.paper); c.rect(556, FLOOR_Y - 80, 26, 7, PAL.red); c.rect(559, FLOOR_Y - 70, 20, 20, PAL.cream, 0.5);
  pendant(c, g, 300, CEIL_Y + 18, { r: 36, a: 0.15 });
  rug(c, 190, 220, '#3a2a4a');
}

// ---------- church, archive, tower ----------
function furnishArchive(c, g) {
  const w = c.width;
  doorHome(c, g, 60);
  // nave windows: stained glass
  for (const x of [130, 250, 380, 470]) {
    c.rect(x - 2, 40, 28, 80, PAL.stoneDark); c.vgradient(x, 44, 24, 72, '#2a3a8a', '#6a2a7a', 6);
    for (let k = 0; k < 8; k++) c.rect(x + 2 + (k % 2) * 10, 50 + k * 8, 8, 6, ['#d8a040', '#c04040', '#40a080', '#4a78d8'][k % 4], 0.8);
    c.rect(x + 11, 44, 2, 72, PAL.ink);
    c.triangle(x - 2, 44, x + 12, 28, x + 26, 44, PAL.stoneDark); halo(g.canvas, x + 12, 80, 30, '#8a6ad8', 0.25);
  }
  // pews
  for (const x of [130, 170, 210]) { c.rect(x, FLOOR_Y - 20, 86, 6, PAL.wood2); c.rect(x, FLOOR_Y - 34, 86, 4, PAL.wood); c.rect(x + 2, FLOOR_Y - 14, 4, 14, PAL.woodDark); c.rect(x + 80, FLOOR_Y - 14, 4, 14, PAL.woodDark); }
  // cornerstone and bell ropes
  c.rect(286, FLOOR_Y - 26, 40, 26, PAL.stone2).frame(286, FLOOR_Y - 26, 40, 26, PAL.stoneDark); for (let k = 0; k < 4; k++) c.hline(292, FLOOR_Y - 20 + k * 4, 28 - k * 3, PAL.stoneDark);
  for (const x of [410, 424, 438]) { c.rect(x, 60, 2, FLOOR_Y - 60, PAL.paperDark); c.rect(x - 2, FLOOR_Y - 42, 6, 14, '#a03030'); }
  // parish annex door
  door(c, 520, FLOOR_Y, 30, 56, { wood: PAL.woodDark, frame: PAL.ink, glows: g }); c.rect(504, FLOOR_Y - 64, 32, 6, PAL.stoneDark);
  // archive beyond the grille (x >= 620): warm green lamps, shelves
  c.rect(620, 0, w - 620, FLOOR_Y, mix(PAL.woodDark, PAL.night0, 0.3));
  for (let x = 626; x < w - 20; x += 11) c.vline(x, 0, FLOOR_Y, mix(PAL.woodDark, PAL.ink, 0.4));
  bookshelf(c, 636, FLOOR_Y, 56, 98, { seed: 9 });
  c.rect(700, FLOOR_Y - 34, 62, 10, PAL.wood2); c.rect(704, FLOOR_Y - 24, 8, 24, PAL.woodDark); c.rect(750, FLOOR_Y - 24, 8, 24, PAL.woodDark);
  c.rect(716, FLOOR_Y - 40, 24, 6, PAL.paper);
  lamp(c, g, 746, FLOOR_Y - 46, { r: 70, color: '#9affb0', a: 0.35 }); c.rect(742, FLOOR_Y - 52, 9, 4, '#2a8a5a');
  bookshelf(c, 790, FLOOR_Y, 90, 112, { seed: 21 });
  bookshelf(c, 884, FLOOR_Y, 60, 84, { seed: 33 });
  c.rect(898, FLOOR_Y - 32, 40, 8, PAL.wood2); c.rect(902, FLOOR_Y - 24, 5, 24, PAL.woodDark); c.rect(930, FLOOR_Y - 24, 5, 24, PAL.woodDark);
  for (let k = 0; k < 5; k++) c.rect(900 + k * 7, FLOOR_Y - 36, 5, 5, PAL.paper);
  // tower stairs with chain and sign
  c.rect(972, 66, 70, FLOOR_Y - 66, mix(PAL.stoneDark, PAL.night0, 0.4)); c.rect(980, 84, 54, FLOOR_Y - 84, PAL.ink);
  for (let k = 0; k < 8; k++) c.rect(984 + k * 4, FLOOR_Y - 12 - k * 8, 40 - k * 4, 6, mix(PAL.stone, PAL.ink, 0.3 + k * 0.05));
  c.rect(975, 142, 3, 2, PAL.ink);
  // nave carpet
  c.rect(60, FLOOR_Y + 24, 540, 14, '#5a2030', 0.85); c.hline(60, FLOOR_Y + 24, 540, PAL.gold); c.hline(60, FLOOR_Y + 37, 540, PAL.gold);
  rug(c, 760, 160, '#26402e');
}

function furnishTower(c, g) {
  doorHome(c, g, 60);
  // belfry arches with night view
  for (const x of [120, 300, 480]) {
    c.rect(x, 50, 70, FLOOR_Y - 50, PAL.ink);
    c.rect(x + 6, 60, 58, FLOOR_Y - 60, PAL.night1); c.vgradient(x + 6, 60, 58, 120, PAL.night0, PAL.dusk, 8);
    c.circle(x + 35, 60, 29, PAL.night1, 0.0);
    stars(c, 0, 0, 0);
    for (let i = 0; i < 20; i++) c.px(x + 8 + hash(x + i) * 54, 62 + hash(i * 3 + x) * 80, '#ffffff', 0.5 + hash(i) * 0.4);
    for (let i = 0; i < 26; i++) c.px(x + 8 + hash(i * 11 + x) * 54, 62 + hash(i * 5) * 140, '#dce6ff', 0.8);
    c.rect(x + 6, FLOOR_Y - 10, 58, 10, PAL.snow3);
  }
  // big bell
  c.rect(240, 36, 70, 5, PAL.woodDark); c.rect(262, 40, 26, 6, PAL.ink);
  c.ellipse(275, 108, 24, 40, PAL.copper); c.rect(251, 108, 48, 44, PAL.copper); c.ellipse(275, 152, 26, 6, PAL.copperHi);
  c.rect(258, 100, 6, 44, PAL.copperHi, 0.5); c.ellipse(275, 160, 6, 6, PAL.ink); halo(g.canvas, 275, 120, 70, '#6a7acc', 0.12);
  // cot and thermos
  c.rect(124, FLOOR_Y - 14, 60, 10, '#3a4a6a'); c.rect(128, FLOOR_Y - 20, 52, 8, '#6a2a3a'); c.rect(124, FLOOR_Y - 4, 4, 4, PAL.ink); c.rect(180, FLOOR_Y - 4, 4, 4, PAL.ink);
  c.rect(196, FLOOR_Y - 14, 8, 14, '#6a8a9a'); c.rect(197, FLOOR_Y - 16, 6, 3, PAL.red);
  lamp(c, g, 206, FLOOR_Y - 26, { r: 56, a: 0.4 });
  // the Star mounting, copper plate panel, recess and the blank twelfth point
  c.rect(310, 96, 90, FLOOR_Y - 96, PAL.stoneDark); c.rect(314, 100, 82, FLOOR_Y - 104, mix(PAL.stoneDark, PAL.ink, 0.35));
  christmasStar(c, 330, 140, 22, { glows: g });
  c.rect(372, 120, 44, 56, PAL.copper).frame(372, 120, 44, 56, PAL.woodDark);
  for (let k = 0; k < 12; k++) c.rect(376 + (k % 4) * 10, 126 + ((k / 4) | 0) * 16, 7, 11, k === 11 ? PAL.ink : PAL.copperHi);
  c.rect(430, 130, 24, 50, PAL.ink); c.rect(432, 134, 20, 44, mix(PAL.stoneDark, PAL.ink, 0.5));
  c.circle(512, 140, 11, PAL.copper); c.circle(512, 140, 8, PAL.ink); c.rect(510, 134, 4, 12, PAL.copperHi, 0.5);
  // timbers and iron stair rail
  c.rect(0, 20, c.width, 6, PAL.woodDark); for (let x = 20; x < c.width; x += 90) c.rect(x, 26, 4, 24, PAL.woodDark);
}

// ---------- assembly ----------
function newGlows(w) {
  const canvas = new PixelCanvas(w, VIEW_H);
  const g = { canvas, list: [], moon: [], push(l) { g.list.push(l); halo(canvas, l.x, l.y, l.r, l.color || PAL.glow, 0.3); } };
  return g;
}

/** Moonlight pooling under windows on interior floors. */
function moonPools(g) {
  for (const m of g.moon) {
    if (!m.w) continue;
    for (let k = 0; k < 4; k++) g.canvas.rect(m.x - m.w / 2 + k * 2, FLOOR_Y + 6 + k * 5, m.w - k * 4, 3, '#8aa0e8', 0.13);
  }
}

const INTERIOR = {
  office: { shell: { wall: '#2a2236', paper: '#3a2f4e', wain: PAL.wood, floor: '#4a3426' }, furnish: furnishOffice },
  inn: { shell: { wall: '#3a2a22', wain: PAL.wood, floor: '#5a3e2a' }, furnish: furnishInn },
  bakery: { shell: { wall: '#4a3a2c', paper: '#5a4636', wain: '#7a5a3c', floor: '#6a4a32' }, furnish: furnishBakery },
  police: { shell: { wall: '#2a3a4a', paper: '#34485a', wain: PAL.stoneDark, floor: '#343a4e', trim: PAL.stone }, furnish: furnishPolice },
  home: { shell: { wall: '#2a2030', paper: '#40304a', wain: '#4a3a3a', floor: '#3a2c2a' }, furnish: furnishHome },
  archive: { shell: { wall: '#3a3c58', stone: true, wain: PAL.stoneDark, floor: '#2a2c44', trim: PAL.stone, ceiling: false }, furnish: furnishArchive },
  tower: { shell: { wall: '#2e3250', stone: true, wain: PAL.stoneDark, floor: '#24283e', trim: PAL.stone, ceiling: false }, furnish: furnishTower },
};

export function renderLocation(id) {
  const loc = LOCATIONS[id];
  if (!loc) throw new Error(`Unknown location "${id}"`);
  const w = loc.width;
  const glows = newGlows(w);
  const layers = [];
  const ext = loc.kind === 'street';

  if (ext) {
    layers.push({ name: 'sky', canvas: skyLayer(w), scroll: 0.05 });
    layers.push({ name: 'far', canvas: farLayer(w), scroll: 0.2 });
    layers.push({ name: 'mid', canvas: midLayer(w), scroll: 0.45 });
    layers.push({ name: 'near', canvas: squareNear(w, glows), scroll: 1 });
    layers.push({ name: 'fog', canvas: fogLayer(w), scroll: 0.7 });
  } else {
    const spec = INTERIOR[id];
    const near = roomShell(w, spec.shell);
    spec.furnish(near, glows);
    moonPools(glows);
    layers.push({ name: 'near', canvas: near, scroll: 1 });
    layers.push({ name: 'fog', canvas: fogLayer(w, 190, id === 'tower' || id === 'home' ? 0.12 : 0.05), scroll: 1 });
  }
  for (const l of layers) if (l.name !== 'sky') tonePass(l.canvas, ext && l.name === 'near' ? Math.max(loc.tone, 0.3) : loc.tone);
  layers.push({ name: 'glow', canvas: glows.canvas, scroll: 1, blend: 'add' });
  return { id, width: w, height: VIEW_H, layers, lights: glows.list };
}

/** Flatten layers into one canvas (previews, tests). Layers are composited in order at x = 0. */
export function flatten(render) {
  const c = new PixelCanvas(render.width, VIEW_H);
  for (const l of render.layers) c.blit(l.canvas, 0, 0);
  return c;
}

/** Closed archive grille drawn as a separate prop so the scene can remove it once Nora opens it. */
export function renderGrille() {
  const c = new PixelCanvas(14, 214);
  c.rect(0, 0, 14, 6, PAL.ink);
  for (let x = 1; x < 14; x += 3) c.rect(x, 4, 1, 210, '#2a2a36');
  for (let y = 30; y < 200; y += 34) c.rect(0, y, 14, 2, PAL.ink);
  for (let x = 1; x < 14; x += 3) c.px(x, 6, PAL.stone2, 0.6);
  c.rect(0, 206, 14, 8, PAL.ink, 0.5);
  return c;
}

/** The chain + "closed" sign across the tower stairs. */
export function renderChain() {
  const c = new PixelCanvas(60, 24);
  for (let x = 0; x < 60; x += 4) c.rect(x, 6 + Math.round(Math.sin(x / 60 * Math.PI) * 5), 3, 2, PAL.stone2);
  c.rect(22, 12, 16, 10, PAL.paper).frame(22, 12, 16, 10, PAL.red); c.rect(25, 16, 10, 1, PAL.red); c.rect(25, 18, 10, 1, PAL.red, 0.6);
  return c;
}
