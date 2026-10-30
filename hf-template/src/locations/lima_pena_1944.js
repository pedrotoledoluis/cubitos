import * as THREE from 'three';
import { box, at, rng, ownMat, flicker } from './common.js';
import { makeLocation, glow } from './modern.js';

// Old Lima peña / callejón at night (1940s): colonial facades with balcones limeños, a string of warm bulbs,
// a little stage with guitars and a cajón, wooden chairs, a swaying lantern. Board: wooden sign.

const WOOD = 0x5a3218, WOOD_DARK = 0x3a200e;

/** Closed Lima balcony (balcón limeño): dark wooden box with lattice slats and a small roof. */
function balcony(w, h, d) {
  const g = new THREE.Group();
  g.add(at(box(w, h, d, WOOD, { bevel: 0.03 }), 0, 0, 0));
  g.add(at(box(w + 0.2, 0.12, d + 0.2, WOOD_DARK), 0, h / 2 + 0.06, 0));
  g.add(at(box(w + 0.1, 0.1, d + 0.1, WOOD_DARK), 0, -h / 2 - 0.05, 0));
  const n = Math.round(w / 0.32);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i + 0.5) * (w / n);
    g.add(at(box(0.05, h * 0.62, 0.04, 0xc99a5a), x, 0.05, d / 2 + 0.02)); // lattice slats
    g.add(at(box(w / n - 0.06, 0.05, 0.04, 0xc99a5a), x, 0.05 + (i % 2 ? 0.15 : -0.15), d / 2 + 0.02));
  }
  for (let i = 0; i < 3; i++) g.add(at(box(0.06, 0.4, 0.3, WOOD_DARK), -w / 2 + 0.3 + i * (w - 0.6) / 2, -h / 2 - 0.25, -d / 4)); // corbels
  return g;
}

/** Simple acoustic guitar standing on its end (for the stage). */
function standingGuitar(color = 0xc98a42) {
  const g = new THREE.Group();
  g.add(at(box(0.5, 0.42, 0.14, color, { bevel: 0.05 }), 0, 0.25, 0));
  g.add(at(box(0.4, 0.32, 0.14, color, { bevel: 0.05 }), 0, 0.6, 0));
  g.add(at(box(0.13, 0.13, 0.02, 0x1a1008), 0, 0.48, 0.08));
  g.add(at(box(0.1, 0.62, 0.06, 0x2a180a), 0, 1.06, 0));
  g.add(at(box(0.14, 0.18, 0.07, 0x2a180a, { bevel: 0.02 }), 0, 1.44, 0));
  return g;
}

function chair() {
  const g = new THREE.Group();
  g.add(at(box(0.6, 0.08, 0.6, WOOD, { bevel: 0.02 }), 0, 0.5, 0));
  for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) g.add(at(box(0.07, 0.5, 0.07, WOOD_DARK), x, 0.25, z));
  g.add(at(box(0.6, 0.6, 0.07, WOOD, { bevel: 0.02 }), 0, 0.85, -0.27));
  g.add(at(box(0.5, 0.25, 0.08, 0xd8b36a), 0, 0.95, -0.25)); // woven back
  return g;
}

export default makeLocation('lima_pena_1944', {
  floor: 0x4a3a30, frame: WOOD_DARK, boardStyle: 'wood', background: 0x08061a, fog: [0x120c22, 18, 44], exposure: 1.4,
  sky: (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, '#060418'); sky.addColorStop(1, '#2a1838');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const r = rng(44);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,250,230,${0.25 + r() * 0.5})`; g.fillRect(r() * W, r() * H * 0.3, 2, 2); }
    // colonial facades (pastel walls lit warm) with balconies and doors
    const walls = ['#c9734a', '#d9b26a', '#7aa6a0', '#c98aa0', '#e0c89a'];
    for (let b = 0; b < 9; b++) {
      const x = b * 230 - 20, h = 360 + (b % 3) * 70, y = H * 0.78 - h;
      g.fillStyle = walls[b % walls.length]; g.globalAlpha = 0.55; g.fillRect(x, y, 228, h + 300); g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y, 228, 14);
      g.fillStyle = '#3a200e'; g.fillRect(x + 40, y + 90, 150, 90); // balcony
      g.fillStyle = '#c99a5a'; for (let i = 0; i < 7; i++) g.fillRect(x + 50 + i * 20, y + 100, 6, 70);
      g.fillStyle = r() < 0.6 ? '#ffd27a' : '#6a4a30'; g.fillRect(x + 80, y + h - 150, 70, 150); // door
    }
    g.fillStyle = '#20141a'; g.fillRect(0, H * 0.78, W, H * 0.22);
    g.font = '900 64px Georgia'; g.textAlign = 'center'; g.fillStyle = '#ffe2a0'; g.fillText('PEÑA CRIOLLA', W * 0.72, H * 0.34);
  },
  props: (set) => {
    const ups = [];
    // left: a big balcón limeño on a facade wall
    set.add(at(box(4.2, 7.0, 0.3, 0xb8683e), -5.4, 3.5, -3.6));
    const bal = balcony(2.6, 1.3, 0.8); bal.position.set(-3.9, 4.7, -3.0); set.add(bal);
    set.add(at(box(1.0, 2.0, 0.1, 0x3a200e), -3.9, 1.0, -3.4)); // door
    // swaying lantern hanging from the balcony
    const lantern = at(new THREE.Group(), -2.55, 4.05, -2.3);
    lantern.add(at(box(0.03, 0.5, 0.03, 0x222222), 0, -0.25, 0));
    const lampMat = glow(0xffc870, 1.6);
    lantern.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.28), lampMat), 0, -0.7, 0));
    lantern.add(at(box(0.36, 0.06, 0.36, 0x222222), 0, -0.5, 0), at(box(0.32, 0.05, 0.32, 0x222222), 0, -0.9, 0));
    set.add(lantern);
    const lanternLight = new THREE.PointLight(0xffb060, 5, 8, 1.5); lanternLight.position.set(-2.55, 3.2, -1.8); set.add(lanternLight);
    // right: little stage platform with a back wall, two guitars, a cajón
    set.add(at(box(3.0, 0.3, 1.6, WOOD, { bevel: 0.03 }), 3.3, 0.15, -2.6));
    set.add(at(box(3.4, 4.2, 0.2, 0x7a3a22), 3.6, 2.1, -3.5));
    const g1 = standingGuitar(); g1.position.set(2.15, 0.3, -2.9); g1.rotation.z = 0.12; set.add(g1);
    const g2 = standingGuitar(0xa86a32); g2.position.set(3.2, 0.3, -3.0); g2.rotation.z = -0.1; set.add(g2);
    const cajon = new THREE.Group();
    cajon.add(box(0.55, 0.8, 0.55, 0xb07a3a, { bevel: 0.03 }));
    cajon.add(at(box(0.16, 0.16, 0.02, 0x1a1008), 0, 0.1, -0.285));
    cajon.add(at(box(0.5, 0.75, 0.02, 0xd4a060), 0, 0, 0.285));
    cajon.position.set(2.75, 0.7, -2.2); set.add(cajon);
    // a couple of wooden chairs at the left front
    const c1 = chair(); c1.position.set(-3.0, 0, -1.4); c1.rotation.y = 0.5; set.add(c1);
    const c2 = chair(); c2.position.set(-2.4, 0, -2.3); c2.rotation.y = 0.2; set.add(c2);
    // string of warm bulbs across the alley, sagging, high behind the board top
    const bulbs = [];
    for (let i = 0; i < 22; i++) {
      const k = i / 21, x = -7 + k * 14, y = 5.6 - Math.sin(k * Math.PI) * 0.7;
      const m = ownMat(0xffd88a, { emissive: 0xffc060, emissiveIntensity: 1.5 });
      set.add(at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), m), x, y, -2.2));
      bulbs.push(m);
    }
    for (let i = 0; i < 21; i++) {
      const k = (i + 0.5) / 21, y = 5.66 - Math.sin(k * Math.PI) * 0.7;
      set.add(at(box(14 / 21, 0.02, 0.02, 0x111111), -7 + k * 14, y, -2.2));
    }
    const warm = new THREE.PointLight(0xffb070, 6, 12, 1.4); warm.position.set(2.8, 3.2, -1.0); set.add(warm);
    ups.push((t) => {
      lantern.rotation.z = Math.sin(t * 1.4) * 0.16;
      lampMat.emissiveIntensity = 1.6 * flicker(t, 3);
      lanternLight.intensity = 5 * flicker(t, 3);
      bulbs.forEach((m, i) => { m.emissiveIntensity = 0.9 + 0.8 * Math.max(0, Math.sin(t * 2.5 - i * 0.6)); });
      cajon.scale.y = 1 + 0.03 * Math.max(0, Math.sin(t * 9)); // a little "boom" from the cajón
    });
    return ups;
  },
  lights: { hemi: [0xc8b8ff, 0x302020, 1.25], key: [0xfff0dc, 1.6], fill: [0xffc890, 1.1] },
});
