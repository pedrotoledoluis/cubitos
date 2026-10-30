// Renders channel branding: avatar (800x800) and banner (2560x1440, title inside the 1546x423 safe area).
// Usage: npm run branding
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, openStage } from './lib.mjs';

const CHANNEL = 'Historia en Cubitos';
const dir = path.join(ROOT, 'branding');
fs.mkdirSync(dir, { recursive: true });

const jobs = [
  { file: 'avatar.png', mode: 'avatar', width: 800, height: 800 },
  { file: 'banner.png', mode: 'banner', width: 2560, height: 1440 },
];
for (const j of jobs) {
  const stage = await openStage({ mode: j.mode, width: j.width, height: j.height, channelName: CHANNEL });
  fs.writeFileSync(path.join(dir, j.file), await stage.frame(1.0, 'png'));
  await stage.close();
  console.log(`wrote ${path.join(dir, j.file)}`);
}
