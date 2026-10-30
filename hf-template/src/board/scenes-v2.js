// Board scenes and icons added for episodes 5+ (Diogenes, Emperor Norton). Registered from scenes.js.
// Same contract as scenes.js: scene(g, W, H, u, d, params), deterministic.
import {
  CHALK, CHALK_DIM, YELLOW, RED, BLUE, GREEN, ORANGE, PINK, chalkStyle, drawPath, text, pop, icon, ICONS,
  ease, backOut, prog, hash,
} from './chalk.js';

// ---------------------------------------------------------------- maps (board coordinates, 1280x886)

export const MAPS = {
  // Greece: mainland + Peloponnese + a few islands (cartoon).
  greece: {
    shapes: [
      [[260, 120], [520, 90], [760, 110], [900, 170], [860, 230], [700, 250], [760, 330], [720, 400], [800, 470], [740, 520],
        [640, 470], [560, 500], [470, 470], [400, 400], [330, 330], [290, 240]],
      [[430, 520], [560, 520], [610, 580], [580, 680], [620, 760], [540, 740], [500, 790], [450, 720], [400, 760], [380, 640]],
    ],
    islands: [[900, 560, 40, 22], [980, 640, 34, 18], [860, 700, 28, 16], [1040, 520, 26, 16], [760, 800, 120, 18]],
  },
  // Contiguous USA (cartoon).
  usa: {
    shapes: [[[120, 230], [300, 200], [560, 210], [820, 220], [960, 180], [1080, 140], [1150, 190], [1100, 300], [1050, 380],
      [980, 470], [1010, 600], [960, 640], [900, 560], [760, 560], [660, 640], [600, 600], [480, 560], [330, 530], [230, 480],
      [150, 420], [110, 320]]],
    islands: [],
  },
};

function drawMap(g, u, name) {
  const m = MAPS[name];
  chalkStyle(g, CHALK, 6);
  m.shapes.forEach((pts, i) => drawPath(g, pts, ease(prog(u, i * 0.3, 1.1)), 3 + i * 5, true));
  m.islands.forEach(([x, y, rx, ry], i) => {
    const k = prog(u, 0.8 + i * 0.1, 0.3);
    if (k <= 0) return;
    g.save(); g.globalAlpha = k; chalkStyle(g, CHALK, 5);
    g.beginPath(); g.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2); g.stroke(); g.restore();
  });
}

// ---------------------------------------------------------------- icons

/** Big clay jar (tinaja / pithos) lying on its side. */
function jar(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#c8653a'; g.strokeStyle = CHALK; g.lineWidth = 6;
  g.beginPath(); g.ellipse(0, -70, 120, 72, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#1c0f08'; g.beginPath(); g.ellipse(112, -70, 26, 46, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  chalkStyle(g, '#8e3f1e', 5);
  drawPath(g, [[-60, -136], [-60, -4]], 1, 3); drawPath(g, [[20, -140], [20, 0]], 1, 5);
  g.restore();
}

function bowl(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#c8653a'; g.strokeStyle = CHALK; g.lineWidth = 6;
  g.beginPath(); g.moveTo(-80, -70); g.quadraticCurveTo(0, 40, 80, -70); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = BLUE; g.fillRect(-60, -76, 120, 12);
  g.restore();
}

/** Two cupped hands holding water. */
function hands(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#f0c9a0'; g.strokeStyle = CHALK; g.lineWidth = 5;
  for (const sx of [-1, 1]) {
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sx * 90, 0, sx * 80, -80); g.lineTo(sx * 50, -80); g.quadraticCurveTo(sx * 40, -30, 0, -30); g.closePath();
    g.fill(); g.stroke();
  }
  g.fillStyle = BLUE; g.beginPath(); g.ellipse(0, -62, 60, 14, 0, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 3; i++) { const dy = ((u * 60 + i * 30) % 90); g.fillRect(-4 + (i - 1) * 30, -10 + dy * 0.6, 8, 14); }
  g.restore();
}

/** Two legs (a biped). */
function legs(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  chalkStyle(g, CHALK, 12);
  drawPath(g, [[-30, -170], [-40, -80], [-30, 0], [-80, 0]], 1, 2);
  drawPath(g, [[30, -170], [40, -80], [30, 0], [80, 0]], 1, 4);
  chalkStyle(g, CHALK, 8); drawPath(g, [[-50, -175], [50, -175]], 1, 6);
  g.restore();
}

function feather(g, x, y, s) {
  g.save(); g.translate(x, y - 80 * s); g.scale(s, s); g.rotate(-0.5);
  g.fillStyle = '#f6f3ea'; g.strokeStyle = CHALK; g.lineWidth = 4;
  g.beginPath(); g.moveTo(0, 100); g.quadraticCurveTo(-60, 0, 0, -110); g.quadraticCurveTo(60, 0, 0, 100); g.fill(); g.stroke();
  chalkStyle(g, '#9a8a70', 4); drawPath(g, [[0, 130], [0, -100]], 1, 3);
  for (let i = 0; i < 5; i++) drawPath(g, [[0, 60 - i * 35], [(i % 2 ? 1 : -1) * 32, 40 - i * 35]], 1, 9 + i);
  g.restore();
}

/** Plucked chicken: pink body, bumps, no feathers, little drumsticks. */
function pluckedChicken(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(u * 3) * 0.05);
  g.fillStyle = '#f3b9a2'; g.strokeStyle = CHALK; g.lineWidth = 6;
  g.beginPath(); g.ellipse(0, -90, 95, 70, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(85, -175, 34, 34, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = RED; g.fillRect(70, -222, 34, 18);
  g.fillStyle = YELLOW; g.beginPath(); g.moveTo(116, -180); g.lineTo(150, -170); g.lineTo(116, -160); g.fill();
  g.fillStyle = '#111'; g.fillRect(90, -186, 8, 8);
  g.fillStyle = '#e39a86';
  for (let i = 0; i < 12; i++) g.fillRect(-70 + hash(i) * 140, -140 + hash(i + 5) * 90, 7, 7);
  chalkStyle(g, YELLOW, 8);
  drawPath(g, [[-30, -25], [-36, 20], [-60, 24]], 1, 3); drawPath(g, [[30, -25], [36, 20], [60, 24]], 1, 5);
  g.restore();
}

/** Oil lamp with a glow. */
function lamp(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const glow = g.createRadialGradient(40, -80, 5, 40, -80, 160);
  glow.addColorStop(0, 'rgba(255,226,122,0.75)'); glow.addColorStop(1, 'rgba(255,226,122,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(40, -80, 160, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c8653a'; g.strokeStyle = CHALK; g.lineWidth = 5;
  g.beginPath(); g.ellipse(0, -30, 60, 28, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillRect(40, -46, 36, 18);
  g.fillStyle = ORANGE;
  const f = 1 + Math.sin(u * 17) * 0.15;
  g.beginPath(); g.moveTo(60, -50); g.quadraticCurveTo(80, -80 * f, 66, -100 * f); g.quadraticCurveTo(50, -76 * f, 60, -50); g.fill();
  chalkStyle(g, CHALK, 5); drawPath(g, [[-50, -40], [-90, -80], [-40, -90]], 1, 4);
  g.restore();
}

function crown(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = YELLOW; g.strokeStyle = CHALK; g.lineWidth = 5;
  g.beginPath(); g.moveTo(-90, 0); g.lineTo(-90, -90); g.lineTo(-45, -45); g.lineTo(0, -110); g.lineTo(45, -45); g.lineTo(90, -90); g.lineTo(90, 0);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = RED; for (const cx of [-50, 0, 50]) { g.beginPath(); g.arc(cx, -22, 10, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

/** US Capitol (dome + wings). */
function capitol(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#e9e4d6'; g.strokeStyle = CHALK; g.lineWidth = 5;
  g.fillRect(-150, -70, 300, 70); g.strokeRect(-150, -70, 300, 70);
  g.fillRect(-50, -120, 100, 50);
  g.beginPath(); g.arc(0, -120, 50, Math.PI, 0); g.fill(); g.stroke();
  g.fillRect(-6, -190, 12, 24);
  g.fillStyle = '#7a8aa0'; for (let i = 0; i < 8; i++) g.fillRect(-135 + i * 36, -60, 14, 50);
  g.restore();
}

/** Emperor Norton portrait: plumed hat, beard, epaulettes. */
function norton(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#1c2a52'; g.fillRect(-80, -40, 160, 80);
  g.fillStyle = YELLOW; g.fillRect(-92, -44, 40, 14); g.fillRect(52, -44, 40, 14);
  g.fillStyle = '#f0c9a0'; g.fillRect(-46, -140, 92, 100);
  g.fillStyle = '#5a4a3a'; g.beginPath(); g.moveTo(-50, -80); g.lineTo(50, -80); g.lineTo(30, -26); g.lineTo(-30, -26); g.fill();
  g.fillStyle = '#111'; g.fillRect(-26, -116, 10, 10); g.fillRect(16, -116, 10, 10);
  g.fillStyle = '#1b1b22'; g.fillRect(-50, -200, 100, 64); g.fillRect(-64, -142, 128, 10);
  g.fillStyle = YELLOW; g.fillRect(-50, -152, 100, 10);
  g.fillStyle = GREEN; g.save(); g.translate(30, -200); g.rotate(-0.5 + Math.sin(u * 3) * 0.08); g.fillRect(-8, -70, 16, 70); g.restore();
  g.fillStyle = RED; g.save(); g.translate(40, -196); g.rotate(-0.2 + Math.sin(u * 3 + 1) * 0.08); g.fillRect(-7, -60, 14, 60); g.restore();
  g.restore();
}

function crossOut(g, x, y, r, k) {
  if (k <= 0) return;
  chalkStyle(g, RED, 14);
  drawPath(g, [[x - r, y - r], [x + r, y + r]], Math.min(1, k * 2), 41);
  if (k > 0.5) drawPath(g, [[x + r, y - r], [x - r, y + r]], (k - 0.5) * 2, 43);
}

Object.assign(ICONS, { jar, bowl, hands, legs, feather, pluckedChicken, lamp, crown, capitol, norton });

// ---------------------------------------------------------------- scenes

/** labelled: one big icon with a hand-lettered tag that swings in. params: { icon, label, title, scale } */
function labelled(g, W, H, u, d, p) {
  pop(g, W / 2 - 140, H / 2 + 170, backOut(prog(u, 0.2, 0.5)), () => icon(g, p.icon ?? 'pluckedChicken', 0, 0, p.scale ?? 1.4, u));
  const k = backOut(prog(u, 1.0, 0.5));
  if (k > 0) {
    g.save(); g.translate(W / 2 + 260, H / 2 - 40); g.rotate(0.12 - (1 - k) * 0.8); g.scale(k, k);
    chalkStyle(g, CHALK, 4); drawPath(g, [[-150, 0], [-300, 60]], 1, 3);
    g.fillStyle = '#f1ead8'; g.fillRect(-150, -60, 330, 120);
    text(g, p.label ?? 'HOMBRE', 15, 4, 78, '#5a2e12');
    g.restore();
  }
  if (p.title) text(g, p.title, W / 2, H - 60, 52, YELLOW, prog(u, 1.8, 0.3));
}

/** lampSearch: a crowd of stick people, a glowing lamp sweeps across them, a "?" above each. params: { title, crowd } */
function lampSearch(g, W, H, u, d, p) {
  const n = p.crowd ?? 6;
  const lx = 180 + ((Math.sin(u * 1.1 - 1.5) + 1) / 2) * (W - 360);
  for (let i = 0; i < n; i++) {
    const x = W / 2 + (i - (n - 1) / 2) * 175, y = H / 2 + 230;
    const lit = Math.abs(x - lx) < 110;
    pop(g, x, y, backOut(prog(u, 0.2 + i * 0.1, 0.35)), () => icon(g, 'person', 0, 0, 0.62, 0, { color: lit ? YELLOW : CHALK_DIM }));
    if (lit && u > 1.0) text(g, '?', x, y - 175, 70, RED);
  }
  if (u > 0.6) icon(g, 'lamp', lx, H / 2 - 120, 0.9, u);
  if (p.title) text(g, p.title, W / 2, 90, 58, YELLOW, prog(u, 1.4, 0.3));
}

/** newspaper: front page with masthead, date and a stamped headline. params: { masthead, date, headline, sub } */
function newspaper(g, W, H, u, d, p) {
  const k = ease(prog(u, 0.1, 0.6));
  g.save(); g.translate(W / 2, H / 2 + 20); g.rotate((1 - k) * -0.6 - 0.04); g.scale(0.3 + 0.7 * k, 0.3 + 0.7 * k);
  g.fillStyle = '#f1ead8'; g.fillRect(-470, -350, 940, 700);
  g.fillStyle = '#1a1a1a';
  text(g, p.masthead ?? 'THE DAILY', 0, -290, 60, '#1a1a1a');
  g.fillRect(-430, -250, 860, 6); g.fillRect(-430, -228, 860, 3);
  text(g, p.date ?? '', 0, -205, 30, '#444');
  g.fillStyle = '#9a9488';
  for (let c = 0; c < 3; c++) for (let i = 0; i < 6; i++) g.fillRect(-420 + c * 290, 130 + i * 32, 250 - hash(c * 9 + i) * 60, 12);
  g.restore();
  const hk = backOut(prog(u, 0.9, 0.4));
  pop(g, W / 2, H / 2 - 40, hk * (1 + 0.04 * Math.sin(u * 8)), () => text(g, p.headline ?? '', 0, 0, 130, RED));
  if (p.sub) text(g, p.sub, W / 2, H / 2 + 70, 46, '#1a1a1a', prog(u, 1.4, 0.3));
}

/** decree: a scroll titled DECRETO with an icon that gets crossed out. params: { label, icon, title } */
function decree(g, W, H, u, d, p) {
  const k = ease(prog(u, 0.1, 0.7));
  const w = 820 * k, h = 640, x0 = W / 2 - w / 2, y0 = 60;
  g.fillStyle = '#e9dcb5'; g.fillRect(x0, y0, w, h);
  g.fillStyle = '#c9b27f'; for (const x of [x0 - 30, x0 + w]) g.fillRect(x, y0 - 20, 30, h + 40);
  if (k > 0.95) {
    text(g, p.label ?? 'DECRETO', W / 2, y0 + 80, 84, '#5a2e12', prog(u, 0.8, 0.3));
    pop(g, W / 2, y0 + 420, backOut(prog(u, 1.1, 0.4)), () => icon(g, p.icon ?? 'capitol', 0, 0, 1.2, u));
    crossOut(g, W / 2, y0 + 330, 200, prog(u, 1.9, 0.6));
    g.fillStyle = '#b3261e'; pop(g, x0 + w - 110, y0 + h - 90, backOut(prog(u, 2.6, 0.3)), () => { g.beginPath(); g.arc(0, 0, 48, 0, Math.PI * 2); g.fill(); });
  }
  if (p.title) text(g, p.title, W / 2, H - 70, 56, YELLOW, prog(u, 2.4, 0.3));
}

/** banknote: a green bill with a portrait and value. params: { value, label, face } */
function banknote(g, W, H, u, d, p) {
  const k = backOut(prog(u, 0.1, 0.6));
  pop(g, W / 2, H / 2, k, () => {
    g.rotate(-0.05 + Math.sin(u * 2) * 0.02);
    g.fillStyle = '#cfe3c0'; g.fillRect(-520, -260, 1040, 520);
    g.strokeStyle = '#2f6a3a'; g.lineWidth = 14; g.strokeRect(-490, -230, 980, 460);
    g.lineWidth = 4; g.strokeRect(-460, -200, 920, 400);
    g.fillStyle = '#e8f2de'; g.beginPath(); g.ellipse(0, 10, 170, 175, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2f6a3a'; g.lineWidth = 6; g.stroke();
    icon(g, p.face ?? 'norton', 0, 120, 0.82, u);
    text(g, p.value ?? '50 ¢', -330, -100, 90, '#2f6a3a');
    text(g, p.value ?? '50 ¢', 330, 120, 90, '#2f6a3a');
    text(g, p.label ?? 'IMPERIO DE NORTON', 0, -215, 34, '#2f6a3a');
  });
  if (p.title) text(g, p.title, W / 2, H - 50, 52, YELLOW, prog(u, 1.4, 0.3));
}

/** bridge: two shores and a bay; a suspension bridge draws itself across. params: { left, right, title } */
function bridge(g, W, H, u, d, p) {
  const wy = H / 2 + 120;
  g.fillStyle = 'rgba(142,197,255,0.25)'; g.fillRect(0, wy, W, H - wy);
  chalkStyle(g, BLUE, 4);
  for (let i = 0; i < 6; i++) drawPath(g, [[200 + i * 150 + Math.sin(u * 2 + i) * 20, wy + 50 + (i % 3) * 50], [260 + i * 150 + Math.sin(u * 2 + i) * 20, wy + 50 + (i % 3) * 50]], 1, i);
  g.fillStyle = '#6a5a4a';
  g.beginPath(); g.moveTo(0, wy - 60); g.lineTo(170, wy - 40); g.lineTo(220, wy); g.lineTo(0, wy + 40); g.fill();
  g.beginPath(); g.moveTo(W, wy - 60); g.lineTo(W - 170, wy - 40); g.lineTo(W - 220, wy); g.lineTo(W, wy + 40); g.fill();
  text(g, p.left ?? 'SAN FRANCISCO', 170, wy + 110, 38, CHALK, prog(u, 0.3, 0.3));
  text(g, p.right ?? 'OAKLAND', W - 150, wy + 110, 38, CHALK, prog(u, 0.5, 0.3));
  const k = ease(prog(u, 0.8, Math.max(1.2, d - 2)));
  chalkStyle(g, ORANGE, 12);
  drawPath(g, [[200, wy - 40], [W - 200, wy - 40]], k, 3);
  for (const tx of [460, W - 460]) if (k > (tx - 200) / (W - 400)) drawPath(g, [[tx, wy + 20], [tx, wy - 260]], 1, tx);
  if (k > 0.6) { // main cable: high at the towers, sagging to the deck at mid-span
    chalkStyle(g, ORANGE, 5);
    const mid = W / 2, half = mid - 460, pts = [];
    for (let x = 460; x <= W - 460; x += 20) pts.push([x, wy - 50 - 210 * ((x - mid) / half) ** 2]);
    drawPath(g, pts, ease((k - 0.6) / 0.4), 9);
    for (let x = 500; x < W - 460; x += 60) drawPath(g, [[x, wy - 50 - 210 * ((x - mid) / half) ** 2], [x, wy - 40]], ease((k - 0.6) / 0.4), x);
  }
  if (p.title) text(g, p.title, W / 2, 90, 60, YELLOW, prog(u, 1.2, 0.3));
}

/** mapPin on a named map (greece | usa). params: { map, pin, label, icon, title, date } */
function mapPinV2(g, W, H, u, d, p) {
  drawMap(g, u, p.map ?? 'greece');
  const [px, py] = p.pin ?? [600, 420];
  const k = backOut(prog(u, 1.0, 0.5));
  const drop = (1 - ease(prog(u, 1.0, 0.4))) * -120;
  if (u > 1.0) {
    g.save(); g.translate(px, py + drop);
    g.fillStyle = RED; g.beginPath(); g.arc(0, -46, 28 * k, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(-20 * k, -36); g.lineTo(20 * k, -36); g.lineTo(0, 0); g.closePath(); g.fill();
    g.fillStyle = CHALK; g.beginPath(); g.arc(0, -46, 10 * k, 0, Math.PI * 2); g.fill();
    g.restore();
    text(g, p.label ?? '', px + (p.labelDx ?? 0), py + 44, 50, CHALK, prog(u, 1.4, 0.3));
  }
  if (p.icon) pop(g, p.iconAt?.[0] ?? px + 230, p.iconAt?.[1] ?? py + 150, backOut(prog(u, 1.8, 0.5)), () => icon(g, p.icon, 0, 0, p.iconScale ?? 0.8, u));
  if (p.date) text(g, p.date, p.dateAt?.[0] ?? px - 260, p.dateAt?.[1] ?? py + 170, 60, BLUE, prog(u, 2.2, 0.3));
  if (p.title) text(g, p.title, W / 2, H - 70, 62, YELLOW, prog(u, 2.6, 0.35));
}

export const SCENES_V2 = { labelled, lampSearch, newspaper, decree, banknote, bridge, mapPin2: mapPinV2 };
export { crossOut, PINK };
