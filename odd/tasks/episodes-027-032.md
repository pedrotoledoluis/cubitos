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
- [x] U3 027 render + enqueue 19:00. Route: delegated (writer trigger: location + board scenes + costume + episode). Commit 3e3d93e.
- [x] U4 028 render + enqueue 20:00. Route: delegated (writer trigger: location + board scenes + episode + media). Commit ae44e80.
- [x] U5 029 render + enqueue 21:00. Route: delegated (writer trigger: costume + board icons + episode + media). Commit c243113.
- [x] U6 030–032 render + enqueue 2026-11-01. Route: delegated (writer trigger: episodes + media; 032 also location + costume + icon). Commits 08538db, 574924d, 70a04d3.

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
- U4 (2026-10-31): `028-casas-halloween-2026` (12 lines, script as drafted). New location `suburbio_halloween`
  (src/locations/suburbio_halloween.js: painted gabled houses with lit windows, roof string lights and porch pumpkins,
  3D jack-o'-lanterns, gravestones, waving giant yard skeleton, picket fence with blinking orange/purple lights;
  projector-style `screen` board). New board scene `houseCard` (ranked house with fitted value + "RECREACIÓN" tag)
  and generic icons ufoDish/pumpkinArch/wizardStreet/graveyard/hauntedMaze (src/board/scenes-v12.js). Costume
  `anchor` (reused). Only real photo: CC0 "Halloween in a Sun Valley street, Los Angeles, October 2024" (Alexis
  Doine, license checked via Commons API) in assets/media/028/, shown as generic "ASÍ SE DECORA EN EE. UU." with credit.
  Facts re-checked 2026-10-31: Hoodline 15/10 (McClellan, Glendale AZ: 20 rooms, 20+ actors, ~8,000 visitors last
  year), Hoodline 26/10 (Halloween Herm: nearly 300 props, Guinness attempt not awarded), LawnStarter upd. 13/10
  (Mauldin 10-ft satellite-dish UFO; Appleton pumpkin arch + giant skeletons for St. Jude / Harbor House; Dallas
  ~2,500 visitors last year). No fact changes. Caption text uses "2500" (not "2.500") because the caption pager
  splits on the period. Checks: snapshots of hook/photo/all 5 cards/ending (cards legible; #4 skeleton moved off the
  value), `hyperframes check` passed, verify sheet looked at, report 54.478 s 1080x1920 30 fps -15 LUFS no black,
  cover ok. Enqueued in publisher: job 33ef407b, Pending, 2026-10-31 20:00 Peru. RED/GREEN not applicable (visual
  pipeline, no test runner).
- U5 (2026-10-31): `029-que-mito-pesa-mas` (11 lines, myth tournament). Owner change applied: added La Llorona and El
  Tunche (Peruvian Amazon) as round 3. Cuts vs draft: martes 13 merged into round 1 (proverb kept as board footer),
  combi gag and Inocentes bonus dropped. New costume `puritano` (src/costumes.js: black coat, buckled capotain hat,
  white falling-band collar), kept through the ending; reused `druid`, locations `office` + `celtic_night`. New
  board icons fri13/tue13/llorona/tunche (src/board/scenes-v13.js) used via `equation`. Only real image: "The Witch
  No. 1" (Joseph E. Baker, c. 1892, public domain, license checked via Commons API) in assets/media/029/, credited.
  Facts re-checked 2026-10-31: Fridays 13th in 2026 = Feb, Mar, Nov (computed); Salem 19 hanged, Elizabeth Johnson Jr.
  last accused cleared 2022 (NPR/WGBH); Halloween/Samhain link kept as a theory ("tendría raíces", Wikipedia notes it
  is contested); La Llorona as Mexican legend, a similar weeping woman recorded by Sahagún in the 16th c., Cihuacóatl
  link only a hypothesis (México Desconocido); Tunche whistle "far = near, near = far" (Andina 03/04/2024). Checks:
  snapshots (boards legible, costume persistence bug found and fixed), `hyperframes check` passed, verify sheet looked
  at, report 53.476 s 1080x1920 30 fps -15 LUFS no black, cover ok. Enqueued: job 5c54e1d3, Pending, 2026-10-31 21:00
  Peru. RED/GREEN not applicable (visual pipeline, no test runner).
- U6/030 (2026-10-31): `030-ofrenda-peru-vs-mexico` (11 lines, script as drafted). Reused locations office ->
  cdmx_muertos -> andes_panaderia, costumes posada -> panadero (repeated on every line from 7). New board icons waterGlass,
  saltBowl, dish, flagMx, flagPe (src/board/scenes-v14.js; flags drawn because flag emoji do not render headless) and
  optional `labelSize`/`titleSize` params on `equation` (defaults unchanged: 44/62). Real photos (license checked via
  Commons API): "Elementos ofrenda" (Nohemí FuentesN, CC BY-SA 3.0; shows cempasúchil, pan de muerto, papel picado,
  so it moved from line 2 to line 4 and line 2 became a drawn agua/sal board) and Lima cemetery on 1 Nov 2010 (Yiauhece,
  CC BY-SA 4.0) on Nova's line 8, both credited on the board and in the description. Facts re-checked 2026-10-31: SEP
  (agua = sed tras el recorrido, sal purifica, velas guían, papel picado = aire, retrato, pan = afecto y fraternidad),
  Andina Chimbote (bands, guitar/violin responsos, lunch at graves incl. cebiche), Infobae 2023 (chicharrón among most
  sold at Nueva Esperanza). Fact change: date board says both countries keep 1 and 2 Nov (draft had México "2 NOV").
  Checks: snapshots (boards legible after enlarging labels), `hyperframes check` passed, verify sheet looked at, report
  44.153 s 1080x1920 30 fps -14.9 LUFS no black, cover ok, thumbnail ok. Enqueued: job 284dfa73, Pending, 2026-11-01
  09:00 Peru. RED/GREEN not applicable (visual pipeline, no test runner). Commit 08538db.
- U6/031 (2026-10-31): `031-latinoamerica-celebra-muertos` (11 lines, script as drafted with cautious wording). Reused
  locations office -> cdmx_muertos (line 10), costume none, `equation` with flagPe/flagMx; no new code. Real photos
  (license checked via Commons API, 1280 px API thumbnails, each looked at): "Ñatitas 9796" (Larvadelibelula, 2021,
  CC BY-SA 4.0, own work with camera EXIF; chosen over the draft's photo, which shows an identifiable visitor, and over
  a CC0 1080 px upload without EXIF dated after the festival = copyvio risk), "Festival Barriletes en Sumpango"
  (SantiagoGG, CC BY-SA 4.0), "Fiambre - 11042021 (cropped)" (Gobierno de Guatemala, CC0), "Colada morada with guagua
  de pan from Cyrano bakery in Quito" (Taty2007, CC BY 4.0); all credited on the board and in the description. Haiti
  beat not used. Facts re-checked 2026-10-31: AP 2024 (WSLS) + AP 2022 (La Hora): 8 Nov, Cementerio General, flowers,
  colored caps/hats, coca, cigarettes, favors (health, money, love); bishops do not recognize it but tolerate it; AP
  says "hundreds" of devotees. Sumpango festival Sun 1 Nov 2026, category A 10–15 m (La Hora 2025). Fiambre cold
  salad of up to 50 ingredients served 1 Nov (E&N). Fact changes: "miles van igual" -> "No lo reconoce, pero lo
  tolera. Y cientos van igual."; "ofrendas que son Patrimonio de la UNESCO" -> "una fiesta que es Patrimonio de la
  UNESCO" (UNESCO inscribed the indigenous festivity, not the ofrendas). Checks: snapshots of all lines (photos and
  captions legible), `hyperframes check` passed, verify sheet looked at, report 42.212 s 1080x1920 30 fps -15 LUFS no
  black, cover ok, thumbnail ok. Enqueued: job 6c7a2e3d, Pending, 2026-11-01 10:30 Peru. RED/GREEN not applicable
  (visual pipeline, no test runner). Commit 574924d.
- U6/032 (2026-10-31): `032-krampus` (11 lines, script as drafted with fact-checked wording). New location
  `alpine_village` (src/locations/alpine_village.js: painted snowy peaks + chalets + onion-dome church, 3D pines, snow
  drifts, two flickering lantern posts, market stall with string lights, deterministic falling snow; `screen` board),
  new costume `nikolaus` (src/costumes.js: red cope with gold edging, full white beard below the mouth, low red-and-gold
  mitre with a cross; kept low because a tall mitre hid the board credit line), from line 2 via `costumeFrom: 2`; new
  board icon `krampusHead` (src/board/scenes-v15.js) used in `decree`. Real media (license checked via Commons API,
  each looked at): postcards "Nikolaus und Krampus" (early 20th c., PD) and "Gruss vom Krampus" (c. 1900, PD), clip
  "Krampus in Berchtesgaden" (David Campbell, 2013, CC BY 3.0, Vimeo license review 2019) cut 19.0 s + 4.5 s on the
  Krampuslauf line (Buttnmandl straw figures), "Felberturmmuseum - Mittersill 042" (WOKRIE, CC BY-SA 4.0, camera EXIF)
  and "Poertschach Krampuslauf 30112012 544" (Johann Jaritz, CC BY-SA 3.0 AT, camera EXIF) in the thumbnail; clip is
  gitignored (source URL in `sources`). Facts re-checked 2026-10-31: Wikipedia "Krampus" (night of 5 Dec with St
  Nicholas; rods, chains, long tongue, basket; not attested before the 16th c.; Krampuslauf); Time 7 Dec 1953 "Austria:
  Throw Out Krampus" read directly. Fact changes: line 9 "Austria repartía folletos" -> "En 1953, la revista Time contó
  que el jefe de los nidos de Viena advertía: «El Krampus es un hombre malo»" (Time names Dr. Ernst Kotbauer, Vienna's
  head of kindergarten education, not the government); "como en Múnich" -> "como este en Baviera" (the clip is from
  Berchtesgaden); "aparece escrito desde el siglo dieciséis" -> "hay registros desde el siglo dieciséis". Checks:
  snapshots (credits visible after lowering the mitre, clip frame shows the parade), `hyperframes check` passed, verify
  sheet looked at, ffprobe 47.609 s 1080x1920 30 fps, report -14.9 LUFS no black, cover ok, thumbnail ok (headline
  covers Tito, known). Enqueued: job d6241ce8, Pending, 2026-11-01 11:30 Peru. RED/GREEN not applicable (visual
  pipeline, no test runner). Commit 70a04d3.

## Next step
- Owner: decide push / PR for `feat/episodes-023-026` (unpushed).
- Follow-up: three-character 16:9 thumbnails — the headline covers Tito (`compositions/thumbnail.html`).
- 030 and 031 are WaitingForQuota; the publisher retries by itself (check `publisher/cubitos-publisher.cmd list`).

