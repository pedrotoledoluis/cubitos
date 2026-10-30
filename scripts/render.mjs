// Episode renderer: JSON -> voices -> timeline -> frames (headless Chromium) -> MP4 + thumbnail + description.
// Usage: node scripts/render.mjs episodes/001-guerra-del-emu.json [--preview] [--frames=N]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { ROOT, run, readWav, writeWav, openStage } from './lib.mjs';

const FPS = 30;
const W = 1080, H = 1920;
const RATE = 48000;
const LEAD_IN = 0.5, GAP = 0.28, TAIL = 1.2;

// Per-character voice treatment: pitch factor (asetrate) and final speed.
const VOICES = {
  profe: { pitch: 0.88, speed: 0.97, sapiRate: 0 },
  tito: { pitch: 1.22, speed: 1.05, sapiRate: 1 },
};

const CHANNEL_DESC = 'La historia real, pero en cubitos. Dos sketches por semana sobre los momentos más absurdos, épicos y raros de la humanidad. Todo es verdad. Las caras no.';

const args = process.argv.slice(2);
const epFile = args.find((a) => !a.startsWith('--'));
if (!epFile) { console.error('Usage: npm run render -- episodes/<episode>.json'); process.exit(1); }
const maxFrames = Number((args.find((a) => a.startsWith('--frames=')) || '').split('=')[1]) || Infinity;

const episode = JSON.parse(fs.readFileSync(path.resolve(epFile), 'utf8'));
const id = episode.id || path.basename(epFile, '.json');
const work = path.join(ROOT, 'build', id);
const outDir = path.join(ROOT, 'out');
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

// ---------- 1. voices ----------
async function makeVoices() {
  const jobs = [];
  const items = episode.lines.map((line, i) => {
    const v = VOICES[line.speaker];
    if (!v) throw new Error(`Unknown speaker "${line.speaker}" in line ${i + 1}`);
    const hash = crypto.createHash('sha1').update(JSON.stringify([line.speaker, line.text, v])).digest('hex').slice(0, 10);
    const raw = path.join(work, `line${String(i).padStart(2, '0')}-${hash}.raw.wav`);
    const fx = path.join(work, `line${String(i).padStart(2, '0')}-${hash}.wav`);
    if (!fs.existsSync(raw)) jobs.push({ text: line.text, out: raw, rate: v.sapiRate });
    return { raw, fx, v };
  });
  if (jobs.length) {
    const jobsFile = path.join(work, 'tts-jobs.json');
    fs.writeFileSync(jobsFile, JSON.stringify(jobs), 'utf8');
    log(`SAPI: synthesizing ${jobs.length} lines`);
    await run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'scripts', 'tts.ps1'), '-JobsFile', jobsFile]);
  }
  for (const it of items) {
    if (fs.existsSync(it.fx)) continue;
    const srcRate = readWav(it.raw).rate;
    const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02';
    const af = [
      trim, 'areverse', trim, 'areverse',
      `asetrate=${Math.round(srcRate * it.v.pitch)}`, `aresample=${RATE}`,
      `atempo=${(it.v.speed / it.v.pitch).toFixed(4)}`,
      'highpass=f=80', 'loudnorm=I=-16:TP=-1.5:LRA=7',
      `aresample=${RATE}`,
    ].join(',');
    await run('ffmpeg', ['-y', '-v', 'error', '-i', it.raw, '-af', af, '-ac', '1', '-ar', String(RATE), '-c:a', 'pcm_s16le', it.fx]);
  }
  return items.map((it) => it.fx);
}

// ---------- 2. timeline + mouth envelopes ----------
function envelope(samples, rate) {
  const step = Math.round(rate / FPS);
  const env = [];
  for (let i = 0; i < samples.length; i += step) {
    let s = 0;
    const end = Math.min(samples.length, i + step);
    for (let j = i; j < end; j++) s += samples[j] * samples[j];
    env.push(Math.sqrt(s / Math.max(1, end - i)));
  }
  const sorted = [...env].sort((a, b) => a - b);
  const peak = sorted[Math.floor(sorted.length * 0.95)] || 1;
  const floor = peak * 0.12;
  // normalize, then quantize a bit so the mouth "chatters" like puppets do
  return env.map((v, i) => {
    const k = Math.max(0, Math.min(1, (v - floor) / (peak - floor)));
    const wobble = 0.75 + 0.25 * Math.abs(Math.sin(i * 1.7));
    return Number((Math.pow(k, 0.7) * wobble).toFixed(3));
  });
}

function buildTimeline(wavs) {
  let t = LEAD_IN;
  const lines = [];
  const voice = [];
  for (let i = 0; i < wavs.length; i++) {
    const { samples } = readWav(wavs[i]);
    const dur = samples.length / RATE;
    lines.push({ ...episode.lines[i], start: t, end: t + dur, env: envelope(samples, RATE), envFps: FPS });
    voice.push({ at: t, samples });
    t += dur + GAP;
    if (episode.lines[i + 1]?.speaker === episode.lines[i].speaker) t += 0.2;
  }
  const duration = Math.ceil((t - GAP + TAIL) * FPS) / FPS;
  const mix = new Float32Array(Math.ceil(duration * RATE));
  for (const v of voice) mix.set(v.samples.subarray(0, mix.length - Math.round(v.at * RATE)), Math.round(v.at * RATE));
  const voiceFile = path.join(work, 'voice.wav');
  writeWav(voiceFile, mix, RATE);
  return { duration, lines, voiceFile };
}

// ---------- 3. background music (synthesized soft pluck loop) ----------
async function makeMusic(duration) {
  const file = path.join(work, 'music.wav');
  // C major pentatonic arpeggio over a I-vi-IV-V feel, 0.5 s per note
  const notes = [261.63, 329.63, 392.0, 523.25, 220.0, 261.63, 329.63, 440.0, 174.61, 220.0, 261.63, 349.23, 196.0, 246.94, 293.66, 392.0];
  const k = 'mod(floor(t*2),16)';
  let f = String(notes[notes.length - 1]);
  for (let i = notes.length - 2; i >= 0; i--) f = `if(eq(${k},${i}),${notes[i]},${f})`;
  const env = 'exp(-5*mod(t,0.5))';
  const expr = `0.22*${env}*(sin(2*PI*(${f})*t)+0.3*sin(4*PI*(${f})*t))+0.04*sin(2*PI*65.41*t)*(0.6+0.4*sin(2*PI*0.125*t))`;
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `aevalsrc='${expr}':s=${RATE}:d=${duration.toFixed(3)}`,
    '-af', `lowpass=f=2500,aecho=0.8:0.6:180:0.3,afade=t=in:d=1,afade=t=out:st=${Math.max(0, duration - 1.5).toFixed(2)}:d=1.5`,
    '-ac', '1', '-c:a', 'pcm_s16le', file]);
  return file;
}

// ---------- 4. frames -> video ----------
async function renderVideo(timeline, musicFile) {
  const total = Math.min(Math.round(timeline.duration * FPS), maxFrames);
  const silent = path.join(work, 'video.mp4');
  const stage = await openStage({ mode: 'video', width: W, height: H, timeline, guest: episode.guest });
  const enc = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => enc.on('close', (c) => (c === 0 ? res() : rej(new Error(`encoder exited ${c}`)))));
  for (let f = 0; f < total; f++) {
    const img = await stage.frame(f / FPS);
    if (!enc.stdin.write(img)) await new Promise((r) => enc.stdin.once('drain', r));
    if (f % 150 === 0) log(`frame ${f}/${total}`);
  }
  enc.stdin.end();
  await done;
  await stage.close();

  const final = path.join(outDir, `${id}.mp4`);
  const dur = (total / FPS).toFixed(3);
  await run('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', timeline.voiceFile, '-i', musicFile,
    '-filter_complex', '[2:a]volume=0.12[m];[1:a][m]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]',
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', String(RATE), '-t', dur,
    '-movflags', '+faststart', final]);
  return final;
}

// ---------- 5. thumbnail ----------
async function renderThumbnail() {
  const stage = await openStage({ mode: 'thumbnail', width: 1280, height: 720, guest: episode.guest, thumbnailText: episode.thumbnailText });
  const png = await stage.frame(1.0, 'png');
  await stage.close();
  const file = path.join(outDir, `${id}-thumbnail.png`);
  fs.writeFileSync(file, png);
  return file;
}

// ---------- 6. description ----------
function writeDescription() {
  const file = path.join(outDir, `${id}-description.txt`);
  const text = [
    episode.title,
    '',
    episode.description || '',
    CHANNEL_DESC,
    '',
    'Fuentes:',
    ...episode.sources.map((s) => `- ${s}`),
    '',
    ['#Shorts', '#historia', ...(episode.hashtags || [])].join(' '),
    '',
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
  fs.writeFileSync(file, text, 'utf8');
  return file;
}

if (args.includes('--thumbnail-only')) {
  console.log(await renderThumbnail());
  process.exit(0);
}
const wavs = await makeVoices();
log('voices ready');
const timeline = buildTimeline(wavs);
fs.writeFileSync(path.join(work, 'timeline.json'), JSON.stringify({ ...timeline, lines: timeline.lines.map(({ env, ...l }) => l) }, null, 2));
log(`timeline: ${timeline.duration.toFixed(2)}s, ${timeline.lines.length} lines`);
if (args.includes('--stills')) {
  // quick look: one still per line (mid-line) into build/<id>/stills
  const dir = path.join(work, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  const stage = await openStage({ mode: 'video', width: W, height: H, timeline, guest: episode.guest });
  for (const [i, l] of timeline.lines.entries()) fs.writeFileSync(path.join(dir, `line${String(i).padStart(2, '0')}.jpg`), await stage.frame((l.start + l.end) / 2));
  await stage.close();
  log(`stills in ${dir}`);
  process.exit(0);
}
const music = await makeMusic(timeline.duration);
log('music ready');
const video = await renderVideo(timeline, music);
log(`video: ${video}`);
const thumb = await renderThumbnail();
log(`thumbnail: ${thumb}`);
log(`description: ${writeDescription()}`);
log('done');
