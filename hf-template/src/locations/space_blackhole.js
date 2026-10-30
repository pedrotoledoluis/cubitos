import * as THREE from 'three';
import { BOARD, boardScreen, box, at, rng, canvasTexture, backdrop, ownMat } from './common.js';

// Deep space: star field, a black hole with a glowing orange accretion disk and a lensing ring
// (slowly rotating), the characters stand on a small cube-built space platform. The board surface is a
// holographic panel at BOARD.

function starTexture() {
  return canvasTexture(2048, 1024, (g, W, H) => {
    const bg = g.createRadialGradient(W * 0.7, H * 0.35, 20, W * 0.7, H * 0.35, W * 0.7);
    bg.addColorStop(0, '#2a1640'); bg.addColorStop(0.5, '#0c0a22'); bg.addColorStop(1, '#03030c');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const r = rng(42);
    for (let i = 0; i < 900; i++) { const s = r() < 0.08 ? 3 : 2; g.fillStyle = `rgba(255,${230 + r() * 25},${220 + r() * 35},${0.25 + r() * 0.7})`; g.fillRect(r() * W, r() * H, s, s); }
    // nebula wisps
    for (let i = 0; i < 6; i++) {
      const n = g.createRadialGradient(r() * W, r() * H, 10, r() * W, r() * H, 300);
      n.addColorStop(0, i % 2 ? 'rgba(123,92,214,0.18)' : 'rgba(60,140,220,0.14)'); n.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = n; g.fillRect(0, 0, W, H);
    }
  });
}

function diskTexture() {
  return canvasTexture(512, 512, (g, W, H) => {
    const c = W / 2;
    const grd = g.createRadialGradient(c, c, c * 0.32, c, c, c);
    grd.addColorStop(0, 'rgba(255,250,220,1)'); grd.addColorStop(0.15, 'rgba(255,200,90,1)');
    grd.addColorStop(0.5, 'rgba(255,120,30,0.85)'); grd.addColorStop(1, 'rgba(120,20,0,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.arc(c, c, c * 0.3, 0, Math.PI * 2, true); g.fill();
    // streaks so the rotation reads
    const r = rng(3);
    g.strokeStyle = 'rgba(255,240,200,0.35)'; g.lineWidth = 4;
    for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, rr = c * (0.4 + r() * 0.5); g.beginPath(); g.arc(c, c, rr, a, a + 0.6); g.stroke(); }
  });
}

function build({ boardTexture }) {
  const set = new THREE.Group();
  set.add(backdrop(starTexture(), 110, 55, 0, 6, -40));

  // black hole: dark sphere, tilted accretion disk, lensing ring (camera-facing ring)
  const bh = at(new THREE.Group(), 5.5, 8.5, -24);
  bh.add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })));
  const diskTex = diskTexture();
  const disk = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), new THREE.MeshBasicMaterial({ map: diskTex, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  disk.rotation.x = -1.32;
  const diskPivot = new THREE.Group(); diskPivot.rotation.z = 0.18; diskPivot.add(disk); bh.add(diskPivot);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.25, 2.75, 48), new THREE.MeshBasicMaterial({ map: diskTex, color: 0xffc070, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  bh.add(ring);
  const halo = new THREE.Mesh(new THREE.RingGeometry(2.7, 4.2, 48), new THREE.MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  bh.add(halo);
  set.add(bh);

  // platform: cube-built deck with glowing edge strips
  const deck = at(box(9, 0.4, 5, 0x3a3f55, { bevel: 0.05 }), -0.2, -0.2, -0.6);
  deck.receiveShadow = true; deck.castShadow = false;
  set.add(deck);
  const r = rng(12);
  for (let i = 0; i < 18; i++) set.add(at(box(0.9 + r() * 0.6, 0.3 + r() * 0.4, 0.9 + r() * 0.6, 0x2c3044, { bevel: 0.04 }), -4.5 + i * 0.52, -0.55 - r() * 0.5, -0.6 + (r() - 0.5) * 4));
  const stripMat = ownMat(0x7ef0ff, { emissive: 0x3ad8ff, emissiveIntensity: 1.2 });
  for (const z of [1.92, -3.12]) set.add(at(new THREE.Mesh(new THREE.BoxGeometry(9, 0.06, 0.08), stripMat), -0.2, 0.02, z));
  // holographic panel: projector base + translucent frame around BOARD
  const B = BOARD;
  set.add(at(box(1.2, 0.3, 0.6, 0x2c3044, { bevel: 0.04 }), B.x, 0.15, B.z));
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x7ef0ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.9, B.y - B.h / 2 - 0.3, 0.05), beamMat);
  beam.position.set(B.x, (B.y - B.h / 2 + 0.3) / 2, B.z);
  set.add(beam);
  const frameMat = ownMat(0x7ef0ff, { emissive: 0x3ad8ff, emissiveIntensity: 1.5 });
  for (const [w, h, x, y] of [[B.w + 0.2, 0.06, 0, B.h / 2 + 0.05], [B.w + 0.2, 0.06, 0, -B.h / 2 - 0.05], [0.06, B.h + 0.16, B.w / 2 + 0.07, 0], [0.06, B.h + 0.16, -B.w / 2 - 0.07, 0]]) {
    set.add(at(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), frameMat), B.x + x, B.y + y, B.z + 0.05));
  }
  set.add(boardScreen(boardTexture));
  // distant drifting asteroids (cubes)
  const rocks = [];
  for (let i = 0; i < 6; i++) { const m = at(box(0.6 + i * 0.15, 0.5 + i * 0.1, 0.6, 0x55505a, { bevel: 0.08 }), -8 + i * 3, 3 + (i % 3) * 2, -12 - i); rocks.push(m); set.add(m); }

  set.add(new THREE.HemisphereLight(0xa8b8ff, 0x302040, 1.0));
  const key = new THREE.DirectionalLight(0xffd0a0, 1.8); // warm light from the disk
  key.position.set(5, 8, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  key.shadow.bias = -0.0006;
  set.add(key);
  const fill = new THREE.DirectionalLight(0x9fc0ff, 1.0);
  fill.position.set(-4, 3, 7);
  set.add(fill);

  function update(t) {
    disk.rotation.z = t * 0.25;
    ring.rotation.z = -t * 0.15;
    halo.material.opacity = 0.13 + 0.04 * Math.sin(t * 1.3);
    stripMat.emissiveIntensity = 1.0 + 0.4 * Math.sin(t * 2.2);
    beamMat.opacity = 0.1 + 0.04 * Math.sin(t * 5);
    rocks.forEach((m, i) => { m.rotation.set(t * 0.2 + i, t * 0.15 + i * 2, 0); m.position.y = 3 + (i % 3) * 2 + Math.sin(t * 0.4 + i) * 0.2; });
  }
  update(0);
  return { group: set, update, background: 0x03030c, fog: null, exposure: 1.2, boardStyle: 'holo' };
}

export default { name: 'space_blackhole', build };
