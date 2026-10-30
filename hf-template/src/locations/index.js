import * as THREE from 'three';
import { BOARD } from './common.js';
import office from './office.js';
import athens from './athens.js';
import sanfrancisco1870 from './sanfrancisco1870.js';
import medieval_italy from './medieval_italy.js';
import uraniborg from './uraniborg.js';
import mission_control from './mission_control.js';
import space_blackhole from './space_blackhole.js';
import { MODERN_LOCATIONS } from './modern.js';
import lima_pena_1944 from './lima_pena_1944.js';
import cdmx_muertos from './cdmx_muertos.js';
import cusco_inca from './cusco_inca.js';

// Location registry. A location preset is `{ name, build({ boardTexture }) }` where build returns
// { group, update(t), background, fog: [color, near, far], exposure, boardStyle }.
// To add one: create src/locations/<name>.js (copy athens.js as a starting point), keep the in-world board
// surface at BOARD (use boardScreen()), keep the area x -2.2..1.9, z -0.6..0.9 clear for the characters,
// and register it here.
export const LOCATIONS = { office, athens, sanfrancisco1870, medieval_italy, uraniborg, mission_control, space_blackhole, ...MODERN_LOCATIONS, lima_pena_1944, cdmx_muertos, cusco_inca };
export { BOARD };

/**
 * Builds the requested locations (all of them by default) into `scene` and returns a switcher.
 * The shared board canvas (1280x886) is drawn by the stage and shown by every location's board surface.
 */
export function createLocations(scene, renderer, names = Object.keys(LOCATIONS)) {
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 1280;
  boardCanvas.height = Math.round(1280 * BOARD.h / BOARD.w);
  const boardTexture = new THREE.CanvasTexture(boardCanvas);
  boardTexture.colorSpace = THREE.SRGBColorSpace;
  boardTexture.anisotropy = 4;

  const built = {};
  for (const name of new Set(names)) {
    const preset = LOCATIONS[name];
    if (!preset) throw new Error(`Unknown location "${name}". Known: ${Object.keys(LOCATIONS).join(', ')}`);
    built[name] = preset.build({ boardTexture });
    built[name].group.visible = false;
    scene.add(built[name].group);
  }
  let current = null;

  function set(name) {
    const loc = built[name];
    if (!loc) throw new Error(`Location "${name}" was not built`);
    if (current !== name) {
      for (const [n, l] of Object.entries(built)) l.group.visible = n === name;
      scene.background = new THREE.Color(loc.background);
      scene.fog = loc.fog ? new THREE.Fog(...loc.fog) : null;
      renderer.toneMappingExposure = loc.exposure ?? 1.15;
      current = name;
    }
    return loc;
  }

  return {
    set,
    update: (t) => built[current]?.update?.(t),
    boardStyle: () => built[current]?.boardStyle ?? 'chalk',
    board: { canvas: boardCanvas, texture: boardTexture, center: new THREE.Vector3(BOARD.x, BOARD.y, BOARD.z) },
  };
}
