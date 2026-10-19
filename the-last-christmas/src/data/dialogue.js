// Merges every dialogue file into NODES and CONVERSATIONS. Duplicate node ids are a build error,
// so two writers can never silently overwrite each other's lines.

import * as town from './dialogue/town.js';
import * as archive from './dialogue/archive.js';
import * as rowan from './dialogue/rowan.js';
import * as finale from './dialogue/finale.js';

const parts = [town, archive, rowan, finale];

function merge(key) {
  const out = {};
  for (const part of parts) {
    for (const [id, value] of Object.entries(part[key] || {})) {
      if (Object.prototype.hasOwnProperty.call(out, id)) throw new Error(`Duplicate ${key} id: ${id}`);
      out[id] = value;
    }
  }
  return out;
}

export const NODES = merge('nodes');
export const CONVERSATIONS = merge('conversations');
export const NODE_IDS = Object.freeze(Object.keys(NODES));
