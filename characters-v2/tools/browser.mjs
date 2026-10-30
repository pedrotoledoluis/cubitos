// Headless browser helpers for characters-v2 and branding-v2 (static server rooted at the project).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

export const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };

function startServer() {
  const server = http.createServer((req, res) => {
    const file = path.join(PROJECT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(PROJECT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const c = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ].find((p) => fs.existsSync(p));
  if (!c) throw new Error('No Chromium browser found; set CHROME_PATH');
  return c;
}

/** Opens a browser; shot(urlPath, {width,height,transparent,ready}) -> PNG buffer. */
export async function openBrowser() {
  const server = await startServer();
  const browser = await puppeteer.launch({
    headless: true, executablePath: findBrowser(), protocolTimeout: 600000,
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    async shot(urlPath, { width, height, transparent = false, ready = 'window.sheetReady === true', fullPage = false } = {}) {
      const page = await browser.newPage();
      page.on('pageerror', (e) => console.error('[page error]', e.message));
      page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
      await page.setViewport({ width: width || 800, height: height || 600, deviceScaleFactor: 1 });
      await page.goto(base + urlPath, { waitUntil: 'load' });
      await page.waitForFunction(ready, { timeout: 120000 });
      let buf;
      if (fullPage) {
        const dims = await page.evaluate(() => ({ w: document.querySelector('canvas').width, h: document.querySelector('canvas').height }));
        await page.setViewport({ width: dims.w, height: dims.h, deviceScaleFactor: 1 });
        await page.evaluate(() => window.drawFrame && window.drawFrame(Number(new URLSearchParams(location.search).get('t') ?? 1.3)));
        buf = await page.screenshot({ type: 'png', omitBackground: transparent, clip: { x: 0, y: 0, width: dims.w, height: dims.h } });
      } else {
        buf = await page.screenshot({ type: 'png', omitBackground: transparent });
      }
      await page.close();
      return buf;
    },
    async close() { await browser.close(); server.close(); },
  };
}
