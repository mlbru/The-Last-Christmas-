// Side-view movement with a shallow depth lane, collisions and gentle auto-sidestep.
// Pure functions with no engine dependency: the Phaser scenes only feed in input and apply
// the returned position, and tests can walk Rowan around headlessly.

import { LOCATIONS, DEPTH_MAX, DEFAULT_DEPTH } from '../data/locations.js';
import { check } from '../systems/Conditions.js';

export const SPEED = 84;            // px per second
export const DEPTH_SPEED = 48;
export const PLAYER_HALF_W = 7;
export const PLAYER_DEPTH = 3;
export const EDGE_MARGIN = 24;
export const MAX_DT = 0.05;         // never simulate a huge jump after a tab was in the background

/** Solids that are currently closed (gates open once their condition holds). */
export function activeSolids(world, locationId) {
  const loc = LOCATIONS[locationId];
  if (!loc) throw new Error(`Unknown location: ${locationId}`);
  return loc.solids.filter((s) => !s.openWhen || !check(world, s.openWhen));
}

const overlapsX = (x, s) => Math.abs(x - s.x) < s.w / 2 + PLAYER_HALF_W;
const overlapsD = (d, s) => d < s.d1 && d + PLAYER_DEPTH > s.d0;
export const collides = (x, d, solids) => solids.some((s) => overlapsX(x, s) && overlapsD(d, s));

export function createPlayerState(locationId, spawn = 'default') {
  const loc = LOCATIONS[locationId];
  const sp = loc.spawns[spawn] || loc.spawns.default;
  return { x: sp.x, d: DEFAULT_DEPTH, facing: sp.facing || 'right', moving: false };
}

/** Put a restored or spawned position into a legal place: inside the bounds and out of solids. */
export function legalise(state, world, locationId) {
  const loc = LOCATIONS[locationId];
  const solids = activeSolids(world, locationId);
  let { x, d } = state;
  x = Math.min(loc.width - EDGE_MARGIN, Math.max(EDGE_MARGIN, Number.isFinite(x) ? x : EDGE_MARGIN));
  d = Math.min(DEPTH_MAX, Math.max(0, Number.isFinite(d) ? d : DEFAULT_DEPTH));
  if (collides(x, d, solids)) {
    const s = solids.find((o) => overlapsX(x, o) && overlapsD(d, o));
    if (s.d1 <= DEPTH_MAX) d = Math.min(DEPTH_MAX, s.d1);          // step to the free lane
    if (collides(x, d, solids)) x = x < s.x ? s.x - s.w / 2 - PLAYER_HALF_W : s.x + s.w / 2 + PLAYER_HALF_W;
    x = Math.min(loc.width - EDGE_MARGIN, Math.max(EDGE_MARGIN, x));
  }
  return { ...state, x, d };
}

/**
 * Advance one frame. input: { dx: -1|0|1, dd: -1|0|1 }.
 * Sideways blocked by a low obstacle? Rowan sidesteps into the free lane on his own, so keyboard
 * players only need A/D.
 */
export function step(state, input, dtSeconds, world, locationId) {
  const loc = LOCATIONS[locationId];
  const solids = activeSolids(world, locationId);
  const dt = Math.min(Math.max(dtSeconds, 0), MAX_DT);
  let { x, d, facing } = state;
  const dx = Math.sign(input.dx || 0);
  const dd = Math.sign(input.dd || 0);
  let moved = false;

  if (dd !== 0) {
    const nd = Math.min(DEPTH_MAX, Math.max(0, d + dd * DEPTH_SPEED * dt));
    if (!collides(x, nd, solids)) { if (nd !== d) moved = true; d = nd; }
  }

  if (dx !== 0) {
    facing = dx > 0 ? 'right' : 'left';
    const target = Math.min(loc.width - EDGE_MARGIN, Math.max(EDGE_MARGIN, x + dx * SPEED * dt));
    if (!collides(target, d, solids)) {
      if (target !== x) moved = true;
      x = target;
    } else {
      // Find the blocker, stop at its edge, and slide round it if it is a low obstacle.
      const s = solids.find((o) => overlapsX(target, o) && overlapsD(d, o));
      const edge = dx > 0 ? s.x - s.w / 2 - PLAYER_HALF_W : s.x + s.w / 2 + PLAYER_HALF_W;
      if ((dx > 0 && edge > x) || (dx < 0 && edge < x)) { x = edge; moved = true; }
      if (s.d1 <= DEPTH_MAX) {
        const nd = Math.min(DEPTH_MAX, d + DEPTH_SPEED * 1.3 * dt);
        if (!collides(x, nd, solids)) { d = nd; moved = true; }
      }
    }
  }
  return { x, d, facing, moving: moved };
}

/** Headless helper: walk towards a target x. Returns the reached state and whether it got there. */
export function walkTo(state, targetX, world, locationId, { maxSeconds = 60, tolerance = 2 } = {}) {
  let s = { ...state };
  const dt = 1 / 60;
  for (let t = 0; t < maxSeconds; t += dt) {
    const dist = targetX - s.x;
    if (Math.abs(dist) <= tolerance) return { state: s, reached: true };
    const next = step(s, { dx: Math.sign(dist), dd: 0 }, dt, world, locationId);
    // If we can sidestep we keep going; if absolutely nothing changed we are wedged.
    if (!next.moving && next.x === s.x && next.d === s.d) return { state: s, reached: false };
    s = next;
  }
  return { state: s, reached: Math.abs(targetX - s.x) <= tolerance };
}
