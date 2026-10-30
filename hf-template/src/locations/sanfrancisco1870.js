import * as THREE from 'three';
import {
  BOARD, boardScreen, box, at, mat, rng, canvasTexture, backdrop, ownMat, createPigeon, flicker, walkPath,
} from './common.js';

// San Francisco, ~1870, at dusk: wooden Victorian facades stepping up a hilly street, gas street lamps that
// flicker, a newspaper stand, a waving flag, a pigeon, and the bay in the distance.
// 2D graphics show on a newspaper billboard ("¡EXTRA!") at BOARD.

function skyTexture() {
  return canvasTexture(2048, 1024, (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.62);
    sky.addColorStop(0, '#22244f'); sky.addColorStop(0.55, '#7a4a7a'); sky.addColorStop(1, '#f39a5a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.62);
    // hills across the bay
    g.fillStyle = '#4a3558';
    g.beginPath(); g.moveTo(0, H * 0.62); g.lineTo(0, 540); g.lineTo(380, 500); g.lineTo(700, 560); g.lineTo(1100, 490); g.lineTo(1500, 560);
    g.lineTo(1800, 520); g.lineTo(W, 560); g.lineTo(W, H * 0.62); g.fill();
    // bay water with light streaks
    const sea = g.createLinearGradient(0, H * 0.62, 0, H);
    sea.addColorStop(0, '#d98a6a'); sea.addColorStop(0.15, '#3f5f8f'); sea.addColorStop(1, '#203a62');
    g.fillStyle = sea; g.fillRect(0, H * 0.62, W, H * 0.38);
    const r = rng(17);
    g.fillStyle = 'rgba(255,200,150,0.35)';
    for (let i = 0; i < 40; i++) g.fillRect(r() * W, H * 0.64 + r() * H * 0.3, 30 + r() * 90, 3);
    // sailing ships (silhouettes)
    g.fillStyle = '#1a1830';
    for (const [x, s] of [[520, 1], [1250, 0.8], [1650, 0.6]]) {
      g.fillRect(x - 60 * s, 640, 120 * s, 18 * s);
      g.fillRect(x - 3 * s, 640 - 110 * s, 6 * s, 110 * s);
      g.fillRect(x + 30 * s, 640 - 80 * s, 5 * s, 80 * s);
      g.fillStyle = '#e9dcc0'; g.fillRect(x + 4 * s, 640 - 100 * s, 30 * s, 50 * s); g.fillStyle = '#1a1830';
    }
    g.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 60; i++) g.fillRect(r() * W, r() * 250, 2, 2);
  });
}

function cobbleTexture() {
  const tex = canvasTexture(512, 512, (g, W, H) => {
    g.fillStyle = '#4c4642'; g.fillRect(0, 0, W, H);
    const r = rng(23);
    for (let y = 0; y < H; y += 32) for (let x = (y / 32) % 2 ? -24 : 0; x < W; x += 48) {
      const c = 90 + r() * 40;
      g.fillStyle = `rgb(${c},${c - 8},${c - 14})`;
      g.fillRect(x + 3, y + 3, 42, 26);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  return tex;
}

const LIT = 0xffd27a;
const litMat = () => mat(LIT, { emissive: 0xffb04a, emissiveIntensity: 0.9, rim: 0 });

/** Victorian row house: body, bay window, cornice, lit windows, stoop and door. Facade at z = 0. */
function house(w, h, color, trim, seed) {
  const g = new THREE.Group();
  const r = rng(seed);
  g.add(at(box(w, h, 2.4, color), 0, h / 2, -1.2));
  g.add(at(box(w + 0.2, 0.3, 0.3, trim), 0, h + 0.15, 0.05)); // cornice
  for (let i = 0; i < Math.floor(w / 0.35); i++) g.add(at(box(0.1, 0.18, 0.12, trim), -w / 2 + 0.2 + i * 0.35, h - 0.08, 0.12));
  // bay window on the upper floor
  const bay = at(new THREE.Group(), -w * 0.2, h * 0.62, 0.3);
  bay.add(box(w * 0.42, h * 0.3, 0.6, color));
  bay.add(at(box(w * 0.32, h * 0.2, 0.05, r() < 0.7 ? LIT : 0x2a3350, r() < 0.7 ? { emissive: 0xffb04a, emissiveIntensity: 0.9, rim: 0 } : {}), 0, 0, 0.31));
  bay.add(at(box(w * 0.46, 0.1, 0.66, trim), 0, h * 0.15 + 0.05, 0));
  g.add(bay);
  // other windows
  for (const [x, y] of [[w * 0.28, h * 0.62], [w * 0.28, h * 0.3], [-w * 0.2, h * 0.3]]) {
    const on = r() < 0.6;
    g.add(at(box(0.5, 0.75, 0.06, trim), x, y, 0.02));
    g.add(at(box(0.38, 0.62, 0.05, on ? LIT : 0x2a3350, on ? { emissive: 0xffb04a, emissiveIntensity: 0.9, rim: 0 } : {}), x, y, 0.05));
  }
  g.add(at(box(0.5, 0.9, 0.06, 0x3a2414), w * 0.28 + 0.6 > w / 2 ? -w * 0.42 : w * 0.28 + 0.6, 0.45, 0.04));
  return g;
}

function gasLamp() {
  const g = new THREE.Group();
  g.add(at(box(0.3, 0.2, 0.3, 0x1f2a24), 0, 0.1, 0));
  g.add(at(box(0.09, 2.6, 0.09, 0x1f2a24), 0, 1.4, 0));
  g.add(at(box(0.36, 0.06, 0.36, 0x1f2a24), 0, 2.72, 0));
  const glassMat = ownMat(0xfff0b0, { emissive: 0xffc860, emissiveIntensity: 1.6 });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.28), glassMat);
  glass.position.y = 2.95;
  g.add(glass);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.22, 4), mat(0x1f2a24));
  cap.position.y = 3.25; cap.rotation.y = Math.PI / 4;
  g.add(cap);
  const light = new THREE.PointLight(0xffc070, 6, 6, 1.6);
  light.position.y = 2.9;
  g.add(light);
  return { group: g, glassMat, light };
}

function newsStand() {
  const g = new THREE.Group();
  g.add(at(box(1.2, 1.1, 0.7, 0x2f5a3a), 0, 0.55, 0));
  g.add(at(box(1.4, 0.08, 0.9, 0x7a2a22), 0, 1.75, 0.05));
  for (const sx of [-1, 1]) g.add(at(box(0.07, 0.7, 0.07, 0x2f5a3a), sx * 0.55, 1.4, 0.3));
  for (let i = 0; i < 3; i++) g.add(at(box(0.32, 0.1 + i * 0.03, 0.42, 0xf1ead8), -0.38 + i * 0.38, 1.15 + i * 0.015, 0.05));
  const sign = canvasTexture(256, 64, (c, W, H) => {
    c.fillStyle = '#f1ead8'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#1a1a1a'; c.font = '900 40px "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('DIARIOS', W / 2, H / 2 + 2);
  });
  g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), new THREE.MeshBasicMaterial({ map: sign })), 0, 0.75, 0.36));
  return g;
}

/** Newspaper billboard framing BOARD: painted wood frame with brass corners and an "¡EXTRA!" header. */
function billboard(boardTexture) {
  const g = new THREE.Group();
  const B = BOARD;
  g.add(at(box(B.w + 0.3, B.h + 0.3, 0.16, 0x23413a), B.x, B.y, B.z - 0.04)); // front face stays behind the screen
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.add(at(box(0.16, 0.16, 0.06, 0xd9a93a, { metalness: 0.4 }), B.x + sx * (B.w / 2 + 0.07), B.y + sy * (B.h / 2 + 0.07), B.z + 0.09));
  for (const sx of [-1, 1]) g.add(at(box(0.16, B.y, 0.16, 0x23413a), B.x + sx * (B.w / 2 - 0.2), B.y / 2, B.z - 0.06));
  const header = canvasTexture(512, 96, (c, W, H) => {
    c.fillStyle = '#f1ead8'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#b3261e'; c.font = '900 64px "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('¡EXTRA!', W / 2, H / 2 + 4);
  });
  g.add(at(box(1.5, 0.34, 0.1, 0x23413a), B.x, B.y + B.h / 2 + 0.3, B.z));
  g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.26), new THREE.MeshBasicMaterial({ map: header, toneMapped: false })), B.x, B.y + B.h / 2 + 0.3, B.z + 0.06));
  g.add(boardScreen(boardTexture));
  return g;
}

function build({ boardTexture }) {
  const set = new THREE.Group();
  const floor = at(box(40, 0.2, 14, 0xffffff, { map: cobbleTexture() }), 0, -0.1, 1);
  floor.castShadow = false;
  set.add(floor);
  // the street drops down toward the bay behind the billboard
  const slope = at(box(6, 0.2, 14, 0x5a524c), 0.1, -1.6, -12.5);
  slope.rotation.x = -0.24;
  set.add(slope);
  set.add(at(box(40, 0.2, 2, 0x8a8178), 0, 0.02, -4.4)); // sidewalk
  set.add(backdrop(skyTexture(), 80, 40, 0, 2.5, -30));

  // left row climbs the hill, right row steps down
  const HOUSES = [
    [-2.85, 0.0, 2.2, 5.4, 0xc96f5a, 0xf1e6cc, -5.0],
    [-5.15, 0.6, 2.3, 5.8, 0x6f9c8a, 0xf1e6cc, -5.4],
    [-7.5, 1.2, 2.4, 6.0, 0xd9b45a, 0x6a3a2a, -5.8],
    [2.75, 0.0, 2.1, 5.2, 0x8a6fa8, 0xf1e6cc, -5.0],
    [4.95, -0.4, 2.3, 5.6, 0xd98a5a, 0x2f4a6a, -5.3],
    [7.3, -0.8, 2.4, 5.4, 0x5f86b0, 0xf1e6cc, -5.6],
    [-2.0, -2.6, 1.6, 3.4, 0xb07a5a, 0xf1e6cc, -12],
    [2.2, -2.9, 1.6, 3.6, 0x7a9c6a, 0xf1e6cc, -13],
  ];
  HOUSES.forEach(([x, y, w, h, c, trim, z], i) => {
    const hs = house(w, h, c, trim, 31 + i);
    hs.position.set(x, y, z);
    set.add(hs);
    if (y > 0) set.add(at(box(w, y + 0.2, 2.4, 0x7a6a5a), x, (y - 0.2) / 2, z - 1.2)); // foundation on the hill
  });

  const lamps = [gasLamp(), gasLamp()];
  lamps[0].group.position.set(-2.4, 0, -1.4);
  lamps[1].group.position.set(2.5, 0, -2.2);
  lamps.forEach((l) => set.add(l.group));

  const stand = newsStand(); stand.position.set(3.2, 0, -3.3); stand.rotation.y = -0.35; set.add(stand);
  set.add(billboard(boardTexture));

  // flag on a pole from the left house, waving in segments
  const flagPivot = at(new THREE.Group(), -2.2, 4.4, -4.7);
  flagPivot.add(at(box(0.06, 0.06, 0.06, 0x333333), 0, 0, 0));
  const pole = at(box(1.2, 0.05, 0.05, 0xdddddd), 0.6, 0, 0);
  pole.rotation.z = 0.5;
  flagPivot.add(pole);
  const flagSegs = [];
  const flagRoot = at(new THREE.Group(), 1.05, 0.5, 0);
  let parent = flagRoot;
  for (let i = 0; i < 4; i++) {
    const seg = at(new THREE.Group(), i === 0 ? 0 : 0.22, 0, 0);
    seg.add(at(box(0.22, 0.5, 0.02, i % 2 ? 0xf1ead8 : 0xb3261e), 0.11, -0.25, 0));
    if (i === 0) seg.add(at(box(0.22, 0.25, 0.03, 0x2a3f8a), 0.11, -0.125, 0));
    parent.add(seg); parent = seg; flagSegs.push(seg);
  }
  flagPivot.add(flagRoot);
  set.add(flagPivot);

  const pigeon = createPigeon(); set.add(pigeon.group);

  // dusk light: warm low sun from behind-right, cool sky fill
  set.add(new THREE.HemisphereLight(0xffc8a0, 0x302040, 0.85));
  const sun = new THREE.DirectionalLight(0xffa060, 1.6);
  sun.position.set(6, 6, -4);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0006;
  set.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xb8c8ff, 1.4);
  fill.position.set(-3, 4, 7);
  set.add(fill);

  function update(t) {
    lamps.forEach((l, i) => {
      const f = flicker(t, i * 5);
      l.glassMat.emissiveIntensity = 1.6 * f;
      l.light.intensity = 6 * f;
    });
    flagSegs.forEach((s, i) => { s.rotation.y = Math.sin(t * 3.2 - i * 0.9) * 0.35; });
    const w = walkPath(t, -3.6, 3.6, 0.4, 1.0);
    pigeon.group.position.set(w.x, 0, -1.0);
    pigeon.group.rotation.y = w.dir > 0 ? 0 : Math.PI;
    pigeon.update(t, { peck: 0.4 });
  }
  update(0);
  return { group: set, update, background: 0x22244f, fog: [0x4a3a5a, 22, 50], exposure: 1.1, boardStyle: 'poster' };
}

export default { name: 'sanfrancisco1870', build };
