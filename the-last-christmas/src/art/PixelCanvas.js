// A tiny software pixel canvas. Works in Node (PNG export for previews/tests) and in the browser
// (converted to a <canvas> that Phaser uses as a texture). No dependencies.

const hexCache = new Map();
export function parseColor(c) {
  if (Array.isArray(c)) return c;
  let v = hexCache.get(c);
  if (v) return v;
  let s = c.replace('#', '');
  if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
  v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), s.length === 8 ? parseInt(s.slice(6, 8), 16) : 255];
  hexCache.set(c, v);
  return v;
}

export function mix(a, b, t) {
  const A = parseColor(a), B = parseColor(b);
  const h = (i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  return `#${h(0)}${h(1)}${h(2)}`;
}

export class PixelCanvas {
  constructor(width, height) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.data = new Uint8ClampedArray(this.width * this.height * 4);
  }

  px(x, y, color, alpha = 1) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return this;
    const [r, g, b, a0] = parseColor(color);
    const a = (a0 / 255) * alpha;
    const i = (y * this.width + x) * 4;
    const d = this.data;
    if (a >= 0.999) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; return this; }
    const da = d[i + 3] / 255;
    const oa = a + da * (1 - a);
    if (oa <= 0) return this;
    d[i] = (r * a + d[i] * da * (1 - a)) / oa;
    d[i + 1] = (g * a + d[i + 1] * da * (1 - a)) / oa;
    d[i + 2] = (b * a + d[i + 2] * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
    return this;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return [0, 0, 0, 0];
    const i = (y * this.width + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  rect(x, y, w, h, color, alpha = 1) {
    x = Math.floor(x); y = Math.floor(y); w = Math.floor(w); h = Math.floor(h);
    for (let yy = Math.max(0, y); yy < Math.min(this.height, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(this.width, x + w); xx++) this.px(xx, yy, color, alpha);
    }
    return this;
  }

  /** 1px outline rectangle. */
  frame(x, y, w, h, color, alpha = 1) {
    this.rect(x, y, w, 1, color, alpha).rect(x, y + h - 1, w, 1, color, alpha);
    this.rect(x, y + 1, 1, h - 2, color, alpha).rect(x + w - 1, y + 1, 1, h - 2, color, alpha);
    return this;
  }

  hline(x, y, w, color, alpha = 1) { return this.rect(x, y, w, 1, color, alpha); }
  vline(x, y, h, color, alpha = 1) { return this.rect(x, y, 1, h, color, alpha); }

  line(x0, y0, x1, y1, color, alpha = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, color, alpha);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  ellipse(cx, cy, rx, ry, color, alpha = 1) {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx + 0.25) + (y * y) / (ry * ry + 0.25) <= 1) this.px(cx + x, cy + y, color, alpha);
      }
    }
    return this;
  }

  circle(cx, cy, r, color, alpha = 1) { return this.ellipse(cx, cy, r, r, color, alpha); }

  triangle(x0, y0, x1, y1, x2, y2, color) {
    const minY = Math.floor(Math.min(y0, y1, y2)), maxY = Math.ceil(Math.max(y0, y1, y2));
    const minX = Math.floor(Math.min(x0, x1, x2)), maxX = Math.ceil(Math.max(x0, x1, x2));
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (area === 0) return this;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const w0 = ((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y)) / area;
        const w1 = ((x2 - x) * (y0 - y) - (x0 - x) * (y2 - y)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) this.px(x, y, color);
      }
    }
    return this;
  }

  vgradient(x, y, w, h, top, bottom, steps = 0) {
    for (let i = 0; i < h; i++) {
      let t = h <= 1 ? 0 : i / (h - 1);
      if (steps > 1) t = Math.floor(t * steps) / (steps - 1 > 0 ? steps - 1 : 1);
      this.rect(x, y + i, w, 1, mix(top, bottom, Math.min(1, t)));
    }
    return this;
  }

  /** Copy another canvas onto this one. */
  blit(src, dx, dy, { flipX = false, alpha = 1, sx = 0, sy = 0, sw = src.width, sh = src.height } = {}) {
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = ((sy + y) * src.width + (sx + (flipX ? sw - 1 - x : x))) * 4;
        const a = src.data[i + 3];
        if (a === 0) continue;
        this.px(dx + x, dy + y, [src.data[i], src.data[i + 1], src.data[i + 2], a], alpha);
      }
    }
    return this;
  }

  clone() {
    const c = new PixelCanvas(this.width, this.height);
    c.data.set(this.data);
    return c;
  }

  /** Darken/tint the whole image in place, keeping transparency. */
  tint(color, amount) {
    const [r, g, b] = parseColor(color);
    for (let i = 0; i < this.data.length; i += 4) {
      if (this.data[i + 3] === 0) continue;
      this.data[i] += (r - this.data[i]) * amount;
      this.data[i + 1] += (g - this.data[i + 1]) * amount;
      this.data[i + 2] += (b - this.data[i + 2]) * amount;
    }
    return this;
  }

  /** Draw a 1px dark outline around all non-transparent pixels (sprite readability). */
  outline(color = '#1a1626') {
    const src = this.clone();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (src.get(x, y)[3] !== 0) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => src.get(x + dx, y + dy)[3] > 200)) this.px(x, y, color);
      }
    }
    return this;
  }

  /** Browser only: an HTMLCanvasElement with the pixels. */
  toCanvas(doc = globalThis.document) {
    const cv = doc.createElement('canvas');
    cv.width = this.width; cv.height = this.height;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(this.width, this.height);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  /** Node: encode as PNG (used by tools/render-previews.mjs and by tests). */
  async toPNG() {
    const { deflateSync } = await import('node:zlib');
    const w = this.width, h = this.height;
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) {
      raw[y * (w * 4 + 1)] = 0;
      Buffer.from(this.data.buffer, this.data.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
    }
    const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => {
      const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
      const td = Buffer.concat([Buffer.from(type), data]);
      const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
      return Buffer.concat([len, td, c]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  }

  /** Scale up with nearest-neighbour (for previews). */
  scaled(f) {
    const out = new PixelCanvas(this.width * f, this.height * f);
    for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
      const i = (Math.floor(y / f) * this.width + Math.floor(x / f)) * 4;
      const o = (y * out.width + x) * 4;
      out.data[o] = this.data[i]; out.data[o + 1] = this.data[i + 1]; out.data[o + 2] = this.data[i + 2]; out.data[o + 3] = this.data[i + 3];
    }
    return out;
  }
}
