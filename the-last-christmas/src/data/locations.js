// Geometry and atmosphere of every location. World units are pixels at the internal 480x270 resolution.
// Movement is mostly sideways; a shallow depth lane (0..DEPTH_MAX) lets Rowan walk *around* low
// obstacles, while full-depth solids (walls, closed gates) really do block the way.

export const DEPTH_MAX = 20;      // lane depth range
export const DEFAULT_DEPTH = 15;  // front lane
export const GROUND_Y = 232;      // screen y of depth 0 feet; depth adds up to DEPTH_MAX px

export const LOCATIONS = {
  square: {
    id: 'square', name: 'Town Square', kind: 'street', width: 1120, tone: 0.0, music: 'square',
    spawns: {
      default: { x: 440, facing: 'right' }, fromOffice: { x: 215 }, fromInn: { x: 385 },
      fromBakery: { x: 775 }, fromPolice: { x: 905 }, fromChurch: { x: 1015 }, fromHome: { x: 75 },
    },
    solids: [
      { id: 'fountain', x: 560, w: 44, d0: 0, d1: 14 },
      { id: 'tree', x: 515, w: 30, d0: 0, d1: 14 },
      { id: 'podium', x: 615, w: 26, d0: 0, d1: 14 },
    ],
  },
  office: {
    id: 'office', name: "Thomas Bell's Office", kind: 'interior', width: 640, tone: 0.1, music: 'indoors',
    enterNode: 'office_enter', flag: null,
    spawns: { default: { x: 100, facing: 'right' } },
    solids: [{ id: 'filing_stack', x: 410, w: 24, d0: 0, d1: 14 }],
  },
  inn: {
    id: 'inn', name: 'The Holly Inn', kind: 'interior', width: 720, tone: 0.05, music: 'inn',
    flag: 'inn_visited',
    spawns: { default: { x: 100, facing: 'right' } },
    solids: [{ id: 'bar', x: 345, w: 80, d0: 0, d1: 14 }, { id: 'table', x: 230, w: 36, d0: 0, d1: 14 }],
  },
  bakery: {
    id: 'bakery', name: "Margot's Bakery", kind: 'interior', width: 640, tone: 0.05, music: 'inn',
    flag: 'bakery_visited',
    spawns: { default: { x: 100, facing: 'right' } },
    solids: [{ id: 'counter', x: 300, w: 70, d0: 0, d1: 14 }],
  },
  police: {
    id: 'police', name: 'Police Station', kind: 'interior', width: 640, tone: 0.2, music: 'indoors',
    flag: 'police_visited',
    spawns: { default: { x: 100, facing: 'right' } },
    solids: [{ id: 'front_desk', x: 150, w: 70, d0: 0, d1: 14 }],
  },
  archive: {
    id: 'archive', name: 'Church and Archive', kind: 'church', width: 1060, tone: 0.35, music: 'church',
    flag: 'archive_visited',
    spawns: { default: { x: 100, facing: 'right' }, fromTower: { x: 990, facing: 'left' } },
    solids: [
      // Iron grille between the nave and the archive. Nora lets Rowan in once he has introduced himself.
      { id: 'archive_grille', x: 608, w: 12, d0: 0, d1: DEPTH_MAX + 4, openWhen: { seen: 'nora_intro_end' } },
      { id: 'pew_front', x: 170, w: 90, d0: 0, d1: 14 },
    ],
  },
  tower: {
    id: 'tower', name: 'Bell Tower', kind: 'tower', width: 600, tone: 0.7, music: 'tower',
    flag: 'tower_visited', enterNode: 'tower_enter',
    spawns: { default: { x: 100, facing: 'right' } },
    solids: [{ id: 'bell_frame', x: 270, w: 20, d0: 0, d1: 14 }],
  },
  home: {
    id: 'home', name: 'Fernbrook Lane 12', kind: 'interior', width: 600, tone: 0.45, music: 'home',
    flag: 'home_visited', enterNode: 'home_enter',
    spawns: { default: { x: 100, facing: 'right' } },
    solids: [{ id: 'armchair', x: 235, w: 40, d0: 0, d1: 14 }],
  },
};

export const LOCATION_LIST = Object.freeze(Object.keys(LOCATIONS));
