import * as THREE from 'three';
import { box, at, rng, cylinder, ownMat, canvasTexture } from './common.js';
import { makeLocation, glow, blinkers } from './modern.js';

// TV news studio (news roundups): deep-blue set with a world-map video wall, studio light rig, a curved anchor
// desk segment on each side, a spinning globe, a studio camera with a blinking red tally light, an "AL AIRE" sign
// and a scrolling 3D news ticker at floor level. Board: the studio's main screen (`screen` style).

const BLUE_DARK = 0x0c1838, DESK = 0x1a2a52, TRIM = 0x2ad8ff, RED = 0xff2a3a;

/** Curved desk segment built from a few angled boxes with a glowing front strip. */
function deskSegment(sx) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = sx * (0.25 + i * 0.28);
    const seg = at(box(1.0, 1.0, 0.7, DESK, { bevel: 0.03 }), sx * i * 0.92, 0.5, i * 0.28);
    seg.rotation.y = -a;
    g.add(seg);
    const strip = at(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.07, 0.04), glow(TRIM, 1.5)), sx * i * 0.92, 0.72, i * 0.28 + 0.36);
    strip.rotation.y = -a;
    g.add(strip);
    const top = at(box(1.05, 0.06, 0.8, 0xdfe6f2), sx * i * 0.92, 1.03, i * 0.28);
    top.rotation.y = -a;
    g.add(top);
  }
  return g;
}

/** Low-poly globe on a stand; returns { group, ball }. */
function globe() {
  const g = new THREE.Group();
  const ball = new THREE.Group();
  ball.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), ownMat(0x2a6ad8, { emissive: 0x0a2a6a, emissiveIntensity: 0.8 })));
  const r = rng(77);
  for (let i = 0; i < 9; i++) { // continents as small green blocks on the surface
    const th = r() * Math.PI * 2, ph = 0.5 + r() * 2.1;
    const v = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)).multiplyScalar(0.53);
    const c = at(box(0.22 + r() * 0.12, 0.16, 0.06, 0x3ccf6a), v.x, v.y, v.z);
    c.lookAt(v.clone().multiplyScalar(2));
    ball.add(c);
  }
  g.add(ball);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.03, 6, 24), ownMat(0xc0c8d8, { metalness: 0.6, roughness: 0.3 }));
  ring.rotation.y = Math.PI / 2; g.add(ring);
  g.add(at(cylinder(0.05, 0.9, 0xc0c8d8, 8, { metalness: 0.6 }), 0, -1.0, 0));
  g.add(at(cylinder(0.32, 0.08, 0x1a2a52, 10), 0, -1.45, 0));
  return { group: g, ball };
}

/** Studio camera on a tripod, facing the set, with a red tally light; returns { group, tally }. */
function studioCamera() {
  const g = new THREE.Group();
  for (const a of [0, 2.1, 4.2]) {
    const leg = at(box(0.06, 1.3, 0.06, 0x222632), Math.sin(a) * 0.3, 0.6, Math.cos(a) * 0.3);
    leg.rotation.set(Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25);
    g.add(leg);
  }
  g.add(at(box(0.5, 0.42, 0.9, 0x2e3446, { bevel: 0.04 }), 0, 1.45, 0));
  g.add(at(cylinder(0.17, 0.4, 0x15151a, 10), 0, 1.45, 0.6).rotateX(Math.PI / 2));
  g.add(at(box(0.32, 0.24, 0.06, 0x101820), 0, 1.5, -0.48)); // viewfinder
  const tally = glow(RED, 2);
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), tally), 0, 1.72, 0.2));
  return { group: g, tally };
}

export default makeLocation('news_studio', {
  floor: 0x141c34, frame: 0x0a1020, boardStyle: 'screen', background: 0x050a1c, fog: [0x070c20, 18, 42], exposure: 1.3,
  sky: (g, W, H) => {
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#040818'); grd.addColorStop(1, '#0f2050');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // video wall: grid of panels with a stylized world map (blocky continents)
    const x0 = 160, y0 = 330, cw = 1728, ch = 520;
    g.fillStyle = '#0a1a40'; g.fillRect(x0, y0, cw, ch);
    const r = rng(9);
    const blobs = [[0.12, 0.3, 0.16, 0.28], [0.22, 0.62, 0.08, 0.3], [0.45, 0.25, 0.1, 0.2], [0.48, 0.5, 0.1, 0.32], [0.62, 0.28, 0.22, 0.3], [0.8, 0.68, 0.08, 0.14]];
    for (const [bx, by, bw, bh] of blobs) {
      for (let i = 0; i < 70; i++) {
        const px = x0 + (bx + r() * bw) * cw, py = y0 + (by + r() * bh) * ch;
        g.fillStyle = `rgba(80,190,255,${0.12 + r() * 0.16})`; g.fillRect(px, py, 18, 14);
      }
    }
    g.strokeStyle = 'rgba(6,10,24,0.9)'; g.lineWidth = 6;
    for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(x0 + i * cw / 8, y0); g.lineTo(x0 + i * cw / 8, y0 + ch); g.stroke(); }
    for (let j = 1; j < 3; j++) { g.beginPath(); g.moveTo(x0, y0 + j * ch / 3); g.lineTo(x0 + cw, y0 + j * ch / 3); g.stroke(); }
    // light rig truss with lamps
    g.fillStyle = '#1a2440'; g.fillRect(0, 120, W, 26);
    for (let i = 0; i < 16; i++) { g.fillStyle = '#2a3450'; g.fillRect(40 + i * 128, 146, 40, 50); g.fillStyle = 'rgba(255,240,200,0.8)'; g.beginPath(); g.arc(60 + i * 128, 200, 12, 0, 7); g.fill(); }
    // channel bug + "NOTICIAS" band low on the wall (well below the caption zone)
    g.fillStyle = '#c8102e'; g.fillRect(0, 880, W, 70);
    g.font = '900 54px Arial Black'; g.textAlign = 'center'; g.fillStyle = '#ffffff';
    g.fillText('NOTICIAS CUBITOS  •  LO MÁS RARO DE LA SEMANA  •  NOTICIAS CUBITOS', W / 2, 935);
    g.fillStyle = '#0a1230'; g.fillRect(0, 950, W, H - 950);
  },
  props: (set) => {
    const ups = [];
    // anchor desk segments at both sides, outside the character area
    const dl = deskSegment(-1); dl.position.set(-3.2, 0, -1.6); set.add(dl);
    const dr = deskSegment(1); dr.position.set(3.0, 0, -1.6); set.add(dr);
    // spinning globe on the right desk
    const gl = globe(); gl.group.position.set(4.3, 2.08, -1.4); gl.group.scale.setScalar(0.7); set.add(gl.group);
    // studio camera at the left, aimed at the set
    const cam = studioCamera(); cam.group.position.set(-4.6, 0, -0.4); cam.group.rotation.y = 0.6; set.add(cam.group);
    // "AL AIRE" sign over the board frame's right corner
    const onAir = glow(RED, 1.8);
    const sign = new THREE.Group();
    sign.add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.34, 0.08), onAir));
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.28), new THREE.MeshBasicMaterial({ transparent: true, map: canvasTexture(512, 156, (g, W, H) => {
      g.font = '900 104px Arial Black'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText('AL AIRE', W / 2, H / 2 + 6);
    }) }));
    label.position.z = 0.045; sign.add(label);
    sign.add(at(box(1.08, 0.42, 0.06, 0x15151a), 0, 0, -0.05));
    sign.position.set(2.2, 4.15, -3.0); set.add(sign);
    // side light towers with blinking lamps
    const lamps = [];
    for (const sx of [-1, 1]) {
      set.add(at(box(0.14, 4.6, 0.14, 0x222632), sx * 5.4, 2.3, -3.2));
      for (let i = 0; i < 4; i++) lamps.push([sx * 5.4, 1.2 + i * 1.0, -3.08, 0.22]);
    }
    const blink = blinkers(set, lamps, [0xfff0c0, 0x2ad8ff], 1.5);
    // scrolling news ticker at floor level (red / white blocks), below the caption area
    const tape = new THREE.Group();
    for (let i = 0; i < 40; i++) tape.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.04), glow(i % 4 ? 0xf4f4f0 : RED, 1.3)), i * 0.6, 0, 0));
    tape.position.set(-12, 0.22, -3.3); set.add(tape);
    const key = new THREE.PointLight(0x9ac8ff, 6, 10, 1.5); key.position.set(0, 3.6, -0.8); set.add(key);
    const warm = new THREE.PointLight(0xffd0a0, 4, 8, 1.5); warm.position.set(-2.5, 3.0, 1.0); set.add(warm);
    ups.push(blink, (t) => {
      gl.ball.rotation.y = t * 0.8;
      cam.tally.emissiveIntensity = (Math.floor(t * 1.2) % 2) ? 2.2 : 0.4;
      onAir.emissiveIntensity = 1.6 + 0.4 * Math.sin(t * 3);
      tape.position.x = -12 - ((t * 0.9) % 12);
    });
    return ups;
  },
  lights: { hemi: [0xb0c8ff, 0x18203a, 1.15], key: [0xffffff, 1.6], fill: [0xd8e8ff, 1.0] },
});
