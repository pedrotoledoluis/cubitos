# Characters v2

Polished Profe Claudio and Tito. Same public contract as `src/characters/*.js` (v1), so they drop into the
existing pipeline or a HyperFrames Three.js composition.

## Files

| File | Purpose |
| --- | --- |
| `src/index.js` | Public entry: `createProfe`, `createTito`, `addStudioLights`, `PALETTE`, `PROFE_POSES`, `TITO_EMOTIONS` |
| `src/profe.js`, `src/tito.js` | Characters |
| `src/util.js` | Materials (flat + fresnel rim), bevelled boxes, cardboard texture, seeded RNG, deterministic motion helpers |
| `src/rig.js` | Aimable blocky arm |
| `src/lights.js` | Studio rig matching the night-office set (for previews/branding; the episode set already has lights) |
| `preview.html` | Turntable sheets: `?sheet=profe|tito|faces|lineup` (`&t=` time, checkbox to animate) |
| `tools/render-sheets.mjs` | Renders sheets to `sheets/*.png` via headless Edge |
| `tools/browser.mjs` | Static server + puppeteer (Edge auto-detected, or `CHROME_PATH`) |

## API

```js
import { createProfe, createTito } from '../characters-v2/src/index.js'; // needs an importmap for "three"
const profe = createProfe();   // { group, update(state), faceHeight, height, poses }
const tito = createTito();     // { group, update(state), faceHeight, height, emotions }
scene.add(profe.group, tito.group);
// every frame (pure function of state; seek-safe):
profe.update({ t, mouth: amp, speaking: true, sinceLineStart, pose: 'explain', pointAt: [-1, 2.6, 0.4] });
```

State fields (all optional except `t`). v1 fields keep their meaning.

| Field | Who | Meaning |
| --- | --- | --- |
| `t` | both | Time in seconds. All motion derives from it (no rAF, no Math.random). |
| `mouth` | both | Amplitude 0..1 → discrete shapes: `closed` <0.12, `half` <0.45, `open`. |
| `speaking` | both | Enables talk gestures (mustache wiggle, arm flaps). |
| `sinceLineStart` | both | Seconds since the line started → squash (Tito: bounce fallback). Negative = none. |
| `emotion` | both | Tito: `neutral surprised happy skeptical scared`. Profe: `surprised skeptical` (brows). |
| `prevEmotion`, `emotionSince` | Tito | Blend from previous emotion over 0.25 s; `emotionSince` also drives the reaction hop/squash. |
| `pose`, `prevPose`, `poseSince` | Profe | `idle explain shrug facepalm`; blends over 0.35 s from `prevPose`. |
| `pointAt` | Profe | World `[x,y,z]` (or Vector3) the pointer arm aims at in `explain`. |
| `lookAt` | both | World target for pupils + slight body yaw. Overrides legacy `lookX`. |
| `lookX` | both | v1 horizontal pupil offset (used when `lookAt` is absent). |
| `brows` | Profe | Override -1 (frown) .. 1 (raised). |
| `mouthShape` | both | Force `closed half open O smile` (Tito also `flat grimace`). |

Pose/emotion transitions are stateless: the caller passes the previous value and the time since the change,
which a timeline can compute from line data (e.g. previous line's emotion + `t - line.start`).

## Plugging into the v1 pipeline

In `src/main.js` change the two imports to `../characters-v2/src/profe.js` / `tito.js`. The existing
`update({ t, mouth, speaking, sinceLineStart, emotion, lookX })` calls work unchanged. Optionally pass
`lookAt` (the other character's face position) and `pose` from new episode JSON fields.

## Plugging into HyperFrames (Three.js adapter)

Serve with an importmap for `three`, build the scene once, and in the seek callback call
`profe.update({ t: time, ... })` / `tito.update(...)` then `renderer.render`. No internal state is kept between calls.

## Render sheets

```bash
node characters-v2/tools/render-sheets.mjs          # all
node characters-v2/tools/render-sheets.mjs profe    # one
```
