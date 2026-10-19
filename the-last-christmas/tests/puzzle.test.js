import test from 'node:test';
import assert from 'node:assert/strict';

import { PUZZLES, PUZZLE_IDS } from '../src/data/puzzles.js';
import { WorldState } from '../src/game/WorldState.js';
import { collect } from '../src/systems/EvidenceSystem.js';
import { canStart, createSession, nextHint, hintsUnlocked, openPuzzles, complete } from '../src/systems/PuzzleSystem.js';

const fresh = () => new WorldState();

function ready(w, id) {
  const req = PUZZLES[id].requires;
  collect(w, [...(req.evidence || []), ...(req.anyEvidence ? [req.anyEvidence[0]] : [])]);
  (req.flags || []).forEach((f) => w.setFlag(f));
}

test('puzzles: each is locked until its prerequisites are held, and says why', () => {
  for (const id of PUZZLE_IDS) {
    const w = fresh();
    const c = canStart(w, id);
    assert.equal(c.ok, false, id);
    assert.equal(c.message, PUZZLES[id].lockedMessage);
    assert.throws(() => createSession(w, id), /not available/);
    ready(w, id);
    assert.equal(canStart(w, id).ok, true, id);
  }
});

test('puzzle 2 needs the inventory AND at least one witness account (design document)', () => {
  const w = fresh();
  collect(w, ['ev_inventory']);
  assert.equal(canStart(w, 'puzzle_archive').ok, false);
  collect(w, ['ev_margot_testimony']);
  assert.equal(canStart(w, 'puzzle_archive').ok, true);
});

test('puzzle 4 needs the photograph and the knowledge that 12 matters (design document)', () => {
  const w = fresh();
  collect(w, ['ev_festival_photo']);
  assert.equal(canStart(w, 'puzzle_toybox').ok, false);
  w.setFlag('knows_twelve_meaning');
  assert.equal(canStart(w, 'puzzle_toybox').ok, true);
});

// ---- puzzle 1: The Baker's Recipe -------------------------------------------------

test('puzzle 1: the correct three lines solve it and yield document 0412 as evidence', () => {
  const w = fresh(); ready(w, 'puzzle_recipe');
  const s = createSession(w, 'puzzle_recipe');
  PUZZLES.puzzle_recipe.solution.forEach((l) => s.toggle(l));
  const res = s.submit();
  assert.equal(res.status, 'solved');
  assert.deepEqual(res.newEvidence, ['ev_recipe_key']);
  assert.equal(w.isPuzzleSolved('puzzle_recipe'), true);
  assert.match(PUZZLES.puzzle_recipe.successText, /0412/);
});

test('puzzle 1: the solution is a document number, derived from the margin numbers', () => {
  const p = PUZZLES.puzzle_recipe;
  const digits = p.solution.map((id) => p.lines.find((l) => l.id === id).margin).join('');
  assert.equal(digits, '412');
});

test('puzzle 1: wrong selections give specific feedback and never lock anything', () => {
  const w = fresh(); ready(w, 'puzzle_recipe');
  const s = createSession(w, 'puzzle_recipe');
  assert.equal(s.submit().status, 'wrong');                       // nothing picked
  s.toggle('L2');
  const few = s.submit();
  assert.equal(few.status, 'wrong');
  assert.equal(few.feedback, PUZZLES.puzzle_recipe.feedback.tooFew);
  s.toggle('L4'); s.toggle('L5'); s.toggle('L1');                 // all right + one wrong
  const many = s.submit();
  assert.equal(many.feedback, PUZZLES.puzzle_recipe.feedback.tooMany);
  assert.match(many.detail, /market morning/);
  s.toggle('L2');                                                // mixed
  assert.equal(s.submit().feedback, PUZZLES.puzzle_recipe.feedback.mixed);
  assert.equal(w.isPuzzleSolved('puzzle_recipe'), false);
  assert.ok(w.puzzle('puzzle_recipe').attempts >= 3);
  // ...and the correct answer still works afterwards.
  s.toggle('L1'); s.toggle('L2');
  assert.equal(s.submit().status, 'solved');
});

test('puzzle 1: toggling an unknown line is ignored', () => {
  const w = fresh(); ready(w, 'puzzle_recipe');
  const s = createSession(w, 'puzzle_recipe');
  assert.equal(s.toggle('nope'), false);
});

// ---- puzzle 2: The Missing Record -------------------------------------------------

test('puzzle 2: ordering then naming the anomaly solves it', () => {
  const w = fresh(); ready(w, 'puzzle_archive');
  const s = createSession(w, 'puzzle_archive');
  assert.notEqual(s.order.join(''), PUZZLES.puzzle_archive.solutionOrder.join(''), 'starts unsolved');
  const wrong = s.checkOrder();
  assert.equal(wrong.status, 'orderWrong');
  assert.equal(typeof wrong.inPlace, 'number');
  assert.equal(s.pickAnomaly('D').status, 'notYet', 'cannot name the anomaly before ordering');
  assert.equal(s.setOrder(['A', 'B', 'D', 'C', 'E']), true);
  assert.equal(s.checkOrder().status, 'orderRight');
  const bad = s.pickAnomaly('A');
  assert.equal(bad.status, 'anomalyWrong');
  const ok = s.pickAnomaly('D');
  assert.equal(ok.status, 'solved');
  assert.match(ok.explanation, /27 December/);
  assert.deepEqual(ok.newEvidence, ['ev_backdated_slip']);
});

test('puzzle 2: moving cards with move() reaches the solution; invalid orders are rejected', () => {
  const w = fresh(); ready(w, 'puzzle_archive');
  const s = createSession(w, 'puzzle_archive');
  assert.equal(s.setOrder(['A', 'A', 'B', 'C', 'D']), false);
  assert.equal(s.setOrder(['A', 'B']), false);
  assert.equal(s.move(-1, 2), false);
  // Bubble sort with move() until the order matches.
  const sol = PUZZLES.puzzle_archive.solutionOrder;
  for (let i = 0; i < sol.length; i++) s.move(s.order.indexOf(sol[i]), i);
  assert.equal(s.order.join(''), sol.join(''));
  assert.equal(s.checkOrder().status, 'orderRight');
});

test('puzzle 2: the dates on the cards really do put D between B and C (data self-check)', () => {
  const p = PUZZLES.puzzle_archive;
  const byDate = [...p.cards].sort((a, b) => a.date.localeCompare(b.date)).map((c) => c.id);
  assert.deepEqual(byDate, p.solutionOrder);
  const e = p.cards.find((c) => c.id === 'E');
  const d = p.cards.find((c) => c.id === p.anomaly);
  assert.ok(d.date < e.date, 'the anomaly claims to be older than the registration it refers to');
});

// ---- puzzle 3: Twelve Points -------------------------------------------------------

test('puzzle 3: pressing the points in the inscription order lights the Star', () => {
  const w = fresh(); ready(w, 'puzzle_star');
  const s = createSession(w, 'puzzle_star');
  let last;
  PUZZLES.puzzle_star.solution.forEach((p, i) => {
    last = s.press(p);
    if (i < 11) assert.equal(last.status, 'progress');
  });
  assert.equal(last.status, 'solved');
  assert.equal(w.hasFlag('tower_star_open'), true);
});

test('puzzle 3: the solution follows the cornerstone inscription (December first, then January to November)', () => {
  const p = PUZZLES.puzzle_star;
  const months = p.solution.map((id) => p.points.find((x) => x.id === id).month);
  assert.deepEqual(months, [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test('puzzle 3: a wrong press resets the sequence but nothing else, endlessly', () => {
  const w = fresh(); ready(w, 'puzzle_star');
  const s = createSession(w, 'puzzle_star');
  for (let i = 0; i < 25; i++) {
    s.press('p12'); s.press('p1');
    const bad = s.press('p6');
    assert.equal(bad.status, 'wrong');
    assert.equal(s.progress.length, 0);
  }
  assert.equal(s.press('p12').status, 'progress');
  assert.equal(s.press('p12').status, 'already');
  assert.equal(s.press('nonsense').status, 'invalid');
  assert.equal(w.isPuzzleSolved('puzzle_star'), false);
  PUZZLES.puzzle_star.solution.slice(1).forEach((p) => s.press(p));
  assert.equal(w.isPuzzleSolved('puzzle_star'), true);
});

// ---- puzzle 4: The Box at Home -----------------------------------------------------

test('puzzle 4: picking the copper 12 yields the plaque; look-alikes are explained, not punished', () => {
  const w = fresh(); ready(w, 'puzzle_toybox');
  const s = createSession(w, 'puzzle_toybox');
  for (const wrong of ['tin_soldier', 'brass_12', 'copper_21', 'marbles']) {
    const r = s.pick(wrong);
    assert.equal(r.status, 'wrong');
    assert.ok(r.note.length > 5);
  }
  assert.match(s.pick('brass_12').note, /brass/);
  assert.match(s.pick('copper_21').note, /wrong way round/);
  assert.equal(s.pick('nope').status, 'invalid');
  const ok = s.pick('copper_12');
  assert.equal(ok.status, 'solved');
  assert.equal(w.hasEvidence('ev_plaque_12'), true);
  assert.equal(w.hasFlag('plaque_12_found'), true);
});

// ---- shared behaviour --------------------------------------------------------------

test('puzzles: a success scene, when defined, is a real dialogue node', async () => {
  const { NODES } = await import('../src/data/dialogue.js');
  for (const p of Object.values(PUZZLES)) if (p.successNode) assert.ok(NODES[p.successNode], p.id);
  assert.equal(PUZZLES.puzzle_toybox.successNode, 'toybox_memory');
});

test('puzzles: rewards are given once; solving again changes nothing', () => {
  for (const id of PUZZLE_IDS) {
    const w = fresh(); ready(w, id);
    const first = complete(w, id);
    assert.equal(first.first, true, id);
    const before = JSON.stringify(w.data.evidence) + JSON.stringify(w.data.flags);
    const again = complete(w, id);
    assert.equal(again.first, false);
    assert.equal(JSON.stringify(w.data.evidence) + JSON.stringify(w.data.flags), before, id);
  }
});

test('puzzles: three escalating hints, the last explicit, then nothing more', () => {
  for (const id of PUZZLE_IDS) {
    const w = fresh();
    assert.deepEqual(hintsUnlocked(w, id), []);
    const h1 = nextHint(w, id), h2 = nextHint(w, id), h3 = nextHint(w, id);
    assert.equal(h1.level, 1); assert.equal(h1.last, false);
    assert.equal(h3.level, 3); assert.equal(h3.last, true);
    assert.equal(nextHint(w, id), null);
    assert.equal(hintsUnlocked(w, id).length, 3);
    assert.notEqual(h1.text, h3.text);
    assert.ok(h2.text.length > 10);
  }
  // The final hint spells out the answer.
  const w = fresh();
  for (let i = 0; i < 3; i++) nextHint(w, 'puzzle_recipe');
  assert.match(hintsUnlocked(w, 'puzzle_recipe')[2], /L2, L4 and L5/);
  for (let i = 0; i < 3; i++) nextHint(w, 'puzzle_archive');
  assert.match(hintsUnlocked(w, 'puzzle_archive')[2], /A, B, D, C, E/);
  for (let i = 0; i < 3; i++) nextHint(w, 'puzzle_star');
  assert.match(hintsUnlocked(w, 'puzzle_star')[2], /DEC first/);
  for (let i = 0; i < 3; i++) nextHint(w, 'puzzle_toybox');
  assert.match(hintsUnlocked(w, 'puzzle_toybox')[2], /copper plate stamped 12/);
});

test('puzzles: hint progress and attempts survive a save round trip', () => {
  const w = fresh(); ready(w, 'puzzle_star');
  nextHint(w, 'puzzle_star'); nextHint(w, 'puzzle_star');
  createSession(w, 'puzzle_star').press('p3');
  const copy = WorldState.fromSaved(JSON.parse(JSON.stringify(w.toJSON())));
  assert.equal(copy.puzzle('puzzle_star').hintLevel, 2);
  assert.equal(copy.puzzle('puzzle_star').attempts, 1);
  assert.equal(hintsUnlocked(copy, 'puzzle_star').length, 2);
});

test('puzzles: openPuzzles lists exactly the attemptable, unsolved ones', () => {
  const w = fresh();
  assert.deepEqual(openPuzzles(w), []);
  ready(w, 'puzzle_recipe');
  assert.deepEqual(openPuzzles(w), ['puzzle_recipe']);
  complete(w, 'puzzle_recipe');
  assert.deepEqual(openPuzzles(w), []);
});

test('puzzles: a solved puzzle can be re-opened without re-granting or throwing', () => {
  const w = fresh(); ready(w, 'puzzle_toybox');
  complete(w, 'puzzle_toybox');
  const s = createSession(w, 'puzzle_toybox');
  assert.equal(s.solved, true);
  assert.equal(s.pick('tin_soldier').status, 'solved');
});
