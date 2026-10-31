# Channel stats page — replace the WPF dashboard

## Objective
Drop the WPF desktop dashboard and show a summarized, interactive view of the channel's stats as a section at the
end of the GitHub Pages site (`site/index.html`), fed by a JSON export from the publisher service.

## Problem / why
Owner no longer wants the WPF notch dashboard (2026-10-30). They want something nicer and easier to share: an
interactive HTML on their existing GitHub Pages site.

## Scope (authorized by owner 2026-10-30)
- Remove `publisher/src/Cubitos.Publisher.Desktop` (and its tests/solution entries/docs). Keep or fold
  `Dashboard.Core` only if the export reuses it; otherwise remove it too.
- Publisher exports a public-safe summary JSON (`site/data/channel-stats.json`): channel totals, per-video views
  (title, published date, views, likes if recorded), recent trend, queue summary, generated-at time. No secrets,
  tokens, file paths or private IDs beyond public video IDs.
- Export runs from the CLI (`export-stats`) and automatically after each stats snapshot in the service.
- New section at the end of `site/index.html`: totals, sortable per-video table, simple trend chart, dark/light,
  phone width; loads `data/channel-stats.json`; degrades gracefully if missing.
- Pushing to GitHub Pages is the owner's decision (not automatic).

## Constraints
- Single writer at a time (episode renders run on the same tree).
- .NET 10 tests stay green; add tests for the export.

## Tasks
- [x] S1 Remove WPF Desktop (+ Dashboard.Core if unused). Route: delegated (writer trigger). Commit `e7e6cc5`.
- [x] S2 Stats export (CLI + service hook) with tests. Route: delegated (writer trigger). Commit `e721c6d`.
- [x] S3 Stats section in `site/index.html`. Route: delegated (writer trigger). Commit `42dae4d`.
- [ ] S4 Hourly push of `site/data/channel-stats.json` to the Pages repo (`pedrotoledoluis.github.io`, `master`,
  `data/channel-stats.json`): `publisher/scripts/sync-pages.ps1` + per-user task installer
  `publisher/scripts/install-pages-sync.ps1`. Route: delegated (writer trigger). Scripts written, owner installs
  (stays unchecked until the owner registers the task and the first real push succeeds).

## Progress / evidence
- S1 (`e7e6cc5`): removed `src/Cubitos.Publisher.Desktop`, `src/Cubitos.Publisher.Dashboard.Core` and
  `tests/Cubitos.Publisher.Dashboard.Tests` (Dashboard.Core was used only by Desktop and was WPF-presentation oriented;
  the export reuses Core `HourlyViewsCalculator` directly). Slnx, README and comments updated.
  `dotnet test`: Core 75, Infrastructure 41, Worker 29 passed.
- S2 (`e721c6d`): Core `ChannelStatsBuilder` + `ChannelStatsReport`, port `IChannelStatsWriter`; Infrastructure
  `JsonChannelStatsWriter` (atomic write, Peru-offset times, schema v1); Worker `ChannelStatsExport` use case,
  `export-stats [--out <path>]` CLI, `Publisher:StatsExportPath` (default `site/data/channel-stats.json`, relative to
  RepoRoot). `StatsCycle` exports after each snapshot pass; failures log a warning only. The `videos` table gained a
  nullable `privacy` column (additive migration) recorded from the channel list; only public videos are exported, and
  rows without recorded privacy fall back to queue/upload-log heuristics (replaced-hidden, scheduled, `-old`, future).
  Test-first: RED observed (CS0246 missing `ChannelStatsReport`/`IChannelStatsWriter`, CS0234 missing
  `Infrastructure.Stats`), then GREEN. `dotnet test`: Core 81, Infrastructure 47, Worker 35 passed (163, 0 failed).
  `export-stats` on a scratch copy of the real DB: 21 videos, 1 day, 6 queued; rg for `:\`, `secrets`, `token`, `@`:
  0 matches.
- S3 (`42dae4d`): section "Estadísticas del canal" at the end of `site/index.html` (cards, next releases, hourly/daily
  SVG chart with crosshair tooltip + keyboard, sortable table with `aria-sort`, empty state), JS in
  `site/assets/channel-stats.js`, light/dark tokens via `prefers-color-scheme`. Screenshots (served with
  `python -m http.server`): 1280 light, 1280 dark, 375 dark (no horizontal overflow), 375 empty state.
- S4 (scripts only): `sync-pages.ps1` (clone at `%LOCALAPPDATA%\Cubitos\pages-repo`, fetch + hard reset, copy,
  commit/push only on change, JSON + forbidden-text validation, `-DryRun`, log `%LOCALAPPDATA%\Cubitos\pages-sync.log`)
  and `install-pages-sync.ps1` (task `CubitosPagesSync`, hourly from next full hour, Interactive logon, hidden,
  `-Uninstall`). Both parse with 0 errors; `-DryRun` cloned the Pages repo and reported "WOULD commit and push";
  clone stayed clean at `origin/master` (`6359a2e`), no commit. Task not registered, nothing pushed. No PowerShell
  test runner, so RED/GREEN not applicable.
- Native review: not run by the writer (parent decides under RDD).

## Next step
Owner reinstalls/restarts the service (elevated `publisher/scripts/install-service.ps1`) so it records privacy and
rewrites `site/data/channel-stats.json` every 15 min. For S4 the owner runs `sync-pages.ps1` once for real, then
`install-pages-sync.ps1` to schedule it hourly.
