// Real media on the board: `"board": { "scene": "media", "image" | "clip": ..., "credit", "title", ... }`.
// - image: a local photo (jpg/png/webp) under assets/media/, fitted cover/contain with a slow Ken Burns zoom.
// - clip: a local short video. build-audio.mjs pre-extracts it to a 30 fps JPEG sequence (board.frames) and the
//   scene shows frame floor(u * fps), so every frame is a pure function of timeline time (seek-safe). A <video>
//   element cannot be used here: the board is a 2D canvas uploaded as a WebGL texture, and HyperFrames only makes
//   DOM <video> elements frame-accurate (it swaps them for extracted frames at capture time).
// Images are preloaded once; stage.js registers the promise as window.__hf.buildReady so the renderer waits for
// every photo/frame before capturing. Paths are relative to the hf-template root (works from compositions/ too).
import { CHALK, YELLOW, text, ease, prog, clamp } from './chalk.js';

const ROOT = new URL('../../', import.meta.url);
const CACHE = new Map(); // src -> HTMLImageElement (complete) | Error

/** Every image URL the board of these lines/boards needs (photos + clip frames). */
export function mediaSources(boards) {
  const out = new Set();
  for (const b of boards) {
    if (!b || typeof b !== 'object' || b.scene !== 'media') continue;
    if (b.image) out.add(b.image);
    if (b.clip) {
      if (!b.frames) throw new Error(`Board clip "${b.clip}" has no extracted frames: run scripts/build-audio.mjs`);
      for (let i = 1; i <= b.frames.count; i++) out.add(frameSrc(b.frames, i));
    }
  }
  return [...out];
}

function frameSrc(frames, i) {
  return `${frames.dir}/${String(i).padStart(4, '0')}.jpg`;
}

/** Loads + decodes every source; resolves when all are ready (failures are recorded and drawn as a warning). */
export function preloadMedia(srcs) {
  return Promise.all(srcs.map((src) => {
    if (CACHE.has(src)) return null;
    const img = new Image();
    img.decoding = 'sync';
    img.src = new URL(src, ROOT).href;
    return img.decode()
      .then(() => CACHE.set(src, img))
      .catch(() => { CACHE.set(src, new Error(src)); console.error(`[board media] failed to load ${src}`); });
  }));
}

const ready = (src) => { const v = CACHE.get(src); return v && !(v instanceof Error) ? v : null; };

/** Draws img into the rect (x, y, w, h), cover or contain, zoomed by `zoom` around focus [fx, fy] (0..1). */
function drawFitted(g, img, x, y, w, h, fit, zoom, [fx, fy]) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const base = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
  const s = base * zoom;
  const dw = iw * s, dh = ih * s;
  // Keep the focus point fixed while zooming; for cover, never reveal an edge.
  let dx = x + (w - dw) * fx, dy = y + (h - dh) * fy;
  if (dw >= w) dx = clamp(dx, x + w - dw, x); else dx = x + (w - dw) / 2;
  if (dh >= h) dy = clamp(dy, y + h - dh, y); else dy = y + (h - dh) / 2;
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#0c0d12'; g.fillRect(x, y, w, h);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(img, dx, dy, dw, dh);
  g.restore();
}

/** Shrinks the font so the string fits maxW. */
function fitSize(g, str, size, maxW) {
  g.save(); g.font = `900 ${size}px "HC Display", "Arial Black", sans-serif`;
  const w = g.measureText(str).width; g.restore();
  return w > maxW ? size * maxW / w : size;
}

/**
 * media: a real photo or short clip filling the board, with an optional title band and a credit line.
 * params: { image | clip, frames (build-generated for clips), fit: 'cover'|'contain' (default cover),
 *           zoom: Ken Burns end zoom (default 1.08 for photos, 1.0 for clips), focus: [x, y] 0..1 (default center),
 *           loop: true to loop a clip (default: hold the last frame), title, credit }
 */
function media(g, W, H, u, d, p) {
  const M = 22; // frame margin
  const CREDIT_H = p.credit ? 58 : 0;
  const x = M, y = M, w = W - 2 * M, h = H - 2 * M - CREDIT_H;
  let src = p.image;
  if (p.clip && p.frames) {
    const n = p.frames.count;
    const f = Math.floor(Math.max(0, u) * p.frames.fps + 1e-6);
    src = frameSrc(p.frames, (p.loop ? f % n : Math.min(f, n - 1)) + 1);
  }
  const img = src ? ready(src) : null;
  if (img) {
    const zEnd = p.zoom ?? (p.clip ? 1.0 : 1.08);
    const k = ease(clamp(u / Math.max(1, d + 0.6)));
    drawFitted(g, img, x, y, w, h, p.fit === 'contain' ? 'contain' : 'cover', 1 + (zEnd - 1) * k, p.focus ?? [0.5, 0.5]);
  } else { // never silently blank: a missing file is loud on the board too
    g.fillStyle = '#300'; g.fillRect(x, y, w, h);
    text(g, `FALTA: ${src ?? '(sin archivo)'}`, W / 2, H / 2, fitSize(g, `FALTA: ${src}`, 40, w - 40), '#ff8080');
  }
  // thin frame so the photo reads as "on the board"
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 6; g.strokeRect(x, y, w, h);
  if (p.title) {
    const a = prog(u, 0.3, 0.35);
    const bandH = 92, by = y + h - bandH - 16;
    g.save(); g.globalAlpha = 0.78 * a; g.fillStyle = '#0c0d12'; g.fillRect(x, by, w, bandH); g.restore();
    text(g, p.title, W / 2, by + bandH / 2 + 2, fitSize(g, p.title, 60, w - 60), YELLOW, a);
  }
  if (p.credit) {
    g.fillStyle = '#0c0d12'; g.fillRect(0, H - M - CREDIT_H, W, CREDIT_H + M);
    text(g, p.credit, W - M - 6, H - M - CREDIT_H / 2, fitSize(g, p.credit, 34, w - 20), CHALK, 0.92, 'right');
  }
}

export const SCENES_MEDIA = { media };
