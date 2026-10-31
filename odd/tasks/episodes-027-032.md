# Episodes 027–032 — Halloween night + Día de Muertos batch

## Objective
Six 35–55 s Shorts. Three publish 2026-10-31 at 19:00 / 20:00 / 21:00 Peru, three on 2026-11-01 between 09:00 and
11:59 Peru. Owner reviews each script + idea order before production.

## Scope (authorized by owner 2026-10-31)
Tonight (Halloween):
- 027 Top Halloween horror films (famous: Halloween, El Conjuro, Chucky…), ranking from a reliable site — 19:00.
- 028 Top 5 most decorated Halloween houses 2026, real photos on Profe's projector, Tito "no me da miedo" while
  shaking — 20:00.
- 029 Which myth is strongest: viernes 13 / martes 13 / Salem / why "día de las brujas" / Inocentes — 21:00.
  (Friday 13 Nov 2026 is the next one.)
Tomorrow (Día de Muertos):
- 030 Ofrenda peruana vs mexicana — 09:00.
- 031 How Latin America celebrates its dead (Guatemala barriletes, Bolivia ñatitas, Ecuador colada morada, Perú…) — 10:30.
- 032 Krampus with real photos — 11:30.
Template: real photos / ≤5 s clips shown on Profe's projector/board.

## Constraints
- Copyright: use only media we may publish (public domain, Creative Commons with credit, or recreated in 3D). No
  clips from copyrighted films; famous films are shown via title cards / ranking data / stylized icons.
- Real facts with dated sources; one render at a time; owner OKs each script first.
- Upload limit ~10–12 per rolling 24 h; 7 uploads happened ~07:00 on 2026-10-31.

## Tasks
- [x] U1 Projector media scene (image / short clip + credit) in the template. Route: delegated (writer trigger). Commit f0f4b21.
- [x] U2 Research + script drafts for 027–032 (facts, sources, licensed media, idea order). Route: delegated (preparation trigger).
  Drafts in `odd/scripts/027-032-drafts.md`. Owner tuning 2026-10-31 10:15: 027 set in a dark bedroom, the trio under a
  bedsheet fort around one flashlight, scaring themselves with their imagination; 028 approved as drafted (board
  recreations, no licensed house photos); 029 add well-known Latin American legends (La Llorona etc.); 030–032 approved.
- [x] U3 027 render + enqueue 19:00. Route: delegated (writer trigger: location + board scenes + costume + episode).
- [ ] U4 028 render + enqueue 20:00. Route: delegated.
- [ ] U5 029 render + enqueue 21:00. Route: delegated.
- [ ] U6 030–032 render + enqueue 2026-11-01. Route: delegated.

## Progress / evidence
- U1 (2026-10-31): board scene `media` (src/board/media.js) with `image` (cover/contain, Ken Burns, title band, credit strip)
  and `clip` (build-audio extracts the cut, max 5 s, to a 30 fps JPEG sequence in assets/media/_frames/<hash>/; the scene
  shows frame floor(u*30)). Images/frames are decoded before capture via window.__hf.buildReady.boardMedia. Missing
  file fails the build (`line N: board media: file not found: ...`, checked). RED/GREEN not applicable (visual render
  pipeline, no test runner): checks were snapshots + render of a scratch episode (NASA Apollo 17 PD photo + ffmpeg
  testsrc clip with frame counter): snapshot at 6.0/5.0/5.033 s (seeked out of order) showed source frames 121/91/92,
  exactly the predicted frames; a full parallel render showed frame 91 at 5.0 s too; `hyperframes check` passed.
  Scratch episode, media and outputs deleted; index.html / episode-data.js / mix.wav / .hyperframes restored.
- U3 (2026-10-31): `027-top-peliculas-terror` (13 lines). New location `sheet_fort` (src/locations/sheet_fort.js: dark
  bedroom, bedsheet fort over chairs, one standing flashlight as a shadow-casting point light, plush llama prop; the
  board is a soft-edged dark card on the back sheet via the new `sheet` board style with a transparent screen), new
  costume `pijama`, new board scenes `titleCard` (one ranked film or two side by side) and `shadowScare` (flashlight
  shadow gag: huge horned shadow -> Tito's plush llama) with generic icons doll/cross/musicBox/bedMoon/pumpkin/llama
  (src/board/scenes-v11.js). Per-episode `look` override: stronger bloom, warmer highs, cooler shadows, vignette 0.4.
  Owner changes applied: fort setting + 2 imagined-scare gags (llama shadow; "¿Escucharon eso?" -> Tito's stomach).
  Facts re-checked 2026-10-31 on rottentomatoes.com: 97/93/86/78/65 % unchanged; Halloween budget ~US$325k
  (Box Office Mojo), script keeps "poco presupuesto". Checks: snapshots of hook/cards/gag/#1 (faces lit, cards
  legible), `hyperframes check` passed. RED/GREEN not applicable (visual pipeline, no test runner).
