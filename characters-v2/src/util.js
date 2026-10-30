import * as THREE from 'three';

// Shared helpers for v2 low-poly box characters.
// Everything here is deterministic: no Math.random, no clocks.

export const PALETTE = {
  profe: 0x9a6236,      // cardboard brown
  profeDark: 0x5b3a1f,  // legs / shadows
  profeArm: 0x845230,
  mustache: 0x2e1a0c,
  glasses: 0x141414,
  lens: 0xeef3f6,
  bowtie: 0x1f8a8a,     // teal accent
  stick: 0xd9b26a,
  chalk: 0xf2efe6,
  tito: 0xe0402f,       // tomato red
  titoDark: 0x8e1f18,
  titoArm: 0xc23526,
  antenna: 0x2b2b2b,
  glow: 0xffd23a,       // antenna tip yellow
  eyeWhite: 0xfbfbf7,
  pupil: 0x121212,
  mouth: 0x3a0a06,
  tongue: 0xff7a8a,
  rim: 0xdcd6cc,        // neutral soft rim (keeps sides in the character color)
};

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOutBack = (x) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// Seeded RNG (mulberry32). Use for any "random" detail so output stays deterministic.
export function rng(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- materials ----------

// Adds a soft fresnel rim to a MeshStandardMaterial so silhouettes pop against dark sets.
function addRim(material, color, strength) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: new THREE.Color(color) };
    shader.uniforms.rimStrength = { value: strength };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;\nuniform float rimStrength;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 vdir = normalize(vViewPosition);
          float fr = pow(1.0 - clamp(abs(dot(normal, vdir)), 0.0, 1.0), 2.5);
          totalEmissiveRadiance += rimColor * fr * rimStrength;
        }`);
  };
  material.customProgramCacheKey = () => `rim-${strength}`;
  return material;
}

const materialCache = new Map();

/** Cached flat-shaded standard material with a soft rim. opts: any MeshStandardMaterial params + rim (0..1). */
export function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts, (k, v) => (v && v.isTexture ? v.uuid : v))}`;
  if (!materialCache.has(key)) {
    const { rim = 0.08, ...rest } = opts;
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, flatShading: true, ...rest });
    if (rim > 0) addRim(m, PALETTE.rim, rim);
    materialCache.set(key, m);
  }
  return materialCache.get(key);
}

let cardboardTex = null;
/** Procedural cardboard / wood-grain texture (seeded canvas). Subtle; multiplies the base color. */
export function cardboardTexture() {
  if (cardboardTex || typeof document === 'undefined') return cardboardTex;
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, N, N);
  const r = rng(7);
  // horizontal fibers
  for (let i = 0; i < 90; i++) {
    const y = r() * N, a = 0.04 + r() * 0.07;
    g.fillStyle = `rgba(90,55,25,${a * 0.5})`;
    g.fillRect(0, y, N, 1 + r() * 2);
  }
  // speckles
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(70,40,15,${0.04 + r() * 0.06})`;
    g.fillRect(r() * N, r() * N, 2, 2);
  }
  cardboardTex = new THREE.CanvasTexture(c);
  cardboardTex.wrapS = cardboardTex.wrapT = THREE.RepeatWrapping;
  cardboardTex.colorSpace = THREE.SRGBColorSpace;
  return cardboardTex;
}

// ---------- geometry ----------

const geoCache = new Map();

/** Box with chamfered (bevelled) edges. bevel is in world units. Centered on origin. */
export function bevelGeometry(w, h, d, bevel) {
  const key = `${w}|${h}|${d}|${bevel}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const b = Math.min(bevel, w / 3, h / 3, d / 3);
  const iw = w / 2 - b, ih = h / 2 - b;
  const s = new THREE.Shape();
  s.moveTo(-iw, -ih); s.lineTo(iw, -ih); s.lineTo(iw, ih); s.lineTo(-iw, ih); s.lineTo(-iw, -ih);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1,
  });
  geo.translate(0, 0, -(d - 2 * b) / 2);
  geo.computeVertexNormals();
  geoCache.set(key, geo);
  return geo;
}

/** Mesh helpers. bevel > 0 uses chamfered geometry. */
export function box(w, h, d, color, opts = {}) {
  const { bevel = 0, ...mopts } = opts;
  const geo = bevel > 0 ? bevelGeometry(w, h, d, bevel) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat(color, mopts));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function at(obj, x, y, z) {
  obj.position.set(x, y, z);
  return obj;
}

// ---------- deterministic motion ----------

/** Eyelid closure 0..1. Blinks every `period`s, with a double-blink every 3rd cycle. */
export function blinkAt(t, period, offset) {
  const tt = t + offset;
  const cycle = Math.floor(tt / period);
  const p = tt - cycle * period;
  const d = 0.13;
  const one = (x) => (x >= 0 && x <= d ? Math.sin((x / d) * Math.PI) : 0);
  return Math.max(one(p), cycle % 3 === 2 ? one(p - 0.22) : 0);
}

/** Squash/stretch after an event (sinceEvent seconds). Returns {y, xz}. strength ~0.12..0.25 */
export function squashAt(sinceEvent, strength = 0.12, dur = 0.5) {
  if (!(sinceEvent >= 0) || sinceEvent > dur) return { y: 1, xz: 1 };
  const k = sinceEvent / dur;
  // squash down, overshoot stretch, settle
  const s = -Math.sin(k * Math.PI * 2) * (1 - k) * strength;
  return { y: 1 + s, xz: 1 - s * 0.6 };
}

/** Small hop height after an event (0 outside). */
export function hopAt(sinceEvent, height = 0.12, dur = 0.42) {
  if (!(sinceEvent >= 0) || sinceEvent > dur) return 0;
  const k = sinceEvent / dur;
  return Math.sin(k * Math.PI) * height * (k > 0.15 ? 1 : k / 0.15);
}

/** Pose blend weight: 0 at change, 1 after `dur` seconds. Missing value = fully blended. */
export function blendIn(since, dur = 0.35) {
  if (since === undefined || since === null || since < 0) return 1;
  return smooth(since / dur);
}

/** Discrete mouth shape from amplitude. Returns 'closed' | 'half' | 'open'. */
export function mouthLevel(amp) {
  if (amp < 0.12) return 'closed';
  if (amp < 0.45) return 'half';
  return 'open';
}

const _v = new THREE.Vector3();
/**
 * Converts a look target (world Vector3/{x,y,z}/[x,y,z]) into a local direction relative to `obj` at `localOrigin`.
 * Returns {x, y} in -1..1 (right/up) or null.
 */
export function lookDir(obj, target, localOrigin) {
  if (!target) return null;
  const tx = Array.isArray(target) ? target[0] : target.x;
  const ty = Array.isArray(target) ? target[1] : target.y;
  const tz = Array.isArray(target) ? target[2] : target.z;
  obj.updateWorldMatrix(true, false);
  _v.set(tx, ty, tz);
  obj.worldToLocal(_v);
  _v.sub(localOrigin);
  const fwd = Math.max(0.3, _v.z);
  return { x: clamp(_v.x / fwd, -1.5, 1.5) / 1.5, y: clamp(_v.y / fwd, -1.5, 1.5) / 1.5 };
}

/** Local direction (in parent space of `obj`) toward a world target. */
export function localPointDir(parent, target, localOrigin) {
  const tx = Array.isArray(target) ? target[0] : target.x;
  const ty = Array.isArray(target) ? target[1] : target.y;
  const tz = Array.isArray(target) ? target[2] : target.z;
  parent.updateWorldMatrix(true, false);
  _v.set(tx, ty, tz);
  parent.worldToLocal(_v);
  return _v.sub(localOrigin).normalize().clone();
}
