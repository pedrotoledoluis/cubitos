import * as THREE from 'three';
import { box, at, cylinder, ownMat, canvasTexture } from './common.js';
import { makeLocation, glow } from './modern.js';

// Andean air base helipad by day (026 papacóptero): blue sky, snowy Andes and green ridges, a hangar and a small
// control tower painted on the backdrop, grey tarmac with a yellow helipad ring and white "H" at the characters'
// feet, a parked low-poly Mi-17-like transport helicopter behind the right side (main rotor idling, tail rotor spinning,
// blinking red beacon), an orange-white windsock swaying at the left and runway edge lights.
// Board: a wooden briefing sign on posts (`wood` style).

const OLIVE = 0x5c6a44, OLIVE_DARK = 0x46523a, SAND = 0x9a8a5e, GLASS = 0x2a4a6a, METAL = 0x3a3e44;

/**
 * Low-poly Mi-17-like helicopter, nose toward +x. Origin on the ground under the main rotor mast.
 * Returns { group, rotor, tailRotor, beacon }.
 */
export function createHelicopter() {
  const g = new THREE.Group();
  // fuselage: cabin box + tapered nose + cockpit glazing + round side windows
  g.add(at(box(3.2, 1.35, 1.3, OLIVE, { bevel: 0.18 }), 0, 1.15, 0));
  g.add(at(box(0.9, 1.05, 1.15, OLIVE, { bevel: 0.22 }), 1.85, 1.02, 0)); // nose
  g.add(at(box(0.55, 0.5, 1.18, GLASS, { metalness: 0.5, roughness: 0.15 }), 2.05, 1.38, 0)); // cockpit glass
  g.add(at(box(0.08, 0.5, 1.2, OLIVE_DARK), 2.05, 1.38, 0)); // center frame
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 5; i++) { // round-ish portholes (octagons) along the cabin
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 8), ownMat(GLASS, { metalness: 0.4, roughness: 0.2 }));
      w.rotation.x = Math.PI / 2; w.position.set(-1.1 + i * 0.5, 1.35, sz * 0.66); g.add(w);
    }
    g.add(at(box(0.9, 0.38, 0.32, OLIVE_DARK, { bevel: 0.12 }), -0.2, 0.62, sz * 0.78)); // side fuel tanks
    g.add(at(box(1.1, 0.08, 0.03, 0xd2202e), 0.4, 0.86, sz * 0.66)); // red cheat line
    g.add(at(box(0.7, 1.0, 0.03, OLIVE_DARK), 0.95, 1.05, sz * 0.66)); // sliding door outline
    // camouflage blotches
    g.add(at(box(0.7, 0.35, 0.03, SAND), -0.6, 1.65, sz * 0.665));
    g.add(at(box(0.5, 0.3, 0.03, SAND), 1.2, 1.55, sz * 0.665));
  }
  // engine housing + exhausts on top
  g.add(at(box(2.0, 0.5, 0.95, OLIVE_DARK, { bevel: 0.16 }), 0.2, 2.05, 0));
  for (const sz of [-1, 1]) g.add(at(cylinder(0.12, 0.3, METAL, 8), -0.85, 2.05, sz * 0.32).rotateZ(Math.PI / 2));
  // tail boom (tapered, two segments), fin, horizontal stabilizer, tail skid
  const boom = at(box(2.6, 0.45, 0.42, OLIVE, { bevel: 0.1 }), -2.8, 1.45, 0); boom.rotation.z = 0.05; g.add(boom);
  g.add(at(box(1.0, 0.32, 0.3, OLIVE, { bevel: 0.08 }), -4.5, 1.58, 0));
  const fin = at(box(0.7, 1.1, 0.14, OLIVE, { bevel: 0.05 }), -4.95, 2.05, 0); fin.rotation.z = -0.35; g.add(fin);
  for (const [i, c] of [0xd2202e, 0xf4f4f0, 0xd2202e].entries()) g.add(at(box(0.13, 0.4, 0.15, c), -5.05 + i * 0.13, 2.05, 0)); // fin flash
  g.add(at(box(0.3, 0.06, 1.0, OLIVE_DARK), -4.3, 1.55, 0)); // stabilizer
  // landing gear: nose wheels + main wheels on struts
  for (const [x, sz] of [[1.8, -0.3], [1.8, 0.3], [-0.3, -0.85], [-0.3, 0.85]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 10), ownMat(0x18181c));
    wheel.rotation.x = Math.PI / 2; wheel.position.set(x, 0.2, sz); g.add(wheel);
    g.add(at(box(0.08, 0.4, 0.08, METAL), x, 0.45, sz * 0.85));
  }
  // main rotor: mast + hub + 5 long drooping blades
  g.add(at(cylinder(0.08, 0.5, METAL, 8), 0.2, 2.5, 0));
  const rotor = at(new THREE.Group(), 0.2, 2.78, 0);
  rotor.add(at(cylinder(0.22, 0.12, METAL, 8), 0, 0, 0));
  for (let i = 0; i < 5; i++) {
    const arm = new THREE.Group(); arm.rotation.y = (i / 5) * Math.PI * 2;
    const blade = at(box(2.5, 0.04, 0.22, 0x26282c), 1.3, -0.05, 0); blade.rotation.z = -0.04; arm.add(blade);
    arm.add(at(box(0.3, 0.05, 0.23, 0xffd23a), 2.45, -0.1, 0)); // yellow tip
    rotor.add(arm);
  }
  g.add(rotor);
  // tail rotor on the right side of the fin (+z), spins in the xy plane
  const tailRotor = at(new THREE.Group(), -5.05, 2.15, 0.16);
  for (let i = 0; i < 3; i++) {
    const b = at(box(0.08, 0.7, 0.03, 0x26282c), 0, 0, 0); b.rotation.z = (i / 3) * Math.PI * 2; b.geometry.translate(0, 0.32, 0); tailRotor.add(b);
  }
  g.add(tailRotor);
  // red anti-collision beacon under the tail boom
  const beacon = glow(0xff2a2a, 1.6);
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), beacon), -1.4, 1.18, 0));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, rotor, tailRotor, beacon };
}

/** Windsock on a pole; returns { group, sock } (sock pivots at the pole top). */
function windsock() {
  const g = new THREE.Group();
  g.add(at(box(0.08, 2.6, 0.08, 0xd8d8d8), 0, 1.3, 0));
  const sock = at(new THREE.Group(), 0, 2.55, 0);
  for (let i = 0; i < 5; i++) {
    const r = 0.22 - i * 0.03;
    sock.add(at(box(0.3, r * 2, r * 2, i % 2 ? 0xf4f4f0 : 0xff6a1a, { bevel: 0.02 }), 0.17 + i * 0.3, -i * 0.03, 0));
  }
  g.add(sock);
  return { group: g, sock };
}

export default makeLocation('fap_helipad', {
  floor: 0x5a5e62, frame: 0x5a3a1e, boardStyle: 'wood', background: 0x9ec8f0, fog: [0xb8d8f4, 28, 75], exposure: 1.15,
  sky: (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.75);
    sky.addColorStop(0, '#3f7fd0'); sky.addColorStop(1, '#bfe0ff');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.85)'; // a few blocky clouds
    for (const [x, y, w] of [[220, 300, 260], [900, 230, 340], [1560, 330, 280]]) { g.fillRect(x, y, w, 46); g.fillRect(x + 50, y - 34, w * 0.55, 40); }
    // Andes: far snowy peaks, then nearer green ridges
    const peaks = [[0, 680], [260, 540], [480, 650], [740, 470], [960, 620], [1150, 450], [1380, 600], [1620, 500], [1880, 640], [2048, 560], [2048, 820], [0, 820]];
    g.fillStyle = '#7a86a8'; g.beginPath(); peaks.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
    g.fillStyle = '#f6f8ff';
    for (const [x, y] of [[260, 540], [740, 470], [1150, 450], [1620, 500]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x - 70, y + 62); g.lineTo(x - 20, y + 50); g.lineTo(x + 22, y + 68); g.lineTo(x + 76, y + 60); g.fill(); }
    g.fillStyle = '#5f8a46'; g.beginPath(); g.moveTo(0, 780); for (let x = 0; x <= W; x += 64) g.lineTo(x, 760 - Math.sin(x * 0.004 + 2) * 45); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    // hangar (left) and control tower (right) on the base, low on the wall
    g.fillStyle = '#c8ccd0'; g.beginPath(); g.moveTo(120, 900); g.lineTo(120, 800); g.quadraticCurveTo(330, 700, 540, 800); g.lineTo(540, 900); g.fill();
    g.fillStyle = '#3a3e44'; g.fillRect(220, 820, 220, 80);
    g.font = '900 34px Arial Black'; g.textAlign = 'center'; g.fillStyle = '#2a3a5a'; g.fillText('BASE AÉREA', 330, 790);
    g.fillStyle = '#d8d8d0'; g.fillRect(1640, 720, 60, 180);
    g.fillStyle = '#2a4a6a'; g.fillRect(1610, 680, 120, 50);
    g.fillStyle = '#e8e8e0'; g.fillRect(1600, 670, 140, 14);
    g.fillStyle = '#4a4e52'; g.fillRect(0, 900, W, H - 900);
  },
  props: (set) => {
    // helipad marking at the characters' feet: yellow ring + white H (flat, just above the tarmac)
    const pad = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.75, 2.0, 40), ownMat(0xffd23a, { side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; pad.add(ring);
    const H = canvasTexture(256, 256, (c, W, Hh) => {
      c.fillStyle = '#ffffff'; c.fillRect(48, 28, 44, 200); c.fillRect(164, 28, 44, 200); c.fillRect(48, 106, 160, 44);
    });
    const hm = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshStandardMaterial({ map: H, transparent: true, roughness: 0.9 }));
    hm.rotation.x = -Math.PI / 2; hm.position.y = 0.002; pad.add(hm);
    pad.position.set(-0.2, 0.012, 0.6); set.add(pad);
    // parked helicopter behind the right side (shows above Nova in the wide shot), nose toward the camera
    const heli = createHelicopter();
    heli.group.position.set(2.8, 0, -5.8); heli.group.rotation.y = -2.2; heli.group.scale.setScalar(1.1); set.add(heli.group);
    // windsock at the left
    const ws = windsock(); ws.group.position.set(-3.1, 0, -3.6); set.add(ws.group);
    // runway edge lights along the back
    const edge = [];
    for (let i = 0; i < 9; i++) {
      const m = glow(i % 2 ? 0x4aa8ff : 0xffd23a, 1.2);
      set.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), m), -6 + i * 1.5, 0.08, -4.2));
      edge.push(m);
    }
    const sun = new THREE.PointLight(0xfff0d0, 4, 14, 1.3); sun.position.set(2, 5, 3); set.add(sun);
    return [(t) => {
      heli.rotor.rotation.y = t * 2.2; // idling
      heli.tailRotor.rotation.z = -t * 9;
      heli.beacon.emissiveIntensity = (Math.floor(t * 1.5) % 2) ? 2.2 : 0.2;
      ws.sock.rotation.y = 0.5 + Math.sin(t * 0.9) * 0.25;
      ws.sock.rotation.z = -0.15 + Math.sin(t * 2.3) * 0.06;
      edge.forEach((m, i) => (m.emissiveIntensity = 0.6 + 0.8 * (0.5 + 0.5 * Math.sin(t * 3 - i * 0.7))));
    }];
  },
  lights: { hemi: [0xdcecff, 0x5a6a4a, 1.1], key: [0xfff2dc, 1.8], fill: [0xdde8ff, 0.8] },
});
