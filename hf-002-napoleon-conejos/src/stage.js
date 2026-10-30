import * as THREE from 'three';
import { createSet } from './set.js';
import { createProfe } from './characters/profe.js';
import { createTito } from './characters/tito.js';
import { clamp } from './characters/util.js';
import { drawBoard } from './board.js';

// Deterministic stage for HyperFrames: every frame is a pure function of time t.
// The HyperFrames `three` adapter dispatches `hf-seek` with the time to render.
// mode: 'video' (episode timeline) | 'thumbnail' (single posed frame).

const POS = {
  tito: new THREE.Vector3(-1.0, 0, 0.2),
  profe: new THREE.Vector3(1.25, 0, 0),
};

// Camera shots as an orbit around a target: distance, azimuth (rad, + = camera to the right),
// elevation (rad) and vertical field of view.
const SHOTS = {
  wide: { target: [0.35, 1.75, 0], dist: 11.6, az: 0.0, el: 0.05, fov: 38 },
  profe: { target: [1.15, 1.55, 0], dist: 6.2, az: -0.2, el: 0.07, fov: 36 },
  tito: { target: [-0.95, 0.98, 0.2], dist: 4.4, az: 0.2, el: 0.05, fov: 36 },
  board: { target: [2.05, 2.3, -1.2], dist: 9.0, az: -0.1, el: 0.02, fov: 41 },
  thumb: { target: [0.75, 1.5, 0], dist: 5.4, az: 0.0, el: 0.02, fov: 38 },
};

const easeInOut = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

export function createStage({ canvas, width, height, mode = 'video', episode = null, captionEl = null }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const { board } = createSet(scene);
  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 60);
  const profe = createProfe();
  const tito = createTito();
  profe.group.position.copy(POS.profe);
  tito.group.position.copy(POS.tito);
  scene.add(profe.group, tito.group);

  const lines = episode?.lines ?? [];
  const boardCtx = board.canvas.getContext('2d');
  let lastBoardKey = '';

  function lineAt(t) {
    let cur = null;
    for (const l of lines) if (t >= l.start) cur = l;
    return cur;
  }

  function mouthFor(line, t) {
    if (!line || t < line.start || t >= line.end) return 0;
    const f = (t - line.start) * line.envFps;
    const i = Math.floor(f);
    const a = line.env[i] ?? 0, b = line.env[i + 1] ?? 0;
    return clamp(a + (b - a) * (f - i));
  }

  // Board keeps showing the most recent board scene (frozen at its end) until the next one starts.
  function updateBoard(t) {
    let bl = null;
    for (const l of lines) if (l.board && t >= l.start) bl = l;
    const d = bl ? bl.end - bl.start : 0;
    const u = bl ? Math.min(t - bl.start, d + 0.6) : 0;
    const key = bl ? `${bl.i}:${Math.round(u * 30)}` : 'idle';
    if (key === lastBoardKey) return;
    lastBoardKey = key;
    drawBoard(boardCtx, board.canvas.width, board.canvas.height, bl?.board ?? null, u, d);
    board.texture.needsUpdate = true;
  }

  // Pointer raise: eases up 0.25 s after a board line starts, down after it ends.
  function pointAmount(t) {
    let v = 0;
    for (const l of lines) {
      if (!l.board) continue;
      const up = easeInOut((t - l.start - 0.15) / 0.45);
      const down = 1 - easeInOut((t - l.end - 0.1) / 0.45);
      v = Math.max(v, Math.min(up, down));
    }
    return v;
  }

  function shotFor(line) {
    if (!line) return 'wide';
    if (line.shot) return line.shot;
    if (line.board) return 'board';
    return line.speaker;
  }

  function placeCamera(shotName, line, t) {
    const s = SHOTS[shotName];
    let az = s.az, el = s.el, dist = s.dist, roll = 0;
    if (line) {
      const d = Math.max(0.5, line.end - line.start + 0.3);
      const k = clamp((t - line.start) / d);
      const dir = line.i % 2 === 0 ? 1 : -1;
      az += dir * (easeInOut(k) - 0.5) * 0.09; // slow orbit, about 5 degrees across the line
      el += Math.sin(t * 0.45) * 0.012;
      dist *= 1 - 0.075 * easeInOut(k); // gentle dolly in
      if (line.dutch) roll = 0.075 * easeInOut((t - line.start) / 0.5) * (line.i % 2 === 0 ? 1 : -1);
    }
    const target = new THREE.Vector3(...s.target);
    camera.fov = s.fov;
    camera.updateProjectionMatrix();
    camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * dist,
      target.y + Math.sin(el) * dist,
      target.z + Math.cos(az) * Math.cos(el) * dist,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    if (roll) camera.rotateZ(roll);
  }

  function renderAt(t) {
    const isVideo = mode === 'video';
    const cur = isVideo ? lineAt(t) : null;
    const speaking = cur && t < cur.end ? cur : null;
    const titoLine = cur?.speaker === 'tito' ? cur : null;
    const profeLine = cur?.speaker === 'profe' ? cur : null;

    tito.update({
      t, mouth: mouthFor(titoLine, t), speaking: speaking?.speaker === 'tito',
      sinceLineStart: titoLine ? t - titoLine.start : -1,
      emotion: isVideo ? titoLine?.emotion ?? null : 'surprised', lookX: 0.04,
    });
    profe.update({
      t, mouth: mouthFor(profeLine, t), speaking: speaking?.speaker === 'profe',
      sinceLineStart: profeLine ? t - profeLine.start : -1, emotion: null, lookX: -0.04,
      point: isVideo ? pointAmount(t) : 0,
    });
    if (isVideo) updateBoard(t);
    else if (lastBoardKey !== 'thumb') {
      lastBoardKey = 'thumb';
      drawBoard(boardCtx, board.canvas.width, board.canvas.height, 'swarm', 4, 4);
      board.texture.needsUpdate = true;
    }

    placeCamera(isVideo ? shotFor(cur) : 'thumb', cur, t);
    renderer.render(scene, camera);

    if (captionEl) {
      captionEl.textContent = cur ? cur.text : '';
      captionEl.style.display = cur ? 'block' : 'none';
      const pop = cur ? 0.86 + 0.14 * easeInOut((t - cur.start) / 0.14) : 1;
      captionEl.style.transform = `scale(${pop.toFixed(3)})`;
    }
  }

  return { renderAt };
}
