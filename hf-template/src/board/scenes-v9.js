// Board icons + scene for 025 (news roundup), drawn with canvas shapes (no emoji: the headless renderer has no
// color-emoji font). Icons: laptop (hacked, coins flying out), planet (with a "?" size ring), mushroom (giant
// upright club fungus with a crown), robot (AI with a formula). Scene: newsCard (countdown number badge + icon
// + label tag + title), registered from scenes.js.
// Icon origin = bottom center; at scale 1 each is about 220 px tall.
import { CHALK, CHALK_DIM, YELLOW, RED, BLUE, GREEN, ORANGE, text, pop, icon, backOut, prog, ICONS } from './chalk.js';

const INK = '#1a1a22';

/** Hacked laptop: skull on the screen, coins flying out of it. */
function laptop(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  // coins escaping (behind the lid), deterministic loop
  for (let i = 0; i < 5; i++) {
    const k = ((u * 0.7 + i / 5) % 1);
    const cx = -60 + i * 30 + Math.sin(i * 2.3) * 40 * k, cy = -190 - k * 120;
    g.globalAlpha = 1 - k;
    g.fillStyle = '#f2a900'; g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd860'; g.fillRect(cx - 4, cy - 11, 8, 22);
    g.globalAlpha = 1;
  }
  g.fillStyle = '#3a3f4e'; g.fillRect(-120, -200, 240, 160); // lid
  g.fillStyle = '#0d1a10'; g.fillRect(-106, -188, 212, 136); // screen
  // skull on the screen
  g.fillStyle = GREEN;
  g.beginPath(); g.arc(0, -132, 36, 0, Math.PI * 2); g.fill();
  g.fillRect(-20, -104, 40, 18);
  g.fillStyle = '#0d1a10';
  for (const ex of [-14, 14]) { g.beginPath(); g.arc(ex, -136, 9, 0, Math.PI * 2); g.fill(); }
  for (const tx of [-10, 0, 10]) g.fillRect(tx - 2, -100, 4, 12);
  g.fillStyle = '#5a6072'; // base
  g.beginPath(); g.moveTo(-140, -36); g.lineTo(140, -36); g.lineTo(160, 0); g.lineTo(-160, 0); g.closePath(); g.fill();
  g.fillStyle = '#2a2e3a'; g.fillRect(-40, -24, 80, 12); // trackpad
  g.restore();
}

/** Planet with a tilted ring and a big "?" (uncertain size). */
function planet(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y - 110); g.scale(s, s);
  const r = 90 + Math.sin(u * 2) * 8; // size "breathes": nobody knows how big it is
  g.save(); g.rotate(-0.35);
  g.strokeStyle = 'rgba(243,240,228,0.55)'; g.lineWidth = 10;
  g.beginPath(); g.ellipse(0, 0, r * 1.6, r * 0.42, 0, Math.PI, Math.PI * 2); g.stroke(); // ring back
  g.restore();
  const grd = g.createRadialGradient(-30, -30, 10, 0, 0, r);
  grd.addColorStop(0, '#d8c8ff'); grd.addColorStop(1, '#6a5aa8');
  g.fillStyle = grd; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(40,30,80,0.35)';
  g.beginPath(); g.arc(30, 20, 18, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(-35, 35, 11, 0, Math.PI * 2); g.fill();
  g.save(); g.rotate(-0.35);
  g.strokeStyle = CHALK; g.lineWidth = 10;
  g.beginPath(); g.ellipse(0, 0, r * 1.6, r * 0.42, 0, 0, Math.PI); g.stroke(); // ring front
  g.restore();
  text(g, '?', r + 40, -r + 10, 110, YELLOW);
  g.restore();
}

/** Giant upright club-shaped fungus with a little crown ("rex") and a ruler. */
function mushroom(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(u * 1.6) * 0.03);
  g.fillStyle = '#5a3a22'; // dark textured club
  g.beginPath();
  g.moveTo(-34, 0); g.lineTo(-40, -90);
  g.quadraticCurveTo(-78, -150, -60, -215); g.quadraticCurveTo(0, -260, 60, -215);
  g.quadraticCurveTo(78, -150, 40, -90); g.lineTo(34, 0); g.closePath(); g.fill();
  g.fillStyle = '#8a6040'; // bumpy surface
  for (let i = 0; i < 14; i++) { const a = i * 2.4; g.beginPath(); g.arc(Math.sin(a) * 40, -130 - (i % 5) * 18, 7, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#d8c4a0'; g.fillRect(-30, -60, 60, 60); // pale stalk base
  // crown
  g.fillStyle = YELLOW;
  g.beginPath(); g.moveTo(-34, -236); g.lineTo(-34, -270); g.lineTo(-17, -252); g.lineTo(0, -280); g.lineTo(17, -252); g.lineTo(34, -270); g.lineTo(34, -236); g.closePath(); g.fill();
  // ruler at the side
  g.fillStyle = '#f1ead8'; g.fillRect(90, -250, 34, 250);
  g.fillStyle = INK; for (let i = 0; i <= 10; i++) g.fillRect(90, -i * 25, i % 5 ? 12 : 22, 3);
  g.restore();
}

/** Boxy AI robot holding a chalk formula, antenna blinking. */
function robot(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#9aa6bc'; g.fillRect(-60, -110, 120, 110); // body
  g.fillStyle = '#c0cadc'; g.fillRect(-55, -215, 110, 95); // head
  g.fillStyle = INK; g.fillRect(-42, -195, 84, 44); // visor
  g.fillStyle = BLUE;
  for (const ex of [-20, 20]) { g.beginPath(); g.arc(ex, -173, 10, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#5a6478'; g.fillRect(-3, -245, 6, 30);
  g.fillStyle = (Math.floor(u * 3) % 2) ? RED : '#7a2a2a'; g.beginPath(); g.arc(0, -250, 10, 0, Math.PI * 2); g.fill();
  g.fillStyle = YELLOW; g.fillRect(-30, -80, 60, 14); // chest light
  g.fillStyle = '#9aa6bc'; g.fillRect(60, -100, 50, 18); g.fillRect(-110, -100, 50, 18); // arms
  // floating formula
  g.save(); g.translate(0, -300 + Math.sin(u * 2) * 6);
  text(g, 'x² + ? = ∞', 0, 0, 48, YELLOW);
  g.restore();
  g.restore();
}

Object.assign(ICONS, { laptop, planet, mushroom, robot });

/** Text that shrinks to fit maxW. */
function fitText(g, str, x, y, size, color, alpha, maxW) {
  g.save(); g.font = `900 ${size}px "HC Display", "Arial Black", sans-serif`;
  const w = g.measureText(str).width; g.restore();
  text(g, str, x, y, w > maxW ? size * maxW / w : size, color, alpha);
}

/**
 * newsCard: countdown news card. params: { num, icon, scale, label, title, sub, color }.
 * Left: a big round badge with the rank number (spins in). Right: the icon and a cream label tag. Title on top.
 */
function newsCard(g, W, H, u, d, p) {
  const col = p.color ?? [RED, ORANGE, YELLOW, GREEN, BLUE][(p.num ?? 1) - 1] ?? RED;
  // "ÚLTIMA HORA" strip + title
  const ks = prog(u, 0.1, 0.3);
  if (ks > 0) { g.fillStyle = '#c8102e'; g.fillRect(0, 34, W * ks, 112); }
  fitText(g, p.title ?? '', W / 2, 92, 74, '#ffffff', prog(u, 0.3, 0.3), W - 120);
  // rank badge
  const kb = backOut(prog(u, 0.25, 0.5));
  if (kb > 0) {
    g.save(); g.translate(240, H / 2 + 20); g.rotate((1 - kb) * -2.5); g.scale(kb, kb);
    g.fillStyle = INK; g.beginPath(); g.arc(8, 10, 175, 0, Math.PI * 2); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(0, 0, 175, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, 153, 0, Math.PI * 2); g.stroke();
    text(g, '#' + (p.num ?? 1), 0, 8, 165, INK);
    g.restore();
  }
  // icon
  pop(g, W * 0.64, H - 190, backOut(prog(u, 0.6, 0.5)), () => icon(g, p.icon ?? 'robot', 0, 0, (p.scale ?? 1.2) * 1.3, u));
  // label tag
  const kt = backOut(prog(u, 1.1, 0.45));
  if (kt > 0 && p.label) {
    g.save(); g.translate(W * 0.64, H - 130); g.rotate(-0.04); g.scale(kt, kt);
    g.font = '900 70px "HC Display", "Arial Black", sans-serif';
    const tw = Math.min(640, g.measureText(p.label).width + 60);
    g.fillStyle = '#f1ead8'; g.fillRect(-tw / 2, -50, tw, 100);
    fitText(g, p.label, 0, 4, 70, '#5a1a12', 1, 600);
    g.restore();
  }
  if (p.sub) fitText(g, p.sub, W / 2, H - 38, 46, CHALK, prog(u, 1.6, 0.4), 660);
}

export const SCENES_V9 = { newsCard };
