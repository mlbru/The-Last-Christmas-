// Entering a location: bookkeeping that is the same no matter which scene draws it.

import { LOCATIONS, DEFAULT_DEPTH } from '../data/locations.js';
import { recompute } from '../game/StoryLogic.js';

/**
 * Mark a location as visited, set its "visited" flag, record Rowan's position, and say which
 * short introductory dialogue (if any) should play. The intro only plays on the first visit.
 */
export function enterLocation(world, locationId, spawnName = 'default') {
  const loc = LOCATIONS[locationId];
  if (!loc) throw new Error(`Unknown location: ${locationId}`);
  const sp = loc.spawns[spawnName] || loc.spawns.default;
  const first = world.markVisited(locationId);
  if (loc.flag) world.setFlag(loc.flag);
  recompute(world);
  world.setPosition(locationId, sp.x, DEFAULT_DEPTH, sp.facing || 'right');   // position.y is the depth lane
  return {
    location: loc, x: sp.x, d: DEFAULT_DEPTH, facing: sp.facing || 'right',
    firstVisit: first,
    introNode: first && loc.enterNode ? loc.enterNode : null,
  };
}
