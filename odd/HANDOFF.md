# Handoff — current state (overwrite this file; history lives in git)

Last update: 2026-10-31 ~11:45 Peru. Read this first after `/clear`, then `AGENT_GUIDE.md` and the feature docs named below.

## Channel / queue
- Publisher service `CubitosPublisher` INSTALLED and running (delayed-auto start, auto-restart, waits for the upload
  limit and retries). Check with `publisher/cubitos-publisher.cmd list`.
- Queue (publisher `list`, 2026-10-31 ~11:40 Peru): 023 + 025 Published; 019 Kept (old had >= 100 views);
  021 2026-10-31 13:00, 020 18:00, 022 19:00 Scheduled; 026 2026-11-01 18:00 and 024 2026-11-02 12:00 Scheduled.
- Episodes 027–032 (Peru times):
  - 027 top-peliculas-terror: 2026-10-31 19:00, Scheduled `s8MRJgKMMi4` (job 04439c94)
  - 028 casas-halloween-2026: 2026-10-31 20:00, Scheduled `WH1v9dcQ1t8` (job 33ef407b)
  - 029 que-mito-pesa-mas: 2026-10-31 21:00, Scheduled `v84iQDY-UVU` (job 5c54e1d3)
  - 030 ofrenda-peru-vs-mexico: 2026-11-01 09:00, WaitingForQuota, retry 2026-10-31 11:53 (job 284dfa73)
  - 031 latinoamerica-celebra-muertos: 2026-11-01 10:30, WaitingForQuota, retry 2026-10-31 11:53 (job 6c7a2e3d)
  - 032 krampus: 2026-11-01 11:30, Pending (job d6241ce8)
- YouTube upload limit: ~10–12 uploads per rolling 24 h; the service waits and retries by itself.
- RULE (owner, 2026-10-31): Shorts only, thumbnails are ALWAYS the 9:16 cover, never 16:9 (commit d3d9e86;
  make-episode copies the cover as `<id>-thumbnail.png`). Don't spend tokens on 16:9 thumbnail layouts.
- PENDING: 027/028/029 were uploaded with the old 16:9 thumbnail. Replacing them hit YouTube's
  "uploaded too many thumbnails recently" limit. Retry later with
  `node uploader/upload.mjs videos/<NNN-slug> --set-thumbnail <videoId>` (new flag, uncommitted in the dirty
  `uploader/upload.mjs`). 030–032 get the vertical thumbnail on upload.

## Feature `odd/tasks/episodes-027-032.md` (same branch, unpushed) — DONE
- U1 `media` board scene (real photo / <= 5 s clip + credit; clips gitignored, frames cached in
  `assets/media/_frames/`). U3–U6 episodes 027–032 rendered, verified and enqueued (commits 3e3d93e, ae44e80,
  c243113, 08538db, 574924d, 70a04d3).
- New template pieces: locations `sheet_fort`, `suburbio_halloween`, `alpine_village`; costumes `pijama`,
  `puritano`, `nikolaus`; board scenes `titleCard`, `shadowScare`, `houseCard` + icons in `src/board/scenes-v11.js`
  .. `scenes-v15.js`; `equation` accepts `labelSize` / `titleSize`.
- Learnings: a line's `costume` lasts only that line (use episode `costume` + `costumeFrom`, or repeat it); the
  caption pager splits at periods (write 2500, not 2.500); tall hats can hide the board credit line, check it in
  snapshots; Commons filter: check license via the API extmetadata and reject likely copyvio (small file, no camera
  EXIF, dated after the event); Commons rate-limits fast downloads (HTTP 429), space requests a few seconds apart.

## Feature `odd/tasks/episodes-023-026.md` (branch `feat/episodes-023-026`, unpushed)
- T1 cinematic look (`hf-template/src/look.js`, per-episode `"look"` override), T2–T5 episodes 023–026 done and
  verified, make-episode prepends the cover automatically. T6 docs done.
- Known: three-character 16:9 thumbnails — the headline covers Tito (fix in `compositions/thumbnail.html`).
- Native review (gentle-ai RDD) unavailable on this repo: preflight blocks on `intended_untracked_selection_required`.

## Feature `odd/tasks/channel-stats-page.md` (same branch)
- WPF Desktop + Dashboard.Core removed. `export-stats` CLI + service hook write `site/data/channel-stats.json`
  every stats pass; section "Estadísticas del canal" at the end of `site/index.html`. 163 tests green.
- Service reinstalled with the new build (privacy recorded; private `VPAJvfUvI1s` excluded). Page LIVE at
  https://pedrotoledoluis.github.io/ (Pages repo `pedrotoledoluis.github.io`, branch master, commit 6359a2e).
- S4 (commit 7db3723): `publisher/scripts/sync-pages.ps1` (+ `-DryRun`) and `install-pages-sync.ps1` (per-user
  hourly task `CubitosPagesSync`). PENDING owner: run the installer (agent was blocked from registering persistence).
  Log: `%LOCALAPPDATA%\Cubitos\pages-sync.log`.

## Branch notes
- `feat/episodes-023-026` was cut from `feat/publisher-service` (unpushed). Commit ddad850 on the publisher branch
  still contains 3 stray staged moves (HEAD builds); fix only with owner OK.
- Dirty tree not ours: `uploader/*`, `videos/0xx` line endings, regenerated `hf-template/index.html`,
  `src/episode-data.js`, `.hyperframes/*.json`.

## Ideas parked
- Coaster prototype (scratch, may be wiped) and Kling free tier with owner login.
- Weekly "5 noticias más raras" format if 025 performs.

## Owner preferences
- Spanish replies with voseo, short, one question at a time. Save tokens but keep quality.
- Uploads go through the publisher queue; owner OKs. Never read/print `secrets/`.
