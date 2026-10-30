// One command per episode: audio -> check -> render video -> render thumbnail -> description/metadata -> deliverables.
// Usage: node scripts/make-episode.mjs episodes/NNN-slug.json [--skip-render] [--print-description]
//   --print-description  prints the description text and exits (no audio, render or file writes).
// Deliverables: ../videos/<id>/<id>.mp4, <id>-thumbnail.png, <id>-description.txt, metadata.json
// Verification artifacts (not deliverables): .build/verify/<id>-sheet.jpg (one frame per line).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cleanupProcesses } from './processes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEOS = path.resolve(ROOT, '..', 'videos');
const HF = 'hyperframes@0.8.214';
const MIN = 60000;
const TARGET = { min: 35, max: 55 }; // seconds (PRODUCTION.md section 3)

/**
 * Unique per-episode description (no fixed channel paragraph: YouTube bans repetitive description sentences).
 * Layout: title, `summary` (1-2 unique sentences; omitted for older episodes without it), sources, 3-5 hashtags.
 */
export function buildDescription(ep) {
  const out = [ep.title, ''];
  if (ep.summary?.trim()) out.push(ep.summary.trim(), '');
  out.push('Fuentes:', ...(ep.sources ?? []).map((s) => `- ${s}`));
  const tags = ep.hashtags ?? [];
  if (tags.length) out.push('', tags.join(' '));
  return out.join('\n') + '\n';
}

const args = process.argv.slice(2);
const epFile = args.find((a) => !a.startsWith('--'));
if (!epFile) { console.error('Usage: node scripts/make-episode.mjs episodes/NNN-slug.json [--skip-render] [--print-description]'); process.exit(1); }
const skipRender = args.includes('--skip-render');
const ep = JSON.parse(fs.readFileSync(path.resolve(epFile), 'utf8'));
if (args.includes('--print-description')) { process.stdout.write(buildDescription(ep)); process.exit(0); }
if (!ep.summary?.trim()) console.warn('WARNING: episode has no `summary`; the description will only list title, sources and hashtags');
const nTags = ep.hashtags?.length ?? 0;
if (nTags < 3 || nTags > 5) console.warn(`WARNING: ${nTags} hashtags; the rule is 3-5 topic hashtags`);
const id = ep.id;
const outDir = path.join(VIDEOS, id);
const renders = path.join(ROOT, 'renders');
const verify = path.join(ROOT, '.build', 'verify');
for (const d of [outDir, renders, verify]) fs.mkdirSync(d, { recursive: true });
const t0 = Date.now();
const timings = {};
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);

/** Runs a command with a hard timeout; on timeout kills the whole process tree. */
function run(cmd, cmdArgs, timeoutMs) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, cmdArgs, { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'], shell: cmd === 'npx', windowsHide: true });
    const timer = setTimeout(() => {
      spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { windowsHide: true });
      reject(new Error(`${cmd} ${cmdArgs.join(' ')} timed out after ${timeoutMs / MIN} min`));
    }, timeoutMs);
    p.on('error', (e) => { clearTimeout(timer); reject(e); });
    p.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)); });
  });
}
async function step(name, fn) {
  const s = Date.now();
  log(`== ${name}`);
  try { await fn(); } finally { cleanupProcesses({ projectRoot: ROOT, log }); }
  timings[name] = +((Date.now() - s) / 1000).toFixed(1);
}
const probe = (f, entries) => spawnSync('ffprobe', ['-v', 'error', ...entries, '-of', 'json', f], { encoding: 'utf8' }).stdout;

try {
  await step('audio', () => run('node', ['scripts/build-audio.mjs', epFile], 20 * MIN));
  await step('check', () => run('npx', ['--yes', HF, 'check'], 10 * MIN));
  const video = path.join(renders, `${id}.mp4`);
  const thumbVideo = path.join(renders, `${id}-thumbnail.mp4`);
  if (!skipRender) {
    await step('render', () => run('npx', ['--yes', HF, 'render', '-o', video, '--quiet'], 60 * MIN));
    await step('thumbnail', () => run('npx', ['--yes', HF, 'render', '-c', 'compositions/thumbnail.html', '-o', thumbVideo, '--quiet'], 15 * MIN));
  }

  // ---- deliverables ----
  const description = buildDescription(ep);
  fs.copyFileSync(video, path.join(outDir, `${id}.mp4`));
  spawnSync('ffmpeg', ['-y', '-v', 'error', '-ss', '0.5', '-i', thumbVideo, '-frames:v', '1', path.join(outDir, `${id}-thumbnail.png`)], { windowsHide: true });
  fs.writeFileSync(path.join(outDir, `${id}-description.txt`), description, 'utf8');
  const tags = [...new Set([...(ep.tags ?? []), ...(ep.hashtags ?? []).map((h) => h.replace(/^#/, ''))])];
  fs.writeFileSync(path.join(outDir, 'metadata.json'), JSON.stringify({
    id, title: ep.title, description, tags, categoryId: '27', defaultLanguage: 'es', defaultAudioLanguage: 'es',
    madeForKids: false, selfDeclaredMadeForKids: false, privacyStatus: 'private',
    files: { video: `${id}.mp4`, thumbnail: `${id}-thumbnail.png`, description: `${id}-description.txt` },
  }, null, 2) + '\n', 'utf8');

  // ---- verification ----
  const data = fs.readFileSync(path.join(ROOT, 'src', 'episode-data.js'), 'utf8');
  const EP = JSON.parse(data.slice(data.indexOf('{'), data.lastIndexOf('}') + 1));
  const times = EP.lines.map((l) => Math.min(l.end - 0.05, (l.start + l.end) / 2 + (l.board ? 0.8 : 0)));
  const sel = times.map((t) => `lt(prev_pts*TB\\,${t.toFixed(2)})*gte(pts*TB\\,${t.toFixed(2)})`).join('+');
  const cols = Math.ceil(times.length / 2);
  spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', path.join(outDir, `${id}.mp4`), '-vf', `select='${sel}',scale=270:480,tile=${cols}x2`,
    '-frames:v', '1', '-fps_mode', 'vfr', path.join(verify, `${id}-sheet.jpg`)], { windowsHide: true });
  const streams = JSON.parse(probe(path.join(outDir, `${id}.mp4`), ['-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate:format=duration']));
  const lufs = spawnSync('ffmpeg', ['-hide_banner', '-i', path.join(outDir, `${id}.mp4`), '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr
    .match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/)?.[1];
  const black = spawnSync('ffmpeg', ['-hide_banner', '-i', path.join(outDir, `${id}.mp4`), '-vf', 'blackdetect=d=0.1:pix_th=0.05', '-an', '-f', 'null', '-'], { encoding: 'utf8' }).stderr
    .split('\n').filter((l) => l.includes('black_start'));
  const report = { id, duration: +streams.format.duration, streams: streams.streams, lufs: Number(lufs), blackSegments: black, timings, sheet: path.join(verify, `${id}-sheet.jpg`) };
  fs.writeFileSync(path.join(verify, `${id}-report.json`), JSON.stringify(report, null, 2));
  log(`verify: ${JSON.stringify({ duration: report.duration, lufs: report.lufs, black: black.length, timings })}`);
  if (report.duration < TARGET.min || report.duration > TARGET.max) console.warn(`WARNING: duration ${report.duration}s is outside the ${TARGET.min}-${TARGET.max} s target`);
  // Transition strips: frames around every location change and costume poof.
  const events = EP.lines.filter((l) => l.locationChanged || l.costumeChanged);
  events.forEach((l, n) => {
    const ts = [-0.3, -0.1, 0.0, 0.15, 0.4, 0.7, 1.0, 1.5].map((o) => l.start + o);
    const sel2 = ts.map((x) => `lt(prev_pts*TB\\,${x.toFixed(2)})*gte(pts*TB\\,${x.toFixed(2)})`).join('+');
    spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', path.join(outDir, `${id}.mp4`), '-vf', `select='${sel2}',scale=270:480,tile=8x1`,
      '-frames:v', '1', '-fps_mode', 'vfr', path.join(verify, `${id}-transition-${n + 1}.jpg`)], { windowsHide: true });
  });
  log(`deliverables -> ${outDir}`);
} finally {
  cleanupProcesses({ projectRoot: ROOT, log });
}
