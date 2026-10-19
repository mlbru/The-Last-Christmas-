import test from 'node:test';
import assert from 'node:assert/strict';

import { LOCATIONS, DEPTH_MAX, DEFAULT_DEPTH } from '../src/data/locations.js';
import { INTERACTIONS } from '../src/data/interactions.js';
import { WorldState } from '../src/game/WorldState.js';
import {
  step, walkTo, legalise, createPlayerState, activeSolids, collides,
  EDGE_MARGIN, PLAYER_HALF_W, MAX_DT, SPEED,
} from '../src/game/Movement.js';
import { INTERACT_RANGE } from '../src/systems/InteractionSystem.js';

const fresh = () => new WorldState();

function run(state, input, seconds, world, loc) {
  let s = state;
  for (let t = 0; t < seconds; t += 1 / 60) s = step(s, input, 1 / 60, world, loc);
  return s;
}

test('movement: Rowan cannot leave the location (left and right walls)', () => {
  const w = fresh();
  for (const loc of Object.values(LOCATIONS)) {
    let s = createPlayerState(loc.id);
    s = run(s, { dx: -1 }, 30, w, loc.id);
    assert.ok(s.x >= EDGE_MARGIN - 1e-9, `${loc.id} left wall`);
    assert.equal(s.facing, 'left');
    s = run(s, { dx: 1 }, 60, w, loc.id);
    assert.ok(s.x <= loc.width - EDGE_MARGIN + 1e-9, `${loc.id} right wall`);
  }
});

test('movement: depth stays inside the lane', () => {
  const w = fresh();
  let s = createPlayerState('square');
  s = run(s, { dd: -1 }, 5, w, 'square');
  assert.ok(s.d >= 0);
  s = run(s, { dd: 1 }, 5, w, 'square');
  assert.ok(s.d <= DEPTH_MAX);
});

test('movement: a closed gate really blocks, and it opens once the condition is met', () => {
  const w = fresh();
  const grille = LOCATIONS.archive.solids.find((s) => s.id === 'archive_grille');
  let s = { x: 400, d: DEFAULT_DEPTH, facing: 'right', moving: false };
  s = run(s, { dx: 1 }, 20, w, 'archive');
  const stopX = grille.x - grille.w / 2 - PLAYER_HALF_W;
  assert.ok(Math.abs(s.x - stopX) < 0.01, `stopped at ${s.x}, expected ${stopX}`);
  // Even sliding depth does not help against a full-depth wall.
  s = run(s, { dx: 1, dd: 1 }, 5, w, 'archive');
  assert.ok(s.x <= stopX + 0.01);
  w.markNodeSeen('nora_intro_end');
  assert.equal(activeSolids(w, 'archive').some((x) => x.id === 'archive_grille'), false);
  s = run(s, { dx: 1 }, 20, w, 'archive');
  assert.ok(s.x > grille.x + 20, 'passes through the open gate');
});

test('movement: low obstacles are walked around automatically with only left/right input', () => {
  const w = fresh();
  for (const [loc, from, to] of [['square', 440, 760], ['inn', 150, 600], ['office', 150, 520], ['bakery', 150, 560], ['police', 100, 520], ['archive', 100, 590], ['tower', 100, 520], ['home', 100, 520]]) {
    const start = { ...createPlayerState(loc), x: from };
    const res = walkTo(start, to, w, loc);
    assert.equal(res.reached, true, `${loc}: ${from} -> ${to} stuck at ${res.state.x.toFixed(1)}`);
    const back = walkTo(res.state, from, w, loc);
    assert.equal(back.reached, true, `${loc}: return ${to} -> ${from}`);
  }
});

test('movement: solid objects are never entered', () => {
  const w = fresh();
  for (const loc of Object.values(LOCATIONS)) {
    const solids = activeSolids(w, loc.id);
    let s = createPlayerState(loc.id);
    for (let i = 0; i < 1500; i++) {
      const dir = Math.sin(i / 40) > 0 ? 1 : -1;
      s = step(s, { dx: dir, dd: i % 90 < 30 ? -1 : 0 }, 1 / 60, w, loc.id);
      assert.equal(collides(s.x, s.d, solids), false, `${loc.id} entered a solid at x=${s.x.toFixed(1)} d=${s.d.toFixed(1)}`);
    }
  }
});

test('movement: a huge frame time cannot teleport Rowan through a wall', () => {
  const w = fresh();
  const s = step({ x: 300, d: DEFAULT_DEPTH, facing: 'right' }, { dx: 1 }, 5, w, 'archive');
  assert.ok(s.x - 300 <= SPEED * MAX_DT + 1e-6);
});

test('movement: restoring a bad saved position yields a legal one', () => {
  const w = fresh();
  const cases = [
    { x: NaN, d: NaN }, { x: -500, d: -4 }, { x: 99999, d: 99 },
    { x: 560, d: 3 },                                         // inside the fountain
    { x: 608, d: 5 },                                         // inside the closed grille
  ];
  for (const c of cases) {
    const loc = c.x === 608 ? 'archive' : 'square';
    const s = legalise({ ...c, facing: 'right' }, w, loc);
    assert.ok(Number.isFinite(s.x) && Number.isFinite(s.d));
    assert.ok(s.x >= EDGE_MARGIN && s.x <= LOCATIONS[loc].width - EDGE_MARGIN);
    assert.equal(collides(s.x, s.d, activeSolids(w, loc)), false, JSON.stringify(c));
  }
});

test('movement: spawn points are legal in every location', () => {
  const w = fresh();
  for (const loc of Object.values(LOCATIONS)) {
    for (const name of Object.keys(loc.spawns)) {
      const s = createPlayerState(loc.id, name);
      assert.equal(collides(s.x, s.d, activeSolids(w, loc.id)), false, `${loc.id}/${name}`);
      assert.ok(s.x >= EDGE_MARGIN && s.x <= loc.width - EDGE_MARGIN, `${loc.id}/${name} in bounds`);
    }
  }
});

test('reachability: every interaction can be reached on foot; gated ones sit behind the gate they depend on', () => {
  for (const it of INTERACTIONS) {
    const loc = LOCATIONS[it.location];
    const closed = fresh();
    const open = fresh();
    open.markNodeSeen('nora_intro_end');
    const start = createPlayerState(it.location);
    const reachClosed = walkTo(start, it.x, closed, it.location, { tolerance: INTERACT_RANGE - 2 }).reached;
    const reachOpen = walkTo(start, it.x, open, it.location, { tolerance: INTERACT_RANGE - 2 }).reached;
    assert.equal(reachOpen, true, `${it.id} (x=${it.x}) unreachable even with every gate open`);
    assert.ok(it.x >= EDGE_MARGIN && it.x <= loc.width - EDGE_MARGIN, `${it.id} x inside location`);
    if (!reachClosed) {
      const reqs = it.requires ? (Array.isArray(it.requires) ? it.requires : [it.requires]) : [];
      const gated = reqs.some((r) => JSON.stringify(r.when).includes('nora_intro_end'));
      assert.ok(gated, `${it.id} is blocked by the grille but is not gated on the same condition`);
    }
  }
});

test('reachability: Nora can be spoken to from the near side of her closed grille (the gate cannot lock the game)', () => {
  const nora = INTERACTIONS.find((i) => i.id === 'ar_nora');
  const w = fresh();
  const res = walkTo(createPlayerState('archive'), nora.x, w, 'archive', { tolerance: INTERACT_RANGE - 4 });
  assert.equal(res.reached, true);
  assert.ok(Math.abs(nora.x - res.state.x) <= INTERACT_RANGE);
});
