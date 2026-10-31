import * as THREE from 'three';
import { box, at, mat, clamp, easeOutBack } from './characters/util.js';

// Costume system for Profe Claudio. Profe dresses as the historical figure he talks about, but keeps his
// glasses and mustache (it is still Profe in costume: that is the joke).
// Every preset is built once from bevelled boxes and attached to Profe's body; switching is a visibility
// toggle, so any frame can be rendered in isolation (seek-safe).
//
// To add a preset: write `function myPreset(p) { const g = new THREE.Group(); ...; return g; }` using the
// body-space measurements in `p` (S = cube size, D = depth, faceZ = front face z, eyeY = eye height;
// torso spans x -S/2..S/2, y 0..S, z -D/2..D/2) and register it in PRESETS. Keep the face area
// (x -0.55..0.55, y 0.28..1.3 on the front) clear so glasses, mustache and mouth stay readable.

const GOLD = 0xe2b33c;
const LAUREL = 0x5f9e3a;

const extrudeShape = (pts, depth) => {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  return geo;
};
const meshOf = (geo, color, opts) => {
  const m = new THREE.Mesh(geo, mat(color, opts));
  m.castShadow = true;
  return m;
};

/** Gold epaulettes on the top shoulder edges, with a hanging fringe. */
function epaulettes(p, g, color = GOLD) {
  for (const sx of [-1, 1]) {
    const e = at(new THREE.Group(), sx * (p.S / 2 - 0.12), p.S + 0.03, 0.05);
    e.add(box(0.42, 0.08, 0.5, color, { bevel: 0.02, metalness: 0.3, roughness: 0.4 }));
    for (let i = 0; i < 5; i++) e.add(at(box(0.05, 0.16, 0.05, color, { metalness: 0.3 }), sx * 0.2, -0.1, -0.2 + i * 0.1));
    g.add(e);
  }
}

/** Ring of laurel leaves around the top edge of the head. */
function laurel(p, g, color = LAUREL) {
  const y = p.S - 0.06;
  const hw = p.S / 2 + 0.03, hd = p.D / 2 + 0.03;
  const n = 7;
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      // around the perimeter: front corner -> side -> back, per side
      const per = k * (hd * 2 + hw);
      let x, z, ry;
      if (per < hw) { x = side * per; z = hd; ry = 0; } else if (per < hw + hd * 2) { x = side * hw; z = hd - (per - hw); ry = Math.PI / 2; } else { x = side * hw; z = -hd; ry = 0; }
      if (i === 0) continue; // leave the front center open (forehead)
      const leaf = at(box(0.2, 0.09, 0.07, color, { bevel: 0.015 }), x, y + (i % 2) * 0.04, z);
      leaf.rotation.set(0, ry, side * (0.5 + (i % 2) * 0.2));
      g.add(leaf);
    }
  }
}

function napoleon(p) {
  const g = new THREE.Group();
  // Bicorne worn sideways ("en bataille"): a crescent extruded along z, black with a gold edge.
  const hat = at(new THREE.Group(), 0, p.S + 0.02, -0.02);
  const crescent = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (i / 10);
    crescent.push([-Math.cos(a) * 1.0, Math.sin(a) * 0.62]);
  }
  for (let i = 10; i >= 0; i--) {
    const a = Math.PI * (i / 10);
    crescent.push([-Math.cos(a) * 0.82, Math.sin(a) * 0.12]);
  }
  hat.add(meshOf(extrudeShape(crescent, 0.5), 0x15151a, { roughness: 0.8 }));
  const trim = meshOf(extrudeShape(crescent.slice(0, 11).map(([x, y]) => [x * 1.02, y + 0.02]).concat(
    crescent.slice(0, 11).reverse().map(([x, y]) => [x * 0.96, y - 0.05])), 0.54), GOLD, { metalness: 0.3 });
  hat.add(trim);
  // cockade: blue / white / red rings on the front
  const ck = at(new THREE.Group(), 0.42, 0.36, 0.27);
  ck.add(box(0.26, 0.26, 0.04, 0x2a4fb0), at(box(0.17, 0.17, 0.05, 0xf2f0ea), 0, 0, 0.01), at(box(0.08, 0.08, 0.06, 0xd23a2a), 0, 0, 0.02));
  hat.add(ck);
  g.add(hat);
  epaulettes(p, g);
  // blue coat sides with a white sash corner
  for (const sx of [-1, 1]) g.add(at(box(0.05, p.S * 0.8, p.D * 0.96, 0x2a4fb0, { bevel: 0.01 }), sx * (p.S / 2 + 0.02), p.S * 0.4, 0));
  return g;
}

function greek(p) {
  const g = new THREE.Group();
  const WHITE = 0xf1ece0, FOLD = 0xd9d0bc;
  // chiton: hem ring around the bottom
  g.add(at(box(p.S + 0.08, 0.2, p.D + 0.08, WHITE, { bevel: 0.03 }), 0, 0.09, 0));
  // himation drape over the left shoulder: top slab, side panel and a front strip at the left edge
  g.add(at(box(0.5, 0.06, p.D + 0.08, WHITE, { bevel: 0.02 }), -p.S / 2 + 0.22, p.S + 0.02, 0));
  g.add(at(box(0.06, p.S, p.D + 0.08, WHITE, { bevel: 0.02 }), -p.S / 2 - 0.03, p.S / 2, 0));
  const strip = at(box(0.2, p.S * 0.98, 0.06, WHITE, { bevel: 0.02 }), -p.S / 2 + 0.08, p.S / 2, p.faceZ + 0.04);
  g.add(strip);
  for (let i = 0; i < 4; i++) g.add(at(box(0.04, 0.24, 0.02, FOLD), -p.S / 2 - 0.065, 0.3 + i * 0.3, -0.4 + i * 0.25));
  laurel(p, g);
  // philosopher beard under the mouth, plus side whiskers up to the glasses (mouth stays visible)
  const BEARD = 0x8f897f;
  const beard = at(new THREE.Group(), 0, 0, p.faceZ + 0.04);
  beard.add(at(box(0.66, 0.26, 0.12, BEARD, { bevel: 0.03 }), 0, 0.15, 0));
  beard.add(at(box(0.44, 0.2, 0.12, BEARD, { bevel: 0.03 }), 0, -0.04, 0.01));
  beard.add(at(box(0.22, 0.14, 0.12, BEARD, { bevel: 0.03 }), 0, -0.18, 0.02));
  for (const sx of [-1, 1]) beard.add(at(box(0.14, 0.62, 0.1, BEARD, { bevel: 0.03 }), sx * 0.62, 0.55, -0.02));
  g.add(beard);
  return g;
}

function norton(p) {
  const g = new THREE.Group();
  const NAVY = 0x1c2a52;
  // coat: sides, back and the lower front corners (center stays open for mouth and bowtie)
  for (const sx of [-1, 1]) {
    g.add(at(box(0.05, p.S * 0.98, p.D + 0.04, NAVY, { bevel: 0.01 }), sx * (p.S / 2 + 0.02), p.S / 2, 0));
    g.add(at(box(0.24, 0.62, 0.05, NAVY, { bevel: 0.015 }), sx * (p.S / 2 - 0.1), 0.31, p.faceZ + 0.02));
    for (let i = 0; i < 3; i++) g.add(at(box(0.07, 0.07, 0.04, GOLD, { metalness: 0.4 }), sx * (p.S / 2 - 0.2), 0.12 + i * 0.2, p.faceZ + 0.06));
  }
  g.add(at(box(p.S + 0.06, p.S * 0.98, 0.05, NAVY), 0, p.S / 2, -p.D / 2 - 0.02));
  epaulettes(p, g);
  // tall hat with a gold band and a plume
  const hat = at(new THREE.Group(), 0.05, p.S + 0.02, -0.05);
  hat.add(at(box(0.98, 0.07, 0.86, 0x16161c, { bevel: 0.02 }), 0, 0.035, 0));
  hat.add(at(box(0.68, 0.72, 0.62, 0x1b1b22, { bevel: 0.03 }), 0, 0.43, 0));
  hat.add(at(box(0.7, 0.1, 0.64, GOLD, { metalness: 0.3 }), 0, 0.14, 0));
  const plume = at(new THREE.Group(), 0.22, 0.75, 0.1);
  const PLUME = [0xd23a2a, 0x2f8f6a, 0x2a4fb0, 0xd23a2a];
  PLUME.forEach((c, i) => {
    const f = at(box(0.12, 0.34, 0.08, c, { bevel: 0.02 }), 0.06 * i, 0.15 + i * 0.22, -0.03 * i);
    f.rotation.z = -0.25 - i * 0.18;
    plume.add(f);
  });
  hat.add(plume);
  g.add(hat);
  // saber at the free-hand side, hanging diagonally
  const saber = at(new THREE.Group(), p.S / 2 + 0.1, 0.35, 0.2);
  saber.rotation.z = -0.35;
  saber.add(at(box(0.07, 0.9, 0.03, 0xcfd6de, { metalness: 0.6, roughness: 0.3 }), 0, -0.35, 0));
  saber.add(at(box(0.24, 0.05, 0.08, GOLD, { metalness: 0.4 }), 0, 0.12, 0));
  saber.add(at(box(0.06, 0.2, 0.06, 0x3a2412), 0, 0.24, 0));
  g.add(saber);
  return g;
}

function roman(p) {
  const g = new THREE.Group();
  const RED = 0xb3261e, BRONZE = 0xc08a3a;
  // cloak on the back and sides, gold clasps at the front shoulders
  g.add(at(box(p.S + 0.16, p.S + 0.1, 0.06, RED, { bevel: 0.02 }), 0, p.S / 2 - 0.08, -p.D / 2 - 0.05));
  for (const sx of [-1, 1]) {
    g.add(at(box(0.06, p.S + 0.05, 0.5, RED, { bevel: 0.02 }), sx * (p.S / 2 + 0.05), p.S / 2 - 0.06, -p.D / 2 + 0.2));
    g.add(at(box(0.14, 0.14, 0.06, GOLD, { metalness: 0.4 }), sx * (p.S / 2 - 0.1), p.S - 0.1, p.faceZ + 0.04));
  }
  // armor plate: bronze band around the lower body with pteruges strips
  g.add(at(box(p.S + 0.06, 0.24, p.D + 0.06, BRONZE, { bevel: 0.03, metalness: 0.45, roughness: 0.45 }), 0, 0.14, 0));
  for (let i = 0; i < 6; i++) g.add(at(box(0.16, 0.18, 0.04, 0x7a4a24), -0.6 + i * 0.24, -0.04, p.faceZ + 0.04));
  laurel(p, g, 0x8fbf4a);
  return g;
}

/** Small sword hanging diagonally at the free-hand side. */
function sword(p, g, { blade = 0xcfd6de, guard = GOLD, grip = 0x3a2412, len = 0.8 } = {}) {
  const s = at(new THREE.Group(), p.S / 2 + 0.1, 0.35, 0.2);
  s.rotation.z = -0.3;
  s.add(at(box(0.09, len, 0.03, blade, { metalness: 0.6, roughness: 0.3 }), 0, -len / 2 + 0.05, 0));
  s.add(at(box(0.3, 0.06, 0.08, guard, { metalness: 0.4 }), 0, 0.1, 0));
  s.add(at(box(0.07, 0.2, 0.07, grip), 0, 0.23, 0));
  s.add(at(box(0.1, 0.08, 0.1, guard, { metalness: 0.4 }), 0, 0.36, 0));
  g.add(s);
}

/** Medieval soldier of Modena: steel kettle helmet with plume, yellow/blue tabard with a coat of arms, small sword. */
function medieval(p) {
  const g = new THREE.Group();
  const STEEL = 0xaeb6c0, YEL = 0xf2c230, BLU = 0x2a5cb8;
  // kettle helmet: wide flat brim + rounded crown + ridge
  const helm = at(new THREE.Group(), 0, p.S + 0.02, 0);
  helm.add(at(box(p.S + 0.5, 0.07, p.D + 0.5, STEEL, { bevel: 0.025, metalness: 0.7, roughness: 0.3 }), 0, 0.04, 0));
  helm.add(at(box(p.S * 0.82, 0.36, p.D * 0.82, STEEL, { bevel: 0.08, metalness: 0.7, roughness: 0.3 }), 0, 0.24, 0));
  helm.add(at(box(0.08, 0.14, p.D * 0.84, 0x8d96a2, { metalness: 0.6 }), 0, 0.45, 0));
  // small plume (Modena yellow and blue)
  const plume = at(new THREE.Group(), 0.1, 0.5, -0.1);
  [YEL, BLU, YEL].forEach((c, i) => {
    const f = at(box(0.1, 0.32, 0.07, c, { bevel: 0.02 }), 0.05 * i, 0.14 + i * 0.16, -0.03 * i);
    f.rotation.z = -0.3 - i * 0.22;
    plume.add(f);
  });
  helm.add(plume);
  g.add(helm);
  // tabard: quartered side panels, back, and lower front corners (face/mouth stay clear)
  for (const sx of [-1, 1]) {
    g.add(at(box(0.05, p.S * 0.96, p.D * 0.5, sx < 0 ? YEL : BLU, { bevel: 0.01 }), sx * (p.S / 2 + 0.02), p.S * 0.48, p.D * 0.24));
    g.add(at(box(0.05, p.S * 0.96, p.D * 0.5, sx < 0 ? BLU : YEL, { bevel: 0.01 }), sx * (p.S / 2 + 0.02), p.S * 0.48, -p.D * 0.24));
    g.add(at(box(0.26, 0.5, 0.05, sx < 0 ? YEL : BLU, { bevel: 0.015 }), sx * (p.S / 2 - 0.12), 0.25, p.faceZ + 0.02));
  }
  g.add(at(box(p.S + 0.06, p.S * 0.96, 0.05, YEL), 0, p.S * 0.48, -p.D / 2 - 0.02));
  // coat of arms on the side panel facing the camera in close-ups (Profe's right = +x) and on the front-left corner
  const shield = (x, z, ry) => {
    const s = at(new THREE.Group(), x, 0.62, z);
    s.rotation.y = ry;
    s.add(box(0.34, 0.4, 0.04, 0xf4efe6, { bevel: 0.015 }));
    s.add(at(box(0.15, 0.17, 0.05, YEL), -0.075, 0.09, 0.005), at(box(0.15, 0.17, 0.05, BLU), 0.075, 0.09, 0.005));
    s.add(at(box(0.15, 0.17, 0.05, BLU), -0.075, -0.09, 0.005), at(box(0.15, 0.17, 0.05, YEL), 0.075, -0.09, 0.005));
    g.add(s);
  };
  shield(-p.S / 2 - 0.06, 0.05, -Math.PI / 2);
  shield(p.S / 2 + 0.06, 0.05, Math.PI / 2);
  sword(p, g);
  return g;
}

/** Tycho Brahe: Renaissance black doublet, big white ruff, brass nose block (glasses and mustache stay). */
function tycho(p) {
  const g = new THREE.Group();
  const BLACK = 0x1a1a20, WHITE = 0xf6f3ea, BRASS = 0xd9a93a;
  // doublet: sides, back, lower front corners with gold buttons
  for (const sx of [-1, 1]) {
    g.add(at(box(0.05, p.S * 0.9, p.D + 0.04, BLACK, { bevel: 0.01 }), sx * (p.S / 2 + 0.02), p.S * 0.45, 0));
    g.add(at(box(0.26, 0.42, 0.05, BLACK, { bevel: 0.015 }), sx * (p.S / 2 - 0.12), 0.32, p.faceZ + 0.02));
    for (let i = 0; i < 2; i++) g.add(at(box(0.06, 0.06, 0.04, GOLD, { metalness: 0.4 }), sx * (p.S / 2 - 0.22), 0.24 + i * 0.16, p.faceZ + 0.06));
    // puffed shoulders
    g.add(at(box(0.36, 0.2, p.D * 0.7, BLACK, { bevel: 0.06 }), sx * (p.S / 2 - 0.05), p.S + 0.0, 0));
  }
  g.add(at(box(p.S + 0.06, p.S * 0.9, 0.05, BLACK), 0, p.S * 0.45, -p.D / 2 - 0.02));
  // big ruff collar: ring of pleated white blocks around the base of the cube
  const hw = p.S / 2 + 0.16, hd = p.D / 2 + 0.16;
  const N = 9;
  for (let i = 0; i < N; i++) {
    const k = (i + 0.5) / N;
    for (const [x, z, ry] of [[-hw + k * hw * 2, hd, 0], [-hw + k * hw * 2, -hd, 0], [hw, -hd + k * hd * 2, Math.PI / 2], [-hw, -hd + k * hd * 2, Math.PI / 2]]) {
      const pleat = at(box(0.2, 0.26, 0.3, i % 2 ? WHITE : 0xe6e1d4, { bevel: 0.05 }), x, 0.06, z);
      pleat.rotation.y = ry;
      g.add(pleat);
    }
  }
  // brass nose block between glasses and mustache, with a strap line and a bright highlight
  const nose = at(new THREE.Group(), 0, p.eyeY - 0.24, p.faceZ + 0.1);
  nose.add(box(0.22, 0.24, 0.18, 0xf2c444, { bevel: 0.04, metalness: 0.3, roughness: 0.25, emissive: 0x7a5a10, emissiveIntensity: 0.6 }));
  nose.add(at(box(0.06, 0.12, 0.03, 0xfff1b0, { metalness: 0.2, roughness: 0.1, emissive: 0xfff1b0, emissiveIntensity: 0.8 }), -0.05, 0.03, 0.09));
  g.add(nose);
  return g;
}

/** NASA flight controller (1999): white short-sleeve shirt, thin black tie, ID badge, headset with mic. */
function nasa(p) {
  const g = new THREE.Group();
  const WHITE = 0xf4f4f0, BLACK = 0x15151a;
  for (const sx of [-1, 1]) {
    g.add(at(box(0.05, p.S * 0.55, p.D + 0.04, WHITE, { bevel: 0.01 }), sx * (p.S / 2 + 0.02), p.S * 0.27, 0));
    g.add(at(box(0.3, 0.3, 0.05, WHITE, { bevel: 0.015 }), sx * (p.S / 2 - 0.15), 0.15, p.faceZ + 0.02));
    // short sleeves at the shoulders
    g.add(at(box(0.2, 0.26, 0.42, WHITE, { bevel: 0.04 }), sx * (p.S / 2 + 0.1), p.S * 0.62, 0.06));
  }
  g.add(at(box(p.S + 0.06, p.S * 0.55, 0.05, WHITE), 0, p.S * 0.27, -p.D / 2 - 0.02));
  // thin black tie (knot covers the bowtie)
  g.add(at(box(0.15, 0.13, 0.12, BLACK, { bevel: 0.02 }), 0, 0.15, p.faceZ + 0.1));
  g.add(at(box(0.09, 0.24, 0.05, BLACK), 0, 0.02, p.faceZ + 0.08));
  // ID badge clipped at the side (white card, blue band, photo square)
  const badge = at(new THREE.Group(), 0.5, 0.2, p.faceZ + 0.07);
  badge.add(box(0.2, 0.26, 0.03, 0xffffff, { emissive: 0x333333 }));
  badge.add(at(box(0.2, 0.06, 0.035, 0x1f5fbf), 0, 0.1, 0));
  badge.add(at(box(0.08, 0.08, 0.035, 0x8a6a4a), -0.04, -0.01, 0));
  g.add(badge);
  // headset: band over the top, ear cups on both sides, boom mic toward the mouth
  g.add(at(box(0.08, 0.06, 0.12, BLACK), 0, p.S + 0.03, 0));
  for (const sx of [-1, 1]) {
    g.add(at(box(0.06, 0.06, 0.12, BLACK), sx * (p.S / 2 - 0.1), p.S + 0.03, 0));
    g.add(at(box(0.08, 0.36, 0.1, BLACK), sx * (p.S / 2 + 0.04), p.S - 0.15, 0));
    g.add(at(box(0.1, 0.28, 0.28, 0x2a2a30, { bevel: 0.04 }), sx * (p.S / 2 + 0.07), p.eyeY - 0.05, 0.05));
  }
  const boom = at(box(0.05, 0.05, 0.55, BLACK), -(p.S / 2 + 0.08), p.eyeY - 0.28, p.faceZ - 0.05);
  boom.rotation.y = -0.35;
  g.add(boom);
  g.add(at(box(0.12, 0.09, 0.09, 0x3a3a40, { bevel: 0.02 }), -(p.S / 2 - 0.05), p.eyeY - 0.3, p.faceZ + 0.12));
  return g;
}

/** Einstein: wild white blocky hair tufts on top and sides, grey cardigan (glasses and mustache stay). */
function einstein(p) {
  const g = new THREE.Group();
  const HAIR = 0xf2f2f0, GREY = 0x7d7f86;
  const tufts = [
    [0, 0.12, 0, 0.42, 0.3, 0], [-0.4, 0.08, 0.1, 0.36, 0.34, 0.5], [0.4, 0.1, -0.05, 0.38, 0.3, -0.45],
    [-0.62, -0.05, 0.0, 0.32, 0.28, 0.9], [0.64, -0.02, 0.1, 0.32, 0.3, -0.85], [-0.2, 0.22, -0.3, 0.3, 0.32, 0.25],
    [0.22, 0.2, 0.25, 0.3, 0.3, -0.3], [0, 0.05, -0.5, 0.5, 0.3, 0.1],
  ];
  for (const [x, y, z, w, h, rz] of tufts) {
    const tuft = at(box(w, h, w * 0.9, HAIR, { bevel: 0.05 }), x, p.S + y, z);
    tuft.rotation.z = rz;
    g.add(tuft);
  }
  // side tufts sticking out above the ears
  for (const sx of [-1, 1]) {
    const side = at(box(0.3, 0.24, 0.5, HAIR, { bevel: 0.05 }), sx * (p.S / 2 + 0.1), p.S - 0.12, -0.1);
    side.rotation.z = sx * -0.5;
    g.add(side);
  }
  // grey cardigan: sides, back, open front panels with buttons
  for (const sx of [-1, 1]) {
    g.add(at(box(0.05, p.S * 0.6, p.D + 0.04, GREY, { bevel: 0.01 }), sx * (p.S / 2 + 0.02), p.S * 0.3, 0));
    g.add(at(box(0.3, 0.3, 0.05, GREY, { bevel: 0.015 }), sx * (p.S / 2 - 0.15), 0.15, p.faceZ + 0.02));
    for (let i = 0; i < 2; i++) g.add(at(box(0.05, 0.05, 0.04, 0x3a3a40), sx * 0.42, 0.08 + i * 0.13, p.faceZ + 0.06));
  }
  g.add(at(box(p.S + 0.06, p.S * 0.6, 0.05, GREY), 0, p.S * 0.3, -p.D / 2 - 0.02));
  return g;
}

/** Shared vest/jacket shell: side panels, open front panels and back, in `color`. */
function shell(p, g, color, h = 0.55) {
  for (const sx of [-1, 1]) {
    g.add(at(box(0.05, p.S * h, p.D + 0.04, color, { bevel: 0.01 }), sx * (p.S / 2 + 0.02), p.S * h / 2, 0));
    g.add(at(box(0.3, 0.3, 0.05, color, { bevel: 0.015 }), sx * (p.S / 2 - 0.15), 0.15, p.faceZ + 0.02));
  }
  g.add(at(box(p.S + 0.06, p.S * h, 0.05, color), 0, p.S * h / 2, -p.D / 2 - 0.02));
}

/** Casino croupier: translucent green dealer visor, red vest with gold buttons, black bowtie stays. */
function croupier(p) {
  const g = new THREE.Group();
  shell(p, g, 0x9a1f28);
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) g.add(at(box(0.05, 0.05, 0.04, GOLD, { metalness: 0.5 }), sx * 0.42, 0.08 + i * 0.13, p.faceZ + 0.06));
  g.add(at(box(p.S + 0.08, 0.08, p.D + 0.08, 0x1f6a3a), 0, p.S + 0.02, 0)); // band
  const visor = at(box(p.S * 0.9, 0.04, 0.45, 0x2fbf6a, { emissive: 0x0f5a2a, transparent: true, opacity: 0.85 }), 0, p.S + 0.02, p.faceZ + 0.2);
  visor.rotation.x = 0.25;
  g.add(visor);
  return g;
}

/** Hacker/crypto: dark hoodie (hood folded behind the head, drawstrings), small gold coin pin. */
function hacker(p) {
  const g = new THREE.Group();
  const HOOD = 0x2a2d36;
  shell(p, g, HOOD, 0.62);
  g.add(at(box(p.S * 0.9, 0.35, 0.3, HOOD, { bevel: 0.08 }), 0, p.S - 0.1, -p.D / 2 - 0.15)); // folded hood
  g.add(at(box(p.S + 0.1, 0.12, 0.3, HOOD, { bevel: 0.04 }), 0, p.S * 0.62, -p.D / 2 + 0.05));
  for (const sx of [-1, 1]) g.add(at(box(0.03, 0.22, 0.03, 0xf4f4f0), sx * 0.12, 0.05, p.faceZ + 0.06));
  const coin = at(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), mat(0xf2a900, { metalness: 0.6 })), 0.45, 0.25, p.faceZ + 0.06);
  coin.rotation.x = Math.PI / 2;
  g.add(coin);
  return g;
}

/** Celtic druid: long brown hooded cloak (hood up around the head, face open), oak leaf crown, mistletoe. */
function druid(p) {
  const g = new THREE.Group();
  const CLOAK = 0x5a4632;
  shell(p, g, CLOAK, 0.9);
  // hood: top cap + side flaps, front stays open
  g.add(at(box(p.S + 0.2, 0.16, p.D + 0.2, CLOAK, { bevel: 0.05 }), 0, p.S + 0.06, -0.02));
  for (const sx of [-1, 1]) g.add(at(box(0.1, p.S * 0.55, p.D + 0.15, CLOAK, { bevel: 0.03 }), sx * (p.S / 2 + 0.07), p.S * 0.72, -0.03));
  g.add(at(box(0.3, 0.3, 0.25, CLOAK, { bevel: 0.06 }), 0, p.S + 0.18, -p.D / 2 + 0.05)); // pointy back
  laurel(p, g, 0x3f7a2a);
  g.add(at(box(0.12, 0.12, 0.04, 0xe8f0d0), 0.4, 0.22, p.faceZ + 0.06)); // mistletoe berry pin
  return g;
}

/** Peruvian fisherman: yellow rain hat (wide brim), orange life vest. */
function fisherman(p) {
  const g = new THREE.Group();
  shell(p, g, 0xff7a1a, 0.5);
  for (const sx of [-1, 1]) g.add(at(box(0.32, 0.06, 0.06, 0xf4f4f0), sx * (p.S / 2 - 0.16), 0.32, p.faceZ + 0.06)); // reflective strip
  g.add(at(box(p.S + 0.6, 0.06, p.D + 0.6, 0xffd23a, { bevel: 0.02 }), 0, p.S + 0.04, 0)); // brim
  g.add(at(box(p.S * 0.75, 0.32, p.D * 0.75, 0xffd23a, { bevel: 0.06 }), 0, p.S + 0.22, -0.02)); // crown
  return g;
}

/** Brimmed hat on top of the head: brim slab + crown + band. Returns the hat group (y = 0 at the head top). */
function brimHat(p, g, { brim = 0.36, crownW = 0.78, crownH = 0.38, color, band, bevel = 0.05 }) {
  const hat = at(new THREE.Group(), 0, p.S + 0.01, -0.02);
  hat.add(at(box(p.S + brim, 0.06, p.D + brim, color, { bevel: 0.02 }), 0, 0.03, 0));
  hat.add(at(box(p.S * crownW, crownH, p.D * crownW, color, { bevel }), 0, 0.05 + crownH / 2, 0));
  if (band != null) hat.add(at(box(p.S * crownW + 0.03, 0.1, p.D * crownW + 0.03, band), 0, 0.12, 0));
  g.add(hat);
  return hat;
}

/** Black bowtie placed in front of Profe's teal one (hides it). */
function blackBow(p, g) {
  const bow = at(new THREE.Group(), 0, 0.14, p.faceZ + 0.1);
  for (const sx of [-1, 1]) bow.add(at(box(0.23, 0.22, 0.06, 0x111116, { bevel: 0.02 }), sx * 0.12, 0, 0));
  bow.add(at(box(0.09, 0.1, 0.08, 0x22222a, { bevel: 0.015 }), 0, 0, 0.01));
  g.add(bow);
}

/** 1940s Lima criollo musician: dark suit, white silk scarf, thin black tie, straw hat with a black band. */
function criollo(p) {
  const g = new THREE.Group();
  const SUIT = 0x2b2b36, SCARF = 0xf6f3ea;
  shell(p, g, SUIT, 0.6);
  // jacket buttons + pocket square
  for (const sx of [-1, 1]) g.add(at(box(0.05, 0.05, 0.04, 0x15151a), sx * 0.44, 0.1, p.faceZ + 0.06));
  g.add(at(box(0.14, 0.07, 0.03, 0xd23a2a), 0.62, 0.27, p.faceZ + 0.06));
  // silk scarf: loop over the shoulders, ends hanging down the front edges (outside the face area)
  g.add(at(box(p.S + 0.12, 0.09, 0.26, SCARF, { bevel: 0.03 }), 0, p.S * 0.6, -p.D / 2 + 0.1));
  for (const sx of [-1, 1]) {
    g.add(at(box(0.06, 0.12, p.D * 0.9, SCARF, { bevel: 0.02 }), sx * (p.S / 2 + 0.06), p.S * 0.56, 0));
    g.add(at(box(0.12, 0.34, 0.05, SCARF, { bevel: 0.02 }), sx * 0.64, 0.2, p.faceZ + 0.07));
    for (let i = 0; i < 3; i++) g.add(at(box(0.03, 0.07, 0.03, SCARF), sx * 0.64 + (i - 1) * 0.04, 0.0, p.faceZ + 0.07)); // fringe
  }
  blackBow(p, g); // black "michi" bowtie over Profe's teal one
  brimHat(p, g, { color: 0xe3c98a, band: 0x15151a, crownH: 0.34 });
  return g;
}

/** Tuxedo (Bond-style): black jacket with satin lapels, white shirt front, black bowtie, marigold boutonniere. */
function bond(p) {
  const g = new THREE.Group();
  const BLACK = 0x111116, SATIN = 0x2c2c36;
  shell(p, g, BLACK, 0.62);
  g.add(at(box(0.62, 0.27, 0.03, 0xf8f8f4), 0, 0.135, p.faceZ + 0.03)); // shirt front
  for (const sx of [-1, 1]) {
    const lapel = at(box(0.12, 0.42, 0.04, SATIN, { metalness: 0.3, roughness: 0.35 }), sx * 0.42, 0.2, p.faceZ + 0.06);
    lapel.rotation.z = sx * 0.45;
    g.add(lapel);
  }
  blackBow(p, g); // black bowtie in front of Profe's teal one
  // cempasúchil (marigold) boutonniere on the lapel
  const flower = at(new THREE.Group(), 0.6, 0.42, p.faceZ + 0.08);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    flower.add(at(box(0.07, 0.07, 0.05, 0xff8a10, { bevel: 0.015 }), Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0));
  }
  flower.add(at(box(0.06, 0.06, 0.06, 0xffc020), 0, 0, 0.01));
  g.add(flower);
  return g;
}

/** Sapa Inca: woven llauto headband with a red mascapaicha fringe and feathers, gold ear disks, tocapu unku. */
function inca(p) {
  const g = new THREE.Group();
  const RED = 0xc8241e, GOLDY = 0xf0b72a, BLACK = 0x1a1a1e, WHITE = 0xf2eee2, BLUE = 0x2a4f9a, OCHRE = 0xd98a1e;
  const TOCAPU = [RED, GOLDY, BLACK, WHITE, BLUE, OCHRE];
  // llauto: multicolor woven band around the top edge
  const y = p.S + 0.03;
  for (let i = 0; i < 8; i++) {
    const c = TOCAPU[i % TOCAPU.length];
    const w = (p.S + 0.08) / 8;
    g.add(at(box(w, 0.14, 0.06, c), -p.S / 2 - 0.04 + w * (i + 0.5), y, p.faceZ + 0.02)); // front
    g.add(at(box(w, 0.14, 0.06, c), -p.S / 2 - 0.04 + w * (i + 0.5), y, -p.D / 2 - 0.02)); // back
  }
  for (const sx of [-1, 1]) g.add(at(box(0.06, 0.14, p.D + 0.06, RED), sx * (p.S / 2 + 0.02), y, 0));
  // mascapaicha: red wool tassels hanging from the band onto the forehead center (between the brows)
  for (let i = 0; i < 4; i++) g.add(at(box(0.05, 0.16, 0.04, RED, { bevel: 0.01 }), -0.09 + i * 0.06, p.S - 0.1, p.faceZ + 0.05));
  g.add(at(box(0.3, 0.05, 0.05, GOLDY, { metalness: 0.4 }), 0, p.S - 0.015, p.faceZ + 0.06));
  // feathers (qorikenke style) standing up from the band
  const plume = at(new THREE.Group(), 0, p.S + 0.1, p.faceZ - 0.12);
  [[BLACK, -0.12, 0.25], [WHITE, 0, 0], [BLACK, 0.12, -0.25]].forEach(([c, x, rz]) => {
    const f = at(box(0.1, 0.42, 0.05, c, { bevel: 0.02 }), x, 0.2, 0);
    f.rotation.z = rz;
    plume.add(f);
  });
  g.add(plume);
  // big gold ear disks on both sides, at eye height
  for (const sx of [-1, 1]) {
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 14), mat(GOLDY, { metalness: 0.55, roughness: 0.3 }));
    disk.rotation.z = Math.PI / 2;
    disk.castShadow = true;
    g.add(at(disk, sx * (p.S / 2 + 0.05), p.eyeY - 0.12, 0.15));
    g.add(at(box(0.07, 0.12, 0.12, 0xb07a18, { metalness: 0.5 }), sx * (p.S / 2 + 0.09), p.eyeY - 0.12, 0.15));
  }
  // unku tunic: side panels with a tocapu checker, back, and a woven front band over the bowtie
  const tocapuPanel = (cols, rows, cell, seed) => {
    const panel = new THREE.Group();
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      panel.add(at(box(cell * 0.96, cell * 0.96, 0.04, TOCAPU[(i * 3 + j * 2 + seed) % TOCAPU.length]), (i - (cols - 1) / 2) * cell, (j - (rows - 1) / 2) * cell, 0));
    }
    return panel;
  };
  for (const sx of [-1, 1]) {
    const side = tocapuPanel(5, 4, p.D / 5, sx > 0 ? 1 : 4);
    side.rotation.y = Math.PI / 2;
    g.add(at(side, sx * (p.S / 2 + 0.03), p.S * 0.3, 0));
  }
  g.add(at(box(p.S + 0.06, p.S * 0.6, 0.05, RED), 0, p.S * 0.3, -p.D / 2 - 0.02));
  g.add(at(tocapuPanel(8, 2, (p.S + 0.06) / 8, 2), 0, 0.13, p.faceZ + 0.1));
  return g;
}

/** José Guadalupe Posada (c. 1910 engraver): bowler hat, dark waistcoat, printer's apron with ink stains. */
function posada(p) {
  const g = new THREE.Group();
  const VEST = 0x3a2c24, APRON = 0x8a7458, INK = 0x1a1a22;
  blackBow(p, g);
  shell(p, g, VEST, 0.58);
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) g.add(at(box(0.05, 0.05, 0.04, 0xc9a24a, { metalness: 0.4 }), sx * 0.44, 0.1 + i * 0.13, p.faceZ + 0.06));
  // watch chain across the vest
  g.add(at(box(0.3, 0.03, 0.03, 0xe2b33c, { metalness: 0.5 }), 0.58, 0.2, p.faceZ + 0.07));
  // printer's apron hanging below the body, in front of the legs, with ink smudges
  g.add(at(box(1.0, 0.5, 0.04, APRON, { bevel: 0.015 }), 0, -0.2, p.faceZ + 0.05));
  g.add(at(box(0.3, 0.16, 0.02, 0x6a5640), 0.18, -0.24, p.faceZ + 0.08)); // pocket
  g.add(at(box(0.18, 0.07, 0.02, INK), -0.22, -0.12, p.faceZ + 0.08), at(box(0.07, 0.12, 0.02, INK), -0.16, -0.17, p.faceZ + 0.08)); // ink smear
  for (const sx of [-1, 1]) g.add(at(box(0.04, 0.04, 0.6, APRON), sx * 0.48, 0.02, p.faceZ - 0.2)); // apron strings
  // bowler hat: rounded crown + short curled brim
  const hat = at(new THREE.Group(), 0, p.S + 0.01, -0.02);
  hat.add(at(box(p.S + 0.22, 0.06, p.D + 0.22, INK, { bevel: 0.025 }), 0, 0.03, 0));
  for (const sx of [-1, 1]) hat.add(at(box(0.06, 0.08, p.D + 0.22, INK, { bevel: 0.02 }), sx * (p.S / 2 + 0.11), 0.07, 0));
  hat.add(at(box(p.S * 0.76, 0.36, p.D * 0.76, INK, { bevel: 0.17 }), 0, 0.22, 0));
  hat.add(at(box(p.S * 0.75, 0.08, p.D * 0.75, 0x3a3a44), 0, 0.1, 0));
  g.add(hat);
  return g;
}

/** Andean baker for Todos los Santos: striped knit chullo with ear flaps, braids and pompoms, floury white apron. */
function panadero(p) {
  const g = new THREE.Group();
  const KNIT = [0xd23a2a, 0xffd23a, 0x2a8a5a, 0x2a5ab0, 0xf4efe6], APRON = 0xf4f0e6;
  // white apron hanging in front of the legs, with a flour handprint, a pocket and side strings
  g.add(at(box(1.04, 0.52, 0.04, APRON, { bevel: 0.015 }), 0, -0.2, p.faceZ + 0.05));
  g.add(at(box(0.3, 0.15, 0.02, 0xe2dccc), -0.2, -0.26, p.faceZ + 0.08)); // pocket
  g.add(at(box(0.16, 0.12, 0.02, 0xd8c8a0), 0.22, -0.12, p.faceZ + 0.08)); // dough smudge
  for (let i = 0; i < 4; i++) g.add(at(box(0.04, 0.09, 0.02, 0xd8c8a0), 0.16 + i * 0.045, -0.02, p.faceZ + 0.08)); // fingers
  for (const sx of [-1, 1]) g.add(at(box(0.04, 0.04, 0.6, APRON), sx * 0.5, 0.02, p.faceZ - 0.2));
  // chullo: snug knit cap with colored stripe rings, a tapered top and a pompom
  const cap = at(new THREE.Group(), 0, p.S, -0.02);
  cap.add(at(box(p.S + 0.1, 0.3, p.D + 0.1, KNIT[0], { bevel: 0.06 }), 0, 0.12, 0));
  [[KNIT[1], 0.02], [KNIT[4], 0.12], [KNIT[2], 0.22]].forEach(([c, y]) => cap.add(at(box(p.S + 0.13, 0.05, p.D + 0.13, c), 0, y, 0)));
  for (let i = 0; i < 6; i++) cap.add(at(box(0.08, 0.08, 0.03, KNIT[3]), -0.5 + i * 0.2, 0.17, p.D / 2 + 0.07)); // knit diamonds
  cap.add(at(box(p.S * 0.55, 0.22, p.D * 0.55, KNIT[0], { bevel: 0.06 }), 0, 0.36, 0));
  cap.add(at(box(0.22, 0.22, 0.22, KNIT[1], { bevel: 0.09 }), 0, 0.54, 0)); // pompom
  // ear flaps on the side faces (face stays clear), each ending in a braid with a little pompom
  for (const sx of [-1, 1]) {
    const flap = at(new THREE.Group(), sx * (p.S / 2 + 0.05), p.S - 0.02, 0.05);
    flap.add(at(box(0.08, 0.42, 0.5, KNIT[0], { bevel: 0.03 }), 0, -0.2, 0));
    flap.add(at(box(0.09, 0.06, 0.52, KNIT[1]), 0, -0.12, 0), at(box(0.09, 0.06, 0.52, KNIT[2]), 0, -0.3, 0));
    for (let i = 0; i < 3; i++) flap.add(at(box(0.06, 0.12, 0.06, i % 2 ? KNIT[1] : KNIT[0]), 0, -0.47 - i * 0.12, 0.02));
    flap.add(at(box(0.12, 0.12, 0.12, KNIT[3], { bevel: 0.05 }), 0, -0.86, 0.02));
    g.add(flap);
  }
  g.add(cap);
  return g;
}

/** Dominican friar (San Martín de Porres): white tunic and scapular, open black cloak with a folded black hood, rosary. */
function dominico(p) {
  const g = new THREE.Group();
  const WHITE = 0xf2efe6, BLACK = 0x17161c;
  // white tunic + scapular in front of the legs (below the face area)
  g.add(at(box(0.62, 0.62, 0.04, WHITE, { bevel: 0.015 }), 0, -0.04, p.faceZ + 0.04));
  g.add(at(box(0.5, 0.05, 0.02, 0xe2ddd0), 0, 0.16, p.faceZ + 0.07)); // scapular fold line
  // open black cloak: sides, back and front edges framing the white tunic
  for (const sx of [-1, 1]) {
    g.add(at(box(0.06, p.S * 0.95, p.D + 0.06, BLACK, { bevel: 0.015 }), sx * (p.S / 2 + 0.03), p.S * 0.95 / 2 - 0.12, 0));
    g.add(at(box(0.24, 0.62, 0.05, BLACK, { bevel: 0.015 }), sx * (p.S / 2 - 0.12), -0.02, p.faceZ + 0.03));
  }
  g.add(at(box(p.S + 0.08, p.S * 0.95, 0.06, BLACK), 0, p.S * 0.95 / 2 - 0.12, -p.D / 2 - 0.03));
  // hood folded on the shoulders behind the head
  g.add(at(box(p.S * 0.92, 0.36, 0.32, BLACK, { bevel: 0.09 }), 0, p.S - 0.08, -p.D / 2 - 0.16));
  // leather belt + rosary hanging on the right side (black beads, small wooden cross)
  g.add(at(box(0.66, 0.06, 0.02, 0x3a2412), 0, 0.27, p.faceZ + 0.07));
  for (let i = 0; i < 6; i++) g.add(at(box(0.05, 0.05, 0.05, 0x24180e, { bevel: 0.015 }), 0.3 + (i % 2) * 0.03, 0.2 - i * 0.07, p.faceZ + 0.09));
  g.add(at(box(0.04, 0.16, 0.03, 0x8a5a2a), 0.31, -0.28, p.faceZ + 0.09), at(box(0.11, 0.035, 0.03, 0x8a5a2a), 0.31, -0.24, p.faceZ + 0.09));
  return g;
}

/** TV news anchor: navy suit with lapels, light-blue shirt front, red tie (covers the bowtie), lapel mic, earpiece. */
function anchor(p) {
  const g = new THREE.Group();
  const SUIT = 0x1c2a4a, LAPEL = 0x15203a, SHIRT = 0xcfe2f6, TIE = 0xc8202e;
  shell(p, g, SUIT, 0.62);
  g.add(at(box(0.6, 0.28, 0.03, SHIRT), 0, 0.14, p.faceZ + 0.03)); // shirt front
  for (const sx of [-1, 1]) {
    const lapel = at(box(0.13, 0.42, 0.04, LAPEL, { roughness: 0.5 }), sx * 0.42, 0.2, p.faceZ + 0.06);
    lapel.rotation.z = sx * 0.45;
    g.add(lapel);
    g.add(at(box(0.05, 0.05, 0.04, 0x0d1424), sx * 0.44, 0.06, p.faceZ + 0.07)); // buttons
  }
  // red tie: knot over Profe's bowtie + blade down the shirt
  // shirt collar in front of Profe's teal bowtie (hides it), then the tie on top
  for (const sx of [-1, 1]) {
    const collar = at(box(0.3, 0.2, 0.06, SHIRT, { bevel: 0.015 }), sx * 0.14, 0.15, p.faceZ + 0.12);
    collar.rotation.z = sx * -0.3;
    g.add(collar);
  }
  g.add(at(box(0.16, 0.13, 0.08, TIE, { bevel: 0.02 }), 0, 0.15, p.faceZ + 0.17));
  g.add(at(box(0.12, 0.17, 0.05, TIE), 0, 0.04, p.faceZ + 0.15));
  // white pocket square + small black lapel mic
  g.add(at(box(0.15, 0.07, 0.03, 0xf8f8f4), 0.62, 0.27, p.faceZ + 0.06));
  g.add(at(box(0.07, 0.1, 0.06, 0x111116, { bevel: 0.015 }), -0.5, 0.36, p.faceZ + 0.08));
  // earpiece with a coiled wire on the right side of the head
  g.add(at(box(0.08, 0.12, 0.1, 0xe8d8c0, { bevel: 0.02 }), p.S / 2 + 0.04, p.eyeY - 0.08, 0.05));
  g.add(at(box(0.03, 0.4, 0.03, 0xe8d8c0), p.S / 2 + 0.05, p.eyeY - 0.34, -0.05));
  return g;
}

/**
 * Helicopter pilot: olive flight suit with zipper, name tag and a red-white-red flag patch, grey flight helmet with
 * the dark visor raised on the forehead, ear cups and a boom mic at the side (the mouth stays visible).
 */
function pilot(p) {
  const g = new THREE.Group();
  const SUIT = 0x55603e, DARK = 0x3a4228, HELMET = 0xc9ced4, VISOR = 0x1a2230;
  shell(p, g, SUIT, 0.62);
  g.add(at(box(0.6, 0.28, 0.03, SUIT), 0, 0.14, p.faceZ + 0.03)); // suit front (covers the shirt)
  for (const sx of [-1, 1]) { // collar flaps in front of Profe's bowtie
    const collar = at(box(0.3, 0.18, 0.06, DARK, { bevel: 0.015 }), sx * 0.14, 0.17, p.faceZ + 0.1);
    collar.rotation.z = sx * -0.3;
    g.add(collar);
  }
  g.add(at(box(0.04, 0.26, 0.04, 0xb8bcc0, { metalness: 0.6 }), 0, 0.08, p.faceZ + 0.07)); // zipper
  g.add(at(box(0.26, 0.1, 0.03, 0x2a2e22), -0.45, 0.27, p.faceZ + 0.06)); // name tag
  g.add(at(box(0.2, 0.04, 0.035, 0xffd23a), -0.45, 0.27, p.faceZ + 0.065)); // wings on the tag
  for (const [i, c] of [0xd2202e, 0xf4f4f0, 0xd2202e].entries()) { // flag patch on the right chest
    g.add(at(box(0.07, 0.14, 0.03, c), 0.38 + i * 0.07, 0.27, p.faceZ + 0.06));
  }
  // flight helmet: shell over the head top, side ear cups, raised visor above the glasses
  const helmet = at(new THREE.Group(), 0, p.S, -0.02);
  helmet.add(at(box(p.S + 0.12, 0.36, p.D + 0.12, HELMET, { bevel: 0.14, metalness: 0.2, roughness: 0.45 }), 0, 0.12, 0));
  helmet.add(at(box(p.S * 0.5, 0.08, p.D * 0.6, 0xaab0b8, { bevel: 0.03 }), 0, 0.32, 0)); // top ridge
  helmet.add(at(box(p.S * 0.86, 0.16, 0.1, VISOR, { metalness: 0.5, roughness: 0.2 }), 0, 0.02, p.D / 2 + 0.1)); // raised visor
  helmet.add(at(box(p.S * 0.9, 0.05, 0.06, 0x8a9098), 0, 0.12, p.D / 2 + 0.1)); // visor track
  g.add(helmet);
  for (const sx of [-1, 1]) {
    g.add(at(box(0.08, 0.36, 0.5, HELMET, { bevel: 0.03 }), sx * (p.S / 2 + 0.05), p.S - 0.12, -0.05)); // helmet sides
    g.add(at(box(0.12, 0.3, 0.3, 0x2a2a30, { bevel: 0.04 }), sx * (p.S / 2 + 0.08), p.eyeY - 0.05, 0.05)); // ear cups
  }
  const boom = at(box(0.05, 0.05, 0.55, 0x15151a), -(p.S / 2 + 0.09), p.eyeY - 0.28, p.faceZ - 0.05);
  boom.rotation.y = -0.35;
  g.add(boom);
  g.add(at(box(0.12, 0.09, 0.09, 0x3a3a40, { bevel: 0.02 }), -(p.S / 2 - 0.05), p.eyeY - 0.3, p.faceZ + 0.12));
  return g;
}

/** Pajamas for a sleepover (027 sheet fort): blue-striped pajama shell and a floppy nightcap with a pompom. */
function pijama(p) {
  const g = new THREE.Group();
  const PJ = 0x5a7ad0, STRIPE = 0xe8eefc;
  shell(p, g, PJ, 0.6);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) g.add(at(box(0.06, p.S * 0.6, 0.03, STRIPE), sx * (p.S / 2 + 0.05), p.S * 0.3, -p.D / 2 + 0.15 + i * (p.D - 0.3) / 2));
  for (const sx of [-1, 1]) g.add(at(box(0.05, 0.3, 0.03, STRIPE), sx * (p.S / 2 - 0.15), 0.15, p.faceZ + 0.05));
  for (let i = 0; i < 2; i++) g.add(at(box(0.05, 0.05, 0.03, 0xf4f4f0), 0.42, 0.08 + i * 0.13, p.faceZ + 0.06)); // buttons
  // nightcap: band, a cone bent to one side in 3 segments, pompom at the tip
  const cap = at(new THREE.Group(), 0, p.S, -0.02);
  cap.add(at(box(p.S + 0.1, 0.12, p.D + 0.1, STRIPE, { bevel: 0.04 }), 0, 0.04, 0));
  const segs = [[p.S * 0.9, 0.3, 0, 0.22, 0], [p.S * 0.6, 0.28, 0.12, 0.48, -0.35], [p.S * 0.34, 0.26, 0.34, 0.66, -0.9]];
  segs.forEach(([w, h, x, y, rz], i) => { const m = at(box(w, h, w * 0.9, i % 2 ? STRIPE : PJ, { bevel: 0.05 }), x, y, 0); m.rotation.z = rz; cap.add(m); });
  cap.add(at(box(0.2, 0.2, 0.2, 0xf4f4f0, { bevel: 0.09 }), 0.62, 0.7, 0));
  g.add(cap);
  return g;
}

export const COSTUMES = { none: () => new THREE.Group(), napoleon, greek, norton, roman, medieval, tycho, nasa, einstein, croupier, hacker, druid, fisherman, criollo, bond, inca, posada, panadero, dominico, anchor, pilot, pijama };

/** Straw broom (fray Escoba), held by the handle; the handle sticks up past the hand, the brush hangs below. */
function broom() {
  const g = new THREE.Group();
  const STRAW = 0xd9b45a;
  g.add(at(box(0.05, 1.05, 0.05, 0x7a4a24), 0, 0.05, 0)); // handle
  g.add(at(box(0.16, 0.06, 0.1, 0xb0402a, { bevel: 0.015 }), 0, -0.5, 0)); // binding
  g.add(at(box(0.2, 0.14, 0.12, STRAW, { bevel: 0.03 }), 0, -0.6, 0));
  g.add(at(box(0.34, 0.2, 0.12, STRAW, { bevel: 0.03 }), 0, -0.76, 0));
  for (let i = 0; i < 5; i++) g.add(at(box(0.025, 0.08, 0.13, 0xb8923a), -0.14 + i * 0.07, -0.84, 0)); // bristle tips
  return { group: g, flame: null };
}

/** Criollo guitar, held by the neck, body hanging below the hand. */
function guitar() {
  const g = new THREE.Group();
  const WOOD = 0xc98a42, DARK = 0x3a2412;
  g.add(at(box(0.07, 0.42, 0.04, DARK), 0, -0.12, 0)); // neck (fretboard)
  g.add(at(box(0.1, 0.12, 0.05, DARK, { bevel: 0.015 }), 0, 0.12, 0)); // head
  const body = at(new THREE.Group(), 0, -0.55, 0);
  body.add(at(box(0.3, 0.24, 0.1, WOOD, { bevel: 0.04 }), 0, 0.12, 0));
  body.add(at(box(0.38, 0.3, 0.1, WOOD, { bevel: 0.05 }), 0, -0.15, 0));
  body.add(at(box(0.09, 0.09, 0.02, 0x1a1008), 0, 0.03, 0.055)); // sound hole
  body.add(at(box(0.16, 0.03, 0.02, DARK), 0, -0.18, 0.055)); // bridge
  g.add(body);
  for (let i = 0; i < 3; i++) g.add(at(box(0.008, 0.66, 0.008, 0xf2f2f0), -0.02 + i * 0.02, -0.33, 0.06)); // strings
  return { group: g, flame: null };
}

/** Handheld oil lamp (Diogenes). Hangs from the hand; the flame flickers. */
function oilLamp() {
  const g = new THREE.Group();
  const CLAY = 0xb5562b;
  g.add(at(box(0.04, 0.22, 0.04, 0x3a2a1a), 0, -0.11, 0)); // handle cord
  const body = at(new THREE.Group(), 0, -0.3, 0);
  body.add(box(0.32, 0.12, 0.2, CLAY, { bevel: 0.03 }));
  body.add(at(box(0.14, 0.06, 0.1, CLAY, { bevel: 0.02 }), 0.2, 0.02, 0));
  const flame = at(new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: 0xffc94a })), 0.25, 0.13, 0);
  body.add(flame);
  g.add(body);
  return { group: g, flame };
}

/**
 * Attaches the costume presets and handheld props to a Profe instance.
 * update({ name, k, prop, t }): name = preset, k = 0..1 entrance scale (poof), prop = 'lamp' | null.
 */
export function attachCostumes(profe) {
  const p = profe.parts;
  const built = {};
  for (const [name, fn] of Object.entries(COSTUMES)) {
    built[name] = fn(p);
    built[name].visible = false;
    p.body.add(built[name]);
  }
  // handheld props (free hand): `profeProp: "lamp" | "guitar" | "broom"`
  const props = { lamp: oilLamp(), guitar: guitar(), broom: broom() };
  props.lamp.group.scale.setScalar(1.8);
  props.guitar.group.scale.setScalar(1.25);
  for (const pr of Object.values(props)) { pr.group.visible = false; p.armL.hand.add(pr.group); }
  const _q = new THREE.Quaternion();

  function update({ name = 'none', k = 1, prop = null, t = 0 }) {
    if (!built[name]) throw new Error(`Unknown costume "${name}". Known: ${Object.keys(COSTUMES).join(', ')}`);
    if (prop && !props[prop]) throw new Error(`Unknown profeProp "${prop}". Known: ${Object.keys(props).join(', ')}`);
    for (const [n, g] of Object.entries(built)) g.visible = n === name && k > 0.001;
    const s = Math.max(0.001, easeOutBack(clamp(k)));
    built[name].scale.setScalar(s);
    for (const [n, pr] of Object.entries(props)) pr.group.visible = n === prop;
    const held = props[prop];
    if (held) {
      // keep the prop hanging upright whatever the arm does
      p.armL.pivot.updateMatrixWorld(true);
      p.body.getWorldQuaternion(_q);
      const handQ = new THREE.Quaternion();
      p.armL.hand.getWorldQuaternion(handQ);
      held.group.quaternion.copy(handQ.invert().multiply(_q));
      if (held.flame) held.flame.scale.set(1, 1 + 0.25 * Math.sin(t * 17) + 0.1 * Math.sin(t * 41), 1);
    }
  }
  update({});
  return { update, names: Object.keys(COSTUMES) };
}

/** A "poof" cloud: low-poly puffs that burst out and shrink. update(since) with since in seconds (<0 or >0.7 hidden). */
export function createPoof(color = 0xf4efe6) {
  const g = new THREE.Group();
  const puffs = [];
  const m = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, emissive: 0x555555 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 + (i % 3) * 0.08, 0), m);
    mesh.userData.dir = new THREE.Vector3(Math.cos(a), 0.35 + ((i * 7) % 5) * 0.25, Math.sin(a) * 0.6 + 0.4);
    puffs.push(mesh);
    g.add(mesh);
  }
  function update(since) {
    const on = since >= 0 && since < 0.7;
    g.visible = on;
    if (!on) return;
    const k = since / 0.7;
    for (const [i, mesh] of puffs.entries()) {
      mesh.position.copy(mesh.userData.dir).multiplyScalar(0.4 + 1.1 * Math.sqrt(k));
      mesh.scale.setScalar(Math.max(0.001, Math.sin(Math.min(1, k * 1.15) * Math.PI) * 1.2));
      mesh.rotation.set(k * 3 + i, k * 2, 0);
    }
  }
  update(-1);
  return { group: g, update };
}
