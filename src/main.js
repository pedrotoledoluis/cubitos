import * as THREE from 'three';
import { createSet } from './set.js';
import { createProfe } from './characters/profe.js';
import { createTito } from './characters/tito.js';
import { createEmu } from './characters/emu.js';
import { clamp } from './characters/util.js';

// Deterministic stage: everything is a pure function of time t (no clocks, no rAF).
// The Node renderer calls window.stage.init(config) once, then window.stage.renderAt(t) per frame.

const GUESTS = { emu: createEmu };

const POS = {
  tito: new THREE.Vector3(-1.0, 0, 0.2),
  profe: new THREE.Vector3(1.1, 0, 0),
  guest: new THREE.Vector3(-3.0, 0, -1.2),
};

let renderer, scene, camera, cast, cfg, captionEl;

function shotPose(shot, aspect) {
  const p = cast.profe, t = cast.tito;
  switch (shot) {
    case 'profe':
      return { pos: [POS.profe.x - 1.2, 2.1, 6.2], look: [POS.profe.x - 0.15, p.faceHeight + 0.45, 0] };
    case 'tito':
      return { pos: [POS.tito.x + 0.95, 1.35, 4.4], look: [POS.tito.x + 0.1, t.faceHeight + 0.4, 0] };
    case 'guest':
      return { pos: [POS.guest.x + 2.4, 1.9, POS.guest.z + 6.0], look: [POS.guest.x + 0.4, 1.45, POS.guest.z] };
    case 'thumb':
      return { pos: [POS.tito.x + 0.2, 1.05, 3.0], look: [POS.tito.x + 1.05, 0.95, 0] };
    case 'avatar':
      return { pos: [0.05, 1.5, 6.2], look: [0.05, 1.05, 0] };
    case 'banner':
      return { pos: [0, 1.6, 7.2], look: [0, 1.3, 0] };
    case 'wide':
    default:
      return { pos: [0.05, 2.3, aspect < 1 ? 11.0 : 6.5], look: [0.05, 1.7, 0] };
  }
}

function lineAt(t) {
  const lines = cfg.timeline.lines;
  let cur = null, idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (t >= lines[i].start) { cur = lines[i]; idx = i; }
  }
  return { cur, idx, speaking: cur && t < cur.end ? cur : null };
}

function mouthFor(line, t) {
  if (!line || t < line.start || t >= line.end) return 0;
  const f = (t - line.start) * line.envFps;
  const i = Math.floor(f);
  const a = line.env[i] ?? 0, b = line.env[i + 1] ?? 0;
  return clamp(a + (b - a) * (f - i));
}

function resolveShot(line, idx) {
  if (!line) return 'wide';
  if (line.shot && line.shot !== 'auto') return line.shot;
  if (idx === 0) return 'wide';
  return line.speaker;
}

async function init(config) {
  cfg = config;
  const { width, height } = config;
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.getElementById('stage').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  createSet(scene);
  camera = new THREE.PerspectiveCamera(config.mode === 'video' ? 36 : 40, width / height, 0.1, 60);

  if (config.mode === 'banner') {
    // spread the duo to the sides of the centered title
    POS.tito.set(-3.2, 0, 0.6);
    POS.profe.set(3.3, 0, 0);
  }
  const profe = createProfe();
  const tito = createTito();
  profe.group.position.copy(POS.profe);
  tito.group.position.copy(POS.tito);
  scene.add(profe.group, tito.group);
  cast = { profe, tito, guest: null };
  if (config.guest && GUESTS[config.guest] && config.mode !== 'avatar' && config.mode !== 'banner') {
    cast.guest = GUESTS[config.guest]();
    cast.guest.group.position.copy(POS.guest);
    cast.guest.group.rotation.y = -0.5;
    scene.add(cast.guest.group);
  }

  captionEl = document.getElementById('caption');
  const big = document.getElementById('bigtext');
  document.body.className = `mode-${config.mode}`;
  if (config.mode === 'thumbnail') big.textContent = config.thumbnailText;
  if (config.mode === 'banner') big.textContent = config.channelName;
  if (config.mode !== 'thumbnail' && config.mode !== 'banner') big.style.display = 'none';
  await document.fonts.ready;
  return true;
}

function renderAt(t) {
  const aspect = cfg.width / cfg.height;
  let shot, speaking = null, cur = null, idx = -1, emotionTito, emotionProfe;

  if (cfg.mode === 'video') {
    ({ cur, idx, speaking } = lineAt(t));
    shot = resolveShot(cur, idx);
    captionEl.textContent = cur ? cur.text : '';
    captionEl.style.display = cur ? 'block' : 'none';
  } else {
    shot = { thumbnail: 'thumb', avatar: 'avatar', banner: 'banner' }[cfg.mode];
    captionEl.style.display = 'none';
  }
  const titoLine = cur && cur.speaker === 'tito' ? cur : null;
  const profeLine = cur && cur.speaker === 'profe' ? cur : null;
  emotionTito = titoLine?.emotion ?? (cfg.mode === 'thumbnail' ? 'surprised' : null);
  emotionProfe = profeLine?.emotion ?? null;

  cast.tito.update({
    t, mouth: mouthFor(titoLine, t), speaking: !!(speaking && speaking.speaker === 'tito'),
    sinceLineStart: titoLine ? t - titoLine.start : -1, emotion: emotionTito, lookX: 0.04,
  });
  cast.profe.update({
    t, mouth: mouthFor(profeLine, t), speaking: !!(speaking && speaking.speaker === 'profe'),
    sinceLineStart: profeLine ? t - profeLine.start : -1, emotion: emotionProfe, lookX: -0.04,
  });
  if (cast.guest) cast.guest.update({ t, run: shot === 'guest' ? 1 : 0 });

  // camera: shot pose + slow push-in + gentle drift
  const pose = shotPose(shot, aspect);
  const since = cur ? t - cur.start : t;
  const push = cfg.mode === 'video' ? Math.min(since, 6) * 0.035 : 0;
  const pos = new THREE.Vector3(...pose.pos);
  const look = new THREE.Vector3(...pose.look);
  pos.lerp(look, push);
  if (cfg.mode === 'video') {
    pos.x += Math.sin(t * 0.37) * 0.07;
    pos.y += Math.sin(t * 0.29 + 1) * 0.04;
    look.x += Math.sin(t * 0.21) * 0.02;
  }
  camera.position.copy(pos);
  camera.lookAt(look);
  renderer.render(scene, camera);
}

window.stage = { init, renderAt };
window.stageReady = true;
