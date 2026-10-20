import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFICIAL_CLAIMS, PROLOGUE } from '../src/data/history2001.js';
import { RELATIONS, CORE_RELATIONS } from '../src/data/deductions.js';
import { WorldState } from '../src/game/WorldState.js';
import { officialStory } from '../src/systems/HistorySystem.js';

test('history: every claim is contradicted only by real deductions, and every core deduction is used', () => {
  const used = new Set();
  for (const c of OFFICIAL_CLAIMS) {
    assert.ok(Object.keys(c.disprovedBy).length > 0, c.id);
    for (const rel of Object.keys(c.disprovedBy)) { assert.ok(RELATIONS[rel], `${c.id} -> ${rel}`); used.add(rel); }
  }
  for (const core of CORE_RELATIONS) assert.ok(used.has(core), `core deduction ${core} strikes out no claim`);
});

test('history: a fresh game believes every claim; a deduction strikes out only its own claim', () => {
  const w = new WorldState();
  assert.ok(officialStory(w).every((c) => c.status === 'official' && c.reasons.length === 0));
  w.confirmRelation('r_recipe_report');
  const story = officialStory(w);
  assert.equal(story.find((c) => c.id === 'claim_locked').status, 'disproved');
  assert.equal(story.filter((c) => c.status === 'disproved').length, 1);
});

test('history: the prologue does not spoil who the child witness was or what the fund was worth', () => {
  const text = [...PROLOGUE.paragraphs, ...PROLOGUE.after].join(' ');
  assert.doesNotMatch(text, /Rowan|Hale|184,000|ledger|Silas/);
});
