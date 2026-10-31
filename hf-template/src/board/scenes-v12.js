// Board icons + scene for 028 (top 5 decorated Halloween houses 2026). No licensed photos of the houses exist,
// so each house is an ILLUSTRATED RECREATION of its signature element (generic shapes, no logos or characters).
// Icons (canvas shapes, origin = bottom center, ~220 px tall at scale 1): ufoDish (UFO built from a satellite
// dish), pumpkinArch (jack-o'-lantern arch + giant skeleton), wizardStreet (pointy wizard hat over a tiny crooked
// street, generic), graveyard (gravestones + skeletons), hauntedMaze (haunted house over a maze plan).
// Scene: houseCard (ranked house: place, rank badge, icon, fitted value + label, "recreación" tag).
import { CHALK, YELLOW, RED, ORANGE, BLUE, GREEN, text, pop, icon, backOut, prog, ICONS } from './chalk.js';

const INK = '#1a1a22';
const BONE = '#efe9d6';

/** UFO made from a satellite dish, hovering with a tractor beam. */
function ufoDish(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const hy = -150 + Math.sin(u * 2.4) * 8;
  g.fillStyle = `rgba(150,255,170,${0.22 + 0.08 * Math.sin(u * 5)})`; // beam
  g.beginPath(); g.moveTo(-30, hy + 20); g.lineTo(30, hy + 20); g.lineTo(90, 0); g.lineTo(-90, 0); g.closePath(); g.fill();
  g.fillStyle = '#b8c0cc'; g.beginPath(); g.ellipse(0, hy, 130, 34, 0, 0, Math.PI * 2); g.fill(); // dish (saucer)
  g.fillStyle = '#8a929e'; g.beginPath(); g.ellipse(0, hy + 8, 130, 22, 0, 0, Math.PI); g.fill();
  g.fillStyle = '#7ad8ff'; g.beginPath(); g.arc(0, hy - 18, 52, Math.PI, 0); g.fill(); // dome
  g.strokeStyle = '#5a626e'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, hy - 70); g.lineTo(0, hy - 100); g.stroke(); // feed arm
  g.fillStyle = '#5a626e'; g.fillRect(-10, hy - 112, 20, 16);
  const cols = ['#ff4a3a', YELLOW, '#7aff6a', '#b05aff'];
  for (let i = 0; i < 6; i++) { g.fillStyle = cols[(i + Math.floor(u * 4)) % 4]; g.beginPath(); g.arc(-100 + i * 40, hy + 4, 8, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

/** Arch of jack-o'-lanterns with a giant skeleton beside it. */
function pumpkinArch(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - i * Math.PI / 8, px = -90 + Math.cos(a) * 100, py = -20 - Math.sin(a) * 150;
    g.fillStyle = '#ff7a1a'; g.beginPath(); g.ellipse(px, py, 24, 20, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(255,${210 + Math.round(30 * Math.sin(u * 8 + i))},90,1)`; g.fillRect(px - 10, py - 6, 6, 6); g.fillRect(px + 4, py - 6, 6, 6); g.fillRect(px - 8, py + 5, 16, 4);
  }
  // giant skeleton on the right
  g.save(); g.translate(60, 0);
  g.fillStyle = BONE;
  g.fillRect(-26, -240, 52, 46); // skull
  g.fillStyle = INK; g.fillRect(-16, -228, 11, 12); g.fillRect(5, -228, 11, 12);
  g.fillStyle = BONE; g.fillRect(-5, -194, 10, 90); // spine
  for (let i = 0; i < 4; i++) g.fillRect(-26 + i * 2, -186 + i * 16, 52 - i * 4, 7); // ribs
  g.fillRect(-22, -108, 44, 14); // pelvis
  g.fillRect(-18, -96, 9, 96); g.fillRect(9, -96, 9, 96); // legs
  g.fillRect(-42, -188, 9, 70); // arm
  g.save(); g.translate(30, -186); g.rotate(-0.6 + Math.sin(u * 2.5) * 0.3); g.fillRect(0, -70, 9, 72); g.restore(); // waving arm
  g.restore();
  g.restore();
}

/** Pointy wizard hat with stars over a tiny crooked street of shops (generic, no franchise elements). */
function wizardStreet(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const shops = [['#6a3a8a', 70], ['#3a5ab0', 95], ['#8a4a2a', 80], ['#2a7a5a', 105]];
  shops.forEach(([c, h], i) => {
    const sx = -150 + i * 76;
    g.save(); g.translate(sx + 34, 0); g.rotate((i % 2 ? 1 : -1) * 0.05);
    g.fillStyle = c; g.fillRect(-34, -h, 68, h);
    g.fillStyle = INK; g.beginPath(); g.moveTo(-40, -h); g.lineTo(0, -h - 36); g.lineTo(40, -h); g.closePath(); g.fill();
    g.fillStyle = YELLOW; g.fillRect(-18, -h + 16, 14, 16); g.fillRect(4, -h + 16, 14, 16);
    g.restore();
  });
  // floating wizard hat
  const hy = -170 + Math.sin(u * 2) * 6;
  g.fillStyle = '#3a2a6a'; g.beginPath(); g.ellipse(0, hy, 90, 16, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(-55, hy); g.lineTo(55, hy); g.quadraticCurveTo(10, hy - 80, 40, hy - 130); g.quadraticCurveTo(-20, hy - 80, -55, hy); g.fill();
  g.fillStyle = YELLOW; g.fillRect(-50, hy - 14, 100, 10);
  for (const [sx, sy] of [[-14, -50], [18, -78], [-2, -100]]) text(g, '★', sx, hy + sy, 26, YELLOW, 0.6 + 0.4 * Math.sin(u * 4 + sx));
  g.restore();
}

/** Front-yard graveyard: three gravestones with skeletons popping out. */
function graveyard(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#2a4a2a'; g.fillRect(-170, -16, 340, 16);
  const stones = [[-110, 120], [0, 150], [110, 110]];
  stones.forEach(([sx, h], i) => {
    g.fillStyle = '#8a8a96'; g.beginPath(); g.moveTo(sx - 42, -12); g.lineTo(sx - 42, -h + 40); g.arc(sx, -h + 40, 42, Math.PI, 0); g.lineTo(sx + 42, -12); g.closePath(); g.fill();
    g.fillStyle = '#4a4a56'; g.font = '900 30px "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText('RIP', sx, -h + 60);
    if (i !== 1) { // skeleton hand + skull peeking
      const k = 0.5 + 0.5 * Math.sin(u * 2 + i);
      g.fillStyle = BONE; g.fillRect(sx + 40, -40 - k * 30, 9, 30 + k * 30); g.fillRect(sx + 34, -54 - k * 30, 22, 14);
    }
  });
  g.fillStyle = BONE; g.beginPath(); g.arc(0, -10, 26, Math.PI, 0); g.fill(); // skull rising from the ground
  g.fillStyle = INK; g.fillRect(-14, -22, 9, 9); g.fillRect(5, -22, 9, 9);
  g.restore();
}

/** Haunted house with glowing windows above a maze floor plan (20 rooms). */
function hauntedMaze(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  // maze plan (base)
  g.fillStyle = '#1e1a2a'; g.fillRect(-160, -60, 320, 60);
  g.strokeStyle = '#ff9a3a'; g.lineWidth = 5;
  g.strokeRect(-155, -56, 310, 52);
  for (let i = 1; i < 10; i++) { g.beginPath(); const mx = -155 + i * 31; g.moveTo(mx, i % 2 ? -56 : -4); g.lineTo(mx, i % 2 ? -22 : -38); g.stroke(); }
  // house
  g.fillStyle = '#3a2a4a'; g.fillRect(-90, -190, 180, 130);
  g.fillStyle = INK; g.beginPath(); g.moveTo(-110, -190); g.lineTo(0, -270); g.lineTo(110, -190); g.closePath(); g.fill();
  g.fillRect(50, -270, 22, 60); // chimney
  const glowA = 0.75 + 0.25 * Math.sin(u * 7);
  g.fillStyle = `rgba(255,${190 + Math.round(40 * glowA)},80,1)`;
  for (const [wx, wy] of [[-66, -170], [26, -170], [-66, -118], [26, -118]]) g.fillRect(wx, wy, 40, 36);
  g.fillStyle = INK; g.fillRect(-16, -110, 32, 50); // door
  // bat
  const bx = Math.sin(u * 1.6) * 90, by = -300 + Math.cos(u * 2.3) * 12, f = Math.sin(u * 14) * 10;
  g.fillStyle = INK; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 34, by - 10 - f); g.lineTo(bx - 14, by + 6); g.lineTo(bx, by + 2); g.lineTo(bx + 14, by + 6); g.lineTo(bx + 34, by - 10 - f); g.closePath(); g.fill();
  g.restore();
}

Object.assign(ICONS, { ufoDish, pumpkinArch, wizardStreet, graveyard, hauntedMaze });

/** Text that shrinks to fit maxW. */
function fitText(g, str, x, y, size, color, alpha, maxW) {
  g.save(); g.font = `900 ${size}px "HC Display", "Arial Black", sans-serif`;
  const w = g.measureText(str).width; g.restore();
  text(g, str, x, y, w > maxW ? size * maxW / w : size, color, alpha);
}

const RANK_COLORS = [YELLOW, BLUE, GREEN, ORANGE, RED];

function badge(g, x, y, r, num, k, col) {
  if (k <= 0) return;
  g.save(); g.translate(x, y); g.rotate((1 - k) * -2.5); g.scale(k, k);
  g.fillStyle = INK; g.beginPath(); g.arc(6, 8, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#ffffff'; g.lineWidth = r * 0.07; g.beginPath(); g.arc(0, 0, r * 0.86, 0, Math.PI * 2); g.stroke();
  text(g, '#' + num, 0, r * 0.05, r * 0.95, INK);
  g.restore();
}

/**
 * houseCard: one ranked Halloween house. params: { num, icon, title (place), value, label, tag, scale, sparkle }
 * Like titleCard (027) but the value is fitted to its column (words like "BENÉFICA" fit) and a small
 * "RECREACIÓN" tag says the drawing is not a photo. Text stays below the top ~15% of the board.
 */
function houseCard(g, W, H, u, d, p) {
  const col = p.color ?? RANK_COLORS[(p.num ?? 1) - 1] ?? RED;
  fitText(g, p.title ?? '', W / 2, 190, 130, '#ffffff', prog(u, 0.2, 0.3), W - 140);
  badge(g, 210, 500, 150, p.num ?? 1, backOut(prog(u, 0.3, 0.5)), col);
  if (p.sparkle) {
    const ks = prog(u, 0.9, 0.5);
    g.save(); g.translate(590, 500); g.rotate(u * 0.3); g.fillStyle = `rgba(255,226,122,${0.22 * ks})`;
    for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-30, -260); g.lineTo(30, -260); g.closePath(); g.fill(); }
    g.restore();
  }
  pop(g, 590, 700, backOut(prog(u, 0.6, 0.5)), () => icon(g, p.icon ?? 'hauntedMaze', 0, 0, p.scale ?? 1.25, u));
  const kv = backOut(prog(u, 0.9, 0.5));
  if (kv > 0) pop(g, 1010, 460, kv, () => fitText(g, p.value ?? '', 0, 0, 230, col, 1, 440));
  fitText(g, p.label ?? '', 1010, 610, 70, CHALK, prog(u, 1.2, 0.3), 440);
  const tag = p.tag ?? 'RECREACIÓN';
  const ka = prog(u, 1.3, 0.3);
  if (ka > 0 && tag) {
    g.save(); g.globalAlpha = ka; g.fillStyle = 'rgba(12,13,18,0.75)'; g.fillRect(W - 380, H - 110, 340, 64); g.restore();
    fitText(g, tag, W - 210, H - 78, 40, '#ffd27a', ka, 310);
  }
}

export const SCENES_V12 = { houseCard };
