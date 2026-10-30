import * as THREE from 'three';
import { BOARD, boardScreen, box, at, rng, canvasTexture, backdrop, cylinder, createPigeon, walkPath } from './common.js';

// Medieval Italy (Modena, ~1325), afternoon: stone piazza ringed by brick towers (one like the Ghirlandina),
// a stone well with a wooden bucket swinging on its rope, swaying yellow/blue banners and a pigeon.
// 2D graphics show on a parchment banner hanging from a wooden stand at BOARD.

const BRICK = 0xa8553a, BRICK_DARK = 0x86412c, STONE = 0xcbbfa6, WOOD = 0x6b4426, YEL = 0xf2c230, BLU = 0x2a5cb8;

function skyTexture() {
  return canvasTexture(2048, 1024, (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#4f8fd8'); sky.addColorStop(0.6, '#a9d0f2'); sky.addColorStop(1, '#f3e2c0');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const r = rng(41);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 8; i++) {
      const x = r() * W, y = 60 + r() * 320, w = 140 + r() * 200;
      g.fillRect(x, y, w, 42); g.fillRect(x + w * 0.25, y - 30, w * 0.45, 36);
    }
    // distant rooftops of the town
    for (let i = 0; i < 26; i++) {
      const x = i * 82 + r() * 30, h = 90 + r() * 120;
      g.fillStyle = i % 3 ? '#c08a6a' : '#b07458';
      g.fillRect(x, H - 260 - h, 78, h + 260);
      g.fillStyle = '#9a4a32'; g.fillRect(x - 4, H - 268 - h, 86, 14);
    }
  });
}

function pavingTexture() {
  const tex = canvasTexture(512, 512, (g, W, H) => {
    g.fillStyle = '#9c917c'; g.fillRect(0, 0, W, H);
    const r = rng(12);
    for (let y = 0; y < H; y += 64) for (let x = (y / 64) % 2 ? -32 : 0; x < W; x += 64) {
      const c = 170 + r() * 35;
      g.fillStyle = `rgb(${c},${c - 10},${c - 28})`;
      g.fillRect(x + 3, y + 3, 58, 58);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

/** Brick tower with dark window slits and crenellations. Base at y = 0. */
function tower(w, h, color, seed) {
  const g = new THREE.Group();
  const r = rng(seed);
  g.add(at(box(w, h, w, color), 0, h / 2, 0));
  for (let i = 0; i < Math.floor(h / 1.6); i++) {
    if (r() < 0.35) continue;
    g.add(at(box(0.16, 0.4, 0.05, 0x2a1a14), (r() - 0.5) * w * 0.5, 1.2 + i * 1.6, w / 2 + 0.01));
  }
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) g.add(at(box(w / 6, 0.3, w / 6, color), sx * (w / 2 - w / 12), h + 0.15, -w / 2 + w / 12 + i * (w / 3 - w / 18)));
  g.add(at(box(w + 0.1, 0.12, w + 0.1, BRICK_DARK), 0, h - 0.06, 0));
  return g;
}

/** Ghirlandina-like bell tower: tall square brick shaft, white stone belfry with arches, octagonal spire. */
function ghirlandina() {
  const g = new THREE.Group();
  const w = 2.2;
  g.add(at(box(w, 9, w, 0xb8664a), 0, 4.5, 0));
  for (let i = 1; i < 5; i++) g.add(at(box(w + 0.12, 0.14, w + 0.12, 0xe9e0cc), 0, i * 1.9, 0));
  const belfry = at(new THREE.Group(), 0, 9, 0);
  belfry.add(at(box(w * 0.96, 1.6, w * 0.96, 0xeee6d4), 0, 0.8, 0));
  for (const sx of [-1, 0, 1]) belfry.add(at(box(0.36, 0.9, 0.05, 0x3a2a24), sx * 0.6, 0.8, w * 0.48 + 0.01));
  belfry.add(at(box(w * 0.7, 1.0, w * 0.7, 0xeee6d4), 0, 2.1, 0));
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0xe0d6c0, flatShading: true, roughness: 0.8 }));
  spire.position.y = 4.2; spire.castShadow = true;
  belfry.add(spire);
  belfry.add(at(box(0.08, 0.5, 0.08, 0xd9a93a, { metalness: 0.5 }), 0, 6.0, 0));
  g.add(belfry);
  return g;
}

/** Stone well with a wooden frame, a crank, and a bucket swinging on its rope. Returns the bucket pivot. */
function well() {
  const g = new THREE.Group();
  g.add(at(cylinder(0.75, 0.9, STONE, 10), 0, 0.45, 0));
  g.add(at(cylinder(0.8, 0.12, 0xb3a68a, 10), 0, 0.93, 0));
  g.add(at(cylinder(0.58, 0.05, 0x1d2a38, 10), 0, 0.9, 0));
  for (const sx of [-1, 1]) g.add(at(box(0.12, 1.6, 0.12, WOOD), sx * 0.7, 1.7, 0));
  g.add(at(box(1.6, 0.12, 0.14, WOOD), 0, 2.5, 0));
  const roof = [-1, 1].map((sx) => { const rf = at(box(1.0, 0.08, 0.9, 0x9a4a32), sx * 0.42, 2.78, 0); rf.rotation.z = -sx * 0.5; return rf; });
  g.add(...roof);
  const pivot = at(new THREE.Group(), 0.15, 2.42, 0);
  pivot.add(at(box(0.025, 0.9, 0.025, 0xd8c39a), 0, -0.45, 0)); // rope
  const bucket = at(new THREE.Group(), 0, -1.05, 0);
  bucket.add(at(cylinder(0.2, 0.32, 0x8a5a2e, 8), 0, 0, 0));
  bucket.add(at(cylinder(0.215, 0.05, 0x4a4a4a, 8, { metalness: 0.5 }), 0, 0.1, 0));
  bucket.add(at(cylinder(0.215, 0.05, 0x4a4a4a, 8, { metalness: 0.5 }), 0, -0.1, 0));
  bucket.add(at(box(0.44, 0.03, 0.03, 0x4a4a4a), 0, 0.2, 0));
  pivot.add(bucket);
  g.add(pivot);
  return { group: g, pivot };
}

/** Swaying banner hanging from a pole bracket. Returns the pivot. */
function banner(colorA, colorB) {
  const pivot = new THREE.Group();
  pivot.add(at(box(0.6, 0.05, 0.05, 0x3a2a1a), 0, 0.02, 0));
  pivot.add(at(box(0.5, 1.3, 0.04, colorA), 0, -0.68, 0));
  pivot.add(at(box(0.5, 0.42, 0.045, colorB), 0, -0.45, 0));
  for (const sx of [-1, 1]) pivot.add(at(box(0.16, 0.2, 0.04, colorA), sx * 0.16, -1.4, 0));
  return pivot;
}

/** Parchment banner hanging from a wooden stand (crossbar + two posts), framing BOARD. */
function parchmentStand(boardTexture) {
  const g = new THREE.Group();
  const B = BOARD;
  g.add(at(box(B.w + 0.2, B.h + 0.2, 0.08, 0xe9dcb5), B.x, B.y, B.z - 0.01)); // parchment edge behind the screen
  for (const sy of [-1, 1]) g.add(at(cylinder(0.09, B.w + 0.5, 0xc9b27f, 8), B.x, B.y + sy * (B.h / 2 + 0.12), B.z + 0.02).rotateZ(Math.PI / 2));
  for (const sx of [-1, 1]) g.add(at(box(0.16, B.y + B.h / 2 + 0.5, 0.16, WOOD), B.x + sx * (B.w / 2 + 0.4), (B.y + B.h / 2 + 0.5) / 2, B.z - 0.05));
  g.add(at(box(B.w + 1.1, 0.16, 0.18, WOOD), B.x, B.y + B.h / 2 + 0.42, B.z - 0.05));
  for (const sx of [-1, 1]) g.add(at(box(0.03, 0.3, 0.03, 0xd8c39a), B.x + sx * (B.w / 2 - 0.1), B.y + B.h / 2 + 0.27, B.z));
  g.add(boardScreen(boardTexture));
  return g;
}

function build({ boardTexture }) {
  const set = new THREE.Group();
  const floor = at(box(40, 0.2, 40, 0xffffff, { map: pavingTexture() }), 0, -0.1, -4);
  floor.castShadow = false;
  set.add(floor);
  set.add(backdrop(skyTexture(), 80, 40, 0, 6, -28));

  const gh = ghirlandina(); gh.position.set(3.6, 0, -10); set.add(gh);
  for (const [x, z, w, h, c, s] of [[-4.3, -7, 1.6, 8.5, BRICK, 3], [-7.0, -9, 1.8, 10.5, BRICK_DARK, 5], [7.2, -8, 1.5, 7.5, BRICK, 7], [-1.6, -13, 1.4, 9.5, 0xb06048, 9]]) {
    const tw = tower(w, h, c, s); tw.position.set(x, 0, z); set.add(tw);
  }
  // low arcaded buildings around the piazza
  for (const [x, z, w, c] of [[-4.6, -4.2, 3.4, 0xd59a6a], [4.8, -4.6, 3.6, 0xe0b07a]]) {
    const b = at(new THREE.Group(), x, 0, z);
    b.add(at(box(w, 3.6, 1.6, c), 0, 1.8, -0.4));
    b.add(at(box(w + 0.2, 0.2, 1.9, 0x9a4a32), 0, 3.7, -0.3));
    for (let i = 0; i < 3; i++) b.add(at(box(0.6, 1.5, 0.06, 0x3a2620), -w / 3 + i * (w / 3), 0.75, 0.42));
    set.add(b);
  }
  const wl = well(); wl.group.position.set(3.0, 0, -1.6); set.add(wl.group);
  set.add(parchmentStand(boardTexture));

  const banners = [[-4.7, 3.2, -3.3, YEL, BLU], [-6.6, 3.2, -3.3, BLU, YEL], [4.7, 3.2, -3.7, YEL, BLU], [6.6, 3.2, -3.7, BLU, YEL]].map(([x, y, z, a, b]) => {
    const p = banner(a, b); p.position.set(x, y, z); set.add(p); return p;
  });

  const pigeon = createPigeon(); set.add(pigeon.group);

  set.add(new THREE.HemisphereLight(0xe8f0ff, 0x9a7a5a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.3);
  sun.position.set(6, 10, 6);
  sun.target.position.set(0, 0, -2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0006;
  set.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xffe8d0, 0.6);
  fill.position.set(-4, 3, 6);
  set.add(fill);

  function update(t) {
    wl.pivot.rotation.z = Math.sin(t * 1.6) * 0.12;
    wl.pivot.rotation.x = Math.sin(t * 1.1 + 1) * 0.05;
    banners.forEach((b, i) => { b.rotation.x = Math.sin(t * 1.8 + i) * 0.12; b.rotation.z = Math.sin(t * 1.3 + i * 2) * 0.05; });
    const w = walkPath(t, -3.4, 2.2, 0.35, 0.8);
    pigeon.group.position.set(w.x, 0, -1.2);
    pigeon.group.rotation.y = w.dir > 0 ? 0 : Math.PI;
    pigeon.update(t, { peck: 0.5 });
  }
  update(0);
  return { group: set, update, background: 0x4f8fd8, fog: [0xd8d0c0, 24, 55], exposure: 1.1, boardStyle: 'wood' };
}

export default { name: 'medieval_italy', build };
