// Board scenes, maps and icons added for episodes 7+ (War of the Bucket, Tycho Brahe). Registered from scenes.js.
// Same contract as scenes.js: scene(g, W, H, u, d, params), deterministic.
import {
  CHALK, CHALK_DIM, YELLOW, RED, BLUE, GREEN, ORANGE, chalkStyle, drawPath, text, pop, icon, ICONS,
  ease, backOut, prog, hash,
} from './chalk.js';
import { MAPS } from './scenes-v2.js';

// ---------------------------------------------------------------- maps

Object.assign(MAPS, {
  // Italy: the boot plus Sicily and Sardinia (cartoon).
  italy: {
    shapes: [
      [[300, 150], [470, 110], [640, 120], [800, 100], [900, 150], [850, 230], [760, 260], [720, 330], [790, 420], [880, 500],
        [960, 560], [1040, 600], [1010, 650], [930, 620], [900, 700], [860, 760], [820, 720], [840, 640], [760, 560], [660, 470],
        [570, 380], [480, 300], [380, 260], [300, 230]],
      [[740, 790], [880, 770], [860, 840], [760, 840]],
      [[400, 560], [460, 550], [470, 680], [410, 690]],
    ],
    islands: [],
  },
  // Denmark: Jutland, Funen, Zealand, the Swedish coast on the right, and tiny Hven in the strait.
  denmark: {
    shapes: [
      [[250, 120], [400, 110], [440, 260], [420, 420], [460, 560], [430, 760], [270, 760], [240, 560], [230, 340]],
      [[520, 470], [640, 450], [660, 560], [560, 600], [510, 550]],
      [[720, 330], [880, 300], [940, 420], [900, 600], [760, 620], [700, 480]],
      [[1060, 80], [1240, 80], [1240, 800], [1080, 800], [1040, 560], [1010, 380], [1040, 220]],
    ],
    islands: [[975, 380, 16, 10]],
  },
});

function drawMapShapes(g, u, name) {
  const m = MAPS[name];
  chalkStyle(g, CHALK, 6);
  m.shapes.forEach((pts, i) => drawPath(g, pts, ease(prog(u, i * 0.25, 1.1)), 3 + i * 5, true));
  m.islands.forEach(([x, y, rx, ry], i) => {
    const k = prog(u, 0.8 + i * 0.1, 0.3);
    if (k <= 0) return;
    g.save(); g.globalAlpha = k; chalkStyle(g, CHALK, 5);
    g.beginPath(); g.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2); g.stroke(); g.restore();
  });
}

function pin(g, x, y, k, color = RED) {
  g.save(); g.translate(x, y);
  g.fillStyle = color; g.beginPath(); g.arc(0, -46, 28 * k, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(-20 * k, -36); g.lineTo(20 * k, -36); g.lineTo(0, 0); g.closePath(); g.fill();
  g.fillStyle = CHALK; g.beginPath(); g.arc(0, -46, 10 * k, 0, Math.PI * 2); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- icons

/** Angry face (red, furrowed brows, steam puffs). */
function angry(g, x, y, s, u = 0, { color = RED } = {}) {
  g.save(); g.translate(x + Math.sin(u * 30) * 2, y); g.scale(s, s);
  g.fillStyle = color; g.strokeStyle = CHALK; g.lineWidth = 5;
  g.beginPath(); g.arc(0, -60, 60, 0, Math.PI * 2); g.fill(); g.stroke();
  chalkStyle(g, '#1a1a1a', 9);
  drawPath(g, [[-40, -90], [-10, -76]], 1, 2); drawPath(g, [[40, -90], [10, -76]], 1, 4);
  g.fillStyle = '#1a1a1a'; g.fillRect(-28, -70, 12, 12); g.fillRect(16, -70, 12, 12);
  drawPath(g, [[-26, -28], [0, -40], [26, -28]], 1, 6);
  g.fillStyle = 'rgba(243,240,228,0.8)';
  for (const sx of [-1, 1]) { const k = (u * 1.5 + (sx > 0 ? 0.5 : 0)) % 1; g.beginPath(); g.arc(sx * (70 + k * 30), -120 - k * 40, 12 + k * 10, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

/** Wooden bucket with iron hoops and a rope handle. */
function bucket(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#9a6234'; g.strokeStyle = CHALK; g.lineWidth = 6;
  g.beginPath(); g.moveTo(-80, -150); g.lineTo(80, -150); g.lineTo(62, 0); g.lineTo(-62, 0); g.closePath(); g.fill(); g.stroke();
  chalkStyle(g, '#6b4022', 4);
  for (let i = -2; i <= 2; i++) drawPath(g, [[i * 30, -148], [i * 24, -2]], 1, 10 + i);
  g.fillStyle = '#4a4a4a';
  g.fillRect(-79, -128, 158, 14); g.fillRect(-68, -30, 136, 14);
  chalkStyle(g, '#d8c39a', 6);
  g.beginPath(); g.moveTo(-74, -150); g.quadraticCurveTo(0, -260, 74, -150); g.stroke();
  g.restore();
}

/** Two crossed swords. */
function swords(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y - 90 * s); g.scale(s, s);
  for (const sx of [-1, 1]) {
    g.save(); g.rotate(sx * 0.7 + Math.sin(u * 4) * 0.03 * sx);
    g.fillStyle = '#dfe6ee'; g.strokeStyle = CHALK; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-9, 50); g.lineTo(9, 50); g.lineTo(9, -110); g.lineTo(0, -130); g.lineTo(-9, -110); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = YELLOW; g.fillRect(-36, 50, 72, 12);
    g.fillStyle = '#6b4022'; g.fillRect(-7, 62, 14, 40);
    g.fillStyle = YELLOW; g.beginPath(); g.arc(0, 108, 10, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  g.restore();
}

/** A chalk formula on a little slate. */
function formula(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#f1ead8'; g.fillRect(-130, -170, 260, 170);
  g.strokeStyle = '#6b4022'; g.lineWidth = 8; g.strokeRect(-130, -170, 260, 170);
  text(g, 'a² + b²', 0, -120, 46, '#1a1a1a');
  text(g, '= ?', 0, -55, 52, RED);
  g.restore();
}

function star(g, x, y, s, u = 0, { color = YELLOW } = {}) {
  g.save(); g.translate(x, y - 70 * s); g.scale(s, s); g.rotate(Math.sin(u * 2) * 0.1);
  g.fillStyle = color; g.strokeStyle = CHALK; g.lineWidth = 4;
  g.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 30 : 72, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.fill(); g.stroke();
  g.restore();
}

/** Big cartoon nose (side view). opts.missing cuts a chunk out; opts.metal paints it gold. */
function noseShape(g, x, y, s, u, { missing = false, metal = false } = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (metal) {
    const grd = g.createLinearGradient(-80, -200, 80, 0);
    grd.addColorStop(0, '#fff1b0'); grd.addColorStop(0.45, '#e2b33c'); grd.addColorStop(1, '#a8781e');
    g.fillStyle = grd;
  } else g.fillStyle = '#f0c9a0';
  g.strokeStyle = CHALK; g.lineWidth = 6;
  g.beginPath();
  g.moveTo(-40, -220); g.quadraticCurveTo(-30, -120, 60, -40);
  if (missing) { g.lineTo(40, -40); g.lineTo(60, -10); g.lineTo(20, -10); } else g.quadraticCurveTo(70, -6, 20, -6);
  g.quadraticCurveTo(-10, 0, -40, -20); g.lineTo(-60, -220); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = metal ? '#7a5410' : '#c58a6a'; g.beginPath(); g.ellipse(-2, -24, 14, 7, 0.2, 0, Math.PI * 2); g.fill();
  if (missing) { // the missing piece, flying away
    const k = (u * 0.8) % 1;
    g.save(); g.translate(90 + k * 60, -20 - k * 80); g.rotate(k * 4);
    g.fillStyle = '#f0c9a0'; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, 6); g.lineTo(10, 28); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  g.restore();
}

/** Island in the sea with a domed observatory. */
function island(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  chalkStyle(g, BLUE, 5);
  for (let i = 0; i < 4; i++) drawPath(g, [[-230 + i * 120 + Math.sin(u * 2 + i) * 10, 10 + (i % 2) * 22], [-180 + i * 120 + Math.sin(u * 2 + i) * 10, 10 + (i % 2) * 22]], 1, i);
  g.fillStyle = '#5a8a4a'; g.strokeStyle = CHALK; g.lineWidth = 5;
  g.beginPath(); g.ellipse(0, -10, 200, 44, 0, Math.PI, 0); g.fill(); g.stroke();
  g.fillStyle = '#c4674c'; g.fillRect(-70, -140, 140, 100); g.strokeRect(-70, -140, 140, 100);
  g.fillStyle = '#4f9a86'; g.beginPath(); g.arc(0, -140, 50, Math.PI, 0); g.fill(); g.stroke();
  for (const sx of [-1, 1]) { g.fillStyle = '#c4674c'; g.fillRect(sx * 90 - 18, -120, 36, 80); g.fillStyle = '#4f9a86'; g.beginPath(); g.arc(sx * 90, -120, 20, Math.PI, 0); g.fill(); }
  g.fillStyle = YELLOW; for (const wx of [-40, 0, 40]) g.fillRect(wx - 8, -110, 16, 24);
  g.restore();
}

/** Cartoon moose (side view, facing right). */
function mooseIcon(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(u * 2) * 0.03);
  g.fillStyle = '#7a4e30'; g.strokeStyle = CHALK; g.lineWidth = 5;
  g.fillRect(-120, -180, 220, 100); g.strokeRect(-120, -180, 220, 100);
  g.fillStyle = '#5a3a24';
  for (const lx of [-105, -70, 55, 85]) g.fillRect(lx, -82, 20, 82);
  g.fillStyle = '#7a4e30';
  g.beginPath(); g.moveTo(80, -170); g.lineTo(140, -230); g.lineTo(200, -200); g.lineTo(200, -160); g.lineTo(140, -150); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#111'; g.fillRect(150, -214, 10, 10);
  g.fillStyle = '#e9dcc0';
  g.beginPath(); g.moveTo(130, -230); g.lineTo(90, -300); g.lineTo(110, -305); g.lineTo(125, -275); g.lineTo(140, -310); g.lineTo(160, -305); g.lineTo(150, -235); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

/** Beer mug with foam. */
function beer(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#f2b43a'; g.strokeStyle = CHALK; g.lineWidth = 6;
  g.fillRect(-60, -170, 120, 170); g.strokeRect(-60, -170, 120, 170);
  g.beginPath(); g.arc(60, -90, 40, -Math.PI / 2, Math.PI / 2); g.stroke();
  g.fillStyle = '#fbf6e6';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-45 + i * 30, -172 - Math.sin(u * 3 + i) * 4, 24, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 4; i++) g.fillRect(-30 + i * 18, -120 + ((u * 40 + i * 25) % 100), 6, 6);
  g.restore();
}

/** Staircase going down with a tumble mark. */
function stairs(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  chalkStyle(g, CHALK, 8);
  const pts = [[-130, -200]];
  for (let i = 0; i < 5; i++) { pts.push([-130 + i * 52 + 52, -200 + i * 40]); pts.push([-130 + i * 52 + 52, -200 + i * 40 + 40]); }
  drawPath(g, pts, 1, 4);
  chalkStyle(g, YELLOW, 6);
  const k = (u * 0.6) % 1;
  for (let i = 0; i < 3; i++) { const a = k * 8 + i * 2.1; drawPath(g, [[-80 + k * 200 + Math.cos(a) * 30, -230 + k * 200 + Math.sin(a) * 30], [-80 + k * 200 + Math.cos(a + 1) * 30, -230 + k * 200 + Math.sin(a + 1) * 30]], 1, 20 + i); }
  text(g, '¡PUM!', 90, -230, 54, RED);
  g.restore();
}

Object.assign(ICONS, {
  angry, bucket, swords, formula, star, island, moose: mooseIcon, beer, stairs,
  nose: (g, x, y, s, u, o) => noseShape(g, x, y, s, u, o),
  noseBroken: (g, x, y, s, u) => noseShape(g, x, y, s, u, { missing: true }),
  metalNose: (g, x, y, s, u) => noseShape(g, x, y, s, u, { metal: true }),
});

// ---------------------------------------------------------------- scenes

function sparkles(g, cx, cy, R, u, n = 7) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(i) * 0.5;
    const tw = Math.max(0, Math.sin(u * 4 + i * 1.7));
    if (tw <= 0.05) continue;
    const x = cx + Math.cos(a) * R * (0.8 + hash(i + 3) * 0.3), y = cy + Math.sin(a) * R * 0.7;
    g.save(); g.translate(x, y); g.scale(tw, tw);
    g.fillStyle = YELLOW; g.beginPath();
    for (let j = 0; j < 8; j++) { const r = j % 2 ? 8 : 30, b = j * Math.PI / 4; g.lineTo(Math.cos(b) * r, Math.sin(b) * r); }
    g.closePath(); g.fill(); g.restore();
  }
}

/**
 * showcase: one big icon popping in, optional sparkles, optional museum display case, optional title.
 * params: { icon, scale, sparkle, case, plaque, title }
 */
function showcase(g, W, H, u, d, p) {
  const cx = W / 2, base = H / 2 + 230;
  if (p.case) {
    const k = ease(prog(u, 0.1, 0.5));
    g.fillStyle = '#5a3a20'; g.fillRect(cx - 260, base, 520, 90 * k);
    g.fillStyle = YELLOW; g.fillRect(cx - 270, base - 6, 540, 12);
  }
  pop(g, cx, base, backOut(prog(u, p.case ? 0.5 : 0.2, 0.5)), () => icon(g, p.icon ?? 'bucket', 0, 0, p.scale ?? 1.5, u));
  if (p.case) {
    const k = ease(prog(u, 1.0, 0.5));
    g.save(); g.globalAlpha = k;
    g.fillStyle = 'rgba(142,197,255,0.16)'; g.fillRect(cx - 250, base - 470, 500, 470);
    g.strokeStyle = BLUE; g.lineWidth = 6; g.strokeRect(cx - 250, base - 470, 500, 470);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.save(); g.translate(cx - 170, base - 400); g.rotate(0.5); g.fillRect(0, 0, 18, 200); g.restore();
    g.restore();
    if (p.plaque) {
      g.fillStyle = '#e9dcb5'; g.fillRect(cx - 240, base + 18, 480, 58);
      text(g, p.plaque, cx, base + 48, 36, '#5a2e12', prog(u, 1.4, 0.3));
    }
  }
  if (p.sparkle) sparkles(g, cx, base - 160 * (p.scale ?? 1.5) / 1.5, 300, u - 0.8);
  if (p.title) text(g, p.title, W / 2, H - 50, 58, YELLOW, prog(u, 1.4, 0.3));
}

/**
 * mapRivals: a named map with two (or more) pins and an icon above each (default: angry faces), joined by a jagged "versus" spark.
 * params: { map, pins: [{ x, y, label, labelDx, labelDy }], icon, title }
 */
function mapRivals(g, W, H, u, d, p) {
  drawMapShapes(g, u, p.map ?? 'italy');
  const pins = p.pins ?? [];
  pins.forEach((pt, i) => {
    const at = 1.0 + i * 0.35;
    if (u < at) return;
    const k = backOut(prog(u, at, 0.5));
    const drop = (1 - ease(prog(u, at, 0.4))) * -120;
    pin(g, pt.x, pt.y + drop, k);
    text(g, pt.label ?? '', pt.x + (pt.labelDx ?? 0), pt.y + (pt.labelDy ?? 50), 60, CHALK, prog(u, at + 0.3, 0.3));
    pop(g, pt.x + (pt.iconDx ?? 0), pt.y - 90, backOut(prog(u, at + 0.6, 0.4)), () => icon(g, p.icon ?? 'angry', 0, 0, p.iconScale ?? 1.0, u + i));
  });
  if (pins.length === 2 && u > 2.3) {
    const [a, b] = pins, mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 140;
    chalkStyle(g, YELLOW, 8);
    drawPath(g, [[mx - 30, my - 50], [mx + 10, my - 10], [mx - 15, my + 5], [mx + 30, my + 50]], ease(prog(u, 2.3, 0.3)), 5);
  }
  if (p.title) text(g, p.title, W / 2, H - 50, 58, YELLOW, prog(u, 2.6, 0.3));
}

/**
 * versus: two armies counting up side by side, the bigger one with more soldier icons.
 * params: { left: { value, label, color }, right: { value, label, color }, icon, title }
 */
function versus(g, W, H, u, d, p) {
  const sides = [p.left ?? { value: 30000, label: 'BOLONIA' }, p.right ?? { value: 7000, label: 'MÓDENA' }];
  const maxV = Math.max(...sides.map((s) => s.value));
  const k = ease(prog(u, 0.4, Math.max(1.2, d - 1.8)));
  sides.forEach((s, i) => {
    const cx = i === 0 ? W * 0.27 : W * 0.73, color = s.color ?? (i === 0 ? RED : BLUE);
    text(g, s.label ?? '', cx, 90, 60, color, prog(u, 0.1 + i * 0.2, 0.3));
    const n = Math.round(s.value * k);
    pop(g, cx, 210, 1 + (k < 1 ? 0.05 * Math.sin(u * 18 + i) : 0), () => text(g, n.toLocaleString('es-ES'), 0, 0, 110, k >= 1 ? YELLOW : CHALK));
    const count = Math.max(1, Math.round((s.value / maxV) * 15 * k));
    for (let j = 0; j < count; j++) {
      const col = j % 5, row = Math.floor(j / 5);
      icon(g, p.icon ?? 'soldier', cx - 200 + col * 100, 470 + row * 150, 0.42, u * 3 + j, { color: j % 6 === 2 ? color : CHALK });
    }
  });
  text(g, 'VS', W / 2, 260, 100, RED, prog(u, 0.6, 0.2));
  if (p.title) text(g, p.title, W / 2, H - 50, 58, YELLOW, prog(u, d - 1, 0.3));
}

export const SCENES_V3 = { showcase, mapRivals, versus };
export { CHALK_DIM, GREEN, ORANGE };
