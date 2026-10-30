// Branding compositor: 2D night-skyline backdrop + transparent 3D layer with the v2 characters + HTML type.
// Uses an orthographic camera where 1 world unit = `ppu` pixels, so layouts can be specified in pixels.
import * as THREE from 'three';
import { createProfe, createTito, addStudioLights } from '../characters-v2/src/index.js';
import { rng } from '../characters-v2/src/util.js';

export const COLORS = {
  night: '#0b1230', dusk: '#1d2a5a', haze: '#3a3a6a', ink: '#0a0a14',
  yellow: '#ffd23a', red: '#e0402f', brown: '#9a6236', teal: '#1f8a8a', cream: '#f4efd2', window: '#ffd27a',
};

/** Paints the brand night skyline into a canvas. opts: {moon:[x,y,size], glow:[x,y,r], horizon:0..1} */
export function paintSkyline(canvas, { seed = 42, moon = null, glow = null, horizon = 1, density = 1, roof = null } = {}) {
  const W = canvas.width, H = canvas.height, g = canvas.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.night); sky.addColorStop(0.6, COLORS.dusk); sky.addColorStop(1, COLORS.haze);
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  if (glow) {
    const [gx, gy, gr] = glow;
    const rg = g.createRadialGradient(gx, gy, 0, gx, gy, gr);
    rg.addColorStop(0, 'rgba(255,190,90,0.55)'); rg.addColorStop(0.5, 'rgba(255,140,80,0.18)'); rg.addColorStop(1, 'rgba(255,140,80,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  }
  const r = rng(seed);
  const base = roof ?? H;
  const u = Math.max(W, H) / 2048; // scale unit
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 160 * density; i++) g.fillRect(r() * W, r() * H * 0.5, 3 * u, 3 * u);
  if (moon) {
    // round moon with a soft halo: [x, y, diameter] (top-left corner of its box)
    const [mx, my, md] = moon, cx = mx + md / 2, cy = my + md / 2;
    const halo = g.createRadialGradient(cx, cy, md * 0.4, cx, cy, md * 1.6);
    halo.addColorStop(0, "rgba(244,239,210,0.35)"); halo.addColorStop(1, "rgba(244,239,210,0)");
    g.fillStyle = halo; g.fillRect(cx - md * 2, cy - md * 2, md * 4, md * 4);
    g.fillStyle = COLORS.cream; g.beginPath(); g.arc(cx, cy, md / 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(200,190,160,0.5)";
    for (const [ox, oy, rr] of [[-0.15, -0.1, 0.1], [0.12, 0.08, 0.07], [-0.02, 0.2, 0.05]]) { g.beginPath(); g.arc(cx + ox * md, cy + oy * md, rr * md, 0, Math.PI * 2); g.fill(); }
  }
  const layers = [
    { shade: '#18204a', min: 0.32, max: 0.62, lit: 0.22 },
    { shade: '#0c112a', min: 0.18, max: 0.44, lit: 0.42 },
  ];
  for (const L of layers) {
    let x = -20 * u;
    while (x < W) {
      const w = (90 + r() * 170) * u;
      const h = (L.min + r() * (L.max - L.min)) * H * horizon;
      g.fillStyle = L.shade; g.fillRect(x, base - h, w, h);
      for (let wy = base - h + 18 * u; wy < base - 20 * u; wy += 30 * u) {
        for (let wx = x + 12 * u; wx < x + w - 18 * u; wx += 24 * u) {
          if (r() < L.lit) { g.fillStyle = r() < 0.8 ? COLORS.window : '#bfe3ff'; g.fillRect(wx, wy, 12 * u, 16 * u); }
        }
      }
      x += w + (4 + r() * 20) * u;
    }
  }
  if (roof !== null) {
    // rooftop ledge the characters stand on
    g.fillStyle = "#2a2148"; g.fillRect(0, roof, W, H - roof);
    g.fillStyle = "#4a3a6e"; g.fillRect(0, roof, W, 10 * u);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, roof + 10 * u, W, 14 * u);
  }
}

/**
 * Creates a transparent 3D layer. cast: [{who:'profe'|'tito', px:[x,y] (feet, in pixels), scale, yaw, state}]
 * Returns {canvas, render(t)}.
 */
export function create3DLayer(container, { width, height, ppu, cast, tilt = 0.1, shadow = true }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const W = width / ppu, H = height / ppu;
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 100);
  cam.position.set(0, Math.sin(tilt) * 30, Math.cos(tilt) * 30);
  cam.lookAt(0, 0, 0);
  // world point for a pixel position on the ground plane (y=0 at pixel row py)
  const toWorldX = (px) => (px - width / 2) / ppu;
  const toWorldY = (py) => (height / 2 - py) / ppu / Math.cos(tilt);

  const lights = addStudioLights(scene, { shadows: shadow });
  const actors = cast.map((c) => {
    const a = c.who === 'profe' ? createProfe() : createTito();
    a.group.scale.setScalar(c.scale ?? 1);
    a.group.position.set(toWorldX(c.px[0]), toWorldY(c.px[1]), c.z ?? 0);
    a.group.rotation.y = c.yaw ?? 0;
    scene.add(a.group);
    return { a, c };
  });
  if (shadow) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.35 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = toWorldY(cast[0]?.px[1] ?? height);
    floor.receiveShadow = true;
    scene.add(floor);
    lights.children.forEach((l) => { if (l.isSpotLight) { l.position.set(2, 8, 8); l.target.position.set(0, floor.position.y, 0); l.distance = 0; l.decay = 0; l.intensity = 3.2; } });
  }
  return {
    canvas: renderer.domElement,
    render(t = 1.3) {
      for (const { a, c } of actors) a.update({ t, ...(c.state || {}) });
      renderer.render(scene, cam);
    },
  };
}

/** Logo markup: "HISTORIA EN" over a row of cube tiles spelling "CUBITOS". */
export function logoHTML() {
  const tiles = ['C', 'U', 'B', 'I', 'T', 'O', 'S']
    .map((ch, i) => `<span class="tile t${i % 4}" style="--r:${[-4, 3, -2, 4, -3, 2, -4][i]}deg">${ch}</span>`).join('');
  return `<div class="logo"><div class="l1">HISTORIA EN</div><div class="l2">${tiles}</div></div>`;
}

/** Shrinks font-size of `el` until it fits its box. */
export function fitText(el, max, min = 20) {
  let s = max;
  el.style.fontSize = s + 'px';
  while (s > min && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)) {
    s -= 4; el.style.fontSize = s + 'px';
  }
  return s;
}
