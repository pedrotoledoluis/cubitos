# Episodes 023–026 — trending batch

## Objective
Produce 4 new 35–55 s Shorts (format v2) aimed at follower growth: two approved calendar topics, one
"5 weirdest news of the week" roundup, and one fun current-affairs topic.

## Problem / why
Channel growth is slow; owner wants more current, funny topics. Trend research (subagent, 2026-10-30) found few
Peru-specific trend signals; ranking is by news coverage with dated sources.

## Scope (authorized by owner 2026-10-30)
- 023 Guaguas de pan (1–2 Nov, Andes).
- 024 San Martín de Porres (3 Nov; dog, cat and mouse eating from one plate, told as legend).
- 025 "Las 5 noticias más raras de la semana": Binance hack (29 Oct, ~$6.3B reported, North Korea only
  "se sospecha"), candidate dwarf planet 2026 ED138 (Rubin Observatory, Chile, 27 Oct), D-rex giant fungus
  (~25–27 Oct), Zócalo Catrina Guinness record 33.41 m (29 Oct; record angle only, ep 022 already covers origin),
  OpenAI math-conjecture claims disputed by mathematicians (27 Oct).
- 026 "Papacóptero": FAP Mi-17 helicopter for Pope León XIV's Peru visit (11–16 Nov). Jokes about the vehicle,
  never the faith.
- Moderate coaster look (bloom on lights, ACES + light color grade, soft fog, vignette; keep 30 fps) if it can be
  added without breaking existing episodes.
- Upload is NOT in scope until the owner OKs quality.

## Constraints
- Tito voice unchanged. One render at a time. Leftover process check after renders.
- Real facts only; re-verify every current-news fact with a dated source; hedge unconfirmed claims.
- Code/comments/docs in English; episode content in Spanish, light Peruvian slang for Tito/Nova.

## Delivery strategy
ask-on-risk. Forecast ~600–900 authored lines (4 episode JSONs + possible costumes/locations/boards + look).

## Tasks
- [x] T1 Moderate coaster look in the template. Route: delegated (preparation trigger). Commit 2426805.
- [x] T2 023 guaguas de pan: script, assets, render, verify. Route: delegated (writer trigger). Commit 2c7c2f6.
- [x] T3 Automate the Shorts cover in make-episode + 024 San Martín de Porres. Route: delegated (writer trigger). Commits 59b75ad, 8b8e7d3.
- [x] T4 025 cinco noticias raras: script, assets, render, verify. Route: delegated (writer trigger). Commit dfcc161.
- [ ] T5 026 papacóptero: script, assets, render, verify. Route: delegated (writer trigger).
- [ ] T6 Update AGENT_GUIDE.md §8 and odd/HANDOFF.md. Route: inline.

## Acceptance
- Each episode 35–55 s, 1080x1920, 30 fps, ~-15 LUFS, captions not over board, thumbnail readable, cover frame
  present, no black segments.
- Description: title + 1–2 unique sentences + sources + 3–5 hashtags.

## Progress / evidence
- T1 (commit 2426805): `hf-template/src/look.js` (LOOK config; selective bloom on emissive/additive materials via a
  glow-only pass + vendored UnrealBloomPass r169; per-material ACES kept so the board stays exact; warm/cool grade;
  location fog x0.9/0.95; vignette 0.22), wired in `src/stage.js` for video, thumbnail and cover.
  Checks: `hyperframes snapshot --at 2,10,16,45` on 022 (look ON) — characters not washed out, captions crisp, board
  readable; same at 10,45 with `LOOK.enabled=false` — identical pre-look pipeline; thumbnail render to scratch —
  headline crisp, sunburst excluded from bloom; space_blackhole scratch copy — holo board readable, disk glow moderate.
  `hyperframes check` page errors seen once (colorSpace bug) and fixed before the final snapshots. No visual test
  runner: RED/GREEN not applicable. `videos/` untouched.
- Per-episode `"look"` JSON field: done in T2 (`scripts/build-audio.mjs` writes `look: ep.look ?? null` into `episode-data.js`).
- T1 native review: assess (untracked excluded) = medium, `slice_budget_reached`; preflight STATUS blocks on
  `intended_untracked_selection_required` (same as publisher-service). Recorded as unavailable; no approval claimed.
  Parent spot check: compare frame 45 s OFF/ON viewed — ON warmer, subtle vignette, board identical.
- T2 (023-guaguas-de-pan, delegated writer): 12 lines (Tito hook "¡En Arequipa bautizan panes!", loop punchline
  "¡Lo bautizan y se lo comen!..."), Tito+Profe+Nova. New assets: costume `panadero` (chullo + floury apron,
  `src/costumes.js`), location `andes_panaderia` (sillar arches, clay oven fire/smoke, guaguas counter with a rocking
  guagua, offering table candles), board icons `guagua` and `caballito` (`src/board/scenes-v7.js`). Look default ON.
  Checks: `.build/verify/023-guaguas-de-pan-report.json` 1080x1920 h264 30 fps, aac, LUFS -15, no black segments;
  final mp4 with the 0.1 s cover prepended (rendered `compositions/cover.html`, concat + 100 ms audio delay, same as
  019–022): 50.08 s, -15.0 LUFS, true peak -1.6 dB, blackdetect empty. Sheet + transition viewed: heads in frame,
  captions above the board, chullo/oven readable, poof hides the swap. Thumbnail readable but the headline covers
  most of Tito (3-character thumbnail layout). Leftover check: 0. No RED/GREEN (content). Native review not run by
  the writer (parent owns it).
- T3a (commit 59b75ad): `scripts/make-episode.mjs` renders `compositions/cover.html` -> `renders/<id>-cover.png` (also on
  `--skip-render` when the PNG is missing) and always delivers `videos/<id>/<id>.mp4` = cover looped 0.1 s (3 frames)
  + render, audio `adelay` 100 ms, libx264 crf 18, aac 192k. Verify uses the delivered mp4 with line times shifted by
  0.1 s; the report gains `cover` (first-frame PSNR vs the cover PNG, `ok` at >= 30 dB). Documented in
  `hf-template/README.md`. No test runner: checked by the 024 run (cover ok, PSNR 47.0 dB; first frame grab viewed).
- T3b (commit 8b8e7d3, 024-san-martin-de-porres): 12 lines, Tito+Profe+Nova, hook "¡Perro, gato y ratón comiendo
  juntos!", punchline "Sí... y el ratón fue el almuerzo." (Tito's own pets; never the saint/faith/race). Legends hedged
  ("Cuenta la leyenda", "Otra leyenda"). New assets: costume `dominico` (white tunic/scapular, open black cloak, folded
  hood, rosary) + `profeProp: "broom"`; location `lima_claustro` (ochre arcade, blue/yellow tile dado, pink bell tower,
  fountain with drops, lantern, leaning broom, table with dog/cat/mouse eating from one plate); board icons `dog cat
  mouse broom scissors` (`src/board/scenes-v8.js`, canvas shapes: emoji do not render in headless snapshots/renders).
  Checks: report 46.82 s, 1080x1920 h264 30 fps, aac, -15.0 LUFS, true peak -1.8 dB, no black segments, cover ok.
  Sheet + transition viewed: captions above the board, heads in frame, poof hides the swap, animals readable above
  Tito in his close-ups. Thumbnail readable (first try orphaned "¡" -> starred `*¡JUNTOS!*`, re-rendered). Leftover
  check: 0. No RED/GREEN (content). Native review not run by the writer (parent owns it).

- T4 (commit dfcc161, 025-noticias-raras-semana, delegated writer): 12 lines, Tito+Profe+Nova, hook "¡Le robaron seis
  mil millones a Binance!", countdown 5→1 with one `newsCard` board per item (5 boards), loop punchline "¡Bacán! Le
  presto mi laptop a la IA..." (Profe facepalm -> replays into the robbery hook). Facts re-verified 2026-10-30:
  Binance (Proceso 30/10: "más de 6 mil millones", TRM ~6.360 M; compromised personal computer "may" be involved;
  TraderTraitor/North Korea per TRM/Chainalysis, Binance does not confirm -> board "SE SOSPECHA"); 2026 ED138 (WGBH
  27/10, Rubin, 600–1,500 km uncertain); D-rex (ScienceDaily 26/10, PopSci 14/10; up to 50 cm, new family
  Dianjunaceae); Catrina Zócalo 33.411 m Guinness (La Razón 29/10); OpenAI (Al Jazeera 27/10: local smoothing
  conjecture + ETH refutation claims, MIT's Ryan Williams still verifying, calls method "mysterious"). CNN Español
  URL kept from the parent's research (HTTP 451 to the writer, not re-read). "No es asesoría financiera" in the notes.
  New assets: costume `anchor` (navy suit, collar hiding the teal bowtie, red tie, lapel mic, earpiece), location
  `news_studio` (`src/locations/news_studio.js`: world-map video wall, side desks, globe, studio camera with tally,
  "AL AIRE" sign, floor ticker), scene `newsCard` + icons `laptop planet mushroom robot` (`src/board/scenes-v9.js`,
  canvas shapes). Checks: report 53.60 s, 1080x1920 h264 30 fps, aac, -15 LUFS, true peak -2.0 dB, no black
  segments, cover ok (PSNR 47.3 dB). Sheet + transition viewed: captions above the board, heads in frame, boards
  readable, poof hides the swap; first render showed the teal bowtie under the red tie (read as a tongue) -> collar
  added, re-rendered. Thumbnail readable ("TOP 5" badge, RARAS box); Tito mostly hidden behind the headline (same
  3-character layout issue as 023). Leftover check: 0. No RED/GREEN (content). Native review not run by the writer.

## Next step
T5 (026 papacóptero).
