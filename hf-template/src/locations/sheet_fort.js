import * as THREE from 'three';
import { BOARD, boardScreen, box, at, rng, canvasTexture, backdrop, cylinder, ownMat, flicker } from './common.js';

// Bedsheet fort in a dark bedroom at night (027 horror films ranking). The trio sits inside a blanket tent built
// over chairs: a sagging sheet roof, sheet side walls and a back sheet. ONE standing flashlight on the floor in the
// middle lights everything warm from below (point light with soft shadows, so the cast throws big shadows on the
// sheets). The board is the flashlight's light pool projected on the back sheet (`sheet` board style, no frame).
// Outside the fort (seen above the roof and past the side walls): a dark bedroom with a moonlit window,
// glow-in-the-dark stars on the ceiling, a bed and a wardrobe. Props: pillows, a plush llama (Tito's), a candy bucket.

const SHEET = 0xc8b8e8; // pale lavender sheet with a small star print (reads warm under the flashlight)

/** Sheet fabric texture: pale color, faint stripes and a little star print. */
function sheetTexture() {
  const tex = canvasTexture(512, 512, (g, W, H) => {
    g.fillStyle = '#d8ccf0'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(120,100,170,0.10)';
    for (let x = 0; x < W; x += 64) g.fillRect(x, 0, 22, H);
    g.fillStyle = 'rgba(255,240,170,0.75)';
    const r = rng(27);
    for (let i = 0; i < 26; i++) {
      const cx = r() * W, cy = r() * H, s = 7 + r() * 5;
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? s * 0.45 : s; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      g.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Plane of sheet fabric with soft deterministic folds. fold(x, y) returns the displacement along the normal. */
function sheetPlane(w, h, segX, segY, fold, map, repeat = [2, 2]) {
  const geo = new THREE.PlaneGeometry(w, h, segX, segY);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, fold(pos.getX(i), pos.getY(i)));
  geo.computeVertexNormals();
  const tex = map.clone(); tex.needsUpdate = true; tex.repeat.set(...repeat);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: SHEET, map: tex, roughness: 0.95, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  return m;
}

/** Plush llama (Tito's), ~0.75 units tall, facing +x. */
function plushLlama() {
  const g = new THREE.Group();
  const W = 0xf2e6d0, D = 0x6a4a3a;
  g.add(at(box(0.5, 0.3, 0.3, W, { bevel: 0.08 }), 0, 0.32, 0));
  for (const [x, z] of [[-0.17, -0.1], [-0.17, 0.1], [0.17, -0.1], [0.17, 0.1]]) g.add(at(box(0.08, 0.2, 0.08, W), x, 0.1, z));
  g.add(at(box(0.14, 0.34, 0.14, W, { bevel: 0.05 }), 0.2, 0.6, 0)); // neck
  g.add(at(box(0.22, 0.15, 0.15, W, { bevel: 0.05 }), 0.26, 0.8, 0)); // head
  for (const z of [-0.05, 0.05]) g.add(at(box(0.04, 0.12, 0.04, W), 0.2, 0.93, z)); // ears
  for (const z of [-0.075, 0.075]) g.add(at(box(0.03, 0.03, 0.01, D), 0.32, 0.83, z)); // button eyes
  g.add(at(box(0.3, 0.06, 0.32, 0xd2202e), 0, 0.48, 0)); // red woven blanket on the back
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/** Standing flashlight (lens up) with a soft additive beam toward the roof. Returns { group, lens, beam }. */
function flashlight() {
  const g = new THREE.Group();
  g.add(at(cylinder(0.11, 0.42, 0x2a2e3a, 10), 0, 0.21, 0));
  g.add(at(cylinder(0.12, 0.05, 0xd2202e, 10), 0, 0.12, 0)); // red grip band
  g.add(at(cylinder(0.15, 0.1, 0x3a3e4a, 12), 0, 0.46, 0)); // head
  const lens = ownMat(0xfff0c0, { emissive: 0xffe0a0, emissiveIntensity: 2.4 });
  const lm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 14), lens);
  lm.position.y = 0.52; g.add(lm);
  const beam = new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.13, 4.2, 20, 1, true), beam);
  cone.position.y = 0.52 + 2.1; g.add(cone);
  return { group: g, lens, beam };
}

function build({ boardTexture }) {
  const set = new THREE.Group();
  const B = BOARD;
  const tex = sheetTexture();

  // floor: dark carpet + a rug inside the fort
  const floor = at(box(40, 0.2, 40, 0x2a2636), 0, -0.1, -4); floor.receiveShadow = true; floor.castShadow = false; set.add(floor);
  const rug = at(box(7.2, 0.02, 4.6, 0x5a3a5a), 0.2, 0.01, -0.7); rug.receiveShadow = true; set.add(rug);

  // bedroom backdrop (visible above the fort and past its sides)
  set.add(backdrop(canvasTexture(2048, 1024, (g, W, H) => {
    g.fillStyle = '#0c0b1c'; g.fillRect(0, 0, W, H);
    const r = rng(9);
    for (let i = 0; i < 60; i++) { // glow-in-the-dark stars on the ceiling
      g.fillStyle = `rgba(190,255,170,${0.25 + r() * 0.45})`;
      const x = r() * W, y = r() * H * 0.35, s = 4 + r() * 6;
      g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, rr = k % 2 ? s * 0.45 : s; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill();
    }
    // window with moon and curtains (right)
    g.fillStyle = '#1e2c56'; g.fillRect(1440, 260, 360, 300);
    g.fillStyle = '#e8f0ff'; g.beginPath(); g.arc(1700, 340, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1e2c56'; g.beginPath(); g.arc(1720, 328, 40, 0, Math.PI * 2); g.fill(); // crescent
    g.fillStyle = '#0c0b1c'; g.fillRect(1612, 260, 16, 300); g.fillRect(1440, 402, 360, 14);
    g.fillStyle = '#2a1a3a'; g.fillRect(1400, 240, 70, 360); g.fillRect(1770, 240, 70, 360);
    // wardrobe (left), slightly open door: a thin dark gap
    g.fillStyle = '#1c1420'; g.fillRect(180, 300, 340, 620);
    g.fillStyle = '#05040a'; g.fillRect(345, 320, 10, 580);
    // bed silhouette (center-right) and a poster
    g.fillStyle = '#18142a'; g.fillRect(1050, 640, 520, 160); g.fillRect(1050, 560, 40, 240);
    g.fillStyle = '#221a30'; g.fillRect(760, 300, 160, 210);
    g.fillStyle = '#3a2a2a'; g.beginPath(); g.arc(840, 400, 50, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#100e1a'; g.fillRect(0, H * 0.82, W, H * 0.18);
  }), 60, 30, 0, 9, -14));

  // the fort: back sheet behind the board, two side walls, sagging roof, front hem; chair backs outside
  const X0 = -3.7, X1 = 4.1, ZB = B.z - 0.07, ZF = 1.9, TOP = 5.1;
  const back = sheetPlane(X1 - X0, TOP, 30, 16, (x, y) => -0.05 * (0.5 + 0.5 * Math.sin(x * 2.6 + y * 0.4)), tex, [3, 2]);
  back.position.set((X0 + X1) / 2, TOP / 2, ZB - 0.02); set.add(back);
  for (const [x, ry] of [[X0, Math.PI / 2], [X1, -Math.PI / 2]]) {
    const side = sheetPlane(ZF - ZB, TOP, 14, 16, (zz, y) => 0.08 * Math.sin(zz * 3.1 + x) * (1 - y / TOP * 0.6), tex, [2, 2]);
    side.rotation.y = ry; side.position.set(x, TOP / 2, (ZB + ZF) / 2); set.add(side);
  }
  const roof = sheetPlane(X1 - X0 + 0.3, ZF - ZB + 0.3, 30, 16, (x, y) => {
    const sx = 1 - (2 * x / (X1 - X0 + 0.3)) ** 2, sy = 1 - (2 * y / (ZF - ZB + 0.3)) ** 2;
    return 0.55 * sx * sy + 0.04 * Math.sin(x * 3 + y * 2); // +local z = down after the rotation
  }, tex, [3, 2]);
  roof.rotation.x = Math.PI / 2; roof.position.set((X0 + X1) / 2, TOP, (ZB + ZF) / 2); set.add(roof);
  const hem = sheetPlane(X1 - X0 + 0.3, 0.45, 30, 2, (x) => 0.05 * Math.sin(x * 4), tex, [3, 0.3]);
  hem.position.set((X0 + X1) / 2, TOP - 0.2, ZF + 0.15); set.add(hem);
  for (const [x, z] of [[X0 - 0.05, ZB], [X1 + 0.05, ZB]]) { // chair backs poking above the roof corners
    set.add(at(box(0.1, 0.9, 0.1, 0x6a4426), x - 0.25, TOP + 0.3, z));
    set.add(at(box(0.1, 0.9, 0.1, 0x6a4426), x + 0.25, TOP + 0.3, z));
    set.add(at(box(0.6, 0.12, 0.1, 0x6a4426), x, TOP + 0.7, z));
  }

  // board: the flashlight's light pool on the back sheet (no frame)
  const screen = boardScreen(boardTexture);
  screen.material.transparent = true; // the `sheet` board style fades to alpha 0 at the edges
  set.add(screen);

  // props inside: pillows, Tito's plush llama, candy bucket, a comic
  for (const [x, z, c, ry] of [[-2.7, -1.6, 0x4a6ad0, 0.3], [3.5, -1.5, 0xd06a8a, -0.4], [-3.1, 0.6, 0x6ab07a, 0.8]]) {
    const p = at(box(0.9, 0.3, 0.6, c, { bevel: 0.12 }), x, 0.15, z); p.rotation.y = ry; p.castShadow = true; set.add(p);
  }
  const llama = plushLlama(); llama.position.set(-2.55, 0, -0.7); llama.rotation.y = 0.5; set.add(llama);
  const bucket = new THREE.Group();
  bucket.add(at(cylinder(0.22, 0.3, 0xff7a1a, 10), 0, 0.15, 0));
  for (const [x, z, c] of [[-0.06, 0.04, 0xffd23a], [0.07, -0.03, 0x4ae0ff], [0.0, 0.08, 0xff4ad8]]) bucket.add(at(box(0.1, 0.06, 0.06, c), x, 0.32, z));
  bucket.position.set(3.4, 0, 0.9); set.add(bucket);
  const comic = at(box(0.5, 0.02, 0.36, 0xe8d030), 0.75, 0.03, 1.35); comic.rotation.y = 0.4; set.add(comic);

  // the one light source: a flashlight standing on the floor in the middle, lighting faces from below
  const fl = flashlight(); fl.group.position.set(-0.1, 0, 1.25); set.add(fl.group);
  const lamp = new THREE.PointLight(0xffb868, 22, 12, 1.5);
  lamp.position.set(-0.1, 0.75, 1.35);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; lamp.shadow.radius = 4;
  set.add(lamp);
  const front = new THREE.PointLight(0xffc890, 5, 10, 1.6); front.position.set(0.4, 1.2, 3.2); set.add(front); // bounce off the floor toward the cast

  // dim moonlight / ambient so the dark stays readable
  set.add(new THREE.HemisphereLight(0x4a5a9a, 0x1a1008, 0.35));
  const moon = new THREE.DirectionalLight(0x8aa0ff, 0.25); moon.position.set(5, 7, 4); set.add(moon);

  function update(t) {
    const f = flicker(t * 0.35, 3) * (0.97 + 0.03 * Math.sin(t * 0.7));
    lamp.intensity = 22 * f;
    fl.lens.emissiveIntensity = 2.4 * f;
    fl.beam.opacity = 0.035 * f;
  }
  update(0);
  return { group: set, update, background: 0x05040a, fog: [0x07060e, 14, 34], exposure: 1.25, boardStyle: 'sheet' };
}

export default { name: 'sheet_fort', build };
