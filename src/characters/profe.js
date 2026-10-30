import * as THREE from 'three';
import { box, at, blinkAt, squashAt, lerp } from './util.js';

// Profe Cubo: big brown cube, block legs, square black glasses, small mouth. Deadpan.
export function createProfe() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const S = 1.5; // body size
  const legH = 0.3;
  const BROWN = 0x8a5a32;

  const legL = at(box(0.32, legH, 0.36, 0x5b3a1f), -0.38, legH / 2, 0);
  const legR = at(box(0.32, legH, 0.36, 0x5b3a1f), 0.38, legH / 2, 0);
  root.add(legL, legR);

  // body pivots at its bottom so squash keeps feet planted
  body.position.y = legH;
  const torso = at(box(S, S, S * 0.92, BROWN), 0, S / 2, 0);
  body.add(torso);

  // little arms
  const armL = at(box(0.18, 0.5, 0.22, 0x7a4e2a), -S / 2 - 0.09, 0.55, 0.1);
  const armR = at(box(0.18, 0.5, 0.22, 0x7a4e2a), S / 2 + 0.09, 0.55, 0.1);
  body.add(armL, armR);

  const faceZ = (S * 0.92) / 2;
  const eyeY = S * 0.66;
  const eyes = [];
  for (const sx of [-1, 1]) {
    const frame = at(box(0.46, 0.38, 0.06, 0x111111, { roughness: 0.4 }), sx * 0.3, eyeY, faceZ + 0.03);
    const lens = at(box(0.36, 0.28, 0.02, 0xe9eef2, { roughness: 0.3 }), sx * 0.3, eyeY, faceZ + 0.065);
    const pupil = at(box(0.11, 0.11, 0.02, 0x141414), sx * 0.3 + 0.03, eyeY - 0.02, faceZ + 0.08);
    const lid = at(box(0.37, 0.29, 0.02, 0x6e4626), sx * 0.3, eyeY + 0.14, faceZ + 0.09);
    lid.scale.y = 0.001;
    body.add(frame, lens, pupil, lid);
    eyes.push({ pupil, lid, baseX: pupil.position.x, baseY: eyeY - 0.02 });
  }
  const bridge = at(box(0.16, 0.05, 0.05, 0x111111), 0, eyeY + 0.06, faceZ + 0.04);
  body.add(bridge);
  // flat deadpan brows
  const browL = at(box(0.36, 0.06, 0.05, 0x3a2412), -0.3, eyeY + 0.3, faceZ + 0.02);
  const browR = at(box(0.36, 0.06, 0.05, 0x3a2412), 0.3, eyeY + 0.3, faceZ + 0.02);
  body.add(browL, browR);

  const mouthY = S * 0.3;
  const mouth = at(box(0.3, 1, 0.04, 0x2a0f08), 0, mouthY, faceZ + 0.02);
  mouth.scale.y = 0.05;
  body.add(mouth);

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  /**
   * state: { t, mouth 0..1, sinceLineStart, speaking, emotion, lookX }
   */
  function update(s) {
    const bob = Math.sin(s.t * 1.6) * 0.015;
    const sq = squashAt(s.sinceLineStart);
    body.scale.set(1 + (1 - sq) * 0.6, sq, 1 + (1 - sq) * 0.6);
    body.position.y = legH + bob;
    body.rotation.y = lerp(-0.12, -0.32, s.speaking ? 0.3 : 0) + Math.sin(s.t * 0.7) * 0.02;
    body.rotation.z = Math.sin(s.t * 1.1) * 0.01;

    const open = s.mouth;
    mouth.scale.y = 0.05 + open * 0.17;
    mouth.scale.x = 1 - open * 0.25;

    const blink = blinkAt(s.t, 4.1, 0.7);
    for (const e of eyes) {
      e.lid.scale.y = Math.max(0.001, blink);
      e.lid.visible = blink > 0.02;
      e.lid.position.y = eyeY + 0.14 - blink * 0.14;
      e.pupil.position.x = e.baseX + (s.lookX ?? -0.04);
    }
    const surprise = s.emotion === 'surprised' ? 0.08 : 0;
    browL.position.y = browR.position.y = eyeY + 0.3 + surprise;
    armL.rotation.z = s.speaking ? Math.sin(s.t * 5) * 0.12 : 0;
    armR.rotation.z = s.speaking ? -Math.sin(s.t * 4.3 + 1) * 0.08 : 0;
  }

  return { group: root, update, faceHeight: legH + eyeY - 0.15, height: legH + S };
}
