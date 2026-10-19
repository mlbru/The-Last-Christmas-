// Procedural 16-bit character sprites (32x48), generated from each character's `look`.
// Sheet layout (all facing right; the engine flips for left):
//   idle x2, walk x4, talk x2, inspect x2  -> 10 frames in one row (320x48)

import { PixelCanvas, mix } from './PixelCanvas.js';
import { PAL } from './palette.js';

export const FRAME_W = 32;
export const FRAME_H = 48;
export const FRAMES = {
  idle: [0, 1],
  walk: [2, 3, 4, 5],
  talk: [6, 7],
  inspect: [8, 9],
};
export const FRAME_COUNT = 10;

function drawHat(c, look, hx, hy) {
  const hat = look.hat;
  if (!hat) return;
  const col = look.hatColor || look.trim;
  switch (hat) {
    case 'flat': c.rect(hx - 1, hy + 1, 14, 3, col).rect(hx + 1, hy - 1, 10, 3, mix(col, PAL.ink, 0.25)); break;
    case 'cap': c.rect(hx, hy, 12, 4, col).rect(hx + 6, hy + 3, 8, 2, mix(col, PAL.ink, 0.3)); break;
    case 'wool': c.rect(hx, hy - 1, 12, 5, col).rect(hx + 5, hy - 3, 3, 2, mix(col, '#ffffff', 0.35)).hline(hx, hy + 2, 12, mix(col, PAL.ink, 0.25)); break;
    case 'top': c.rect(hx - 2, hy + 2, 16, 2, PAL.ink).rect(hx + 1, hy - 7, 10, 9, '#201c2c').rect(hx + 1, hy - 1, 10, 2, look.trim); break;
    default: break;
  }
}

/** Draw one pose onto a 32x48 canvas. */
function drawPose(look, kind, step) {
  const c = new PixelCanvas(FRAME_W, FRAME_H);
  const skin = look.skin;
  const skinShade = mix(skin, '#6b3a2a', 0.25);
  const hair = look.hair;
  const coat = look.coat;
  const coatDark = mix(coat, PAL.ink, 0.35);
  const coatLight = mix(coat, '#ffffff', 0.18);
  const legC = mix(look.coat, PAL.ink, 0.55);
  const shoe = '#241a16';

  // Pose parameters
  let bob = 0, legL = 0, legR = 0, armL = 0, armR = 0, lean = 0, mouth = 0, armFwd = 0;
  if (kind === 'idle') bob = step % 2;
  if (kind === 'walk') {
    const s = [[-3, 3, 3, -3, 0], [0, 0, 0, 0, -1], [3, -3, -3, 3, 0], [0, 0, 0, 0, -1]][step % 4];
    legL = s[0]; legR = s[1]; armL = s[2]; armR = s[3]; bob = s[4];
    if (step % 2 === 1) { legL = 0; legR = 0; }
  }
  if (kind === 'talk') { mouth = step % 2 === 0 ? 1 : 0; armFwd = step % 2 === 0 ? 2 : 0; bob = 0; }
  if (kind === 'inspect') { lean = 2; armFwd = 4 + (step % 2); bob = 1; }

  const baseY = 0;
  // shadow
  c.ellipse(16, 46, 9, 2, '#00000040');

  // legs
  const legTop = 33 + bob;
  c.rect(12 + legL, legTop, 4, 12 - bob + (legL === 0 ? 0 : -Math.abs(legL) / 2), legC);
  c.rect(17 + legR, legTop, 4, 12 - bob + (legR === 0 ? 0 : -Math.abs(legR) / 2), mix(legC, '#ffffff', 0.08));
  c.rect(11 + legL, 44 - Math.abs(legL) / 2, 6, 2, shoe);
  c.rect(17 + legR, 44 - Math.abs(legR) / 2, 6, 2, shoe);

  // back arm
  c.rect(8 + armL / 2 + lean, 20 + bob, 3, 11, coatDark);
  c.rect(8 + armL / 2 + lean, 30 + bob, 3, 2, skinShade);

  // body / coat
  c.rect(10 + lean, 19 + bob, 13, 16, coat);
  c.rect(10 + lean, 33 + bob, 13, 3, coatDark);
  c.vline(16 + lean, 19 + bob, 16, coatDark);
  c.rect(10 + lean, 19 + bob, 13, 2, coatLight);
  c.rect(11 + lean, 24 + bob, 1, 1, look.trim); c.rect(11 + lean, 28 + bob, 1, 1, look.trim);
  if (look.apron) c.rect(12 + lean, 26 + bob, 9, 10, look.apron).hline(12 + lean, 26 + bob, 9, mix(look.apron, PAL.ink, 0.2));

  // front arm
  const frontX = 22 + lean + armFwd;
  c.rect(frontX - (armFwd ? 1 : 0), 20 + bob, 3, 10, mix(coat, '#ffffff', 0.08));
  c.rect(frontX + (armFwd ? 1 : 0), 29 + bob - (kind === 'talk' ? 3 : 0), 3, 3, skin);

  // scarf
  if (look.scarf) {
    c.rect(10 + lean, 17 + bob, 13, 4, look.scarf);
    c.hline(10 + lean, 20 + bob, 13, mix(look.scarf, PAL.ink, 0.3));
    c.rect(11 + lean, 21 + bob, 3, 9 + (kind === 'walk' ? (step % 2) : 0), look.scarf);
    c.rect(11 + lean, 28 + bob, 3, 2, mix(look.scarf, PAL.ink, 0.25));
  } else {
    c.rect(13 + lean, 17 + bob, 7, 3, skinShade);
  }

  // head
  const hx = 11 + lean, hy = 4 + bob;
  c.rect(hx, hy + 2, 12, 12, skin);
  c.rect(hx + 1, hy, 10, 14, skin);
  c.vline(hx + 11, hy + 3, 10, skinShade);
  // hair
  c.rect(hx, hy, 12, 4, hair).rect(hx - 1, hy + 2, 2, 6, hair).rect(hx + 1, hy + 4, 3, 1, hair);
  c.rect(hx + 10, hy + 1, 2, 3, mix(hair, PAL.ink, 0.25));
  // face
  c.rect(hx + 3, hy + 7, 2, 2, PAL.ink).rect(hx + 8, hy + 7, 2, 2, PAL.ink);
  c.px(hx + 3, hy + 7, '#ffffff'); c.px(hx + 8, hy + 7, '#ffffff');
  if (look.glasses) { c.frame(hx + 2, hy + 6, 4, 4, '#2a2a3a'); c.frame(hx + 7, hy + 6, 4, 4, '#2a2a3a'); c.hline(hx + 6, hy + 7, 1, '#2a2a3a'); }
  c.rect(hx + 9, hy + 9, 1, 2, skinShade);                      // nose
  if (mouth) c.rect(hx + 5, hy + 11, 3, 2, '#7a2a30'); else c.hline(hx + 5, hy + 12, 3, '#8a4a40');
  // hat on top of hair
  drawHat(c, look, hx, hy);
  // beard-like grey for elders: slightly shaded jaw
  if (look.hair === '#e8e8e8' || look.hair === '#cfcfcf' || look.hair === '#8a8a8a') c.rect(hx + 2, hy + 12, 8, 1, mix(skin, '#ffffff', 0.15));

  c.outline();
  void baseY;
  return c;
}

/** The full 10-frame sheet for one character. */
export function characterSheet(look) {
  const sheet = new PixelCanvas(FRAME_W * FRAME_COUNT, FRAME_H);
  const poses = [
    ['idle', 0], ['idle', 1],
    ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3],
    ['talk', 0], ['talk', 1],
    ['inspect', 0], ['inspect', 1],
  ];
  poses.forEach(([kind, step], i) => sheet.blit(drawPose(look, kind, step), i * FRAME_W, 0));
  return sheet;
}

export function characterFrame(look, kind, step = 0) { return drawPose(look, kind, step); }
