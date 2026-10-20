// Inlines the Vite build (one JS and one CSS file) into dist/The-Last-Christmas.html, a single file
// that runs straight from disk. Run after `vite build`: npm run single
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const assets = readdirSync(new URL('assets/', dist));
const read = (ext) => {
  const name = assets.find((f) => f.endsWith(ext));
  if (!name) throw new Error(`No ${ext} file in dist/assets. Run vite build first.`);
  return readFileSync(new URL(join('assets', name), dist), 'utf8');
};

const js = read('.js').replaceAll('</script', '<\\/script');
const css = read('.css');
let html = readFileSync(new URL('index.html', dist), 'utf8');
html = html.replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, () => `<script type="module">${js}</script>`);
html = html.replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, () => `<style>${css}</style>`);
if (html.includes('assets/')) throw new Error('Something still points at dist/assets.');

writeFileSync(new URL('The-Last-Christmas.html', dist), html);
console.log(`dist/The-Last-Christmas.html (${Math.round(html.length / 1024)} KB)`);
