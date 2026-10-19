// Browser harness for the HTML interface and controller WITHOUT Phaser: a plain canvas draws the
// real generated backgrounds and sprites, and the same movement/interaction functions drive Rowan.
// It exists so the DOM UI can be exercised in a real browser while Phaser cannot be installed here.
import { createApp } from '../src/app.js';
import { renderLocation } from '../src/art/backgrounds.js';
import { characterFrame } from '../src/art/sprites.js';
import { CHARACTERS } from '../src/data/characters.js';
import { npcsFor } from '../src/data/npcs.js';
import { step } from '../src/game/Movement.js';
import { GROUND_Y } from '../src/data/locations.js';
import { nearest } from '../src/systems/InteractionSystem.js';

const cv = document.getElementById('cv'), g = cv.getContext('2d');
g.imageSmoothingEnabled = false;
const cache = new Map();
let cur = null, state = null, cam = 0, last = performance.now();

const renderer = {
  goTo(p) { cur = { id: p.id, r: renderLocation(p.id).layers.map((l) => ({ ...l, cv: l.canvas.toCanvas() })) }; state = { x: p.x, d: p.d, facing: p.facing, moving: false }; },
  backdrop() { cur = null; },
  anchor() { if (!cur || !state) return null; const r = cv.getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect(); const k = r.width / 480; return { x: r.left - s.left + (state.x - cam) * k, y: r.top - s.top + (GROUND_Y + state.d - 56) * k }; },
};
const app = createApp({ renderer });
window.__app = app;
const sprite = (look) => { const k = JSON.stringify(look); if (!cache.has(k)) cache.set(k, characterFrame(look, 'idle', 0).toCanvas()); return cache.get(k); };

function frame(now) {
  const dt = (now - last) / 1000; last = now;
  const c = app.ctrl;
  g.fillStyle = '#070a1a'; g.fillRect(0, 0, 480, 270);
  if (cur && c.world) {
    if (c.mode === 'explore') {
      state = step(state, { dx: app.keys.dx, dd: app.keys.dd }, dt, c.world, cur.id);
      c.tick(dt * 1000, state.x, state.d, state.facing);
      c.setNearby(nearest(cur.id, state.x));
    }
    const w = cur.r[0].cv.width;
    cam = Math.max(0, Math.min(w - 480, state.x - 240));
    for (const l of cur.r) { g.globalCompositeOperation = l.blend === 'add' ? 'lighter' : 'source-over'; const sx = Math.round(cam * l.scroll); g.drawImage(l.cv, sx, 0, 480, 270, 0, 0, 480, 270); }
    g.globalCompositeOperation = 'source-over';
    for (const n of npcsFor(cur.id)) g.drawImage(sprite(n.look), Math.round(n.x - cam - 16), GROUND_Y + 12 - 46);
    const f = sprite(CHARACTERS.rowan.look);
    g.save(); if (state.facing === 'left') { g.translate(Math.round(state.x - cam) + 16, 0); g.scale(-1, 1); g.drawImage(f, 0, GROUND_Y + state.d - 46); } else g.drawImage(f, Math.round(state.x - cam - 16), GROUND_Y + state.d - 46); g.restore();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
app.start();
