// Location ids that can appear in a save game. Full geometry lives in locations.js.
export const LOCATION_IDS = Object.freeze(['square', 'office', 'inn', 'bakery', 'police', 'archive', 'tower', 'home']);
export const START_LOCATION = 'square';
export function isValidLocation(id) { return LOCATION_IDS.includes(id); }
