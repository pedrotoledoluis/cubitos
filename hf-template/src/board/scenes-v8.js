// Board icons for 024 (San Martín de Porres), drawn with canvas shapes (no emoji: the headless renderer has no
// color-emoji font): dog, cat, mouse (the legend's shared plate), broom (fray Escoba) and scissors (barber).
// They register into the shared ICONS map, so every icon-taking scene can use them. No new scenes here.
// Origin = bottom center of the icon; at scale 1 each is about 220 px tall.
import { YELLOW, ICONS } from './chalk.js';

const INK = '#1a1a22', PINK = '#ff9ecf';

/** Sitting dog, facing right, wagging its tail. */
function dog(g, x, y, s, u = 0) {
  const FUR = '#c98a52', DARK = '#7a4a24';
  g.save(); g.translate(x, y); g.scale(s, s);
  g.save(); g.translate(-70, -90); g.rotate(-0.6 + Math.sin(u * 8) * 0.35); g.fillStyle = DARK; g.fillRect(-10, -60, 20, 64); g.restore(); // tail
  g.fillStyle = FUR;
  g.beginPath(); g.ellipse(-10, -70, 72, 62, 0, 0, Math.PI * 2); g.fill(); // body
  for (const lx of [-50, 30]) g.fillRect(lx - 14, -30, 28, 30); // legs
  g.beginPath(); g.arc(55, -150, 50, 0, Math.PI * 2); g.fill(); // head
  g.fillStyle = '#e8c49a'; g.beginPath(); g.ellipse(95, -135, 34, 24, 0, 0, Math.PI * 2); g.fill(); // snout
  g.fillStyle = DARK; g.beginPath(); g.ellipse(25, -150, 18, 44, 0.25, 0, Math.PI * 2); g.fill(); // floppy ear
  g.fillStyle = INK;
  g.beginPath(); g.arc(122, -142, 9, 0, Math.PI * 2); g.fill(); // nose
  g.beginPath(); g.arc(68, -166, 7, 0, Math.PI * 2); g.fill(); // eye
  g.fillStyle = PINK; g.fillRect(96, -118, 16, 18); // tongue
  g.restore();
}

/** Sitting cat, facing left, tail curling. */
function cat(g, x, y, s, u = 0) {
  const FUR = '#8a8a9a', LIGHT = '#e8e2d8';
  g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = FUR; g.lineWidth = 16; g.lineCap = 'round';
  g.beginPath(); g.moveTo(40, -20); g.quadraticCurveTo(110, -30 + Math.sin(u * 2) * 10, 90, -110); g.stroke(); // tail
  g.fillStyle = FUR;
  g.beginPath(); g.ellipse(0, -65, 55, 65, 0, 0, Math.PI * 2); g.fill(); // body
  g.beginPath(); g.arc(-10, -160, 44, 0, Math.PI * 2); g.fill(); // head
  for (const ex of [-40, 20]) { g.beginPath(); g.moveTo(ex, -185); g.lineTo(ex + 10, -225); g.lineTo(ex + 24, -190); g.fill(); } // ears
  g.fillStyle = LIGHT; g.beginPath(); g.ellipse(-12, -60, 28, 40, 0, 0, Math.PI * 2); g.fill(); // chest
  g.fillStyle = '#9adf5a';
  for (const ex of [-28, 8]) { g.beginPath(); g.ellipse(ex, -165, 9, 11, 0, 0, Math.PI * 2); g.fill(); } // eyes
  g.fillStyle = INK;
  for (const ex of [-28, 8]) g.fillRect(ex - 2, -173, 4, 16); // pupils
  g.fillStyle = PINK; g.beginPath(); g.moveTo(-16, -146); g.lineTo(-4, -146); g.lineTo(-10, -138); g.fill(); // nose
  g.strokeStyle = LIGHT; g.lineWidth = 3;
  for (const sy of [-146, -138]) { g.beginPath(); g.moveTo(-30, sy); g.lineTo(-70, sy - 6); g.moveTo(10, sy); g.lineTo(50, sy - 6); g.stroke(); } // whiskers
  g.restore();
}

/** Small mouse with big pink ears, facing left; it nibbles (bobs). */
function mouse(g, x, y, s, u = 0) {
  const GREY = '#b8b4c0';
  g.save(); g.translate(x, y - Math.abs(Math.sin(u * 6)) * 6); g.scale(s, s);
  g.strokeStyle = PINK; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(60, -30); g.quadraticCurveTo(120, -20, 110, -80); g.stroke(); // tail
  g.fillStyle = GREY;
  g.beginPath(); g.ellipse(10, -50, 70, 48, 0, 0, Math.PI * 2); g.fill(); // body
  g.beginPath(); g.moveTo(-40, -80); g.lineTo(-110, -50); g.lineTo(-40, -20); g.fill(); // snout
  g.beginPath(); g.arc(-20, -100, 32, 0, Math.PI * 2); g.fill(); // ear (back)
  g.fillStyle = PINK; g.beginPath(); g.arc(-20, -100, 20, 0, Math.PI * 2); g.fill();
  g.fillStyle = INK;
  g.beginPath(); g.arc(-112, -50, 8, 0, Math.PI * 2); g.fill(); // nose
  g.beginPath(); g.arc(-58, -62, 7, 0, Math.PI * 2); g.fill(); // eye
  g.restore();
}

/** Straw broom standing upright, swaying a little. */
function broom(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(u * 1.5) * 0.05);
  g.fillStyle = '#9a6a3a'; g.fillRect(-7, -240, 14, 170); // handle
  g.fillStyle = '#c8402a'; g.fillRect(-26, -80, 52, 16); // binding
  g.fillStyle = '#e8c45a';
  g.beginPath(); g.moveTo(-24, -64); g.lineTo(24, -64); g.lineTo(62, 0); g.lineTo(-62, 0); g.fill(); // brush
  g.strokeStyle = '#b8923a'; g.lineWidth = 4;
  for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 5, -60); g.lineTo(i * 14, -2); g.stroke(); }
  g.restore();
}

/** Barber scissors, opening and closing. */
function scissors(g, x, y, s, u = 0) {
  const a = 0.18 + Math.abs(Math.sin(u * 3)) * 0.18;
  g.save(); g.translate(x, y - 110); g.scale(s, s);
  for (const sx of [-1, 1]) {
    g.save(); g.rotate(sx * a);
    g.fillStyle = '#dfe6ee'; g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.lineTo(2, -110); g.lineTo(-2, -110); g.fill(); // blade
    g.strokeStyle = YELLOW; g.lineWidth = 12; g.beginPath(); g.arc(sx * 10, 52, 28, 0, Math.PI * 2); g.stroke(); // ring
    g.fillStyle = YELLOW; g.fillRect(-6, 0, 12, 26);
    g.restore();
  }
  g.fillStyle = INK; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill();
  g.restore();
}

Object.assign(ICONS, { dog, cat, mouse, broom, scissors });
