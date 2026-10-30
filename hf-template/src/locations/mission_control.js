import * as THREE from 'three';
import { BOARD, boardScreen, box, at, rng, canvasTexture, ownMat } from './common.js';

// Mission control (NASA, 1999): dark room with rows of consoles and glowing monitors, a big wall screen
// showing Mars with an orbit line (the board surface is the center panel of that wall at BOARD),
// blinking status lights.

function wallTexture() {
  return canvasTexture(1024, 512, (g, W, H) => {
    g.fillStyle = '#141a26'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1b2333';
    for (let x = 0; x < W; x += 64) g.fillRect(x, 0, 3, H);
  });
}

/** Side wall screen: Mars disc with an orbit ellipse and a trajectory line. */
function marsTexture() {
  return canvasTexture(512, 360, (g, W, H) => {
    g.fillStyle = '#04101c'; g.fillRect(0, 0, W, H);
    const r = rng(5);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`; g.fillRect(r() * W, r() * H, 2, 2); }
    const m = g.createRadialGradient(W / 2 - 20, H / 2 - 20, 10, W / 2, H / 2, 90);
    m.addColorStop(0, '#f08a4a'); m.addColorStop(1, '#8a3418');
    g.fillStyle = m; g.beginPath(); g.arc(W / 2, H / 2, 90, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#7ef0ff'; g.lineWidth = 3; g.setLineDash([10, 8]);
    g.beginPath(); g.ellipse(W / 2, H / 2, 170, 60, -0.2, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = '#ffd23a'; g.beginPath(); g.moveTo(20, 40); g.quadraticCurveTo(200, 60, W / 2 - 160, H / 2 + 20); g.stroke();
  });
}

function monitorTexture(seed) {
  return canvasTexture(128, 96, (g, W, H) => {
    g.fillStyle = '#062014'; g.fillRect(0, 0, W, H);
    const r = rng(seed);
    g.fillStyle = '#5dff9a';
    for (let y = 8; y < H - 4; y += 10) g.fillRect(6, y, 20 + r() * 90, 4);
    if (seed % 2) { g.strokeStyle = '#ffd23a'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 80); for (let x = 6; x < W; x += 8) g.lineTo(x, 50 + Math.sin(x * 0.15 + seed) * 20); g.stroke(); }
  });
}

/** One row of consoles: desk, sloped panels, monitors, blinking lights. Returns blinking materials. */
function consoleRow(z, n, width, seedBase) {
  const g = new THREE.Group();
  const blink = [];
  for (let i = 0; i < n; i++) {
    const x = -width / 2 + (i + 0.5) * (width / n);
    g.add(at(box(width / n - 0.08, 0.9, 0.9, 0x3b4252), x, 0.45, z));
    g.add(at(box(width / n - 0.08, 0.08, 1.0, 0x5a6275), x, 0.92, z + 0.02));
    const mon = at(box(0.9, 0.7, 0.5, 0x262a33), x, 1.35, z - 0.15);
    g.add(mon);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.56), new THREE.MeshBasicMaterial({ map: monitorTexture(seedBase + i), toneMapped: false }));
    scr.position.set(x, 1.35, z + 0.105);
    g.add(scr);
    for (let k = 0; k < 3; k++) {
      const m = ownMat([0xff4040, 0x40ff80, 0xffd23a][k], { emissive: [0xff2020, 0x20ff60, 0xffb000][k], emissiveIntensity: 1 });
      g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.07), m), x - 0.25 + k * 0.12, 0.98, z + 0.35));
      blink.push(m);
    }
  }
  return { group: g, blink };
}

function build({ boardTexture }) {
  const set = new THREE.Group();
  const floor = at(box(40, 0.2, 40, 0x2a2f3a), 0, -0.1, -4);
  floor.castShadow = false; floor.receiveShadow = true;
  set.add(floor);
  // back wall with the big screen
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.9 }));
  wall.position.set(0, 6, -6.5);
  set.add(wall);
  // big wall screen frame (board surface in the middle, Mars panels on both sides)
  const B = BOARD;
  set.add(at(box(B.w + 0.3, B.h + 0.3, 0.12, 0x101318), B.x, B.y, B.z - 0.02));
  set.add(boardScreen(boardTexture));
  const marsMat = new THREE.MeshBasicMaterial({ map: marsTexture(), toneMapped: false });
  const side = [];
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), marsMat);
    m.position.set(B.x + sx * 4.2, 4.2, -5.9);
    m.rotation.y = -sx * 0.25;
    set.add(m);
    side.push(m);
    set.add(at(box(3.6, 2.6, 0.1, 0x101318), B.x + sx * 4.2, 4.2, -5.98).rotateY(-sx * 0.25));
  }
  // console rows behind the characters (keep x -2.2..1.9, z -0.6..0.9 clear)
  const rows = [consoleRow(-1.8, 6, 11, 1), consoleRow(-4.3, 7, 13, 20)];
  rows[1].group.position.y = 0.35; // tiered back row
  for (const r of rows) set.add(r.group);
  const blink = rows.flatMap((r) => r.blink);

  set.add(new THREE.HemisphereLight(0x9ab8ff, 0x202430, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-4, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  key.shadow.bias = -0.0006;
  set.add(key);
  const fill = new THREE.DirectionalLight(0xbfe3ff, 0.9);
  fill.position.set(4, 3, 7);
  set.add(fill);
  const screenGlow = new THREE.PointLight(0x6fb8ff, 6, 9, 1.5);
  screenGlow.position.set(0, 3.5, -2);
  set.add(screenGlow);

  function update(t) {
    blink.forEach((m, i) => { m.emissiveIntensity = ((Math.floor(t * (1.5 + (i % 5) * 0.4) + i * 0.37) % 2) ? 1.4 : 0.15); });
    side.forEach((m, i) => { m.material.color.setScalar(0.85 + 0.15 * Math.sin(t * 2 + i)); });
    screenGlow.intensity = 6 + Math.sin(t * 1.7) * 0.8;
  }
  update(0);
  return { group: set, update, background: 0x0c1018, fog: [0x0c1018, 18, 40], exposure: 1.2, boardStyle: 'screen' };
}

export default { name: 'mission_control', build };
