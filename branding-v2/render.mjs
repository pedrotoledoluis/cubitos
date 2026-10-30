// Renders branding-v2 PNGs. Usage: node branding-v2/render.mjs [avatar banner logo watermark thumbnail]
import fs from 'node:fs';
import path from 'node:path';
import { openBrowser, PROJECT } from '../characters-v2/tools/browser.mjs';

const dir = path.join(PROJECT, 'branding-v2');
const jobs = {
  avatar: ['/branding-v2/brand.html?mode=avatar', 800, 800, false],
  banner: ['/branding-v2/brand.html?mode=banner', 2560, 1440, false],
  logo: ['/branding-v2/brand.html?mode=logo', 2000, 640, true],
  watermark: ['/branding-v2/brand.html?mode=watermark', 150, 150, true],
  'thumbnail-example': ['/branding-v2/thumbnail-template.html?text=' + encodeURIComponent('¡AUSTRALIA PERDIÓ contra *EMÚS*!') + '&emotion=scared', 1280, 720, false],
};
const pick = process.argv.slice(2);
const b = await openBrowser();
for (const [name, [url, w, h, tr]] of Object.entries(jobs)) {
  if (pick.length && !pick.includes(name)) continue;
  fs.writeFileSync(path.join(dir, `${name}.png`), await b.shot(url, { width: w, height: h, transparent: tr }));
  console.log('wrote', name);
}
await b.close();
