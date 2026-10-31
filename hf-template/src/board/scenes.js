// Board scene library. Each scene is a named, parameterized function:
//   scene(g, W, H, u, d, params)
// u = seconds since the board line started, d = line duration, params = the episode's board object.
// Episode JSON picks a scene with "board": "name" or "board": { "scene": "name", ...params }.
// To add a scene: write a function here (or in a new file) and register it in SCENES at the bottom.
// Keep text inside the board's lower 85%: the top strip may be close to the caption block in tight shots.
import {
  CHALK, CHALK_DIM, YELLOW, RED, BLUE, GREEN, ORANGE, chalkStyle, drawPath, text, pop, icon,
  ease, backOut, prog, hash, clamp,
} from './chalk.js';
import { SCENES_V2, crossOut } from './scenes-v2.js';
import { SCENES_V3 } from './scenes-v3.js';
import { SCENES_V4 } from './scenes-v4.js';
import { SCENES_V5 } from './scenes-v5.js';
import './scenes-v6.js'; // extra icons (019-022)
import './scenes-v7.js'; // extra icons (023)
import './scenes-v8.js'; // extra icons (024)
import { SCENES_V9 } from './scenes-v9.js'; // newsCard + icons (025)

// Simplified cartoon Europe coastline in board coordinates (1280x886 canvas).
const EUROPE = [[140, 640], [170, 520], [120, 430], [210, 360], [300, 380], [330, 300], [270, 230], [360, 150], [470, 130],
  [520, 210], [600, 190], [640, 120], [760, 90], [900, 110], [1040, 80], [1160, 130], [1180, 300], [1170, 520], [1100, 640],
  [960, 620], [880, 690], [780, 640], [700, 700], [640, 620], [560, 690], [500, 640], [430, 700], [360, 640], [260, 700]];
const BRITAIN = [[180, 120], [240, 90], [270, 160], [250, 240], [290, 300], [200, 320], [150, 280], [170, 200]];

function europe(g, u, { britain = false } = {}) {
  chalkStyle(g, CHALK, 6);
  drawPath(g, EUROPE, ease(prog(u, 0, 1.2)), 3, true);
  if (britain) drawPath(g, BRITAIN, ease(prog(u, 0.6, 0.8)), 11, true);
}

/** Title line near the bottom of the board (clear of the caption block above the board). */
function footer(g, W, H, str, u, at = 0.4, color = YELLOW) {
  if (str) text(g, str, W / 2, H - 70, 62, color, prog(u, at, 0.35));
}

// ------------------------------------------------------------- generic scenes

/**
 * mapPin: Europe outline, a dropping pin with a label, and an optional icon next to it.
 * params: { pin: [x, y], label, title, icon: 'dancer', date }
 */
function mapPin(g, W, H, u, d, p) {
  europe(g, u);
  const [px, py] = p.pin ?? [520, 330];
  const k = backOut(prog(u, 1.0, 0.5));
  const drop = (1 - ease(prog(u, 1.0, 0.4))) * -120;
  if (u > 1.0) {
    g.save(); g.translate(px, py + drop);
    g.fillStyle = RED; g.beginPath(); g.arc(0, -46, 28 * k, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(-20 * k, -36); g.lineTo(20 * k, -36); g.lineTo(0, 0); g.closePath(); g.fill();
    g.fillStyle = CHALK; g.beginPath(); g.arc(0, -46, 10 * k, 0, Math.PI * 2); g.fill();
    g.restore();
    text(g, p.label ?? '', px, py + 44, 50, CHALK, prog(u, 1.4, 0.3));
  }
  if (p.icon) pop(g, px + 230, py + 150, backOut(prog(u, 1.8, 0.5)), () => icon(g, p.icon, 0, 0, 1.0, u));
  if (p.date) text(g, p.date, px - 260, py + 170, 64, BLUE, prog(u, 2.2, 0.3));
  footer(g, W, H, p.title, u, 2.6);
}

/**
 * route: Europe outline with stops connected by a dashed path; a traveler icon walks it.
 * params: { stops: [{ label, x, y, color }], traveler: 'soldier', britain: true, title, reverse: false }
 */
function route(g, W, H, u, d, p) {
  europe(g, u, { britain: !!p.britain });
  const stops = p.stops ?? [];
  const pts = stops.map((s) => [s.x, s.y]);
  const path = p.reverse ? [...pts].reverse() : pts;
  stops.forEach((s, i) => {
    const k = backOut(prog(u, 0.8 + i * 0.35, 0.4));
    pop(g, s.x, s.y, k, () => { g.fillStyle = s.color ?? YELLOW; g.beginPath(); g.arc(0, 0, 16, 0, Math.PI * 2); g.fill(); });
    text(g, s.label, s.x + (s.dx ?? 0), s.y + (s.dy ?? 48), 46, s.color ?? CHALK, prog(u, 0.9 + i * 0.35, 0.3));
  });
  const tw = ease(prog(u, 1.6, Math.max(1.2, d - 2.4)));
  if (path.length > 1 && u > 1.5) {
    chalkStyle(g, YELLOW, 5); g.setLineDash([14, 14]);
    drawPath(g, path, tw, 7);
    g.setLineDash([]);
    // traveler position along the polyline
    const segs = path.length - 1, f = tw * segs, i = Math.min(segs - 1, Math.floor(f)), r = f - i;
    const x = path[i][0] + (path[i + 1][0] - path[i][0]) * r, y = path[i][1] + (path[i + 1][1] - path[i][1]) * r;
    icon(g, p.traveler ?? 'soldier', x, y - 20, p.travelerScale ?? 0.55, u * 2);
  }
  footer(g, W, H, p.title, u, d - 0.8);
}

/**
 * counter: a number that grows to `to` (shows `final` at the end) while icons multiply on a grid.
 * params: { label, to, final, icon: 'rabbit', max: 40, cols: 10 }
 */
function counter(g, W, H, u, d, p) {
  const to = p.to ?? 3000;
  const k = prog(u, 0.6, Math.max(1, d - 1.4));
  const n = Math.round(to * k ** 3);
  text(g, p.label ?? '', W / 2, 90, 64, CHALK);
  const done = n >= to;
  const s = 1 + 0.08 * Math.sin(u * 18) * (done ? 0 : 1);
  pop(g, W / 2, 230, s, () => text(g, done && p.final ? p.final : n.toLocaleString('es-ES'), 0, 0, 150, done ? YELLOW : CHALK));
  const count = Math.min(p.max ?? 40, Math.floor(2 ** (prog(u, 0.3, Math.max(1, d - 1.2)) * 5.4)));
  const cols = p.cols ?? 10;
  const name = p.icon ?? 'rabbit';
  const big = name !== 'rabbit';
  for (let i = 0; i < count; i++) {
    const cx = 100 + (i % cols) * ((W - 200) / (cols - 1)), cy = (big ? 520 : 430) + Math.floor(i / cols) * (big ? 190 : 110);
    icon(g, name, cx, cy, big ? 0.55 : 0.95, u * 9 + i, { color: i % 7 === 3 ? YELLOW : CHALK });
  }
}

/**
 * equation: icons separated by operators that pop in one after another.
 * params: { items: ['rabbit', '+', 'human', '=', 'carrot'], title, scales: { carrot: 1 } }
 * An item may be { icon, count, scale } to draw a small group (e.g. "more dancers").
 */
function equation(g, W, H, u, d, p) {
  const items = p.items ?? [];
  const y = H / 2 + 70;
  const pad = p.pad ?? 100; // side margin; raise it when edge items carry long labels
  const step = (W - 2 * pad) / Math.max(1, items.length - 1);
  items.forEach((it, i) => {
    const x = items.length === 1 ? W / 2 : pad + i * step;
    const at = 0.2 + i * 0.45;
    if (it === '+' || it === '=' || it === '→') { text(g, it, x, y - 40, 120, YELLOW, prog(u, at, 0.2)); return; }
    if (it === 'vs') { text(g, 'VS', x, y - 40, 110, RED, prog(u, at, 0.2)); return; }
    const o = typeof it === 'string' ? { icon: it } : it;
    const k = backOut(prog(u, at, 0.4));
    const n = o.count ?? 1;
    pop(g, x, y, k, () => {
      for (let j = 0; j < n; j++) {
        const ox = n === 1 ? 0 : (j - (n - 1) / 2) * 70, oy = n === 1 ? 0 : (j % 2) * -40;
        icon(g, o.icon, ox, oy + 80, (o.scale ?? 1) * (n === 1 ? 1 : 0.6), u * 2 + j * 1.3, { color: j % 3 === 1 ? YELLOW : CHALK });
      }
    });
    if (o.label) text(g, o.label, x, y + 150, 44, CHALK, prog(u, at + 0.3, 0.3));
    if (o.cross) crossOut(g, x, y - 20, 110, prog(u, at + 0.5, 0.5)); // item { icon, cross: true } = "no X"
  });
  footer(g, W, H, p.title, u, 0.3 + items.length * 0.45);
}

/**
 * stage: a raised stage with musicians playing, floating notes and dancers.
 * params: { title, musicians: 2, dancers: 3 }
 */
function stage(g, W, H, u, d, p) {
  const floorY = H - 230;
  const k = ease(prog(u, 0.1, 0.8));
  chalkStyle(g, CHALK, 7);
  drawPath(g, [[140, floorY], [1140, floorY], [1100, floorY + 60], [180, floorY + 60]], k, 4, true);
  for (let i = 0; i < 6; i++) drawPath(g, [[200 + i * 180, floorY + 60], [200 + i * 180, floorY + 110]], k, 20 + i);
  const m = p.musicians ?? 2;
  for (let i = 0; i < m; i++) pop(g, 330 + i * 230, floorY - 70, backOut(prog(u, 0.8 + i * 0.4, 0.4)), () => icon(g, 'musician', 0, 0, 0.75, u + i));
  const n = p.dancers ?? 3;
  for (let i = 0; i < n; i++) pop(g, 800 + i * 120, floorY - 60, backOut(prog(u, 1.6 + i * 0.2, 0.4)), () => icon(g, 'dancer', 0, 0, 0.6, u * 1.2 + i));
  for (let i = 0; i < 7; i++) {
    const a = prog(u, 1.2 + i * 0.3, 0.3);
    const x = 250 + ((i * 173 + u * 60) % 800), y = 200 + hash(i) * 180 - (u * 30 % 80);
    if (a > 0) { g.save(); g.globalAlpha = a; icon(g, 'note', x, y, 0.9, u + i, { color: i % 2 ? YELLOW : GREEN }); g.restore(); }
  }
  footer(g, W, H, p.title, u, 2.0);
}

/**
 * questionCrowd: a dancing crowd surrounded by pulsing question marks.
 * params: { title, crowd: 7, icon: 'dancer' }
 */
function questionCrowd(g, W, H, u, d, p) {
  const n = p.crowd ?? 7;
  for (let i = 0; i < n; i++) {
    const x = W / 2 + (i - (n - 1) / 2) * 110, y = H / 2 + 120 + (i % 2) * 40;
    pop(g, x, y, backOut(prog(u, 0.2 + i * 0.1, 0.35)), () => icon(g, p.icon ?? 'dancer', 0, 0, 0.6, u + i * 0.7));
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = W / 2 + Math.cos(a) * 520, y = H / 2 + 20 + Math.sin(a) * 280;
    const s = backOut(prog(u, 1.0 + i * 0.15, 0.4)) * (1 + 0.1 * Math.sin(u * 6 + i));
    pop(g, x, y, s, () => text(g, '?', 0, 0, 130, i % 2 ? YELLOW : RED));
  }
  footer(g, W, H, p.title, u, 2.2);
}

/**
 * scroll: an unrolling parchment with a label and some scribbled lines.
 * params: { label: 'SUETONIO', subtitle, lines: 4 }
 */
function scroll(g, W, H, u, d, p) {
  const k = ease(prog(u, 0.2, 0.9));
  const w = 760 * k, h = 470, x0 = W / 2 - w / 2, y0 = H / 2 - h / 2 + 20;
  g.fillStyle = '#e9dcb5'; g.fillRect(x0, y0, w, h);
  g.fillStyle = '#c9b27f';
  for (const x of [x0 - 30, x0 + w]) g.fillRect(x, y0 - 20, 30, h + 40);
  if (k > 0.95) {
    text(g, p.label ?? '', W / 2, y0 + 90, 96, '#5a2e12', prog(u, 1.1, 0.3));
    g.strokeStyle = '#7a5a3a'; g.lineWidth = 6; g.lineCap = 'round';
    const lines = p.lines ?? 4;
    for (let i = 0; i < lines; i++) {
      const lk = prog(u, 1.4 + i * 0.3, 0.4);
      drawPath(g, [[x0 + 90, y0 + 190 + i * 62], [x0 + 90 + (w - 180) * (0.6 + hash(i) * 0.4) * lk, y0 + 190 + i * 62]], 1, 30 + i);
    }
  }
  if (p.subtitle) text(g, p.subtitle, W / 2, H - 50, 50, YELLOW, prog(u, 2.0, 0.3));
}

// ------------------------------------------------------------- episode 2 scenes (Napoleon)

/** Paris -> Tilsit with Napoleon and a handshake. params: { title } */
function treatyMap(g, W, H, u, d, p) {
  europe(g, u);
  const k = ease(prog(u, 0.9, 0.5));
  g.save(); g.globalAlpha = k;
  g.fillStyle = 'rgba(142,197,255,0.25)';
  g.beginPath(); g.moveTo(210, 360); g.lineTo(380, 330); g.lineTo(440, 470); g.lineTo(360, 600); g.lineTo(220, 560); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,107,94,0.22)';
  g.beginPath(); g.moveTo(820, 110); g.lineTo(1160, 130); g.lineTo(1170, 520); g.lineTo(860, 500); g.lineTo(780, 300); g.closePath(); g.fill();
  g.restore();
  text(g, 'FRANCIA', 320, 470, 60, BLUE, k);
  text(g, 'RUSIA', 1000, 330, 72, RED, k);
  const tw = ease(prog(u, 1.3, 1.4));
  if (u > 1.2) {
    chalkStyle(g, YELLOW, 5); g.setLineDash([14, 14]);
    drawPath(g, [[310, 420], [500, 340], [700, 270]], tw, 7);
    g.setLineDash([]);
    icon(g, 'napoleon', 310 + 390 * tw, 390 - 150 * tw, 0.75 * backOut(prog(u, 1.2, 0.4)));
  }
  if (u > 2.8) {
    pop(g, 820, 300, backOut(prog(u, 2.8, 0.5)), () => {
      g.fillStyle = '#3a6fd8'; g.fillRect(-120, -18, 70, 36);
      g.fillStyle = '#c4473c'; g.fillRect(50, -18, 70, 36);
      g.fillStyle = '#f0c9a0'; g.fillRect(-52, -24, 104, 48);
    });
  }
  footer(g, W, H, p.title ?? 'PAZ · TILSIT 1807', u, 3.0);
}

/** Rabbits converge on Napoleon. params: { title, count } */
function swarm(g, W, H, u, d, p) {
  const cx = W / 2, cy = H / 2 + 10;
  const k = ease(prog(u, 0.9, Math.max(1.2, d - 1.6)));
  icon(g, 'napoleon', cx, cy, 0.7, u, { alarm: prog(u, 1.4, 0.3) });
  const N = p.count ?? 22;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2 + hash(i) * 0.3;
    const R0 = 620 + hash(i + 3) * 140;
    const R = R0 + (115 + hash(i + 5) * 40 - R0) * clamp(k * (0.75 + hash(i + 8) * 0.4));
    const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R * 0.62;
    if (i % 2 === 0) {
      chalkStyle(g, CHALK_DIM, 4); g.setLineDash([10, 12]);
      drawPath(g, [[cx + Math.cos(ang) * R0, cy + Math.sin(ang) * R0 * 0.62], [x, y]], 1, i);
      g.setLineDash([]);
    }
    icon(g, 'rabbit', x, y, 0.75, u * 10 + i, { color: i % 5 === 0 ? YELLOW : CHALK, flip: Math.cos(ang) > 0 ? -1 : 1 });
  }
  footer(g, W, H, p.title, u, 2.2, RED);
}

/** Napoleon flees in a carriage chased by rabbits. params: { title } */
function carriage(g, W, H, u, d, p) {
  const groundY = H - 190;
  chalkStyle(g, CHALK, 6);
  drawPath(g, [[0, groundY], [W, groundY]], 1, 5);
  const x = 980 - ease(prog(u, 0.3, 4.5)) * 900 + Math.sin(u * 30) * 3;
  g.save(); g.translate(x, groundY - 70);
  g.fillStyle = '#3a6fd8'; g.fillRect(-120, -130, 220, 120);
  g.strokeStyle = YELLOW; g.lineWidth = 5; g.strokeRect(-120, -130, 220, 120);
  g.fillStyle = '#cfe6ff'; g.fillRect(-90, -110, 70, 50);
  icon(g, 'napoleon', -55, -68, 0.38, u, { alarm: 1 });
  for (const wx of [-80, 60]) {
    g.save(); g.translate(wx, 10); g.rotate(-u * 14);
    chalkStyle(g, CHALK, 6);
    g.beginPath(); g.arc(0, 0, 52, 0, Math.PI * 2); g.stroke();
    for (let s = 0; s < 4; s++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(-52, 0); g.lineTo(52, 0); g.stroke(); }
    g.restore();
  }
  g.fillStyle = '#c9a77a'; g.fillRect(-300, -95, 130, 55); g.fillRect(-330, -140, 45, 70);
  for (let l = 0; l < 4; l++) g.fillRect(-295 + l * 32, -40, 14, 60 + Math.sin(u * 20 + l) * 10);
  g.restore();
  chalkStyle(g, CHALK_DIM, 5);
  for (let i = 0; i < 4; i++) drawPath(g, [[x + 130 + i * 20, groundY - 180 + i * 40], [x + 230 + i * 40, groundY - 180 + i * 40]], 1, i);
  for (let i = 0; i < 9; i++) {
    const rx = x + 330 + i * 95 + Math.sin(u * 2 + i) * 20;
    if (rx < W + 60) icon(g, 'rabbit', rx, groundY - 30, 0.7, u * 11 + i * 1.7, { color: i % 4 === 1 ? YELLOW : CHALK, flip: -1 });
  }
  text(g, p.title ?? '', W / 2, 150, 70, YELLOW, prog(u, 1.0, 0.3));
}

function idle(g, W, H) {
  text(g, 'HISTORIA', W / 2, H / 2 - 70, 110, CHALK_DIM);
  text(g, 'en cubitos', W / 2, H / 2 + 50, 80, CHALK_DIM);
}

export const SCENES = { mapPin, route, counter, equation, stage, questionCrowd, scroll, treatyMap, swarm, carriage, idle, ...SCENES_V2, ...SCENES_V3, ...SCENES_V4, ...SCENES_V5, ...SCENES_V9 };
export { ORANGE };
