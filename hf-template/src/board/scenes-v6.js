// Board icons for the Oct 31 - Nov 2 episodes (019-022), drawn with canvas shapes (no emoji):
// guitar, candle, calavera, catrina, fancyHat, clapper, mummy (fardo), litter (anda), unku, marigold.
// They register into the shared ICONS map, so every icon-taking scene (labelled, showcase, equation,
// decree, mapPin2...) can use them. No new scenes here.
import { CHALK, YELLOW, RED, BLUE, ORANGE, chalkStyle, drawPath, ICONS } from './chalk.js';

const PURPLE = '#b48aff', BONE = '#f4efe6', INK = '#1a1a22';

function guitar(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(-0.35 + Math.sin(u * 3) * 0.05);
  g.fillStyle = '#c98a42';
  g.beginPath(); g.ellipse(0, -10, 70, 62, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(0, -100, 52, 46, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = INK; g.beginPath(); g.arc(0, -70, 20, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#5a3218'; g.fillRect(-12, -260, 24, 150); g.fillRect(-20, -300, 40, 46);
  g.fillRect(-30, 20, 60, 12);
  chalkStyle(g, CHALK, 2); for (const dx of [-6, 0, 6]) drawPath(g, [[dx, -255], [dx, 24]], 1, dx + 5);
  g.restore();
}

/** Purple-ribboned candle (Señor de los Milagros month). */
function candle(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = BONE; g.fillRect(-28, -200, 56, 200);
  g.fillStyle = PURPLE; g.fillRect(-30, -120, 60, 24);
  const f = 1 + 0.12 * Math.sin(u * 13) + 0.06 * Math.sin(u * 31);
  g.fillStyle = ORANGE; g.beginPath(); g.ellipse(0, -232, 18, 34 * f, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = YELLOW; g.beginPath(); g.ellipse(0, -226, 9, 18 * f, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

function skull(g, { flowers = true } = {}) {
  g.fillStyle = BONE;
  g.beginPath(); g.ellipse(0, -110, 82, 88, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(-48, -60, 96, 50);
  g.fillStyle = INK;
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 34, -112, 24, 26, 0, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.moveTo(0, -84); g.lineTo(-11, -62); g.lineTo(11, -62); g.closePath(); g.fill();
  for (let i = 0; i < 5; i++) g.fillRect(-38 + i * 18, -40, 6, 28);
  if (flowers) {
    for (const sx of [-1, 1]) { g.fillStyle = ORANGE; g.beginPath(); g.arc(sx * 34, -112, 10, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = BLUE; g.beginPath(); g.arc(0, -168, 12, 0, Math.PI * 2); g.fill();
  }
}

/** Sugar-skull style calavera. */
function calavera(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y + Math.sin(u * 3) * 4); g.scale(s, s); g.rotate(Math.sin(u * 2) * 0.05);
  skull(g);
  g.restore();
}

/** Wide fancy hat with flowers and feathers (the "garbancera" hat). */
function fancyHatShape(g) {
  g.fillStyle = '#3a2a4a';
  g.beginPath(); g.ellipse(0, 0, 170, 34, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(0, -30, 80, 46, 0, Math.PI, 0); g.fill();
  g.fillRect(-80, -30, 160, 30);
  g.fillStyle = PURPLE; g.fillRect(-80, -20, 160, 16);
  for (const [fx, c] of [[-50, RED], [-15, ORANGE], [22, '#ff9ecf']]) { g.fillStyle = c; g.beginPath(); g.arc(fx, -42, 18, 0, Math.PI * 2); g.fill(); }
  chalkStyle(g, CHALK, 10);
  drawPath(g, [[60, -40], [110, -120], [160, -150]], 1, 3);
  drawPath(g, [[70, -36], [140, -96], [190, -100]], 1, 7);
}
function fancyHat(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y - 40); g.scale(s, s); g.rotate(-0.08 + Math.sin(u * 2) * 0.04);
  fancyHatShape(g);
  g.restore();
}

/** La Catrina: calavera wearing the big feathered hat. */
function catrina(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y + Math.sin(u * 3) * 4); g.scale(s, s); g.rotate(Math.sin(u * 2) * 0.04);
  skull(g, { flowers: false });
  g.save(); g.translate(0, -175); g.scale(0.85, 0.85); fancyHatShape(g); g.restore();
  g.restore();
}

/** Film clapperboard. */
function clapper(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#26262e'; g.fillRect(-120, -170, 240, 170);
  g.strokeStyle = CHALK; g.lineWidth = 5; g.strokeRect(-120, -170, 240, 170);
  chalkStyle(g, CHALK, 4); drawPath(g, [[-100, -110], [100, -110]], 1, 2); drawPath(g, [[-100, -60], [100, -60]], 1, 4);
  const open = Math.max(0, Math.sin(u * 3)) * 0.35;
  g.save(); g.translate(-120, -170); g.rotate(-open);
  g.fillStyle = CHALK; g.fillRect(0, -40, 240, 40);
  g.fillStyle = '#26262e'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(20 + i * 60, -40); g.lineTo(50 + i * 60, -40); g.lineTo(30 + i * 60, 0); g.lineTo(0 + i * 60, 0); g.fill(); }
  g.restore();
  g.restore();
}

/** Mummy bundle (fardo funerario): wrapped textile bundle with a woven band, seated shape. */
function mummyShape(g) {
  g.fillStyle = '#c9a06a';
  g.beginPath(); g.moveTo(-70, 0); g.quadraticCurveTo(-90, -120, -40, -170); g.quadraticCurveTo(0, -200, 40, -170); g.quadraticCurveTo(90, -120, 70, 0); g.closePath(); g.fill();
  g.fillStyle = '#a87a44'; for (let i = 0; i < 4; i++) g.fillRect(-72, -30 - i * 34, 144, 6);
  const C = [RED, YELLOW, INK, BLUE];
  for (let i = 0; i < 6; i++) { g.fillStyle = C[i % 4]; g.fillRect(-60 + i * 20, -100, 18, 18); }
  g.fillStyle = '#8a5a32'; g.beginPath(); g.arc(0, -168, 30, 0, Math.PI * 2); g.fill(); // false head (cloth)
  g.fillStyle = RED; g.fillRect(-32, -186, 64, 10);
}
function mummy(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(u * 2) * 0.03);
  mummyShape(g);
  g.restore();
}

/** Litter (anda) carried on poles, with the bundle seated on it; bobs as if walking. */
function litter(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y - Math.abs(Math.sin(u * 4)) * 8); g.scale(s, s);
  g.fillStyle = '#8a5a32'; g.fillRect(-230, -20, 460, 16);
  g.fillStyle = YELLOW; g.fillRect(-120, -60, 240, 40);
  g.fillStyle = RED; for (let i = 0; i < 6; i++) g.fillRect(-110 + i * 40, -52, 20, 24);
  g.save(); g.translate(0, -60); g.scale(0.8, 0.8); mummyShape(g); g.restore();
  g.fillStyle = YELLOW; g.beginPath(); g.moveTo(-130, -260); g.lineTo(130, -260); g.lineTo(0, -320); g.closePath(); g.fill(); // canopy
  chalkStyle(g, YELLOW, 6); drawPath(g, [[-120, -60], [-120, -260]], 1, 3); drawPath(g, [[120, -60], [120, -260]], 1, 5);
  g.restore();
}

/** Unku (Inca tunic) with a tocapu checker band. */
function unku(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(u * 2) * 0.04);
  g.fillStyle = RED; g.fillRect(-90, -200, 180, 200);
  g.fillStyle = RED; g.fillRect(-140, -200, 50, 60); g.fillRect(90, -200, 50, 60);
  g.fillStyle = INK; g.fillRect(-20, -200, 40, 20);
  const C = [YELLOW, INK, BONE, BLUE];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { g.fillStyle = C[(i + j * 2) % 4]; g.fillRect(-84 + i * 28, -120 + j * 28, 26, 26); }
  g.restore();
}

/** Cempasúchil (marigold) flower. */
function marigold(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(u * 0.3);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle = i % 2 ? ORANGE : '#ffb02e'; g.beginPath(); g.arc(Math.cos(a) * 46, -90 + Math.sin(a) * 46, 30, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = YELLOW; g.beginPath(); g.arc(0, -90, 30, 0, Math.PI * 2); g.fill();
  g.restore();
}

Object.assign(ICONS, { guitar, candle, calavera, catrina, fancyHat, clapper, mummy, litter, unku, marigold });
