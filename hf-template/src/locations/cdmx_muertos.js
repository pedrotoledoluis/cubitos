import * as THREE from 'three';
import { box, at, rng, ownMat, flicker } from './common.js';
import { makeLocation } from './modern.js';

// Mexico City's Zócalo during Día de Muertos (dusk): cathedral silhouette, swaying papel picado garlands,
// cempasúchil (marigold) arches, an ofrenda with flickering candles and a giant skeleton float drifting by.
// Board: poster.

const PAPEL = [0xff3d8a, 0xffd23a, 0x3ad0ff, 0x8a5cff, 0x4ad06a, 0xff7a1a];
const MARIGOLD = [0xff8a10, 0xffa41e, 0xff7300];

/** Arch of marigold puffs (semicircle) over two posts. */
function marigoldArch(r) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) g.add(at(box(0.16, r * 1.1, 0.16, 0x5a3a20), sx * r, r * 0.55, 0));
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (i / n);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + (i % 3) * 0.03, 0), ownMat(MARIGOLD[i % 3]));
    m.castShadow = true;
    g.add(at(m, Math.cos(a) * r, r * 1.1 + Math.sin(a) * r * 0.7, 0));
  }
  return g;
}

/** Giant skeleton head float (calavera): white skull with dark sockets, painted flowers and a hat. */
function skullFloat() {
  const g = new THREE.Group();
  g.add(at(box(3.2, 0.5, 2.2, 0x8a2a8a, { bevel: 0.05 }), 0, 0.25, 0)); // float platform
  for (const x of [-1.1, 1.1]) g.add(at(box(0.5, 0.5, 0.3, 0x111111), x, 0.1, 1.1)); // wheels
  const head = at(new THREE.Group(), 0, 1.9, 0);
  head.add(box(2.0, 1.8, 1.6, 0xf4efe6, { bevel: 0.2 }));
  head.add(at(box(1.4, 0.6, 1.2, 0xf4efe6, { bevel: 0.1 }), 0, -1.0, 0.1)); // jaw
  for (const sx of [-1, 1]) {
    head.add(at(box(0.55, 0.5, 0.1, 0x1a1a22), sx * 0.45, 0.15, 0.8)); // eye sockets
    head.add(at(box(0.25, 0.25, 0.12, MARIGOLD[0]), sx * 0.45, 0.15, 0.82)); // flower in the socket
  }
  head.add(at(box(0.22, 0.28, 0.1, 0x1a1a22), 0, -0.35, 0.8)); // nose
  for (let i = 0; i < 6; i++) head.add(at(box(0.12, 0.22, 0.1, 0x1a1a22), -0.5 + i * 0.2, -1.0, 0.72)); // teeth gaps
  head.add(at(box(0.3, 0.3, 0.1, 0x3ad0ff), 0, 0.65, 0.8)); // forehead flower
  // wide hat with a marigold band
  head.add(at(box(3.0, 0.12, 2.6, 0x2a1a3a, { bevel: 0.03 }), 0, 0.95, 0));
  head.add(at(box(1.5, 0.6, 1.3, 0x2a1a3a, { bevel: 0.08 }), 0, 1.3, 0));
  head.add(at(box(1.55, 0.14, 1.35, MARIGOLD[1]), 0, 1.08, 0));
  g.add(head);
  return { group: g, head };
}

export default makeLocation('cdmx_muertos', {
  floor: 0x5e5658, frame: 0x2a1a3a, boardStyle: 'poster', background: 0x1a0a24, fog: [0x2a1430, 22, 50], exposure: 1.2,
  sky: (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.75);
    sky.addColorStop(0, '#1e0a3a'); sky.addColorStop(0.55, '#7a2a6a'); sky.addColorStop(1, '#ff8a4a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const r = rng(17);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,240,220,${0.2 + r() * 0.5})`; g.fillRect(r() * W, r() * H * 0.25, 2, 2); }
    // Metropolitan Cathedral silhouette: two bell towers with domes, central facade
    g.fillStyle = '#3a1c38';
    const cx = W / 2;
    g.fillRect(cx - 520, 420, 1040, 400);
    for (const sx of [-1, 1]) {
      const tx = cx + sx * 380;
      g.fillRect(tx - 90, 220, 180, 260);
      g.fillRect(tx - 70, 150, 140, 80);
      g.beginPath(); g.arc(tx, 150, 70, Math.PI, 0); g.fill();
      g.fillStyle = '#ffcf7a'; g.fillRect(tx - 14, 280, 28, 50); g.fillStyle = '#3a1c38';
    }
    g.beginPath(); g.arc(cx, 400, 120, Math.PI, 0); g.fill();
    g.fillStyle = '#ffcf7a';
    for (let i = 0; i < 9; i++) { g.fillRect(cx - 430 + i * 110, 600, 16, 30); g.beginPath(); g.arc(cx - 422 + i * 110, 600, 8, Math.PI, 0); g.fill(); }
    g.fillStyle = '#ffd27a'; for (let i = 0; i < 52; i++) g.fillRect(cx - 520 + i * 20, 414, 6, 6); // light string on the roof line
    // crowd silhouettes along the bottom with candle dots
    g.fillStyle = '#140a18';
    for (let i = 0; i < 70; i++) { const x = i * 30 + r() * 10, h = 60 + r() * 50; g.fillRect(x, H * 0.8 - h, 22, h); g.beginPath(); g.arc(x + 11, H * 0.8 - h - 10, 12, 0, 7); g.fill(); }
    g.fillStyle = '#ffd27a'; for (let i = 0; i < 50; i++) g.fillRect(r() * W, H * 0.72 + r() * 40, 5, 5);
    g.fillStyle = '#2a2026'; g.fillRect(0, H * 0.8, W, H * 0.2);
  },
  props: (set) => {
    // papel picado garlands: two rows of colored flags across the plaza, swaying in the breeze
    const flags = [];
    // garlands hang high: above the caption block in the wide shot
    for (const [z, y0] of [[-1.6, 7.5], [-3.6, 7.9]]) {
      for (let i = 0; i < 26; i++) {
        const k = i / 25, x = -8 + k * 16, y = y0 - Math.sin(k * Math.PI) * 0.35;
        const pivot = at(new THREE.Group(), x, y, z);
        const m = ownMat(PAPEL[(i + (z < -2 ? 3 : 0)) % PAPEL.length], { side: THREE.DoubleSide, emissive: PAPEL[i % PAPEL.length], emissiveIntensity: 0.25 });
        const flag = at(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.58, 0.01), m), 0, -0.3, 0);
        // cut-out holes (dark squares) so it reads as papel picado
        for (const [hx, hy] of [[-0.12, 0.1], [0.12, 0.1], [0, -0.1]]) flag.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.012), ownMat(0x1a0a24)), hx, hy, 0));
        pivot.add(flag);
        set.add(pivot);
        flags.push(pivot);
      }
      for (let i = 0; i < 25; i++) { const k = (i + 0.5) / 25; set.add(at(box(16 / 25, 0.02, 0.02, 0x222222), -8 + k * 16, y0 - Math.sin(k * Math.PI) * 0.35, z)); }
    }
    // marigold arches at both sides
    const a1 = marigoldArch(1.2); a1.position.set(-4.8, 0, -2.6); set.add(a1);
    const a2 = marigoldArch(1.2); a2.position.set(4.6, 0, -2.6); set.add(a2);
    // ofrenda (altar) on the right: three steps with candles, marigolds and a small skull
    const steps = [[2.4, 0.5, 1.2, 0x8a2a8a], [1.8, 0.4, 0.9, 0xff7a1a], [1.2, 0.4, 0.6, 0xf4efe6]];
    let sy = 0;
    steps.forEach(([w, h, d, c], i) => { set.add(at(box(w, h, d, c, { bevel: 0.02 }), 3.5, sy + h / 2, -1.2 - i * 0.15)); sy += h; });
    set.add(at(box(0.36, 0.32, 0.3, 0xf4efe6, { bevel: 0.05 }), 3.5, sy + 0.16, -1.5));
    for (const sx of [-1, 1]) set.add(at(box(0.08, 0.08, 0.04, 0x1a1a22), 3.5 + sx * 0.08, sy + 0.2, -1.34));
    const flames = [];
    for (let i = 0; i < 6; i++) {
      const x = 2.6 + i * 0.36, y = i % 2 ? 0.5 : 0.9, z = -0.75 - (i % 2 ? 0 : 0.2);
      set.add(at(box(0.1, 0.3, 0.1, 0xf6f0dc), x, y + 0.15, z));
      const f = at(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 5), new THREE.MeshBasicMaterial({ color: 0xffc040 })), x, y + 0.4, z);
      set.add(f); flames.push(f);
    }
    const candle = new THREE.PointLight(0xffa040, 5, 7, 1.5); candle.position.set(3.4, 1.6, -0.6); set.add(candle);
    // skeleton float drifting across the back of the plaza
    const float = skullFloat(); float.group.position.set(0, 0, -8.5); set.add(float.group);
    const magenta = new THREE.PointLight(0xff4ad8, 4, 10, 1.5); magenta.position.set(-3, 3.5, 1); set.add(magenta);
    return [(t) => {
      flags.forEach((p, i) => { p.rotation.x = Math.sin(t * 2.2 + i * 0.7) * 0.25; p.rotation.z = Math.sin(t * 1.3 + i) * 0.06; });
      flames.forEach((f, i) => f.scale.set(1, flicker(t, i * 2) * (1 + 0.2 * Math.sin(t * 11 + i)), 1));
      candle.intensity = 5 * flicker(t, 7);
      float.group.position.x = -13 + ((t * 0.9) % 26);
      float.head.rotation.z = Math.sin(t * 1.6) * 0.08;
      float.head.position.y = 1.9 + Math.abs(Math.sin(t * 1.6)) * 0.12;
    }];
  },
  lights: { hemi: [0xffb0d0, 0x281428, 1.0], key: [0xffe0c8, 1.35], fill: [0xff9a70, 0.9] },
});
