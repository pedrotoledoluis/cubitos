// Renders characters-v2/preview.html sheets to characters-v2/sheets/*.png.
// Usage: node characters-v2/tools/render-sheets.mjs [profe tito faces lineup]
import fs from 'node:fs';
import path from 'node:path';
import { openBrowser, PROJECT } from './browser.mjs';

const out = path.join(PROJECT, 'characters-v2', 'sheets');
fs.mkdirSync(out, { recursive: true });
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['profe', 'tito', 'faces', 'lineup'];
const b = await openBrowser();
for (const n of names) {
  const buf = await b.shot(`/characters-v2/preview.html?render&sheet=${n}`, { width: 1080, height: 1920, fullPage: true });
  fs.writeFileSync(path.join(out, `${n}.png`), buf);
  console.log('wrote', n);
}
await b.close();
