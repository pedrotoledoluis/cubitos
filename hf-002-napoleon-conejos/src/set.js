import * as THREE from 'three';
import { box, at, mat } from './characters/util.js';

// Night office set: back wall with a big window onto a lit city skyline, desk, lamp, shelf, plant.
// Episode 2: window shifted left to make room for a wall-mounted chalkboard screen right of Profe.

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function skylineTexture() {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0b1230');
  sky.addColorStop(0.6, '#1d2a5a');
  sky.addColorStop(1, '#3a3a6a');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const rnd = mulberry32(42);
  // stars
  g.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 120; i++) g.fillRect(rnd() * W, rnd() * H * 0.4, 2, 2);
  // moon
  g.fillStyle = '#f4efd2'; g.fillRect(1600, 120, 90, 90);
  // two layers of buildings
  for (const layer of [{ shade: '#141a35', min: 250, max: 600, lit: 0.25 }, { shade: '#0a0e22', min: 150, max: 450, lit: 0.45 }]) {
    let x = -20;
    while (x < W) {
      const w = 90 + rnd() * 160;
      const h = layer.min + rnd() * (layer.max - layer.min);
      g.fillStyle = layer.shade;
      g.fillRect(x, H - h, w, h);
      for (let wy = H - h + 18; wy < H - 20; wy += 30) {
        for (let wx = x + 12; wx < x + w - 18; wx += 24) {
          if (rnd() < layer.lit) {
            g.fillStyle = rnd() < 0.8 ? '#ffd27a' : '#bfe3ff';
            g.fillRect(wx, wy, 12, 16);
          }
        }
      }
      x += w + 4 + rnd() * 20;
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSet(scene) {
  const set = new THREE.Group();
  scene.add(set);

  const WALL = 0x3b4a6b;
  const WALL_Z = -3.2;

  // floor
  const floor = at(box(14, 0.2, 10, 0x6b4a34), 0, -0.1, 0);
  floor.castShadow = false;
  set.add(floor);
  // rug
  const rug = at(box(4.6, 0.02, 2.6, 0x7a2f3a), 0, 0.01, 0.2);
  rug.castShadow = false;
  set.add(rug);

  // back wall with a window opening (x -2.4..2.4, y 1.2..4.2)
  const wl = { x0: -2.9, x1: 1.1, y0: 1.2, y1: 4.4 };
  const T = 0.3;
  const addWall = (x0, x1, y0, y1) => {
    const w = at(box(x1 - x0, y1 - y0, T, WALL), (x0 + x1) / 2, (y0 + y1) / 2, WALL_Z);
    w.castShadow = false;
    set.add(w);
  };
  addWall(-7, wl.x0, 0, 7);
  addWall(wl.x1, 7, 0, 7);
  addWall(wl.x0, wl.x1, 0, wl.y0);
  addWall(wl.x0, wl.x1, wl.y1, 7);
  // side walls
  for (const sx of [-1, 1]) {
    const side = at(box(T, 7, 10, 0x34425f), sx * 6, 3.5, 1.8);
    side.castShadow = false;
    set.add(side);
  }
  // window frame + mullions
  const FRAME = 0xe8e2d4;
  const frameParts = [
    [wl.x1 - wl.x0 + 0.2, 0.18, 0, wl.y0],
    [wl.x1 - wl.x0 + 0.2, 0.14, 0, wl.y1],
    [0.14, wl.y1 - wl.y0, wl.x0, (wl.y0 + wl.y1) / 2],
    [0.14, wl.y1 - wl.y0, wl.x1, (wl.y0 + wl.y1) / 2],
    [0.08, wl.y1 - wl.y0, (wl.x0 + wl.x1) / 2, (wl.y0 + wl.y1) / 2],
    [wl.x1 - wl.x0, 0.08, (wl.x0 + wl.x1) / 2, (wl.y0 + wl.y1) / 2 + 0.3],
  ];
  const wcx = (wl.x0 + wl.x1) / 2;
  for (const [w, h, x, y] of frameParts) set.add(at(box(w, h, 0.36, FRAME), x === 0 ? wcx : x, y, WALL_Z + 0.05));

  // wall-mounted chalkboard screen: wooden frame, chalk tray, canvas-textured surface (self-lit)
  const B = { x: 2.85, y: 2.95, w: 2.5, h: 1.75, z: WALL_Z + 0.2 };
  set.add(at(box(B.w + 0.22, B.h + 0.22, 0.14, 0x4a2c18), B.x, B.y, B.z));
  set.add(at(box(B.w + 0.1, 0.07, 0.22, 0x5a3a24), B.x, B.y - B.h / 2 - 0.12, B.z + 0.1));
  set.add(at(box(0.16, 0.04, 0.05, 0xf4f1e6), B.x - 0.6, B.y - B.h / 2 - 0.07, B.z + 0.12));
  set.add(at(box(0.18, 0.08, 0.1, 0xc9b28a), B.x + 0.7, B.y - B.h / 2 - 0.06, B.z + 0.12));
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 1280; boardCanvas.height = Math.round(1280 * B.h / B.w);
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  boardTex.anisotropy = 4;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(B.w, B.h), new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false }));
  screen.position.set(B.x, B.y, B.z + 0.075);
  set.add(screen);

  // skyline backdrop (unlit, self-illuminated)
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(26, 13), new THREE.MeshBasicMaterial({ map: skylineTexture() }));
  sky.position.set(0, 3.2, -11);
  set.add(sky);

  // desk behind the characters with lamp, books, monitor
  const DESK = 0x5a3a24;
  const deskZ = -2.2;
  set.add(at(box(3.2, 0.12, 1.1, DESK), 1.6, 1.05, deskZ));
  set.add(at(box(0.12, 1.0, 1.0, DESK), 0.1, 0.5, deskZ));
  set.add(at(box(0.12, 1.0, 1.0, DESK), 3.1, 0.5, deskZ));
  // books
  const bookColors = [0xc8553d, 0x2e86ab, 0xf6ae2d, 0x6a994e];
  bookColors.forEach((c, i) => set.add(at(box(0.14, 0.42 - i * 0.04, 0.32, c), 2.4 + i * 0.16, 1.11 + (0.42 - i * 0.04) / 2, deskZ)));
  // lamp
  const lamp = new THREE.Group();
  lamp.position.set(0.8, 1.11, deskZ + 0.1);
  lamp.add(at(box(0.36, 0.06, 0.3, 0x222222), 0, 0.03, 0));
  lamp.add(at(box(0.05, 0.6, 0.05, 0x222222), 0, 0.33, 0));
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.26, 6, 1, true), mat(0x2b6e4f, { side: THREE.DoubleSide }));
  shade.position.set(0, 0.66, 0);
  lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: 0xfff1c4 }));
  bulb.position.set(0, 0.56, 0);
  lamp.add(bulb);
  set.add(lamp);

  // shelf on the left with plant
  set.add(at(box(1.4, 2.4, 0.6, 0x4a3020), -3.6, 1.2, -2.7));
  for (let i = 0; i < 3; i++) {
    set.add(at(box(1.3, 0.06, 0.55, 0x6b4a34), -3.6, 0.6 + i * 0.7, -2.6));
    for (let j = 0; j < 4; j++) {
      const c = bookColors[(i + j) % 4];
      set.add(at(box(0.16, 0.45, 0.4, c), -4.05 + j * 0.2 + i * 0.05, 0.86 + i * 0.7, -2.6));
    }
  }
  set.add(at(box(0.5, 0.5, 0.5, 0xb5651d), 3.9, 0.25, -2.4));
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 4), mat(0x3f8f4a));
    leaf.position.set(3.9 + Math.sin(i * 1.3) * 0.15, 0.85, -2.4 + Math.cos(i * 1.3) * 0.15);
    leaf.rotation.set(Math.cos(i * 2) * 0.35, 0, Math.sin(i * 2) * 0.35);
    leaf.castShadow = true;
    set.add(leaf);
  }

  // --- lighting ---
  scene.background = new THREE.Color(0x0d1226);
  scene.fog = new THREE.Fog(0x0d1226, 16, 30);
  scene.add(new THREE.HemisphereLight(0x8fa6e0, 0x2a1a10, 0.75));

  // warm lamp light, with soft shadows
  const warm = new THREE.SpotLight(0xffc27a, 60, 18, Math.PI / 3.2, 0.7, 1.4);
  warm.position.set(1.8, 4.2, 3.2);
  warm.target.position.set(0, 0.8, 0);
  warm.castShadow = true;
  warm.shadow.mapSize.set(2048, 2048);
  warm.shadow.radius = 6;
  warm.shadow.bias = -0.0005;
  scene.add(warm, warm.target);

  const lampGlow = new THREE.PointLight(0xffb060, 8, 5, 1.6);
  lampGlow.position.set(0.8, 1.6, deskZ + 0.4);
  scene.add(lampGlow);

  // cool moonlight from the window, rim on characters
  const moon = new THREE.DirectionalLight(0x7da2ff, 1.1);
  moon.position.set(-2, 5, -8);
  scene.add(moon);

  // soft front fill
  const fill = new THREE.DirectionalLight(0xffe4c8, 0.9);
  fill.position.set(-3, 3, 6);
  scene.add(fill);

  return { set, board: { canvas: boardCanvas, texture: boardTex, center: new THREE.Vector3(B.x, B.y, B.z) } };
}
