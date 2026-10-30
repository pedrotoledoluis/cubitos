import * as THREE from 'three';
import {
  PALETTE as P, box, at, mat, cardboardTexture, blinkAt, squashAt, blendIn, mouthLevel,
  lookDir, localPointDir, clamp, lerp, smooth,
} from './util.js';
import { createArm, nlerp } from './rig.js';

/**
 * Profe Claudio v2: big cardboard-brown cube, square glasses, blocky mustache, pointer stick. Deadpan.
 * Same contract as v1: createProfe() -> { group, update(state), faceHeight, height }.
 * See characters-v2/README.md for the full state reference.
 */
export const PROFE_POSES = ['idle', 'explain', 'shrug', 'facepalm', 'wave'];

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function createProfe() {
  const root = new THREE.Group();
  root.name = 'profe';
  const body = new THREE.Group();
  root.add(body);

  const S = 1.5;
  const D = S * 0.92;
  const legH = 0.3;
  const faceZ = D / 2;

  // legs + little feet
  for (const sx of [-1, 1]) {
    root.add(at(box(0.32, legH, 0.36, P.profeDark, { bevel: 0.03 }), sx * 0.38, legH / 2, 0));
    root.add(at(box(0.36, 0.1, 0.46, 0x3d2513, { bevel: 0.03 }), sx * 0.38, 0.05, 0.06));
  }

  body.position.y = legH;
  const torsoMat = mat(P.profe, { map: cardboardTexture(), rim: 0.1 });
  const torso = at(box(S, S, D, P.profe, { bevel: 0.07 }), 0, S / 2, 0);
  torso.material = torsoMat;
  body.add(torso);
  // cardboard tape strip across the top (subtle detail, reads as "box")
  body.add(at(box(0.36, 0.02, D + 0.004, 0xc89a5c, { rim: 0.2 }), 0, S + 0.0, 0));

  // chalk smudge on the cheek
  const chalk = at(new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.1),
    new THREE.MeshBasicMaterial({ color: P.chalk, transparent: true, opacity: 0.45 })), 0.55, 0.62, faceZ + 0.002);
  chalk.rotation.z = 0.25;
  body.add(chalk);

  // ---- face ----
  const eyeY = S * 0.68;
  const eyes = [];
  for (const sx of [-1, 1]) {
    body.add(at(box(0.48, 0.4, 0.07, P.glasses, { roughness: 0.35, bevel: 0.015, rim: 0.2 }), sx * 0.3, eyeY, faceZ + 0.03));
    body.add(at(box(0.36, 0.28, 0.02, P.lens, { roughness: 0.25, rim: 0 }), sx * 0.3, eyeY, faceZ + 0.068));
    const pupil = at(box(0.12, 0.12, 0.02, P.pupil, { rim: 0 }), sx * 0.3, eyeY - 0.02, faceZ + 0.082);
    const glint = at(box(0.035, 0.035, 0.01, 0xffffff, { emissive: 0x777777, rim: 0 }), 0, 0, 0.012);
    pupil.add(glint);
    // eyelid: a lens-sized slab hinged at the top of the lens
    const lidPivot = at(new THREE.Group(), sx * 0.3, eyeY + 0.14, faceZ + 0.09);
    const lid = at(box(0.37, 0.29, 0.02, 0x7d5130, { rim: 0 }), 0, -0.145, 0);
    lidPivot.add(lid);
    body.add(pupil, lidPivot);
    eyes.push({ pupil, glint, lidPivot, lid, sx });
  }
  body.add(at(box(0.16, 0.06, 0.06, P.glasses), 0, eyeY + 0.06, faceZ + 0.04));
  // brows pivot at their inner end so they can tilt
  const brows = [-1, 1].map((sx) => {
    const g = at(new THREE.Group(), sx * 0.3, eyeY + 0.31, faceZ + 0.03);
    g.add(box(0.38, 0.08, 0.06, 0x3a2412, { bevel: 0.015 }));
    body.add(g);
    return { g, sx };
  });

  // blocky mustache: a center bar with drooping end blocks
  const mustache = at(new THREE.Group(), 0, S * 0.42, faceZ + 0.05);
  mustache.add(box(0.56, 0.13, 0.1, P.mustache, { bevel: 0.025 }));
  for (const sx of [-1, 1]) {
    const tip = at(box(0.17, 0.15, 0.1, P.mustache, { bevel: 0.025 }), sx * 0.31, -0.06, 0);
    tip.rotation.z = sx * -0.25;
    mustache.add(tip);
  }
  body.add(mustache);

  // mouth below the mustache: dark slot + tongue
  const mouthY = S * 0.27;
  const mouth = at(box(0.3, 1, 0.04, P.mouth, { rim: 0 }), 0, mouthY, faceZ + 0.02);
  const tongue = at(box(0.16, 0.05, 0.02, P.tongue, { rim: 0 }), 0, 0, faceZ + 0.045);
  body.add(mouth, tongue);

  // teal bowtie at the bottom of the face
  const bowtie = at(new THREE.Group(), 0, 0.14, faceZ + 0.04);
  for (const sx of [-1, 1]) {
    const wing = at(box(0.18, 0.15, 0.07, P.bowtie, { bevel: 0.02 }), sx * 0.11, 0, 0);
    wing.rotation.z = sx * 0.18;
    bowtie.add(wing);
  }
  bowtie.add(at(box(0.08, 0.09, 0.09, 0x156b6b, { bevel: 0.015 }), 0, 0, 0.01));
  body.add(bowtie);

  // ---- arms ----
  // Character's right arm (screen left, -x) holds the pointer.
  const armR = createArm({ color: P.profeArm, handColor: 0x9a6a40, length: 0.56, thick: 0.17, hand: 0.21 });
  const armL = createArm({ color: P.profeArm, handColor: 0x9a6a40, length: 0.56, thick: 0.17, hand: 0.21 });
  const shoulderR = V(-S / 2 - 0.08, 0.86, 0.12);
  const shoulderL = V(S / 2 + 0.08, 0.86, 0.12);
  armR.pivot.position.copy(shoulderR);
  armL.pivot.position.copy(shoulderL);
  body.add(armR.pivot, armL.pivot);
  // pointer stick lives in the hand; its direction is in arm space
  const stick = new THREE.Group();
  const stickLen = 1.0;
  stick.add(at(box(0.05, stickLen, 0.05, P.stick, { rim: 0.3 }), 0, stickLen / 2, 0));
  stick.add(at(box(0.07, 0.1, 0.07, 0xe8e2d4, { rim: 0.3 }), 0, stickLen, 0)); // chalk-white tip
  armR.hand.add(stick);
  const UP = V(0, 1, 0);

  // Pose library: arm directions in body space, stick direction in arm space, face tweaks.
  const DEFAULT_POINT = V(-1.5, 2.6, 1.4); // local, up and toward Tito's side
  function poseDef(name, pointDir) {
    switch (name) {
      case 'explain':
        return { r: pointDir, rReach: null, l: V(0.35, -1, 0.35), stick: V(0, -1, 0.05), brow: 0.25, tilt: 0.03, lean: 0, lid: 0 };
      case 'shrug':
        return { r: V(-0.75, 0.6, 0.5), l: V(0.75, 0.6, 0.5), stick: V(0.2, -0.9, 0.4), brow: 0.8, tilt: 0.06, lean: 0, lid: 0, lift: 0.04 };
      case 'facepalm': {
        const target = V(0.3, eyeY + 0.02, faceZ + 0.2);
        const dl = target.clone().sub(shoulderL);
        return { r: V(-0.3, -1, 0.15), l: dl.clone().normalize(), lReach: dl.length(), stick: V(-0.5, 0.75, 0.45),
          brow: -0.6, tilt: -0.05, lean: 0.14, lid: 0.55 };
      }
      case 'wave': // pointer held low and forward, free hand waving
        return { r: V(-0.4, -1, 0.35), l: V(0.75, 0.75, 0.3), stick: V(-0.35, -0.15, 1), brow: 0.35, tilt: -0.03, lean: 0, lid: 0 };
      case 'idle':
      default:
        return { r: V(-0.35, -1, 0.3), l: V(0.3, -1, 0.15), stick: V(-0.55, 0.75, 0.4), brow: 0, tilt: 0, lean: 0, lid: 0 };
    }
  }

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  /**
   * state: { t, mouth, speaking, sinceLineStart, emotion, lookX,
   *          pose, prevPose, poseSince, lookAt, pointAt, brows, mouthShape }
   */
  function update(s) {
    const t = s.t || 0;
    const amp = s.speaking || s.mouth > 0 ? clamp(s.mouth || 0) : 0;

    // body: idle bob + squash on line start
    const sq = squashAt(s.sinceLineStart, 0.12, 0.45);
    body.scale.set(sq.xz, sq.y, sq.xz);
    body.position.y = legH + Math.sin(t * 1.6) * 0.012;

    // pose blending (pure: depends only on pose/prevPose/poseSince)
    const pointDir = s.pointAt ? localPointDir(body, s.pointAt, shoulderR) : DEFAULT_POINT.clone().sub(shoulderR).normalize();
    const cur = poseDef(s.pose || 'idle', pointDir);
    const prev = poseDef(s.prevPose || s.pose || 'idle', pointDir);
    const k = s.prevPose ? blendIn(s.poseSince, 0.35) : 1;
    const mix = (a, b) => lerp(a ?? 0, b ?? 0, k);

    let yaw = lerp(-0.12, -0.3, s.speaking ? 0.3 : 0) + Math.sin(t * 0.7) * 0.02;
    const look = lookDir(body, s.lookAt, V(0, eyeY, faceZ));
    if (look) yaw += look.x * 0.12;
    body.rotation.y = yaw;
    body.rotation.z = Math.sin(t * 1.1) * 0.01 + mix(prev.tilt, cur.tilt);
    body.rotation.x = mix(prev.lean, cur.lean);
    body.position.y += mix(prev.lift, cur.lift);

    // arms (with a little talk gesture on top)
    const talk = s.speaking ? 1 : 0;
    const wob = V(Math.sin(t * 5) * 0.08 * talk, 0, Math.sin(t * 4.1) * 0.06 * talk);
    armR.aim(nlerp(prev.r, cur.r, k).add(cur === prev || k > 0.5 ? (s.pose === 'explain' ? V(0, Math.sin(t * 3) * 0.03, 0) : wob) : wob).normalize(),
      lerp(prev.rReach ?? 0, cur.rReach ?? 0, k) || undefined);
    armL.aim(nlerp(prev.l, cur.l, k).add(s.pose === 'facepalm' ? V(0, 0, 0) : s.pose === 'wave' ? V(Math.sin(t * 7) * 0.35, 0, 0) : wob.clone().multiplyScalar(-0.8)).normalize(),
      lerp(prev.lReach ?? 0.56 + 0.1, cur.lReach ?? 0.56 + 0.1, k));
    stick.quaternion.setFromUnitVectors(UP, nlerp(prev.stick, cur.stick, k));

    // eyes: pupils follow look target (or legacy lookX)
    const lx = look ? look.x * 0.085 : (s.lookX ?? -0.04);
    const ly = look ? look.y * 0.06 : -0.01;
    const blink = blinkAt(t, 4.1, 0.7);
    const lidBase = mix(prev.lid, cur.lid);
    for (const e of eyes) {
      e.pupil.position.x = e.sx * 0.3 + clamp(lx, -0.1, 0.1);
      e.pupil.position.y = eyeY - 0.02 + clamp(ly, -0.07, 0.07);
      const close = Math.max(blink, lidBase);
      e.lid.scale.y = Math.max(0.001, close);
      e.lid.position.y = -0.145 * close;
      e.lid.visible = close > 0.02;
    }

    // brows: pose + emotion + explicit override
    let brow = mix(prev.brow, cur.brow);
    if (s.emotion === 'surprised') brow = Math.max(brow, 0.9);
    if (s.emotion === 'skeptical') brow = 0.2;
    if (typeof s.brows === 'number') brow = s.brows;
    for (const b of brows) {
      b.g.position.y = eyeY + 0.31 + clamp(brow, -1, 1) * 0.09;
      // negative brow = frown (inner ends down); skeptical = one brow up
      let rot = brow < 0 ? b.sx * brow * -0.35 : b.sx * brow * 0.08;
      if (s.emotion === 'skeptical') { rot = b.sx * 0.25; b.g.position.y += b.sx > 0 ? 0.08 : -0.03; }
      b.g.rotation.z = rot;
    }

    // mouth: discrete shapes from amplitude; 'O' on surprise
    const shape = s.mouthShape || (s.emotion === 'surprised' && !s.speaking ? 'O' : mouthLevel(amp));
    const M = { closed: [1, 0.05], half: [0.9, 0.12], open: [0.8, 0.22], O: [0.5, 0.2], smile: [1.2, 0.07] }[shape] || [1, 0.05];
    mouth.scale.set(M[0], M[1], 1);
    tongue.visible = shape === 'open';
    tongue.position.y = mouthY - M[1] * 0.3;

    // mustache wiggles with speech
    mustache.position.y = S * 0.42 + amp * 0.035;
    mustache.rotation.z = s.speaking ? Math.sin(t * 13) * 0.05 * (0.3 + amp) : 0;
    mustache.scale.x = 1 + amp * 0.06;
    bowtie.rotation.z = Math.sin(t * 2.3) * 0.04;
  }

  update({ t: 0, mouth: 0 });
  return { group: root, update, faceHeight: legH + eyeY - 0.15, height: legH + S, poses: PROFE_POSES };
}
