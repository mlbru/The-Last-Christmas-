// The game controller: everything that happens between "the player pressed a key" and "the world
// changed", with no Phaser and no DOM. Scenes and DOM panels subscribe to its events and call its
// methods, so the same logic is exercised by the automated tests and by the real game.
//
// Modes: menu | explore | dialogue | puzzle | journal | board | pause | finale | credits
// Events: mode, location, dialogue, bubble, toast, puzzle, finaleCue, credits, objective, saved

import { WorldState } from './WorldState.js';
import { repairState, recompute, nextObjective, canStartFinale } from './StoryLogic.js';
import { SaveSystem, defaultStorage } from '../systems/SaveSystem.js';
import { DialogueRunner } from '../systems/DialogueSystem.js';
import { interact, nearest } from '../systems/InteractionSystem.js';
import { enterLocation } from '../systems/LocationSystem.js';
import { createSession, nextHint, hintsUnlocked } from '../systems/PuzzleSystem.js';
import { testLink } from '../systems/DeductionSystem.js';
import { PUZZLES } from '../data/puzzles.js';
import { EVIDENCE } from '../data/evidence.js';
import { START_LOCATION } from '../data/locationIds.js';
import { LOCATIONS, DEFAULT_DEPTH } from '../data/locations.js';

/** A speech bubble closes once Rowan has walked this many px away from where it appeared. */
export const BUBBLE_WALK_AWAY = 24;

export class GameController {
  constructor({ storage } = {}) {
    this.save = new SaveSystem(storage || defaultStorage());
    this.settings = this.save.loadSettings();
    this.world = null;
    this.runner = null;
    this.mode = 'menu';
    this.previousMode = 'explore';
    this.session = null;           // active puzzle session
    this.puzzleId = null;
    this.player = { x: 0, d: DEFAULT_DEPTH, facing: 'right' };
    this._bubbleX = null;                        // where Rowan stood when the current bubble appeared
    this._listeners = {};
    this._detach = null;
    this._finaleRunning = false;
    this.saveNotice = null;
  }

  // ---- events -------------------------------------------------------------------
  on(event, fn) { (this._listeners[event] ||= []).push(fn); return () => { this._listeners[event] = this._listeners[event].filter((f) => f !== fn); }; }
  emit(event, payload) { for (const fn of [...(this._listeners[event] || [])]) fn(payload, this); }

  _setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.emit('mode', mode);
  }

  toast(text, kind = 'info') { this.emit('toast', { text, kind }); }

  // ---- new / continue / quit ----------------------------------------------------------
  hasSave() { return this.save.hasSave(); }

  _adopt(world) {
    if (this._detach) this._detach();
    this.world = world;
    this.world.data.settings = { ...this.settings };
    this.runner = new DialogueRunner(world);
    this._detach = this.save.attach(world);
    this._finaleRunning = false;
    this.session = null;
    this.puzzleId = null;
    world.on('milestone', () => this.emit('objective', this.objective()));
  }

  /** Start from scratch. The old save is only replaced when the new game first saves. */
  newGame() {
    this._adopt(new WorldState());
    const info = enterLocation(this.world, START_LOCATION, 'default');
    this.player = { x: info.x, d: info.d, facing: info.facing };
    this._setMode('explore');
    this.emit('location', { id: START_LOCATION, ...this.player, restored: false });
    this.save.save(this.world);
    // The prologue is a conversation with the mayor, who is standing next to Rowan.
    this.talkTo('voss');
    return this.world;
  }

  /** Returns { status } where status is ok | recovered | none | corrupt. Never throws. */
  continueGame() {
    const res = this.save.load();
    if (!res.world) return { status: res.status };
    this._adopt(res.world);
    recompute(this.world);
    const loc = this.world.data.location && LOCATIONS[this.world.data.location] ? this.world.data.location : START_LOCATION;
    const pos = this.world.data.position;
    this.player = { x: pos.x, d: pos.y, facing: pos.facing };
    this.world.data.location = loc;
    this._setMode('explore');
    this.emit('location', { id: loc, ...this.player, restored: true });
    this.emit('objective', this.objective());
    this.saveNotice = res.status === 'recovered' ? 'The main save was damaged. The previous save was restored.' : null;
    if (this.saveNotice) this.toast(this.saveNotice, 'warn');
    return { status: res.status, notes: res.notes };
  }

  saveNow() {
    if (!this.world) return false;
    this.world.setPosition(this.world.data.location, this.player.x, this.player.d, this.player.facing);
    const ok = this.save.save(this.world);
    this.emit('saved', ok);
    if (!ok) this.toast('Could not save: browser storage is unavailable.', 'warn');
    return ok;
  }

  quitToMenu() {
    if (this.world && this.world.hasFlag('intro_complete')) this.saveNow();
    this._finaleRunning = false;
    this.runner && this.runner.abort();
    this.session = null;
    this._setMode('menu');
  }

  restartGame() { this.save.clear(); return this.newGame(); }

  updateSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    this.save.saveSettings(this.settings);
    if (this.world) this.world.data.settings = { ...this.settings };
    this.emit('settings', this.settings);
  }

  objective() { return this.world ? nextObjective(this.world) : ''; }

  /** Called by the scene each frame while exploring. */
  tick(dtMs, x, d, facing) {
    if (!this.world) return;
    this.player = { x, d, facing };
    if (this._bubbleX !== null && Math.abs(x - this._bubbleX) > BUBBLE_WALK_AWAY) {
      this._bubbleX = null;
      this.emit('bubbleEnd');
    }
    if (this.mode === 'explore') {
      this.world.addPlaytime(dtMs);
      this.world.setPosition(this.world.data.location, x, d, facing);   // so every autosave knows where Rowan is
    }
  }

  currentLocation() { return this.world ? this.world.data.location : null; }

  /** The scene reports the interaction currently in reach (or null) so the dock can show it. */
  setNearby(it) {
    const id = it ? it.id : null;
    if (this._nearbyId === id) return;
    this._nearbyId = id;
    this.emit('nearby', it);
  }

  nearestInteraction(x) { return this.world ? nearest(this.world.data.location, x) : null; }

  // ---- interaction ------------------------------------------------------------------------
  interactWith(id) {
    if (this.mode !== 'explore') return null;
    const res = interact(this.world, id);
    this._announceNewEvidence((res.newEvidence || []).map((e) => EVIDENCE[e]));
    switch (res.kind) {
      case 'say': case 'blocked':
        this._bubbleX = this.player ? this.player.x : null;
        this.emit('bubble', { lines: res.lines, interaction: res.interaction, kind: res.kind });
        break;
      case 'dialogue':
        if (res.conversation) this.talkTo(res.conversation); else this.startNode(res.node);
        break;
      case 'puzzle': this.openPuzzle(res.puzzle); break;
      case 'transition': this.goTo(res.to, res.spawn, res.introNode); break;
      case 'finale': this.startFinale(); break;
      default: break;
    }
    return res;
  }

  goTo(locationId, spawn = 'default', introNode = null) {
    const info = enterLocation(this.world, locationId, spawn);
    this.player = { x: info.x, d: info.d, facing: info.facing };
    this.emit('location', { id: locationId, ...this.player, restored: false });
    this.emit('objective', this.objective());
    const node = info.introNode || introNode;
    if (node) this.startNode(node);
    this.save.save(this.world);
  }

  _announceNewEvidence(list) {
    for (const ev of list) this.toast(`Evidence added: ${ev.name}`, 'evidence');
    if (list.length) this.emit('objective', this.objective());
  }

  // ---- dialogue -----------------------------------------------------------------------------
  talkTo(charId) { this._begin(() => this.runner.startConversation(charId)); }
  startNode(id) { this._begin(() => this.runner.startNode(id)); }

  _begin(start) {
    if (this.runner.active) this.runner.abort();
    this.previousMode = this.mode === 'finale' ? 'finale' : 'explore';
    this._setMode(this._finaleRunning ? 'finale' : 'dialogue');
    this.runner.onFinish(() => this._dialogueDone());
    this._show(start());
  }

  _show(step) {
    if (!step) return;
    this._announceNewEvidence(step.collected || []);
    if (this._finaleRunning) this.emit('finaleCue', step.nodeId);
    this.emit('dialogue', step);
  }

  dialogueAdvance() { if (!this.runner.active) return; this._show(this.runner.advance()); }
  dialogueChoose(i) { if (!this.runner.active) return; this._show(this.runner.choose(i)); }
  dialogueCancel() { if (!this.runner.active) return; this._show(this.runner.cancel()); }

  /** Present evidence. Returns the runner result so the UI can show the reply. */
  dialoguePresent(evidenceId) {
    if (!this.runner.active) return null;
    const res = this.runner.present(evidenceId);
    if (res.result === 'correct' && res.newEvidence) this._announceNewEvidence(res.newEvidence.map((e) => EVIDENCE[e]));
    if (res.result === 'correct' && res.step) this._show(res.step);
    return res;
  }

  /** Escape: leave the conversation. Not allowed during the finale, which always plays through. */
  dialogueAbort() {
    if (!this.runner.active || this._finaleRunning) return false;
    this.runner.abort();
    return true;
  }

  _dialogueDone() {
    this.emit('dialogue', null);
    if (this._finaleRunning) {
      if (this.world.hasFlag('game_completed')) {
        this._finaleRunning = false;
        this.saveNow();
        this._setMode('credits');
        this.emit('credits');
      } else {
        // finished without completing (cannot normally happen): fall back to exploring
        this._finaleRunning = false;
        this._setMode('explore');
      }
      return;
    }
    if (this.mode === 'dialogue') this._setMode('explore');
    this.emit('objective', this.objective());
  }

  // ---- finale -----------------------------------------------------------------------------------
  startFinale() {
    const gate = canStartFinale(this.world);
    if (!gate.ok) { this._bubbleX = this.player ? this.player.x : null; this.emit('bubble', { lines: [gate.missing[0]], kind: 'blocked' }); return false; }
    this._finaleRunning = true;
    this.previousMode = 'explore';
    if (this.runner.active) this.runner.abort();
    this._setMode('finale');
    this.emit('finaleCue', 'start');
    this.runner.onFinish(() => this._dialogueDone());
    this._show(this.runner.startNode('fin_start'));
    return true;
  }

  // ---- puzzles ---------------------------------------------------------------------------------------
  openPuzzle(id) {
    this.session = createSession(this.world, id);
    this.puzzleId = id;
    this._setMode('puzzle');
    this.emit('puzzle', { id, session: this.session, def: PUZZLES[id] });
  }

  /** Reveal the next hint of the open puzzle. */
  puzzleHint() {
    if (!this.puzzleId) return null;
    return nextHint(this.world, this.puzzleId);
  }
  puzzleHintsShown() { return this.puzzleId ? hintsUnlocked(this.world, this.puzzleId) : []; }

  /** The UI reports a solved result so rewards are announced and the follow-up scene plays. */
  puzzleSolved(result) {
    this._announceNewEvidence((result.newEvidence || []).map((e) => EVIDENCE[e]));
  }

  closePuzzle() {
    const id = this.puzzleId;
    const solved = id && this.world.isPuzzleSolved(id);
    this.session = null;
    this.puzzleId = null;
    this._setMode('explore');
    this.emit('puzzle', null);
    this.emit('objective', this.objective());
    const def = id && PUZZLES[id];
    if (solved && def && def.successNode && !this.world.seenNode(def.successNode)) this.startNode(def.successNode);
  }

  // ---- journal & board ------------------------------------------------------------------------------------
  openOverlay(mode) {
    if (this.mode !== 'explore') return false;
    this._setMode(mode);
    return true;
  }
  closeOverlay() {
    if (['journal', 'board', 'pause'].includes(this.mode)) { this._setMode('explore'); this.emit('objective', this.objective()); return true; }
    return false;
  }

  link(a, b) {
    const res = testLink(this.world, a, b);
    if (res.status === 'confirmed') {
      this.toast(`Conclusion: ${res.title}`, 'conclusion');
      if (res.reconstructed) this.toast('The history is reconstructed. The bell tower is open.', 'conclusion');
      this.emit('objective', this.objective());
    }
    return res;
  }
}
