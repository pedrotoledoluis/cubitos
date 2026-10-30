import * as THREE from 'three';
import { createLocations, BOARD } from './locations/index.js';
import { createChicken } from './locations/common.js';
import { createProfe, createTito, createNova } from './characters/index.js';
import { clamp, lerp, smooth } from './characters/util.js';
import { attachCostumes, createPoof } from './costumes.js';
import { drawBoard, normalizeBoard } from './board/index.js';

// Deterministic stage for HyperFrames: every frame is a pure function of time t.
// The composition calls renderAt(t) from the `hf-seek` event.
// mode: 'video' (episode timeline) | 'thumbnail' (single posed frame).

const POS = {
  tito: new THREE.Vector3(-1.3, 0, 0.45),
  profe: new THREE.Vector3(1.05, 0, 0),
  nova: new THREE.Vector3(2.45, 0, 0.55), // only built when an episode has Nova lines
};
const BOARD_CENTER = new THREE.Vector3(BOARD.x, BOARD.y, BOARD.z);

// Camera shots: orbit around `target` (distance, azimuth rad (+ = camera to the right), elevation rad, vertical fov).
// Portrait layout rule: the caption block occupies ~13%..30% of the frame height, so in every shot faces sit
// below ~32% and, in `board`, the board is framed between ~33% and ~62% with Profe (whole head) beneath it.
// Close-ups (`profe`, `tito`) sit near eye level with a narrow lens so the board stays above the caption block.
export const SHOTS = {
  wide: { target: [-0.1, 2.35, 0], dist: 12.4, az: 0.0, el: 0.02, fov: 40 },
  // close-ups orbit to the side that pushes the board out of frame (Profe from the left, Tito from the right)
  profe: { target: [1.05, 1.75, 0], dist: 7.4, az: -0.5, el: 0.16, fov: 27 },
  tito: { target: [-1.25, 1.3, 0.45], dist: 5.6, az: 0.5, el: 0.13, fov: 26 },
  board: { target: [0.15, 2.5, -0.6], dist: 9.6, az: -0.03, el: 0.0, fov: 42 },
  // thumbnail (16:9): target shifted left so the characters fill the right ~40%, headline on the left
  thumb: { target: [-2.6, 1.6, 0], dist: 8.9, az: 0.1, el: 0.05, fov: 36 },
  // three-character staging (Tito left, Profe center/right, Nova far right)
  wide3: { target: [0.55, 2.3, 0.2], dist: 14.6, az: 0.0, el: 0.02, fov: 40 },
  nova: { target: [2.45, 1.4, 0.55], dist: 7.2, az: -0.45, el: 0.13, fov: 26 },
  titoProfe: { target: [-0.1, 1.7, 0.2], dist: 8.6, az: 0.25, el: 0.08, fov: 34 },
  profeNova: { target: [1.75, 1.7, 0.25], dist: 8.2, az: -0.3, el: 0.08, fov: 34 },
  thumb3: { target: [-1.8, 1.6, 0], dist: 10.4, az: 0.08, el: 0.05, fov: 36 },
};

// World props that episode lines can show with `"props": ["name"]` (pop in on the first line of a run).
const PROPS = {
  pluckedChicken: () => {
    const c = createChicken({ plucked: true, scale: 1.25 });
    c.group.position.set(-0.15, 0, 0.95);
    c.group.rotation.y = -0.9;
    return { group: c.group, update: (t) => c.update(t, { walk: 0.25 }) };
  },
};

const easeInOut = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - (1 - clamp(x)) ** 3;
const WIPE = 0.28; // half-duration of the location wipe (s)
// Caption fill color per speaker (the black stroke stays): viewers tell who talks at a glance.
const CAPTION_COLOR = { profe: '#fff3d6', tito: '#ffd23a', nova: '#c9b8ff' };

/**
 * Per-line acting resolved from episode data:
 *  profe: pose (line.pose on Profe lines, default 'explain' on board lines, else 'idle'; line.profePose on Tito lines).
 *  tito: emotion (line.emotion on Tito lines, line.titoEmotion on Profe lines, default 'neutral').
 */
function acting(line) {
  if (!line) return { pose: 'idle', emotion: 'neutral', nova: 'neutral' };
  const pose = line.speaker === 'profe'
    ? line.pose ?? (line.board ? 'explain' : 'idle')
    : line.profePose ?? 'idle';
  const emotion = (line.speaker === 'tito' ? line.emotion : line.titoEmotion) ?? 'neutral';
  const nova = (line.speaker === 'nova' ? line.emotion : line.novaEmotion) ?? (line.speaker === 'nova' ? 'explaining' : 'neutral');
  return { pose, emotion, nova };
}

export function createStage({ canvas, width, height, mode = 'video', episode = null, captionEl = null, wipeEl = null }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const lines = episode?.lines ?? [];
  const thumbLocation = episode?.thumbnailLocation ?? lines.at(-1)?.location ?? 'office';
  const scene = new THREE.Scene();
  const locations = createLocations(scene, renderer, ['office', thumbLocation, ...lines.map((l) => l.location ?? 'office')]);
  const { board } = locations;
  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 120);
  const profe = createProfe();
  const tito = createTito();
  const hasNova = lines.some((l) => l.speaker === 'nova') || !!episode?.withNova;
  const nova = hasNova ? createNova() : null;
  if (nova) { nova.group.position.copy(POS.nova); scene.add(nova.group); }
  const costumes = attachCostumes(profe);
  const poof = createPoof();
  profe.group.position.copy(POS.profe);
  tito.group.position.copy(POS.tito);
  poof.group.position.copy(POS.profe).add(new THREE.Vector3(0, 1.3, 0.3));
  scene.add(profe.group, tito.group, poof.group);
  // Tito's handheld reporter mic (`titoProp: "mic"` per line or per episode). Kept upright in his right hand.
  const mic = new THREE.Group();
  mic.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.07), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, flatShading: true })));
  const micHead = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), new THREE.MeshStandardMaterial({ color: 0x9a9aa4, metalness: 0.6, roughness: 0.35, flatShading: true }));
  micHead.position.y = 0.22; mic.add(micHead);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.15), new THREE.MeshStandardMaterial({ color: 0xffd23a, flatShading: true }));
  flag.position.y = 0.08; mic.add(flag);
  mic.visible = false;
  tito.hands[1].add(mic);
  const _mq = new THREE.Quaternion(), _hq = new THREE.Quaternion();
  function updateMic(on) {
    mic.visible = !!on;
    if (!on) return;
    tito.group.updateMatrixWorld(true);
    tito.group.getWorldQuaternion(_mq);
    tito.hands[1].getWorldQuaternion(_hq);
    mic.quaternion.copy(_hq.invert().multiply(_mq));
    mic.rotateZ(0.35); // tilt toward his mouth
    mic.position.set(0, 0.05, 0.08);
  }
  const props = {};
  for (const name of new Set(lines.flatMap((l) => l.props ?? []))) {
    if (!PROPS[name]) throw new Error(`Unknown prop "${name}". Known: ${Object.keys(PROPS).join(', ')}`);
    props[name] = PROPS[name]();
    props[name].group.visible = false;
    scene.add(props[name].group);
  }
  const PROFE_FACE = POS.profe.clone().add(new THREE.Vector3(0, profe.faceHeight, 0.6));
  const TITO_FACE = POS.tito.clone().add(new THREE.Vector3(0, tito.faceHeight, 0.4));
  const NOVA_FACE = nova ? POS.nova.clone().add(new THREE.Vector3(0, nova.faceHeight, 0.35)) : null;
  const FACE = { tito: TITO_FACE, profe: PROFE_FACE, nova: NOVA_FACE };
  // Aim the pointer up-left in the characters' plane: from the camera it reads as pointing at the board.
  // The stick is shortened while explaining so its tip stops under the board's bottom edge (never across titles).
  const POINT_AT = [BOARD.x + 0.1, BOARD.y - 0.3, 0.4];
  const STICK_EXPLAIN = 0.62;

  const boardCtx = board.canvas.getContext('2d');
  let lastBoardKey = '';

  function lineIndexAt(t) {
    let idx = -1;
    for (let i = 0; i < lines.length; i++) if (t >= lines[i].start) idx = i;
    return idx;
  }

  function mouthFor(line, t) {
    if (!line || t < line.start || t >= line.end) return 0;
    const f = (t - line.start) * line.envFps;
    const i = Math.floor(f);
    const a = line.env[i] ?? 0, b = line.env[i + 1] ?? 0;
    return clamp(a + (b - a) * (f - i));
  }

  // Board keeps showing the most recent board scene (frozen just after its end) until the next one starts.
  function updateBoard(t, style) {
    let bl = null;
    for (const l of lines) if (l.board && t >= l.start) bl = l;
    const d = bl ? bl.end - bl.start : 0;
    const u = bl ? Math.min(t - bl.start, d + 0.6) : 0;
    const key = bl ? `${bl.i}:${Math.round(u * 30)}:${style}` : `idle:${style}`;
    if (key === lastBoardKey) return;
    lastBoardKey = key;
    drawBoard(boardCtx, board.canvas.width, board.canvas.height, bl?.board ?? null, u, d, style);
    board.texture.needsUpdate = true;
  }

  function shotFor(line) {
    if (!line) return nova ? 'wide3' : 'wide';
    if (line.shot) return line.shot === 'wide' && nova ? 'wide3' : line.shot;
    if (line.board) return 'board';
    return line.speaker;
  }

  function placeCamera(shotName, line, t) {
    const s = SHOTS[shotName] ?? SHOTS.wide;
    let az = s.az, el = s.el, dist = s.dist, roll = 0;
    if (line) {
      const d = Math.max(0.5, line.end - line.start + 0.3);
      const k = clamp((t - line.start) / d);
      const dir = line.i % 2 === 0 ? 1 : -1;
      az += dir * (easeInOut(k) - 0.5) * 0.07; // slow orbit, ~4 degrees across the line
      el += Math.sin(t * 0.45) * 0.01;
      dist *= 1 - (shotName === 'board' ? 0.03 : 0.07) * easeInOut(k); // gentle dolly in (less on board: keep headroom)
      if (line.dutch) roll = 0.075 * easeInOut((t - line.start) / 0.5) * (line.i % 2 === 0 ? 1 : -1);
      if (line.locationChanged) { // arrival: fly in through the new location
        const e = 1 - easeOut((t - line.start) / 1.5);
        dist *= 1 + 0.8 * e;
        el += 0.22 * e;
        az += 0.35 * e;
      }
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

  /** Costume at time t: switches (with a poof) `costumePoofAt` s into the line whose costume changed. */
  function costumeAt(t, idx) {
    const cur = lines[Math.max(0, idx)];
    if (!cur) return { name: 'none', k: 1, since: -1 };
    const at = cur.start + (episode?.costumePoofAt ?? 0.45);
    if (idx >= 0 && cur.costumeChanged) {
      if (t < at) return { name: lines[idx - 1]?.costume ?? 'none', k: 1, since: -1 };
      return { name: cur.costume, k: clamp((t - at) / 0.35), since: t - at + 0.12 };
    }
    return { name: cur.costume ?? 'none', k: 1, since: -1 };
  }

  function updateProps(t, idx) {
    const cur = lines[idx];
    for (const [name, p] of Object.entries(props)) {
      const on = !!cur?.props?.includes(name);
      p.group.visible = on;
      if (!on) continue;
      let first = idx;
      while (first > 0 && lines[first - 1].props?.includes(name)) first--;
      const k = easeOut((t - lines[first].start - 0.6) / 0.35);
      p.group.scale.setScalar(Math.max(0.001, k));
      p.group.visible = k > 0.001;
      p.update(t);
    }
  }

  function updateWipe(t) {
    if (!wipeEl) return;
    let p = null;
    for (const l of lines) if (l.locationChanged && Math.abs(t - l.start) < WIPE) p = (t - l.start + WIPE) / (2 * WIPE);
    wipeEl.style.display = p === null ? 'none' : 'block';
    if (p !== null) wipeEl.style.transform = `translateX(${(115 - 230 * easeInOut(p)).toFixed(2)}%) skewX(-14deg)`;
  }

  function renderVideo(t) {
    const idx = lineIndexAt(t);
    const cur = lines[idx] ?? null;
    const prev = lines[idx - 1] ?? null;
    const speaking = cur && t < cur.end ? cur : null;
    const since = cur ? t - cur.start : -1;
    const a = acting(cur), pa = acting(prev);
    const boardLine = cur?.board ? cur : null;
    locations.set((cur ?? lines[0])?.location ?? 'office');
    locations.update(t);

    // Look targets: listeners look at the speaker, or at the board while a board line plays.
    // Listeners look at the speaker; the speaker looks at whoever spoke last (Profe -> Tito by default).
    const onBoard = boardLine && cur.speaker === 'profe';
    const spk = cur?.speaker ?? 'profe';
    const other = (who) => { for (let j = idx - 1; j >= 0; j--) if (lines[j].speaker !== who) return lines[j].speaker; return who === 'tito' ? 'profe' : 'tito'; };
    const lookFor = (who) => (onBoard ? BOARD_CENTER : FACE[spk === who ? other(who) : spk] ?? (who === 'profe' ? TITO_FACE : PROFE_FACE));
    const titoLook = lookFor('tito');
    const profeLook = lookFor('profe');
    if (nova) {
      nova.update({
        t, mouth: cur?.speaker === 'nova' ? mouthFor(cur, t) : 0, speaking: speaking?.speaker === 'nova',
        sinceLineStart: cur?.speaker === 'nova' ? since : -1,
        emotion: a.nova, prevEmotion: pa.nova, emotionSince: a.nova !== pa.nova ? since : undefined,
        lookAt: lookFor('nova'),
      });
    }

    tito.update({
      t, mouth: cur?.speaker === 'tito' ? mouthFor(cur, t) : 0, speaking: speaking?.speaker === 'tito',
      sinceLineStart: cur?.speaker === 'tito' ? since : -1,
      emotion: a.emotion, prevEmotion: pa.emotion, emotionSince: a.emotion !== pa.emotion ? since : undefined,
      lookAt: titoLook,
    });
    profe.update({
      t, mouth: cur?.speaker === 'profe' ? mouthFor(cur, t) : 0, speaking: speaking?.speaker === 'profe',
      sinceLineStart: cur?.speaker === 'profe' ? since : -1,
      pose: a.pose, prevPose: pa.pose, poseSince: since, pointAt: POINT_AT, lookAt: profeLook,
      emotion: cur?.profeEmotion ?? null,
    });
    const sk = (p) => (p === 'explain' || p === 'lamp' ? STICK_EXPLAIN : 1);
    profe.parts.stick.scale.y = lerp(sk(pa.pose), sk(a.pose), smooth(since / 0.35));
    const c = costumeAt(t, idx);
    costumes.update({ name: c.name, k: c.k, prop: cur?.profeProp ?? null, t });
    updateMic(cur?.titoProp === 'mic');
    poof.update(c.since);
    updateProps(t, idx);
    updateBoard(t, locations.boardStyle());
    placeCamera(shotFor(cur), cur, t);
    renderer.render(scene, camera);
    updateWipe(t);

    if (captionEl) {
      // Long lines are split into caption pages (max 3 lines each) by build-audio; pick the page for t.
      const pages = cur?.pages ?? (cur ? [{ text: cur.text, start: cur.start }] : []);
      let page = pages[0];
      for (const pg of pages) if (t >= pg.start) page = pg;
      captionEl.textContent = page ? page.text : '';
      captionEl.style.display = page ? 'block' : 'none';
      captionEl.style.color = CAPTION_COLOR[cur?.speaker] ?? CAPTION_COLOR.profe;
      // Guard: never more than 3 lines; shrink the font if a page still wraps further.
      captionEl.style.fontSize = '72px';
      for (let fs = 72; fs > 48 && captionEl.offsetHeight > 72 * 1.15 * 3 + 4; fs -= 4) captionEl.style.fontSize = `${fs - 4}px`;
      const p = page ? 0.86 + 0.14 * easeInOut((t - page.start) / 0.14) : 1;
      captionEl.style.transform = `scale(${p.toFixed(3)})`;
    }
  }

  function renderThumbnail() {
    const t = 1.3;
    locations.set(thumbLocation);
    locations.update(t);
    tito.update({ t, mouth: 0, emotion: episode?.thumbnailTitoEmotion ?? 'surprised', lookAt: PROFE_FACE, mouthShape: 'O' });
    updateMic(episode?.titoProp === 'mic');
    profe.update({ t, mouth: 0.6, speaking: true, pose: episode?.thumbnailPose ?? 'shrug', pointAt: POINT_AT, lookAt: TITO_FACE, mouthShape: 'open' });
    costumes.update({ name: episode?.costume ?? 'none', k: 1, prop: episode?.thumbnailProp ?? null, t });
    if (lastBoardKey !== 'thumb') {
      lastBoardKey = 'thumb';
      const thumbBoard = episode?.thumbnailBoard ?? [...lines].reverse().find((l) => l.board)?.board ?? null;
      drawBoard(boardCtx, board.canvas.width, board.canvas.height, normalizeBoard(thumbBoard), 8, 6, locations.boardStyle());
      board.texture.needsUpdate = true;
    }
    if (nova) nova.update({ t, mouth: 0, emotion: 'smug', lookAt: TITO_FACE });
    placeCamera(nova ? 'thumb3' : 'thumb', null, t);
    renderer.render(scene, camera);
  }

  return { renderAt: (t) => (mode === 'video' ? renderVideo(t) : renderThumbnail()) };
}
