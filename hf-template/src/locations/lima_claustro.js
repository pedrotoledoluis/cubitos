import * as THREE from 'three';
import { box, at, ownMat, flicker } from './common.js';
import { makeLocation, glow } from './modern.js';

// Colonial Lima Dominican cloister by day (Santo Domingo, 1600s): ochre arcades with white arches, a dado of
// Sevillian blue/yellow tiles, the pink bell tower behind, a stone fountain with dripping water, a hanging lantern,
// and (the legend) a dog, a cat and a mouse eating from the same plate. Board: wooden sign.

const OCHRE = 0xe0a85a, WHITE = 0xf2ece0, STONE = 0xb8b0a0, WOOD = 0x5a3218;

/** Low-poly dog sitting at the plate, facing +x. Returns { group, head, tail }. */
function dog() {
  const g = new THREE.Group();
  const FUR = 0xb07a44, DARK = 0x6a4424;
  g.add(at(box(0.6, 0.3, 0.3, FUR, { bevel: 0.06 }), 0, 0.35, 0));
  for (const [x, z] of [[-0.22, -0.1], [-0.22, 0.1], [0.2, -0.1], [0.2, 0.1]]) g.add(at(box(0.08, 0.22, 0.08, FUR), x, 0.11, z));
  const head = at(new THREE.Group(), 0.34, 0.5, 0);
  head.add(box(0.26, 0.24, 0.24, FUR, { bevel: 0.05 }));
  head.add(at(box(0.16, 0.12, 0.16, 0xd8b088, { bevel: 0.03 }), 0.16, -0.05, 0)); // snout
  head.add(at(box(0.05, 0.05, 0.05, 0x111111), 0.25, -0.02, 0)); // nose
  for (const z of [-0.07, 0.07]) {
    head.add(at(box(0.03, 0.04, 0.04, 0x111111), 0.12, 0.05, z)); // eyes
    head.add(at(box(0.08, 0.16, 0.05, DARK, { bevel: 0.02 }), -0.04, 0.0, z * 2)); // floppy ears
  }
  g.add(head);
  const tail = at(new THREE.Group(), -0.3, 0.45, 0);
  tail.add(at(box(0.06, 0.22, 0.06, DARK, { bevel: 0.02 }), 0, 0.1, 0));
  g.add(tail);
  return { group: g, head, tail };
}

/** Low-poly cat, facing -x. Returns { group, head, tail }. */
function cat() {
  const g = new THREE.Group();
  const FUR = 0x8a8a9a, LIGHT = 0xe8e2d8;
  g.add(at(box(0.42, 0.22, 0.2, FUR, { bevel: 0.05 }), 0, 0.25, 0));
  for (const [x, z] of [[-0.15, -0.06], [-0.15, 0.06], [0.15, -0.06], [0.15, 0.06]]) g.add(at(box(0.06, 0.16, 0.06, FUR), x, 0.08, z));
  const head = at(new THREE.Group(), -0.25, 0.38, 0);
  head.add(box(0.2, 0.18, 0.2, FUR, { bevel: 0.04 }));
  head.add(at(box(0.04, 0.08, 0.12, LIGHT), -0.1, -0.04, 0)); // muzzle
  for (const z of [-0.06, 0.06]) {
    head.add(at(box(0.06, 0.08, 0.05, FUR), 0, 0.12, z)); // pointy ears
    head.add(at(box(0.02, 0.04, 0.04, 0x9adf5a, { emissive: 0x2a5a10 }), -0.1, 0.03, z)); // green eyes
  }
  g.add(head);
  const tail = at(new THREE.Group(), 0.22, 0.3, 0);
  tail.add(at(box(0.05, 0.3, 0.05, FUR, { bevel: 0.02 }), 0, 0.14, 0));
  g.add(tail);
  return { group: g, head, tail };
}

/** Tiny grey mouse with big pink ears, facing -z (toward the plate from the front). */
function mouse() {
  const g = new THREE.Group();
  const GREY = 0x9a96a0;
  g.add(at(box(0.12, 0.08, 0.18, GREY, { bevel: 0.03 }), 0, 0.05, 0));
  g.add(at(box(0.08, 0.07, 0.08, GREY, { bevel: 0.02 }), 0, 0.07, -0.11));
  for (const x of [-0.04, 0.04]) g.add(at(box(0.05, 0.05, 0.015, 0xf2a0b0), x, 0.12, -0.09)); // ears
  g.add(at(box(0.02, 0.02, 0.02, 0x111111), 0, 0.07, -0.155)); // nose
  g.add(at(box(0.015, 0.015, 0.22, 0xd890a0), 0, 0.03, 0.18)); // tail
  return g;
}

export default makeLocation('lima_claustro', {
  floor: 0xa89880, frame: WOOD, boardStyle: 'wood', background: 0x9cc4ec, fog: [0xdce8f2, 30, 72], exposure: 1.1,
  sky: (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, '#5a92d6'); sky.addColorStop(1, '#c8e0f4');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // Santo Domingo's pink bell tower (stacked tiers with arched openings) behind the cloister roof
    const tx = W * 0.72;
    g.fillStyle = '#e8a8a8'; g.fillRect(tx - 70, 300, 140, 520);
    g.fillStyle = '#f2c0b8'; g.fillRect(tx - 55, 200, 110, 110); g.fillRect(tx - 40, 130, 80, 80);
    g.fillStyle = '#7a4a4a'; [[330, 40], [420, 40], [230, 30], [150, 22]].forEach(([y, w]) => { g.beginPath(); g.moveTo(tx - w / 2, y + 60); g.lineTo(tx - w / 2, y + 20); g.arc(tx, y + 20, w / 2, Math.PI, 0); g.lineTo(tx + w / 2, y + 60); g.fill(); });
    g.fillStyle = '#c9a050'; g.fillRect(tx - 6, 70, 12, 60); g.fillRect(tx - 22, 88, 44, 10); // cross
    // upper gallery of the cloister: ochre wall with a row of white arches
    g.fillStyle = '#e4b06a'; g.fillRect(0, 700, W, H - 700);
    g.fillStyle = '#f4eee2'; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(40 + i * 205, 860); g.lineTo(40 + i * 205, 780); g.arc(110 + i * 205, 780, 70, Math.PI, 0); g.lineTo(180 + i * 205, 860); g.fill(); }
    g.fillStyle = '#8a4a2a'; g.fillRect(0, 690, W, 16); // roof edge
  },
  props: (set) => {
    const ups = [];
    // back arcade: ochre wall, white pillars and arches, blue/yellow tile dado
    set.add(at(box(16, 5.6, 0.3, OCHRE), 0, 2.8, -4.0));
    for (let i = 0; i < 7; i++) {
      const x = -6 + i * 2;
      if (Math.abs(x + 0.15) < 1.6) continue; // keep the board area clean
      set.add(at(box(0.45, 3.4, 0.45, WHITE, { bevel: 0.04 }), x, 1.7, -3.7));
      set.add(at(box(1.6, 0.35, 0.3, WHITE, { bevel: 0.03 }), x + 1, 3.3, -3.75));
    }
    for (let i = 0; i < 40; i++) {
      const x = -7.8 + i * 0.4;
      if (Math.abs(x + 0.15) < 1.5) continue;
      set.add(at(box(0.38, 0.38, 0.04, i % 2 ? 0x2a5ab0 : 0xe8c040), x, 0.5, -3.83));
      set.add(at(box(0.38, 0.38, 0.04, i % 2 ? 0xe8c040 : 0x2a5ab0), x, 0.9, -3.83));
    }
    // right: stone fountain with water dripping from the top bowl, a few potted plants
    const fountain = new THREE.Group();
    fountain.add(at(box(1.8, 0.45, 1.8, STONE, { bevel: 0.05 }), 0, 0.22, 0));
    fountain.add(at(box(1.5, 0.08, 1.5, 0x5a9ad0, { transparent: true, opacity: 0.85 }), 0, 0.42, 0));
    fountain.add(at(box(0.25, 1.0, 0.25, STONE), 0, 0.9, 0));
    fountain.add(at(box(0.8, 0.14, 0.8, STONE, { bevel: 0.04 }), 0, 1.4, 0));
    fountain.add(at(box(0.18, 0.3, 0.18, STONE, { bevel: 0.04 }), 0, 1.6, 0));
    fountain.position.set(3.4, 0, -2.4); set.add(fountain);
    const drops = [];
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), ownMat(0x9ad0ff, { transparent: true, opacity: 0.85 })); set.add(m); drops.push(m); }
    for (const [x, z] of [[2.3, -3.2], [4.6, -1.6]]) {
      set.add(at(box(0.4, 0.4, 0.4, 0xb5562b, { bevel: 0.04 }), x, 0.2, z));
      set.add(at(box(0.55, 0.55, 0.55, 0x3f8a3a, { bevel: 0.12 }), x, 0.7, z));
    }
    // hanging iron lantern in the arcade (left of the board)
    const lantern = at(new THREE.Group(), -2.4, 4.3, -3.2);
    lantern.add(at(box(0.03, 0.5, 0.03, 0x222222), 0, -0.25, 0));
    const lampMat = glow(0xffc870, 1.3);
    lantern.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), lampMat), 0, -0.7, 0));
    lantern.add(at(box(0.34, 0.06, 0.34, 0x222222), 0, -0.5, 0), at(box(0.3, 0.05, 0.3, 0x222222), 0, -0.9, 0));
    set.add(lantern);
    // left: refectory table with the legend's shared plate (dog, cat and mouse eating together), above Tito's head
    set.add(at(box(2.0, 0.08, 1.0, 0x7a4a24, { bevel: 0.02 }), -2.45, 1.2, -2.4));
    for (const [x, z] of [[-3.3, -2.8], [-3.3, -2.0], [-1.6, -2.8], [-1.6, -2.0]]) set.add(at(box(0.1, 1.2, 0.1, WOOD), x, 0.6, z));
    const plate = at(new THREE.Group(), -2.4, 1.24, -2.3);
    plate.add(at(box(0.6, 0.05, 0.6, 0xf4efe6, { bevel: 0.02 }), 0, 0.03, 0));
    plate.add(at(box(0.44, 0.04, 0.44, 0xd8a050), 0, 0.07, 0)); // food
    const d = dog(); d.group.position.set(-0.52, 0, 0); plate.add(d.group);
    const c = cat(); c.group.position.set(0.45, 0, 0); plate.add(c.group);
    const m = mouse(); m.position.set(0.05, 0.03, 0.36); m.scale.setScalar(1.4); plate.add(m);
    plate.scale.setScalar(1.15); plate.rotation.y = 0.15; set.add(plate);
    // a broom leaning on the pillar (fray Escoba)
    const br = new THREE.Group();
    br.add(at(box(0.05, 1.5, 0.05, 0x7a4a24), 0, 0.95, 0));
    br.add(at(box(0.34, 0.26, 0.12, 0xd9b45a, { bevel: 0.03 }), 0, 0.13, 0));
    br.position.set(-4.3, 0, -3.3); br.rotation.z = -0.18; set.add(br);
    ups.push((t) => {
      // everyone eats in turns: heads dip toward the plate, the dog wags, the mouse nibbles
      d.head.rotation.z = -0.25 - 0.2 * Math.max(0, Math.sin(t * 3));
      d.tail.rotation.x = Math.sin(t * 11) * 0.6;
      c.head.rotation.z = 0.2 + 0.2 * Math.max(0, Math.sin(t * 2.6 + 1.5));
      c.tail.rotation.x = Math.sin(t * 1.7) * 0.35;
      m.position.z = 0.36 - 0.04 * Math.max(0, Math.sin(t * 9));
      m.rotation.x = 0.1 * Math.sin(t * 9);
      lantern.rotation.z = Math.sin(t * 1.1) * 0.06;
      lampMat.emissiveIntensity = 1.3 * flicker(t, 4);
      drops.forEach((p, i) => {
        const k = (t * 1.2 + i / drops.length) % 1, a = (i / drops.length) * Math.PI * 2;
        p.position.set(3.4 + Math.cos(a) * (0.42 + k * 0.1), 1.4 - k * 0.95, -2.4 + Math.sin(a) * (0.42 + k * 0.1));
      });
    });
    return ups;
  },
  lights: { hemi: [0xe8f0ff, 0x6a5a48, 1.15], key: [0xfff0dc, 1.7], fill: [0xffe0b8, 0.9] },
});
