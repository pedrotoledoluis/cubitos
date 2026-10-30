import * as THREE from 'three';
import { box, at, ownMat, flicker } from './common.js';
import { makeLocation, glow } from './modern.js';

// Andean bakery on Todos los Santos (Arequipa style): white sillar arches with El Misti behind, a clay dome oven
// (horno de barro) with a flickering fire and rising smoke, a counter with guaguas and caballitos de pan (one
// guagua rocks like a baby), and a small offering table with flickering candles. Board: wooden sign.

const SILLAR = 0xeee6d6, SILLAR_DARK = 0xd6ccb8, WOOD = 0x6a4224, CRUST = 0xc98a42, CRUST_DARK = 0x9a5e26;
const MASK = 0xf6e6d2, ICING = [0xff7aa8, 0x5fbf6a, 0xffd23a, 0x5a8aff];

/** Guagua de pan: rounded bread body, plaster mask face, icing bands. Stands ~0.62 tall. */
function guagua(seed = 0) {
  const g = new THREE.Group();
  g.add(at(box(0.3, 0.42, 0.16, CRUST, { bevel: 0.07 }), 0, 0.21, 0));
  g.add(at(box(0.26, 0.24, 0.16, CRUST, { bevel: 0.08 }), 0, 0.5, 0));
  g.add(at(box(0.17, 0.17, 0.04, MASK, { bevel: 0.03 }), 0, 0.5, 0.08)); // careta
  for (const sx of [-1, 1]) g.add(at(box(0.025, 0.025, 0.01, 0x1a1a22), sx * 0.04, 0.53, 0.105)); // eyes
  g.add(at(box(0.05, 0.015, 0.01, 0xd23a2a), 0, 0.47, 0.105)); // mouth
  for (let i = 0; i < 3; i++) g.add(at(box(0.31, 0.035, 0.17, ICING[(i + seed) % ICING.length]), 0, 0.08 + i * 0.11, 0));
  return g;
}

/** Caballito de pan: chunky bread horse with an icing mane. Faces +x, ~0.5 tall. */
function caballito(seed = 0) {
  const g = new THREE.Group();
  g.add(at(box(0.46, 0.18, 0.14, CRUST, { bevel: 0.06 }), 0, 0.24, 0));
  for (const x of [-0.16, 0.16]) g.add(at(box(0.07, 0.18, 0.12, CRUST), x, 0.09, 0));
  const neck = at(box(0.1, 0.24, 0.12, CRUST, { bevel: 0.03 }), 0.2, 0.38, 0); neck.rotation.z = -0.4; g.add(neck);
  g.add(at(box(0.2, 0.1, 0.12, CRUST, { bevel: 0.04 }), 0.3, 0.5, 0));
  g.add(at(box(0.08, 0.14, 0.04, CRUST_DARK), -0.25, 0.22, 0)); // tail
  for (let i = 0; i < 3; i++) g.add(at(box(0.05, 0.05, 0.15, ICING[(i + seed) % ICING.length]), 0.13 + i * 0.05, 0.36 + i * 0.05, 0)); // mane
  g.add(at(box(0.16, 0.04, 0.15, 0xd23a2a), -0.02, 0.34, 0)); // saddle
  return g;
}

/** Thin candle with a flame; returns { group, flame }. */
function candle(h = 0.36) {
  const g = new THREE.Group();
  g.add(at(box(0.07, h, 0.07, 0xf6f0e2), 0, h / 2, 0));
  const flameMat = glow(0xffb040, 1.8);
  const flame = at(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), flameMat), 0, h + 0.06, 0);
  g.add(flame);
  return { group: g, flame, flameMat };
}

export default makeLocation('andes_panaderia', {
  floor: 0x8a6a4a, frame: WOOD, boardStyle: 'wood', background: 0x9ac0e8, fog: [0xd8e4f0, 30, 72], exposure: 1.1,
  sky: (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, '#4a86d0'); sky.addColorStop(1, '#bcd8f2');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // El Misti: big symmetric cone with a snow cap, flanked by lower ridges
    g.fillStyle = '#8a7a74'; g.beginPath(); g.moveTo(0, 760); g.lineTo(420, 660); g.lineTo(720, 710); g.lineTo(990, 520); g.lineTo(1070, 520); g.lineTo(1380, 720); g.lineTo(1700, 610); g.lineTo(2048, 720); g.lineTo(2048, 860); g.lineTo(0, 860); g.fill();
    g.fillStyle = '#f8f6ff'; g.beginPath(); g.moveTo(990, 520); g.lineTo(1070, 520); g.lineTo(1130, 568); g.lineTo(1090, 562); g.lineTo(1050, 580); g.lineTo(1010, 560); g.lineTo(950, 570); g.fill();
    // white sillar city wall with arches across the bottom
    g.fillStyle = '#ece4d4'; g.fillRect(0, 760, W, H - 760);
    g.fillStyle = '#b8ac94'; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(60 + i * 230, H); g.lineTo(60 + i * 230, 860); g.arc(140 + i * 230, 860, 80, Math.PI, 0); g.lineTo(220 + i * 230, H); g.fill(); }
    g.font = '900 70px Georgia'; g.textAlign = 'center'; g.fillStyle = '#7a3a1e'; g.fillText('PANADERÍA · TODOS SANTOS', W * 0.5, 740);
  },
  props: (set) => {
    const ups = [];
    // sillar walls behind, with a big arch framing the board area
    set.add(at(box(5.0, 5.6, 0.4, SILLAR, { bevel: 0.04 }), -5.0, 2.8, -3.6));
    set.add(at(box(5.0, 5.6, 0.4, SILLAR, { bevel: 0.04 }), 4.7, 2.8, -3.6));
    for (const sx of [-1, 1]) set.add(at(box(0.6, 5.2, 0.6, SILLAR_DARK, { bevel: 0.05 }), -0.15 + sx * 2.05, 2.6, -3.45)); // pillars
    set.add(at(box(4.8, 0.7, 0.6, SILLAR_DARK, { bevel: 0.05 }), -0.15, 5.35, -3.45)); // lintel above the board
    // left: wooden counter with guaguas and caballitos
    set.add(at(box(2.4, 0.95, 1.0, WOOD, { bevel: 0.03 }), -3.5, 0.475, -1.9));
    set.add(at(box(2.5, 0.06, 1.1, 0xa87a4a), -3.5, 0.98, -1.9));
    const breads = [];
    [[-4.3, 0], [-3.95, 1], [-3.0, 2]].forEach(([x, s]) => { const b = guagua(s); b.position.set(x, 1.01, -1.75); b.rotation.y = 0.25; set.add(b); breads.push(b); });
    const c1 = caballito(1); c1.position.set(-3.45, 1.01, -1.6); c1.rotation.y = 0.5; set.add(c1);
    const c2 = caballito(3); c2.position.set(-2.65, 1.01, -2.15); c2.rotation.y = 0.9; set.add(c2);
    // a stacked tray behind the counter
    set.add(at(box(1.8, 0.06, 0.5, 0x8a5a32), -3.6, 1.7, -2.5));
    [[-4.2, 3], [-3.8, 0], [-3.4, 2], [-3.0, 1]].forEach(([x, s]) => { const b = guagua(s); b.scale.setScalar(0.7); b.position.set(x, 1.73, -2.5); set.add(b); });
    // right: clay dome oven with glowing mouth and chimney smoke
    const oven = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.15, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), ownMat(0xb8683e, { flatShading: true }));
    dome.castShadow = true; oven.add(dome);
    oven.add(at(box(2.6, 0.5, 2.4, 0xa89070, { bevel: 0.04 }), 0, -0.25, 0)); // base
    oven.add(at(box(0.7, 0.55, 0.3, 0x2a1408), 0, 0.3, 1.0)); // mouth
    const fireMat = glow(0xff7a1a, 2.2);
    oven.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.1), fireMat), 0, 0.2, 1.1));
    oven.add(at(box(0.3, 0.5, 0.3, 0x9a5a34), 0.35, 1.2, -0.3)); // chimney
    oven.position.set(3.4, 0.5, -2.4); oven.rotation.y = -0.45; set.add(oven);
    const fireLight = new THREE.PointLight(0xff8a3a, 5, 7, 1.5); fireLight.position.set(3.0, 1.1, -1.4); set.add(fireLight);
    const puffs = [];
    for (let i = 0; i < 5; i++) { const m = ownMat(0xf2f2f2, { transparent: true, opacity: 0.5 }); const p = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), m); set.add(p); puffs.push(p); }
    const chimneyTop = new THREE.Vector3(3.6, 2.0, -2.6);
    // small offering table between the arch and the oven: candles, flowers and guaguas
    set.add(at(box(1.3, 0.8, 0.6, 0x5a2a5a, { bevel: 0.03 }), 2.3, 0.4, -2.7));
    set.add(at(box(1.35, 0.05, 0.65, 0xf4efe6), 2.3, 0.82, -2.7));
    const candles = [];
    for (const x of [1.8, 2.8]) { const c = candle(); c.group.position.set(x, 0.85, -2.7); set.add(c.group); candles.push(c); }
    for (const [x, s] of [[2.1, 2], [2.5, 0]]) { const b = guagua(s); b.scale.setScalar(0.75); b.position.set(x, 0.85, -2.65); set.add(b); }
    for (const x of [1.95, 2.65]) set.add(at(box(0.12, 0.12, 0.12, 0xff9a1a, { bevel: 0.04 }), x, 1.3, -2.85)); // flowers
    const candleLight = new THREE.PointLight(0xffb060, 2.5, 5, 1.6); candleLight.position.set(2.3, 1.5, -2.5); set.add(candleLight);
    ups.push((t) => {
      // the front guagua rocks like a baby in a cradle
      breads[2].rotation.z = Math.sin(t * 2.2) * 0.12;
      fireMat.emissiveIntensity = 2.2 * flicker(t, 1);
      fireLight.intensity = 5 * flicker(t, 1);
      candles.forEach((c, i) => { const f = flicker(t, 5 + i * 3); c.flameMat.emissiveIntensity = 1.8 * f; c.flame.scale.y = 0.8 + 0.4 * f; });
      candleLight.intensity = 2.5 * flicker(t, 7);
      puffs.forEach((p, i) => {
        const k = ((t * 0.35 + i / puffs.length) % 1);
        p.position.set(chimneyTop.x + Math.sin(k * 5 + i) * 0.25 + k * 0.4, chimneyTop.y + k * 2.4, chimneyTop.z);
        p.scale.setScalar(0.6 + k * 1.4);
        p.material.opacity = 0.55 * (1 - k);
      });
    });
    return ups;
  },
  lights: { hemi: [0xe8f0ff, 0x6a5040, 1.15], key: [0xfff0dc, 1.7], fill: [0xffd8b0, 0.9] },
});
