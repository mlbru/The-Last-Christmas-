// Renders PNG previews of the generated art so it can be inspected without a browser.
//   node tools/render-previews.mjs <output-dir> [characters|portraits|backgrounds|all]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PixelCanvas } from '../src/art/PixelCanvas.js';
import { CHARACTERS } from '../src/data/characters.js';
import { characterSheet, FRAME_W, FRAME_H, FRAME_COUNT } from '../src/art/sprites.js';
import { portrait, MOODS } from '../src/art/portraits.js';

const out = process.argv[2] || './previews';
const what = process.argv[3] || 'all';
mkdirSync(out, { recursive: true });
const save = async (name, canvas, scale = 1) => {
  const c = scale > 1 ? canvas.scaled(scale) : canvas;
  writeFileSync(join(out, name), await c.toPNG());
  console.log('wrote', join(out, name), `${c.width}x${c.height}`);
};

const ids = Object.keys(CHARACTERS);

if (what === 'all' || what === 'characters') {
  const sheet = new PixelCanvas(FRAME_W * FRAME_COUNT, FRAME_H * ids.length);
  sheet.rect(0, 0, sheet.width, sheet.height, '#3a4a6e');
  ids.forEach((id, row) => sheet.blit(characterSheet(CHARACTERS[id].look), 0, row * FRAME_H));
  await save('characters.png', sheet, 3);
}

if (what === 'all' || what === 'portraits') {
  const sheet = new PixelCanvas(64 * MOODS.length, 64 * ids.length);
  ids.forEach((id, row) => MOODS.forEach((m, col) => sheet.blit(portrait(CHARACTERS[id].look, m), col * 64, row * 64)));
  await save('portraits.png', sheet, 2);
}

if (what === 'all' || what === 'backgrounds') {
  const { LOCATIONS } = await import('../src/data/locations.js');
  const { renderLocation } = await import('../src/art/backgrounds.js');
  for (const id of Object.keys(LOCATIONS)) {
    const r = renderLocation(id);
    const composite = new PixelCanvas(r.width, 270);
    for (const layer of r.layers) composite.blit(layer.canvas, 0, 0);
    await save(`bg_${id}.png`, composite, 1);
  }
}
