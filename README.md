# Historia en Cubitos — Shorts pipeline

Renders animated 3D low-poly YouTube Shorts (1080x1920, 30 fps) from a JSON episode file.
Everything runs locally: Windows SAPI for voices, ffmpeg for audio/encoding, Three.js in headless Chromium (puppeteer) for frames.

## Requirements

- Windows with the SAPI voice "Microsoft Sabina Desktop" (es-MX)
- Node 18+ and ffmpeg/ffprobe on PATH
- A Chromium browser: puppeteer's bundled Chrome, or system Chrome/Edge (auto-detected), or set `CHROME_PATH`

```bash
npm install
```

## Workflow

1. Write `episodes/NNN-slug.json`:

```json
{
  "id": "002-slug",
  "title": "Video title",
  "thumbnailText": "BIG THUMBNAIL TEXT",
  "guest": "emu",
  "lines": [
    { "speaker": "tito", "text": "Question?", "emotion": "surprised" },
    { "speaker": "profe", "text": "Deadpan answer.", "shot": "wide" }
  ],
  "sources": ["https://..."],
  "hashtags": ["#extra"]
}
```

- `speaker`: `profe` | `tito`
- `shot` (optional): `profe` | `tito` | `wide` | `guest` (default: wide for line 1, otherwise close-up of the speaker)
- `emotion` (optional): `surprised` | `happy`
- `guest` (optional): a prop module key from `GUESTS` in `src/main.js` (currently `emu`); the `guest` shot frames it.

2. Preview one still per line (fast, ~15 s): `npm run stills -- episodes/NNN-slug.json` → `build/<id>/stills/`
3. Render: `npm run render -- episodes/NNN-slug.json` (add `--thumbnail-only` to redo just the thumbnail)

Outputs in `out/`: `<id>.mp4`, `<id>-thumbnail.png` (1280x720), `<id>-description.txt`.

Branding (avatar 800x800, banner 2560x1440): `npm run branding` → `branding/`.

## How it works

| Step | Where |
| --- | --- |
| SAPI TTS, one WAV per line (cached by text hash) | `scripts/tts.ps1` |
| Voice FX (trim silence, pitch via `asetrate`+`atempo`, loudnorm) | `VOICES` in `scripts/render.mjs` |
| Timeline from measured WAV durations + gaps; per-frame RMS mouth envelopes | `buildTimeline` |
| Synthesized soft pluck music loop (ffmpeg `aevalsrc`), mixed quietly | `makeMusic` |
| Deterministic frames: `stage.renderAt(t)` then screenshot, piped to x264 | `scripts/lib.mjs`, `src/main.js` |
| Characters / guest props | `src/characters/*.js` |
| Office set + lighting | `src/set.js` |
| Captions (HTML overlay) | `src/index.html` |

All animation is a pure function of `t`, so re-rendering gives identical frames.

## Known limitations

- Rendering uses software WebGL (SwiftShader): roughly 0.4–0.6 s per frame.
- Mouth sync is amplitude-based, not phoneme-based.
- Only one Spanish SAPI voice exists; characters are differentiated by pitch/tempo only.
