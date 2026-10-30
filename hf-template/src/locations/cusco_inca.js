import * as THREE from 'three';
import { box, at, rng, ownMat } from './common.js';
import { makeLocation } from './modern.js';

// Cusco at golden hour: fitted polygonal Inca stone walls with a trapezoidal doorway, Andes peaks with snow,
// green terraces (andenes), a llama that chews and sways, a condor gliding overhead. Board: wooden sign.

const STONES = [0x8a8274, 0x9a9282, 0x7e776a, 0xa39a88, 0x6f695e];

/** Wall of fitted irregular stones (rows of different widths, slight tilts), deterministic. */
function incaWall(w, h, seed) {
  const g = new THREE.Group();
  const r = rng(seed);
  let y = 0, row = 0;
  while (y < h - 0.05) {
    const rh = Math.min(h - y, 0.42 + r() * 0.3 - row * 0.02);
    let x = -w / 2;
    while (x < w / 2 - 0.05) {
      const sw = Math.min(w / 2 - x, 0.6 + r() * 0.9);
      const s = at(box(sw - 0.04, rh - 0.04, 0.5, STONES[Math.floor(r() * STONES.length)], { bevel: 0.07 }), x + sw / 2, y + rh / 2, 0);
      s.rotation.z = (r() - 0.5) * 0.04;
      g.add(s);
      x += sw;
    }
    y += rh; row++;
  }
  return g;
}

/** Low-poly llama. Returns { group, head, jaw }. Faces +x. */
function llama() {
  const g = new THREE.Group();
  const WOOL = 0xf2ead8, BROWN = 0x8a5a32;
  g.add(at(box(1.1, 0.6, 0.55, WOOL, { bevel: 0.1 }), 0, 1.05, 0));
  for (const [x, z] of [[-0.4, -0.18], [0.4, -0.18], [-0.4, 0.18], [0.4, 0.18]]) g.add(at(box(0.14, 0.8, 0.14, WOOL), x, 0.4, z));
  g.add(at(box(0.2, 0.25, 0.2, WOOL, { bevel: 0.05 }), -0.6, 1.15, 0)); // tail
  // saddle blanket with Andean stripes
  for (let i = 0; i < 4; i++) g.add(at(box(0.16, 0.06, 0.6, [0xd23a2a, 0xffd23a, 0x2a8a5a, 0xd23a2a][i]), -0.24 + i * 0.16, 1.37, 0));
  const neck = at(new THREE.Group(), 0.45, 1.25, 0);
  neck.add(at(box(0.26, 0.8, 0.26, WOOL, { bevel: 0.06 }), 0, 0.35, 0));
  const head = at(new THREE.Group(), 0.06, 0.82, 0);
  head.add(box(0.42, 0.26, 0.26, WOOL, { bevel: 0.06 }));
  for (const sz of [-1, 1]) {
    head.add(at(box(0.08, 0.24, 0.06, WOOL), -0.08, 0.22, sz * 0.09)); // ears
    head.add(at(box(0.08, 0.14, 0.06, 0xd23a2a), -0.08, 0.36, sz * 0.09)); // red tassels
    head.add(at(box(0.05, 0.05, 0.02, 0x111111), 0.06, 0.05, sz * 0.135)); // eyes
  }
  const jaw = at(box(0.2, 0.08, 0.2, BROWN), 0.18, -0.13, 0);
  head.add(jaw);
  neck.add(head);
  g.add(neck);
  return { group: g, head, neck, jaw };
}

/** Condor: dark wings with white patches, white collar. Faces +x. */
function condor() {
  const g = new THREE.Group();
  g.add(box(0.7, 0.2, 0.26, 0x141418));
  g.add(at(box(0.18, 0.16, 0.3, 0xf2f2f0), 0.32, 0.02, 0)); // white ruff
  g.add(at(box(0.16, 0.12, 0.12, 0xc85a4a), 0.46, 0.04, 0)); // bare head
  const wings = [-1, 1].map((s) => {
    const w = at(new THREE.Group(), 0, 0.04, s * 0.13);
    w.add(at(box(0.5, 0.04, 1.4, 0x141418), 0, 0, s * 0.7));
    w.add(at(box(0.2, 0.045, 0.7, 0xe8e8e8), 0.12, 0, s * 0.5));
    for (let i = 0; i < 4; i++) w.add(at(box(0.12, 0.04, 0.25, 0x141418), -0.2 + i * 0.12, 0, s * 1.45));
    g.add(w);
    return w;
  });
  return { group: g, wings };
}

export default makeLocation('cusco_inca', {
  floor: 0x8a7a5a, frame: 0x5a3a1e, boardStyle: 'wood', background: 0xf0b070, fog: [0xf4c890, 28, 70], exposure: 1.1,
  sky: (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, '#5a7ac0'); sky.addColorStop(0.45, '#f6a85a'); sky.addColorStop(0.75, '#ffd89a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff2b0'; g.beginPath(); g.arc(880, 470, 70, 0, 7); g.fill();
    // Andes: far blue-violet peaks with snow caps, then nearer ochre/green ridges
    const peaks = [[0, 700], [300, 560], [520, 680], [760, 500], [930, 640], [1060, 470], [1220, 650], [1420, 520], [1700, 660], [2048, 560], [2048, 820], [0, 820]];
    g.fillStyle = '#6a6aa0'; g.beginPath(); peaks.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
    g.fillStyle = '#f6f2ff';
    for (const [x, y] of [[300, 560], [760, 500], [1060, 470], [1420, 520]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x - 70, y + 60); g.lineTo(x - 20, y + 50); g.lineTo(x + 20, y + 66); g.lineTo(x + 75, y + 60); g.fill(); }
    g.fillStyle = '#8a8a4a'; g.beginPath(); g.moveTo(0, 760); for (let x = 0; x <= W; x += 64) g.lineTo(x, 740 - Math.sin(x * 0.005 + 1) * 40); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    // terraces (andenes): stacked green steps with stone edges on the right slope
    for (let i = 0; i < 7; i++) {
      const y = 770 + i * 22, x0 = 1060 - i * 40, w = 520 + i * 80;
      g.fillStyle = i % 2 ? '#6a9a3a' : '#7aab48'; g.fillRect(x0, y, w, 18);
      g.fillStyle = '#8a7a5a'; g.fillRect(x0, y + 16, w, 6);
    }
    g.fillStyle = '#6a5a3e'; g.fillRect(0, 930, W, H - 930);
  },
  props: (set) => {
    // fitted stone walls behind the characters, left and right of the board, with a trapezoidal doorway
    const wl = incaWall(6.0, 2.8, 3); wl.position.set(-5.2, 0, -3.4); set.add(wl);
    const wr = incaWall(6.0, 2.8, 8); wr.position.set(4.9, 0, -3.4); set.add(wr);
    const door = new THREE.Group(); // trapezoid: dark opening + lintel
    door.add(at(box(0.9, 1.9, 0.52, 0x2a2018), 0, 0.95, 0.02));
    for (const sx of [-1, 1]) { const j = at(box(0.3, 2.0, 0.56, STONES[1], { bevel: 0.05 }), sx * 0.58, 1.0, 0.02); j.rotation.z = sx * 0.07; door.add(j); }
    door.add(at(box(1.6, 0.36, 0.58, STONES[3], { bevel: 0.06 }), 0, 2.1, 0.02));
    door.position.set(-2.9, 0, -3.15); set.add(door);
    // a single famous "many-angled stone" shape on the right wall, a bit lighter
    const big = at(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.52, 7), ownMat(0xb0a690)), 2.5, 1.0, -3.1);
    big.rotation.x = Math.PI / 2; big.castShadow = true; set.add(big);
    // llama at the right front, chewing and swaying
    const L = llama(); L.group.position.set(2.9, 0, -2.0); L.group.rotation.y = -0.5; L.group.scale.setScalar(1.05); set.add(L.group);
    // condor circling high over the valley
    const C = condor(); set.add(C.group);
    const sun = new THREE.PointLight(0xffb060, 5, 14, 1.3); sun.position.set(3, 4, 2); set.add(sun);
    return [(t) => {
      L.jaw.position.z = Math.sin(t * 6) * 0.04; L.jaw.position.y = -0.13 - Math.abs(Math.sin(t * 6)) * 0.02;
      L.neck.rotation.z = Math.sin(t * 0.8) * 0.08;
      L.head.rotation.z = Math.sin(t * 0.8 + 1) * 0.1;
      L.group.rotation.y = -0.5 + Math.sin(t * 0.35) * 0.12;
      const a = t * 0.22;
      C.group.position.set(Math.cos(a) * 4.5, 8.1 + Math.sin(t * 0.7) * 0.3, -8 + Math.sin(a) * 1.5);
      C.group.rotation.y = -a - Math.PI / 2;
      C.group.rotation.x = -0.25;
      C.wings.forEach((w, i) => (w.rotation.x = (i ? 1 : -1) * (0.08 + Math.sin(t * 1.3) * 0.06)));
    }];
  },
  lights: { hemi: [0xffe0b0, 0x7a6040, 1.05], key: [0xffd8a0, 1.8], fill: [0xffc890, 0.8] },
});
