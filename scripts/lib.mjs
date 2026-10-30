// Shared helpers: process spawning, static server, WAV I/O, browser stage.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function run(cmd, args, { input, quiet = true } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => { err += d; if (!quiet) process.stderr.write(d); });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`))));
    if (input) p.stdin.end(input); else p.stdin.end();
  });
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };

export function startServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, url === '/' ? '/src/index.html' : url);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end();
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Browser: $CHROME_PATH, else puppeteer's bundled Chrome, else system Chrome/Edge.
function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try {
    const p = puppeteer.executablePath();
    if (p && fs.existsSync(p)) return p;
  } catch { /* not downloaded */ }
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) throw new Error('No Chromium browser found. Set CHROME_PATH or run `npx puppeteer browsers install chrome`.');
  return found;
}

// Opens the stage page at the given size and calls stage.init(config).
export async function openStage(config) {
  const server = await startServer();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findBrowser(),
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
    protocolTimeout: 600000,
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  await page.setViewport({ width: config.width, height: config.height, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load' });
  await page.waitForFunction('window.stageReady === true', { timeout: 60000 });
  await page.evaluate((c) => window.stage.init(c), config);
  return {
    page,
    async frame(t, type = 'jpeg') {
      await page.evaluate((tt) => window.stage.renderAt(tt), t);
      return page.screenshot({ type, quality: type === 'jpeg' ? 92 : undefined, optimizeForSpeed: true });
    },
    async close() { await browser.close(); server.close(); },
  };
}

// Minimal PCM16 WAV reader (mono or stereo -> mono float samples).
export function readWav(file) {
  const buf = fs.readFileSync(file);
  let off = 12, fmt = null, data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { channels: buf.readUInt16LE(off + 10), rate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    if (id === 'data') { data = buf.subarray(off + 8, off + 8 + size); break; }
    off += 8 + size + (size % 2);
  }
  if (!fmt || !data || fmt.bits !== 16) throw new Error(`Unsupported WAV: ${file}`);
  const n = Math.floor(data.length / 2 / fmt.channels);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < fmt.channels; c++) s += data.readInt16LE((i * fmt.channels + c) * 2);
    samples[i] = s / fmt.channels / 32768;
  }
  return { rate: fmt.rate, samples };
}

export function writeWav(file, samples, rate) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}
