// Board icons for 023 (guaguas de pan), drawn with canvas shapes (no emoji):
// guagua (baby-shaped bread with a plaster mask face and icing stripes) and caballito (horse-shaped bread).
// They register into the shared ICONS map, so every icon-taking scene can use them. No new scenes here.
import { YELLOW, RED, BLUE, ICONS } from './chalk.js';

const CRUST = '#c98a42', CRUST_DARK = '#9a5e26', MASK = '#f6e6d2', INK = '#1a1a22', PINK = '#ff9ecf', GREEN = '#5fbf6a';

/** Guagua de pan: swaddled bread baby, painted plaster mask, colored icing bands; rocks gently. */
function guagua(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s * 1.4, s * 1.4); g.rotate(Math.sin(u * 2.4) * 0.06);
  // body: rounded swaddle
  g.fillStyle = CRUST;
  g.beginPath(); g.ellipse(0, -110, 78, 112, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = CRUST_DARK;
  g.beginPath(); g.ellipse(0, -30, 70, 26, 0, 0, Math.PI); g.fill();
  // icing bands and dots
  for (const [by, c] of [[-120, PINK], [-80, GREEN], [-40, YELLOW]]) {
    g.fillStyle = c; g.beginPath(); g.ellipse(0, by, 66, 9, 0, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 4; i++) { g.fillStyle = [RED, BLUE, PINK, YELLOW][i]; g.beginPath(); g.arc(-36 + i * 24, -100, 6, 0, Math.PI * 2); g.fill(); }
  // head with the plaster mask (careta)
  g.fillStyle = CRUST; g.beginPath(); g.arc(0, -230, 56, 0, Math.PI * 2); g.fill();
  g.fillStyle = MASK; g.beginPath(); g.ellipse(0, -226, 40, 44, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = INK;
  for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 15, -234, 5, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = PINK;
  for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 24, -216, 7, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = RED; g.lineWidth = 4; g.beginPath(); g.arc(0, -214, 10, 0.2, Math.PI - 0.2); g.stroke();
  g.restore();
}

/** Caballito de pan: chunky bread horse with icing mane and dots; trots in place. */
function caballito(g, x, y, s, u = 0) {
  const hop = Math.abs(Math.sin(u * 4)) * 8;
  g.save(); g.translate(x, y - hop); g.scale(s * 1.4, s * 1.4); g.translate(-40, 0);
  g.fillStyle = CRUST;
  for (const lx of [-70, -40, 40, 70]) g.fillRect(lx - 12, -70, 24, 70); // legs
  g.beginPath(); g.ellipse(0, -100, 100, 48, 0, 0, Math.PI * 2); g.fill(); // body
  g.save(); g.translate(76, -130); g.rotate(-0.6); g.fillRect(-20, -80, 44, 90); g.restore(); // neck
  g.beginPath(); g.ellipse(128, -205, 48, 26, 0.35, 0, Math.PI * 2); g.fill(); // head
  g.beginPath(); g.moveTo(98, -228); g.lineTo(108, -262); g.lineTo(118, -226); g.fill(); // ear
  g.fillStyle = CRUST_DARK; g.beginPath(); g.moveTo(-96, -110); g.quadraticCurveTo(-140, -90, -130, -40); g.lineTo(-112, -50); g.quadraticCurveTo(-118, -86, -92, -96); g.fill(); // tail
  g.fillStyle = INK; g.beginPath(); g.arc(134, -212, 6, 0, Math.PI * 2); g.fill(); // eye
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? PINK : YELLOW; g.beginPath(); g.arc(58 + i * 12, -200 + i * 16, 9, 0, Math.PI * 2); g.fill(); } // mane
  g.fillStyle = RED; g.fillRect(-46, -142, 70, 16); // saddle stripe
  for (let i = 0; i < 4; i++) { g.fillStyle = [GREEN, BLUE, PINK, YELLOW][i]; g.beginPath(); g.arc(-50 + i * 30, -96, 7, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

Object.assign(ICONS, { guagua, caballito });
