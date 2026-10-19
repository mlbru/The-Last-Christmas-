import test from 'node:test';
import assert from 'node:assert/strict';
import { npcsFor, CROWD_LOOKS } from '../src/data/npcs.js';
import { LOCATION_IDS } from '../src/data/locationIds.js';
import { LOCATIONS } from '../src/data/locations.js';
import { characterSheet } from '../src/art/sprites.js';
import { renderLocation } from '../src/art/backgrounds.js';

test('npcs: every talkable character has a look, sits inside its location and can be drawn', () => {
  let count = 0;
  for (const id of LOCATION_IDS) {
    for (const n of npcsFor(id)) {
      count += 1;
      assert.ok(n.x > 0 && n.x < LOCATIONS[id].width, `${n.key} x`);
      assert.equal(characterSheet(n.look).width, 320);
    }
  }
  assert.ok(count >= 9);
  CROWD_LOOKS.forEach((l) => assert.equal(characterSheet(l).height, 48));
});

test('art: every location renders full-width layers, a glow layer and stays 270px tall', () => {
  for (const id of LOCATION_IDS) {
    const r = renderLocation(id);
    assert.equal(r.width, LOCATIONS[id].width);
    assert.ok(r.layers.some((l) => l.name === 'near') && r.layers.some((l) => l.name === 'glow'));
    for (const l of r.layers) { assert.equal(l.canvas.width, r.width, `${id}/${l.name} width`); assert.equal(l.canvas.height, 270); }
    // the near layer is opaque where it matters: the floor row is never transparent
    const near = r.layers.find((l) => l.name === 'near').canvas;
    for (let x = 0; x < near.width; x += 37) assert.equal(near.get(x, 262)[3], 255, `${id} floor at ${x}`);
  }
});
