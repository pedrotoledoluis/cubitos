import * as THREE from 'three';
import { box, at, mat, rng } from '../characters/util.js';

// Shared building blocks for location presets. All deterministic (seeded rng, time-driven motion only).

// In-world "board" placement shared by every location (world units). Camera shots and Profe's pointer are
// tuned to it, so each location shows its 2D graphics on a surface at exactly this rectangle
// (chalkboard, wooden notice board, newspaper billboard...).
export const BOARD = { x: -0.15, y: 3.35, w: 2.6, h: 1.8, z: -3.0 };

export { box, at, mat, rng };

/** Self-lit plane showing the shared board canvas texture at BOARD. */
export function boardScreen(texture) {
  const B = BOARD;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(B.w, B.h), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  screen.position.set(B.x, B.y, B.z + 0.075);
  return screen;
}

/** Canvas texture helper: draw(g, W, H) paints a W x H canvas. */
export function canvasTexture(W, H, draw) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  draw(c.getContext('2d'), W, H);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Unlit backdrop plane (sky / panorama). */
export function backdrop(tex, w, h, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
  m.position.set(x, y, z);
  return m;
}

export function cylinder(r, h, color, sides = 8, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, sides), mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** A material that is NOT cached/shared (for per-object animated emissive values). */
export function ownMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true, ...opts });
}

/**
 * Low-poly box chicken (or a plucked one). update(t, { walk }) animates head bob and legs.
 * Faces +x. ~0.55 units tall.
 */
export function createChicken({ plucked = false, scale = 1 } = {}) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(scale);
  g.add(inner);
  const BODY = plucked ? 0xf3b9a2 : 0xf6f3ea;
  const body = at(box(0.42, 0.3, 0.3, BODY, { bevel: 0.04 }), 0, 0.36, 0);
  inner.add(body);
  if (!plucked) inner.add(at(box(0.14, 0.22, 0.24, BODY, { bevel: 0.03 }), -0.24, 0.5, 0)); // tail
  else for (let i = 0; i < 5; i++) inner.add(at(box(0.04, 0.04, 0.04, 0xe39a86), -0.12 + i * 0.07, 0.52, (i % 2 ? 0.1 : -0.1))); // goosebumps
  const head = at(new THREE.Group(), 0.2, 0.56, 0);
  head.add(box(0.18, 0.2, 0.18, BODY, { bevel: 0.03 }));
  head.add(at(box(0.1, 0.06, 0.08, 0xf2a81d), 0.12, -0.01, 0)); // beak
  head.add(at(box(0.1, 0.09, 0.04, 0xd8302a), 0.0, 0.13, 0)); // comb
  head.add(at(box(0.05, 0.08, 0.04, 0xd8302a), 0.1, -0.09, 0)); // wattle
  for (const sz of [-1, 1]) head.add(at(box(0.04, 0.04, 0.02, 0x111111), 0.05, 0.04, sz * 0.09));
  inner.add(head);
  const legs = [-1, 1].map((sz) => {
    const leg = at(new THREE.Group(), 0, 0.22, sz * 0.08);
    leg.add(at(box(0.04, 0.22, 0.04, 0xf2a81d), 0, -0.11, 0));
    leg.add(at(box(0.12, 0.03, 0.08, 0xf2a81d), 0.03, -0.21, 0));
    inner.add(leg);
    return leg;
  });
  if (plucked) inner.rotation.z = 0;
  function update(t, { walk = 1 } = {}) {
    head.position.x = 0.2 + Math.max(0, Math.sin(t * 9)) * 0.06 * walk;
    head.position.y = 0.56 - Math.max(0, Math.sin(t * 4.5 + 1)) * 0.04;
    legs.forEach((l, i) => (l.rotation.z = Math.sin(t * 9 + i * Math.PI) * 0.5 * walk));
    body.rotation.z = Math.sin(t * 9) * 0.04 * walk;
  }
  update(0);
  return { group: g, update };
}

/** Small grey pigeon (scaled chicken shape with pigeon colors). */
export function createPigeon() {
  const g = new THREE.Group();
  const body = at(box(0.3, 0.18, 0.18, 0x8a90a0, { bevel: 0.03 }), 0, 0.16, 0);
  const head = at(new THREE.Group(), 0.17, 0.3, 0);
  head.add(box(0.12, 0.12, 0.12, 0x6e7486, { bevel: 0.02 }));
  head.add(at(box(0.06, 0.03, 0.04, 0x2a2a2a), 0.08, -0.02, 0));
  head.add(at(box(0.13, 0.04, 0.13, 0x4f8f7a), -0.02, -0.07, 0)); // iridescent neck
  g.add(body, head, at(box(0.14, 0.05, 0.14, 0x5d6272), -0.2, 0.2, 0));
  for (const sz of [-1, 1]) g.add(at(box(0.03, 0.08, 0.03, 0xd86a6a), 0, 0.04, sz * 0.05));
  function update(t, { peck = 0 } = {}) {
    head.position.x = 0.17 + Math.sin(t * 8) * 0.03;
    head.position.y = 0.3 - Math.max(0, Math.sin(t * 2.3)) * 0.14 * peck;
  }
  return { group: g, update };
}

/** Deterministic flicker 0.75..1.05 for flames / gas lamps. */
export const flicker = (t, seed = 0) => 0.9 + 0.08 * Math.sin(t * 13 + seed) + 0.05 * Math.sin(t * 37.3 + seed * 2) + 0.03 * Math.sin(t * 71.1);

/** Ping-pong walk: position along [a, b] at `speed` units/s with an offset. Returns { x, dir }. */
export function walkPath(t, a, b, speed, offset = 0) {
  const len = b - a;
  const p = ((t * speed + offset) % (2 * len) + 2 * len) % (2 * len);
  return p < len ? { x: a + p, dir: 1 } : { x: b - (p - len), dir: -1 };
}
