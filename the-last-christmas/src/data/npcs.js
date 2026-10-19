// Who stands where. Every TALK interaction gets a visible character at its x position.
// Named characters come from characters.js; three townspeople are defined here.

import { INTERACTIONS } from './interactions.js';
import { CHARACTERS } from './characters.js';

export const EXTRA_LOOKS = {
  sq_ames: { skin: '#e9bca0', hair: '#bdbdbd', coat: '#7a3a5a', trim: '#e0c8a0', hat: 'wool', hatColor: '#c8a040', scarf: '#d8d0b8', scale: 1 },
  sq_tobias: { skin: '#f0c4a4', hair: '#6a3a1a', coat: '#3a5a8a', trim: '#e8e0c8', hat: 'wool', hatColor: '#b83a30', scarf: '#e8c040', scale: 0.72 },
  in_patron: { skin: '#d8a888', hair: '#9a9a9a', coat: '#5a4a3a', trim: '#c8b890', hat: 'flat', hatColor: '#3a3a3a', scarf: null, scale: 1 },
};

export const CROWD_LOOKS = [
  { skin: '#e8b996', hair: '#3a2a20', coat: '#3a4a6a', trim: '#d0c8b0', hat: 'wool', hatColor: '#a83a30', scarf: '#d8d0b8' },
  { skin: '#d9a883', hair: '#8a8a8a', coat: '#5a3a3a', trim: '#c8b890', hat: null, scarf: '#2d5a3d' },
  { skin: '#eab99a', hair: '#7a4b2a', coat: '#2a5a4a', trim: '#e8d9a8', hat: 'wool', hatColor: '#3a5a8a', scarf: null },
  { skin: '#e2a98a', hair: '#cfcfcf', coat: '#6a5a7a', trim: '#e0d8c0', hat: 'cap', hatColor: '#4a4a52', scarf: '#a3302b' },
  { skin: '#d7a283', hair: '#3a3a3a', coat: '#4a4a52', trim: '#c0c0c8', hat: null, scarf: '#c8a040' },
];

/** The NPCs standing in a location: [{ key, interactionId, characterId|null, look, x, scale, behindGrille }] */
export function npcsFor(locationId) {
  return INTERACTIONS.filter((i) => i.location === locationId && i.type === 'talk').map((i) => {
    const conv = i.action && i.action.conversation;
    const charId = conv && CHARACTERS[conv] ? conv : null;
    const look = charId ? CHARACTERS[charId].look : EXTRA_LOOKS[i.id];
    if (!look) throw new Error(`No look for NPC ${i.id}`);
    return { key: charId || i.id, interactionId: i.id, characterId: charId, look, x: i.x + (i.id === 'ar_nora' ? 12 : 0), scale: look.scale || 1 };
  });
}
