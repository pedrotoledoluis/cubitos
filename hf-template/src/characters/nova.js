import * as THREE from 'three';
import {
  box, at, mat, blinkAt, squashAt, hopAt, blendIn, mouthLevel, lookDir, clamp, lerp,
} from './util.js';
import { createArm, nlerp } from './rig.js';

/**
 * Nova Quark ("Nova"): Tito's cousin. Small violet cube, a bit taller and slimmer than Tito, two blocky
 * pigtail buns, a glowing cyan star hair clip, big curious eyes with lashes, expressive brows, tiny arms.
 * Smart and a little smug (friendly). Same contract as Tito: createNova() -> { group, update(state), faceHeight, height }.
 */
export const NOVA_EMOTIONS = ['neutral', 'curious', 'smug', 'happy', 'surprised', 'explaining'];

const VIOLET = 0x7b5cd6, VIOLET_DARK = 0x4a3390, VIOLET_ARM = 0x6a4cc4, HAIR = 0x2e1f5e, CYAN = 0x7ef0ff;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// arms: [character right (screen left), character left]; `explaining` raises the left arm, index up.
const EMO = {
  neutral:    { eye: 1.0,  pupil: 1.0,  brow: 0,    browTilt: 0,    lidTop: 0,    lidBot: 0,    arms: [V(-0.3, -1, 0.2), V(0.3, -1, 0.2)], mouth: null,    lean: 0 },
  curious:    { eye: 1.1,  pupil: 1.05, brow: 0.08, browTilt: 0.12, lidTop: 0,    lidBot: 0,    arms: [V(-0.3, -1, 0.3), V(0.5, 0.2, 0.9)], mouth: 'O',     lean: 0.05 },
  smug:       { eye: 1.0,  pupil: 0.95, brow: 0,    browTilt: 0,    lidTop: 0.42, lidBot: 0.12, arms: [V(-0.6, -0.4, 0.8), V(0.6, -0.4, 0.8)], mouth: 'smirk', lean: -0.04 },
  happy:      { eye: 1.05, pupil: 1.0,  brow: 0.06, browTilt: -0.1, lidTop: 0,    lidBot: 0.3,  arms: [V(-0.8, 0.7, 0.2), V(0.8, 0.7, 0.2)], mouth: 'smile', lean: 0 },
  surprised:  { eye: 1.16, pupil: 0.7,  brow: 0.12, browTilt: 0.2,  lidTop: 0,    lidBot: 0,    arms: [V(-1, 0.6, 0.35), V(1, 0.6, 0.35)],  mouth: 'O',     lean: -0.05 },
  explaining: { eye: 1.0,  pupil: 1.0,  brow: 0.04, browTilt: 0,    lidTop: 0.15, lidBot: 0,    arms: [V(-0.3, -1, 0.2), V(0.25, 1, 0.15)], mouth: null,    lean: 0 },
};

export function createNova() {
  const root = new THREE.Group();
  root.name = 'nova';
  const body = new THREE.Group();
  root.add(body);

  const W = 0.86, Hh = 1.08, D = 0.78;
  const legH = 0.2;
  const faceZ = D / 2;

  for (const sx of [-1, 1]) {
    root.add(at(box(0.17, legH, 0.2, VIOLET_DARK, { bevel: 0.025 }), sx * 0.2, legH / 2, 0));
    root.add(at(box(0.2, 0.08, 0.28, 0x2a1d55, { bevel: 0.025 }), sx * 0.2, 0.04, 0.05));
  }
  body.position.y = legH;
  body.add(at(box(W, Hh, D, VIOLET, { bevel: 0.06, rim: 0.1 }), 0, Hh / 2, 0));
  // hair cap + fringe
  body.add(at(box(W + 0.04, 0.16, D + 0.04, HAIR, { bevel: 0.04 }), 0, Hh - 0.04, 0));
  for (let i = 0; i < 4; i++) body.add(at(box(0.2, 0.1, 0.06, HAIR, { bevel: 0.02 }), -0.3 + i * 0.2, Hh - 0.15 - (i % 2) * 0.03, faceZ + 0.01));
  // two blocky pigtail buns on top sides
  const buns = [-1, 1].map((sx) => {
    const g = at(new THREE.Group(), sx * (W / 2 + 0.02), Hh + 0.06, -0.02);
    g.add(box(0.28, 0.28, 0.28, HAIR, { bevel: 0.06 }));
    g.add(at(box(0.12, 0.08, 0.12, VIOLET_DARK), 0, -0.16, 0));
    body.add(g);
    return g;
  });
  // glowing cyan star hair clip (two crossed squares + halo)
  const starMat = new THREE.MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 1.3, flatShading: true });
  const clip = at(new THREE.Group(), 0.24, Hh - 0.02, faceZ + 0.04);
  for (const r of [0, Math.PI / 4]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.04), starMat); s.rotation.z = r; clip.add(s); }
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
  clip.add(halo);
  clip.add(new THREE.PointLight(CYAN, 0.5, 1.3, 2));
  body.add(clip);

  // ---- eyes with lashes ----
  const eyeY = Hh * 0.6;
  const eyes = [];
  for (const sx of [-1, 1]) {
    const g = at(new THREE.Group(), sx * 0.19, eyeY, faceZ);
    const white = at(box(0.29, 0.34, 0.04, 0xfbfbf7, { roughness: 0.35, rim: 0, bevel: 0.012 }), 0, 0, 0.02);
    const pupil = at(box(0.15, 0.17, 0.02, 0x2a1450, { rim: 0 }), 0, -0.02, 0.048);
    pupil.add(at(box(0.05, 0.05, 0.01, 0xffffff, { emissive: 0x999999, rim: 0 }), 0.035, 0.04, 0.012));
    const lidTop = new THREE.Group(); lidTop.position.set(0, 0.175, 0.07);
    lidTop.add(at(box(0.31, 0.35, 0.02, VIOLET, { rim: 0 }), 0, -0.175, 0));
    const lidBot = new THREE.Group(); lidBot.position.set(0, -0.175, 0.07);
    lidBot.add(at(box(0.31, 0.35, 0.02, VIOLET, { rim: 0 }), 0, 0.175, 0));
    // three lashes at the outer top corner, ride on the lid edge
    const lashes = new THREE.Group(); lashes.position.set(0, 0.175, 0.08);
    for (let i = 0; i < 3; i++) {
      const l = at(box(0.035, 0.1, 0.02, 0x140a2a, { rim: 0 }), sx * (0.06 + i * 0.05), 0.04, 0);
      l.rotation.z = -sx * (0.2 + i * 0.3);
      lashes.add(l);
    }
    g.add(white, pupil, lidTop, lidBot, lashes);
    body.add(g);
    eyes.push({ g, pupil, lidTop, lidBot, lashes, sx });
  }
  const brows = [-1, 1].map((sx) => {
    const g = at(new THREE.Group(), sx * 0.19, eyeY + 0.24, faceZ + 0.025);
    g.add(box(0.22, 0.05, 0.05, HAIR, { bevel: 0.012 }));
    body.add(g);
    return { g, sx };
  });

  // ---- mouth ----
  const mouthY = Hh * 0.24;
  const mouthG = at(new THREE.Group(), 0, mouthY, faceZ + 0.02);
  const slot = box(0.18, 1, 0.04, 0x2a0a20, { rim: 0 });
  const corners = [-1, 1].map((sx) => { const c = at(box(0.06, 0.06, 0.04, 0x2a0a20, { rim: 0 }), sx * 0.115, 0.035, 0); mouthG.add(c); return c; });
  const tongue = at(box(0.1, 0.045, 0.02, 0xff7a9a, { rim: 0 }), 0, -0.03, 0.025);
  mouthG.add(slot, tongue);
  body.add(mouthG);
  // blush
  for (const sx of [-1, 1]) body.add(at(box(0.12, 0.05, 0.02, 0xd98ad8, { rim: 0 }), sx * 0.3, mouthY + 0.1, faceZ + 0.012));

  // ---- tiny arms ----
  const shoulders = [V(-W / 2 - 0.05, 0.52, 0.05), V(W / 2 + 0.05, 0.52, 0.05)];
  const arms = shoulders.map((p) => {
    const a = createArm({ color: VIOLET_ARM, handColor: 0x9a80e8, length: 0.24, thick: 0.1, hand: 0.12, bevel: 0.02 });
    a.pivot.position.copy(p);
    body.add(a.pivot);
    return a;
  });
  // raised index finger on the left hand (visible while explaining)
  const finger = at(box(0.04, 0.12, 0.04, 0x9a80e8, { bevel: 0.01 }), 0, -0.11, 0);
  arms[1].hand.add(finger);

  root.traverse((o) => { if (o.isMesh && o !== halo) o.castShadow = true; });

  /** state: { t, mouth, speaking, sinceLineStart, emotion, prevEmotion, emotionSince, lookAt, mouthShape } */
  function update(s) {
    const t = s.t || 0;
    const amp = clamp(s.mouth || 0);
    const emoName = EMO[s.emotion] ? s.emotion : 'neutral';
    const cur = EMO[emoName];
    const prev = EMO[s.prevEmotion] || cur;
    const k = s.prevEmotion ? blendIn(s.emotionSince, 0.25) : 1;
    const mix = (key) => lerp(prev[key], cur[key], k);

    const since = s.emotionSince ?? s.sinceLineStart;
    const strong = emoName === 'surprised' || emoName === 'happy';
    const sq = squashAt(since, strong ? 0.2 : 0.1, 0.5);
    const hop = strong ? hopAt(since - 0.08, 0.14) : 0;
    body.scale.set(sq.xz, sq.y, sq.xz);
    body.position.y = legH + Math.abs(Math.sin(t * 2.1 + 1)) * 0.02 + hop;

    const look = lookDir(body, s.lookAt, V(0, eyeY, faceZ));
    body.rotation.y = -0.25 + Math.sin(t * 0.8 + 2) * 0.04 + (look ? look.x * 0.15 : 0);
    body.rotation.x = mix('lean');
    body.rotation.z = Math.sin(t * 1.1) * 0.02 + (emoName === 'smug' ? -0.07 : emoName === 'curious' ? 0.08 : 0);
    buns.forEach((b, i) => { b.rotation.z = Math.sin(t * 2.6 + i * 1.5) * 0.06 + Math.sin(Math.max(0, since ?? 99) * 16) * Math.exp(-(since ?? 99) * 4) * 0.2; });
    clip.rotation.z = t * 0.6;
    starMat.emissiveIntensity = 1.1 + amp * 0.6 + Math.sin(t * 3.3) * 0.2 + (emoName === 'explaining' ? 0.5 : 0);

    // eyes
    const es = mix('eye');
    const ps = mix('pupil');
    const blink = emoName === 'surprised' ? 0 : blinkAt(t, 3.7, 1.1);
    const lx = look ? look.x * 0.07 : 0.03;
    const ly = look ? look.y * 0.07 : (emoName === 'curious' ? 0.03 : 0);
    for (const e of eyes) {
      e.g.scale.set(es, es, 1);
      e.pupil.scale.set(ps, ps, 1);
      e.pupil.position.x = clamp(lx, -0.07, 0.07);
      e.pupil.position.y = -0.02 + clamp(ly, -0.07, 0.07);
      const tc = Math.max(blink, mix('lidTop'));
      e.lidTop.scale.y = Math.max(0.001, tc);
      e.lidTop.visible = tc > 0.02;
      e.lashes.position.y = 0.175 - tc * 0.3;
      const bc = mix('lidBot');
      e.lidBot.scale.y = Math.max(0.001, bc);
      e.lidBot.visible = bc > 0.02;
    }
    for (const b of brows) {
      b.g.position.y = eyeY + 0.24 + mix('brow') + (es - 1) * 0.15;
      b.g.rotation.z = b.sx * mix('browTilt');
      if (emoName === 'smug') { // one raised brow
        b.g.position.y += b.sx > 0 ? 0.09 : -0.03;
        b.g.rotation.z = b.sx > 0 ? 0.18 : -0.1;
      }
    }

    // mouth
    let shape = s.mouthShape || (s.speaking || amp > 0.05 ? mouthLevel(amp) : cur.mouth || 'closed');
    const M = {
      closed: [1, 0.05], half: [1, 0.11], open: [0.95, 0.2], O: [0.65, 0.18],
      smile: [1.25, 0.06], smirk: [0.9, 0.05],
    }[shape] || [1, 0.05];
    slot.scale.set(M[0], M[1], 1);
    tongue.visible = shape === 'open';
    corners[0].visible = shape === 'smile';
    corners[1].visible = shape === 'smile' || shape === 'smirk';
    mouthG.rotation.z = shape === 'smirk' ? 0.16 : 0;
    mouthG.position.x = shape === 'smirk' ? 0.04 : 0;

    // arms
    const talk = s.speaking ? 1 : 0;
    arms.forEach((a, i) => {
      const dir = nlerp(prev.arms[i], cur.arms[i], k);
      if (talk && !(emoName === 'explaining' && i === 1)) dir.add(V(0, Math.sin(t * 6.4 + i * 1.9) * 0.3, 0)).normalize();
      if (emoName === 'explaining' && i === 1) dir.add(V(Math.sin(t * 5) * 0.08, 0, 0)).normalize();
      a.aim(dir);
    });
    finger.visible = emoName === 'explaining';
  }

  update({ t: 0, mouth: 0 });
  return { group: root, update, faceHeight: legH + eyeY - 0.1, height: legH + Hh + 0.2, emotions: NOVA_EMOTIONS };
}
