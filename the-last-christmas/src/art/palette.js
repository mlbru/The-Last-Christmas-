// One shared palette keeps every sprite, portrait and background in the same world:
// cold blues, snowy greys, pine green and warm amber windows.

export const PAL = {
  ink: '#16121f', night0: '#070a1a', night1: '#0f1632', night2: '#1c2750', dusk: '#2b3a72', twilight: '#4a5c94',
  horizon: '#5a4a78', horizonHi: '#8a6a8a', moon: '#f3efd6', moonShade: '#c9c8b0',
  snow: '#d6e0f4', snow2: '#a9b9e0', snow3: '#6c7fb4', snowShade: '#44558a',
  pine: '#1f4a3a', pine2: '#2d6a4f', pine3: '#3f8a63', trunk: '#4a3426',
  brick: '#5e2f30', brick2: '#7a3d3a', brickDark: '#3a1c20', stone: '#5a6082', stone2: '#7a82a6', stoneDark: '#3a3f60',
  wood: '#6b4a32', wood2: '#8a6244', woodDark: '#43301f', plank: '#a07a52',
  amber: '#ffbe4d', amberHi: '#fff1b0', amberDeep: '#e08a2c', glow: '#ffd98a',
  red: '#b3322d', red2: '#d9473f', green: '#2f7d4f', gold: '#e8c050', copper: '#b8703a', copperHi: '#e09a5a', verdigris: '#5fa58f',
  paper: '#e8dcc0', paperDark: '#c9b98f', cream: '#f4ead2', black: '#0b0a10',
  skinShade: '#00000022',
};

/** Darkness overlay colour for a given 0..1 "how late and how grim" value. */
export const TONE_COLOR = '#0a0f26';
