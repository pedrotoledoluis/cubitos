// Chalk drawing primitives and reusable icons for board scenes.
// Everything is a pure function of its arguments (seeded jitter only), so any frame can be drawn in isolation.

export const CHALK = '#f3f0e4';
export const CHALK_DIM = 'rgba(243,240,228,0.35)';
export const YELLOW = '#ffe27a';
export const ORANGE = '#ff9a3c';
export const RED = '#ff6b5e';
export const BLUE = '#8ec5ff';
export const GREEN = '#9be08a';
export const PINK = '#ff9ecf';
const FONT = '"HC Display", "Arial Black", sans-serif';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (x) => { x = clamp(x); return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2; };
export const backOut = (x) => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
/** Progress 0..1 of a beat that starts at `a` seconds and lasts `len` seconds. */
export const prog = (u, a, len) => clamp((u - a) / len);
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

/**
 * Board surface. style: 'chalk' (green chalkboard, office), 'wood' (dark painted wooden sign),
 * 'poster' (dark newspaper billboard). All dark so chalk colors stay readable.
 */
export function background(g, W, H, style = 'chalk') {
  const pal = { chalk: ['#2f5a44', '#1b3a2b'], wood: ['#4f3420', '#2e1d10'], poster: ['#26344c', '#141d2e'], screen: ['#0f2e46', '#061220'], holo: ['#103c52', '#06161f'] }[style] ?? ['#2f5a44', '#1b3a2b'];
  const grd = g.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.75);
  grd.addColorStop(0, pal[0]);
  grd.addColorStop(1, pal[1]);
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  if (style === 'wood') { // plank seams
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = H / 5; y < H; y += H / 5) g.fillRect(0, y - 3, W, 6);
  }
  if (style === 'poster') { // newsprint border
    g.strokeStyle = 'rgba(241,234,216,0.5)'; g.lineWidth = 8; g.strokeRect(18, 18, W - 36, H - 36);
  }
  if (style === 'screen' || style === 'holo') { // monitor bezel glow + scanlines
    g.strokeStyle = style === 'holo' ? 'rgba(120,230,255,0.7)' : 'rgba(140,200,255,0.45)'; g.lineWidth = 10; g.strokeRect(14, 14, W - 28, H - 28);
    g.fillStyle = 'rgba(255,255,255,0.03)';
    for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 2);
    return;
  }
  for (let i = 0; i < 14; i++) { // old eraser smudges / wear
    g.fillStyle = 'rgba(255,255,255,0.035)';
    g.beginPath();
    g.ellipse(hash(i) * W, hash(i + 50) * H, 120 + hash(i + 9) * 160, 30 + hash(i + 3) * 40, hash(i + 7) * 3, 0, Math.PI * 2);
    g.fill();
  }
}

export function chalkStyle(g, color = CHALK, w = 7) {
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
}

/** Polyline drawn progressively (k = 0..1) with a tiny seeded wobble for a hand-drawn feel. */
export function drawPath(g, pts, k, seed = 1, close = false) {
  const all = close ? [...pts, pts[0]] : pts;
  const segs = all.length - 1;
  const upto = k * segs;
  g.beginPath();
  for (let i = 0; i <= Math.min(segs, Math.ceil(upto)); i++) {
    let [x, y] = all[i];
    if (i > upto) { const f = upto - (i - 1); const [px, py] = all[i - 1]; x = px + (x - px) * f; y = py + (y - py) * f; }
    x += (hash(seed + i) - 0.5) * 3; y += (hash(seed + i + 99) - 0.5) * 3;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
}

export function text(g, str, x, y, size, color = CHALK, alpha = 1, align = 'center') {
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha *= alpha;
  g.font = `900 ${size}px ${FONT}`;
  g.textAlign = align; g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(str, x, y);
  g.restore();
}

/** Draws `fn` scaled by `s` around (x, y). Skips when s <= 0. */
export function pop(g, x, y, s, fn) {
  if (s <= 0) return;
  g.save(); g.translate(x, y); g.scale(s, s); fn(); g.restore();
}

// ---------------------------------------------------------------- icons
// Each icon: (g, x, y, s, u, opts) with (x, y) roughly at the icon's feet/center. u = scene time (animation phase).

function rabbit(g, x, y, s, u = 0, { color = CHALK, flip = 1 } = {}) {
  g.save();
  g.translate(x, y - Math.abs(Math.sin(u)) * 14 * s);
  g.scale(s * flip, s);
  chalkStyle(g, color, 5);
  g.beginPath(); g.ellipse(0, 0, 34, 24, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(30, -22, 17, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.ellipse(26, -56, 6, 20, -0.15, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.ellipse(38, -54, 6, 20, 0.25, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(-36, -4, 8, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(36, -25, 3, 0, Math.PI * 2); g.fill();
  g.restore();
}

/** Stick person. dance > 0 animates arms/legs; hat: 'none' | 'doctor' | 'roman'. */
function person(g, x, y, s, u = 0, { color = CHALK, dance = 0, hat = 'none', arms = null } = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const sway = Math.sin(u * 7) * 0.25 * dance;
  g.rotate(sway * 0.4);
  chalkStyle(g, color, 8);
  g.beginPath(); g.arc(0, -150, 32, 0, Math.PI * 2); g.stroke();
  drawPath(g, [[0, -118], [0, -20]], 1, 2);
  const a1 = arms ?? [-1.1 - Math.sin(u * 7) * 1.0 * dance, 1.1 + Math.cos(u * 7) * 1.0 * dance];
  for (const a of a1) drawPath(g, [[0, -95], [Math.sin(a) * 70, -95 - Math.cos(a) * 70 * (dance ? 1 : -1)]], 1, 4);
  const l = Math.sin(u * 7 + 1) * 0.5 * dance;
  drawPath(g, [[0, -20], [-35 - l * 40, 60 - Math.max(0, l) * 40]], 1, 6);
  drawPath(g, [[0, -20], [35 - l * 40, 60 - Math.max(0, -l) * 40]], 1, 8);
  if (hat === 'doctor') { // head mirror + bag
    g.beginPath(); g.arc(0, -178, 13, 0, Math.PI * 2); g.fillStyle = BLUE; g.fill();
    g.fillStyle = '#6b3a22'; g.fillRect(48, -60, 54, 40); g.strokeStyle = color; g.lineWidth = 4; g.strokeRect(48, -60, 54, 40);
    g.fillStyle = RED; g.fillRect(70, -52, 10, 24); g.fillRect(63, -45, 24, 10);
  } else if (hat === 'roman') { // galea with red crest + shield
    g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(0, -158, 36, Math.PI, 0); g.fill();
    g.fillStyle = RED; g.fillRect(-26, -214, 52, 22);
    g.fillStyle = RED; g.fillRect(-90, -110, 50, 90); g.strokeStyle = YELLOW; g.lineWidth = 5; g.strokeRect(-90, -110, 50, 90);
  }
  g.restore();
}

function carrot(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(-0.5 + Math.sin(u * 4) * 0.08);
  g.fillStyle = ORANGE;
  g.beginPath(); g.moveTo(-40, -70); g.lineTo(40, -70); g.lineTo(0, 140); g.closePath(); g.fill();
  g.fillStyle = GREEN;
  for (const r of [-0.5, 0, 0.5]) { g.save(); g.translate(0, -70); g.rotate(r); g.fillRect(-8, -90, 16, 90); g.restore(); }
  g.restore();
}

/** Tiny Napoleon: bicorne hat, blue coat. alarm 0..1 shows a red "!". */
function napoleon(g, x, y, s, u = 0, { alarm = 0 } = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#3a6fd8'; g.fillRect(-26, -10, 52, 62);
  g.fillStyle = '#f3f0e4'; g.fillRect(-10, -6, 20, 50);
  g.fillStyle = '#f0c9a0'; g.fillRect(-20, -48, 40, 38);
  g.fillStyle = '#111'; g.fillRect(-10, -34, 6, 6); g.fillRect(6, -34, 6, 6);
  g.fillStyle = '#1a1a1a';
  g.beginPath(); g.moveTo(-46, -46); g.quadraticCurveTo(0, -96, 46, -46); g.closePath(); g.fill();
  g.strokeStyle = YELLOW; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#d33'; g.beginPath(); g.arc(18, -60, 6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e0e0e0'; g.fillRect(-24, 52, 18, 12); g.fillRect(6, 52, 18, 12);
  if (alarm > 0) text(g, '!', 54, -70, 70, RED, alarm);
  g.restore();
}

/** Scallop shell (fan with ribs). */
function shell(g, x, y, s, u = 0, { color = PINK } = {}) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(u * 3) * 0.06);
  g.fillStyle = color; g.strokeStyle = CHALK; g.lineWidth = 5;
  g.beginPath(); g.moveTo(0, 40);
  for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; g.lineTo(Math.cos(a) * 70, Math.sin(a) * 70 - 10 + (i % 2) * 8); }
  g.closePath(); g.fill(); g.stroke();
  for (let i = 1; i < 6; i++) { const a = Math.PI + (i / 6) * Math.PI; drawPath(g, [[0, 40], [Math.cos(a) * 62, Math.sin(a) * 62 - 6]], 1, i); }
  g.fillStyle = color; g.fillRect(-18, 32, 36, 18); g.strokeRect(-18, 32, 36, 18);
  g.restore();
}

/** Treasure chest full of shells. */
function chest(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  for (let i = 0; i < 5; i++) shell(g, -70 + i * 35, -78 - (i % 2) * 14, 0.42, 0, { color: i % 2 ? PINK : '#ffd1a8' });
  g.fillStyle = '#7a4a24'; g.fillRect(-100, -70, 200, 110);
  g.strokeStyle = YELLOW; g.lineWidth = 6; g.strokeRect(-100, -70, 200, 110);
  g.beginPath(); g.moveTo(-100, -30); g.lineTo(100, -30); g.stroke();
  g.fillStyle = YELLOW; g.fillRect(-14, -40, 28, 26);
  g.restore();
}

/** Music note (eighth note). */
function note(g, x, y, s, u = 0, { color = YELLOW } = {}) {
  g.save(); g.translate(x, y + Math.sin(u * 4) * 10); g.scale(s, s); g.rotate(Math.sin(u * 3) * 0.2);
  g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 7;
  g.beginPath(); g.ellipse(0, 0, 22, 16, -0.4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(19, -4); g.lineTo(19, -90); g.quadraticCurveTo(40, -70, 50, -40); g.stroke();
  g.restore();
}

/** Stick musician holding a fiddle and bow. */
function musician(g, x, y, s, u = 0) {
  person(g, x, y, s, u, { arms: [-0.9, 0.9 + Math.sin(u * 10) * 0.35] });
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#b5651d'; g.beginPath(); g.ellipse(-48, -90, 26, 18, -0.6, 0, Math.PI * 2); g.fill();
  chalkStyle(g, CHALK, 4); drawPath(g, [[30 + Math.sin(u * 10) * 20, -140], [-70 + Math.sin(u * 10) * 20, -60]], 1, 9);
  g.restore();
}

export const ICONS = { rabbit, person, dancer: (g, x, y, s, u, o) => person(g, x, y, s, u, { dance: 1, ...o }),
  doctor: (g, x, y, s, u, o) => person(g, x, y, s, u, { hat: 'doctor', ...o }),
  soldier: (g, x, y, s, u, o) => person(g, x, y, s, u, { hat: 'roman', ...o }),
  human: (g, x, y, s, u, o) => person(g, x, y, s, u, o), carrot, napoleon, shell, chest, note, musician };

/** Global icon size boost (icons read small on the in-world board in close shots). */
const ICON_SCALE = 1.15;

/** Draws an icon by name. Unknown names render as chalk text so a typo is visible, not silent. */
export function icon(g, name, x, y, s, u = 0, opts = {}) {
  const fn = ICONS[name];
  if (fn) fn(g, x, y, s * ICON_SCALE, u, opts); else text(g, String(name).toUpperCase(), x, y, 60 * s, YELLOW);
}
