// Builds every texture from the procedural art, then hands over to the first location.
// Nothing is downloaded: sprites, portraits and backgrounds are drawn in code (src/art).

import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters.js';
import { EXTRA_LOOKS, CROWD_LOOKS } from '../data/npcs.js';
import { LOCATION_IDS } from '../data/locationIds.js';
import { characterSheet, FRAME_W, FRAME_H, FRAME_COUNT, FRAMES } from '../art/sprites.js';
import { renderLocation, renderVignette, renderGrille, renderChain, halo } from '../art/backgrounds.js';
import { PixelCanvas } from '../art/PixelCanvas.js';
import { christmasStar } from '../art/scenery.js';
import { PAL } from '../art/palette.js';

export const LAYER_DEPTH = { sky: 0, far: 1, mid: 2, near: 10, fog: 15, glow: 60 };

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    const app = this.registry.get('app');
    const t = this.textures;
    const add = (key, canvas) => { if (!t.exists(key)) t.addCanvas(key, canvas.toCanvas()); };

    // characters (sprite sheets cut into 32x48 frames) and their animations
    const looks = {};
    for (const [id, ch] of Object.entries(CHARACTERS)) looks[id] = ch.look;
    for (const [id, l] of Object.entries(EXTRA_LOOKS)) looks[id] = l;
    CROWD_LOOKS.forEach((l, i) => { looks[`crowd${i}`] = l; });
    for (const [id, look] of Object.entries(looks)) {
      const key = `char_${id}`;
      add(key, characterSheet(look));
      const tex = t.get(key);
      for (let i = 0; i < FRAME_COUNT; i++) tex.add(i, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
      const rates = { idle: 2, walk: 8, talk: 5, inspect: 3 };
      for (const [state, frames] of Object.entries(FRAMES)) {
        this.anims.create({ key: `${key}_${state}`, frames: frames.map((f) => ({ key, frame: f })), frameRate: rates[state], repeat: -1 });
      }
    }

    // backgrounds, one texture per layer
    for (const id of LOCATION_IDS) {
      const r = renderLocation(id);
      for (const l of r.layers) add(`bg_${id}_${l.name}`, l.canvas);
    }
    add('vignette', renderVignette());
    add('grille', renderGrille());
    add('chain', renderChain());

    // small shared sprites
    const px = new PixelCanvas(2, 2); px.rect(0, 0, 2, 2, '#ffffff'); add('px', px);
    const arrow = new PixelCanvas(9, 6); arrow.triangle(0, 0, 8, 0, 4, 5, PAL.amberHi); arrow.outline('#16121f'); add('arrow', arrow);
    const spark = new PixelCanvas(7, 7); spark.triangle(3, 0, 6, 3, 3, 6, PAL.amberHi); spark.triangle(3, 0, 0, 3, 3, 6, PAL.amber); spark.px(3, 3, '#ffffff'); add('spark', spark);
    const star = new PixelCanvas(56, 56); christmasStar(star, 28, 28, 22, { lit: true }); add('star_lit', star);
    const glow = new PixelCanvas(128, 128); halo(glow, 64, 64, 62, '#ffd98a', 1); add('star_glow', glow);    // round, fades to nothing at the edge

    app.onBootDone(this);
  }
}

/** A slow, snowy pan across the square behind the title screen. */
export class BackdropScene extends Phaser.Scene {
  constructor() { super('Backdrop'); }

  create() {
    const w = 1120;
    for (const [name, scroll] of [['sky', 0.05], ['far', 0.2], ['mid', 0.45], ['near', 1], ['fog', 0.7], ['glow', 1]]) {
      const img = this.add.image(0, 0, `bg_square_${name}`).setOrigin(0, 0).setScrollFactor(scroll).setDepth(LAYER_DEPTH[name]);
      if (name === 'glow') img.setBlendMode(Phaser.BlendModes.ADD);
    }
    this.add.image(0, 0, 'vignette').setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, w, 270);
    cam.scrollX = 260;
    this.tweens.add({ targets: cam, scrollX: 560, duration: 42000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.flakes = [];
    for (let i = 0; i < 70; i++) {
      const f = this.add.image(Math.random() * 480, Math.random() * 270, 'px').setScrollFactor(0).setDepth(55).setAlpha(0.3 + Math.random() * 0.5).setScale(i % 3 === 0 ? 1 : 0.5);
      f.vy = 14 + Math.random() * 26; f.vx = -6 + Math.random() * 12;
      this.flakes.push(f);
    }
    cam.fadeIn(900, 7, 10, 26);
  }

  update(t, delta) {
    for (const f of this.flakes) {
      f.y += f.vy * delta / 1000; f.x += f.vx * delta / 1000;
      if (f.y > 272) { f.y = -2; f.x = Math.random() * 480; }
    }
  }
}
