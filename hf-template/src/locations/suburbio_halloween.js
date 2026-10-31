import * as THREE from 'three';
import { box, at, rng, ownMat, flicker } from './common.js';
import { makeLocation, glow, blinkers } from './modern.js';

// US suburban street on Halloween night (028): painted row of gabled houses with lit windows, string lights,
// porch pumpkins and a full moon; 3D jack-o'-lanterns, foam gravestones, a giant yard skeleton and an orange
// string-light fence. The board is a projector-style screen. Character area (x -2.2..1.9, z -0.6..0.9) stays clear.

function paintSky(g, W, H) {
  const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, '#0a0620'); sky.addColorStop(1, '#3a1a4a');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // moon with halo
  const halo = g.createRadialGradient(1560, 210, 40, 1560, 210, 240);
  halo.addColorStop(0, 'rgba(255,240,200,0.55)'); halo.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = halo; g.fillRect(1300, 0, 520, 480);
  g.fillStyle = '#fff2c8'; g.beginPath(); g.arc(1560, 210, 92, 0, Math.PI * 2); g.fill();
  const r = rng(28);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.5})`; g.fillRect(r() * W, r() * H * 0.4, 3, 3); }
  // bare trees behind the houses
  g.strokeStyle = '#140a1c'; g.lineCap = 'round';
  for (const tx of [130, 760, 1380, 1930]) {
    g.lineWidth = 22; g.beginPath(); g.moveTo(tx, H * 0.78); g.lineTo(tx, H * 0.36); g.stroke();
    g.lineWidth = 9;
    for (let b = 0; b < 5; b++) { const y = H * (0.42 + b * 0.06), dir = b % 2 ? 1 : -1; g.beginPath(); g.moveTo(tx, y); g.lineTo(tx + dir * (70 + b * 12), y - 70); g.stroke(); }
  }
  // gabled houses: walls, roofs, warm windows, string lights on the roof line, porch pumpkins
  const walls = ['#2c2238', '#3a2a2a', '#22283a', '#34243a', '#2a2a30'];
  const lights = ['#ff8a1a', '#b05aff', '#7aff6a', '#ff4a3a'];
  for (let i = 0; i < 6; i++) {
    const x = i * 360 - 40, w = 300, h = 210 + (i % 2) * 40, base = H * 0.8, top = base - h;
    g.fillStyle = walls[i % walls.length]; g.fillRect(x, top, w, h);
    g.fillStyle = '#120c18'; g.beginPath(); g.moveTo(x - 24, top); g.lineTo(x + w / 2, top - 130); g.lineTo(x + w + 24, top); g.closePath(); g.fill();
    for (const [wx, wy] of [[x + 40, top + 50], [x + w - 100, top + 50], [x + w / 2 - 30, top - 70]]) {
      g.fillStyle = r() < 0.75 ? '#ffc65a' : '#ff8a3a'; g.fillRect(wx, wy, 60, 64);
      g.fillStyle = '#120c18'; g.fillRect(wx + 27, wy, 6, 64); g.fillRect(wx, wy + 29, 60, 6);
    }
    g.fillStyle = '#1a1014'; g.fillRect(x + w / 2 - 34, base - 110, 68, 110); // door
    for (let k = 0; k <= 14; k++) { // string lights along the roof
      const t = k / 14, px = x - 24 + t * (w + 48), py = top - 130 * (1 - Math.abs(t * 2 - 1));
      g.fillStyle = lights[(k + i) % lights.length]; g.beginPath(); g.arc(px, py + 6, 7, 0, Math.PI * 2); g.fill();
    }
    for (const px of [x + 18, x + w - 52]) { // porch pumpkins
      g.fillStyle = '#ff7a1a'; g.beginPath(); g.ellipse(px + 17, base - 18, 22, 18, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe07a'; g.fillRect(px + 8, base - 24, 6, 6); g.fillRect(px + 20, base - 24, 6, 6);
    }
    if (i % 2 === 0) { // cobweb in a corner
      g.strokeStyle = 'rgba(230,230,240,0.35)'; g.lineWidth = 2;
      for (let s = 0; s < 5; s++) { g.beginPath(); g.moveTo(x, top); g.lineTo(x + Math.cos(s * 0.39) * 90, top + Math.sin(s * 0.39) * 90); g.stroke(); }
    }
  }
  // lawn + sidewalk
  g.fillStyle = '#16201a'; g.fillRect(0, H * 0.8, W, H * 0.2);
  g.fillStyle = '#2a2a30'; g.fillRect(0, H * 0.9, W, H * 0.1);
}

/** Box-built jack-o'-lantern with a glowing face; returns its face material for the flicker. */
function jackOLantern(set, x, z, s = 1) {
  const g = new THREE.Group();
  g.add(at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), ownMat(0xff7a1a, { emissive: 0xff4a00, emissiveIntensity: 0.25, flatShading: true })), 0, 0.38, 0));
  g.add(at(box(0.08, 0.16, 0.08, 0x3a7a2a), 0, 0.84, 0));
  const face = glow(0xffd060, 1.6);
  for (const ex of [-0.14, 0.14]) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.05), face), ex, 0.48, 0.39));
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.05), face), 0, 0.28, 0.4));
  g.scale.setScalar(s); g.position.set(x, 0, z); set.add(g);
  return face;
}

/** Foam gravestone. */
function gravestone(set, x, z, rot = 0) {
  const g = new THREE.Group();
  g.add(at(box(0.55, 0.7, 0.14, 0x7a7a86), 0, 0.35, 0));
  const cap = at(new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.14, 12), ownMat(0x7a7a86)), 0, 0.7, 0);
  cap.rotation.x = Math.PI / 2; g.add(cap); // round top (lower half hidden inside the slab)
  g.add(at(box(0.3, 0.05, 0.02, 0x3a3a44), 0, 0.5, 0.08));
  g.add(at(box(0.05, 0.22, 0.02, 0x3a3a44), 0, 0.5, 0.08));
  g.position.set(x, 0, z); g.rotation.y = rot; set.add(g);
}

/** Giant yard skeleton (~2.6 tall) with a slowly waving arm; returns the update fn. */
function giantSkeleton(set, x, z) {
  const bone = 0xeeeadc, g = new THREE.Group();
  g.add(at(box(0.62, 0.55, 0.5, bone), 0, 2.35, 0)); // skull
  const eye = ownMat(0x111111);
  for (const ex of [-0.14, 0.14]) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.04), eye), ex, 2.4, 0.26));
  g.add(at(box(0.1, 0.9, 0.1, bone), 0, 1.6, 0)); // spine
  for (let i = 0; i < 4; i++) g.add(at(box(0.6 - i * 0.06, 0.06, 0.32, bone), 0, 1.92 - i * 0.16, 0)); // ribs
  g.add(at(box(0.5, 0.16, 0.26, bone), 0, 1.12, 0)); // pelvis
  for (const lx of [-0.18, 0.18]) g.add(at(box(0.09, 1.05, 0.09, bone), lx, 0.55, 0)); // legs
  g.add(at(box(0.09, 0.8, 0.09, bone), -0.38, 1.55, 0)); // left arm down
  const arm = new THREE.Group(); arm.position.set(0.36, 1.98, 0);
  arm.add(at(box(0.09, 0.8, 0.09, bone), 0, 0.38, 0)); arm.add(at(box(0.18, 0.16, 0.06, bone), 0, 0.84, 0));
  g.add(arm);
  g.position.set(x, 0, z); g.rotation.y = -0.35; set.add(g);
  return (t) => { arm.rotation.z = -0.5 + Math.sin(t * 2.2) * 0.35; };
}

const suburbio_halloween = makeLocation('suburbio_halloween', {
  floor: 0x1a221c, frame: 0x101014, boardStyle: 'screen', background: 0x0a0618, fog: [0x1a0e26, 16, 40],
  sky: paintSky,
  props: (set) => {
    const faces = [jackOLantern(set, -3.4, -0.9, 1.0), jackOLantern(set, 3.1, -0.5, 0.8), jackOLantern(set, -2.7, -2.0, 0.7)];
    gravestone(set, -3.3, -2.6, 0.2); gravestone(set, 2.7, -2.4, -0.25); gravestone(set, 3.6, -1.7, -0.4);
    const wave = giantSkeleton(set, 4.3, -2.8);
    // low picket fence behind the board with orange/purple string lights
    for (let i = 0; i < 26; i++) set.add(at(box(0.12, 0.7, 0.06, 0xd8d4c8), -6.5 + i * 0.52, 0.35, -4.6));
    set.add(at(box(13.5, 0.08, 0.06, 0xd8d4c8), 0, 0.55, -4.6));
    const pts = []; for (let i = 0; i < 30; i++) pts.push([-6.5 + i * 0.45, 0.78 + Math.sin(i * 0.9) * 0.05, -4.55, 0.1]);
    const blink = blinkers(set, pts, [0xff8a1a, 0xb05aff], 1.6);
    const orange = new THREE.PointLight(0xff7a2a, 5, 7, 1.5); orange.position.set(-3.0, 1.0, -0.4); set.add(orange);
    const orange2 = new THREE.PointLight(0xff7a2a, 3.5, 6, 1.5); orange2.position.set(3.0, 1.0, 0); set.add(orange2);
    const purple = new THREE.PointLight(0xa060ff, 5, 10, 1.5); purple.position.set(2.5, 3.2, 1.2); set.add(purple);
    return [wave, blink, (t) => {
      faces.forEach((m, i) => { m.emissiveIntensity = 1.6 * flicker(t, i + 1); });
      orange.intensity = 5 * flicker(t, 3); orange2.intensity = 3.5 * flicker(t, 5);
    }];
  },
  lights: { hemi: [0x8a7cff, 0x141018, 0.9], key: [0xc8c8ff, 1.0], fill: [0xffb070, 1.0] },
});

export default suburbio_halloween;
