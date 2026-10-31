// Board icons for 029 (myth tournament: Friday/Tuesday 13th, Samhain, La Llorona, El Tunche, Salem).
// Icons only (canvas shapes, origin = bottom center, ~220 px tall at scale 1); they are used through the existing
// `equation` scene. Generic drawings, no likeness of any film or game version of these legends.
// fri13 / tue13 (calendar page, red "13"), llorona (veiled woman in a glowing white dress, tears),
// tunche (two eyes in a dark jungle bush with whistle waves).
import { CHALK, RED, text, ICONS } from './chalk.js';

const INK = '#1a1a22';

/** Calendar page with a day name and a big red 13. */
function calendar13(day) {
  return (g, x, y, s, u = 0) => {
    g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(u * 1.6) * 0.03);
    g.fillStyle = INK; g.fillRect(-82, -222, 176, 214); // shadow
    g.fillStyle = '#f4f1ea'; g.fillRect(-90, -230, 180, 214);
    g.fillStyle = RED; g.fillRect(-90, -230, 180, 56);
    g.fillStyle = '#9aa0aa'; for (const rx of [-50, 50]) g.fillRect(rx - 6, -244, 12, 30); // rings
    text(g, day, 0, -202, 40, '#ffffff');
    text(g, '13', 0, -95, 120, RED);
    g.restore();
  };
}

/** La Llorona: veiled woman in a long glowing white dress, arms raised, tears. */
function llorona(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y + Math.sin(u * 1.4) * -6); g.scale(s, s);
  const glow = g.createRadialGradient(0, -130, 10, 0, -130, 150);
  glow.addColorStop(0, 'rgba(200,225,255,0.45)'); glow.addColorStop(1, 'rgba(200,225,255,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(0, -130, 150, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#eef3fb'; // dress: flared, ragged hem
  g.beginPath(); g.moveTo(-30, -170); g.lineTo(30, -170); g.lineTo(80, -10);
  for (let i = 0; i <= 8; i++) g.lineTo(80 - i * 20, i % 2 ? -22 : -2);
  g.closePath(); g.fill();
  g.strokeStyle = '#eef3fb'; g.lineWidth = 16; g.lineCap = 'round'; // arms raised to the face
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 26, -160); g.lineTo(sx * 48, -190); g.lineTo(sx * 16, -205); g.stroke(); }
  g.fillStyle = '#2a2a36'; g.beginPath(); g.arc(0, -210, 30, 0, Math.PI * 2); g.fill(); // long dark hair
  g.fillRect(-30, -210, 60, 50);
  g.fillStyle = 'rgba(238,243,251,0.75)'; // veil
  g.beginPath(); g.moveTo(-36, -232); g.quadraticCurveTo(0, -262, 36, -232); g.lineTo(46, -150); g.lineTo(-46, -150); g.closePath(); g.fill();
  g.fillStyle = '#7ab8ff'; // tears falling
  for (let i = 0; i < 3; i++) {
    const k = (u * 0.8 + i / 3) % 1;
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * (60 + i * 6), -190 + k * 120, 6, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
}

/** El Tunche: dark jungle bush with two glowing eyes and whistle waves. */
function tunche(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#1f4a2a';
  for (const [cx, cy, r] of [[-70, -70, 70], [70, -70, 70], [0, -120, 85], [-30, -40, 60], [40, -40, 60]]) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#2f6a3a'; for (const [cx, cy] of [[-60, -110], [50, -140], [10, -60]]) { g.beginPath(); g.ellipse(cx, cy, 30, 12, 0.6, 0, Math.PI * 2); g.fill(); }
  const blink = Math.abs(Math.sin(u * 1.3)) < 0.06 ? 0.15 : 1;
  g.fillStyle = '#ffe27a';
  for (const ex of [-26, 26]) { g.beginPath(); g.ellipse(ex, -105, 14, 9 * blink, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = INK; for (const ex of [-26, 26]) g.fillRect(ex - 3, -110, 6, 10 * blink);
  g.strokeStyle = CHALK; g.lineWidth = 6; g.lineCap = 'round'; // whistle waves to the right
  for (let i = 0; i < 3; i++) {
    const k = (u * 0.7 + i / 3) % 1;
    g.globalAlpha = 1 - k; g.beginPath(); g.arc(90, -140, 20 + k * 70, -0.6, 0.6); g.stroke();
  }
  g.globalAlpha = 1;
  g.restore();
}

Object.assign(ICONS, { fri13: calendar13('VIERNES'), tue13: calendar13('MARTES'), llorona, tunche });
