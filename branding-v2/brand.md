# Historia en Cubitos — Brand guide (v2)

Spanish YouTube Shorts: real history told as comedy sketches by blocky low-poly characters.
Tagline: **"La historia real, pero en cubitos"**.

## Palette

| Role | Hex |
| --- | --- |
| Night sky (top) | `#0b1230` |
| Dusk blue | `#1d2a5a` |
| Haze purple | `#3a3a6a` |
| Rooftop | `#2a2148` |
| Ink / outlines | `#0a0a14` |
| Tito red | `#e0402f` (dark `#8e1f18`) |
| Nova violet | `#7b5cd6` (dark `#4a3390`), star clip cyan `#7ef0ff` |
| Profe cardboard brown | `#9a6236` (dark `#5b3a1f`) |
| Antenna / headline yellow | `#ffd23a` |
| Teal accent (bowtie, tile) | `#1f8a8a` |
| Window light | `#ffd27a`, cool `#bfe3ff` |
| Moon / cream | `#f4efd2` |
| Rim light | `#9fc0ff` |

## Fonts (system, no downloads)

- Logo and thumbnail headlines: **Arial Black** (fallback Segoe UI Black), uppercase, thick ink outline + hard drop shadow.
- Tagline / labels: **Bahnschrift** Bold.
- Logotype: "HISTORIA EN" in white extruded type over seven tilted cube tiles spelling "CUBITOS", cycling red / yellow / brown / teal.

## Characters

- **Profe Claudio** — big cardboard-brown cube, square black glasses, blocky drooping mustache, teal bowtie,
  chalk smudge, pointer stick. Deadpan expert; explains absurd facts calmly. Poses: idle, explain, shrug, facepalm.
- **Tito** — small tomato-red cube, huge eyes, hair tuft, antenna with a glowing yellow tip. Curious, reactive,
  asks the questions the audience thinks. Emotions: neutral, surprised, happy, skeptical, scared.
- **Nova Quark ("Nova")** — Tito's cousin. Violet `#7b5cd6` cube (dark `#4a3390`), slightly taller and slimmer than
  Tito, two blocky pigtail buns (`#2e1f5e`), glowing cyan `#7ef0ff` star hair clip, big eyes with lashes, expressive brows.
  Smarter than Tito and a little smug (friendly); asks about physics and modern science. Emotions: neutral, curious,
  smug, happy, surprised, explaining. Voice: Kokoro `ef_dora`, bright and quick.
- All: flat-shaded, slightly bevelled boxes, soft cool rim light, blink, look-at, discrete mouth shapes.

## Thumbnails (`thumbnail-template.html`)

URL params: `text` (wrap a word in `*stars*` to make it white), `who` (`tito`|`profe`), `emotion` / `pose`.

1. Max ~6 words, uppercase, yellow `#ffd23a` with an ink outline; one key word in white.
2. Text in the left 60%; one big character reaction on the right, facing the text.
3. Dark left gradient behind text; yellow ray burst behind the character.
4. Logo badge bottom-left, small. Nothing important in the bottom-right (YouTube timestamp).
5. Check at 320x180: the headline and the character's face must still read.

## Assets

`avatar.png` (800, key content inside the central circle), `banner.png` (2560x1440, text inside the
1546x423 safe area), `logo.png` (transparent), `watermark.png` (150, transparent),
`thumbnail-example.png`. Re-render: `node branding-v2/render.mjs [name ...]`.
