# Handoff — current state (overwrite this file; history lives in git)

Last update: 2026-10-30 ~22:30 Peru. Read this first after `/clear`, then `AGENT_GUIDE.md` and the feature docs named below.

## Channel / queue
- Publisher service `CubitosPublisher` INSTALLED and running (delayed-auto start, auto-restart, waits for the upload
  limit and retries). Check with `publisher/cubitos-publisher.cmd list`.
- Queue: 023 guaguas + 025 noticias ASAP; 019–022 cover replacements 2026-10-31 (019 Kept, old had >= 100 views);
  026 papacóptero 2026-11-01 18:00; 024 San Martín 2026-11-02 12:00 (Peru). Upload limit hit on 2026-10-30;
  retry ~2026-10-31 06:56.
- YouTube upload limit: ~10–12 uploads per rolling 24 h. Queue has 8 items, so they spread over ~2 days.

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
