// Chalkboard 2D animations drawn into the board's canvas texture.
// drawBoard(ctx, W, H, scene, u, d) is a pure function of (scene, u = seconds since the line started,
// d = line duration): no clocks, seeded jitter only, so any frame can be rendered in isolation.

const CHALK = '#f3f0e4';
const CHALK_DIM = 'rgba(243,240,228,0.35)';
const YELLOW = '#ffe27a';
const ORANGE = '#ff9a3c';
const RED = '#ff6b5e';
const BLUE = '#8ec5ff';
const GREEN = '#9be08a';
const FONT = '"HC Display", "Arial Black", sans-serif';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x) => { x = clamp(x); return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2; };
const backOut = (x) => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const prog = (u, a, len) => clamp((u - a) / len);

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

function background(g, W, H) {
  const grd = g.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.75);
  grd.addColorStop(0, '#2f5a44');
  grd.addColorStop(1, '#1b3a2b');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  // old eraser smudges (seeded)
  for (let i = 0; i < 14; i++) {
    g.fillStyle = 'rgba(255,255,255,0.035)';
    g.beginPath();
    g.ellipse(hash(i) * W, hash(i + 50) * H, 120 + hash(i + 9) * 160, 30 + hash(i + 3) * 40, hash(i + 7) * 3, 0, Math.PI * 2);
    g.fill();
  }
}

function chalkStyle(g, color = CHALK, w = 7) {
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
}

// Polyline drawn progressively (k = 0..1) with a tiny seeded wobble for a hand-drawn feel.
function drawPath(g, pts, k, seed = 1, close = false) {
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

function text(g, str, x, y, size, color = CHALK, alpha = 1, align = 'center') {
  g.save();
  g.globalAlpha *= alpha;
  g.font = `900 ${size}px ${FONT}`;
  g.textAlign = align; g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(str, x, y);
  g.restore();
}

function rabbit(g, x, y, s, color = CHALK, hop = 0, flip = 1) {
  g.save();
  g.translate(x, y - Math.abs(Math.sin(hop)) * 14 * s);
  g.scale(s * flip, s);
  chalkStyle(g, color, 5);
  g.beginPath(); g.ellipse(0, 0, 34, 24, 0, 0, Math.PI * 2); g.stroke(); // body
  g.beginPath(); g.arc(30, -22, 17, 0, Math.PI * 2); g.stroke(); // head
  g.beginPath(); g.ellipse(26, -56, 6, 20, -0.15, 0, Math.PI * 2); g.stroke(); // ears
  g.beginPath(); g.ellipse(38, -54, 6, 20, 0.25, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(-36, -4, 8, 0, Math.PI * 2); g.fill(); // tail
  g.beginPath(); g.arc(36, -25, 3, 0, Math.PI * 2); g.fill(); // eye
  g.restore();
}

// Tiny Napoleon: bicorne hat, blue coat, hand-in-coat.
function napoleon(g, x, y, s, alarm = 0) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
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

// --- scenes -------------------------------------------------------------

function sceneMap(g, W, H, u) {
  chalkStyle(g, CHALK, 6);
  // simplified Europe coastline (board coords)
  const coast = [[140, 640], [170, 520], [120, 430], [210, 360], [300, 380], [330, 300], [270, 230], [360, 150], [470, 130],
    [520, 210], [600, 190], [640, 120], [760, 90], [900, 110], [1040, 80], [1160, 130], [1180, 300], [1170, 520], [1100, 640],
    [960, 620], [880, 690], [780, 640], [700, 700], [640, 620], [560, 690], [500, 640], [430, 700], [360, 640], [260, 700]];
  drawPath(g, coast, ease(prog(u, 0, 1.2)), 3, true);
  const k = ease(prog(u, 0.9, 0.5));
  // France and Russia regions
  g.save(); g.globalAlpha = k;
  g.fillStyle = 'rgba(142,197,255,0.25)';
  g.beginPath(); g.moveTo(210, 360); g.lineTo(380, 330); g.lineTo(440, 470); g.lineTo(360, 600); g.lineTo(220, 560); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,107,94,0.22)';
  g.beginPath(); g.moveTo(820, 110); g.lineTo(1160, 130); g.lineTo(1170, 520); g.lineTo(860, 500); g.lineTo(780, 300); g.closePath(); g.fill();
  g.restore();
  text(g, 'FRANCIA', 320, 470, 60, BLUE, k);
  text(g, 'RUSIA', 1000, 330, 72, RED, k);
  // Napoleon travels from Paris to Tilsit
  const tw = ease(prog(u, 1.3, 1.4));
  const nx = 310 + (700 - 310) * tw, ny = 420 + (270 - 420) * tw;
  if (u > 1.2) {
    chalkStyle(g, YELLOW, 5);
    g.setLineDash([14, 14]);
    drawPath(g, [[310, 420], [500, 340], [700, 270]], tw, 7);
    g.setLineDash([]);
    napoleon(g, nx, ny - 30, 0.75 * backOut(prog(u, 1.2, 0.4)));
  }
  if (u > 2.8) {
    const p = backOut(prog(u, 2.8, 0.5));
    // handshake: two block hands meeting
    g.save(); g.translate(820, 300); g.scale(p, p);
    g.fillStyle = '#3a6fd8'; g.fillRect(-120, -18, 70, 36);
    g.fillStyle = '#c4473c'; g.fillRect(50, -18, 70, 36);
    g.fillStyle = '#f0c9a0'; g.fillRect(-52, -24, 104, 48);
    g.strokeStyle = CHALK; g.lineWidth = 5; g.strokeRect(-52, -24, 104, 48);
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 22, -24); g.lineTo(i * 22, 24); g.stroke(); }
    g.restore();
    text(g, 'PAZ  ·  TILSIT 1807', W / 2, 80 + 0 * H, 58, YELLOW, prog(u, 3.0, 0.4));
  }
}

function sceneCounter(g, W, H, u, d) {
  const k = prog(u, 0.6, Math.max(1, d - 1.4));
  const n = Math.round(3000 * (k ** 3));
  text(g, 'CONEJOS', W / 2, 90, 64, CHALK);
  const shown = n >= 3000 ? '¿3000?' : n.toLocaleString('es-ES');
  const pop = 1 + 0.08 * Math.sin(u * 18) * (k < 1 ? 1 : 0);
  g.save(); g.translate(W / 2, 230); g.scale(pop, pop);
  text(g, shown, 0, 0, 150, n >= 3000 ? YELLOW : CHALK);
  g.restore();
  // rabbits multiplying: 1, 2, 4, 8, ... up to 64 on a grid
  const count = Math.min(40, Math.floor(2 ** (prog(u, 0.3, Math.max(1, d - 1.2)) * 5.4)));
  const cols = 10;
  for (let i = 0; i < count; i++) {
    const cx = 100 + (i % cols) * 120, cy = 430 + Math.floor(i / cols) * 110;
    rabbit(g, cx, cy, 0.95, i % 7 === 3 ? YELLOW : CHALK, u * 9 + i);
  }
}

function sceneCarrot(g, W, H, u) {
  const y = H / 2 + 40;
  const a = backOut(prog(u, 0.2, 0.4)), b = backOut(prog(u, 0.9, 0.4)), c = backOut(prog(u, 1.7, 0.5));
  if (a > 0) rabbit(g, 200, y + 30, 1.9 * a, CHALK, u * 5);
  text(g, '+', 395, y, 120, YELLOW, prog(u, 0.7, 0.2));
  if (b > 0) {
    // stick human
    g.save(); g.translate(560, y); g.scale(b, b);
    chalkStyle(g, CHALK, 8);
    g.beginPath(); g.arc(0, -120, 34, 0, Math.PI * 2); g.stroke();
    drawPath(g, [[0, -86], [0, 40]], 1, 2); drawPath(g, [[-60, -40], [0, -60], [60, -40]], 1, 4);
    drawPath(g, [[-40, 130], [0, 40], [40, 130]], 1, 6);
    g.restore();
  }
  text(g, '=', 740, y, 120, YELLOW, prog(u, 1.4, 0.2));
  if (c > 0) {
    g.save(); g.translate(960, y); g.scale(c, c); g.rotate(-0.5 + Math.sin(u * 4) * 0.08);
    g.fillStyle = ORANGE;
    g.beginPath(); g.moveTo(-40, -70); g.lineTo(40, -70); g.lineTo(0, 140); g.closePath(); g.fill();
    g.strokeStyle = '#b5561a'; g.lineWidth = 4;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-30 + i * 6, -30 + i * 40); g.lineTo(-10 + i * 6, -30 + i * 40); g.stroke(); }
    g.fillStyle = GREEN;
    for (const r of [-0.5, 0, 0.5]) { g.save(); g.translate(0, -70); g.rotate(r); g.fillRect(-8, -90, 16, 90); g.restore(); }
    g.restore();
  }
  text(g, 'HUMANO = COMIDA', W / 2, 95, 70, YELLOW, prog(u, 2.2, 0.4));
}

function sceneSwarm(g, W, H, u, d) {
  const cx = W / 2, cy = H / 2 + 40;
  const k = ease(prog(u, 0.9, Math.max(1.2, d - 1.6)));
  napoleon(g, cx, cy, 0.7, prog(u, 1.4, 0.3));
  const N = 22;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2 + hash(i) * 0.3;
    const R0 = 620 + hash(i + 3) * 140;
    const R = R0 + (115 + hash(i + 5) * 40 - R0) * clamp(k * (0.75 + hash(i + 8) * 0.4));
    const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R * 0.62;
    if (i % 2 === 0) {
      chalkStyle(g, CHALK_DIM, 4);
      g.setLineDash([10, 12]);
      drawPath(g, [[cx + Math.cos(ang) * R0, cy + Math.sin(ang) * R0 * 0.62], [x, y]], 1, i);
      g.setLineDash([]);
    }
    rabbit(g, x, y, 0.75, i % 5 === 0 ? YELLOW : CHALK, u * 10 + i, Math.cos(ang) > 0 ? -1 : 1);
  }
  text(g, '¡AL ATAQUE!', W / 2, 70, 62, RED, prog(u, 2.2, 0.3));
}

function sceneCarriage(g, W, H, u) {
  const groundY = H - 150;
  chalkStyle(g, CHALK, 6);
  drawPath(g, [[0, groundY], [W, groundY]], 1, 5);
  const x = 980 - ease(prog(u, 0.3, 4.5)) * 900 + Math.sin(u * 30) * 3;
  // carriage body + wheels, fleeing to the left
  g.save(); g.translate(x, groundY - 70);
  g.fillStyle = '#3a6fd8'; g.fillRect(-120, -130, 220, 120);
  g.strokeStyle = YELLOW; g.lineWidth = 5; g.strokeRect(-120, -130, 220, 120);
  g.fillStyle = '#cfe6ff'; g.fillRect(-90, -110, 70, 50);
  napoleon(g, -55, -68, 0.38, 1);
  for (const wx of [-80, 60]) {
    g.save(); g.translate(wx, 10); g.rotate(-u * 14);
    chalkStyle(g, CHALK, 6);
    g.beginPath(); g.arc(0, 0, 52, 0, Math.PI * 2); g.stroke();
    for (let s = 0; s < 4; s++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(-52, 0); g.lineTo(52, 0); g.stroke(); }
    g.restore();
  }
  // horse (blocky) pulling to the left
  g.fillStyle = '#c9a77a'; g.fillRect(-300, -95, 130, 55); g.fillRect(-330, -140, 45, 70);
  for (let l = 0; l < 4; l++) g.fillRect(-295 + l * 32, -40, 14, 60 + Math.sin(u * 20 + l) * 10);
  chalkStyle(g, CHALK_DIM, 4); drawPath(g, [[-170, -70], [-120, -60]], 1, 3);
  g.restore();
  // speed lines behind the carriage
  chalkStyle(g, CHALK_DIM, 5);
  for (let i = 0; i < 4; i++) drawPath(g, [[x + 130 + i * 20, groundY - 180 + i * 40], [x + 230 + i * 40, groundY - 180 + i * 40]], 1, i);
  // rabbits chasing from the right
  for (let i = 0; i < 9; i++) {
    const rx = x + 330 + i * 95 + Math.sin(u * 2 + i) * 20;
    if (rx < W + 60) rabbit(g, rx, groundY - 30, 0.7, i % 4 === 1 ? YELLOW : CHALK, u * 11 + i * 1.7, -1);
  }
  text(g, '¡RETIRADA!', W / 2, 80, 70, YELLOW, prog(u, 1.0, 0.3));
}

function sceneIdle(g, W, H) {
  text(g, 'HISTORIA', W / 2, H / 2 - 70, 110, CHALK_DIM);
  text(g, 'en cubitos', W / 2, H / 2 + 50, 80, CHALK_DIM);
  rabbit(g, W - 150, H - 110, 0.9, CHALK_DIM, 0);
}

const SCENES = { map: sceneMap, counter: sceneCounter, carrot: sceneCarrot, swarm: sceneSwarm, carriage: sceneCarriage };

export function drawBoard(ctx, W, H, scene, u = 0, d = 4) {
  ctx.save();
  background(ctx, W, H);
  // retro-TV fade in at the start of a scene (scanline wipe)
  const fn = SCENES[scene];
  if (fn) fn(ctx, W, H, u, d); else sceneIdle(ctx, W, H);
  if (fn && u < 0.25) {
    ctx.fillStyle = `rgba(20,40,30,${1 - u / 0.25})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
