import * as THREE from 'three';
import { BOARD, boardScreen, box, at, rng, canvasTexture, backdrop, cylinder, ownMat } from './common.js';

// Uraniborg (island of Hven, Denmark, ~1580), at night: Renaissance castle-observatory with onion-dome towers,
// twinkling stars, a big brass mural quadrant, the sea in the distance and a low-poly moose that sways
// (and staggers now and then). 2D graphics show on a star-chart easel at BOARD.

const BRICK = 0xa0503a, STONE = 0xd8cdb4, COPPER = 0x4f9a86, BRASS = 0xd9a93a;

function skyTexture() {
  return canvasTexture(2048, 1024, (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, '#070b24'); sky.addColorStop(0.7, '#17225a'); sky.addColorStop(1, '#2c3a78');
    g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.7);
    // milky way band
    g.save(); g.translate(W / 2, H * 0.3); g.rotate(-0.25);
    const mw = g.createLinearGradient(0, -90, 0, 90);
    mw.addColorStop(0, 'rgba(160,170,255,0)'); mw.addColorStop(0.5, 'rgba(170,180,255,0.18)'); mw.addColorStop(1, 'rgba(160,170,255,0)');
    g.fillStyle = mw; g.fillRect(-W, -90, W * 2, 180);
    g.restore();
    const r = rng(77);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,240,${0.3 + r() * 0.5})`; g.fillRect(r() * W, r() * H * 0.62, 2, 2); }
    // moon
    g.fillStyle = '#f4efd6'; g.beginPath(); g.arc(1660, 170, 56, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#070b24'; g.beginPath(); g.arc(1684, 156, 52, 0, Math.PI * 2); g.fill();
    // sea with moonlight streaks
    const sea = g.createLinearGradient(0, H * 0.7, 0, H);
    sea.addColorStop(0, '#1f3166'); sea.addColorStop(1, '#0c1534');
    g.fillStyle = sea; g.fillRect(0, H * 0.7, W, H * 0.3);
    g.fillStyle = 'rgba(244,239,214,0.35)';
    for (let i = 0; i < 30; i++) g.fillRect(1560 + (r() - 0.5) * 300, H * 0.72 + r() * H * 0.25, 30 + r() * 80, 3);
    // far coast
    g.fillStyle = '#121a3e'; g.fillRect(0, H * 0.68, 700, H * 0.02);
  });
}

function grassTexture() {
  const tex = canvasTexture(512, 512, (g, W, H) => {
    g.fillStyle = '#2a4a34'; g.fillRect(0, 0, W, H);
    const r = rng(8);
    for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? '#335a3e' : '#24402e'; g.fillRect(r() * W, r() * H, 6, 10); }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

/** Onion dome on a short drum, with a gilded finial. */
function onionDome(r) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push(new THREE.Vector2(r * (0.9 * Math.sin(Math.PI * Math.min(1, k * 1.25)) + 0.12 * (1 - k)), k * r * 2.1)); }
  const dome = new THREE.Mesh(new THREE.LatheGeometry(pts, 8), new THREE.MeshStandardMaterial({ color: COPPER, flatShading: true, roughness: 0.55, metalness: 0.2 }));
  dome.castShadow = true;
  g.add(dome);
  g.add(at(box(0.07, r * 0.8, 0.07, BRASS, { metalness: 0.6 }), 0, r * 2.4, 0));
  return g;
}

/** Tower: brick shaft with lit windows and an onion dome. Base at y = 0. */
function tower(w, h, domeR) {
  const g = new THREE.Group();
  g.add(at(box(w, h, w, BRICK), 0, h / 2, 0));
  g.add(at(box(w + 0.12, 0.16, w + 0.12, STONE), 0, h, 0));
  for (let i = 0; i < 2; i++) g.add(at(box(0.3, 0.5, 0.05, 0xffd27a, { emissive: 0xffb04a, emissiveIntensity: 0.9, rim: 0 }), 0, h * 0.35 + i * h * 0.35, w / 2 + 0.01));
  const d = onionDome(domeR); d.position.y = h + 0.08; g.add(d);
  return g;
}

/** Uraniborg main house: central block, two side towers and a tall central tower. */
function castle() {
  const g = new THREE.Group();
  g.add(at(box(6, 4, 3, BRICK), 0, 2, 0));
  g.add(at(box(6.2, 0.2, 3.2, STONE), 0, 4.05, 0));
  const roof = at(box(5.6, 1.4, 2.6, 0x3a3f4a), 0, 4.7, 0);
  g.add(roof);
  for (let i = 0; i < 5; i++) g.add(at(box(0.4, 0.7, 0.05, 0xffd27a, { emissive: 0xffb04a, emissiveIntensity: 0.9, rim: 0 }), -2.4 + i * 1.2, 2.3, 1.51));
  g.add(at(box(0.8, 1.4, 0.06, 0x3a2414), 0, 0.7, 1.52));
  for (const sx of [-1, 1]) { const t = tower(1.5, 5.2, 0.7); t.position.set(sx * 3.4, 0, 0.4); g.add(t); }
  const c = tower(1.6, 6.4, 0.85); c.position.set(0, 0, -0.2); g.add(c);
  return g;
}

/** Big brass mural quadrant: quarter-circle arc with radial spokes and a sighting arm. Returns the arm pivot. */
function quadrant() {
  const g = new THREE.Group();
  const R = 1.9;
  const brass = { metalness: 0.75, roughness: 0.3 };
  g.add(at(box(0.16, 0.16, 0.16, BRASS, brass), 0, 0, 0));
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI / 2;
    const seg = at(box(0.1, 0.34, 0.08, BRASS, brass), Math.cos(a) * R, Math.sin(a) * R, 0);
    seg.rotation.z = a;
    g.add(seg);
  }
  for (const a of [0, Math.PI / 4, Math.PI / 2]) {
    const sp = at(box(R, 0.06, 0.05, 0xb8862a, brass), Math.cos(a) * R / 2, Math.sin(a) * R / 2, -0.02);
    sp.rotation.z = a;
    g.add(sp);
  }
  const arm = new THREE.Group();
  arm.add(at(box(R + 0.25, 0.08, 0.06, 0xf0c860, brass), (R + 0.25) / 2, 0, 0.06));
  arm.add(at(box(0.12, 0.2, 0.08, 0xf0c860, brass), R + 0.2, 0, 0.06));
  g.add(arm);
  // stone pedestal
  g.add(at(box(0.5, 1.2, 0.5, STONE), 0.2, -0.7, 0));
  return { group: g, arm };
}

/** Low-poly moose (faces +x). ~1.7 units tall at the shoulder. */
function moose() {
  const g = new THREE.Group();
  const BROWN = 0x5a3a24, DARK = 0x3a2416, ANTLER = 0xd8c7a0;
  const body = at(new THREE.Group(), 0, 0, 0);
  body.add(at(box(1.6, 0.8, 0.7, BROWN, { bevel: 0.08 }), 0, 1.45, 0));
  body.add(at(box(0.6, 0.3, 0.5, DARK, { bevel: 0.05 }), 0.45, 1.9, 0)); // shoulder hump
  for (const [x, z] of [[0.6, 0.22], [0.6, -0.22], [-0.6, 0.22], [-0.6, -0.22]]) body.add(at(box(0.16, 1.1, 0.16, DARK), x, 0.55, z));
  const head = at(new THREE.Group(), 0.95, 1.75, 0);
  head.add(at(box(0.3, 0.5, 0.3, BROWN, { bevel: 0.05 }), 0, 0, 0));
  head.add(at(box(0.6, 0.3, 0.32, BROWN, { bevel: 0.06 }), 0.3, -0.18, 0)); // long muzzle
  head.add(at(box(0.12, 0.25, 0.1, DARK), 0.05, -0.4, 0)); // bell
  for (const sz of [-1, 1]) {
    head.add(at(box(0.05, 0.06, 0.02, 0x111111), 0.14, 0.08, sz * 0.16));
    const antler = at(new THREE.Group(), 0, 0.28, sz * 0.15);
    antler.add(at(box(0.18, 0.06, 0.55, ANTLER, { bevel: 0.02 }), 0, 0.05, sz * 0.25));
    for (let i = 0; i < 3; i++) antler.add(at(box(0.05, 0.22, 0.05, ANTLER), -0.05 + i * 0.05, 0.18, sz * (0.2 + i * 0.14)));
    head.add(antler);
  }
  body.add(head);
  g.add(body);
  return { group: g, body, head };
}

/** Star-chart easel: wooden A-frame holding a framed chart at BOARD, with a small brass compass on top. */
function starChartEasel(boardTexture) {
  const g = new THREE.Group();
  const B = BOARD;
  g.add(at(box(B.w + 0.26, B.h + 0.26, 0.12, 0x5a3a20), B.x, B.y, B.z - 0.02));
  for (const sx of [-1, 1]) {
    const leg = at(box(0.14, B.y + B.h / 2 + 0.6, 0.14, 0x6b4426), B.x + sx * (B.w / 2 - 0.1), (B.y + B.h / 2 + 0.6) / 2 - 0.1, B.z - 0.1);
    leg.rotation.z = sx * 0.08;
    g.add(leg);
  }
  const back = at(box(0.14, B.y + 0.6, 0.14, 0x6b4426), B.x, (B.y + 0.6) / 2, B.z - 0.7);
  back.rotation.x = -0.2;
  g.add(back);
  g.add(at(box(B.w + 0.4, 0.1, 0.3, 0x6b4426), B.x, B.y - B.h / 2 - 0.16, B.z + 0.06)); // ledge
  // brass ornaments: star medallions at the top corners
  for (const sx of [-1, 1]) g.add(at(box(0.2, 0.2, 0.06, BRASS, { metalness: 0.7, roughness: 0.3 }), B.x + sx * (B.w / 2 + 0.06), B.y + B.h / 2 + 0.06, B.z + 0.06).rotateZ(Math.PI / 4));
  g.add(boardScreen(boardTexture));
  return g;
}

function build({ boardTexture }) {
  const set = new THREE.Group();
  const floor = at(box(40, 0.2, 40, 0xffffff, { map: grassTexture() }), 0, -0.1, -4);
  floor.castShadow = false;
  set.add(floor);
  set.add(at(box(40, 0.2, 2.2, 0x8a826e), 0, 0.01, -1.8)); // garden path
  set.add(backdrop(skyTexture(), 90, 45, 0, 8, -30));

  const c = castle(); c.position.set(0, 0, -11); set.add(c);

  const q = quadrant(); q.group.position.set(-4.0, 1.3, -2.8); q.group.rotation.y = 0.35; set.add(q.group);
  const m = moose(); m.group.position.set(4.6, 0, -3.6); m.group.rotation.y = -2.6; m.group.scale.setScalar(0.85); set.add(m.group);
  set.add(starChartEasel(boardTexture));

  // twinkling stars: small unlit quads in front of the sky, each with its own phase
  const starMat = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, fog: false }));
  const r = rng(91);
  for (let i = 0; i < 45; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), starMat[i % 3]);
    s.position.set((r() - 0.5) * 50, 8 + r() * 14, -27);
    s.rotation.z = Math.PI / 4;
    set.add(s);
  }
  // lanterns near the characters keep their faces readable at night
  const lantern = (x, z) => {
    const l = new THREE.Group();
    l.add(at(box(0.08, 2.0, 0.08, 0x2a2a2a), 0, 1.0, 0));
    const glassMat = ownMat(0xfff0b0, { emissive: 0xffc860, emissiveIntensity: 1.5 });
    l.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), glassMat), 0, 2.15, 0));
    const pl = new THREE.PointLight(0xffc070, 5, 7, 1.5); pl.position.y = 2.1; l.add(pl);
    l.position.set(x, 0, z);
    set.add(l);
    return { glassMat, pl };
  };
  const lanterns = [lantern(-2.6, -1.2), lantern(2.4, -1.3)];

  set.add(new THREE.HemisphereLight(0x8a9cff, 0x203020, 0.9));
  const moon = new THREE.DirectionalLight(0xb8c8ff, 1.4);
  moon.position.set(-5, 9, 5);
  moon.target.position.set(0, 0, -2);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  moon.shadow.bias = -0.0006;
  set.add(moon, moon.target);
  const fill = new THREE.DirectionalLight(0xffe0c0, 1.0);
  fill.position.set(3, 4, 7);
  set.add(fill);

  function update(t) {
    starMat.forEach((mm, i) => { mm.opacity = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (2.1 + i * 0.9) + i * 2)); });
    q.arm.rotation.z = 0.5 + Math.sin(t * 0.35) * 0.35;
    // moose: gentle sway, and every ~9 s a tipsy stagger
    const cyc = t % 9, st = cyc > 6.5 ? Math.sin((cyc - 6.5) / 2.5 * Math.PI) : 0;
    m.body.rotation.x = Math.sin(t * 1.2) * 0.03 + st * 0.12 * Math.sin(t * 6);
    m.body.rotation.z = st * 0.06;
    m.head.rotation.z = Math.sin(t * 0.9) * 0.12 - 0.1;
    lanterns.forEach((l, i) => { const f = 0.92 + 0.06 * Math.sin(t * 11 + i * 3) + 0.03 * Math.sin(t * 31 + i); l.glassMat.emissiveIntensity = 1.5 * f; l.pl.intensity = 5 * f; });
  }
  update(0);
  return { group: set, update, background: 0x070b24, fog: [0x141c44, 22, 55], exposure: 1.2, boardStyle: 'poster' };
}

export default { name: 'uraniborg', build };
