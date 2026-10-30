import * as THREE from 'three';
import {
  PALETTE as P, box, at, mat, blinkAt, squashAt, hopAt, blendIn, mouthLevel, lookDir, clamp, lerp,
} from './util.js';
import { createArm, nlerp } from './rig.js';

/**
 * Tito v2: small red cube, big expressive eyes, antenna with a glowing tip, tiny arms. Curious.
 * Same contract as v1: createTito() -> { group, update(state), faceHeight, height }.
 */
export const TITO_EMOTIONS = ['neutral', 'surprised', 'happy', 'skeptical', 'scared'];

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Per-emotion face/body parameters.
const EMO = {
  neutral:   { eye: 1.0,  pupil: 1.0,  brow: 0,    browTilt: 0,     lidTop: 0,   lidBot: 0,    arms: [V(-0.3, -1, 0.2), V(0.3, -1, 0.2)],     mouth: null,      lean: 0 },
  surprised: { eye: 1.14, pupil: 0.72, brow: 0.11, browTilt: 0.22,  lidTop: 0,   lidBot: 0,    arms: [V(-1, 0.7, 0.35), V(1, 0.7, 0.35)],     mouth: 'O',       lean: -0.05 },
  happy:     { eye: 1.05, pupil: 1.0,  brow: 0.06, browTilt: -0.1,  lidTop: 0,   lidBot: 0.3, arms: [V(-0.7, 0.9, 0.2), V(0.9, -0.4, 0.3)],  mouth: 'smile',   lean: 0 },
  skeptical: { eye: 1.0,  pupil: 0.95, brow: 0,    browTilt: 0,     lidTop: 0.4, lidBot: 0,    arms: [V(-0.5, -1, 0.5), V(0.45, -1, 0.1)],    mouth: 'flat',    lean: 0 },
  scared:    { eye: 1.15, pupil: 0.55, brow: 0.07, browTilt: -0.3,  lidTop: 0,   lidBot: 0,    arms: [V(0.35, 0.25, 1), V(-0.35, 0.25, 1)],   mouth: 'grimace', lean: 0.06 },
};

export function createTito() {
  const root = new THREE.Group();
  root.name = 'tito';
  const body = new THREE.Group();
  root.add(body);

  const S = 0.95;
  const D = S * 0.9;
  const legH = 0.2;
  const faceZ = D / 2;

  for (const sx of [-1, 1]) {
    root.add(at(box(0.2, legH, 0.24, P.titoDark, { bevel: 0.025 }), sx * 0.22, legH / 2, 0));
    root.add(at(box(0.23, 0.08, 0.32, 0x6e1610, { bevel: 0.025 }), sx * 0.22, 0.04, 0.05));
  }

  body.position.y = legH;
  body.add(at(box(S, S, D, P.tito, { bevel: 0.06, rim: 0.1 }), 0, S / 2, 0));

  // antenna: springy stalk + glowing tip with a soft additive halo
  const antenna = at(new THREE.Group(), 0.12, S - 0.02, 0);
  antenna.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.36, 6), mat(P.antenna, { rim: 0.3 })), 0, 0.18, 0));
  const tip = at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 0),
    new THREE.MeshStandardMaterial({ color: P.glow, emissive: P.glow, emissiveIntensity: 1.3, flatShading: true, roughness: 0.4 })), 0, 0.4, 0);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8),
    new THREE.MeshBasicMaterial({ color: P.glow, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
  tip.add(halo);
  const tipLight = new THREE.PointLight(P.glow, 0.6, 1.4, 2);
  tip.add(tipLight);
  antenna.add(tip);
  body.add(antenna);
  // hair tuft
  for (let i = 0; i < 3; i++) {
    const tuft = at(box(0.065, 0.17, 0.065, 0xb8271d, { bevel: 0.015 }), -0.22 + i * 0.075, S + 0.06, 0.12);
    tuft.rotation.z = (i - 1) * 0.38;
    body.add(tuft);
  }

  // ---- eyes ----
  const eyeY = S * 0.63;
  const eyes = [];
  for (const sx of [-1, 1]) {
    const g = at(new THREE.Group(), sx * 0.2, eyeY, faceZ);
    const white = at(box(0.32, 0.36, 0.04, P.eyeWhite, { roughness: 0.35, rim: 0, bevel: 0.012 }), 0, 0, 0.02);
    const pupil = at(box(0.15, 0.17, 0.02, P.pupil, { rim: 0 }), 0, -0.02, 0.048);
    pupil.add(at(box(0.05, 0.05, 0.01, 0xffffff, { emissive: 0x999999, rim: 0 }), 0.035, 0.04, 0.012));
    const lidTop = new THREE.Group(); lidTop.position.set(0, 0.185, 0.07);
    lidTop.add(at(box(0.34, 0.37, 0.02, P.tito, { rim: 0 }), 0, -0.185, 0));
    const lidBot = new THREE.Group(); lidBot.position.set(0, -0.185, 0.07);
    lidBot.add(at(box(0.34, 0.37, 0.02, P.tito, { rim: 0 }), 0, 0.185, 0));
    g.add(white, pupil, lidTop, lidBot);
    body.add(g);
    eyes.push({ g, pupil, lidTop, lidBot, sx });
  }
  const brows = [-1, 1].map((sx) => {
    const g = at(new THREE.Group(), sx * 0.2, eyeY + 0.25, faceZ + 0.025);
    g.add(box(0.26, 0.065, 0.05, 0x5a0f0a, { bevel: 0.012 }));
    body.add(g);
    return { g, sx };
  });

  // ---- mouth: center slot + corners + teeth/tongue ----
  const mouthY = S * 0.25;
  const mouthG = at(new THREE.Group(), 0, mouthY, faceZ + 0.02);
  const slot = box(0.2, 1, 0.04, P.mouth, { rim: 0 });
  const corners = [-1, 1].map((sx) => { const c = at(box(0.07, 0.07, 0.04, P.mouth, { rim: 0 }), sx * 0.13, 0.04, 0); mouthG.add(c); return c; });
  const tongue = at(box(0.12, 0.05, 0.02, P.tongue, { rim: 0 }), 0, -0.03, 0.025);
  const teeth = at(box(0.26, 0.035, 0.02, 0xffffff, { rim: 0 }), 0, 0.02, 0.025);
  mouthG.add(slot, tongue, teeth);
  body.add(mouthG);

  // ---- tiny arms ----
  const shoulders = [V(-S / 2 - 0.05, 0.5, 0.06), V(S / 2 + 0.05, 0.5, 0.06)];
  const arms = shoulders.map((p) => {
    const a = createArm({ color: P.titoArm, handColor: 0xd94434, length: 0.24, thick: 0.11, hand: 0.13, bevel: 0.02 });
    a.pivot.position.copy(p);
    body.add(a.pivot);
    return a;
  });

  root.traverse((o) => { if (o.isMesh && o !== halo) o.castShadow = true; });

  /**
   * state: { t, mouth, speaking, sinceLineStart, emotion, lookX,
   *          prevEmotion, emotionSince, lookAt, mouthShape }
   */
  function update(s) {
    const t = s.t || 0;
    const amp = clamp(s.mouth || 0);
    const emoName = EMO[s.emotion] ? s.emotion : 'neutral';
    const cur = EMO[emoName];
    const prev = EMO[s.prevEmotion] || cur;
    const k = s.prevEmotion ? blendIn(s.emotionSince, 0.25) : 1;
    const mix = (key) => lerp(prev[key], cur[key], k);

    // reaction bounce: emotion change (or line start, v1 behaviour)
    const since = s.emotionSince ?? s.sinceLineStart;
    const strong = emoName === 'surprised' || emoName === 'scared' || emoName === 'happy';
    const sq = squashAt(since, strong ? 0.22 : 0.12, 0.5);
    const hop = strong ? hopAt(since - 0.08, emoName === 'scared' ? 0.08 : 0.16) : 0;
    const shrink = emoName === 'scared' ? 0.95 : 1;
    body.scale.set(sq.xz, sq.y * shrink, sq.xz);
    body.position.y = legH + Math.abs(Math.sin(t * 2.4)) * 0.022 + hop;
    body.position.x = emoName === 'scared' ? Math.sin(t * 47) * 0.012 : 0; // deterministic tremble

    const look = lookDir(body, s.lookAt, V(0, eyeY, faceZ));
    body.rotation.y = 0.25 + Math.sin(t * 0.9) * 0.04 + (look ? look.x * 0.15 : 0);
    body.rotation.x = mix('lean');
    body.rotation.z = Math.sin(t * 1.3) * 0.02 + (emoName === 'skeptical' ? 0.08 : emoName === 'surprised' ? -0.05 : 0);
    antenna.rotation.z = Math.sin(t * 3.1) * 0.15 + Math.sin(Math.max(0, since ?? 99) * 18) * Math.exp(-(since ?? 99) * 4) * 0.5;
    tip.material.emissiveIntensity = 1.1 + (emoName === 'happy' ? 0.8 : 0) + amp * 0.6 + Math.sin(t * 4) * 0.15;

    // eyes
    const es = mix('eye');
    const ps = mix('pupil');
    const blink = emoName === 'surprised' || emoName === 'scared' ? 0 : blinkAt(t, 3.3, 0.2);
    let lx = look ? look.x * 0.075 : (s.lookX ?? 0.04);
    let ly = look ? look.y * 0.07 : 0;
    if (emoName === 'skeptical' && !look) { lx = -0.07; ly = -0.01; }
    for (const e of eyes) {
      e.g.scale.set(es, es, 1);
      e.pupil.scale.set(ps, ps, 1);
      e.pupil.position.x = clamp(lx, -0.08, 0.08);
      e.pupil.position.y = -0.02 + clamp(ly, -0.08, 0.08);
      // skeptical: only one eye half-closed
      const top = e.sx < 0 ? mix('lidTop') : mix('lidTop') * 0.35;
      const tc = Math.max(blink, top);
      e.lidTop.scale.y = Math.max(0.001, tc);
      e.lidTop.visible = tc > 0.02;
      const bc = mix('lidBot');
      e.lidBot.scale.y = Math.max(0.001, bc);
      e.lidBot.visible = bc > 0.02;
    }
    for (const b of brows) {
      b.g.position.y = eyeY + 0.25 + mix('brow') + (es - 1) * 0.16;
      b.g.rotation.z = b.sx * mix('browTilt');
      if (emoName === 'skeptical') {
        b.g.position.y += b.sx > 0 ? 0.07 : -0.04;
        b.g.rotation.z = b.sx > 0 ? 0.12 : -0.28;
      }
    }

    // mouth
    let shape = s.mouthShape || (s.speaking || amp > 0.05 ? mouthLevel(amp) : cur.mouth || 'closed');
    if (s.speaking && cur.mouth === 'O' && amp > 0.12) shape = 'O';
    const M = {
      closed: [1, 0.05], half: [1, 0.11], open: [0.95, 0.2], O: [0.65, 0.2],
      smile: [1.25, 0.06], flat: [0.8, 0.045], grimace: [1.35, 0.1],
    }[shape] || [1, 0.05];
    slot.scale.set(M[0], M[1], 1);
    tongue.visible = shape === 'open' || (shape === 'smile' && amp > 0.3);
    teeth.visible = shape === 'grimace';
    for (const c of corners) c.visible = shape === 'smile';
    mouthG.rotation.z = shape === 'flat' ? 0.18 : 0;
    mouthG.position.x = shape === 'flat' ? 0.05 : 0;
    mouthG.position.y = mouthY + (shape === 'grimace' ? Math.sin(t * 30) * 0.004 : 0);

    // arms: emotion pose + talk flap
    const talk = s.speaking ? 1 : 0;
    arms.forEach((a, i) => {
      const dir = nlerp(prev.arms[i], cur.arms[i], k);
      if (talk) dir.add(V(0, Math.sin(t * 6 + i * 1.7) * 0.35, 0)).normalize();
      if (emoName === 'happy' && i === 0) dir.add(V(Math.sin(t * 9) * 0.2, 0, 0)).normalize(); // wave
      a.aim(dir);
    });
  }

  update({ t: 0, mouth: 0 });
  return { group: root, update, faceHeight: legH + eyeY - 0.1, height: legH + S, emotions: TITO_EMOTIONS };
}
