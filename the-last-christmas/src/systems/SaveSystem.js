// Automatic saving to localStorage, with validation, a backup slot and safe fallbacks.
// Runs in Node too (tests use MemoryStorage), so it never touches `window` directly.

import { WorldState, SAVE_VERSION, defaultSettings } from '../game/WorldState.js';
import { repairState } from '../game/StoryLogic.js';

export const SAVE_KEY = 'the-last-christmas:save';
export const BACKUP_KEY = 'the-last-christmas:save:previous';
export const CORRUPT_KEY = 'the-last-christmas:save:corrupt';
export const SETTINGS_KEY = 'the-last-christmas:settings';

/** A tiny in-memory stand-in for localStorage (tests, private browsing, blocked storage). */
export class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

/** localStorage if usable, otherwise memory. Accessing it can throw (blocked cookies, sandbox). */
export function defaultStorage() {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      const probe = '__tlc_probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    }
  } catch { /* fall through */ }
  return new MemoryStorage();
}

function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}

function encode(state) {
  const body = JSON.stringify(state);
  return JSON.stringify({ v: SAVE_VERSION, savedAt: Date.now(), sum: checksum(body), state: body });
}

/** Returns { world, notes } or null. Never throws. */
function decode(text) {
  try {
    if (typeof text !== 'string' || text.length === 0) return null;
    const env = JSON.parse(text);
    if (!env || env.v !== SAVE_VERSION || typeof env.state !== 'string') return null;
    if (env.sum !== checksum(env.state)) return null;
    const world = WorldState.fromSaved(JSON.parse(env.state));
    if (!world) return null;
    const notes = repairState(world);
    return { world, notes };
  } catch {
    return null;
  }
}

export class SaveSystem {
  constructor(storage = defaultStorage()) {
    this.storage = storage;
    this.lastError = null;
  }

  _get(key) { try { return this.storage.getItem(key); } catch (e) { this.lastError = e; return null; } }
  _set(key, value) { try { this.storage.setItem(key, value); return true; } catch (e) { this.lastError = e; return false; } }
  _del(key) { try { this.storage.removeItem(key); } catch (e) { this.lastError = e; } }

  /** True when a loadable save (main or backup) exists. */
  hasSave() {
    return decode(this._get(SAVE_KEY)) !== null || decode(this._get(BACKUP_KEY)) !== null;
  }

  /**
   * status: 'ok' (main slot) | 'recovered' (main was damaged, backup used) | 'none' | 'corrupt'
   * A damaged save never throws: the caller starts a fresh game when `world` is null.
   */
  load() {
    const rawMain = this._get(SAVE_KEY);
    const main = decode(rawMain);
    if (main) return { status: 'ok', world: main.world, notes: main.notes };

    const rawBackup = this._get(BACKUP_KEY);
    const backup = decode(rawBackup);
    if (rawMain !== null) this._set(CORRUPT_KEY, rawMain);   // keep the evidence for debugging
    if (backup) return { status: 'recovered', world: backup.world, notes: backup.notes };
    return { status: rawMain === null && rawBackup === null ? 'none' : 'corrupt', world: null, notes: [] };
  }

  /** Save. Keeps the previous good save as a backup. Returns false when storage refused. */
  save(world) {
    const text = encode(world.toJSON());
    const current = this._get(SAVE_KEY);
    if (current && decode(current)) this._set(BACKUP_KEY, current);
    return this._set(SAVE_KEY, text);
  }

  clear() {
    this._del(SAVE_KEY); this._del(BACKUP_KEY); this._del(CORRUPT_KEY);
  }

  /** Autosave on every story milestone (essential evidence, story flags, puzzles, relations...). */
  attach(world) {
    return world.on('milestone', () => { this.save(world); });
  }

  // ---- settings live apart from the save so the menu can use them before any game exists ----
  loadSettings() {
    try {
      const raw = this._get(SETTINGS_KEY);
      if (!raw) return defaultSettings();
      const probe = WorldState.sanitize({ version: SAVE_VERSION, settings: JSON.parse(raw) });
      return probe ? probe.settings : defaultSettings();
    } catch {
      return defaultSettings();
    }
  }

  saveSettings(settings) { return this._set(SETTINGS_KEY, JSON.stringify(settings)); }
}
