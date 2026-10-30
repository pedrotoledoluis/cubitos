// Board scenes for episodes 11+ (modern topics). Registered from scenes.js.
// Same contract: scene(g, W, H, u, d, params), deterministic (no Math.random / clocks).
// Icons here are emoji glyphs (`emoji` params), drawn with the system color-emoji font.
import { CHALK, CHALK_DIM, YELLOW, RED, BLUE, GREEN, ORANGE, chalkStyle, drawPath, text, pop, ease, backOut, prog, hash } from './chalk.js';

const EMOJI_FONT = '"Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif';

/** Draws an emoji glyph centered at (x, y) with a pop-in scale k. */
export function emoji(g, ch, x, y, size, k = 1, rot = 0) {
  if (!ch || k <= 0) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(k, k);
  g.font = `${size}px ${EMOJI_FONT}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(ch, 0, 0);
  g.restore();
}

/** Text that shrinks to fit maxW. */
function fitText(g, str, x, y, size, color, alpha, maxW) {
  g.save(); g.font = `900 ${size}px "HC Display", "Arial Black", sans-serif`;
  const w = g.measureText(str).width; g.restore();
  text(g, str, x, y, w > maxW ? size * maxW / w : size, color, alpha);
}

/** One big number/word with an emoji. params: title, value, label, emoji, color, sub. */
function bigStat(g, W, H, u, d, p) {
  fitText(g, p.title ?? '', W / 2, 90, 66, YELLOW, prog(u, 0.2, 0.4), W - 120);
  emoji(g, p.emoji, W / 2, 300, 190, backOut(prog(u, 0.3, 0.5)), Math.sin(u * 2) * 0.06);
  const k = backOut(prog(u, 0.8, 0.5));
  pop(g, W / 2, 560, k, () => fitText(g, String(p.value ?? ''), 0, 0, 170, p.color ?? GREEN, 1, W - 140));
  fitText(g, p.label ?? '', W / 2, 720, 58, CHALK, prog(u, 1.2, 0.4), W - 140);
  if (p.sub) fitText(g, p.sub, W / 2, 810, 44, CHALK_DIM, prog(u, 1.6, 0.4), W - 140);
}

/** Bar chart. params: title, items [{label, value, color, display}], max, unit. */
function bars(g, W, H, u, d, p) {
  const items = p.items ?? [];
  const max = p.max ?? Math.max(...items.map((i) => i.value), 1);
  fitText(g, p.title ?? '', W / 2, 90, 64, YELLOW, prog(u, 0.2, 0.4), W - 120);
  const n = items.length, gap = 40, bw = Math.min(260, (W - 160 - gap * (n - 1)) / n), x0 = (W - (bw * n + gap * (n - 1))) / 2;
  const base = 720, top = 210;
  chalkStyle(g, CHALK_DIM, 5); drawPath(g, [[70, base], [W - 70, base]], prog(u, 0.2, 0.4), 3);
  items.forEach((it, i) => {
    const k = ease(prog(u, 0.5 + i * 0.35, 0.8));
    const h = (base - top) * (it.value / max) * k;
    const x = x0 + i * (bw + gap);
    g.fillStyle = it.color ?? [BLUE, ORANGE, GREEN, RED][i % 4];
    g.fillRect(x, base - h, bw, h);
    fitText(g, it.display ?? String(Math.round(it.value * k)) + (p.unit ?? ''), x + bw / 2, base - h - 40, 56, CHALK, k, bw + 30);
    fitText(g, it.label ?? '', x + bw / 2, base + 60, 42, CHALK, prog(u, 0.5 + i * 0.35, 0.4), bw + 30);
    if (it.emoji) emoji(g, it.emoji, x + bw / 2, base - h - 110, 80, backOut(prog(u, 1.0 + i * 0.35, 0.4)));
  });
}

/** Row/flow of emoji with labels. params: title, items [{emoji, label, cross}], arrows (bool), bottom. */
function emojiRow(g, W, H, u, d, p) {
  const items = p.items ?? [];
  fitText(g, p.title ?? '', W / 2, 90, 64, YELLOW, prog(u, 0.2, 0.4), W - 120);
  const n = items.length, step = (W - 160) / n;
  const size = Math.min(200, step * 0.72);
  const per = Math.min(0.7, Math.max(0.3, (d - 1.2) / Math.max(1, n)));
  items.forEach((it, i) => {
    const x = 80 + step * (i + 0.5), y = 400;
    const k = backOut(prog(u, 0.4 + i * per, 0.45));
    emoji(g, it.emoji, x, y + Math.sin(u * 3 + i) * 6, size, k);
    fitText(g, it.label ?? '', x, y + size * 0.5 + 70, 46, it.color ?? CHALK, prog(u, 0.5 + i * per, 0.3), step - 10);
    if (it.cross) {
      const c = prog(u, 0.9 + i * per, 0.35);
      chalkStyle(g, RED, 14);
      drawPath(g, [[x - size * 0.45, y - size * 0.45], [x + size * 0.45, y + size * 0.45]], c, 7 + i);
      drawPath(g, [[x + size * 0.45, y - size * 0.45], [x - size * 0.45, y + size * 0.45]], prog(u, 1.1 + i * per, 0.35), 9 + i);
    }
    if (p.arrows && i < n - 1) {
      const a = prog(u, 0.7 + i * per, 0.3);
      if (a > 0) { chalkStyle(g, YELLOW, 8); drawPath(g, [[x + size * 0.48, y], [x + size * 0.48 + (step - size * 0.96) * a, y]], 1, i); }
    }
  });
  if (p.bottom) fitText(g, p.bottom, W / 2, 800, 54, p.bottomColor ?? GREEN, prog(u, 0.6 + n * per, 0.4), W - 140);
}

/** Price chart that draws itself. params: title, points [numbers], color, label, crash (index where it turns red). */
function ticker(g, W, H, u, d, p) {
  const pts = p.points ?? [10, 14, 12, 18, 16, 24, 20, 30];
  fitText(g, p.title ?? '', W / 2, 90, 64, YELLOW, prog(u, 0.2, 0.4), W - 120);
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const X = (i) => 110 + i * (W - 220) / (pts.length - 1), Y = (v) => 740 - (v - lo) / (hi - lo || 1) * 520;
  chalkStyle(g, CHALK_DIM, 3);
  for (let i = 0; i < 4; i++) drawPath(g, [[90, 220 + i * 173], [W - 90, 220 + i * 173]], 1, i);
  const k = ease(prog(u, 0.4, Math.max(1.2, d * 0.6))) * (pts.length - 1);
  for (let i = 0; i < Math.ceil(k) && i < pts.length - 1; i++) {
    const f = Math.min(1, k - i);
    const up = pts[i + 1] >= pts[i];
    chalkStyle(g, p.color ?? (up ? GREEN : RED), 10);
    drawPath(g, [[X(i), Y(pts[i])], [X(i) + (X(i + 1) - X(i)) * f, Y(pts[i]) + (Y(pts[i + 1]) - Y(pts[i])) * f]], 1, i);
  }
  if (p.emoji) {
    const i = Math.min(pts.length - 1, Math.floor(k)), f = Math.min(1, k - i), j = Math.min(pts.length - 1, i + 1);
    emoji(g, p.emoji, X(i) + (X(j) - X(i)) * f, Y(pts[i]) + (Y(pts[j]) - Y(pts[i])) * f - 70, 100, backOut(prog(u, 0.4, 0.4)));
  }
  if (p.label) fitText(g, p.label, W / 2, 815, 50, CHALK, prog(u, d * 0.6, 0.4), W - 140);
}

/** European roulette: 37 pockets (one green zero), spinning, ball lands on 0. params: title, label. */
function roulette(g, W, H, u, d, p) {
  fitText(g, p.title ?? '', W / 2, 90, 64, YELLOW, prog(u, 0.2, 0.4), W - 120);
  const cx = W / 2 - 180, cy = 470, R = 280, k = backOut(prog(u, 0.2, 0.5));
  const spin = 5 * ease(prog(u, 0.3, Math.max(2, d - 1)));
  g.save(); g.translate(cx, cy); g.scale(k, k); g.rotate(spin * 2.2);
  for (let i = 0; i < 37; i++) {
    const a0 = i / 37 * Math.PI * 2, a1 = (i + 1) / 37 * Math.PI * 2;
    g.fillStyle = i === 0 ? '#2fa85a' : i % 2 ? '#d33a32' : '#1a1a1a';
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0, a1); g.closePath(); g.fill();
  }
  g.fillStyle = '#7a5230'; g.beginPath(); g.arc(0, 0, R * 0.55, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e2b33c'; g.beginPath(); g.arc(0, 0, R * 0.12, 0, Math.PI * 2); g.fill();
  // ball sits on the zero pocket
  const za = 0.5 / 37 * Math.PI * 2;
  g.fillStyle = '#fff'; g.beginPath(); g.arc(Math.cos(za) * R * 0.8, Math.sin(za) * R * 0.8, 16, 0, Math.PI * 2); g.fill();
  g.restore();
  chalkStyle(g, CHALK, 6); g.beginPath(); g.arc(cx, cy, R * k + 8, 0, Math.PI * 2); g.stroke();
  const t = prog(u, 1.0, 0.4);
  text(g, '18', 1010, 300, 80, '#ff6b5e', t); text(g, '18', 1010, 420, 80, CHALK, t); text(g, '1', 1010, 540, 80, GREEN, t);
  fitText(g, 'ROJOS · NEGROS · CERO', 1010, 620, 30, CHALK, t, 320);
  if (p.label) fitText(g, p.label, W / 2, 815, 52, YELLOW, prog(u, 1.6, 0.4), W - 140);
}

/** Split comparison of two emoji with labels and a "vs". params: title, left {emoji,label,color}, right {...}, bottom. */
function emojiVs(g, W, H, u, d, p) {
  fitText(g, p.title ?? '', W / 2, 90, 64, YELLOW, prog(u, 0.2, 0.4), W - 120);
  const side = (s, x, at) => {
    if (!s) return;
    emoji(g, s.emoji, x, 380, 200, backOut(prog(u, at, 0.5)));
    fitText(g, s.label ?? '', x, 590, 56, s.color ?? CHALK, prog(u, at + 0.2, 0.4), 500);
  };
  side(p.left, 330, 0.4); side(p.right, W - 330, 1.0);
  text(g, 'VS', W / 2, 400, 90, ORANGE, prog(u, 0.8, 0.3));
  if (p.bottom) fitText(g, p.bottom, W / 2, 770, 54, p.bottomColor ?? GREEN, prog(u, 1.6, 0.4), W - 140);
}

/** Price tag going up. params: title, from, to, emoji, label. */
function priceUp(g, W, H, u, d, p) {
  fitText(g, p.title ?? '', W / 2, 90, 64, YELLOW, prog(u, 0.2, 0.4), W - 120);
  emoji(g, p.emoji ?? '💾', 300, 430, 220, backOut(prog(u, 0.3, 0.5)));
  text(g, p.from ?? '$', 800, 330, 110, CHALK, prog(u, 0.7, 0.3));
  chalkStyle(g, RED, 10); drawPath(g, [[700, 330], [900, 330]], prog(u, 0.9, 0.3), 2);
  pop(g, 800, 520, backOut(prog(u, 1.1, 0.5)), () => text(g, p.to ?? '$$$', 0, 0, 150, RED));
  emoji(g, '📈', 1080, 430, 130, backOut(prog(u, 1.4, 0.4)), Math.sin(u * 3) * 0.08);
  if (p.label) fitText(g, p.label, W / 2, 780, 52, CHALK, prog(u, 1.7, 0.4), W - 140);
}

export const SCENES_V5 = { bigStat, bars, emojiRow, ticker, roulette, emojiVs, priceUp };
