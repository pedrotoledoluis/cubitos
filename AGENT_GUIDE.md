# Historia en Cubitos — Agent guide

Read this first. It explains what this project is, how the owner wants you to behave, how to set up a new PC,
and how to make and publish an episode step by step. It assumes **no special tools**: only a terminal,
a text editor and the commands below.

Reading order: this file → `PRODUCTION.md` (the rulebook, authoritative for content) → `hf-template/README.md`
(template details) → one finished episode JSON (`hf-template/episodes/010-agujeros-negros.json` is a good example
with all three characters).

---

## 1. What the project is

- YouTube channel **Historia en Cubitos** (`@HistoriaEnCubitos`, channel ID `UCPymQjNXfUgWwTrX-ETRM0w`).
  Formerly "Baul de Manhwas".
- Spanish vertical **Shorts, 35–55 s** (since ep 019; older episodes are 60–90 s), comedy sketches that explain real history, science and current topics.
- Low-poly box characters rendered with **Three.js inside HyperFrames** (HTML → MP4, deterministic, GPU).
- Cast:
  - **Profe Claudio** — cardboard cube, glasses, mustache. Calm, deadpan expert. Wears a **costume** of the
    figure he talks about; the **location** changes to where the story happens.
  - **Tito** — small red cube with antenna. Naive, asks the hook, gets the last word (punchline).
  - **Nova Quark ("Nova")** — Tito's cousin, violet cube with star clip. Smarter than Tito, a bit smug,
    asks about modern/theoretical physics and current tech. Sometimes exasperates Tito.
- Output per episode lives in `videos/NNN-slug/`: `NNN-slug.mp4`, `NNN-slug-thumbnail.png`,
  `NNN-slug-description.txt`, `metadata.json` (title, description, tags used by the uploader).
- RULE: Shorts-only channel. The thumbnail is always the 9:16 cover (1080x1920, `compositions/cover.html`);
  never render or deliver 16:9 thumbnails. If something can't be done vertically, ask the owner.

## 2. How to behave with the owner

- **Reply in Spanish (Rioplatense voseo: "vos", "dale", "listo")**, short and direct. Code, comments and docs in English.
- Ask **at most one question at a time**, then wait. Do not present long option menus.
- The owner delegated creative decisions: pick topics, jokes, costumes and locations yourself.
- **When the owner gives only a time ("a las 12:00"), it means TODAY.** Schedule it directly; do not ask
  "today or tomorrow?". If they say "mañana", use tomorrow's date.
- Do what was asked, then report: what is done, links, and real problems. Never claim something worked
  without checking it (look at the output, the frame sheet, `list-status`).
- **Never** paste or read aloud the contents of `secrets/`. Never commit `secrets/`.
- Never add "Co-Authored-By" or AI attribution to commits. Use conventional commits (`feat: ...`, `fix: ...`).
- **No hung processes.** After any render/TTS, run the leftover check (section 7).
- Run renders **one at a time**. Two renders in parallel break each other (the process cleanup of one kills
  the TTS of the other) and can exhaust RAM.
- Tito's voice is fixed (episode-1 voice). Do not change voices without being asked.
- Content quality the owner asked for: crazy/funny real stories, **better jokes** (real punchlines, callbacks,
  running gags, Tito/Nova banter), more **current topics**, and a light **Peruvian flavor** for Tito/Nova
  (causa, pata, chévere, bacán, chamba, al toque, ya fue, combi, ceviche, Inca Kola, chifa, Miraflores, Barranco).
  Profe stays neutral. Do not overdo it.

## 3. Setting up a new PC (Windows)

Install:

1. **Node.js 20+** (`node -v`).
2. **ffmpeg** on PATH (`ffmpeg -version`). E.g. `winget install Gyan.FFmpeg`.
3. **Python 3.10+** with `pip install kokoro-onnx soundfile` (Profe and Nova voices; `npx hyperframes tts`
   downloads the Kokoro model the first time).
4. **Windows Spanish voice "Microsoft Sabina Desktop"** (Tito). Settings → Time & language → Speech →
   add Spanish (Mexico). Check: `powershell -c "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices().VoiceInfo.Name"`.
5. **Google Chrome** (HyperFrames uses a headless browser; the first `npx hyperframes` run downloads what it needs).
6. Git, then `git clone https://github.com/pedrotoledoluis/cubitos.git historia-en-cubitos`.
7. `cd historia-en-cubitos/uploader && npm install` (googleapis). The root `npm install` is only for the old
   pre-HyperFrames pipeline and is optional.

Files that are **not in git** and must be copied by hand from the old PC:

| Copy | Why |
| --- | --- |
| `secrets/client_secret.json` | Google OAuth client for the uploader (required to publish). |
| `secrets/token.json` | Saved login. If missing, run `node uploader/upload.mjs --auth` and log in with the channel account in the browser. |
| `uploader/uploaded.json` | Log of what is already on YouTube (video IDs). Prevents duplicate uploads. |
| `videos/**/*.mp4` | Final videos (optional, they are on YouTube; needed for 013–018 which are **not uploaded yet**). |
| `hf-template/.build/audio/` | Optional voice cache; saves TTS time on re-renders. |

Everything else (code, episode JSONs, branding, docs, thumbnails, descriptions) is in git.

Smoke test after setup:

```bash
cd hf-template
node scripts/build-audio.mjs episodes/010-agujeros-negros.json   # voices + timeline, no video
node scripts/processes.mjs                                       # should list nothing
```

## 4. Folder map

| Path | What |
| --- | --- |
| `PRODUCTION.md` | **Rulebook**: script rules, voices, costumes, locations, board scenes, thumbnails, checklist. |
| `hf-template/` | The production template. All episode work happens here. |
| `hf-template/episodes/NNN-slug.json` | One file per episode = the script + acting + staging. |
| `hf-template/scripts/make-episode.mjs` | The one command: audio → check → render → thumbnail → description → copy to `videos/`. |
| `hf-template/scripts/build-audio.mjs` | Voices + music + timeline (fast preview of duration). |
| `hf-template/scripts/processes.mjs` | Leftover process check/kill. |
| `hf-template/src/costumes.js` | Profe costumes. |
| `hf-template/src/locations/` | Sets (office, athens, casino, lima_night, …). |
| `hf-template/src/board/` | 2D animated board graphics. |
| `hf-template/src/characters/` | Profe, Tito, Nova models. |
| `videos/NNN-slug/` | Deliverables per episode. |
| `uploader/` | YouTube upload / scheduling scripts. |
| `branding-v2/` | Logo, avatar, banner, watermark, thumbnail template, `brand.md`. |
| `site/` | Homepage + privacy policy hosted on GitHub Pages (required by Google OAuth). |

## 5. Making an episode (step by step)

1. **Pick the topic.** Real facts only. For current topics (news, companies, prices, weather) search the web
   first and write down sources. Anything unconfirmed is framed as "lo que se sabe" / "dicen que". Never
   invent numbers. Add "no es asesoría financiera" / responsible-gambling notes where relevant.
2. **Copy an existing episode JSON** to `hf-template/episodes/NNN-slug.json` (next free number) and edit it.
   Follow `PRODUCTION.md` §2 and §10. Key rules:
   - Line 1: hook that states the absurd premise in the first second (Tito or Nova), shot `wide` (`wide3` with Nova).
   - **9–12 lines** → lands in 35–55 s. Profe lines ≤ ~18 words, Tito lines 1–7 words.
   - 3–4 Profe lines with a board graphic, spread out.
   - Last line: Tito's punchline, Profe `facepalm`, worded so it loops back into line 1.
   - Fill `summary` (1–2 unique sentences), 3–5 topic hashtags, `thumbnailBadge` when there is a date hook.
   - Use `say` to spell numbers and hard names for the TTS ("1859" → "mil ochocientos cincuenta y nueve").
   - Choose `costume` and `location` per scene from `PRODUCTION.md` §5–6.
   - Fill title, description, sources, tags, `thumbnailText`.
3. **Check duration fast**: `node scripts/build-audio.mjs episodes/NNN-slug.json` → read the `timeline:` total.
   Over 55 s → cut lines; under 35 s → add a joke.
4. **Render**: `node scripts/make-episode.mjs episodes/NNN-slug.json` (~2 min on a GPU PC, up to 30 min on slow ones).
   Only one at a time.
5. **Verify** (`PRODUCTION.md` §12): open `.build/verify/NNN-slug-sheet.jpg` and the transition images.
   Heads inside the frame, captions never over the board, costume/location readable, thumbnail headline
   readable. Open `NNN-slug-report.json`: 35–55 s, 1080x1920, 30 fps, ~-15 LUFS, no black segments.
6. Fix and re-run if needed (voices are cached, so re-runs are faster).
7. **Leftover check**: `node scripts/processes.mjs` then `--kill` if anything is listed.

## 6. Publishing to YouTube

Run from the project root:

```bash
# upload private + scheduled, with thumbnail (time is Peru, -05:00)
node uploader/upload.mjs videos/NNN-slug --publish-at 2026-10-31T09:00:00-05:00

# publish now / reschedule an already uploaded video
node uploader/set-status.mjs <videoId> now
node uploader/set-status.mjs <videoId> 2026-10-31T15:00:00-05:00

# confirm status, publishAt, thumbnail
node uploader/list-status.mjs <videoId> <videoId> ...
```

Facts learned the hard way:

- Timezone is **Peru, UTC-05:00**. Always write the offset.
- `upload.mjs` refuses to upload the same folder twice (uses `uploader/uploaded.json`); `--force` overrides.
- **Daily upload limit**: after ~10 API uploads in 24 h YouTube answers
  "The user has exceeded the number of videos they may upload". Stop, wait ~24 h, then continue.
  Plan big batches across days, or upload by hand in YouTube Studio.
- `videos.update` replaces the whole status; `set-status.mjs` already re-sends embeddable/publicStatsViewable.
- Right after a change, `list-status` may show old data for a few seconds; check again.
- Thumbnail upload needs the channel to be phone-verified (already done).
- Only upload when the owner has OK'd the quality, or when they explicitly ordered the schedule.

Manual upload in YouTube Studio (fallback): upload the `.mp4`, paste title/description from `metadata.json`
or `-description.txt`, set the thumbnail PNG, "Not made for kids", Schedule with the Peru time.

## 7. Process hygiene and performance

- `node hf-template/scripts/processes.mjs` lists leftover render/TTS processes; `--kill` stops them. It never
  touches the owner's Chrome, editors or chat apps.
- Before each render make sure there are **> 2–3 GB free RAM**; close heavy apps otherwise. A render was once
  killed for low memory.
- If the PC lags, look for many stuck `powershell`/`node`/headless `chrome` processes and kill leftovers.

## 8. Current state (2026-10-30)

| Ep | Slug | Status |
| --- | --- | --- |
| 001–002 | emu, napoleon-conejos | Made, owner chose not to upload. |
| 003–011 | baile-1518 … casas-de-apuestas | Public. |
| 012–018 | ia-cripto … halloween-lima | Uploaded, scheduled through 2026-10-30 (Peru): 012 08:00, 013 09:00, 014 10:30, 017 13:00, 015 15:00, 016 16:30, 018 18:00. |
| 019–022 | cancion-criolla, desfile-james-bond, momias-incas, catrina-burla | New 35–55 s format. Uploaded 2026-10-30, all scheduled 2026-10-30 12:00 Peru (17:00Z): Mn7luaowBwU, Y_NQYVvqhAY, olIqXwWlFMY, lBK8IypZTVY. Replacements with cover queued in the publisher (019 kept: old one had >= 100 views). |
| 023–026 | guaguas-de-pan, san-martin-de-porres, noticias-raras-semana, papacoptero | Made 2026-10-30 with the cinematic look and auto cover. Queued in the publisher service: 023 and 025 ASAP, 026 2026-11-01 18:00, 024 2026-11-02 12:00 (Peru). |
| 027–032 | top-peliculas-terror, casas-halloween-2026, que-mito-pesa-mas, ofrenda-peru-vs-mexico, latinoamerica-celebra-muertos, krampus | Halloween + Día de Muertos batch made 2026-10-31 with real licensed photos/clips on the board (`media` scene). Queued in the publisher: 027 2026-10-31 19:00, 028 20:00, 029 21:00 (scheduled: s8MRJgKMMi4, WH1v9dcQ1t8, v84iQDY-UVU); 030 2026-11-01 09:00, 031 10:30, 032 11:30 (waiting for upload quota) (Peru). |

Uploads now go through the publisher Windows Service (`publisher/cubitos-publisher.cmd enqueue <episodeDir> [--publish-at ...]`,
`list`); it waits for the YouTube upload limit and retries by itself. `make-episode.mjs` prepends the 0.1 s Shorts
cover automatically. The WPF dashboard was removed; channel stats are exported to `site/data/channel-stats.json` and
shown at the end of `site/index.html` (GitHub Pages, pushed manually).

All video IDs are in `uploader/uploaded.json`. Channel on 2026-10-30: 6 subscribers, 321 views; best videos open on
one absurd premise (see `reports/Estrategia de Shorts virales.md` for the research behind the new format).

Known cosmetic issues to fix later: emoji icons on the new boards (`scenes-v5.js`) barely render in headless
Chrome (draw icons with shapes instead); ep13 newspaper headline cut at the sides; Nova looks bluer under the
space lighting; medieval helmet looks like a grey hat.

Unverified facts in current episodes: ep13 Anthropic IPO details come from a Reuters report (S-1, ticker ANT,
valuation) not checked on SEC EDGAR; ep16 uses ENFEN communiqué No. 16-2026 (latest found).

## 9. When something breaks

| Symptom | Fix |
| --- | --- |
| `npx hyperframes` slow the first time | It is downloading; later runs are fast. |
| A voice is missing / TTS error | Check Python + kokoro-onnx (Profe/Nova) or the Sabina voice (Tito). |
| Episode too long | Cut lines; target 16–18. |
| Captions over the board | Shorten the line or change the shot; see `PRODUCTION.md` §3. |
| Upload "exceeded the number of videos" | Daily limit, wait 24 h or use Studio. |
| `invalid_grant` on upload | Delete `secrets/token.json` and run `node uploader/upload.mjs --auth`. |
| PC slow | Leftover processes (section 7). |
