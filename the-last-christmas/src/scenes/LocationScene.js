// One scene draws every location (street, interiors, church, tower), moves Rowan, places the
// townspeople and plays the finale's visual cues. Story logic lives in GameController.

import Phaser from 'phaser';
import { LOCATIONS, GROUND_Y } from '../data/locations.js';
import { step, legalise, activeSolids } from '../game/Movement.js';
import { nearest, isUsable } from '../systems/InteractionSystem.js';
import { interactionsIn } from '../systems/InteractionSystem.js';
import { npcsFor, CROWD_LOOKS } from '../data/npcs.js';
import { LAYER_DEPTH } from './BootScene.js';
import { towerUnlocked } from '../game/StoryLogic.js';

const VIEW_W = 480, VIEW_H = 270;
const SNOW_COUNT = 70;

export class LocationScene extends Phaser.Scene {
  constructor() { super('Location'); }

  init(data) { this.entry = data; }

  create() {
    const app = this.app = this.registry.get('app');
    const c = this.ctrl = app.ctrl;
    const entry = this.entry;
    const id = this.locId = entry.id;
    const loc = this.loc = LOCATIONS[id];
    this.cutscene = entry.cutscene || null;
    this.target = null; this.pendingInteract = null; this.actors = {}; this.markers = []; this.inspectUntil = 0;

    // ---- layers --------------------------------------------------------------------------------
    for (const name of ['sky', 'far', 'mid', 'near', 'fog', 'glow']) {
      const key = `bg_${id}_${name}`;
      if (!this.textures.exists(key)) continue;
      const scroll = { sky: 0.05, far: 0.2, mid: 0.45, near: 1, fog: id === 'square' ? 0.7 : 1, glow: 1 }[name];
      const img = this.add.image(0, 0, key).setOrigin(0, 0).setScrollFactor(scroll).setDepth(LAYER_DEPTH[name]);
      if (name === 'glow') { img.setBlendMode(Phaser.BlendModes.ADD); this.glow = img; }
    }
    if (this.cutscene !== 'epilogue') this.addDynamicProps();

    // ---- camera ---------------------------------------------------------------------------------
    const cam = this.cameras.main;
    cam.setBounds(0, 0, loc.width, VIEW_H);
    cam.setRoundPixels(true);

    // ---- player ---------------------------------------------------------------------------------
    this.state = legalise({ x: entry.x, d: entry.d, facing: entry.facing, moving: false }, c.world, id);
    this.player = this.makeActor('rowan', this.state.x, this.state.d, entry.facing === 'left');
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.centerOn(this.player.x, VIEW_H / 2);

    // ---- people -----------------------------------------------------------------------------------
    if (this.cutscene === 'epilogue') {
      this.actors.ruth = this.makeActor('ruth', this.state.x + 78, 12, true);
      this.state = { ...this.state, facing: 'left' };
      this.player.setFlipX(true);
    } else {
      for (const n of npcsFor(id)) {
        const sprite = this.makeActor(n.characterId || n.interactionId, n.x, 12, n.x > this.state.x, n.scale);
        this.actors[n.interactionId] = sprite;
        sprite.npc = n;
      }
      if (c._finaleRunning && id === 'square') this.restoreFinaleScene();
    }

    // ---- UI-facing overlays ----------------------------------------------------------------------------
    this.snow = [];
    if (loc.kind === 'street' || id === 'tower') this.makeSnow(id === 'tower' ? 26 : SNOW_COUNT);
    this.add.image(0, 0, 'vignette').setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    this.arrow = this.add.image(0, 0, 'arrow').setDepth(70).setVisible(false);
    this.makeMarkers();

    // ---- events ------------------------------------------------------------------------------------------
    this.offs = [
      c.on('dialogue', (s) => this.onDialogue(s)),
      c.on('bubble', () => { this.inspectUntil = this.time.now + 900; }),
      c.on('finaleCue', (cue) => this.onCue(cue)),
      c.on('objective', () => this.refreshProps()),
      c.on('mode', (m) => { if (m === 'explore') this.refreshProps(); }),
    ];
    this.events.once('shutdown', () => { this.offs.forEach((off) => off()); });

    this.input.on('pointerdown', (p) => this.onPointer(p));
    cam.fadeIn(260, 7, 10, 26);
    app.audio.setTheme(this.cutscene === 'epilogue' ? 'home' : (c._finaleRunning ? 'finale' : loc.music));
    this.refreshProps();
  }

  get actorList() { return Object.values(this.actors); }

  // ---- building blocks ----------------------------------------------------------------------------------
  makeActor(charKey, x, d, flip = false, scale = 1) {
    const s = this.add.sprite(x, GROUND_Y + d, `char_${charKey}`, 0).setOrigin(0.5, 0.96).setScale(scale);
    s.setFlipX(flip).setDepth(20 + d / 100);
    s.charKey = charKey; s.play(`char_${charKey}_idle`);
    return s;
  }

  setAnim(sprite, state) {
    const key = `char_${sprite.charKey}_${state}`;
    if (sprite.anims.currentAnim && sprite.anims.currentAnim.key === key) return;
    sprite.play(key);
  }

  addDynamicProps() {
    this.grille = null; this.chain = null;
    if (this.locId === 'archive') {
      this.grille = this.add.image(614, 56, 'grille').setOrigin(0.5, 0).setDepth(30);
      this.chain = this.add.image(1004, GROUND_Y - 100, 'chain').setOrigin(0.5, 0).setDepth(30);
    }
    if (this.locId === 'square') {
      this.litStar = this.add.image(585, 166, 'star_lit').setDepth(16).setVisible(false);
      this.litGlow = this.add.image(585, 166, 'px').setDepth(61).setVisible(false);
      this.litGlow.setDisplaySize(120, 120).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.12).setTint(0xffd98a);
    }
  }

  refreshProps() {
    if (!this.ctrl.world || !this.sys.isActive()) return;
    const w = this.ctrl.world;
    if (this.grille) this.grille.setVisible(!w.seenNode('nora_intro_end'));
    if (this.chain) this.chain.setVisible(!towerUnlocked(w));
    if (this.litStar && w.hasFlag('game_completed')) this.lightStar(false);
    this.makeMarkers();
  }

  lightStar(animate = true) {
    if (!this.litStar) return;
    this.litStar.setVisible(true).setAlpha(animate ? 0 : 1);
    this.litGlow.setVisible(true);
    if (animate) this.tweens.add({ targets: this.litStar, alpha: 1, duration: 1400 });
    this.tweens.add({ targets: this.litGlow, alpha: { from: 0.1, to: 0.22 }, yoyo: true, repeat: -1, duration: 1600 });
  }

  makeMarkers() {
    this.markers.forEach((m) => m.destroy());
    this.markers = [];
    if (this.cutscene) return;
    const w = this.ctrl.world;
    for (const it of interactionsIn(this.locId)) {
      if (it.type === 'talk' || it.type === 'transition') continue;
      if (w.interactionCount(it.id) > 0 || !isUsable(w, it)) continue;
      const m = this.add.image(it.x, GROUND_Y - 56, 'spark').setDepth(65);
      this.tweens.add({ targets: m, y: m.y - 4, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
      this.markers.push(m);
    }
  }

  makeSnow(count) {
    const on = this.ctrl.settings.snow;
    for (let i = 0; i < count; i++) {
      const f = this.add.image(Math.random() * VIEW_W, Math.random() * VIEW_H, 'px').setScrollFactor(0).setDepth(55 + (i % 2) * 10).setAlpha(0.4 + Math.random() * 0.5);
      const sz = i % 3 === 0 ? 1 : 0.5; f.setScale(sz);
      f.vy = 14 + Math.random() * 26; f.vx = -6 + Math.random() * 12; f.ph = Math.random() * 6;
      f.setVisible(on);
      this.snow.push(f);
    }
  }

  // ---- pointer -----------------------------------------------------------------------------------------------------
  onPointer(p) {
    const c = this.ctrl;
    if (c.mode !== 'explore' || this.cutscene) return;
    const wx = p.worldX;
    const it = nearest(this.locId, wx, 22);
    this.target = it ? it.x : wx;
    this.pendingInteract = it ? it.id : null;
  }

  // ---- dialogue visuals ----------------------------------------------------------------------------------------------
  onDialogue(step) {
    for (const a of this.actorList) { if (a.npc) this.setAnim(a, 'idle'); }
    if (!step) return;
    const speaker = step.speaker;
    const a = this.actorList.find((s) => s.npc && (s.npc.characterId === speaker));
    if (a) { this.setAnim(a, 'talk'); a.setFlipX(a.x > this.player.x); }
    else if (speaker === 'rowan') this.setAnim(this.player, 'talk');
    if (speaker !== 'rowan') this.setAnim(this.player, 'idle');
  }

  // ---- finale ------------------------------------------------------------------------------------------------------------------
  restoreFinaleScene() { /* the scene is only recreated by a location change, which ends the finale */ }

  onCue(cue) {
    if (!this.sys.isActive()) return;
    const cam = this.cameras.main;
    if (this.locId === 'square' && !this.cutscene) {
      if (cue === 'start') this.finaleStart();
      else if (cue === 'fin_p1_ok') cam.flash(300, 255, 236, 190);
      else if (cue === 'fin_p3_c') cam.shake(260, 0.002);
      else if (cue === 'fin_thomas') this.thomasArrives();
      else if (cue === 'fin_w_all' || cue === 'fin_w_some') this.witnessesStep(cue === 'fin_w_all');
      else if (cue === 'fin_star') { cam.flash(500, 255, 220, 150); this.lightStar(true); }
      else if (cue === 'fin_home') {
        cam.fadeOut(900, 7, 10, 26);
        cam.once('camerafadeoutcomplete', () => { this.scene.restart({ id: 'home', x: 240, d: 12, facing: 'left', cutscene: 'epilogue' }); });
      }
    }
  }

  walkActor(sprite, x, d, ms, then) {
    this.setAnim(sprite, 'walk'); sprite.setFlipX(x < sprite.x);
    this.tweens.add({ targets: sprite, x, duration: ms, ease: 'Linear', onComplete: () => { this.setAnim(sprite, 'idle'); if (then) then(); } });
    void d;
  }

  finaleStart() {
    this.target = null; this.finale = true;
    this.crowd = [];
    CROWD_LOOKS.forEach((_, i) => {
      for (let k = 0; k < 3; k++) {
        const x = 440 + (i * 3 + k) * 22 + (k % 2) * 6, d = 4 + ((i + k * 2) % 5) * 3;
        const s = this.makeActor(`crowd${i}`, x, d, true);
        s.setTint(0xb8c0e0); this.crowd.push(s);
      }
    });
    const rowanX = 660;
    this.walkActor(this.player, rowanX, 10, Math.max(400, Math.abs(rowanX - this.player.x) * 12), () => this.player.setFlipX(false));
    this.state = { ...this.state, x: rowanX, d: 10 };
    const voss = this.actors.sq_voss;
    if (voss) this.walkActor(voss, 705, 10, 800, () => voss.setFlipX(true));
  }

  thomasArrives() {
    if (this.actors.thomas) return;
    const t = this.makeActor('thomas', this.player.x + 280, 10, true);
    this.actors.thomas = t;
    this.walkActor(t, this.player.x + 56, 10, 2600, () => t.setFlipX(true));
  }

  witnessesStep(all) {
    const w = this.ctrl.world;
    const who = [['nora', 'nora_confronted'], ['margot', 'margot_confronted'], ['eddie', 'eddie_confronted'], ['silas', 'silas_confronted']]
      .filter(([, f]) => all || w.hasFlag(f));
    who.forEach(([id], i) => {
      if (this.actors[`wit_${id}`]) return;
      const s = this.makeActor(id, this.player.x - 90 - i * 30, 14 + (i % 2) * 3, false);
      this.actors[`wit_${id}`] = s;
      this.walkActor(s, this.player.x - 36 - i * 24, 14, 1600 + i * 300, () => s.setFlipX(false));
    });
  }

  // ---- transitions ---------------------------------------------------------------------------------------------------------------
  transitionTo(p) {
    const cam = this.cameras.main;
    if (this._leaving) return;
    this._leaving = true;
    cam.fadeOut(200, 7, 10, 26);
    cam.once('camerafadeoutcomplete', () => this.scene.restart(p));
  }

  // ---- frame update -------------------------------------------------------------------------------------------------------------------
  update(time, delta) {
    const c = this.ctrl;
    if (!c.world) return;
    const dt = delta / 1000;

    // snow
    for (const f of this.snow) {
      f.y += f.vy * dt; f.x += (f.vx + Math.sin(time / 900 + f.ph) * 6) * dt;
      if (f.y > VIEW_H + 2) { f.y = -2; f.x = Math.random() * VIEW_W; }
      if (f.x < -2) f.x = VIEW_W + 1; else if (f.x > VIEW_W + 2) f.x = -1;
    }
    // warm light breathes
    if (this.glow) this.glow.setAlpha(0.9 + Math.sin(time / 330) * 0.05 + Math.sin(time / 97) * 0.03);

    if (this.cutscene) { this.syncSprite(); this.animateIdle(); this.arrow.setVisible(false); return; }

    let moved = false;
    if (c.mode === 'explore') {
      let dx = this.app.keys.dx;
      const dd = this.app.keys.dd;
      if (dx !== 0 || dd !== 0) { this.target = null; this.pendingInteract = null; }
      if (this.target !== null) {
        const dist = this.target - this.state.x;
        if (Math.abs(dist) <= 3) {
          const pending = this.pendingInteract;
          this.target = null; this.pendingInteract = null;
          if (pending) c.interactWith(pending);
        } else dx = Math.sign(dist);
      }
      const before = this.state.x;
      const next = step(this.state, { dx, dd }, dt, c.world, this.locId);
      if (this.target !== null && !next.moving) { this.target = null; this.pendingInteract = null; }
      this.state = next;
      moved = next.moving && (next.x !== before || dd !== 0);
    }
    this.syncSprite();
    if (moved) this.setAnim(this.player, 'walk');
    else if (c.mode === 'explore' && this.time.now < this.inspectUntil) this.setAnim(this.player, 'inspect');
    else if (!(c.mode === 'dialogue' && c.runner.step && c.runner.step.speaker === 'rowan')) this.setAnim(this.player, 'idle');
    this.faceNpcInConversation();

    // reach and prompt
    c.tick(delta, this.state.x, this.state.d, this.state.facing);
    const near = c.mode === 'explore' ? nearest(this.locId, this.state.x) : null;
    c.setNearby(near);
    if (near) {
      const npc = this.actors[near.id];
      const top = npc ? npc.y - 58 * npc.scaleY : GROUND_Y - 66;
      this.arrow.setVisible(true).setPosition(near.x, top + Math.sin(time / 220) * 2);
    } else this.arrow.setVisible(false);
  }

  syncSprite() {
    if (this.cutscene) { this.player.setDepth(20 + (this.state.d || 10) / 100); return; }
    this.player.x = this.state.x;
    this.player.y = GROUND_Y + this.state.d;
    this.player.setFlipX(this.state.facing === 'left');
    this.player.setDepth(20 + this.state.d / 100);
  }

  animateIdle() { /* sprites keep playing their own idle loops during cutscenes */ }

  faceNpcInConversation() {
    const c = this.ctrl;
    if (!(c.mode === 'dialogue' && c.runner.step)) return;
    const a = this.actorList.find((s) => s.npc && s.npc.characterId === c.runner.step.speaker);
    if (a) this.state = { ...this.state, facing: a.x < this.state.x ? 'left' : 'right' };
  }
}
