import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Runs the Phaser scene code against a permissive stub (see tests/stubs/phaser.js). It proves the
// scene logic executes without JavaScript errors; it does NOT prove the real Phaser API calls.
test('scenes (stub Phaser): boot, backdrop, all 8 locations, finale cues and epilogue run without errors', () => {
  const r = spawnSync(process.execPath, ['--import', './tests/stubs/register.mjs', 'tests/stubs/run-scenes.mjs'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /scene smoke OK/);
});
