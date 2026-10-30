import * as THREE from 'three';
import { mat } from './util.js';

// Low-poly emu guest prop: faceted body, long neck, small head, beak, running legs.
export function createEmu() {
  const root = new THREE.Group();
  const FEATHER = 0x5e4b3c;
  const NECK = 0x6f7f99;
  const LEG = 0x6b5d50;

  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mat(FEATHER));
  body.scale.set(1.25, 0.85, 0.85);
  body.position.y = 1.05;
  root.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 5), mat(0x4a3a2e));
  tail.rotation.z = Math.PI / 2 + 0.4;
  tail.position.set(-0.62, 1.1, 0);
  root.add(tail);

  const neckPivot = new THREE.Group();
  neckPivot.position.set(0.45, 1.25, 0);
  root.add(neckPivot);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.8, 5), mat(NECK));
  neck.position.y = 0.4;
  neckPivot.add(neck);
  neckPivot.rotation.z = -0.2;

  const head = new THREE.Group();
  head.position.y = 0.85;
  neckPivot.add(head);
  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), mat(0x4b5a72));
  head.add(skull);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), mat(0x2f2a26));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.18, -0.02, 0);
  head.add(beak);
  for (const sz of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), mat(0xffb020, { emissive: 0x442200 }));
    eye.position.set(0.05, 0.03, sz * 0.12);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), mat(0x000000));
    pupil.position.set(0.06, 0.03, sz * 0.13);
    head.add(eye, pupil);
  }

  const legs = [];
  for (const sz of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.05, 0.95, sz * 0.18);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.95, 5), mat(LEG));
    thigh.position.y = -0.47;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.12), mat(LEG));
    foot.position.set(0.06, -0.94, 0);
    hip.add(thigh, foot);
    root.add(hip);
    legs.push(hip);
  }

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // run: 0 = idle pecking, 1 = running in place
  function update({ t, run = 0 }) {
    const f = run ? 9 : 2;
    legs[0].rotation.z = Math.sin(t * f) * 0.6 * run;
    legs[1].rotation.z = -Math.sin(t * f) * 0.6 * run;
    body.position.y = 1.05 + Math.abs(Math.sin(t * f)) * 0.06 * run;
    neckPivot.rotation.z = -0.2 + (run ? -0.25 : Math.max(0, Math.sin(t * 1.5)) * -0.5);
    head.rotation.z = Math.sin(t * 2.2) * 0.15;
  }

  return { group: root, update };
}
