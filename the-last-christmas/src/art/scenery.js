// Reusable scenery pieces for the backgrounds. Every function draws onto a PixelCanvas and may
// register light sources in `glows` (lit windows, lamps) so scenes can add flickering light.

import { mix } from './PixelCanvas.js';
import { PAL } from './palette.js';

export function snowGround(c, topY, w, shade = 0) {
  const top = mix(PAL.snow2, PAL.night2, shade), body = mix(PAL.snow3, PAL.night2, shade), deep = mix(PAL.snowShade, PAL.night1, shade);
  c.rect(0, topY, w, c.height - topY, body);
  c.rect(0, topY, w, 3, top);
  c.rect(0, topY + 3, w, 1, mix(top, body, 0.5));
  // gentle drifts and sparkle
  for (let x = 0; x < w; x += 23) {
    const dh = 1 + ((x * 7) % 3);
    c.rect(x, topY - dh, 15 + (x % 9), dh, top);
  }
  for (let x = 5; x < w; x += 37) c.rect(x, topY + 14 + (x % 11), 6, 1, deep, 0.5);
  for (let x = 11; x < w; x += 53) c.px(x, topY + 6 + (x % 17), '#ffffff', 0.7);
}

export function window_(c, x, y, w, h, { lit = true, glows, frame = PAL.woodDark, cross = true, color = PAL.amber, night = PAL.night2 } = {}) {
  c.rect(x - 1, y - 1, w + 2, h + 2, frame);
  if (lit) {
    c.vgradient(x, y, w, h, PAL.amberHi, color);
    if (glows) glows.push({ x: x + w / 2, y: y + h / 2, r: Math.max(w, h) * 1.6, color: PAL.glow });
  } else {
    c.vgradient(x, y, w, h, night, mix(night, PAL.ink, 0.4));
    c.px(x + 1, y + 1, '#ffffff', 0.5);
  }
  if (cross) { c.rect(x + Math.floor(w / 2), y, 1, h, frame); c.rect(x, y + Math.floor(h / 2), w, 1, frame); }
  c.rect(x - 2, y + h + 1, w + 4, 2, mix(frame, '#ffffff', 0.25));
  c.rect(x - 1, y - 2, w + 2, 1, PAL.snow);   // snow on the sill-top
}

export function door(c, x, baseY, w = 22, h = 38, { wood = PAL.wood2, frame = PAL.woodDark, glass = false, handle = PAL.gold, lamp = null, glows } = {}) {
  c.rect(x - w / 2 - 2, baseY - h - 2, w + 4, h + 2, frame);
  c.rect(x - w / 2, baseY - h, w, h, wood);
  c.rect(x - w / 2 + 2, baseY - h + 3, w / 2 - 3, h / 2 - 3, mix(wood, PAL.ink, 0.2));
  c.rect(x + 1, baseY - h + 3, w / 2 - 3, h / 2 - 3, mix(wood, PAL.ink, 0.2));
  c.rect(x - w / 2 + 2, baseY - h / 2 + 2, w - 4, h / 2 - 3, mix(wood, PAL.ink, 0.12));
  if (glass) c.rect(x - 4, baseY - h + 5, 8, 10, PAL.amber);
  c.rect(x + w / 2 - 5, baseY - h / 2, 2, 2, handle);
  c.rect(x - w / 2 - 3, baseY - 2, w + 6, 2, mix(frame, PAL.snow, 0.5));
  if (lamp && glows) { c.rect(x - 1, baseY - h - 10, 3, 5, PAL.gold); glows.push({ x, y: baseY - h - 7, r: 24, color: PAL.glow }); }
}

/** A snowy-roofed building block. */
export function building(c, x, baseY, w, h, { wall = PAL.brick, roof = PAL.stoneDark, roofH = 16, shade = 0, glows, windows = [], trim = PAL.snow } = {}) {
  const wallC = mix(wall, PAL.night1, shade), roofC = mix(roof, PAL.night1, shade);
  c.rect(x, baseY - h, w, h, wallC);
  for (let yy = baseY - h + 4; yy < baseY - 2; yy += 5) c.hline(x, yy, w, mix(wallC, PAL.ink, 0.12));
  for (let yy = baseY - h + 4, row = 0; yy < baseY - 2; yy += 5, row++) for (let xx = x + (row % 2) * 4; xx < x + w; xx += 9) c.vline(xx, yy, 5, mix(wallC, PAL.ink, 0.12));
  c.vline(x, baseY - h, h, mix(wallC, '#ffffff', 0.1));
  c.vline(x + w - 1, baseY - h, h, mix(wallC, PAL.ink, 0.3));
  // sloped roof
  c.triangle(x - 6, baseY - h, x + w / 2, baseY - h - roofH, x + w + 6, baseY - h, roofC);
  c.rect(x - 6, baseY - h - 1, w + 12, 3, mix(roofC, PAL.ink, 0.25));
  // snow on the roof
  c.triangle(x - 4, baseY - h - 1, x + w / 2, baseY - h - roofH + 1, x + w + 4, baseY - h - 1, trim);
  c.triangle(x + 2, baseY - h - 1, x + w / 2, baseY - h - roofH + 5, x + w - 2, baseY - h - 1, mix(roofC, trim, 0.25));
  for (const win of windows) window_(c, win.x, win.y, win.w ?? 12, win.h ?? 14, { lit: win.lit !== false, glows });
  // chimney
  c.rect(x + w - 16, baseY - h - roofH + 2, 7, 12, mix(wallC, PAL.ink, 0.25));
  c.rect(x + w - 17, baseY - h - roofH + 1, 9, 2, trim);
}

export function pine(c, x, baseY, h, { shade = 0, snow = true } = {}) {
  const g1 = mix(PAL.pine, PAL.night1, shade), g2 = mix(PAL.pine2, PAL.night1, shade);
  c.rect(x - 2, baseY - 6, 4, 6, PAL.trunk);
  const tiers = Math.max(3, Math.floor(h / 14));
  for (let i = 0; i < tiers; i++) {
    const top = baseY - h + (h * i) / (tiers + 0.4), tw = 6 + (i + 1) * (h / (tiers * 3.4));
    c.triangle(x - tw, top + h / tiers + 3, x, top, x + tw, top + h / tiers + 3, i % 2 ? g2 : g1);
    if (snow) c.triangle(x - tw * 0.75, top + h / tiers * 0.7, x, top, x + tw * 0.75, top + h / tiers * 0.7, PAL.snow2);
  }
}

/** A decorated Christmas tree with lights. */
export function christmasTree(c, x, baseY, h, glows) {
  c.rect(x - 3, baseY - 8, 6, 8, PAL.trunk);
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const top = baseY - h + (h * i) / (tiers + 0.5), tw = 8 + (i + 1) * (h / (tiers * 2.9));
    c.triangle(x - tw, top + h / tiers + 4, x, top, x + tw, top + h / tiers + 4, i % 2 ? PAL.pine2 : PAL.pine);
    for (let k = 0; k < 4 + i * 2; k++) {
      const px = x - tw + 3 + ((k * 37 + i * 11) % Math.max(1, tw * 2 - 6)), py = top + 6 + ((k * 17 + i * 5) % Math.max(1, h / tiers));
      c.px(px, py, [PAL.red2, PAL.amberHi, '#7ab8ff', PAL.gold][k % 4]);
      c.px(px + 1, py, [PAL.red2, PAL.amberHi, '#7ab8ff', PAL.gold][k % 4], 0.5);
    }
  }
  starTopper(c, x, baseY - h - 3, 5);
  if (glows) glows.push({ x, y: baseY - h / 2, r: h * 0.9, color: '#ffd98a' });
}

function starTopper(c, x, y, r) {
  c.rect(x - 1, y - r, 3, r * 2, PAL.gold); c.rect(x - r, y - 1, r * 2, 3, PAL.gold);
  c.px(x, y, PAL.amberHi);
}

/** The twelve-pointed Christmas Star (copper and glass). */
export function christmasStar(c, cx, cy, r, { lit = false, glows, platesLit = 0 } = {}) {
  const pts = 12;
  const copper = lit ? PAL.copperHi : PAL.copper;
  const glass = lit ? PAL.amberHi : mix(PAL.twilight, PAL.night2, 0.5);
  // outer points
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2 - Math.PI / 2;
    const a1 = a - Math.PI / pts / 2.3, a2 = a + Math.PI / pts / 2.3;
    c.triangle(cx + Math.cos(a1) * r * 0.45, cy + Math.sin(a1) * r * 0.45, cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45, i % 2 ? copper : mix(copper, PAL.ink, 0.15));
    const px = cx + Math.cos(a) * r * 0.78, py = cy + Math.sin(a) * r * 0.78;
    c.px(px, py, i < platesLit || lit ? PAL.amberHi : mix(copper, '#ffffff', 0.4));
  }
  c.circle(cx, cy, Math.max(2, r * 0.42), mix(copper, PAL.ink, 0.2));
  c.circle(cx, cy, Math.max(1, r * 0.3), glass);
  if (lit && glows) glows.push({ x: cx, y: cy, r: r * 3, color: PAL.glow });
}

export function lampPost(c, x, baseY, h = 56, glows, lit = true) {
  c.rect(x - 1, baseY - h, 3, h, PAL.ink);
  c.rect(x - 3, baseY - h - 6, 7, 7, lit ? PAL.amberHi : PAL.stone);
  c.rect(x - 4, baseY - h - 8, 9, 2, PAL.ink);
  c.rect(x - 3, baseY - 3, 7, 3, PAL.stoneDark);
  if (lit && glows) glows.push({ x, y: baseY - h - 3, r: 34, color: PAL.glow });
}

/** String of fairy lights between two points. */
export function lights(c, x0, y0, x1, y1, sag = 6, glows) {
  const n = Math.max(2, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 7));
  const cols = [PAL.red2, PAL.amberHi, '#7ab8ff', '#8be08b'];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
    c.px(x, y - 1, PAL.ink); c.rect(x, y, 2, 2, cols[i % 4]);
    if (glows && i % 3 === 0) glows.push({ x, y, r: 10, color: cols[i % 4] });
  }
}

export function stars(c, w, h, count, seed = 5) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < count; i++) c.px(rnd() * w, rnd() * h, '#ffffff', 0.35 + rnd() * 0.6);
}

export function barrel(c, x, baseY, w = 14, h = 16) {
  c.rect(x - w / 2, baseY - h, w, h, PAL.wood);
  c.rect(x - w / 2, baseY - h + 3, w, 2, PAL.woodDark); c.rect(x - w / 2, baseY - 5, w, 2, PAL.woodDark);
  c.rect(x - w / 2, baseY - h, w, 1, PAL.wood2);
}

export function crate(c, x, baseY, w = 16, h = 14) {
  c.rect(x - w / 2, baseY - h, w, h, PAL.wood2).frame(x - w / 2, baseY - h, w, h, PAL.woodDark);
  c.line(x - w / 2, baseY - h, x + w / 2 - 1, baseY - 1, PAL.woodDark);
}

export function bookshelf(c, x, baseY, w, h, { seed = 1, wall = PAL.woodDark } = {}) {
  c.rect(x, baseY - h, w, h, wall);
  const rows = Math.floor(h / 14);
  for (let r = 0; r < rows; r++) {
    const y = baseY - h + 4 + r * 14;
    c.rect(x + 2, y + 11, w - 4, 2, PAL.wood2);
    let bx = x + 3, s = seed + r * 7;
    while (bx < x + w - 5) {
      s = (s * 31 + 7) % 97;
      const bw = 2 + (s % 3), bh = 7 + (s % 5);
      c.rect(bx, y + 11 - bh, bw, bh, [PAL.red, PAL.green, PAL.brick2, '#3a5a8a', PAL.paperDark, '#6a4a8a'][s % 6]);
      bx += bw + 1;
    }
  }
}

export function frameBox(c, x, y, w, h, fill = PAL.paper) {
  c.rect(x, y, w, h, PAL.woodDark); c.rect(x + 1, y + 1, w - 2, h - 2, PAL.wood2); c.rect(x + 2, y + 2, w - 4, h - 4, fill);
}
