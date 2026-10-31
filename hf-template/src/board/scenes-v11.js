// Board icons + scenes for 027 (horror films ranking in a bedsheet fort). Copyright-safe on purpose: films are shown
// as title cards with GENERIC icons (no posters, stills, logos, masks or character likenesses).
// Icons (canvas shapes, origin = bottom center, ~220 px tall at scale 1): doll (generic rag doll with yarn hair),
// cross, musicBox, bedMoon, pumpkin (jack-o'-lantern), llama (plush).
// Scenes: titleCard (one ranked film, or two side by side with `items`), shadowScare (flashlight shadow gag).
import { CHALK, YELLOW, RED, ORANGE, BLUE, GREEN, text, pop, icon, backOut, ease, prog, ICONS } from './chalk.js';

const INK = '#1a1a22';

/** Generic rag doll: yarn hair, button eyes, stitched smile, striped overalls. */
function doll(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(u * 2.2) * 0.04);
  g.fillStyle = '#3a5ab0'; g.fillRect(-55, -120, 110, 100); // overalls
  g.fillStyle = '#f1ead8'; for (let i = 0; i < 4; i++) g.fillRect(-55, -112 + i * 26, 110, 8);
  g.fillStyle = '#3a5ab0'; g.fillRect(-48, -20, 36, 20); g.fillRect(12, -20, 36, 20); // legs
  g.fillStyle = '#f2d2b0'; g.fillRect(-95, -115, 40, 22); g.fillRect(55, -115, 40, 22); // arms
  g.fillStyle = '#f2d2b0'; g.beginPath(); g.arc(0, -170, 52, 0, Math.PI * 2); g.fill(); // head
  g.fillStyle = '#e0602a'; // yarn hair
  for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; g.beginPath(); g.arc(Math.cos(a) * 50, -170 + Math.sin(a) * 50, 15, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = INK; for (const ex of [-18, 18]) { g.beginPath(); g.arc(ex, -175, 8, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = '#a03a2a'; g.lineWidth = 4; g.beginPath(); g.arc(0, -158, 20, 0.2, Math.PI - 0.2); g.stroke();
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 8, -143); g.lineTo(i * 8, -133); g.stroke(); } // stitches
  g.restore();
}

/** Simple wooden cross with a soft glow. */
function cross(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = `rgba(255,226,122,${0.18 + 0.08 * Math.sin(u * 3)})`; g.beginPath(); g.arc(0, -125, 115, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c89a5a'; g.fillRect(-18, -230, 36, 230); g.fillRect(-75, -175, 150, 34);
  g.fillStyle = '#8a6030'; g.fillRect(-18, -230, 8, 230); g.fillRect(-75, -175, 150, 8);
  g.restore();
}

/** Music box with an open lid and floating notes. */
function musicBox(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#7a3a2a'; g.fillRect(-100, -90, 200, 90);
  g.fillStyle = YELLOW; g.fillRect(-100, -60, 200, 8);
  g.save(); g.translate(-100, -90); g.rotate(-0.9); g.fillStyle = '#8a4a34'; g.fillRect(0, -12, 200, 14); g.restore(); // lid
  g.fillStyle = '#c0c4cc'; g.fillRect(100, -55, 34, 10); g.fillRect(126, -70, 10, 40); // crank
  for (let i = 0; i < 3; i++) {
    const k = (u * 0.5 + i / 3) % 1;
    text(g, '♪', -20 + i * 40 + Math.sin(k * 6) * 15, -120 - k * 110, 60, CHALK, 1 - k);
  }
  g.restore();
}

/** Bed with a crescent moon above it. */
function bedMoon(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#6a4a2a'; g.fillRect(-130, -110, 20, 110); g.fillRect(110, -70, 20, 70); // posts
  g.fillStyle = '#3a5ab0'; g.fillRect(-110, -70, 220, 40); // blanket
  g.fillStyle = '#f1ead8'; g.fillRect(-105, -92, 60, 26); // pillow
  g.fillStyle = '#6a4a2a'; g.fillRect(-130, -30, 260, 14);
  g.fillStyle = YELLOW; g.beginPath(); g.arc(70, -190, 42, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a2616'; g.beginPath(); g.arc(88, -202, 38, 0, Math.PI * 2); g.fill(); // crescent cut (sheet color)
  text(g, 'Z', -40, -140 - Math.sin(u * 2) * 8, 46, CHALK, 0.8);
  text(g, 'z', -5, -175 - Math.sin(u * 2 + 1) * 8, 34, CHALK, 0.6);
  g.restore();
}

/** Jack-o'-lantern with a flickering candle glow. */
function pumpkin(g, x, y, s, u = 0) {
  g.save(); g.translate(x, y - 100); g.scale(s, s);
  g.fillStyle = '#3a7a2a'; g.fillRect(-10, -120, 20, 34);
  g.fillStyle = '#ff7a1a';
  for (const [cx, r] of [[-50, 80], [50, 80], [0, 92]]) { g.beginPath(); g.ellipse(cx, 0, r * 0.7, r, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = `rgba(255,${200 + Math.round(30 * Math.sin(u * 9))},80,1)`;
  for (const ex of [-38, 38]) { g.beginPath(); g.moveTo(ex - 20, -10); g.lineTo(ex + 20, -10); g.lineTo(ex, -40); g.closePath(); g.fill(); }
  g.beginPath(); g.moveTo(-55, 22); g.lineTo(55, 22); g.lineTo(35, 50); g.lineTo(15, 36); g.lineTo(0, 54); g.lineTo(-15, 36); g.lineTo(-35, 50); g.closePath(); g.fill();
  g.restore();
}

/** Plush llama with a red blanket (Tito's). */
function llama(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#f2e6d0';
  g.fillRect(-80, -110, 140, 70); // body
  for (const lx of [-70, -40, 20, 45]) g.fillRect(lx, -40, 18, 40);
  g.fillRect(30, -210, 34, 110); // neck
  g.fillRect(30, -240, 70, 38); // head
  g.fillRect(34, -270, 10, 32); g.fillRect(52, -270, 10, 32); // ears
  g.fillStyle = '#d2202e'; g.fillRect(-60, -112, 90, 26);
  g.fillStyle = INK; g.beginPath(); g.arc(78, -226, 5, 0, Math.PI * 2); g.fill();
  g.restore();
}

Object.assign(ICONS, { doll, cross, musicBox, bedMoon, pumpkin, llama });

/** Text that shrinks to fit maxW. */
function fitText(g, str, x, y, size, color, alpha, maxW) {
  g.save(); g.font = `900 ${size}px "HC Display", "Arial Black", sans-serif`;
  const w = g.measureText(str).width; g.restore();
  text(g, str, x, y, w > maxW ? size * maxW / w : size, color, alpha);
}

const RANK_COLORS = [YELLOW, BLUE, GREEN, ORANGE, RED];

/** Round rank badge "#n" spinning in. */
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
 * titleCard: ranked film card. params: { num, icon, title, value, label, sub, scale, sparkle }
 * or { items: [{ num, icon, title, value }, { ... }], label, sub } for two films side by side.
 * Layout keeps text below the top ~15% of the board (caption block clearance).
 */
function titleCard(g, W, H, u, d, p) {
  const label = p.label ?? 'CRÍTICA';
  if (Array.isArray(p.items) && p.items.length) {
    const n = p.items.length;
    p.items.forEach((it, i) => {
      const cx = W * (i + 0.5) / n, t0 = i * 0.9;
      const col = it.color ?? RANK_COLORS[(it.num ?? 1) - 1] ?? RED;
      badge(g, cx - 200, 220, 95, it.num ?? i + 1, backOut(prog(u, t0 + 0.15, 0.45)), col);
      pop(g, cx + 80, 420, backOut(prog(u, t0 + 0.35, 0.45)), () => icon(g, it.icon ?? 'pumpkin', 0, 0, it.scale ?? 1.15, u));
      fitText(g, it.title ?? '', cx, 500, 72, CHALK, prog(u, t0 + 0.4, 0.3), W / n - 40);
      const kv = backOut(prog(u, t0 + 0.6, 0.45));
      if (kv > 0) pop(g, cx, 650, kv, () => text(g, it.value ?? '', 0, 0, 200, col));
    });
    if (p.sub) fitText(g, p.sub, W / 2, H - 70, 60, CHALK, prog(u, 1.6, 0.4), W - 200);
    return;
  }
  const col = p.color ?? RANK_COLORS[(p.num ?? 1) - 1] ?? RED;
  fitText(g, p.title ?? '', W / 2, 185, 150, '#ffffff', prog(u, 0.2, 0.3), W - 160);
  badge(g, 230, 480, 165, p.num ?? 1, backOut(prog(u, 0.3, 0.5)), col);
  if (p.sparkle) { // rays behind the icon for #1
    const ks = prog(u, 0.9, 0.5);
    g.save(); g.translate(600, 470); g.rotate(u * 0.3); g.fillStyle = `rgba(255,226,122,${0.22 * ks})`;
    for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-30, -260); g.lineTo(30, -260); g.closePath(); g.fill(); }
    g.restore();
  }
  pop(g, 600, 610, backOut(prog(u, 0.6, 0.5)), () => icon(g, p.icon ?? 'pumpkin', 0, 0, p.scale ?? 1.3, u));
  const kv = backOut(prog(u, 0.9, 0.5));
  if (kv > 0) pop(g, 990, 450, kv, () => text(g, p.value ?? '', 0, 0, 270, col));
  fitText(g, label, 990, 620, 64, CHALK, prog(u, 1.2, 0.3), 440);
  if (p.sub) fitText(g, p.sub, W / 2, H - 70, 60, CHALK, prog(u, 1.4, 0.4), W - 200);
}

/** Llama silhouette (for the shadow gag): origin at its feet, faces right. */
function llamaShadow(g) {
  g.beginPath();
  g.rect(-80, -110, 140, 70);
  for (const lx of [-70, -40, 20, 45]) g.rect(lx, -42, 18, 42);
  g.rect(30, -212, 34, 112);
  g.rect(30, -242, 72, 40);
  g.moveTo(34, -240); g.lineTo(30, -300); g.lineTo(48, -240); // ears, long and pointy: they read as horns
  g.moveTo(54, -240); g.lineTo(66, -300); g.lineTo(68, -240);
  g.fill();
}

/**
 * shadowScare: flashlight shadow on the sheet. params: { phase: 'scare' | 'reveal', title, sub }
 * scare: a huge horned shadow creeps up and trembles. reveal: it shrinks into the small shadow of a plush llama
 * and the plush itself pops in front.
 */
function shadowScare(g, W, H, u, d, p) {
  const reveal = p.phase === 'reveal';
  // shadow size: scare grows 2.3 -> 3.1; reveal shrinks 3.1 -> 1.1
  const sc = reveal ? 3.1 - 2.0 * ease(prog(u, 0.2, 0.9)) : 2.3 + 0.8 * ease(prog(u, 0.0, 1.0));
  const shake = reveal ? 0 : Math.sin(u * 23) * 6 * prog(u, 0.3, 0.3);
  // bright flashlight pool on the sheet, so the shadow reads against it
  g.save(); g.translate(W / 2, H / 2); g.scale(1.4, 1); // ellipse that fades out inside the board (no hard edge)
  const lp = g.createRadialGradient(0, 0, 30, 0, 0, H * 0.49);
  lp.addColorStop(0, 'rgba(255,214,150,0.95)'); lp.addColorStop(0.7, 'rgba(240,170,110,0.75)'); lp.addColorStop(1, 'rgba(240,170,110,0)');
  g.fillStyle = lp; g.fillRect(-W, -H, W * 2, H * 2);
  g.restore();
  g.save();
  g.filter = `blur(${Math.round(2 + sc * 2)}px)`;
  g.fillStyle = 'rgba(0,0,0,0.96)';
  g.translate(W / 2 - 40 + shake, H + (reveal ? -40 * ease(prog(u, 0.2, 0.9)) : 30)); g.scale(sc, sc);
  llamaShadow(g);
  g.restore();
  g.filter = 'none';
  if (!reveal) {
    const kt = backOut(prog(u, 0.5, 0.35));
    if (kt > 0) pop(g, W / 2, 190, kt, () => fitText(g, p.title ?? '¿¡QUÉ ES ESO!?', 0, 0, 130, '#b0101e', 1, W - 160));
  } else {
    pop(g, 1010, 700, backOut(prog(u, 0.9, 0.45)), () => icon(g, 'llama', 0, 0, 1.1, u));
    const kt = backOut(prog(u, 1.0, 0.35));
    if (kt > 0) pop(g, W / 2, 190, kt, () => fitText(g, p.title ?? 'ERA LA LLAMITA', 0, 0, 120, '#3a1a0a', 1, W - 160));
    if (p.sub) fitText(g, p.sub, W / 2, 310, 56, '#5a2a12', prog(u, 1.3, 0.3), W - 200);
  }
}

export const SCENES_V11 = { titleCard, shadowScare };
