// Board scenes for episodes 9+ (Mars Climate Orbiter, black holes). Registered from scenes.js.
// Same contract: scene(g, W, H, u, d, params), deterministic (no Math.random / clocks).
import { CHALK, CHALK_DIM, YELLOW, RED, BLUE, GREEN, ORANGE, chalkStyle, drawPath, text, pop, ease, backOut, prog } from './chalk.js';

const CYAN = '#7ef0ff';

function planet(g, x, y, r, color, k = 1) {
  if (k <= 0) return;
  g.save(); g.translate(x, y); g.scale(k, k);
  g.fillStyle = color; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.arc(r * 0.25, r * 0.2, r * 0.8, 0, Math.PI * 2); g.fill();
  g.restore();
}

/** Small probe: box body + two solar panels. */
function probe(g, x, y, s, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = '#d9d2c0'; g.fillRect(-14, -12, 28, 24);
  g.fillStyle = BLUE; g.fillRect(-52, -8, 34, 16); g.fillRect(18, -8, 34, 16);
  g.fillStyle = YELLOW; g.fillRect(-4, -18, 8, 8);
  g.restore();
}

/** Stick figure (feet at y), optional vertical stretch. */
function figure(g, x, y, s, { stretch = 1, color = CHALK, alpha = 1 } = {}) {
  g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.scale(s / Math.sqrt(stretch), s * stretch);
  chalkStyle(g, color, 7 / s);
  g.beginPath(); g.arc(0, -150, 22, 0, Math.PI * 2); g.stroke();
  drawPath(g, [[0, -128], [0, -60]], 1, 2); drawPath(g, [[-34, -110], [0, -100], [34, -110]], 1, 3);
  drawPath(g, [[-22, 0], [0, -60], [22, 0]], 1, 4);
  g.restore();
}

function arrow(g, x1, y1, x2, y2, color, w = 8, k = 1) {
  if (k <= 0) return;
  const x = x1 + (x2 - x1) * k, y = y1 + (y2 - y1) * k;
  chalkStyle(g, color, w);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x, y); g.stroke();
  const a = Math.atan2(y - y1, x - x1), h = w * 3;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x - h * Math.cos(a - 0.5), y - h * Math.sin(a - 0.5)); g.lineTo(x - h * Math.cos(a + 0.5), y - h * Math.sin(a + 0.5)); g.closePath(); g.fill();
}

/** Earth -> Mars dashed trajectory with a probe traveling along it. params: title, from, to. */
function marsRoute(g, W, H, u, d, p) {
  planet(g, 230, 560, 80, BLUE, backOut(prog(u, 0.2, 0.5)));
  planet(g, 1050, 360, 70, ORANGE, backOut(prog(u, 0.5, 0.5)));
  text(g, p.from ?? 'TIERRA', 230, 700, 50, CHALK, prog(u, 0.4, 0.3));
  text(g, p.to ?? 'MARTE', 1050, 480, 50, CHALK, prog(u, 0.7, 0.3));
  const pt = (k) => [230 + 820 * k, 560 - 200 * k - Math.sin(k * Math.PI) * 220];
  const k = ease(prog(u, 0.8, Math.max(1.5, d - 1.2)));
  g.save(); g.setLineDash([22, 18]); chalkStyle(g, YELLOW, 6); g.beginPath();
  for (let i = 0; i <= 40; i++) { const [x, y] = pt((i / 40) * k); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke(); g.restore();
  if (u > 0.8) { const [x, y] = pt(k); probe(g, x, y, 1.3, 0.3); }
  text(g, p.title ?? '1999', W / 2, 90, 76, YELLOW, prog(u, 0.2, 0.4));
}

/** Two teams side by side. params: left, right, title. */
function twoTeams(g, W, H, u, d, p) {
  const team = (cx, label, color, k) => {
    if (k <= 0) return;
    for (let i = 0; i < 3; i++) figure(g, cx - 110 + i * 110, 640, 0.95 * backOut(prog(k, i * 0.15, 0.5)), { color });
    text(g, label, cx, 750, 58, color, k);
  };
  team(330, p.left ?? 'NASA', BLUE, prog(u, 0.3, 1));
  team(950, p.right ?? 'LOCKHEED MARTIN', ORANGE, prog(u, 1.2, 1));
  text(g, '+', W / 2, 520, 120, CHALK, prog(u, 1.0, 0.3));
  probe(g, W / 2, 250, 2.2 * backOut(prog(u, 0.2, 0.5)), 0);
  text(g, p.title ?? 'DOS EQUIPOS', W / 2, 90, 70, YELLOW, prog(u, 0.1, 0.4));
}

/** One big unit symbol. params: unit, label, color. */
function bigUnit(g, W, H, u, d, p) {
  pop(g, W / 2, 430, backOut(prog(u, 0.25, 0.6)), () => {
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.arc(0, 0, 250, 0, Math.PI * 2); g.fill();
    text(g, p.unit ?? 'N', 0, 10, 330, p.color ?? GREEN);
  });
  text(g, p.label ?? 'NEWTONS', W / 2, 780, 76, CHALK, prog(u, 0.8, 0.4));
  text(g, p.title ?? 'SISTEMA MÉTRICO', W / 2, 90, 64, YELLOW, prog(u, 0.2, 0.4));
}

/** "N ≠ lbf". params: left, right, title. */
function unitMismatch(g, W, H, u, d, p) {
  pop(g, 300, 430, backOut(prog(u, 0.2, 0.5)), () => text(g, p.left ?? 'N', 0, 0, 260, GREEN));
  pop(g, 920, 430, backOut(prog(u, 0.7, 0.5)), () => text(g, p.right ?? 'lbf', 0, 0, 230, ORANGE));
  pop(g, W / 2, 430, backOut(prog(u, 1.2, 0.5)), () => text(g, '≠', 0, 0, 260, RED));
  text(g, 'MÉTRICO', 300, 680, 50, CHALK, prog(u, 0.5, 0.3));
  text(g, 'INGLÉS', 920, 680, 50, CHALK, prog(u, 1.0, 0.3));
  text(g, p.title ?? 'NADIE CONVIRTIÓ', W / 2, 800, 64, YELLOW, prog(u, 1.6, 0.4));
}

/** Calendar pages ticking up to `months`. params: months, label. */
function calendar(g, W, H, u, d, p) {
  const n = p.months ?? 9;
  const shown = Math.min(n, Math.floor(prog(u, 0.3, Math.max(1, d - 1.2)) * n) + 1);
  for (let i = 0; i < n; i++) {
    const x = 210 + (i % 5) * 215, y = 230 + Math.floor(i / 5) * 270;
    const k = i < shown ? backOut(prog(u, 0.3 + i * 0.12, 0.4)) : 0;
    pop(g, x, y, k, () => {
      g.fillStyle = CHALK; g.fillRect(-80, -90, 160, 180);
      g.fillStyle = RED; g.fillRect(-80, -90, 160, 44);
      text(g, String(i + 1), 0, 25, 90, '#1a1a1a');
    });
  }
  text(g, p.label ?? `${n} MESES`, W / 2, 800, 80, YELLOW, prog(u, 0.6, 0.4));
}

/** Mars with a safe orbit and the probe skimming too low. params: low, safe. */
function lowOrbit(g, W, H, u, d, p) {
  const cx = W / 2, cy = 470, R = 210;
  // atmosphere
  g.fillStyle = 'rgba(255,140,80,0.18)'; g.beginPath(); g.arc(cx, cy, R + 70, 0, Math.PI * 2); g.fill();
  planet(g, cx, cy, R, ORANGE, backOut(prog(u, 0.1, 0.5)));
  g.save(); g.setLineDash([18, 14]); chalkStyle(g, GREEN, 5);
  g.globalAlpha = prog(u, 0.6, 0.4); g.beginPath(); g.arc(cx, cy, R + 130, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.restore();
  text(g, p.safe ?? 'MÍNIMO ~80 KM', cx + 360, 200, 44, GREEN, prog(u, 0.7, 0.3));
  const k = ease(prog(u, 1.0, Math.max(1.5, d - 1.4)));
  const a = Math.PI * (1.0 + 0.9 * k), rr = R + 45;
  chalkStyle(g, RED, 6); g.beginPath(); g.arc(cx, cy, rr, Math.PI, a); g.stroke();
  if (u > 1.0) probe(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.1, a + Math.PI / 2);
  text(g, p.low ?? '57 KM', cx - 360, 230, 70, RED, prog(u, 1.2, 0.3));
  text(g, 'DEMASIADO BAJO', W / 2, 820, 60, YELLOW, prog(u, 1.8, 0.4));
}

function blackHoleDisk(g, cx, cy, r, u, k = 1) {
  if (k <= 0) return;
  g.save(); g.translate(cx, cy); g.scale(k, k);
  const grd = g.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 2.2);
  grd.addColorStop(0, 'rgba(255,200,90,0.95)'); grd.addColorStop(0.4, 'rgba(255,120,30,0.6)'); grd.addColorStop(1, 'rgba(255,80,0,0)');
  g.save(); g.scale(1, 0.32); g.rotate(u * 0.3); g.fillStyle = grd; g.beginPath(); g.arc(0, 0, r * 2.2, 0, Math.PI * 2); g.fill(); g.restore();
  g.strokeStyle = 'rgba(255,200,120,0.85)'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, r * 1.08, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.restore();
}

/** Black hole with light rays bending in. params: title. */
function blackHole(g, W, H, u, d, p) {
  const cx = W / 2, cy = 470;
  blackHoleDisk(g, cx, cy, 120, u, backOut(prog(u, 0.2, 0.6)));
  for (let i = 0; i < 5; i++) {
    const y0 = 220 + i * 120, k = ease(prog(u, 0.9 + i * 0.2, 1.2));
    chalkStyle(g, YELLOW, 5); g.beginPath(); g.moveTo(60, y0);
    const steps = 30;
    for (let s = 1; s <= steps * k; s++) {
      const t = s / steps, x = 60 + t * (cx - 60 - 60);
      g.lineTo(x, y0 + (cy - y0) * t ** 2.2);
    }
    g.stroke();
  }
  text(g, p.title ?? 'NI LA LUZ ESCAPA', W / 2, 820, 66, YELLOW, prog(u, 0.4, 0.4));
}

/** Figure falling feet-first, with longer gravity arrows at the feet. params: title. */
function tidal(g, W, H, u, d, p) {
  blackHoleDisk(g, W / 2, 800, 90, u, 1);
  const fy = 580 + ease(prog(u, 0.3, d)) * 40;
  g.save(); g.translate(W / 2, fy); g.rotate(Math.PI); figure(g, 0, 0, 1.4, {}); g.restore();
  arrow(g, W / 2 + 110, fy + 10, W / 2 + 110, fy + 200, RED, 12, ease(prog(u, 0.8, 0.6)));
  arrow(g, W / 2 + 110, fy - 250, W / 2 + 110, fy - 190, BLUE, 7, ease(prog(u, 1.2, 0.6)));
  text(g, 'PIES', W / 2 + 230, fy + 110, 46, RED, prog(u, 1.0, 0.3));
  text(g, 'CABEZA', W / 2 + 250, fy - 220, 46, BLUE, prog(u, 1.4, 0.3));
  text(g, p.title ?? 'MÁS GRAVEDAD ABAJO', W / 2, 90, 62, YELLOW, prog(u, 0.2, 0.4));
}

/** Figure stretched like spaghetti. params: title. */
function spaghetti(g, W, H, u, d, p) {
  blackHoleDisk(g, W / 2, 790, 80, u, 1);
  const st = 1 + 2.4 * ease(prog(u, 0.4, Math.max(1.2, d - 1)));
  g.save(); g.translate(W / 2, 260); g.rotate(Math.PI); figure(g, 0, 0, 1.1, { stretch: st, color: YELLOW }); g.restore();
  text(g, p.title ?? 'ESPAGUETIZACIÓN', W / 2, 90, 76, YELLOW, prog(u, 1.0, 0.4));
}

/** Clock whose hand slows down, label below. params: title. */
function slowClock(g, W, H, u, d, p) {
  const cx = W / 2, cy = 430, R = 230;
  pop(g, cx, cy, backOut(prog(u, 0.2, 0.5)), () => {
    chalkStyle(g, CHALK, 10); g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; drawPath(g, [[Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.85], [Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95]], 1, i); }
    // angle = integral of a decaying speed: hand slows to a crawl
    const a = -Math.PI / 2 + 6 * (1 - Math.exp(-u * 0.6));
    chalkStyle(g, RED, 12); g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); g.stroke();
    g.fillStyle = CHALK; g.beginPath(); g.arc(0, 0, 16, 0, Math.PI * 2); g.fill();
  });
  text(g, p.title ?? 'EL TIEMPO SE FRENA', W / 2, 800, 66, YELLOW, prog(u, 0.8, 0.4));
}

/** Figure turning red and fading at the event horizon. params: title. */
function redFade(g, W, H, u, d, p) {
  const cx = W / 2, cy = 470;
  blackHoleDisk(g, cx, cy, 150, u, 1);
  const k = ease(prog(u, 0.4, Math.max(1.5, d - 0.8)));
  const r = Math.round(243 - 20 * k), gb = Math.round(240 - 200 * k);
  figure(g, cx + 250 - 60 * k, cy + 70, 0.9, { color: `rgb(${r},${gb},${gb})`, alpha: 1 - 0.75 * k });
  text(g, p.title ?? 'CONGELADO EN EL BORDE', W / 2, 820, 60, YELLOW, prog(u, 0.6, 0.4));
}

export const SCENES_V4 = { marsRoute, twoTeams, bigUnit, unitMismatch, calendar, lowOrbit, blackHole, tidal, spaghetti, slowClock, redFade };
