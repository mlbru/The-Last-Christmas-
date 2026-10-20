import { GameController } from '../../src/game/GameController.js';
import { MemoryStorage } from '../../src/systems/SaveSystem.js';
import { KeyState } from '../../src/game/KeyState.js';
import { BootScene, BackdropScene } from '../../src/scenes/BootScene.js';
import { LocationScene } from '../../src/scenes/LocationScene.js';
import { LOCATION_IDS } from '../../src/data/locationIds.js';
import { LOCATIONS } from '../../src/data/locations.js';
import { Bot } from '../helpers/bot.js';

globalThis.window = globalThis;
const noop = () => {};
globalThis.addEventListener = noop;
const ctrl = new GameController({ storage: new MemoryStorage() });
const bot = new Bot(); bot.playToFixpoint();
ctrl._adopt(bot.world); ctrl._setMode('explore');
const keys = { dx: 1, dd: 0, clear: noop };
const audio = { setTheme: noop, chime: noop, unlock: noop, apply: noop };
let booted = false;
const app = { ctrl, keys, audio, onBootDone() { booted = true; } };

// stub `PixelCanvas.toCanvas` (needs a DOM) so Boot can run in Node
import { PixelCanvas } from '../../src/art/PixelCanvas.js';
PixelCanvas.prototype.toCanvas = function () { return { width: this.width, height: this.height }; };

const boot = new BootScene(); boot.registry.set('app', app); boot.create();
if (!booted) throw new Error('Boot did not finish');
const back = new BackdropScene(); back.create(); back.update(0, 16);

let frames = 0;
for (const id of LOCATION_IDS) {
  const sp = LOCATIONS[id].spawns.default;
  const sc = new LocationScene(); sc.registry.set('app', app);
  ctrl.world.setPosition(id, sp.x, 15, 'right'); ctrl.world.data.location = id;
  sc.init({ id, x: sp.x, d: 15, facing: 'right' }); sc.create();
  for (let i = 0; i < 90; i++) { keys.dx = i % 40 < 20 ? 1 : -1; sc.update(i * 16, 16); frames++; }
  sc.onPointer({ worldX: sp.x + 100 }); sc.update(2000, 16);
  sc.onDialogue({ speaker: 'rowan' }); sc.onDialogue(null);
  sc.transitionTo({ id: 'square', x: 400, d: 15, facing: 'right' });
}
// Phaser's scene.restart() reuses the same instance: leaving a room must keep working after the first time
const walker = new LocationScene(); walker.registry.set('app', app);
let entry = { id: 'square', x: 400, d: 15, facing: 'right' };
for (const to of ['home', 'square', 'office', 'square']) {
  walker.init(entry); walker.create();
  walker.restarted = null;
  walker.transitionTo({ id: to, x: 100, d: 15, facing: 'right' });
  if (!walker.restarted || walker.restarted.id !== to) throw new Error(`could not leave ${entry.id} for ${to}`);
  entry = walker.restarted;
}
// finale cues on the square
const sq = new LocationScene(); sq.registry.set('app', app);
ctrl.world.data.location = 'square';
sq.init({ id: 'square', x: 440, d: 15, facing: 'right' }); sq.create();
for (const cue of ['start', 'fin_p1_ok', 'fin_thomas', 'fin_w_all', 'fin_star', 'fin_home']) { sq.onCue(cue); sq.update(3000, 16); }
if (!sq.restarted || sq.restarted.cutscene !== 'epilogue') throw new Error('the epilogue cut did not run');
const ep = new LocationScene(); ep.registry.set('app', app);
ep.init(sq.restarted); ep.create(); ep.update(4000, 16);
console.log(`scene smoke OK: ${LOCATION_IDS.length} locations, ${frames} frames, finale cues, epilogue`);
