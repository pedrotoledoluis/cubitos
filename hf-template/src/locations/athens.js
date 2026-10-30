import * as THREE from 'three';
import {
  BOARD, boardScreen, box, at, mat, rng, canvasTexture, backdrop, cylinder, createChicken, createPigeon, walkPath,
} from './common.js';

// Athens agora, 4th century BC, daylight: temple with columns and pediment, stoa, market stalls with
// swaying awnings, olive tree, Diogenes' big clay jar (tinaja), a chicken and a pigeon wandering.
// 2D graphics show on a wooden notice board at BOARD.

const MARBLE = 0xeee6d6, MARBLE_DARK = 0xd6ccb8, TERRACOTTA = 0xb5562b, WOOD = 0x6b4426;

function skyTexture() {
  return canvasTexture(2048, 1024, (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#3d8fe8'); sky.addColorStop(0.65, '#9fd0ff'); sky.addColorStop(1, '#e6f3ff');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const r = rng(5);
    g.fillStyle = 'rgba(255,255,255,0.92)';
    for (let i = 0; i < 9; i++) { // blocky clouds
      const x = r() * W, y = 60 + r() * 380, w = 140 + r() * 220;
      g.fillRect(x, y, w, 46); g.fillRect(x + w * 0.2, y - 34, w * 0.5, 40);
    }
    // distant hills (olive / ochre) with the Acropolis rock
    g.fillStyle = '#9db27a';
    g.beginPath(); g.moveTo(0, H); g.lineTo(0, 800); g.lineTo(300, 740); g.lineTo(620, 790); g.lineTo(980, 720); g.lineTo(1400, 780);
    g.lineTo(1700, 730); g.lineTo(W, 790); g.lineTo(W, H); g.fill();
    g.fillStyle = '#c9b48a'; g.fillRect(1500, 650, 340, 110);
    g.fillStyle = '#efe6d2'; g.fillRect(1560, 600, 220, 50);
    for (let i = 0; i < 8; i++) g.fillRect(1565 + i * 28, 612, 12, 40);
  });
}

function pavingTexture() {
  const tex = canvasTexture(512, 512, (g, W, H) => {
    g.fillStyle = '#d9c49a'; g.fillRect(0, 0, W, H);
    const r = rng(9);
    for (let y = 0; y < H; y += 64) for (let x = (y / 64) % 2 ? -32 : 0; x < W; x += 64) {
      g.fillStyle = `rgba(${150 + r() * 40},${120 + r() * 30},${80 + r() * 20},0.35)`;
      g.fillRect(x + 3, y + 3, 58, 58);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

function column(h, r = 0.3) {
  const g = new THREE.Group();
  g.add(at(box(r * 2.6, 0.16, r * 2.6, MARBLE_DARK), 0, 0.08, 0));
  g.add(at(cylinder(r, h - 0.36, MARBLE, 8), 0, h / 2, 0));
  g.add(at(box(r * 2.8, 0.2, r * 2.8, MARBLE_DARK), 0, h - 0.1, 0));
  return g;
}

function temple() {
  const g = new THREE.Group();
  [[10.4, 4.4], [9.8, 4.0], [9.2, 3.6]].forEach(([w, d], i) => g.add(at(box(w, 0.3, d, i % 2 ? MARBLE : MARBLE_DARK), 0, 0.15 + i * 0.3, 0)));
  for (let i = 0; i < 6; i++) { const c = column(4.2, 0.34); c.position.set(-3.8 + i * 1.52, 0.9, 1.3); g.add(c); }
  g.add(at(box(9.4, 0.6, 3.4, MARBLE), 0, 5.4, 0.2));
  g.add(at(box(9.4, 0.45, 3.4, 0x3a6fb0), 0, 5.92, 0.2)); // painted frieze
  for (let i = 0; i < 12; i++) g.add(at(box(0.22, 0.45, 0.06, MARBLE), -4.4 + i * 0.8, 5.92, 1.92));
  const tri = new THREE.Shape();
  tri.moveTo(-4.9, 0); tri.lineTo(4.9, 0); tri.lineTo(0, 1.7); tri.closePath();
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 3.6, bevelEnabled: false }), mat(MARBLE));
  ped.position.set(0, 6.14, -1.6);
  g.add(ped);
  const inner = new THREE.Shape();
  inner.moveTo(-3.9, 0.15); inner.lineTo(3.9, 0.15); inner.lineTo(0, 1.32); inner.closePath();
  const tym = new THREE.Mesh(new THREE.ExtrudeGeometry(inner, { depth: 0.05, bevelEnabled: false }), mat(0xb8463a));
  tym.position.set(0, 6.14, 2.02);
  g.add(tym);
  return g;
}

/** Market stall with a striped awning that sways (pivot at the back edge). */
function stall(colors, goods) {
  const g = new THREE.Group();
  g.add(at(box(1.9, 0.12, 0.9, WOOD), 0, 0.85, 0));
  g.add(at(box(1.8, 0.8, 0.8, 0x7a5232), 0, 0.4, 0));
  for (const [x, z] of [[-0.9, 0.42], [0.9, 0.42], [-0.9, -0.42], [0.9, -0.42]]) g.add(at(box(0.08, 2.0, 0.08, 0x5a3a20), x, 1.0, z));
  const awning = at(new THREE.Group(), 0, 2.0, -0.45);
  for (let i = 0; i < 6; i++) awning.add(at(box(0.33, 0.04, 1.3, colors[i % 2]), -0.83 + i * 0.33, 0, 0.6));
  awning.rotation.x = 0.25;
  g.add(awning);
  goods.forEach(([c, x, s]) => g.add(at(box(s, s, s, c, { bevel: 0.03 }), x, 0.91 + s / 2, 0.05)));
  return { group: g, awning };
}

/** Big clay jar (pithos / tinaja) lying on its side, open end toward the camera side. */
function tinaja() {
  const g = new THREE.Group();
  const prof = [[0.05, -1.0], [0.45, -0.95], [0.68, -0.6], [0.75, -0.1], [0.68, 0.4], [0.5, 0.75], [0.4, 0.9], [0.44, 1.0]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const jar = new THREE.Mesh(new THREE.LatheGeometry(prof, 9), mat(TERRACOTTA, { side: THREE.DoubleSide }));
  jar.castShadow = true; jar.receiveShadow = true;
  g.add(jar);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.4, 9), new THREE.MeshBasicMaterial({ color: 0x1a0d06 }));
  hole.position.y = 0.97; hole.rotation.x = -Math.PI / 2;
  g.add(hole);
  for (const y of [-0.35, 0.25]) g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.035, 4, 9), mat(0x8e3f1e)), 0, y, 0));
  g.children.at(-1).rotation.x = Math.PI / 2; g.children.at(-2).rotation.x = Math.PI / 2;
  g.rotation.set(0, 0, Math.PI / 2 - 0.12);
  return g;
}

function oliveTree() {
  const g = new THREE.Group();
  const trunk = at(box(0.3, 1.8, 0.3, 0x6b5136), 0, 0.9, 0);
  trunk.rotation.z = 0.12;
  g.add(trunk);
  [[0, 2.1, 0, 0.9], [-0.6, 1.9, 0.2, 0.6], [0.6, 2.0, -0.2, 0.65], [0.1, 2.6, 0, 0.6]].forEach(([x, y, z, r]) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(0x6f8f4a));
    m.position.set(x, y, z); m.castShadow = true; g.add(m);
  });
  return g;
}

/** Wooden notice board on two posts with a small gable roof, framing BOARD. */
function noticeBoard(boardTexture) {
  const g = new THREE.Group();
  const B = BOARD;
  g.add(at(box(B.w + 0.3, B.h + 0.3, 0.16, 0x5a3a20), B.x, B.y, B.z - 0.04)); // front face stays behind the screen
  for (const sx of [-1, 1]) g.add(at(box(0.18, B.y + B.h / 2 + 0.4, 0.18, 0x6b4426), B.x + sx * (B.w / 2 + 0.25), (B.y + B.h / 2 + 0.4) / 2, B.z - 0.05));
  for (const sx of [-1, 1]) {
    const roof = at(box(B.w / 2 + 0.55, 0.1, 0.5, TERRACOTTA), B.x + sx * (B.w / 4 + 0.12), B.y + B.h / 2 + 0.42, B.z + 0.05);
    roof.rotation.z = -sx * 0.22;
    g.add(roof);
  }
  g.add(boardScreen(boardTexture));
  return g;
}

function build({ boardTexture }) {
  const set = new THREE.Group();
  const floor = at(box(40, 0.2, 40, 0xffffff, { map: pavingTexture() }), 0, -0.1, -4);
  floor.castShadow = false;
  set.add(floor);
  set.add(backdrop(skyTexture(), 70, 35, 0, 7, -26));

  const t = temple(); t.position.set(0, 0, -11); set.add(t);
  // stoa (colonnade) on the left with hanging banners
  const stoa = new THREE.Group();
  for (let i = 0; i < 4; i++) { const c = column(3.4, 0.24); c.position.set(-i * 1.2, 0, 0); stoa.add(c); }
  stoa.add(at(box(4.8, 0.4, 1.6, MARBLE), -1.8, 3.6, -0.4));
  stoa.add(at(box(4.8, 3.6, 0.2, 0xd8c7a6), -1.8, 1.8, -1.2));
  stoa.position.set(-3.4, 0, -5.2);
  set.add(stoa);
  const banners = [0, 1, 2].map((i) => {
    const pivot = at(new THREE.Group(), -3.95 - i * 1.2, 3.35, -4.95);
    pivot.add(at(box(0.5, 1.1, 0.04, i % 2 ? 0x2a6fb0 : 0xb8463a), 0, -0.55, 0));
    set.add(pivot);
    return pivot;
  });
  const tree = oliveTree(); tree.position.set(3.9, 0, -5.5); set.add(tree);

  const s1 = stall([0xc8402f, 0xf1e6cc], [[0xe2b33c, -0.5, 0.22], [0x8a3fa0, -0.15, 0.2], [0x6aa84f, 0.25, 0.24], [0xe07a2a, 0.6, 0.2]]);
  s1.group.position.set(-3.3, 0, -2.2); s1.group.rotation.y = 0.35; set.add(s1.group);
  const s2 = stall([0x2a6fb0, 0xf1e6cc], [[TERRACOTTA, -0.4, 0.3], [TERRACOTTA, 0.1, 0.24], [0xd8c7a6, 0.5, 0.26]]);
  s2.group.position.set(3.6, 0, -3.0); s2.group.rotation.y = -0.4; set.add(s2.group);
  // amphorae by the stall
  for (let i = 0; i < 3; i++) set.add(at(box(0.3, 0.55, 0.3, TERRACOTTA, { bevel: 0.08 }), 2.4 + i * 0.36, 0.28, -2.4 - (i % 2) * 0.3));

  const jar = tinaja(); jar.position.set(2.75, 0.74, -1.6); jar.rotation.y = 0.55; set.add(jar);
  set.add(noticeBoard(boardTexture));

  const chicken = createChicken(); set.add(chicken.group);
  const pigeon = createPigeon(); pigeon.group.position.set(-1.2, 0.9, -8.6); set.add(pigeon.group);

  // daylight
  set.add(new THREE.HemisphereLight(0xdcefff, 0xa08060, 1.15));
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.4);
  sun.position.set(5, 10, 7);
  sun.target.position.set(0, 0, -2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0006;
  set.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xffe8d0, 0.6);
  fill.position.set(-4, 3, 6);
  set.add(fill);

  function update(time) {
    s1.awning.rotation.x = 0.25 + Math.sin(time * 1.7) * 0.06;
    s2.awning.rotation.x = 0.25 + Math.sin(time * 1.5 + 1) * 0.06;
    banners.forEach((b, i) => { b.rotation.x = Math.sin(time * 1.9 + i) * 0.12; b.rotation.z = Math.sin(time * 1.3 + i * 2) * 0.05; });
    const w = walkPath(time, -4.2, 4.2, 0.55, 3.0);
    chicken.group.position.set(w.x, 0, -1.25);
    chicken.group.rotation.y = w.dir > 0 ? 0 : Math.PI;
    chicken.update(time);
    pigeon.update(time, { peck: 1 });
  }
  update(0);
  return { group: set, update, background: 0x9fd0ff, fog: [0xd8ecff, 24, 60], exposure: 1.0, boardStyle: 'wood' };
}

export default { name: 'athens', build };
