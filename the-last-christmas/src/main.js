// Entry point: creates the Phaser game and the HTML interface around it.
import Phaser from 'phaser';
import './styles/ui.css';
import { createApp } from './app.js';
import { BootScene, BackdropScene } from './scenes/BootScene.js';
import { LocationScene } from './scenes/LocationScene.js';

let game = null;
let started = false;

const renderer = {
  goTo(entry) {
    if (!game) return;
    game.scene.stop('Backdrop');
    const sc = game.scene.getScene('Location');
    if (game.scene.isActive('Location')) sc.transitionTo(entry);
    else game.scene.start('Location', entry);
  },
  backdrop() {
    if (!game || !game.scene.getScene('Backdrop')) return;
    game.scene.stop('Location');
    if (!game.scene.isActive('Backdrop')) game.scene.start('Backdrop');
  },
  anchor() {
    const sc = game && game.scene.getScene('Location');
    if (!sc || !sc.player || !game.scene.isActive('Location')) return null;
    const cv = game.canvas, stage = document.getElementById('stage');
    const r = cv.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const k = r.width / 480;
    const cam = sc.cameras.main;
    return { x: r.left - s.left + (sc.player.x - cam.scrollX) * k, y: r.top - s.top + (sc.player.y - 52 - cam.scrollY) * k };
  },
};

const app = createApp({ renderer });
const registry = {
  ...app,
  onBootDone: (boot) => {
    boot.scene.stop();
    if (!started) { started = true; app.start(); }
  },
};

game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 480,
  height: 270,
  backgroundColor: '#070a1a',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, BackdropScene, LocationScene],
  callbacks: { preBoot: (g) => { g.registry.set('app', registry); } },
});

// useful for debugging and for the manual test checklist
window.__tlc = { game, ...app };
