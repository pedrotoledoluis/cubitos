# Historia en Cubitos — Production rulebook

The authoritative guide for producing episodes. Follow it as written; if a rule needs to change, change it here.
Template details: `hf-template/README.md`. Brand: `branding-v2/brand.md`. Characters API: `characters-v2/README.md`.

## 1. Concept and tone

- Spanish YouTube Shorts: **real history told as comedy sketches** by two low-poly box characters.
  Tagline: "La historia real, pero en cubitos". Two episodes per week.
- **Profe Claudio** (cardboard cube, glasses, mustache): deadpan expert, explains absurd facts calmly.
  He **dresses as the historical figure** (costume) and the scene **moves to the place** being told (location).
- **Tito** (small red cube, antenna): curious, reacts the way the audience would, gets the last word.
- **Nova Quark** ("Nova", Tito's cousin; small violet cube, star hair clip): smarter than Tito, friendly-smug,
  asks about theoretical physics and modern science (Tesla, Newton, black holes, quantum...). Sometimes leaves Tito exasperated.
  Episodes may have two (Tito + Profe) or all three characters.
- Humor comes from real facts plus Tito's reactions. Never invent facts; hedge anecdotes.

## 2. Script rules

1. Line 1 is the **hook** and must work in the **first second**: it states the absurd premise itself
   (who did what impossible thing), never a setup or greeting. Usually asked or blurted by Tito; shot `wide`.
   The promise of the hook must be delivered by the video (no clickbait).
2. **9–12 lines** (see rule 7), alternating Tito / Profe. Profe lines ≤ ~18 words; Tito lines 1–7 words.
3. Real facts only. Anecdotal or late sources get a hedge in the line: "Según...", "Dicen que...", "Lo cuenta...".
4. 3–4 Profe lines carry a **board graphic** (`[board: ...]` in drafts). Spread them out.
5. Last line: **punchline by Tito**, usually with `profePose: "facepalm"`. Write it as a **loop ending**: it should
   lead back into line 1 (repeat or answer the hook's words) so the replay feels continuous.
6. Sources go in the description (`sources`), including a note when anecdotes were recorded centuries later.
7. Length: **35–55 s** (about 120–170 spoken words). Real TTS runs ~3–5 s per line, so aim **9–12 lines**; check
   the `timeline:` duration from `build-audio` before rendering (cut lines when over 55 s, add a beat when under 35 s).
8. Modern topics (2026+): research current facts first; frame anything unconfirmed as "lo que se sabe / rumores", never invent numbers; add "no es asesoría financiera" / responsible-gambling / safety notes where relevant. Light Peruvian flavor is welcome for Tito/Nova (causa, pata, chévere, bacán, chamba, ya fue, combi, ceviche, Inca Kola, chifa); Profe stays neutral.
9. Keep the user's text **exactly** when a script is provided. Use `say` (TTS only) to spell numbers/names
   ("1859" → "mil ochocientos cincuenta y nueve", "Joshua" → "Yóshua").
10. Title: 20–40 characters ideally (mobile cuts near 40), **keyword first**, Spanish accents and opening marks
    (¿ ¡), no hashtags.
11. Description (built by `make-episode`): title, the episode's `summary` (1–2 unique sentences: who, what, when,
    where, without repeating the title), `Fuentes:` and **3–5 topic hashtags** at the end (one broad, one niche,
    one or two specific; e.g. `#historia #datoscuriosos #caligula`). No fixed channel paragraph (YouTube bans
    repetitive description sentences). Avoid `#viral #trending #fyp #parati`; `#Shorts` is optional and goes last.
12. `tags`: add accentless and common misspelled variants of the key names ("caligula", "tico brahe",
    "cancion criolla"); tags only help with typos.

## 3. Format

| Item | Rule |
| --- | --- |
| Video | 1080x1920, 30 fps, H.264 + AAC, **35–55 s** (Shorts allow up to 3 min; a new channel needs short tests) |
| Pacing | 0.25 s gap between lines (+0.2 s after board lines, +0.3 s before a location change). No dead air. |
| Captions | Top-center block (13%..~30% of height), max 3 lines per page, Arial Black with black stroke, **colored by speaker**: Profe cream `#fff3d6`, Tito yellow `#ffd23a`, Nova light violet `#c9b8ff` (`CAPTION_COLOR` in `src/stage.js`). Never over board/sign content. |
| Loudness | Master ~-15 LUFS integrated, true peak -1.5 dB |
| Shots | `wide`, `profe`, `tito`, `board` (auto on board lines); `dutch: true` tilts. Close-ups are near eye level. With Nova: `nova` close-up, two-shots `titoProfe` / `profeNova`, and `wide` becomes the three-shot `wide3`. |

## 4. Characters and voices

| | Profe | Tito |
| --- | --- | --- |
| Voice | Kokoro `em_alex` (via `npx hyperframes tts`), speed 0.95, pitch x0.93, EQ | Windows SAPI "Microsoft Sabina Desktop", rate +1, **episode-1 treatment**: pitch x1.22, tempo 1.05, highpass 80 Hz (user's preferred Tito voice — do not change) |
| Acting | `pose`: `idle explain shrug facepalm wave` (on his lines); `profePose` while others talk | `emotion`: `neutral surprised happy skeptical scared` (his lines); `titoEmotion` while others talk |

**Nova** (`speaker: "nova"`): voice Kokoro `ef_dora`, speed 1.08, pitch x1.05, EQ (bright and quick, clearly
different from Tito). Emotions: `neutral curious smug happy surprised explaining` (`emotion` on her lines, default
`explaining`: raises one arm with the index finger up; `novaEmotion` while others talk). Look: violet `#7b5cd6` cube,
a bit taller/slimmer than Tito, two blocky dark-violet pigtail buns, glowing cyan star hair clip, big eyes with lashes,
brows (smug = one raised brow + half-lidded eyes + smirk), tiny arms. Model: `src/characters/nova.js` (`createNova()`).
Staging: Tito left, Profe center-right, Nova far right (x 2.45). Nova is only built when an episode has Nova lines.
Script rule with Nova: the hook may be asked by Nova; Tito still gets the last word.

Board lines default Profe to `explain` (points at the board with a shortened pointer that stops under the board).
Listeners look at the speaker (the speaker looks at whoever spoke before); on board lines everyone looks at the board.

## 5. Costumes (Profe)

Episode field `costume` (preset) + `costumeFrom` (1-based line where it appears; default 1). A line's `costume`
overrides only that line. When the costume changes, a **poof** cloud + pop SFX plays 0.45 s into the line
(`costumePoofAt` to change; `"poof": false` on a line to switch silently). Glasses and mustache always stay.

| Preset | Look |
| --- | --- |
| `napoleon` | black bicorne with gold edge and tricolor cockade, gold epaulettes, blue coat sides |
| `greek` | white chiton hem + himation drape, laurel wreath, grey philosopher beard (mouth visible). Prop: `profeProp: "lamp"` (oil lamp in his free hand) |
| `norton` | navy military coat with gold buttons and epaulettes, tall hat with gold band and plume, saber |
| `roman` | red cloak with gold clasps, bronze armor band, laurel |
| `medieval` | steel kettle helmet with small yellow/blue plume, quartered Modena yellow/blue tabard with coat-of-arms shields on both sides, small sword |
| `tycho` | Renaissance black doublet with puffed shoulders and gold buttons, big white pleated ruff, shiny brass nose block over the nose |
| `nasa` | 1999 flight controller: white short-sleeve shirt, thin black tie, ID badge, headset with boom mic |
| `einstein` | wild white blocky hair tufts on top and sides, grey cardigan (mustache stays: the joke works) |
| `croupier` | casino dealer: translucent green visor, red vest with gold buttons |
| `hacker` | dark hoodie with folded hood and drawstrings, gold coin pin (crypto / tech) |
| `druid` | brown hooded Celtic cloak (face open), oak-leaf crown, mistletoe pin (Samhain) |
| `fisherman` | Peruvian fisherman: wide yellow rain hat, orange life vest with reflective strips |
| `none` | plain Profe (bowtie) |

**Add one:** in `hf-template/src/costumes.js` write a builder using bevelled `box()` pieces in Profe's body space
(see the header comment for measurements), keep the face area clear, register it in `COSTUMES`, then snapshot
it in close-up and wide.

## 6. Locations

Episode field `locations` (presets used, first = start) and per-line `location` (sticky until changed).
On a change: brand-yellow **wipe** + whoosh SFX, then the camera **flies in** through the new place.
Tito and Profe keep their marks, so they "follow" into every location.

| Preset | Content | Board surface |
| --- | --- | --- |
| `office` | night office, city skyline window, desk lamp (breathing glow) | green chalkboard |
| `athens` | agora by day: temple with pediment, stoa with swaying banners, market stalls with swaying awnings, olive tree, big clay jar (tinaja), walking chicken, pecking pigeon | wooden notice board |
| `sanfrancisco1870` | dusk street: Victorian facades stepping up the hill, flickering gas lamps, newspaper stand, waving flag, pigeon, bay with ships in the distance | "¡EXTRA!" newspaper billboard |
| `medieval_italy` | stone piazza by day: brick towers (one like Modena's Ghirlandina with white belfry and spire), arcaded houses, stone well with a wooden bucket swinging on its rope, swaying yellow/blue banners, walking pigeon | parchment banner on a wooden stand |
| `mission_control` | 1999 NASA control room: two tiers of consoles with glowing green monitors and blinking lights, side wall screens with Mars and an orbit line | big wall screen (`screen` style) |
| `space_blackhole` | deep space: star field + nebula, black hole with rotating orange accretion disk and lensing ring, drifting cube asteroids; characters stand on a cube-built space deck with glowing edge strips | holographic panel (`holo` style) |
| `uraniborg` | Hven island at night: Renaissance castle-observatory with copper onion domes and lit windows, twinkling stars, moon, sea, big brass quadrant with a moving sighting arm, flickering lanterns, low-poly moose (sways; tipsy stagger every ~9 s) | star-chart easel |

Modern locations (`src/locations/modern.js`, one small `makeLocation()` factory: painted panorama + floor + framed board + animated props):

| Preset | Content | Board surface |
| --- | --- | --- |
| `casino` | slot-machine wall, roulette table with spinning wheel, chip stacks, slot machine with color-cycling reel, blinking marquee lights | `screen` |
| `trading_floor` | wall of price-chart screens, scrolling 3D ticker tape, trading desks with green/red monitors, spinning gold coin (stock exchange / crypto) | `screen` |
| `data_center` | server racks with blinking LEDs, rotating GPU chip with HBM stacks on a pedestal, cyan glow | `holo` |
| `game_studio` | pixel-art posters, dev desks with color-cycling screens, bouncing pixel heart, spinning pixel coin | `screen` |
| `peru_coast` | Lima's Costa Verde by day: cliffs, sea, moving waves, caballito de totora, beach umbrella, flying seagull | `wood` |
| `celtic_night` | night hills with standing stones, flickering bonfire, glowing carved turnip | `wood` |
| `lima_night` | Lima street at night (reportage): lit buildings and colonial balcony, neon BAR/PEÑA/PIZZAS signs, flickering neon frames, street lamps, passing combi, pumpkin, pink/cyan light | `poster` |

Tito reporter mic: `"titoProp": "mic"` at episode level (all lines + thumbnail) or per line; the mic stays upright in his right hand.

Line `props: ["pluckedChicken"]` shows a world prop on those lines (pops in on the first). Props live in `PROPS` in `src/stage.js`.

**Add a location:** copy `src/locations/athens.js` to `src/locations/<name>.js`; keep the board surface at
`BOARD` (use `boardScreen()`), keep x -2.2..1.9 / z -0.6..0.9 clear for the characters, put lights inside the
location group, give it 2–3 time-driven animated props (`update(t)`, deterministic, no `Math.random`), pick a
`boardStyle` (`chalk | wood | poster`), register it in `src/locations/index.js`. Snapshot wide, board and both close-ups.

## 7. Board scenes (2D graphics)

`board: { "scene": name, ...params }` on a Profe line. Library in `src/board/scenes.js` and `scenes-v2.js`:
`mapPin route counter equation stage questionCrowd scroll treatyMap swarm carriage` and
`mapPin2` (maps `greece usa italy denmark`), `labelled`, `lampSearch`, `newspaper`, `decree`, `banknote`, `bridge`,
and (`scenes-v3.js`) `showcase` (`icon scale sparkle case plaque title`: big icon, sparkles, museum case), `mapRivals`
(`map pins[{x,y,label,labelDx}] icon title`: pins with angry faces), `versus` (`left/right {value,label,color} icon title`: two armies counting up),
and (`scenes-v4.js`, science) `marsRoute` (`title from to`), `twoTeams` (`left right title`), `bigUnit` (`unit label title`),
`unitMismatch` (`left right title`), `calendar` (`months label`), `lowOrbit` (`low safe`), `blackHole`, `tidal`, `spaghetti`,
`slowClock`, `redFade` (all take `title`),
and (`scenes-v5.js`, modern topics, icons are **emoji** via the system color-emoji font) `bigStat` (`title value label emoji color sub`),
`bars` (`title items[{label,value,color,display,emoji}] max unit`), `emojiRow` (`title items[{emoji,label,cross,color}] arrows bottom`),
`ticker` (`title points[] emoji label`), `roulette` (`title label`), `emojiVs` (`title left right bottom`), `priceUp` (`title emoji from to label`).
`equation` items: icon names, operators `+ = → vs`, or `{ icon, cross, label, scale, count }`.
Icons: `rabbit person dancer doctor soldier human carrot napoleon shell chest note musician jar bowl hands legs
feather pluckedChicken lamp crown capitol norton angry bucket swords formula star nose noseBroken metalNose island moose
beer stairs`. All icons are drawn at 1.15x (`ICON_SCALE` in `chalk.js`).

**Add a scene:** a deterministic function `(g, W, H, u, d, params)` on the 1280x886 canvas (dark background is
drawn for you; use light chalk colors), register it in `SCENES`. Titles go at the top or bottom edge; the
board shot keeps the whole board below the caption block.

## 8. Thumbnail (1280x720)

Auto-rendered from `compositions/thumbnail.html` (v2, "epic"): `thumbnailText` headline (≤ ~6 words, uppercase,
yellow with a thick ink stroke and hard drop shadow; the one key word in `*stars*` sits in a red tilted box) in the
**left ~60%** over a dark gradient; behind the characters a yellow **sunburst** with rim glow and a vignette; on the
right the **costumed Profe**, big (`thumbnailPose`, default shrug) and a **reacting Tito** (`thumbnailTitoEmotion`,
default surprised; plus a **smug Nova** in three-character episodes), in `thumbnailLocation` (default: last line's
location); logo badge bottom-left; nothing important bottom-right (YouTube timestamp). Check it at 320x180.

| Field | Meaning |
| --- | --- |
| `thumbnailText` | Headline, ≤ ~6 words; wrap one key word in `*stars*` |
| `thumbnailBadge` | Optional small sticker above the headline, ≤ ~12 chars (e.g. `"31 OCT"`, `"REAL"`, `"1518"`) |
| `thumbnailBoard`, `thumbnailLocation`, `thumbnailPose`, `thumbnailProp`, `thumbnailTitoEmotion` | Optional scene overrides |

## 9. Folder layout

```
historia-en-cubitos/
  PRODUCTION.md              this file
  hf-template/               the episode template (HyperFrames project)
    episodes/NNN-slug.json   episode sources
    .build/verify/           contact sheets + reports (not deliverables)
  videos/NNN-slug/           one folder per video: NNN-slug.mp4, -thumbnail.png, -description.txt, metadata.json
  uploader/                  upload.mjs, uploaded.json (upload log)
  branding-v2/, characters-v2/
```

## 10. Episode JSON (annotated)

```jsonc
{
  "id": "005-diogenes",                       // NNN-slug, also the output folder name
  "title": "Diógenes: ...",                   // YouTube title (20-40 chars, keyword first)
  "summary": "En el siglo IV a. C., Diógenes ...", // 1-2 unique sentences for the description
  "thumbnailText": "¡HUMILLÓ A PLATÓN CON UN *POLLO*!",
  "thumbnailBadge": "REAL",                    // optional sticker on the thumbnail
  "thumbnailBoard": { "scene": "labelled", "icon": "pluckedChicken", "label": "HOMBRE" }, // optional
  "thumbnailLocation": "athens", "thumbnailPose": "shrug",                                // optional
  "costume": "greek", "costumeFrom": 2,       // Profe's costume, poof on line 2
  "locations": ["office", "athens"],          // first = starting location
  "sources": ["https://...", "Diógenes Laercio, ... (anécdotas recogidas siglos después)"],
  "hashtags": ["#historia", "#filosofia", "#diogenes"],  // 3-5 topic hashtags, end of description
  "tags": ["historia", "diogenes", "diojenes"], // extra YouTube tags: accentless / misspelled variants
  "lines": [
    { "speaker": "tito", "text": "¿Hubo un filósofo...?", "shot": "wide", "emotion": "surprised" },
    { "speaker": "profe", "location": "athens",          // switch location here (wipe + fly-in)
      "text": "Diógenes de Sinope. ...", "say": "optional TTS text",
      "board": { "scene": "mapPin2", "map": "greece", "pin": [610, 430], "label": "ATENAS", "icon": "jar" },
      "titoEmotion": "surprised", "sfx": [["pop", 1.0]] },
    { "speaker": "profe", "text": "...", "props": ["pluckedChicken"], "profeProp": "lamp", "pose": "wave" },
    { "speaker": "tito", "text": "Punchline.", "emotion": "happy", "profePose": "facepalm" }
  ]
}
```

SFX names: `pop whoosh boing squeak hooves fiddle wave ding` + bundled HyperFrames SFX. Location changes add a
whoosh and costume changes a pop automatically.

## 11. Workflow

```bash
cd hf-template
# 1. write episodes/NNN-slug.json (rules above)
# 2. optional fast look before the long render:
node scripts/build-audio.mjs episodes/NNN-slug.json
npx hyperframes@0.8.214 snapshot --at 1,5,9      # PNGs in snapshots/, check, then delete
# 3. full episode (~20-30 min render):
node scripts/make-episode.mjs episodes/NNN-slug.json
# 4. verify (section 12), fix, re-run (voices are cached; --skip-render only rewrites deliverables)
```

## 12. Verification checklist (every episode, before publishing)

- [ ] `.build/verify/<id>-sheet.jpg` (one frame per line): heads fully in frame, mouths moving on the speaker,
      captions never over board/sign content, costume readable, location recognizable.
- [ ] `.build/verify/<id>-transition-N.jpg`: wipe covers the cut, fly-in lands cleanly, poof hides the costume swap.
- [ ] `<id>-report.json`: duration 35–55 s, video 1080x1920 h264 30 fps, audio aac, LUFS ≈ -15, no black segments.
- [ ] Thumbnail: headline in the left ~60%, costumed Profe + reacting Tito on the right, readable at 320x180.
- [ ] Description: title, unique `summary`, sources (with hedge notes), 3–5 topic hashtags; no channel paragraph.
- [ ] Hook works muted in the first second; last line loops back into line 1.

## 13. Process hygiene

Use timeouts on every long command. `make-episode` stops leftovers after each step; after any manual
render/snapshot/TTS run `node scripts/processes.mjs` (lists) and `node scripts/processes.mjs --kill`. Only
pipeline processes are touched (project paths, hyperframes render/check/snapshot/tts, kokoro, tts.ps1,
headless puppeteer browsers) — never the user's Chrome, VS Code, Teams or Claude. Report the final leftover check.

## 14. Publishing

```bash
node uploader/upload.mjs videos/NNN-slug --publish-at 2026-11-03T18:00:00-05:00
```

Uploads private/scheduled with the thumbnail, logs to `uploader/uploaded.json`, refuses duplicates (`--force` to override).

- Schedule: **Tuesday and Friday**.
- Auto-publish only episodes made **after the user OK'd the template's quality**. When in doubt, render and ask
  the user before uploading. Never upload from an exploratory session.
