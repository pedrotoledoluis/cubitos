import * as THREE from 'three';

/**
 * Studio rig that matches the night-office set: cool hemisphere, warm key from front-right,
 * cool moonlight rim from behind, soft warm fill. Use for previews, branding and thumbnails.
 * The episode set (src/set.js) already has an equivalent rig, so do not add this there.
 */
export function addStudioLights(scene, { shadows = true, key = 1 } = {}) {
  const g = new THREE.Group();
  g.add(new THREE.HemisphereLight(0xd8d2c8, 0x2a1a10, 0.8));
  const warm = new THREE.SpotLight(0xffc98a, 55 * key, 18, Math.PI / 3.2, 0.7, 1.4);
  warm.position.set(1.8, 4.2, 3.6);
  warm.target.position.set(0, 0.8, 0);
  if (shadows) {
    warm.castShadow = true;
    warm.shadow.mapSize.set(1024, 1024);
    warm.shadow.radius = 5;
    warm.shadow.bias = -0.0006;
  }
  g.add(warm, warm.target);
  const rim = new THREE.DirectionalLight(0xa9bce0, 0.9);
  rim.position.set(-3, 4, -6);
  g.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffc8a0, 0.5);
  rim2.position.set(4, 2.5, -4);
  g.add(rim2);
  const fill = new THREE.DirectionalLight(0xffe8d0, 1.0);
  fill.position.set(-3, 3, 6);
  g.add(fill);
  scene.add(g);
  return g;
}
