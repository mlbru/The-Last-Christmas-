import test from 'node:test';
import assert from 'node:assert/strict';

import { NODES, CONVERSATIONS } from '../src/data/dialogue.js';
import { CHARACTERS } from '../src/data/characters.js';
import { EVIDENCE } from '../src/data/evidence.js';
import { CONFRONTATIONS, RELATIONS } from '../src/data/deductions.js';
import { PUZZLES } from '../src/data/puzzles.js';
import { isValidFlag } from '../src/data/storyFlags.js';
import { LOCATION_IDS } from '../src/data/locationIds.js';
import { referencedIds, check } from '../src/systems/Conditions.js';
import { WorldState } from '../src/game/WorldState.js';
import { DialogueRunner, MAX_CHOICES } from '../src/systems/DialogueSystem.js';
import { collect } from '../src/systems/EvidenceSystem.js';
import { testLink } from '../src/systems/DeductionSystem.js';

const fresh = () => new WorldState();

function assertCondValid(cond, where) {
  const ids = referencedIds(cond);
  ids.flags.forEach((f) => assert.ok(isValidFlag(f), `${where}: flag ${f}`));
  ids.evidence.forEach((e) => assert.ok(EVIDENCE[e], `${where}: evidence ${e}`));
  ids.relations.forEach((r) => assert.ok(RELATIONS[r], `${where}: relation ${r}`));
  ids.nodes.forEach((n) => assert.ok(NODES[n], `${where}: node ${n}`));
  ids.puzzles.forEach((p) => assert.ok(PUZZLES[p], `${where}: puzzle ${p}`));
  ids.locations.forEach((l) => assert.ok(LOCATION_IDS.includes(l), `${where}: location ${l}`));
  ids.characters.forEach((c) => assert.ok(CHARACTERS[c], `${where}: character ${c}`));
  ids.confrontations.forEach((c) => assert.ok(CONFRONTATIONS[c], `${where}: confrontation ${c}`));
}

test('dialogue data: structure, links and ids are valid for every node', () => {
  assert.ok(Object.keys(NODES).length > 80);
  for (const [id, n] of Object.entries(NODES)) {
    const where = `node ${id}`;
    if (n.route) {
      assert.ok(n.route.length >= 1, where);
      assert.equal(n.route[n.route.length - 1].when, undefined, `${where}: route needs an unconditional fallback`);
      n.route.forEach((r) => { assert.ok(NODES[r.next], `${where} -> ${r.next}`); assertCondValid(r.when, where); });
      continue;
    }
    assert.ok(typeof n.text === 'string' && n.text.length > 3, `${where} text`);
    assert.ok(n.text.length <= 330, `${where} text too long for the dialogue box (${n.text.length})`);
    assert.ok(n.speaker === 'narrator' || CHARACTERS[n.speaker], `${where} speaker ${n.speaker}`);
    if (n.next) assert.ok(NODES[n.next], `${where} next ${n.next}`);
    if (n.present) {
      const p = n.present;
      assert.ok(!n.choices && !n.next, `${where}: a present node has neither choices nor next`);
      assert.ok(NODES[p.next], `${where} present.next ${p.next}`);
      assert.ok(p.correct.length >= 1 && p.correct.every((e) => EVIDENCE[e]), `${where} present.correct`);
      Object.keys(p.partial || {}).forEach((e) => assert.ok(EVIDENCE[e] && !p.correct.includes(e), `${where} partial ${e}`));
      assert.ok(p.wrong && p.hints && p.hints.length >= 2, `${where} needs a wrong reply and escalating hints`);
    } else if (n.choices) {
      assert.ok(n.choices.length >= 1 && n.choices.length <= MAX_CHOICES, `${where}: at most ${MAX_CHOICES} choices`);
      assert.ok(!n.next, `${where}: a node with choices has no 'next'`);
      n.choices.forEach((c, i) => {
        assert.ok(c.text && c.text.length < 90, `${where} choice ${i} text`);
        assert.ok(c.next || c.end || c.confront, `${where} choice ${i} goes nowhere`);
        if (c.next) assert.ok(NODES[c.next], `${where} choice ${i} -> ${c.next}`);
        if (c.confront) assert.ok(CONFRONTATIONS[c.confront], `${where}: ${c.confront}`);
        assertCondValid(c.when, `${where} choice ${i}`);
      });
    } else {
      assert.ok(n.next || n.end, `${where}: dead end without end:true`);
    }
    const fx = n.effects || {};
    (fx.flags || []).forEach((f) => assert.ok(isValidFlag(f), `${where} effect flag ${f}`));
    (fx.evidence || []).forEach((e) => assert.ok(EVIDENCE[e], `${where} effect evidence ${e}`));
    (fx.meet || []).forEach((c) => assert.ok(CHARACTERS[c], `${where} meet ${c}`));
  }
});

test('dialogue data: conversations always match something and only point at real nodes', () => {
  for (const [char, entries] of Object.entries(CONVERSATIONS)) {
    assert.ok(CHARACTERS[char], char);
    assert.equal(entries[entries.length - 1].when, undefined, `${char}: last entry must be a fallback`);
    entries.forEach((e) => { assert.ok(NODES[e.node], `${char} -> ${e.node}`); assertCondValid(e.when, char); });
  }
  // Every required conversation partner has one.
  for (const c of ['voss', 'pruitt', 'eddie', 'margot', 'nora', 'silas']) assert.ok(CONVERSATIONS[c], c);
});

test('dialogue data: no node loops forever without ever offering an exit', () => {
  // Follow `next` chains from every node: they must terminate (or hit choices, which are interactive).
  for (const id of Object.keys(NODES)) {
    const seen = new Set();
    let cur = id;
    while (cur) {
      assert.ok(!seen.has(cur), `loop through ${cur} starting at ${id}`);
      seen.add(cur);
      const n = NODES[cur];
      if (n.route || n.choices || n.present || n.end || !n.next) break;
      cur = n.next;
    }
  }
});

test('dialogue data: confrontation reward nodes exist and are reachable only by winning', () => {
  for (const c of Object.values(CONFRONTATIONS)) {
    assert.ok(NODES[c.reward.node], c.id);
    assert.equal(NODES[c.reward.node].speaker, c.character, `${c.id}: confession is spoken by the right person`);
    // A confrontation choice exists in the character's hub.
    const hasChoice = Object.values(NODES).some((n) => (n.choices || []).some((ch) => ch.confront === c.id));
    assert.ok(hasChoice, `${c.id}: no dialogue choice starts it`);
  }
});

// ---- runtime ----------------------------------------------------------------

function playOut(runner, picks = []) {
  const log = [];
  let step = runner.step;
  let guard = 0;
  while (step && guard++ < 200) {
    log.push(step.nodeId);
    if (step.choices) {
      const want = picks.shift();
      step = runner.choose(want === undefined ? step.choices[step.choices.length - 1].index : want);
    } else {
      step = runner.advance();
    }
  }
  assert.ok(guard < 200, 'dialogue did not terminate');
  return log;
}

test('dialogue: the introduction runs from a fresh game and sets intro_complete only at its end', () => {
  const w = fresh();
  const r = new DialogueRunner(w);
  r.startConversation('voss');
  assert.equal(r.step.nodeId, 'intro_1');
  assert.equal(w.hasFlag('intro_complete'), false);
  const log = playOut(r);
  assert.equal(log[log.length - 1], 'intro_7');
  assert.equal(w.hasFlag('intro_complete'), true);
  assert.equal(r.active, false);
  // Afterwards Voss no longer replays the intro.
  r.startConversation('voss');
  assert.equal(r.step.nodeId, 'voss_hub');
});

test('dialogue: optional intro questions are offered once and can be skipped', () => {
  const w = fresh();
  const r = new DialogueRunner(w);
  r.startConversation('voss');
  r.advance(); r.advance(); r.advance(); // intro_2, intro_3 -> intro_4
  assert.equal(r.step.nodeId, 'intro_4');
  assert.equal(r.step.choices.length, 3);
  r.choose(r.step.choices[0].index); // ask question 1
  r.advance();                          // back to intro_4
  assert.equal(r.step.nodeId, 'intro_4');
  assert.equal(r.step.choices.length, 2, 'asked question is no longer offered');
  const skip = r.step.choices[r.step.choices.length - 1];
  r.choose(skip.index);
  assert.equal(r.step.nodeId, 'intro_6');
});

test('dialogue: Eddie first meeting yields his testimony and statement flag, then switches to the hub', () => {
  const w = fresh();
  const r = new DialogueRunner(w);
  r.startConversation('eddie');
  assert.equal(r.step.nodeId, 'eddie_intro');
  assert.equal(w.hasMet('eddie'), true);
  const log = playOut(r, [0]); // ask "What does everyone say?"
  assert.ok(log.includes('eddie_stmt_end'));
  assert.equal(w.hasEvidence('ev_eddie_testimony'), true);
  assert.equal(w.hasFlag('eddie_statement_heard'), true);
  r.startConversation('eddie');
  assert.equal(r.step.nodeId, 'eddie_hub', 'return visits get the alternative hub, not the discovery again');
});

test('dialogue: the confrontation option only appears once the relation is confirmed', () => {
  const w = fresh();
  collect(w, ['ev_eddie_ledger', 'ev_recipe_book', 'ev_eddie_testimony']);
  w.markNodeSeen('eddie_stmt_end');
  const r = new DialogueRunner(w);
  r.startConversation('eddie');
  assert.equal(r.step.nodeId, 'eddie_hub');
  assert.equal(r.step.choices.some((c) => /Confront/.test(c.text)), false);
  r.abort();
  testLink(w, 'ev_eddie_ledger', 'ev_recipe_book');
  r.startConversation('eddie');
  assert.equal(r.step.choices.some((c) => /Confront/.test(c.text)), true);
});

test('dialogue: a full confrontation - wrong evidence retries, cancel returns, correct unlocks the confession', () => {
  const w = fresh();
  collect(w, ['ev_eddie_ledger', 'ev_recipe_book', 'ev_mayor_speech']);
  testLink(w, 'ev_eddie_ledger', 'ev_recipe_book');
  w.markNodeSeen('eddie_stmt_end');
  const r = new DialogueRunner(w);
  r.startConversation('eddie');
  const confront = r.step.choices.find((c) => /Confront/.test(c.text));
  r.choose(confront.index);
  assert.equal(r.step.type, 'confront');
  assert.equal(r.step.canCancel, true);

  let res = r.present('ev_mayor_speech');
  assert.equal(res.result, 'partial');
  assert.equal(r.step.type, 'confront', 'still in the confrontation');
  res = r.present('ev_mayor_speech');
  assert.ok(res.hint, 'a hint appears after a miss');

  // Back out: returns to the hub, nothing lost.
  r.cancel();
  assert.equal(r.step.nodeId, 'eddie_hub');
  r.choose(r.step.choices.find((c) => /Confront/.test(c.text)).index);

  res = r.present('ev_eddie_ledger');
  assert.equal(res.result, 'correct');
  assert.equal(r.step.nodeId, 'eddie_confession');
  assert.equal(w.confrontation('conf_eddie').done, true);
  assert.equal(w.hasFlag('thomas_hiding_known'), true);
  playOut(r);
  assert.equal(r.active, false);
  r.startConversation('eddie');
  assert.equal(r.step.nodeId, 'eddie_done');
});

test('dialogue: Silas gives the carbon copy only after Rowan has read his own statement', () => {
  const w = fresh();
  w.markNodeSeen('silas_intro_end');
  const r = new DialogueRunner(w);
  r.startConversation('silas');
  r.choose(r.step.choices[0].index); // ask about statement
  assert.equal(r.step.nodeId, 'silas_refuse');
  assert.equal(w.hasEvidence('ev_silas_statement'), false);
  r.abort();

  collect(w, ['ev_rowan_statement']);
  r.startConversation('silas');
  r.choose(r.step.choices[0].index);
  assert.equal(r.step.nodeId, 'silas_give');
  playOut(r);
  assert.equal(w.hasEvidence('ev_silas_statement'), true);

  r.startConversation('silas');
  r.choose(r.step.choices[0].index);
  assert.equal(r.step.nodeId, 'silas_ask_again');
});

test('dialogue: Pruitt gives news that matches how far Rowan has got', () => {
  const w = fresh();
  w.markNodeSeen('pruitt_intro_end');
  const r = new DialogueRunner(w);
  const news = () => { r.startConversation('pruitt'); r.choose(r.step.choices[0].index); const id = r.step.nodeId; r.abort(); return id; };
  assert.equal(news(), 'pruitt_news_a');
  w.setFlag('thomas_office_searched');
  assert.equal(news(), 'pruitt_news_b');
  w.setFlag('thomas_hiding_known');
  assert.equal(news(), 'pruitt_news_c');
});

test('dialogue: aborting (Escape) is always safe and keeps the progress already earned', () => {
  const w = fresh();
  const r = new DialogueRunner(w);
  r.startConversation('eddie');
  r.advance();                                // eddie_intro -> eddie_i2 (has choices)
  r.choose(r.step.choices[0].index);          // 'What does everyone say?' -> eddie_stmt_1
  r.advance(); r.advance(); r.advance();      // stmt_2, stmt_3, stmt_4 (grants the evidence)
  assert.equal(w.hasEvidence('ev_eddie_testimony'), true);
  r.abort();
  assert.equal(r.active, false);
  assert.equal(r.step, null);
  r.abort(); // twice is fine
  assert.equal(r.advance(), null);
  r.startConversation('eddie'); // restartable
  assert.ok(r.step);
});

test('dialogue: hitting advance/choose at the wrong moment never throws or skips content', () => {
  const w = fresh();
  const r = new DialogueRunner(w);
  assert.equal(r.advance(), null);
  assert.equal(r.choose(0), null);
  r.startConversation('pruitt');
  assert.equal(r.step.nodeId, 'pruitt_intro');
  r.choose(99); // no choices here: ignored
  assert.equal(r.step.nodeId, 'pruitt_intro');
  r.startConversation('eddie');
  r.advance(); // to eddie_i2, which has choices
  const before = r.step.nodeId;
  r.advance(); r.advance(); // advancing while choices are shown must not skip them
  assert.equal(r.step.nodeId, before);
  r.choose(99);
  assert.equal(r.step.nodeId, before);
});

test('dialogue: seen-counters and once-choices persist through save/serialise', () => {
  const w = fresh();
  const r = new DialogueRunner(w);
  r.startConversation('voss');
  r.advance(); r.advance(); r.advance();
  r.choose(r.step.choices[0].index);
  const copy = WorldState.fromSaved(JSON.parse(JSON.stringify(w.toJSON())));
  assert.equal(copy.seenNode('intro_5a'), true);
  assert.equal(copy.tookChoice('intro_4:0'), true);
  const r2 = new DialogueRunner(copy);
  r2.startNode('intro_4');
  assert.equal(r2.step.choices.length, 2);
});

test('conditions: unknown keys throw so typos in data cannot become silent "true"', () => {
  assert.throws(() => check(fresh(), { flg: 'intro_complete' }));
  assert.equal(check(fresh(), undefined), true);
  assert.equal(check(fresh(), { not: { flag: 'intro_complete' } }), true);
  assert.equal(check(fresh(), { any: [{ flag: 'intro_complete' }, { notFlag: 'game_completed' }] }), true);
});
