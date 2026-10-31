// Board icons for 030 (Peruvian vs Mexican ofrenda).
// Icons only (canvas shapes, origin = bottom center, ~220 px tall at scale 1); they are used through the existing
// `equation` scene. Flags are drawn with shapes because flag emoji do not render in headless Chrome.
// waterGlass (glass of water with a ripple), saltBowl (small bowl heaped with salt), flagMx (green-white-red with a
// simplified round emblem), flagPe (red-white-red), dish (steaming plate of food: the deceased's favourite meal).
import { CHALK, RED, ICONS } from './chalk.js';

const INK = '#1a1a22';

/** Glass of water with a gentle ripple. */
function waterGlass(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(122,184,255,0.85)'; // water
  g.beginPath(); g.moveTo(-62, -150); g.lineTo(62, -150); g.lineTo(50, -6); g.lineTo(-50, -6); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)'; // ripple
  const r = Math.sin(u * 2.2) * 6;
  g.beginPath(); g.ellipse(0, -150, 62, 10 + r * 0.3, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = CHALK; g.lineWidth = 8; g.lineJoin = 'round'; // glass outline
  g.beginPath(); g.moveTo(-72, -210); g.lineTo(-52, 0); g.lineTo(52, 0); g.lineTo(72, -210); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(-48, -190, 12, 150); // shine
  g.restore();
}

/** Small clay bowl heaped with white salt. */
function saltBowl(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#f4f1ea'; // heap
  g.beginPath(); g.moveTo(-90, -70); g.quadraticCurveTo(0, -190, 90, -70); g.closePath(); g.fill();
  g.fillStyle = '#d9d4c7'; for (const [cx, cy] of [[-30, -100], [20, -120], [45, -88], [-55, -80], [0, -150]]) g.fillRect(cx, cy, 8, 8);
  g.fillStyle = '#b5552c'; g.strokeStyle = CHALK; g.lineWidth = 6; // bowl
  g.beginPath(); g.moveTo(-105, -72); g.quadraticCurveTo(0, 50, 105, -72); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; // falling grains sparkle
  for (let i = 0; i < 3; i++) { const k = (u * 0.9 + i / 3) % 1; g.globalAlpha = 1 - k; g.fillRect(60 + i * 14, -170 + k * 60, 7, 7); }
  g.globalAlpha = 1;
  g.restore();
}

/** Waving flag on a pole: three vertical bands, optional round emblem in the middle. */
function flag(colors, emblem) {
  return (g, x, y, s, u = 0) => {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#9aa0aa'; g.fillRect(-120, -250, 10, 250); // pole
    const w = 210, h = 140, top = -245, left = -110, bw = w / 3;
    for (let i = 0; i < 3; i++) {
      g.fillStyle = colors[i];
      g.beginPath();
      for (let j = 0; j <= 6; j++) { const px = left + i * bw + (bw * j) / 6; g.lineTo(px, top + Math.sin(u * 3 + px * 0.03) * 6); }
      for (let j = 6; j >= 0; j--) { const px = left + i * bw + (bw * j) / 6; g.lineTo(px, top + h + Math.sin(u * 3 + px * 0.03) * 6); }
      g.closePath(); g.fill();
    }
    if (emblem) {
      const ex = left + w / 2, ey = top + h / 2 + Math.sin(u * 3 + ex * 0.03) * 6;
      g.fillStyle = '#8a5a2b'; g.beginPath(); g.arc(ex, ey, 22, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3f7d3a'; g.beginPath(); g.arc(ex, ey + 6, 12, 0, Math.PI); g.fill();
    }
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(left, top - 6, w, h + 12);
    g.restore();
  };
}

/** Steaming plate of food (the deceased's favourite meal). */
function dish(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#f4f1ea'; g.beginPath(); g.ellipse(0, -40, 130, 40, 0, 0, Math.PI * 2); g.fill(); // plate
  g.strokeStyle = '#c9c3b5'; g.lineWidth = 4; g.beginPath(); g.ellipse(0, -44, 96, 28, 0, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-30, -60, 50, 26, 0, 0, Math.PI * 2); g.fill(); // rice
  g.fillStyle = '#c8653a'; g.beginPath(); g.ellipse(35, -62, 46, 24, 0, 0, Math.PI * 2); g.fill(); // stew
  g.fillStyle = '#3f9d4a'; for (const [cx, cy] of [[20, -70], [45, -58], [55, -72]]) { g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = CHALK; g.lineWidth = 6; g.lineCap = 'round'; // steam
  for (let i = 0; i < 3; i++) {
    const k = (u * 0.6 + i / 3) % 1, sx = -40 + i * 40;
    g.globalAlpha = 1 - k; g.beginPath(); g.moveTo(sx, -100 - k * 60);
    g.quadraticCurveTo(sx + 18, -130 - k * 60, sx, -160 - k * 60); g.stroke();
  }
  g.globalAlpha = 1;
  g.restore();
}

Object.assign(ICONS, {
  waterGlass, saltBowl, dish,
  flagMx: flag(['#1f7a3a', '#f4f1ea', RED], true),
  flagPe: flag([RED, '#f4f1ea', RED], false),
});
