// Board icons for 032 (Krampus).
// Icons only (canvas shapes, origin = bottom center, ~220 px tall at scale 1); used through existing scenes such as
// `decree` (the 1953 Vienna pamphlet). krampusHead: dark hairy head with curved horns, yellow eyes and a long red
// tongue that wags slowly.
import { ICONS } from './chalk.js';

/** Krampus head: black fur, two curved horns, pointed ears, glowing eyes, long wagging tongue. */
function krampusHead(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s * 0.9, s * 0.9); // drawn ~310 px tall
  g.lineCap = 'round'; g.lineJoin = 'round';
  // horns
  g.strokeStyle = '#d8c8a4'; g.lineWidth = 22;
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 40, -170); g.bezierCurveTo(sx * 70, -240, sx * 130, -250, sx * 120, -300); g.stroke(); }
  g.strokeStyle = '#8a7a5a'; g.lineWidth = 5;
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const yy = -200 - i * 28; g.beginPath(); g.moveTo(sx * (55 + i * 18), yy); g.lineTo(sx * (75 + i * 18), yy + 6); g.stroke(); }
  // ears
  g.fillStyle = '#2a1c18';
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 70, -150); g.lineTo(sx * 150, -175); g.lineTo(sx * 85, -115); g.closePath(); g.fill(); }
  // furry head
  g.fillStyle = '#231a1a';
  g.beginPath();
  for (let i = 0; i <= 24; i++) { const a = Math.PI * 2 * i / 24, r = (i % 2 ? 92 : 104); g.lineTo(Math.cos(a) * r, -110 + Math.sin(a) * r * 1.05); }
  g.closePath(); g.fill();
  // face
  g.fillStyle = '#7a2a22'; g.beginPath(); g.ellipse(0, -100, 62, 70, 0, 0, Math.PI * 2); g.fill();
  // eyes + brows
  g.fillStyle = '#ffd23a';
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 26, -128, 15, 11, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#111'; for (const sx of [-1, 1]) g.fillRect(sx * 26 - 3, -137, 6, 18);
  g.strokeStyle = '#111'; g.lineWidth = 8;
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 8, -146); g.lineTo(sx * 46, -158); g.stroke(); }
  // open mouth with fangs
  g.fillStyle = '#1a0a0a'; g.beginPath(); g.ellipse(0, -72, 34, 18, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f4f1ea'; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 22, -84); g.lineTo(sx * 14, -84); g.lineTo(sx * 18, -66); g.closePath(); g.fill(); }
  // long tongue (wags)
  const wag = Math.sin(u * 3) * 14;
  g.strokeStyle = '#e8384a'; g.lineWidth = 22;
  g.beginPath(); g.moveTo(0, -66); g.bezierCurveTo(10, -30, -20 + wag, -10, 6 + wag, 10); g.stroke();
  g.restore();
}

Object.assign(ICONS, { krampusHead });
