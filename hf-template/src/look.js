import * as THREE from 'three';
import { UnrealBloomPass } from './vendor/three-addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from './vendor/three-addons/postprocessing/Pass.js';

// Moderate cinematic "coaster look" for the 3D scene only (captions, wipe and thumbnail text are HTML on top,
// so they are never touched). Deterministic: no clocks, no randomness, fixed resolution.
//
// Chain per frame:
//   1. base pass: the scene renders into a half-float MSAA target with the same per-material ACES filmic tone
//      mapping as the canvas (so `toneMapped: false` surfaces like the board stay exact); sRGB is encoded at the end.
//   2. glow pass: only glowing meshes (emissive lamps, neon, Tito's antenna, additive FX) over black, HDR,
//      then UnrealBloomPass. Selective on purpose: a luminance threshold would also bloom the white board.
//   3. final quad to the canvas: base + soft bloom, light split-tone grade (warm highlights, cool shadows),
//      a touch of saturation/contrast, and a vignette.
// Fog stays owned by each location (src/locations/*: `fog: [color, near, far]`); the look only scales it.
//
// Tune here. Disable everything with `enabled: false`; per episode with `"look": false` in the episode JSON,
// or override single values with `"look": { "bloom": { "strength": 0.4 }, "vignette": 0 }`.
export const LOOK = {
  enabled: true,
  bloom: {
    strength: 0.55,  // UnrealBloomPass strength
    radius: 0.45,    // 0..1, spread of the halo
    threshold: 0.2,  // luminance cut inside the glow pass (dim lit faces of glowing meshes do not bloom)
    minEmissive: 0.45, // a material glows when luminance(emissive) * emissiveIntensity >= this
    mix: 0.85,       // how much of the halo is screened onto the frame
  },
  grade: {
    shadowTint: [0.93, 0.98, 1.08], // multiplied into the darks (cool)
    shadowAmount: 0.5,
    highTint: [1.06, 1.0, 0.92],   // multiplied into the highlights (warm)
    highAmount: 0.45,
    saturation: 1.05,
    contrast: 0.08,  // 0 = none, blend toward an S-curve
  },
  vignette: 0.22,    // 0 = none; darkening at the corners
  fog: { nearScale: 0.9, farScale: 0.95 }, // applied once to each location's fog while the look is on
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over ?? {})) out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
  return out;
}

/** Look config for an episode: null when disabled (globally or with `"look": false`). */
export function resolveLook(episode) {
  const ov = episode?.look;
  if (ov === false || ov?.enabled === false) return null;
  const cfg = isObj(ov) ? merge(LOOK, ov) : LOOK;
  return cfg.enabled ? cfg : null;
}

const luma = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; // THREE.Color stores linear values

/** Whether a material feeds the bloom. `material.userData.glow = true|false` forces it. */
function glows(m, minEmissive) {
  if (m.userData.glow !== undefined) return !!m.userData.glow;
  if (m.isMeshBasicMaterial && m.blending === THREE.AdditiveBlending) return true;
  return !!m.emissive && luma(m.emissive) * (m.emissiveIntensity ?? 1) >= minEmissive;
}

const GradeShader = {
  uniforms: {
    tBase: { value: null }, tBloom: { value: null }, bloomMix: { value: 1 },
    shadowTint: { value: new THREE.Vector3() }, highTint: { value: new THREE.Vector3() },
    shadowAmount: { value: 0 }, highAmount: { value: 0 }, saturation: { value: 1 }, contrast: { value: 0 },
    vignette: { value: 0 }, aspect: { value: 1 },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tBase, tBloom;
    uniform vec3 shadowTint, highTint;
    uniform float bloomMix, shadowAmount, highAmount, saturation, contrast, vignette, aspect;
    varying vec2 vUv;
    vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main() {
      vec3 lin = clamp(texture2D(tBase, vUv).rgb, 0.0, 1.0); // tone-mapped, linear
      vec3 halo = 1.0 - exp(-max(texture2D(tBloom, vUv).rgb, 0.0) * bloomMix); // soft-clipped HDR halo
      lin = lin + (1.0 - lin) * halo; // screen blend: never blows out to flat white
      vec3 c = toSRGB(clamp(lin, 0.0, 1.0));
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(c, c * shadowTint, (1.0 - smoothstep(0.0, 0.45, l)) * shadowAmount);
      c = mix(c, c * highTint, smoothstep(0.55, 1.0, l) * highAmount);
      l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = clamp(mix(vec3(l), c, saturation), 0.0, 1.0);
      c = mix(c, c * c * (3.0 - 2.0 * c), contrast);
      vec2 d = (vUv - 0.5) * vec2(aspect, 1.0) / max(aspect, 1.0) * 2.0; // 0 center .. ~1 at the long edge
      c *= 1.0 - vignette * smoothstep(0.45, 1.25, length(d));
      gl_FragColor = vec4(c, 1.0);
    }`,
};

/**
 * Wraps scene rendering with the look. Returns { render() } that replaces `renderer.render(scene, camera)`.
 * With cfg === null it renders straight to the canvas (exactly the pre-look pipeline).
 */
export function createLook(renderer, scene, camera, width, height, cfg) {
  if (!cfg) return { render: () => renderer.render(scene, camera) };

  // The XR flag makes three apply per-material tone mapping (as on the canvas, honoring `toneMapped: false`)
  // while rendering offscreen. The target keeps the default (linear) color space: an sRGB texture would get an
  // SRGB8 format that the MSAA resolve cannot blit into from the RGBA renderbuffer. Half float avoids banding.
  const base = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
  base.texture.colorSpace = THREE.LinearSRGBColorSpace; // NoColorSpace would break the XR output path
  base.isXRRenderTarget = true;
  const glowRT = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), cfg.bloom.strength, cfg.bloom.radius, cfg.bloom.threshold);
  const black = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
  const BLACK_BG = new THREE.Color(0x000000);

  const mat = new THREE.ShaderMaterial({ ...GradeShader, uniforms: THREE.UniformsUtils.clone(GradeShader.uniforms), depthTest: false, depthWrite: false });
  const u = mat.uniforms;
  const g = cfg.grade;
  u.tBase.value = base.texture;
  u.tBloom.value = bloom.renderTargetsHorizontal[0].texture; // the composited halo only (not glow + halo)
  u.bloomMix.value = cfg.bloom.mix;
  u.shadowTint.value.set(...g.shadowTint); u.highTint.value.set(...g.highTint);
  u.shadowAmount.value = g.shadowAmount; u.highAmount.value = g.highAmount;
  u.saturation.value = g.saturation; u.contrast.value = g.contrast;
  u.vignette.value = cfg.vignette; u.aspect.value = width / height;
  const quad = new FullScreenQuad(mat);

  const scaledFog = new WeakSet();
  const swapped = [];
  const hidden = [];

  function glowPass() {
    scene.traverseVisible((o) => {
      if (o.isMesh) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        if (!ms.some((m) => glows(m, cfg.bloom.minEmissive))) { swapped.push([o, o.material]); o.material = black; }
      } else if (o.isPoints || o.isLine || o.isSprite) { hidden.push(o); }
    });
    for (const o of hidden) o.visible = false;
    const bg = scene.background;
    const shadowAuto = renderer.shadowMap.autoUpdate;
    scene.background = BLACK_BG;
    renderer.shadowMap.autoUpdate = false; // reuse this frame's shadow maps from the base pass
    renderer.setRenderTarget(glowRT);
    renderer.clear();
    renderer.render(scene, camera);
    bloom.render(renderer, null, glowRT, 0, false);
    renderer.shadowMap.autoUpdate = shadowAuto;
    scene.background = bg;
    for (const [o, m] of swapped) o.material = m;
    for (const o of hidden) o.visible = true;
    swapped.length = 0; hidden.length = 0;
  }

  function render() {
    if (scene.fog && !scaledFog.has(scene.fog)) {
      scaledFog.add(scene.fog);
      if (scene.fog.isFog) { scene.fog.near *= cfg.fog.nearScale; scene.fog.far *= cfg.fog.farScale; }
    }
    renderer.setRenderTarget(base);
    renderer.clear();
    renderer.render(scene, camera);
    glowPass();
    renderer.setRenderTarget(null);
    quad.render(renderer);
  }

  return { render };
}
