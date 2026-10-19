// 64x64 pixel-art portraits with six moods, drawn from each character's `look`.

import { PixelCanvas, mix } from './PixelCanvas.js';
import { PAL } from './palette.js';

export const PORTRAIT_SIZE = 64;
export const MOODS = ['neutral', 'warm', 'worried', 'sad', 'angry', 'shocked'];

function hatP(c, look) {
  const col = look.hatColor || look.trim;
  switch (look.hat) {
    case 'flat': c.rect(16, 9, 32, 7, col).rect(22, 4, 20, 7, mix(col, PAL.ink, 0.25)); break;
    case 'cap': c.rect(17, 8, 30, 9, col).rect(30, 15, 22, 4, mix(col, PAL.ink, 0.3)); break;
    case 'wool': c.rect(17, 5, 30, 13, col).rect(29, 1, 7, 5, mix(col, '#ffffff', 0.35)).hline(17, 15, 30, mix(col, PAL.ink, 0.25)); break;
    case 'top': c.rect(12, 14, 40, 5, PAL.ink).rect(19, -4, 26, 18, '#201c2c').rect(19, 9, 26, 5, look.trim); break;
    default: break;
  }
}

export function portrait(look, mood = 'neutral') {
  const c = new PixelCanvas(PORTRAIT_SIZE, PORTRAIT_SIZE);
  // backdrop: warm lamp glow in a dark panel
  c.vgradient(0, 0, 64, 64, '#2a2340', '#161226');
  c.ellipse(32, 34, 28, 26, '#3a2f4a');
  c.ellipse(32, 34, 22, 20, '#4a3b55', 0.5);

  const skin = look.skin, shade = mix(skin, '#6b3a2a', 0.3), hair = look.hair;
  const coat = look.coat, coatDark = mix(coat, PAL.ink, 0.35);

  // shoulders and collar
  c.rect(8, 52, 48, 12, coat).rect(8, 52, 48, 2, mix(coat, '#ffffff', 0.18));
  c.ellipse(32, 56, 28, 8, coat);
  c.rect(27, 46, 10, 8, shade);                                  // neck
  c.rect(8, 60, 48, 4, coatDark);
  if (look.apron) c.rect(20, 56, 24, 8, look.apron);
  if (look.scarf) { c.rect(17, 48, 30, 7, look.scarf).rect(17, 54, 30, 1, mix(look.scarf, PAL.ink, 0.3)); c.rect(38, 55, 7, 9, look.scarf); }
  else c.rect(24, 51, 16, 3, mix(look.trim, coat, 0.3));

  // head
  c.ellipse(32, 30, 15, 18, skin);
  c.rect(17, 24, 30, 12, skin);
  c.vline(46, 22, 18, shade); c.vline(45, 24, 14, shade);
  c.ellipse(17, 31, 2, 4, shade); c.ellipse(47, 31, 2, 4, shade);   // ears

  // hair
  c.rect(17, 12, 30, 9, hair).rect(15, 17, 5, 15, hair).rect(44, 15, 4, 11, mix(hair, PAL.ink, 0.2));
  c.rect(19, 20, 12, 3, hair);
  if (look.hair === '#e8e8e8' || look.hair === '#cfcfcf' || look.hair === '#8a8a8a' || look.hair === '#d8d8d8' || look.hair === '#9a9a9a') {
    c.rect(20, 40, 24, 3, mix(skin, '#ffffff', 0.2));
  }
  hatP(c, look);

  // eyes and brows by mood
  const browY = { neutral: 24, warm: 24, worried: 23, sad: 24, angry: 25, shocked: 21 }[mood] ?? 24;
  const eyeOpen = mood === 'shocked' ? 5 : (mood === 'sad' || mood === 'worried') ? 3 : 4;
  for (const ex of [23, 36]) {
    c.rect(ex, 28, 6, eyeOpen, '#f4f1ea');
    c.rect(ex + 2 + (mood === 'sad' ? -1 : 0), 28 + (mood === 'sad' ? 1 : 0), 2, Math.min(eyeOpen, 3), PAL.ink);
    c.px(ex + 3, 28, '#ffffff');
  }
  if (look.glasses) { c.frame(21, 26, 10, 8, '#2a2a3a'); c.frame(34, 26, 10, 8, '#2a2a3a'); c.hline(31, 28, 3, '#2a2a3a'); }
  const brow = mix(hair, PAL.ink, 0.35);
  const slantL = mood === 'angry' ? [1, 0] : mood === 'worried' || mood === 'sad' ? [0, 1] : [0, 0];
  c.line(22, browY + slantL[0] * 1, 29, browY + (slantL[1] ? -1 : slantL[0] ? 1 : 0), brow);
  c.line(35, browY + (slantL[1] ? -1 : slantL[0] ? 1 : 0), 42, browY + slantL[0] * 1, brow);
  c.rect(22, browY - 1, 7, 1, brow, 0.6).rect(35, browY - 1, 7, 1, brow, 0.6);

  // nose and mouth
  c.vline(33, 30, 6, shade); c.hline(32, 36, 3, shade);
  const m = {
    neutral: () => c.hline(28, 41, 8, '#8a4a40'),
    warm: () => { c.hline(28, 41, 8, '#8a4a40'); c.px(27, 40, '#8a4a40'); c.px(36, 40, '#8a4a40'); c.hline(29, 42, 6, '#c47a6a'); },
    worried: () => { c.hline(29, 42, 6, '#8a4a40'); c.px(28, 43, '#8a4a40'); c.px(35, 43, '#8a4a40'); },
    sad: () => { c.hline(29, 42, 6, '#8a4a40'); c.px(28, 43, '#8a4a40'); c.px(35, 43, '#8a4a40'); c.px(24, 33, '#9ec3ee'); },
    angry: () => { c.hline(28, 42, 8, '#6a2a2a'); c.hline(29, 43, 6, '#3a1a1a'); },
    shocked: () => { c.ellipse(32, 42, 3, 3, '#5a2024'); },
  }[mood] || (() => {});
  m();

  c.frame(0, 0, 64, 64, '#0c0914');
  c.frame(1, 1, 62, 62, '#5a4a6e', 0.7);
  return c;
}
