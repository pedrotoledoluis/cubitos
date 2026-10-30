import * as THREE from 'three';
import { box, at, mat, blinkAt, squashAt } from './util.js';

// Tito: small red cube, big eyes, antenna with a little ball. Curious.
export function createTito() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const S = 0.95;
  const legH = 0.2;
  const RED = 0xd9392e;

  root.add(at(box(0.2, legH, 0.24, 0x8e1f18), -0.22, legH / 2, 0));
  root.add(at(box(0.2, legH, 0.24, 0x8e1f18), 0.22, legH / 2, 0));

  body.position.y = legH;
  body.add(at(box(S, S, S * 0.9, RED), 0, S / 2, 0));

  const armL = at(box(0.12, 0.32, 0.16, 0xb52a21), -S / 2 - 0.06, 0.38, 0.05);
  const armR = at(box(0.12, 0.32, 0.16, 0xb52a21), S / 2 + 0.06, 0.38, 0.05);
  body.add(armL, armR);

  // antenna + ball + tuft
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6), mat(0x333333));
  stalk.position.set(0.08, S + 0.16, 0);
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), mat(0xffd23a, { emissive: 0x6a4a00 }));
  ball.position.set(0.08, S + 0.34, 0);
  const antenna = new THREE.Group();
  antenna.add(stalk, ball);
  body.add(antenna);
  for (let i = 0; i < 3; i++) {
    const tuft = at(box(0.06, 0.16, 0.06, 0xa82219), -0.2 + i * 0.07, S + 0.06, 0.1);
    tuft.rotation.z = (i - 1) * 0.35;
    body.add(tuft);
  }

  const faceZ = (S * 0.9) / 2;
  const eyeY = S * 0.64;
  const eyes = [];
  for (const sx of [-1, 1]) {
    const white = at(box(0.3, 0.34, 0.04, 0xffffff, { roughness: 0.4 }), sx * 0.2, eyeY, faceZ + 0.02);
    const pupil = at(box(0.15, 0.17, 0.02, 0x101010), sx * 0.2, eyeY - 0.02, faceZ + 0.045);
    const glint = at(box(0.05, 0.05, 0.01, 0xffffff, { emissive: 0x888888 }), sx * 0.2 + 0.04, eyeY + 0.03, faceZ + 0.057);
    const lid = at(box(0.31, 0.35, 0.02, 0xc0312a), sx * 0.2, eyeY, faceZ + 0.065);
    lid.scale.y = 0.001;
    body.add(white, pupil, glint, lid);
    eyes.push({ white, pupil, glint, lid, sx });
  }
  const browL = at(box(0.24, 0.05, 0.04, 0x5a0f0a), -0.2, eyeY + 0.24, faceZ + 0.02);
  const browR = at(box(0.24, 0.05, 0.04, 0x5a0f0a), 0.2, eyeY + 0.24, faceZ + 0.02);
  body.add(browL, browR);

  const mouthY = S * 0.26;
  const mouth = at(box(0.2, 1, 0.04, 0x3a0805), 0, mouthY, faceZ + 0.02);
  mouth.scale.y = 0.05;
  const tongue = at(box(0.12, 0.05, 0.02, 0xff7a8a), 0, mouthY, faceZ + 0.045);
  tongue.visible = false;
  body.add(mouth, tongue);

  // episode 2 details: blush cheeks and a little yellow star badge
  for (const sx of [-1, 1]) body.add(at(box(0.12, 0.06, 0.02, 0xff8a7a), sx * 0.3, mouthY + 0.1, faceZ + 0.025));
  const badge = at(box(0.1, 0.1, 0.02, 0xffd23a, { emissive: 0x3a2a00 }), 0.28, 0.12, faceZ + 0.02);
  badge.rotation.z = Math.PI / 4;
  body.add(badge);

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  function update(s) {
    const bob = Math.abs(Math.sin(s.t * 2.4)) * 0.025;
    const sq = squashAt(s.sinceLineStart);
    body.scale.set(1 + (1 - sq) * 0.7, sq, 1 + (1 - sq) * 0.7);
    body.position.y = legH + bob;
    body.rotation.y = 0.25 + Math.sin(s.t * 0.9) * 0.04;
    body.rotation.z = Math.sin(s.t * 1.3) * 0.02 + (s.emotion === 'surprised' ? -0.06 : 0);
    antenna.rotation.z = Math.sin(s.t * 3.1) * 0.15;

    const surprised = s.emotion === 'surprised';
    const happy = s.emotion === 'happy';
    const eyeScale = surprised ? 1.25 : 1;
    const blink = surprised ? 0 : blinkAt(s.t, 3.3, 0.2);
    for (const e of eyes) {
      e.white.scale.set(eyeScale, eyeScale, 1);
      e.pupil.scale.set(surprised ? 0.8 : 1, surprised ? 0.8 : 1, 1);
      e.pupil.position.x = e.sx * 0.2 + (s.lookX ?? 0.04);
      e.glint.position.x = e.pupil.position.x + 0.04;
      e.lid.scale.y = Math.max(0.001, blink);
      e.lid.visible = blink > 0.02;
    }
    const browLift = surprised ? 0.09 : happy ? 0.04 : 0;
    browL.position.y = browR.position.y = eyeY + 0.24 + browLift;
    browL.rotation.z = surprised ? -0.2 : 0;
    browR.rotation.z = surprised ? 0.2 : 0;

    let open = s.mouth;
    if (surprised && !s.speaking) open = 0.55;
    mouth.scale.y = 0.05 + open * 0.2;
    mouth.scale.x = surprised ? 0.8 : 1 + (happy ? 0.3 : 0);
    tongue.visible = open > 0.35;

    armL.rotation.z = s.speaking ? -0.3 - Math.sin(s.t * 6) * 0.25 : surprised ? -0.9 : 0;
    armR.rotation.z = s.speaking ? 0.3 + Math.sin(s.t * 5.2 + 1) * 0.2 : surprised ? 0.9 : 0;
  }

  return { group: root, update, faceHeight: legH + eyeY - 0.1, height: legH + S };
}
