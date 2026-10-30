# Epic format v2 — 4-episode experiment

## Objective
Evolve the channel format based on the research report (`reports/Estrategia de Shorts virales.md`) and produce
4 new episodes (019–022) for publishing on 2026-10-31.

## Problem / why
Channel has 6 subscribers and 321 views. Best videos open on one absurd premise; worst need setup first.
Descriptions repeat a fixed channel paragraph (YouTube policy bans repetitive sentences). 60–90 s is likely
too long for a new channel. Owner asked for "epic" thumbnails and full creative freedom.

## Scope (authorized by owner 2026-10-30)
- New format: 35–55 s, 1-second hook, loop ending, per-character caption colors, short unique description,
  3–5 topic hashtags, no fixed channel paragraph.
- Epic thumbnail template v2.
- New costumes/locations needed by the 4 topics.
- 4 episodes: 019 Canción Criolla (Oct 31), 020 CDMX parade / James Bond, 021 Inca mummies in November,
  022 La Catrina satire.
- Upload is NOT in scope until the owner OKs quality (daily upload limit also applies).

## Constraints
- Tito voice unchanged. One render at a time. Leftover process check after renders.
- Real facts only, hedge unconfirmed claims; sources in description.
- Code/comments/docs in English; episode content in Spanish.

## Delivery strategy
ask-on-risk. Forecast ~1,500+ authored lines (assets + scripts); slices recorded below.

## Tasks
- [x] T1 Pipeline + rules: description template (per-episode `summary`, no CHANNEL_LINE), per-character caption
      colors, PRODUCTION.md rules for 35–55 s / 9–12 lines / loop ending / hashtags. Route: delegated (writer trigger, 3+ files).
- [x] T2 Epic thumbnail v2 (`compositions/thumbnail.html`). Route: delegated (preparation trigger).
- [x] T3 New costumes + locations for 019–022. Route: delegated (writer trigger).
- [ ] T4 Scripts 019–022 (JSON) + duration check with build-audio (35–55 s). Route: delegated (4 files).
- [ ] T5 Render 019–022 one at a time, verify sheets/reports/thumbnails. Route: inline per-action.
- [ ] T6 Update AGENT_GUIDE.md §8 state. Route: inline (one mechanical file).

## Acceptance
- Each episode 35–55 s, 1080x1920, 30 fps, ~-15 LUFS, captions not over board, thumbnail readable at 320x180.
- Description: title + 1–2 unique sentences + sources + 3–5 hashtags.

## Progress / evidence
- T1 (delegated writer): `make-episode.mjs` exports `buildDescription(ep)` (title, `summary`, Fuentes, hashtags;
  CHANNEL_LINE removed), `--print-description` dry mode, warnings for missing `summary` / hashtag count outside 3-5,
  duration warning now 35-55 s. `src/stage.js` `CAPTION_COLOR` (Profe `#fff3d6`, Tito `#ffd23a`, Nova `#c9b8ff`).
  PRODUCTION.md rules (§2 hook/9-12 lines/loop/title/description/tags, §3 format, §10 JSON, §12 checklist), README.
  Evidence: `node --check` OK on make-episode.mjs and stage.js; `--print-description` on 018 prints title,
  sources, hashtags (no channel line), with a test `summary` it appears after the title; snapshot of 018 at 2 s
  (Tito, yellow caption) and 11 s (Profe, cream caption); leftover check 0. Published `videos/` untouched. Commit `cc5192e`.

- T2 (delegated writer): `compositions/thumbnail.html` v2 (dark left shade + vignette, 104 px auto-fit headline with
  18 px ink stroke + hard shadow, starred word in a red tilted box, optional `thumbnailBadge` yellow sticker, logo
  bottom-left). `src/stage.js` thumbnail mode: additive yellow sunburst + glow behind the cast, warm/cool rim lights,
  closer `thumb`/`thumb3` cameras, Tito moved next to Profe. `build-audio.mjs` passes `thumbnailBadge`.
  Evidence: thumbnail rendered for 018 (badge "31 OCT" injected temporarily, `episode-data.js` restored) to the
  session scratchpad `thumb-v2-preview.png`, inspected at 1280x720 and 320x180 (headline, key word and faces read);
  3 iterations. `hyperframes check`: only `audio_src_not_found` for `assets/audio/mix.wav` (pre-existing, audio not
  built on this machine). Not visually verified: a three-character (`thumb3`, Nova) thumbnail. Leftover check 0.

- T3 (delegated writer): costumes `criollo` (+ `profeProp: "guitar"`), `bond`, `inca`, `posada` in `src/costumes.js`
  (handheld props generalized to `{ lamp, guitar }`; shared `blackBow()` hides the teal bowtie); locations
  `lima_pena_1944`, `cdmx_muertos`, `cusco_inca` (own files, built with the now-exported `makeLocation()` from
  `modern.js`); board icons `guitar candle calavera catrina fancyHat clapper mummy litter unku marigold`
  (`scenes-v6.js`, canvas shapes), `decree` `cross: false`, `equation` `pad`, `labelled` tag auto-fit. PRODUCTION.md §5/§6/§7.
  Evidence: `node --check` OK on all 9 edited/new JS files. Kokoro is not installed on this machine, so
  snapshots were driven by a scratchpad preview timeline (character-count estimate calibrated on 018: 94.5 s
  estimated vs 88.2 s real before removing a 0.35 s pad), `src/episode-data.js` restored afterwards. Snapshots
  of 019-022 (wide, board, Profe/Tito/Nova close-ups) inspected over 3 iterations; fixed: props outside the
  portrait frame (moved into |x| < 3.2), dim peña lighting, teal bowtie showing, scarf bars, garlands over captions,
  equation/labelled labels clipped at the board edge, flat Cusco backdrop, condor crossing captions, cathedral
  windows floating. Not verified: thumbnails of 019-022, motion of animated props in a real render. Leftover check 0.

  Commit `375794a`.

- T4 (delegated writer, PARTIAL): `episodes/019-cancion-criolla.json` (Tito+Profe, 11 lines, 3 boards),
  `020-desfile-james-bond.json` (Nova hook, 12 lines, 3 boards), `021-momias-incas.json` (Tito+Profe, 11 lines,
  3 boards), `022-catrina-burla.json` (Nova hook, 11 lines, 3 boards); each with summary, sources + hedge note,
  4 hashtags, accentless tags, thumbnailText/Badge, loop ending (last Tito line leads back into line 1).
  Evidence: `make-episode --print-description` OK for all four (title, summary, Fuentes, hashtags; no warnings).
  BLOCKED: `build-audio` fails on the first Profe line: `kokoro-onnx package is not installed` (Python 3.14 at
  C:/Python314, no HYPERFRAMES_PYTHON). Voices unchanged, nothing installed. Estimated durations only (not proof):
  019 52.8 s, 020 53.4 s, 021 53.3 s, 022 50.9 s; all near the 55 s cap, so expect to cut a line if real TTS runs long.

## Next step
Install `pip install kokoro-onnx soundfile` (owner decision), run `build-audio` on 019-022 one at a time, record the
real `timeline:` durations (35-55 s), cut if over; then T5.
