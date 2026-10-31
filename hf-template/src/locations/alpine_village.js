import * as THREE from 'three';
import { box, at, rng, ownMat, flicker, cylinder } from './common.js';
import { makeLocation, glow, blinkers } from './modern.js';

// Snowy Alpine village on Krampus night (032): painted panorama of snowy peaks, wooden chalets with lit windows
// and snow-loaded roofs, an onion-dome church spire; 3D snow drifts, pine trees, two lantern posts, a market stall
// with string lights and deterministic falling snow (positions are a pure function of t, seek-safe).
// The board is a projector-style screen in a dark wooden frame. Character area (x -2.2..1.9, z -0.6..0.9) stays clear.

function paintSky(g, W, H) {
  const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, '#070b1e'); sky.addColorStop(1, '#2a3a5e');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const r = rng(32);
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.5})`; g.fillRect(r() * W, r() * H * 0.35, 2, 2); }
  // snowy peaks: dark rock with white caps
  const peaks = [[-100, 0.62], [260, 0.3], [620, 0.5], [980, 0.24], [1380, 0.44], [1720, 0.28], [2150, 0.55]];
  g.fillStyle = '#28324c'; g.beginPath(); g.moveTo(0, H * 0.7);
  for (const [x, y] of peaks) g.lineTo(x, H * y);
  g.lineTo(W, H * 0.7); g.closePath(); g.fill();
  g.fillStyle = '#dfe8f6';
  for (let i = 1; i < peaks.length - 1; i++) {
    const [x, y] = peaks[i];
    g.beginPath(); g.moveTo(x, H * y); g.lineTo(x - 90, H * (y + 0.09)); g.lineTo(x - 30, H * (y + 0.07)); g.lineTo(x + 10, H * (y + 0.1));
    g.lineTo(x + 50, H * (y + 0.07)); g.lineTo(x + 95, H * (y + 0.09)); g.closePath(); g.fill();
  }
  // church with onion dome
  const cx = 1500, base = H * 0.8;
  g.fillStyle = '#e8e2d4'; g.fillRect(cx - 40, base - 330, 80, 330);
  g.fillStyle = '#5a3a2a'; g.beginPath(); g.ellipse(cx, base - 360, 52, 44, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(cx - 6, base - 450, 12, 60); g.fillRect(cx - 22, base - 430, 44, 10);
  g.fillStyle = '#ffd68a'; g.fillRect(cx - 18, base - 280, 36, 52);
  g.fillStyle = '#f4f7ff'; g.fillRect(cx - 48, base - 334, 96, 10);
  // chalets: dark wood walls, steep roofs with snow, warm windows with crosses, balconies
  const walls = ['#4a2e1e', '#5a3624', '#3e2618', '#523222'];
  for (let i = 0; i < 6; i++) {
    const x = i * 340 - 60 + (i > 3 ? 120 : 0), w = 280, h = 190 + (i % 2) * 40, top = base - h;
    if (Math.abs(x + w / 2 - cx) < 200) continue;
    g.fillStyle = '#e8e2d4'; g.fillRect(x, top + h * 0.55, w, h * 0.45); // white plastered ground floor
    g.fillStyle = walls[i % walls.length]; g.fillRect(x, top, w, h * 0.55);
    g.fillStyle = '#2a1a12'; g.beginPath(); g.moveTo(x - 40, top + 8); g.lineTo(x + w / 2, top - 110); g.lineTo(x + w + 40, top + 8); g.closePath(); g.fill();
    g.fillStyle = '#f4f7ff'; g.beginPath(); g.moveTo(x - 40, top + 2); g.lineTo(x + w / 2, top - 118); g.lineTo(x + w + 40, top + 2); g.lineTo(x + w + 40, top - 10); g.lineTo(x + w / 2, top - 128); g.lineTo(x - 40, top - 10); g.closePath(); g.fill();
    for (const [wx, wy] of [[x + 36, top + 30], [x + w - 96, top + 30], [x + 36, top + h * 0.62], [x + w - 96, top + h * 0.62]]) {
      g.fillStyle = r() < 0.8 ? '#ffc861' : '#ff9a4a'; g.fillRect(wx, wy, 60, 54);
      g.fillStyle = '#2a1a12'; g.fillRect(wx + 27, wy, 6, 54); g.fillRect(wx, wy + 24, 60, 6);
      g.fillStyle = '#7a2a22'; g.fillRect(wx - 12, wy, 10, 54); g.fillRect(wx + 62, wy, 10, 54); // shutters
    }
    g.fillStyle = '#3a2214'; g.fillRect(x - 10, top + h * 0.5, w + 20, 12); // balcony rail
    for (let k = 0; k < 12; k++) g.fillRect(x - 6 + k * (w + 12) / 11, top + h * 0.5 - 26, 6, 30);
  }
  // snowy ground
  g.fillStyle = '#c9d6ea'; g.fillRect(0, base, W, H - base);
  g.fillStyle = '#aebbd2'; for (let i = 0; i < 40; i++) g.fillRect(r() * W, base + 10 + r() * (H - base - 20), 60 + r() * 120, 4);
}

/** Low-poly snowy pine (stacked cones + snow tips). */
function pine(set, x, z, s = 1) {
  const g = new THREE.Group();
  g.add(at(cylinder(0.12, 0.5, 0x4a2e1a, 6), 0, 0.25, 0));
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.9 - i * 0.22, 0.9, 7), ownMat(0x1f4a34));
    c.castShadow = true; g.add(at(c, 0, 0.8 + i * 0.55, 0));
    g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.5 - i * 0.12, 0.3, 7), ownMat(0xf2f6ff)), 0, 1.1 + i * 0.55, 0));
  }
  g.scale.setScalar(s); g.position.set(x, 0, z); set.add(g);
}

/** Iron lantern post with a warm flickering light; returns its update fn. */
function lantern(set, x, z) {
  set.add(at(cylinder(0.06, 2.4, 0x1c1c22, 6), x, 1.2, z));
  set.add(at(box(0.36, 0.06, 0.36, 0x1c1c22), x, 2.42, z));
  const m = glow(0xffc870, 1.6);
  set.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), m), x, 2.62, z));
  set.add(at(box(0.36, 0.08, 0.36, 0x1c1c22), x, 2.82, z));
  set.add(at(box(0.4, 0.06, 0.4, 0xf2f6ff), x, 2.88, z)); // snow cap
  const light = new THREE.PointLight(0xffb060, 5, 7, 1.5); light.position.set(x, 2.6, z + 0.2); set.add(light);
  return (t) => { const k = flicker(t, x * 3); m.emissiveIntensity = 1.6 * k; light.intensity = 5 * k; };
}

/** Deterministic snowfall: N flakes falling in a box; positions depend only on t. */
function snowfall(set, n = 420) {
  const r = rng(77);
  const seeds = Array.from({ length: n }, () => [r() * 14 - 7, r() * 6 - 5, r(), 0.35 + r() * 0.35, r() * 6.28]);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.85, depthWrite: false }));
  pts.frustumCulled = false; set.add(pts);
  const TOP = 6.5;
  return (t) => {
    seeds.forEach(([x, z, y0, v, ph], i) => {
      const y = TOP - (((y0 * TOP + t * v) % TOP) + TOP) % TOP;
      pos[i * 3] = x + Math.sin(t * 0.8 + ph) * 0.15; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    });
    geo.attributes.position.needsUpdate = true;
  };
}

const alpine_village = makeLocation('alpine_village', {
  floor: 0xd8e2f0, frame: 0x3a2416, boardStyle: 'screen', background: 0x070b1e, fog: [0x1a2440, 16, 42],
  sky: paintSky,
  props: (set) => {
    // snow drifts at the edges
    for (const [x, z, s] of [[-4.2, -1.2, 1.2], [3.8, -1.0, 1.0], [-3.0, -3.4, 1.4], [4.6, -3.0, 1.3]]) {
      const d = at(new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), ownMat(0xeef3fb)), x, -0.35, z);
      d.scale.set(s * 1.4, 0.6, s); d.receiveShadow = true; set.add(d);
    }
    pine(set, -4.6, -2.4, 1.1); pine(set, 4.4, -2.0, 1.0); pine(set, -5.6, -4.2, 1.3); pine(set, 5.4, -4.4, 1.4);
    const l1 = lantern(set, -3.2, -0.8), l2 = lantern(set, 3.0, -0.6);
    // Christmas-market stall behind the board area, right side
    const stall = at(new THREE.Group(), 3.4, 0, -3.6);
    stall.add(at(box(1.8, 1.0, 0.8, 0x5a3624), 0, 0.5, 0));
    stall.add(at(box(2.1, 0.08, 1.1, 0x7a2a22), 0, 1.9, 0.05));
    stall.add(at(box(2.1, 0.08, 1.1, 0xf2f6ff), 0, 1.96, 0.05));
    for (const sx of [-0.85, 0.85]) stall.add(at(box(0.08, 0.9, 0.08, 0x3a2214), sx, 1.45, 0.35));
    set.add(stall);
    const pts = []; for (let i = 0; i < 9; i++) pts.push([2.5 + i * 0.22, 1.82 - Math.sin(i / 8 * Math.PI) * 0.1, -3.0, 0.08]);
    const blink = blinkers(set, pts, [0xffd27a, 0xff6a4a], 1.2);
    const fall = snowfall(set);
    const cold = new THREE.PointLight(0x8ab0ff, 3, 10, 1.5); cold.position.set(-2.5, 3.5, 1.5); set.add(cold);
    return [l1, l2, blink, fall];
  },
  lights: { hemi: [0x9ab0e0, 0x2a3040, 1.0], key: [0xc8d4ff, 1.0], fill: [0xffc080, 0.9] },
  exposure: 1.15,
});

export default alpine_village;
