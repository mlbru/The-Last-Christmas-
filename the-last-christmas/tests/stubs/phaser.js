// A permissive stand-in for Phaser, used ONLY by the scene smoke test. Every property is a chainable
// fake, so this proves the scene code executes without JavaScript errors (undefined variables,
// wrong control flow, bad data lookups). It cannot detect a misspelled Phaser API name and says
// nothing about how the scenes look. Real verification needs `npm install` and a browser.
const store = new WeakMap();
export function fake(label = 'fake') {
  const target = function () {};
  const proxy = new Proxy(target, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === 'then') return undefined;
      if (k === Symbol.iterator) return function* () {};
      const s = store.get(t) || {};
      if (k in s) return s[k];
      return fake(`${label}.${String(k)}`);
    },
    set(t, k, v) { const s = store.get(t) || {}; s[k] = v; store.set(t, s); return true; },
    apply() { return fake(`${label}()`); },
    construct() { return fake(`new ${label}`); },
  });
  return proxy;
}
class Scene {
  constructor(key) {
    this.key = key;
    for (const k of ['add', 'tweens', 'cameras', 'textures', 'anims', 'input', 'time', 'scene', 'events', 'registry', 'sys']) this[k] = fake(`${key}.${k}`);
    this.sys = { isActive: () => true, settings: { status: 5 } };
    this.registry = { _m: new Map(), get(k) { return this._m.get(k); }, set(k, v) { this._m.set(k, v); } };
    this.textures = { exists: () => false, addCanvas() {}, get() { return { add() {} }; } };
    this.time = { now: 1000 };
    this.anims = { create() {} };
    this.events = { once() {}, on() {} };
    const cam = fake('cam'); cam.once = (e, cb) => cb();   // fades finish instantly
    this.cameras = { main: cam };
    this.scene = { restart: (d) => { this.restarted = d; }, start() {}, stop() {} };
  }
}
const Phaser = { Scene, AUTO: 0, Scale: { FIT: 1, CENTER_BOTH: 2 }, BlendModes: { ADD: 1 }, Scenes: { CREATING: 4 }, Game: class {} };
export default Phaser;
