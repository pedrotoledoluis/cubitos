// Board icons + scenes for 026 (papacóptero), drawn with canvas shapes (no emoji: the headless renderer has no
// color-emoji font). Icons: helicopter (side view, spinning rotor), idCard (generic ID card, no face), plane.
// Scenes: andesRoute (coast -> Andes flight with a helicopter and a crossed-out runway), iconStat (icon + big value
// + label + sub). Registered from scenes.js.
// Icon origin = bottom center; at scale 1 each is about 220 px tall.
import { CHALK, YELLOW, RED, BLUE, GREEN, text, pop, icon, backOut, ease, prog, ICONS } from './chalk.js';

const INK = '#1a1a22', OLIVE = '#7a8a58', OLIVE_DARK = '#5a6a40';

/** Side-view transport helicopter facing right; the main rotor "spins" (blade length oscillates). */
function helicopter(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  // tail boom + fin + tail rotor
  g.fillStyle = OLIVE;
  g.beginPath(); g.moveTo(-90, -120); g.lineTo(-250, -135); g.lineTo(-250, -112); g.lineTo(-90, -80); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-235, -125); g.lineTo(-275, -200); g.lineTo(-250, -200); g.lineTo(-215, -125); g.closePath(); g.fill();
  g.fillStyle = RED; g.fillRect(-262, -190, 8, 34); g.fillStyle = '#f4f4f0'; g.fillRect(-254, -190, 8, 34); g.fillStyle = RED; g.fillRect(-246, -190, 8, 34);
  g.save(); g.translate(-258, -165); g.rotate(u * 9); g.fillStyle = INK; g.fillRect(-4, -40, 8, 80); g.fillRect(-40, -4, 80, 8); g.restore();
  // cabin with rounded nose
  g.fillStyle = OLIVE;
  g.beginPath(); g.moveTo(-110, -40); g.lineTo(-110, -150); g.quadraticCurveTo(-100, -175, -60, -175);
  g.lineTo(90, -175); g.quadraticCurveTo(170, -170, 175, -95); g.quadraticCurveTo(170, -40, 120, -40); g.closePath(); g.fill();
  g.fillStyle = OLIVE_DARK; g.fillRect(-60, -205, 130, 32); // engine housing
  g.fillStyle = '#9ad0ff'; // cockpit glass
  g.beginPath(); g.moveTo(110, -165); g.quadraticCurveTo(160, -160, 168, -110); g.lineTo(110, -110); g.closePath(); g.fill();
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-75 + i * 42, -120, 13, 0, Math.PI * 2); g.fill(); } // portholes
  g.fillStyle = RED; g.fillRect(-100, -75, 230, 7); // cheat line
  g.fillStyle = OLIVE_DARK; g.fillRect(-40, -95, 70, 35); // side tank
  // wheels
  g.fillStyle = INK;
  for (const wx of [-40, 120]) { g.fillRect(wx - 3, -42, 6, 22); g.beginPath(); g.arc(wx, -16, 16, 0, Math.PI * 2); g.fill(); }
  // rotor mast + blades (spinning: projected length oscillates)
  g.fillStyle = INK; g.fillRect(2, -228, 10, 25);
  const L = 230 * (0.55 + 0.45 * Math.abs(Math.cos(u * 12)));
  g.fillRect(7 - L, -232, L * 2, 8);
  g.fillStyle = YELLOW; g.fillRect(7 - L, -232, 18, 8); g.fillRect(7 + L - 18, -232, 18, 8);
  g.restore();
}

/** Generic ID card with a red-white-red band, no face (just a silhouette square), "PERÚ". */
function idCard(g, x, y, s) {
  g.save(); g.translate(x, y - 110); g.scale(s, s); g.rotate(-0.06);
  g.fillStyle = INK; g.fillRect(-152, -92, 312, 200);
  g.fillStyle = '#eef2f6'; g.fillRect(-160, -100, 312, 200);
  g.fillStyle = RED; g.fillRect(-160, -100, 104, 40); g.fillStyle = '#ffffff'; g.fillRect(-56, -100, 104, 40); g.fillStyle = RED; g.fillRect(48, -100, 104, 40);
  text(g, 'PERÚ', -4, -78, 30, INK);
  g.fillStyle = '#b8c4d0'; g.fillRect(-140, -45, 90, 120); // photo box
  g.fillStyle = '#8a98a8'; g.fillRect(-118, -25, 46, 40); g.fillRect(-130, 25, 70, 40); // generic silhouette
  g.fillStyle = '#7a8898'; for (let i = 0; i < 4; i++) g.fillRect(-30, -35 + i * 30, 160 - i * 25, 12); // text lines
  g.restore();
}

/** Small airliner silhouette facing right. */
function plane(g, x, y, s) {
  g.save(); g.translate(x, y - 60); g.scale(s, s);
  g.fillStyle = CHALK;
  g.beginPath(); g.ellipse(0, 0, 150, 26, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(-20, 0); g.lineTo(-70, 90); g.lineTo(-30, 90); g.lineTo(40, 0); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-110, 0); g.lineTo(-150, -70); g.lineTo(-125, -70); g.lineTo(-80, 0); g.closePath(); g.fill();
  g.restore();
}

Object.assign(ICONS, { helicopter, idCard, plane });

/** Text that shrinks to fit maxW. */
function fitText(g, str, x, y, size, color, alpha, maxW) {
  g.save(); g.font = `900 ${size}px "HC Display", "Arial Black", sans-serif`;
  const w = g.measureText(str).width; g.restore();
  text(g, str, x, y, w > maxW ? size * maxW / w : size, color, alpha);
}

/**
 * andesRoute: coast at the left (sea + city pin), Andes at the right (pin on a slope), a helicopter flies an arc
 * between them; at the destination a runway with a plane gets crossed out. params: { from, to, alt, title, sub, noRunway }
 */
function andesRoute(g, W, H, u, d, p) {
  const base = H - 150;
  // sea + coast
  const ks = ease(prog(u, 0.0, 0.5));
  g.fillStyle = `rgba(80,150,230,${0.55 * ks})`; g.fillRect(0, base - 30, 170, 160);
  g.fillStyle = `rgba(243,240,228,${0.18 * ks})`; g.fillRect(170, base - 30, W - 170, 160);
  // mountains (right), drawn growing from the ground
  const km = ease(prog(u, 0.2, 0.7));
  if (km > 0) {
    g.fillStyle = '#7a86a8';
    g.beginPath(); g.moveTo(560, base - 30);
    for (const [mx, my] of [[700, 380], [800, 470], [930, 300], [1060, 440], [1180, 340], [1280, 420]]) g.lineTo(mx, base - 30 - (base - 30 - my) * km);
    g.lineTo(W, base - 30); g.closePath(); g.fill();
    g.fillStyle = `rgba(246,248,255,${km})`;
    for (const [mx, my] of [[930, 300], [1180, 340]]) { g.beginPath(); g.moveTo(mx, my); g.lineTo(mx - 45, my + 45); g.lineTo(mx + 45, my + 45); g.closePath(); g.fill(); }
  }
  const A = [230, base - 40], B = [1000, 520];
  // pins + labels
  pop(g, A[0], A[1], backOut(prog(u, 0.5, 0.4)), () => { g.fillStyle = YELLOW; g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill(); });
  fitText(g, p.from ?? 'CHICLAYO', A[0] + 40, A[1] + 70, 46, CHALK, prog(u, 0.6, 0.3), 380);
  pop(g, B[0], B[1], backOut(prog(u, 0.9, 0.4)), () => { g.fillStyle = YELLOW; g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill(); });
  fitText(g, p.to ?? 'SANTA CRUZ', B[0], B[1] + 62, 44, CHALK, prog(u, 1.0, 0.3), 420);
  if (p.alt) fitText(g, p.alt, B[0] + 10, B[1] + 112, 38, YELLOW, prog(u, 1.2, 0.3), 380);
  // dashed arc + helicopter traveling along it
  const tw = ease(prog(u, 1.2, Math.max(1.2, d - 2.6)));
  const pt = (k) => { const mx = (A[0] + B[0]) / 2, my = Math.min(A[1], B[1]) - 260; return [(1 - k) ** 2 * A[0] + 2 * (1 - k) * k * mx + k * k * B[0], (1 - k) ** 2 * A[1] + 2 * (1 - k) * k * my + k * k * B[1]]; };
  if (u > 1.2) {
    g.strokeStyle = YELLOW; g.lineWidth = 6; g.setLineDash([16, 14]);
    g.beginPath(); for (let i = 0; i <= 40; i++) { const [px, py] = pt(tw * i / 40); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
    g.setLineDash([]);
    const [hx, hy] = pt(tw);
    icon(g, 'helicopter', hx, hy - 30, 0.42, u);
  }
  // runway + plane, crossed out at the destination
  if (p.noRunway !== false) {
    const kr = backOut(prog(u, 1.6, 0.4));
    if (kr > 0) {
      g.save(); g.translate(1110, 190); g.scale(kr, kr);
      g.fillStyle = '#4a4e52'; g.fillRect(-130, 10, 260, 40);
      g.fillStyle = CHALK; for (let i = 0; i < 5; i++) g.fillRect(-115 + i * 52, 26, 30, 8);
      icon(g, 'plane', 0, 0, 0.55);
      const kx = prog(u, 2.0, 0.35);
      g.strokeStyle = RED; g.lineWidth = 16; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-120, -80); g.lineTo(-120 + 240 * kx, -80 + 150 * kx); g.stroke();
      if (kx >= 1) { const k2 = prog(u, 2.3, 0.3); g.beginPath(); g.moveTo(120, -80); g.lineTo(120 - 240 * k2, -80 + 150 * k2); g.stroke(); }
      g.restore();
      fitText(g, 'SIN PISTA', 1110, 300, 44, RED, prog(u, 2.2, 0.3), 300);
    }
  }
  if (p.title) fitText(g, p.title, W / 2 - 160, 86, 62, YELLOW, prog(u, 0.2, 0.4), 760);
  if (p.sub) fitText(g, p.sub, W / 2, H - 40, 44, CHALK, prog(u, 1.8, 0.4), W - 160);
}

/** iconStat: icon at the left, big value + label at the right, title on top, sub at the bottom. */
function iconStat(g, W, H, u, d, p) {
  fitText(g, p.title ?? '', W / 2, 90, 66, YELLOW, prog(u, 0.2, 0.4), W - 120);
  pop(g, p.iconX ?? 380, H - 210, backOut(prog(u, 0.3, 0.5)), () => icon(g, p.icon ?? 'helicopter', 0, 0, p.scale ?? 1.2, u));
  const k = backOut(prog(u, 0.8, 0.5));
  pop(g, 930, 400, k, () => fitText(g, String(p.value ?? ''), 0, 0, 200, p.color ?? GREEN, 1, 520));
  fitText(g, p.label ?? '', 930, 570, 60, CHALK, prog(u, 1.1, 0.4), 560);
  if (p.sub) fitText(g, p.sub, W / 2, H - 70, 46, p.subColor ?? BLUE, prog(u, 1.5, 0.4), W - 140);
}

export const SCENES_V10 = { andesRoute, iconStat };
