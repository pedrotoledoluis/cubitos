// Builds all audio for an episode and the timeline the compositions read.
// Usage: node scripts/build-audio.mjs episodes/NNN-slug.json
// 1. Voices per line, cached by hash:
//    profe = Kokoro em_alex (via `npx hyperframes tts`) + ep2 treatment
//    tito  = Windows SAPI "Microsoft Sabina Desktop" (scripts/tts.ps1) + episode-1 pitch/tempo treatment
// 2. Timeline from measured durations + per-frame mouth envelopes + caption pages (max 3 lines each)
// 3. Synthesized BGM bed + SFX, sidechain-ducked under voices, master loudnorm -15 LUFS
// Output: assets/audio/mix.wav, src/episode-data.js (window.EPISODE), index.html durations
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const epArg = process.argv[2];
if (!epArg) { console.error('Usage: node scripts/build-audio.mjs episodes/NNN-slug.json'); process.exit(1); }
const ep = JSON.parse(fs.readFileSync(path.resolve(epArg), 'utf8'));
const WORK = path.join(ROOT, '.build', 'audio');
const OUT = path.join(ROOT, 'assets', 'audio');
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const FPS = 30;
const RATE = 48000;
const LEAD_IN = 0.45;
const GAP = ep.gap ?? 0.25; // keep pacing snappy; episodes that come in under 60 s may raise `gap` slightly
const TAIL = 1.4;
const MASTER_LUFS = -15;
const CAPTION_PAGE_CHARS = 62; // ~3 lines at 72px Arial Black in 88% of 1080px
const BUNDLED_SFX = findBundledSfx();
const TIMEOUT = 180000; // per external command

// HyperFrames ships SFX mp3s inside its npm package; find them in the npx cache (or HYPERFRAMES_SFX_DIR).
function findBundledSfx() {
  if (process.env.HYPERFRAMES_SFX_DIR) return process.env.HYPERFRAMES_SFX_DIR;
  const rel = path.join('node_modules', 'hyperframes', 'dist', 'skills', 'media-use', 'audio', 'assets', 'sfx');
  const npx = path.join(process.env.LOCALAPPDATA ?? path.join(process.env.HOME ?? '', '.npm'), 'npm-cache', '_npx');
  const roots = fs.existsSync(npx) ? fs.readdirSync(npx).map((d) => path.join(npx, d, rel)) : [];
  return roots.find((d) => fs.existsSync(path.join(d, 'whoosh.mp3'))) ?? rel;
}

// Voice engine + post FX per character.
const VOICES = {
  profe: { engine: 'kokoro', voice: 'em_alex', speed: 0.95, pitch: 0.93, tempo: 1.0, trimDb: -45, eq: true }, // ep2
  nova: { engine: 'kokoro', voice: 'ef_dora', speed: 1.08, pitch: 1.05, tempo: 1.0, trimDb: -45, eq: true }, // bright, quick
  tito: { engine: 'sapi', voice: 'Microsoft Sabina Desktop', sapiRate: 1, pitch: 1.22, tempo: 1.05, trimDb: -50, eq: false }, // ep1
};

const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: cmd === 'npx', timeout: TIMEOUT, windowsHide: true }).toString();
const ff = (args) => sh('ffmpeg', ['-y', '-v', 'error', ...args]);
const dur = (f) => Number(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim());
const srcRate = (f) => Number(sh('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', f]).trim());

function readPcm(file) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', String(RATE), '-'], { timeout: TIMEOUT, maxBuffer: 1 << 28, windowsHide: true });
  const out = new Float32Array(buf.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = buf.readInt16LE(i * 2) / 32768;
  return out;
}

function envelope(samples) {
  const step = RATE / FPS;
  const env = [];
  for (let i = 0; i * step < samples.length; i++) {
    let s = 0, n = 0;
    for (let j = Math.floor(i * step); j < Math.min(samples.length, (i + 1) * step); j++) { s += samples[j] ** 2; n++; }
    env.push(Math.sqrt(s / Math.max(1, n)));
  }
  const peak = Math.max(...env, 1e-6);
  return env.map((v) => Math.round(Math.min(1, Math.max(0, (v / peak - 0.08) * 1.5)) * 100) / 100);
}

/** Splits caption text into pages of <= max chars at sentence, then comma, then word boundaries. Concatenation == text. */
export function captionPages(textIn, max = CAPTION_PAGE_CHARS) {
  if (textIn.length <= max) return [textIn];
  const parts = textIn.match(/[^.!?…]+[.!?…]+["”»]?\s*|[^.!?…]+$/g) ?? [textIn];
  const pages = [];
  for (const part of parts) {
    const last = pages.length ? pages[pages.length - 1] : null;
    if (last !== null && (last + part).trim().length <= max) pages[pages.length - 1] = last + part;
    else pages.push(part);
  }
  // Further split any page still too long at commas / spaces.
  const out = [];
  for (const pg of pages) {
    let rest = pg;
    while (rest.trim().length > max) {
      let cut = rest.lastIndexOf(', ', max);
      if (cut < max * 0.4) cut = rest.lastIndexOf(' ', max); else cut += 1;
      out.push(rest.slice(0, cut + 1));
      rest = rest.slice(cut + 1);
    }
    out.push(rest);
  }
  return out.map((p) => p.trim()).filter(Boolean);
}

// ---------- 1. voices ----------
const items = ep.lines.map((line, i) => {
  const v = VOICES[line.speaker];
  if (!v) throw new Error(`Unknown speaker "${line.speaker}" in line ${i + 1}`);
  const say = line.say ?? line.text;
  const hash = crypto.createHash('sha1').update(JSON.stringify([line.speaker, say, v])).digest('hex').slice(0, 10);
  const base = path.join(WORK, `${line.speaker}-${hash}`);
  return { line, v, say, raw: `${base}.raw.wav`, fx: `${base}.wav` };
});

// Kokoro lines, one CLI call each.
for (const it of items.filter((x) => x.v.engine === 'kokoro' && !fs.existsSync(x.raw))) {
  console.log(`kokoro: ${it.say.slice(0, 50)}`);
  sh('npx', ['hyperframes', 'tts', JSON.stringify(it.say), '-v', it.v.voice, '-l', 'es', '-s', String(it.v.speed), '-o', JSON.stringify(it.raw)]);
}
// SAPI lines, one PowerShell batch.
const sapiJobs = items.filter((x) => x.v.engine === 'sapi' && !fs.existsSync(x.raw)).map((x) => ({ text: x.say, out: x.raw, rate: x.v.sapiRate }));
if (sapiJobs.length) {
  const jobsFile = path.join(WORK, 'sapi-jobs.json');
  fs.writeFileSync(jobsFile, JSON.stringify(sapiJobs), 'utf8');
  console.log(`sapi: ${sapiJobs.length} lines`);
  sh('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'scripts', 'tts.ps1'), '-JobsFile', jobsFile, '-Voice', VOICES.tito.voice]);
}
for (const it of items) {
  if (fs.existsSync(it.fx)) continue;
  const { v } = it;
  const trim = `silenceremove=start_periods=1:start_threshold=${v.trimDb}dB:start_silence=0.02`;
  const af = [
    trim, 'areverse', trim, 'areverse',
    `asetrate=${Math.round(srcRate(it.raw) * v.pitch)}`, `aresample=${RATE}`, `atempo=${(v.tempo / v.pitch).toFixed(4)}`,
    v.eq ? 'highpass=f=90,equalizer=f=3500:t=q:w=1:g=2' : 'highpass=f=80',
    'loudnorm=I=-16:TP=-1.5:LRA=7', `aresample=${RATE}`,
  ].join(',');
  ff(['-i', it.raw, '-af', af, '-ac', '1', '-ar', String(RATE), '-c:a', 'pcm_s16le', it.fx]);
}
const voiceFiles = items.map((x) => x.fx);

// ---------- 2. timeline ----------
// Locations are sticky: a line's `location` applies until another line changes it (default: first of
// ep.locations, else 'office'). Costume: ep.costume from line ep.costumeFrom (1-based, default 1) onward;
// a line's `costume` overrides that line only. Changes get automatic SFX (whoosh / pop).
let t = LEAD_IN;
let location = ep.locations?.[0] ?? 'office';
let prevLocation = null, prevCostume = null;
const lines = ep.lines.map((line, i) => {
  const d = dur(voiceFiles[i]);
  const start = +t.toFixed(3), end = +(t + d).toFixed(3);
  // caption pages timed by character share of the line
  const texts = captionPages(line.text);
  const total = texts.reduce((a, s) => a + s.length, 0);
  let acc = 0;
  const pages = texts.map((s) => { const pg = { text: s, start: +(start + (acc / total) * d).toFixed(3) }; acc += s.length; return pg; });
  location = line.location ?? location;
  const costume = line.costume ?? (ep.costume && i + 1 >= (ep.costumeFrom ?? 1) ? ep.costume : 'none');
  const locationChanged = prevLocation !== null && location !== prevLocation;
  const costumeChanged = prevCostume !== null && costume !== prevCostume && line.poof !== false;
  const sfx = [...(line.sfx ?? [])];
  if (locationChanged) sfx.push(['whoosh', 0]);
  if (costumeChanged) sfx.push(['pop', ep.costumePoofAt ?? 0.45]);
  prevLocation = location; prevCostume = costume;
  const entry = {
    i, speaker: line.speaker, text: line.text, pages, shot: line.shot ?? null, board: line.board ?? null,
    emotion: line.emotion ?? null, titoEmotion: line.titoEmotion ?? null, novaEmotion: line.novaEmotion ?? null, pose: line.pose ?? null, profePose: line.profePose ?? null,
    profeEmotion: line.profeEmotion ?? null, dutch: !!line.dutch, start, end,
    location, locationChanged, costume, costumeChanged, props: line.props ?? [], profeProp: line.profeProp ?? null, titoProp: line.titoProp ?? ep.titoProp ?? null,
    envFps: FPS, env: envelope(readPcm(voiceFiles[i])), sfx,
  };
  t += d + GAP + (line.holdAfter ?? 0) + (line.board ? 0.2 : 0) + (ep.lines[i + 1]?.location && ep.lines[i + 1].location !== location ? 0.3 : 0);
  return entry;
});
const duration = +(lines.at(-1).end + TAIL).toFixed(3);
fs.writeFileSync(path.join(ROOT, 'src', 'episode-data.js'),
  `// Generated by scripts/build-audio.mjs from ${path.basename(epArg)}. Do not edit.\nwindow.EPISODE = ${JSON.stringify({
    id: ep.id, title: ep.title, thumbnailText: ep.thumbnailText, thumbnailBoard: ep.thumbnailBoard ?? null,
    thumbnailLocation: ep.thumbnailLocation ?? null, thumbnailPose: ep.thumbnailPose ?? null, thumbnailProp: ep.thumbnailProp ?? null, thumbnailTitoEmotion: ep.thumbnailTitoEmotion ?? null,
    thumbnailBadge: ep.thumbnailBadge ?? null, titoProp: ep.titoProp ?? null, costume: ep.costume ?? 'none', costumePoofAt: ep.costumePoofAt ?? 0.45, duration, fps: FPS, lines,
  })};\n`);
console.log(`timeline: ${lines.length} lines, ${duration}s`);

// ---------- 3. BGM + SFX ----------
const music = path.join(WORK, `music-${duration.toFixed(3)}.wav`);
if (!fs.existsSync(music)) {
  // Light pizzicato-ish arpeggio (C major pentatonic, I-vi-IV-V), 0.25 s steps, with a soft bass pulse.
  const notes = [261.63, 329.63, 392.0, 523.25, 220.0, 261.63, 329.63, 440.0, 174.61, 220.0, 261.63, 349.23, 196.0, 246.94, 293.66, 392.0];
  const k = 'mod(floor(t*4),16)';
  let f = String(notes.at(-1));
  for (let i = notes.length - 2; i >= 0; i--) f = `if(eq(${k},${i}),${notes[i]},${f})`;
  const env = 'exp(-9*mod(t,0.25))';
  const bass = 'if(lt(mod(t,4),1),65.41,if(lt(mod(t,4),2),55.0,if(lt(mod(t,4),3),43.65,49.0)))';
  const expr = `0.2*${env}*(sin(2*PI*(${f})*t)+0.25*sin(4*PI*(${f})*t))+0.12*exp(-4*mod(t,0.5))*sin(2*PI*(${bass})*t)`;
  ff(['-f', 'lavfi', '-i', `aevalsrc='${expr}':s=${RATE}:d=${duration.toFixed(3)}`, '-af',
    `lowpass=f=3000,aecho=0.8:0.5:120:0.25,afade=t=in:d=0.8,afade=t=out:st=${(duration - 1.6).toFixed(2)}:d=1.6`,
    '-ac', '1', '-c:a', 'pcm_s16le', music]);
}

const SYNTH = {
  boing: "aevalsrc='0.6*exp(-5*t)*sin(2*PI*(180+120*exp(-6*t)*cos(2*PI*9*t))*t)':s=48000:d=0.7",
  squeak: "aevalsrc='0.4*sin(PI*t/0.18)*sin(2*PI*(1800+2600*t/0.18)*t)':s=48000:d=0.18",
  hooves: "aevalsrc='0.7*exp(-60*mod(t,0.12))*(lt(mod(t,0.48),0.36))*sin(2*PI*240*t)+0.08*sin(2*PI*55*t)*sin(2*PI*7*t)':s=48000:d=1.6",
  // short plucked fiddle phrase
  fiddle: "aevalsrc='0.35*exp(-6*mod(t,0.2))*sin(2*PI*(if(lt(mod(t,0.8),0.2),660,if(lt(mod(t,0.8),0.4),784,if(lt(mod(t,0.8),0.6),880,784))))*t)':s=48000:d=1.6",
  // sea wave: filtered noise swell
  wave: "anoisesrc=d=1.6:c=pink:a=0.5,afade=t=in:d=0.6,afade=t=out:st=0.8:d=0.8,lowpass=f=900",
  // ding for a reveal
  ding: "aevalsrc='0.45*exp(-4*t)*(sin(2*PI*1320*t)+0.4*sin(2*PI*2640*t))':s=48000:d=1.0",
};
function sfxFile(name) {
  const out = path.join(WORK, `sfx-${name}.wav`);
  if (fs.existsSync(out)) return out;
  if (SYNTH[name]) {
    const src = SYNTH[name];
    if (src.startsWith('anoisesrc')) ff(['-f', 'lavfi', '-i', src.split(',')[0], '-af', src.split(',').slice(1).join(','), '-ar', String(RATE), '-ac', '1', '-c:a', 'pcm_s16le', out]);
    else ff(['-f', 'lavfi', '-i', src, '-ac', '1', '-c:a', 'pcm_s16le', out]);
  } else ff(['-i', path.join(BUNDLED_SFX, `${name}.mp3`), '-ac', '1', '-ar', String(RATE), '-c:a', 'pcm_s16le', out]);
  return out;
}

// ---------- 4. mix ----------
const inputs = [];
const filters = [];
const voiceLabels = [];
lines.forEach((l, i) => {
  inputs.push('-i', voiceFiles[i]);
  const ms = Math.round(l.start * 1000);
  filters.push(`[${inputs.length / 2 - 1}:a]adelay=${ms}|${ms},apad=whole_dur=${duration}[v${i}]`);
  voiceLabels.push(`[v${i}]`);
});
filters.push(`${voiceLabels.join('')}amix=inputs=${voiceLabels.length}:normalize=0,asplit=2[vox][key]`);
inputs.push('-i', music);
const mIdx = inputs.length / 2 - 1;
filters.push(`[${mIdx}:a]volume=0.55[bgm0]`, '[bgm0][key]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=400[bgm]');
const sfxLabels = [];
lines.forEach((l) => l.sfx.forEach(([name, off]) => {
  inputs.push('-i', sfxFile(name));
  const idx = inputs.length / 2 - 1;
  const ms = Math.round((l.start + off) * 1000);
  const vol = { whoosh: 0.35, pop: 0.45, squeak: 0.3, boing: 0.35, hooves: 0.35, fiddle: 0.35, wave: 0.4, ding: 0.3 }[name] ?? 0.35;
  filters.push(`[${idx}:a]volume=${vol},adelay=${ms}|${ms},apad=whole_dur=${duration}[s${idx}]`);
  sfxLabels.push(`[s${idx}]`);
}));
filters.push(`[vox][bgm]${sfxLabels.join('')}amix=inputs=${2 + sfxLabels.length}:normalize=0,atrim=0:${duration}[pre]`);
const pre = path.join(WORK, 'premix.wav');
ff([...inputs, '-filter_complex', filters.join(';'), '-map', '[pre]', '-ac', '2', '-ar', String(RATE), '-c:a', 'pcm_s16le', pre]);
// Two-pass loudnorm so the master lands on MASTER_LUFS.
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', pre, '-af', `loudnorm=I=${MASTER_LUFS}:TP=-1.5:LRA=9:print_format=json`, '-f', 'null', '-'],
  { timeout: TIMEOUT, windowsHide: true, encoding: 'utf8' }).stderr; // loudnorm prints its JSON to stderr
const m = JSON.parse(probe.slice(probe.lastIndexOf('{'), probe.lastIndexOf('}') + 1));
const mix = path.join(OUT, 'mix.wav');
ff(['-i', pre, '-af', `loudnorm=I=${MASTER_LUFS}:TP=-1.5:LRA=9:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=${RATE}`,
  '-ac', '2', '-ar', String(RATE), '-c:a', 'pcm_s16le', mix]);
console.log(`mix: ${mix} (${dur(mix).toFixed(2)}s)`);

// Keep the composition's root and audio durations in sync with the measured timeline.
const indexFile = path.join(ROOT, 'index.html');
fs.writeFileSync(indexFile, fs.readFileSync(indexFile, 'utf8').replace(/data-duration="[\d.]+"/g, `data-duration="${duration}"`));
console.log(`index.html duration -> ${duration}s`);
