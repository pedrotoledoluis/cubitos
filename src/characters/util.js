import * as THREE from 'three';

// Shared helpers for building low-poly box characters and props.

const materialCache = new Map();

export function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.0, flatShading: true, ...opts }));
  }
  return materialCache.get(key);
}

export function box(w, h, d, color, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  mesh.castShadow = opts.emissive === undefined;
  mesh.receiveShadow = true;
  return mesh;
}

export function at(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  return mesh;
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeOutBack = (x) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// Deterministic blink: returns eyelid closure 0..1 for time t.
export function blinkAt(t, period, offset) {
  const p = (t + offset) % period;
  const d = 0.14;
  if (p > d) return 0;
  return Math.sin((p / d) * Math.PI);
}

// Squash factor right after a line starts (1 = rest).
export function squashAt(sinceStart) {
  if (sinceStart < 0 || sinceStart > 0.45) return 1;
  const k = sinceStart / 0.45;
  return 1 - 0.12 * Math.sin(k * Math.PI) * (1 - k * 0.5);
}
