# Historia en Cubitos — episode template (HyperFrames)

Production rules (script, format, publishing): `../PRODUCTION.md`.

Reusable project for the Spanish Shorts channel. One episode = one JSON file; one command renders it
and drops the upload-ready files into `../videos/<id>/`.

## Make an episode

```bash
cd hf-template
node scripts/make-episode.mjs episodes/005-my-slug.json
```

What it does, in order (each step has a hard timeout; leftover processes are stopped after every step):

1. `scripts/build-audio.mjs` — voices, timeline, mouth envelopes, caption pages, BGM + SFX, master mix (-15 LUFS).
   Writes `assets/audio/mix.wav`, `src/episode-data.js` and updates `index.html` durations.
2. `npx hyperframes check`
3. `npx hyperframes render` → `renders/<id>.mp4` (1080x1920, 30 fps; ~20 min on this machine)
4. Renders `compositions/thumbnail.html` and grabs a 1280x720 PNG.
5. Writes the description (title, `summary`, sources, hashtags; no fixed channel paragraph) and `metadata.json`, copies everything to `../videos/<id>/`:
   `<id>.mp4`, `<id>-thumbnail.png`, `<id>-description.txt`, `metadata.json`
   (title, description, tags, `categoryId` 27 Education, language `es`, `madeForKids` false — for a future uploader).
6. Verification: `.build/verify/<id>-sheet.jpg` (one frame per line) and `<id>-report.json`
   (duration, streams, LUFS, black segments, step timings). Look at the sheet before publishing.

`--skip-render` reuses existing renders (re-writes deliverables and the report only).
`--print-description` prints the description text and exits (nothing is built or written).
The report warns when the duration is outside 35–55 s.

## Episode JSON

```jsonc
{
  "id": "005-my-slug",
  "title": "YouTube title",
  "summary": "1-2 unique sentences for the description",
  "thumbnailText": "¡BIG TEXT!",
  "thumbnailBadge": "31 OCT",                       // optional thumbnail sticker
  "thumbnailBoard": { "scene": "questionCrowd" },   // optional; default = last board scene
  "costume": "greek", "costumeFrom": 2,             // Profe costume (src/costumes.js), poof on line 2
  "locations": ["office", "athens"],                 // first = start location (src/locations/)
  "thumbnailLocation": "athens", "thumbnailPose": "shrug",
  "sources": ["https://..."],
  "hashtags": ["#historia", "#curiosidades", "#tema"], // 3-5 topic hashtags
  "tags": ["historia", "..."],                      // optional extra YouTube tags
  "lines": [
    { "speaker": "tito", "text": "¿Pregunta?", "shot": "wide", "emotion": "surprised" },
    { "speaker": "profe", "text": "Año 1518.", "say": "Año mil quinientos dieciocho.",
      "board": { "scene": "mapPin", "pin": [520, 360], "label": "ESTRASBURGO" },
      "titoEmotion": "skeptical", "sfx": [["pop", 1.0]] }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `text` | Caption, shown exactly. Long lines are split into pages of max 3 lines, timed by character share. |
| `say` | Optional TTS text (spell out numbers, fix names: "Bertié"). |
| `shot` | `wide` (= `wide3` with Nova), `profe`, `tito`, `nova`, `titoProfe`, `profeNova`, `board` (default: `board` on board lines, else the speaker). `dutch: true` tilts. |
| `board` | Board scene name or `{ "scene": name, ...params }`. Profe goes to `explain` and points at the board. |
| `speaker` | `tito`, `profe` or `nova` (Nova is only built when the episode has her lines). |
| `emotion` | Speaker's emotion on their own line. Tito: `neutral surprised happy skeptical scared`; Nova: `neutral curious smug happy surprised explaining` (default `explaining`). |
| `novaEmotion` | Nova's reaction while others talk. |
| `titoEmotion` | Tito's reaction while Profe talks. |
| `pose` | Profe's pose on his lines: `idle explain shrug facepalm wave lamp`. |
| `profePose` | Profe's pose while Tito talks (e.g. `facepalm` on the final joke). |
| `location` | Location preset from this line on (sticky): `office athens sanfrancisco1870 medieval_italy uraniborg mission_control space_blackhole`. Change = wipe + whoosh + camera fly-in. |
| `costume` | Per-line costume override (episode-level `costume` + `costumeFrom` set the default; change = poof + pop). |
| `props` | World props shown on this line, e.g. `["pluckedChicken"]` (`PROPS` in `src/stage.js`). |
| `profeProp` | Handheld prop: `lamp`. Pair with pose `lamp` (free hand forward). |
| `sfx` | `[[name, secondsAfterLineStart]]`. Names: `pop whoosh boing squeak hooves fiddle wave ding` + bundled HyperFrames SFX. |

Both characters look at the speaker; on Profe's board lines both look at the board.
Poses and emotions blend from the previous line's values (stateless, seek-safe).

## Board scenes (`src/board/`)

`scenes.js` holds named, parameterized scenes `scene(g, W, H, u, d, params)` (u = seconds since the line
started, d = line duration). `chalk.js` holds primitives and icons (`rabbit person dancer doctor soldier
human carrot napoleon shell chest note musician`).

| Scene | Params |
| --- | --- |
| `mapPin` | `pin [x,y]`, `label`, `date`, `icon`, `title` |
| `route` | `stops [{label,x,y,dx,dy,color}]`, `traveler`, `travelerScale`, `britain`, `reverse`, `title` |
| `counter` | `label`, `to`, `final`, `icon`, `max`, `cols` |
| `equation` | `items` (icon names, `+ = →`, or `{icon,count,scale}`), `title` |
| `stage` | `title`, `musicians`, `dancers` |
| `questionCrowd` | `title`, `crowd`, `icon` |
| `scroll` | `label`, `subtitle`, `lines` |
| `treatyMap`, `swarm`, `carriage` | episode 2 scenes, `title` |
| `mapPin2` | `map` (`greece usa`), `pin`, `label`, `labelDx`, `icon`, `iconAt`, `iconScale`, `date`, `title` |
| `labelled` | `icon`, `label`, `title`, `scale` |
| `lampSearch` | `title`, `crowd` |
| `newspaper` | `masthead`, `date`, `headline`, `sub` |
| `decree` | `label`, `icon`, `title` (icon gets crossed out) |
| `banknote` | `value`, `label`, `face` |
| `bridge` | `left`, `right`, `title` |
| `showcase` | `icon`, `scale`, `sparkle`, `case`, `plaque`, `title` |
| `mapRivals` | `map`, `pins [{x,y,label,labelDx,labelDy}]`, `icon`, `title` |
| `versus` | `left`, `right` (`{value,label,color}`), `icon`, `title` |
| v4 science | `marsRoute twoTeams bigUnit unitMismatch calendar lowOrbit blackHole tidal spaghetti slowClock redFade` (`scenes-v4.js`) |

`equation` items also accept `vs` and `{ icon, cross: true, label }`. Board surface style comes from the location
(`chalk wood poster`).

To add one: write a function in `scenes.js` (or a new file) and add it to `SCENES`. Must be deterministic
(use `hash()`, never `Math.random`/clocks). Board canvas is 1280x886.

## Layout rules (portrait)

- Captions: top-center block, 13%..~30% of the frame, max 3 lines (pages + font guard), fill colored by speaker
  (`CAPTION_COLOR` in `src/stage.js`: Profe cream, Tito yellow, Nova light violet).
- Board (or in-world sign) sits at `BOARD` in every location; the `board` shot frames it at ~33%..60%,
  with Profe (whole head) and Tito below. Close-ups are near eye level and orbit to the side that pushes the
  board out of frame (Profe from the left, Tito from the right). The pointer is shortened while explaining so
  it stops under the board (never across titles).
- Camera shots live in `SHOTS` in `src/stage.js`. If you change them, snapshot every line
  (`npx hyperframes snapshot --at ...`) and check the sheet.

## Look (post-processing, `src/look.js`)

A moderate cinematic look on the 3D scene only (captions, wipe and thumbnail text are HTML and stay untouched):
selective bloom on glowing things (emissive lamps/neon, Tito's antenna, Nova's star, additive FX), ACES filmic
tone mapping (per material, so the `toneMapped: false` board stays exact), a light split-tone grade (warm
highlights, cool shadows), slightly tightened location fog and a soft vignette. Deterministic, 30 fps.

- Tune everything in the `LOOK` object at the top of `src/look.js`; `enabled: false` turns it off globally.
- A material glows when `luminance(emissive) * emissiveIntensity >= LOOK.bloom.minEmissive`, or when it is an
  additive `MeshBasicMaterial`. Force it either way with `material.userData.glow = true | false`.
- Per episode: `"look": false` (off) or `"look": { "vignette": 0, "bloom": { "strength": 0.3 } }` (overrides)
  on `window.EPISODE`. Note: `scripts/build-audio.mjs` must copy `look` into `src/episode-data.js` for the
  episode-JSON field to take effect (pending).
- Bloom addon files are vendored (three r169, MIT) in `src/vendor/three-addons/`; no network.
- Cost: one extra scene pass (glow only) plus bloom per frame.

## Voices

- Profe: Kokoro `em_alex` via `npx hyperframes tts` (speed 0.95, pitch 0.93).
- Nova: Kokoro `ef_dora` (speed 1.08, pitch 1.05, EQ).
- Tito: Windows SAPI "Microsoft Sabina Desktop" (`scripts/tts.ps1`, rate +1) with the episode-1 treatment:
  `asetrate` x1.22, tempo 1.05, highpass 80 Hz, loudnorm -16.
- Voice files are cached in `.build/audio/` by a hash of speaker + text + settings.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Main 1080x1920 composition (Three.js canvas + caption + mix audio) |
| `compositions/thumbnail.html` | 1280x720 thumbnail (text from `thumbnailText`) |
| `src/stage.js` | Camera shots, acting (poses/emotions/look-at), captions, board updates |
| `src/look.js` | Post-processing look (bloom, grade, vignette, fog scale) |
| `src/locations/` | Location presets (`office`, `athens`, `sanfrancisco1870`), `BOARD` placement, shared props (chicken, pigeon) |
| `src/costumes.js` | Profe costume presets (`napoleon greek norton roman medieval tycho nasa einstein`) + poof + handheld lamp |
| `src/characters/` | Characters v2 (copy of `../characters-v2/src`) |
| `src/board/` | Board scenes (`scenes.js`, `scenes-v2.js`) and chalk primitives |
| `scripts/make-episode.mjs` | The one command |
| `scripts/build-audio.mjs` | Audio + timeline |
| `scripts/processes.mjs` | Leftover process finder (`node scripts/processes.mjs [--kill]`) |
| `episodes/` | Episode sources |

## Process hygiene

`make-episode` stops leftover processes after every step and on exit. Only processes whose command line
references this project, `hyperframes render/check/snapshot/tts`, kokoro, `tts.ps1`, or headless
HyperFrames/puppeteer browsers are touched. Check manually with `node scripts/processes.mjs`.
