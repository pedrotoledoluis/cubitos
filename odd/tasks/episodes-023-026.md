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
- [ ] T2 023 guaguas de pan: script, assets, render, verify. Route: delegated (writer trigger).
- [ ] T3 024 San Martín de Porres: script, assets, render, verify. Route: delegated (writer trigger).
- [ ] T4 025 cinco noticias raras: script, assets, render, verify. Route: delegated (writer trigger).
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
- Pending: per-episode `"look"` JSON field needs `scripts/build-audio.mjs` to copy `look` into `episode-data.js`
  (outside T1 edit surface). Global toggle `LOOK.enabled` works now.

## Next step
T2 (and decide on the one-line build-audio pass-through for `look`).
