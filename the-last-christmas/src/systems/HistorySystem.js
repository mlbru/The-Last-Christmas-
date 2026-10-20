// What is left of the official 2001 story: each claim with the established deductions that contradict it.

import { OFFICIAL_CLAIMS } from '../data/history2001.js';

/** [{ id, claim, status: 'official' | 'disproved', reasons: [text] }] in a fixed order. */
export function officialStory(world) {
  return OFFICIAL_CLAIMS.map((c) => {
    const reasons = Object.entries(c.disprovedBy).filter(([rel]) => world.hasRelation(rel)).map(([, text]) => text);
    return { id: c.id, claim: c.claim, status: reasons.length ? 'disproved' : 'official', reasons };
  });
}
