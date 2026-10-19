// Declarative conditions used by dialogue entries, choices and interactions.
// A condition is a plain object; every key present must hold (logical AND).
//
//   { flag: 'a' | ['a','b'] }        all listed flags are set
//   { notFlag: ... }                 none of the listed flags is set
//   { evidence: ... } { notEvidence: ... }
//   { relation: ... } { notRelation: ... }
//   { seen: 'node' | [...] }         dialogue node(s) have been shown at least once
//   { notSeen: ... }
//   { puzzle: 'id' | [...] }         puzzle(s) solved        { notPuzzle: ... }
//   { visited: 'loc' | [...] }
//   { met: 'char' | [...] }
//   { confronted: 'conf_id' | [...] } confrontation(s) completed    { notConfronted: ... }
//   { all: [cond,...] } { any: [cond,...] } { not: cond }
//
// Unknown keys throw, so a typo in the data can never silently become "always true".

const list = (v) => (Array.isArray(v) ? v : [v]);

const KEYS = new Set([
  'flag', 'notFlag', 'evidence', 'notEvidence', 'relation', 'notRelation', 'seen', 'notSeen',
  'puzzle', 'notPuzzle', 'visited', 'met', 'confronted', 'notConfronted', 'all', 'any', 'not',
]);

export function check(world, cond) {
  if (cond === undefined || cond === null) return true;
  for (const key of Object.keys(cond)) {
    if (!KEYS.has(key)) throw new Error(`Unknown condition key: ${key}`);
  }
  const d = world.data;
  if (cond.flag !== undefined && !list(cond.flag).every((f) => world.hasFlag(f))) return false;
  if (cond.notFlag !== undefined && list(cond.notFlag).some((f) => world.hasFlag(f))) return false;
  if (cond.evidence !== undefined && !list(cond.evidence).every((e) => world.hasEvidence(e))) return false;
  if (cond.notEvidence !== undefined && list(cond.notEvidence).some((e) => world.hasEvidence(e))) return false;
  if (cond.relation !== undefined && !list(cond.relation).every((r) => world.hasRelation(r))) return false;
  if (cond.notRelation !== undefined && list(cond.notRelation).some((r) => world.hasRelation(r))) return false;
  if (cond.seen !== undefined && !list(cond.seen).every((n) => world.seenNode(n))) return false;
  if (cond.notSeen !== undefined && list(cond.notSeen).some((n) => world.seenNode(n))) return false;
  if (cond.puzzle !== undefined && !list(cond.puzzle).every((p) => world.isPuzzleSolved(p))) return false;
  if (cond.notPuzzle !== undefined && list(cond.notPuzzle).some((p) => world.isPuzzleSolved(p))) return false;
  if (cond.visited !== undefined && !list(cond.visited).every((l) => d.visited.includes(l))) return false;
  if (cond.met !== undefined && !list(cond.met).every((c) => world.hasMet(c))) return false;
  if (cond.confronted !== undefined && !list(cond.confronted).every((c) => world.confrontation(c).done)) return false;
  if (cond.notConfronted !== undefined && list(cond.notConfronted).some((c) => world.confrontation(c).done)) return false;
  if (cond.all !== undefined && !cond.all.every((c) => check(world, c))) return false;
  if (cond.any !== undefined && !cond.any.some((c) => check(world, c))) return false;
  if (cond.not !== undefined && check(world, cond.not)) return false;
  return true;
}

/** Collect every id referenced by a condition, for static validation of the data. */
export function referencedIds(cond, out = { flags: [], evidence: [], relations: [], nodes: [], puzzles: [], locations: [], characters: [], confrontations: [] }) {
  if (!cond) return out;
  const add = (arr, v) => list(v).forEach((x) => arr.push(x));
  if (cond.flag) add(out.flags, cond.flag);
  if (cond.notFlag) add(out.flags, cond.notFlag);
  if (cond.evidence) add(out.evidence, cond.evidence);
  if (cond.notEvidence) add(out.evidence, cond.notEvidence);
  if (cond.relation) add(out.relations, cond.relation);
  if (cond.notRelation) add(out.relations, cond.notRelation);
  if (cond.seen) add(out.nodes, cond.seen);
  if (cond.notSeen) add(out.nodes, cond.notSeen);
  if (cond.puzzle) add(out.puzzles, cond.puzzle);
  if (cond.notPuzzle) add(out.puzzles, cond.notPuzzle);
  if (cond.visited) add(out.locations, cond.visited);
  if (cond.met) add(out.characters, cond.met);
  if (cond.confronted) add(out.confrontations, cond.confronted);
  if (cond.notConfronted) add(out.confrontations, cond.notConfronted);
  (cond.all || []).forEach((c) => referencedIds(c, out));
  (cond.any || []).forEach((c) => referencedIds(c, out));
  if (cond.not) referencedIds(cond.not, out);
  return out;
}
