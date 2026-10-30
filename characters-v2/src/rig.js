import * as THREE from 'three';
import { box, at } from './util.js';

const DOWN = new THREE.Vector3(0, -1, 0);
const _q = new THREE.Quaternion();

/**
 * A blocky arm that hangs from a shoulder pivot and can be aimed at any local direction.
 * aim(dir, reach): dir is a Vector3 in the parent's space; reach (optional) stretches the arm
 * so the hand lands at that distance (cartoon stretch, clamped).
 */
export function createArm({ color, handColor, length = 0.55, thick = 0.16, hand = 0.2, bevel = 0.03 }) {
  const pivot = new THREE.Group();
  const limb = at(box(thick, length, thick, color, { bevel }), 0, -length / 2, 0);
  const handMesh = box(hand, hand, hand, handColor ?? color, { bevel: bevel * 1.3 });
  const handGroup = at(new THREE.Group(), 0, -length, 0);
  handGroup.add(handMesh);
  pivot.add(limb, handGroup);

  function aim(dir, reach) {
    const d = dir.clone().normalize();
    pivot.quaternion.copy(_q.setFromUnitVectors(DOWN, d));
    const s = reach ? THREE.MathUtils.clamp((reach - hand * 0.5) / length, 0.7, 1.8) : 1;
    limb.scale.y = s;
    limb.position.y = (-length * s) / 2;
    handGroup.position.y = -length * s;
  }
  aim(DOWN);
  return { pivot, hand: handGroup, aim, length };
}

/** Normalized lerp between two direction vectors. */
export function nlerp(a, b, k) {
  return a.clone().lerp(b, k).normalize();
}
