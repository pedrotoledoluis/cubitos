import * as THREE from 'three';
import { BOARD, boardScreen, box, at, rng, canvasTexture, backdrop, cylinder, ownMat, flicker } from './common.js';

// Modern-topic locations (episodes 11+), built from one small factory: a painted panorama backdrop,
// a floor, a framed board surface at BOARD, a few animated 3D props and lights.
// casino, trading_floor, data_center, game_studio, peru_coast, celtic_night, lima_night.

const glow = (color, intensity = 1.4) => ownMat(color, { emissive: color, emissiveIntensity: intensity });

/** Generic builder. cfg: { sky(g,W,H), floor, frame, props(set) -> [update fns], lights: { hemi, key, fill, points } }. */
function makeLocation(name, cfg) {
  function build({ boardTexture }) {
    const set = new THREE.Group();
    const floor = at(box(40, 0.2, 40, cfg.floor, cfg.floorMap ? { map: cfg.floorMap() } : {}), 0, -0.1, -4);
    floor.castShadow = false; floor.receiveShadow = true;
    set.add(floor);
    set.add(backdrop(canvasTexture(2048, 1024, cfg.sky), 60, 30, 0, 9, -14));
    const B = BOARD;
    set.add(at(box(B.w + 0.3, B.h + 0.3, 0.12, cfg.frame ?? 0x15151a), B.x, B.y, B.z - 0.02));
    if (cfg.stand !== false) for (const sx of [-1, 1]) set.add(at(box(0.12, B.y, 0.12, cfg.frame ?? 0x15151a), B.x + sx * (B.w / 2 - 0.2), B.y / 2, B.z - 0.1));
    set.add(boardScreen(boardTexture));
    const updates = cfg.props?.(set) ?? [];

    const L = cfg.lights ?? {};
    set.add(new THREE.HemisphereLight(L.hemi?.[0] ?? 0xbfd0ff, L.hemi?.[1] ?? 0x202430, L.hemi?.[2] ?? 1.0));
    const key = new THREE.DirectionalLight(L.key?.[0] ?? 0xffffff, L.key?.[1] ?? 1.5);
    key.position.set(-4, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    key.shadow.bias = -0.0006;
    set.add(key);
    const fill = new THREE.DirectionalLight(L.fill?.[0] ?? 0xffe8d0, L.fill?.[1] ?? 0.9);
    fill.position.set(3, 4, 7);
    set.add(fill);

    function update(t) { updates.forEach((u) => u(t)); }
    update(0);
    return { group: set, update, background: cfg.background ?? 0x101018, fog: cfg.fog ?? null, exposure: cfg.exposure ?? 1.2, boardStyle: cfg.boardStyle ?? 'screen' };
  }
  return { name, build };
}

/** Row of small blinking lights; returns update fn. */
function blinkers(set, pts, colors, speed = 2) {
  const mats = pts.map((p, i) => {
    const m = glow(colors[i % colors.length], 1.2);
    set.add(at(new THREE.Mesh(new THREE.BoxGeometry(p[3] ?? 0.12, p[3] ?? 0.12, 0.06), m), p[0], p[1], p[2]));
    return m;
  });
  return (t) => mats.forEach((m, i) => { m.emissiveIntensity = (Math.floor(t * speed + i * 0.61) % 2) ? 1.6 : 0.2; });
}

/** Neon sign: thin glowing bars forming a rectangle frame, with a flicker. */
function neonFrame(set, x, y, z, w, h, color, seed = 0) {
  const m = glow(color, 2);
  for (const [px, py, sw, sh] of [[0, h / 2, w, 0.06], [0, -h / 2, w, 0.06], [-w / 2, 0, 0.06, h], [w / 2, 0, 0.06, h]]) set.add(at(new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 0.05), m), x + px, y + py, z));
  return (t) => { m.emissiveIntensity = 2 * flicker(t, seed) * ((Math.floor(t * 0.7 + seed) % 7) === 3 && (t * 10 % 3) < 1 ? 0.3 : 1); };
}

// ---------------------------------------------------------------- casino
const casino = makeLocation('casino', {
  floor: 0x5a1420, frame: 0xc99a2e, boardStyle: 'screen', background: 0x1a0a10, fog: [0x1a0a10, 18, 40],
  sky: (g, W, H) => {
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#2a0d18'); grd.addColorStop(1, '#4a1424');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    const r = rng(3);
    for (let i = 0; i < 14; i++) { // slot machine silhouettes with lit screens
      const x = 40 + i * 145, y = H * 0.62;
      g.fillStyle = '#1a0a10'; g.fillRect(x, y, 110, 300);
      g.fillStyle = ['#8a6a1a', '#7a2a3e', '#2a6a7a'][i % 3]; g.fillRect(x + 15, y + 30, 80, 60);
    }
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,220,120,${0.3 + r() * 0.6})`; g.beginPath(); g.arc(r() * W, r() * H * 0.35, 3, 0, 7); g.fill(); }
    g.font = '900 120px Arial Black'; g.textAlign = 'center'; g.fillStyle = '#ffd23a'; g.globalAlpha = 0.5; g.fillText('CASINO', W / 2, 160); g.globalAlpha = 1;
  },
  props: (set) => {
    // green felt roulette table at the left, spinning wheel
    const table = at(box(2.6, 0.9, 1.6, 0x3a2414), -4.2, 0.45, -1.8); set.add(table);
    set.add(at(box(2.5, 0.06, 1.5, 0x1f7a3a), -4.2, 0.93, -1.8));
    const wheel = new THREE.Group();
    for (let i = 0; i < 18; i++) { const s = at(box(0.12, 0.05, 0.42, i === 0 ? 0x2fa85a : i % 2 ? 0xd33a32 : 0x1a1a1a), Math.cos(i / 18 * Math.PI * 2) * 0.35, 0, Math.sin(i / 18 * Math.PI * 2) * 0.35); s.rotation.y = -i / 18 * Math.PI * 2; wheel.add(s); }
    wheel.add(box(0.3, 0.12, 0.3, 0xe2b33c, { metalness: 0.6 }));
    wheel.position.set(-4.6, 1.02, -1.8); set.add(wheel);
    // chip stacks
    const chips = [];
    for (let i = 0; i < 4; i++) { const c = cylinder(0.14, 0.06 * (3 + i), [0xd33a32, 0x1f5fbf, 0x2fa85a, 0xf4efe6][i], 10); c.position.set(3.4 + i * 0.4, 0.9 + 0.03 * (3 + i), -1.6); set.add(c); chips.push(c); }
    set.add(at(box(2.2, 0.9, 1.2, 0x1f7a3a), 4.0, 0.45, -1.6));
    // slot machine on the right with a rolling reel screen
    const slot = at(box(1.0, 1.9, 0.8, 0xb8282e), 5.6, 0.95, -3.2); set.add(slot);
    const reel = glow(0xffd23a, 1.4);
    set.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.05), reel), 5.6, 1.3, -2.79));
    const blink = blinkers(set, Array.from({ length: 14 }, (_, i) => [-6 + i * 0.95, 5.6, -5, 0.16]), [0xffd23a, 0xff4a7a, 0xffffff], 3);
    const lamp = new THREE.PointLight(0xffc070, 8, 10, 1.5); lamp.position.set(0, 4, 0.5); set.add(lamp);
    return [blink, (t) => { wheel.rotation.y = t * 2.2; reel.color.setHSL((t * 0.8) % 1, 0.8, 0.55); reel.emissive.copy(reel.color); }];
  },
  lights: { hemi: [0xffd0a0, 0x301018, 1.0], key: [0xfff0dd, 1.4], fill: [0xffc0a0, 0.9] },
});

// ---------------------------------------------------------------- trading floor (stock exchange / crypto)
const trading_floor = makeLocation('trading_floor', {
  floor: 0x22262e, frame: 0x101318, boardStyle: 'screen', background: 0x0a0e16, fog: [0x0a0e16, 18, 40],
  sky: (g, W, H) => {
    g.fillStyle = '#0e1420'; g.fillRect(0, 0, W, H);
    const r = rng(11);
    for (let s = 0; s < 6; s++) { // wall of chart screens
      const x = 60 + s * 330, y = 120;
      g.fillStyle = '#05080e'; g.fillRect(x, y, 300, 200);
      g.strokeStyle = s % 2 ? '#3ce07a' : '#ff5a5a'; g.lineWidth = 5; g.beginPath();
      let v = 100; for (let i = 0; i <= 20; i++) { v += (r() - 0.48) * 30; g.lineTo(x + 10 + i * 14, y + 100 + Math.max(-80, Math.min(80, v - 100))); } g.stroke();
    }
    // ticker band
    g.fillStyle = '#000'; g.fillRect(0, 380, W, 70);
    g.font = '900 48px Arial Black'; g.fillStyle = '#3ce07a';
    g.fillText('BTC ▲   ETH ▼   NVDA ▲   SOL ▲   NASDAQ ▲   DOGE ▼   ', 20, 432);
    g.fillStyle = '#18202e'; g.fillRect(0, H * 0.5, W, H * 0.5);
  },
  props: (set) => {
    const mons = [];
    const mk = (x, z, ry) => {
      set.add(at(box(1.6, 0.85, 0.8, 0x3b4252), x, 0.42, z));
      for (const dx of [-0.38, 0.38]) {
        const m = glow(0x0f2e46, 1); const scr = at(new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.44, 0.05), m), x + dx, 1.25, z - 0.1); scr.rotation.y = ry; set.add(scr); mons.push(m);
      }
    };
    mk(-4.4, -1.6, 0.25); mk(4.0, -1.6, -0.25); mk(-5.6, -3.6, 0.2); mk(5.4, -3.6, -0.2);
    // ticker tape band (3D) scrolling: blocks of green/red
    const tape = new THREE.Group();
    for (let i = 0; i < 40; i++) tape.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.04), glow(i % 3 ? 0x3ce07a : 0xff5a5a, 1.5)), i * 0.6, 0, 0));
    tape.position.set(-12, 0.25, -3.6); set.add(tape); // low on the floor edge, below the caption area
    // floating coin
    const coin = new THREE.Group();
    const c = cylinder(0.45, 0.08, 0xf2a900, 16, { metalness: 0.6, roughness: 0.3 }); c.rotation.x = Math.PI / 2; coin.add(c);
    coin.add(at(box(0.18, 0.4, 0.1, 0xffffff), 0, 0, 0.05));
    coin.position.set(3.6, 3.2, -2.4); set.add(coin);
    const glowL = new THREE.PointLight(0x6fb8ff, 5, 9, 1.5); glowL.position.set(0, 3.5, -1.5); set.add(glowL);
    return [(t) => {
      tape.position.x = -12 - ((t * 0.8) % 12); // scrolls along the desk line
      coin.rotation.y = t * 1.8; coin.position.y = 3.2 + Math.sin(t * 1.5) * 0.15;
      mons.forEach((m, i) => { m.emissive.setHex((Math.floor(t * 0.7 + i) % 2) ? 0x14502e : 0x50141a); });
    }];
  },
  lights: { hemi: [0x9ab8ff, 0x202430, 1.0], key: [0xffffff, 1.5], fill: [0xbfe3ff, 0.9] },
});

// ---------------------------------------------------------------- data center (AI chips, HBM)
const data_center = makeLocation('data_center', {
  floor: 0x2a3038, frame: 0x0e1a22, boardStyle: 'holo', background: 0x05080e, fog: [0x05080e, 16, 36],
  sky: (g, W, H) => {
    g.fillStyle = '#070b12'; g.fillRect(0, 0, W, H);
    for (let r = 0; r < 12; r++) { // far racks
      const x = 20 + r * 170; g.fillStyle = '#121a24'; g.fillRect(x, 200, 140, 700);
      for (let i = 0; i < 26; i++) { g.fillStyle = (i + r) % 4 ? '#2ad8ff' : '#7dff8a'; g.fillRect(x + 12, 220 + i * 26, 6, 6); g.fillStyle = '#1c2836'; g.fillRect(x + 26, 220 + i * 26, 100, 14); }
    }
  },
  props: (set) => {
    const pts = [];
    for (const sx of [-1, 1]) for (let r = 0; r < 3; r++) {
      const x = sx * (3.6 + r * 1.3), z = -1.8 - r * 0.6;
      set.add(at(box(1.0, 2.8, 1.1, 0x1a222c), x, 1.4, z));
      for (let i = 0; i < 9; i++) pts.push([x - 0.3, 0.4 + i * 0.28, z + 0.56, 0.08], [x - 0.15, 0.4 + i * 0.28, z + 0.56, 0.08]);
    }
    const blink = blinkers(set, pts, [0x2ad8ff, 0x7dff8a, 0x2ad8ff, 0xffb000], 4);
    // big glowing GPU chip with HBM stacks on a pedestal at the right
    const chip = new THREE.Group();
    chip.add(box(1.2, 0.12, 1.2, 0x2a6a3a));
    chip.add(at(box(0.5, 0.14, 0.5, 0x8a96a8, { metalness: 0.7 }), 0, 0.1, 0));
    const hbm = [];
    for (const [hx, hz] of [[-0.42, -0.3], [-0.42, 0.3], [0.42, -0.3], [0.42, 0.3]]) { const s = new THREE.Group(); for (let k = 0; k < 4; k++) s.add(at(box(0.22, 0.05, 0.26, k % 2 ? 0x30343c : 0x4a5060), 0, 0.1 + k * 0.06, 0)); s.position.set(hx, 0, hz); chip.add(s); hbm.push(s); }
    chip.position.set(5.2, 1.6, -1.2); chip.rotation.x = 0.5; set.add(chip);
    set.add(at(box(0.6, 1.4, 0.6, 0x1a222c), 5.2, 0.7, -1.3));
    const cyan = new THREE.PointLight(0x2ad8ff, 6, 9, 1.5); cyan.position.set(0, 3.2, -1); set.add(cyan);
    return [blink, (t) => { chip.rotation.y = t * 0.6; hbm.forEach((s, i) => (s.position.y = 0.04 * Math.max(0, Math.sin(t * 3 + i)))); cyan.intensity = 6 + Math.sin(t * 2) * 1; }];
  },
  lights: { hemi: [0x8ad8ff, 0x101820, 1.0], key: [0xe0f4ff, 1.4], fill: [0xbfe3ff, 1.0] },
});

// ---------------------------------------------------------------- game studio
const game_studio = makeLocation('game_studio', {
  floor: 0x3a3048, frame: 0x15121c, boardStyle: 'screen', background: 0x140f1e, fog: [0x140f1e, 18, 40],
  sky: (g, W, H) => {
    g.fillStyle = '#1c1530'; g.fillRect(0, 0, W, H);
    // pixel-art posters
    const r = rng(5);
    for (let p = 0; p < 5; p++) {
      const x = 80 + p * 400, y = 160; g.fillStyle = '#0c0a14'; g.fillRect(x, y, 300, 380);
      for (let i = 0; i < 12; i++) for (let j = 0; j < 15; j++) if (r() < 0.35) { g.fillStyle = ['#ff4a7a', '#4ae0ff', '#ffd23a', '#7dff8a'][(i + j + p) % 4]; g.fillRect(x + 10 + i * 24, y + 10 + j * 24, 22, 22); }
    }
    g.fillStyle = '#2a2040'; g.fillRect(0, H * 0.62, W, H * 0.38);
  },
  props: (set) => {
    const desks = [];
    for (const [x, z] of [[-4.3, -1.6], [4.2, -1.6]]) {
      set.add(at(box(1.8, 0.85, 0.9, 0x5a4a6a), x, 0.42, z));
      const m = glow(0x4ae0ff, 1); set.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.05), m), x, 1.3, z - 0.2)); desks.push(m);
      set.add(at(box(0.4, 0.08, 0.3, 0x222228), x + 0.6, 0.9, z + 0.2)); // gamepad
    }
    // floating pixel heart and coin
    const heart = new THREE.Group();
    for (const [x, y] of [[-1, 1], [1, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, -1], [0, -1], [1, -1], [0, -2], [-2, 1], [2, 1]]) heart.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), glow(0xff4a7a, 1.3)), x * 0.16, y * 0.16, 0));
    heart.position.set(-3.6, 4.2, -2.4); set.add(heart);
    const coin = new THREE.Group();
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (i * i + j * j <= 5) coin.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.1), glow(0xffd23a, 1.2)), i * 0.14, j * 0.14, 0));
    coin.position.set(3.4, 4.4, -2.4); set.add(coin);
    const l = new THREE.PointLight(0xc070ff, 6, 9, 1.5); l.position.set(0, 3.5, -1); set.add(l);
    return [(t) => {
      heart.position.y = 4.2 + Math.abs(Math.sin(t * 2.4)) * 0.3; heart.scale.setScalar(1 + 0.08 * Math.sin(t * 6));
      coin.rotation.y = t * 2.5;
      desks.forEach((m, i) => m.emissive.setHSL((t * 0.15 + i * 0.4) % 1, 0.8, 0.45));
    }];
  },
  lights: { hemi: [0xd0b8ff, 0x201830, 1.0], key: [0xffffff, 1.5], fill: [0xffd0f0, 0.9] },
});

// ---------------------------------------------------------------- Peru coast (El Niño)
const peru_coast = makeLocation('peru_coast', {
  floor: 0xe0c894, frame: 0x6b4426, boardStyle: 'wood', background: 0x9ad4f0, fog: [0xbfe4f4, 26, 60], exposure: 1.1,
  sky: (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.55); sky.addColorStop(0, '#5ab4e8'); sky.addColorStop(1, '#cfeefa');
    g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.55);
    g.fillStyle = '#fff2a8'; g.beginPath(); g.arc(1700, 150, 80, 0, 7); g.fill();
    // cliffs (Costa Verde style) on the left
    g.fillStyle = '#b89a6a'; g.beginPath(); g.moveTo(0, H * 0.3); g.lineTo(520, H * 0.42); g.lineTo(700, H * 0.56); g.lineTo(0, H * 0.56); g.fill();
    g.fillStyle = '#8a7048'; for (let i = 0; i < 6; i++) g.fillRect(40 + i * 90, H * 0.36 + i * 12, 60, 8);
    const sea = g.createLinearGradient(0, H * 0.5, 0, H); sea.addColorStop(0, '#2a8ac4'); sea.addColorStop(1, '#1a5a8a');
    g.fillStyle = sea; g.fillRect(500, H * 0.53, W, H * 0.47); g.fillRect(0, H * 0.56, W, H * 0.44);
    g.fillStyle = 'rgba(255,255,255,0.5)'; const r = rng(4); for (let i = 0; i < 40; i++) g.fillRect(r() * W, H * 0.58 + r() * H * 0.4, 40 + r() * 60, 4);
  },
  stand: true,
  props: (set) => {
    // waves: bars sliding in front of the sea
    const waves = [];
    for (let i = 0; i < 3; i++) { const w = at(box(40, 0.12, 0.6, 0x3a9ad4), 0, 0.05, -5 - i * 1.6); w.castShadow = false; set.add(w); waves.push(w); }
    for (let i = 0; i < 3; i++) { const f = at(box(40, 0.14, 0.2, 0xffffff), 0, 0.1, -4.6 - i * 1.6); f.castShadow = false; set.add(f); waves.push(f); }
    // caballito de totora (reed boat) leaning on the sand
    const boat = new THREE.Group();
    for (let i = 0; i < 6; i++) boat.add(at(box(0.5, 0.16, 0.16, 0xc9a94a, { bevel: 0.04 }), -1.2 + i * 0.45, Math.abs(i - 2.5) * 0.1, 0));
    boat.position.set(-4.6, 0.25, -2.0); boat.rotation.y = 0.4; set.add(boat);
    // beach umbrella
    set.add(at(box(0.08, 2.4, 0.08, 0xffffff), 4.6, 1.2, -2.0));
    const umb = at(new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.5, 8), ownMat(0xe23a3a)), 4.6, 2.5, -2.0); set.add(umb);
    // seagull
    const gull = new THREE.Group();
    gull.add(box(0.3, 0.1, 0.12, 0xffffff));
    const wings = [-1, 1].map((s) => { const w = at(box(0.1, 0.03, 0.4, 0xdddddd), 0, 0.02, s * 0.22); gull.add(w); return w; });
    set.add(gull);
    return [(t) => {
      waves.forEach((w, i) => (w.position.z = -5 - (i % 3) * 1.6 + Math.sin(t * 0.9 + i) * 0.25 + (i >= 3 ? 0.4 : 0)));
      umb.rotation.y = t * 0.2;
      gull.position.set(Math.sin(t * 0.3) * 6, 5.5 + Math.sin(t * 1.3) * 0.3, -6 + Math.cos(t * 0.3) * 1.5); gull.rotation.y = -t * 0.3;
      wings.forEach((w, i) => (w.rotation.x = (i ? 1 : -1) * Math.sin(t * 7) * 0.5));
    }];
  },
  lights: { hemi: [0xddf2ff, 0x9a8a60, 1.1], key: [0xfff4e0, 1.8], fill: [0xfff0d8, 0.8] },
});

// ---------------------------------------------------------------- Celtic night (Samhain)
const celtic_night = makeLocation('celtic_night', {
  floor: 0x26402e, frame: 0x4a3420, boardStyle: 'wood', background: 0x080614, fog: [0x140f24, 20, 50],
  sky: (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.7); sky.addColorStop(0, '#0a0818'); sky.addColorStop(1, '#3a1e3a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const r = rng(9); for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(255,255,240,${0.3 + r() * 0.5})`; g.fillRect(r() * W, r() * H * 0.55, 2, 2); }
    g.fillStyle = '#ffeab0'; g.beginPath(); g.arc(1600, 170, 80, 0, 7); g.fill();
    // hills and standing stones silhouettes
    g.fillStyle = '#141a20'; g.beginPath(); g.moveTo(0, H * 0.62); for (let x = 0; x <= W; x += 64) g.lineTo(x, H * 0.6 - Math.sin(x * 0.004) * 60); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = '#0c1014'; for (let i = 0; i < 7; i++) g.fillRect(560 + i * 130, H * 0.5 - (i % 2) * 20, 60, 140 + (i % 2) * 20);
  },
  props: (set) => {
    // standing stones
    for (let i = 0; i < 5; i++) { const a = -1.2 + i * 0.6; const s = at(box(0.7, 2.2 + (i % 2) * 0.5, 0.5, 0x6a6a72), Math.sin(a) * 6, 1.1, -5 - Math.cos(a) * 1.5); s.rotation.y = a; set.add(s); }
    // bonfire
    const logs = new THREE.Group();
    for (let i = 0; i < 4; i++) { const l = at(box(1.0, 0.16, 0.16, 0x4a2a14), 0, 0.12, 0); l.rotation.y = i * Math.PI / 4; logs.add(l); }
    const flames = [0, 1, 2].map((i) => { const f = at(new THREE.Mesh(new THREE.ConeGeometry(0.3 - i * 0.07, 0.9 - i * 0.2, 6), new THREE.MeshBasicMaterial({ color: [0xff5a1a, 0xffa020, 0xffe060][i] })), 0, 0.5 + i * 0.1, 0); logs.add(f); return f; });
    logs.position.set(4.3, 0, -1.4); set.add(logs);
    const fire = new THREE.PointLight(0xff8a3a, 9, 10, 1.4); fire.position.set(4.3, 1.2, -1.2); set.add(fire);
    // turnip lantern (the original jack-o'-lantern) on a stone
    set.add(at(box(0.6, 0.5, 0.6, 0x6a6a72), -4.4, 0.25, -1.6));
    const turnipMat = ownMat(0xe8dcc0, { emissive: 0xff9a30, emissiveIntensity: 0.5 });
    const turnip = at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), turnipMat), -4.4, 0.85, -1.6); set.add(turnip);
    set.add(at(box(0.08, 0.3, 0.08, 0x5a9a3a), -4.4, 1.25, -1.6));
    return [(t) => {
      flames.forEach((f, i) => { const k = flicker(t, i * 3); f.scale.set(1, k * (1 + 0.15 * Math.sin(t * 9 + i)), 1); f.rotation.y = t * (1 + i); });
      fire.intensity = 9 * flicker(t, 5);
      turnipMat.emissiveIntensity = 0.5 * flicker(t, 2);
    }];
  },
  lights: { hemi: [0x8a7cff, 0x101810, 0.8], key: [0xb8c0ff, 1.1], fill: [0xffb070, 1.0] },
});

// ---------------------------------------------------------------- Lima at night (neon street, reportage)
const lima_night = makeLocation('lima_night', {
  floor: 0x26262e, frame: 0x101014, boardStyle: 'poster', background: 0x06040e, fog: [0x0e0a1e, 18, 42],
  sky: (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.6); sky.addColorStop(0, '#07051a'); sky.addColorStop(1, '#2a1240');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // colonial balconies + modern buildings with lit windows
    const r = rng(21);
    for (let b = 0; b < 10; b++) {
      const x = b * 210, h = 300 + (b % 3) * 120, y = H * 0.75 - h;
      g.fillStyle = ['#2a1a30', '#1c1828', '#30202a'][b % 3]; g.fillRect(x, y, 200, h + 300);
      for (let i = 0; i < 4; i++) for (let j = 0; j < Math.floor(h / 80); j++) if (r() < 0.6) { g.fillStyle = r() < 0.5 ? '#ffd27a' : '#ff9ad0'; g.fillRect(x + 20 + i * 45, y + 30 + j * 80, 26, 36); }
      if (b % 3 === 1) { g.fillStyle = '#5a2a1a'; g.fillRect(x + 10, y + 120, 180, 70); } // wooden balcony
    }
    g.font = '900 70px Arial Black'; g.textAlign = 'center';
    g.fillStyle = '#ff4ad8'; g.fillText('BAR', 320, 380); g.fillStyle = '#4ae0ff'; g.fillText('PEÑA', 1250, 330); g.fillStyle = '#ffd23a'; g.fillText('PIZZAS', 1750, 420);
    g.fillStyle = '#18161e'; g.fillRect(0, H * 0.75, W, H * 0.25);
  },
  props: (set) => {
    const ups = [];
    ups.push(neonFrame(set, -4.4, 3.4, -3.4, 1.8, 1.0, 0xff4ad8, 1));
    ups.push(neonFrame(set, 4.4, 3.8, -3.4, 1.6, 1.2, 0x4ae0ff, 4));
    ups.push(neonFrame(set, BOARD.x, BOARD.y, BOARD.z + 0.02, BOARD.w + 0.5, BOARD.h + 0.5, 0xffd23a, 2));
    // street lamps
    for (const x of [-3.2, 3.0]) { set.add(at(box(0.1, 3.4, 0.1, 0x2a2a30), x, 1.7, -1.6)); set.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), glow(0xffe0a0, 1.6)), x, 3.45, -1.6)); const pl = new THREE.PointLight(0xffd090, 4, 7, 1.5); pl.position.set(x, 3.2, -1.4); set.add(pl); }
    // passing combi (minibus) in the background
    const combi = new THREE.Group();
    combi.add(at(box(2.6, 1.2, 1.1, 0xe8e0d0), 0, 0.85, 0));
    combi.add(at(box(2.62, 0.25, 1.12, 0x1f8a4a), 0, 0.55, 0));
    for (let i = 0; i < 4; i++) combi.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 1.14), glow(0xffe8a0, 0.8)), -0.9 + i * 0.6, 1.1, 0));
    for (const x of [-0.8, 0.8]) combi.add(at(box(0.4, 0.4, 1.16, 0x111111), x, 0.25, 0));
    combi.position.z = -6.5; set.add(combi);
    // pumpkin
    const pump = at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), ownMat(0xff7a1a, { emissive: 0xff5a00, emissiveIntensity: 0.6 })), 4.2, 0.36, -0.9); set.add(pump);
    const pink = new THREE.PointLight(0xff4ad8, 6, 9, 1.5); pink.position.set(-2.5, 3, 1); set.add(pink);
    const cyan = new THREE.PointLight(0x4ae0ff, 6, 9, 1.5); cyan.position.set(2.8, 3, 1); set.add(cyan);
    return [...ups, (t) => { combi.position.x = -14 + ((t * 3.2) % 28); pink.intensity = 6 + Math.sin(t * 3) * 1.5; cyan.intensity = 6 + Math.cos(t * 2.4) * 1.5; }];
  },
  lights: { hemi: [0x8a7cff, 0x181020, 0.9], key: [0xd8d0ff, 1.1], fill: [0xffc0e0, 0.9] },
});

export { makeLocation, glow, blinkers };
export const MODERN_LOCATIONS = { casino, trading_floor, data_center, game_studio, peru_coast, celtic_night, lima_night };
