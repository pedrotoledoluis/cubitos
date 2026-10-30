# Publisher service + dashboard

## Objective
A Windows Service that publishes queued episodes to YouTube on its own (no Claude session needed) and collects view
statistics, plus a .NET MAUI Windows app that shows live stats: ranking, hourly heatmap, queue state, 24 h curves.

## Problem / why
On 2026-10-30 the channel hit YouTube's daily upload limit ("The user has exceeded the number of videos they may
upload") and the re-upload of 019-022 had to move to the next day. The only scheduler was a session-only Claude cron
job that dies when the session closes. Publishing is deterministic and should not depend on an AI session. The owner
also wants to see which videos and which hours get views; YouTube APIs give no hourly or real-time views, so the
service must snapshot counts itself and diff them.

## Scope (authorized by owner 2026-10-30)
- `publisher/` .NET 10 solution, hexagonal layout:
  - `Cubitos.Publisher.Core`: domain (queue items, snapshots, replacement rule, retry/backoff) and ports.
  - `Cubitos.Publisher.Infrastructure`: YouTube adapter (Google.Apis.YouTube.v3, reuses `secrets/client_secret.json`
    and the refresh token in `secrets/token.json`), SQLite store (Microsoft.Data.Sqlite), `uploader/uploaded.json` sync.
  - `Cubitos.Publisher.Worker`: Windows Service (BackgroundService) with a publish loop and a stats loop, plus a CLI
    (`enqueue`, `list`) that Claude uses to add pending videos.
  - `Cubitos.Publisher.Dashboard`: MAUI Windows (unpackaged) app reading the same SQLite DB.
  - `Cubitos.Publisher.Core.Tests`: xUnit tests for domain rules.
- Replacement flow: an item may replace an old video; before upload it checks the old video's views and keeps it
  (item skipped, reported) when views >= a threshold; after the new video is public, the old one is set to private.
- Upload-limit handling: on the limit error, wait and retry later instead of failing.
- Install scripts for the service (`sc.exe`) and a published dashboard exe.

## Constraints
- Never print, log or commit `secrets/`. Token refresh writes back to `secrets/token.json` only.
- Timezone for display and heatmap: Peru (UTC-05:00).
- Quota: uploads ~1600 units, `videos.list` 1 unit; stats poll every 15 min.
- Code/comments/docs in English. Conventional commits, no AI attribution.
- Keep Node uploader working (same `uploaded.json` format).

## Delivery strategy
ask-on-risk. Forecast ~2,500 authored lines (5 projects + tests + scripts). Chain strategy (owner, 2026-10-30): stacked-to-main, one PR per task; the stack base is `feat/epic-format-v2` until that branch merges.

## Tasks
- [x] T1 Core domain + ports + unit tests (queue state machine, replacement rule, upload-limit backoff, hourly delta
      bucketing in Peru time). Route: delegated (writer trigger).
- [x] T2 Infrastructure: SQLite store, YouTube adapter (upload + thumbnail + status + stats + channel video list),
      uploaded.json sync. Route: delegated.
- [x] T3 Worker: Windows Service host, publish loop, stats loop, CLI `enqueue`/`list`, install/uninstall scripts.
      Route: delegated.
- [x] T4 Dashboard MAUI: ranking, hourly heatmap, queue view, per-video 24 h curve, auto-refresh. Route: delegated.
- [x] T6 Dashboard polish (owner feedback 2026-10-30, `ideas/EVIDENCIAS/Screenshot_14.png`): responsive layout without clipping on resize (podium cards, long titles, KPI "Próxima misión"), smooth resize; sidebar becomes a left-edge notch with an animated flaming pumpkin that expands on hover and can be pinned open. Route: delegated.
- [ ] T5 Cut-over: install the service, enqueue the 019-022 replacements (replacing the session cron job so nothing
      uploads twice), update AGENT_GUIDE.md. Route: inline.

## Acceptance
- `dotnet test` green; `dotnet build` of all projects green.
- Service installed and running; `list` shows queued items; stats rows appear every 15 min.
- Dashboard opens and shows ranking, heatmap and queue from real data.

## Progress / evidence
- Branch `feat/publisher-service` created from `feat/epic-format-v2` (d706bf8).
- T1 done (delegated writer): `publisher/Cubitos.Publisher.slnx` with `Cubitos.Publisher.Core` (queue state machine,
  replacement policy, upload-limit and transient backoff, publish planner, Peru-hour stats, ports) and
  `Cubitos.Publisher.Core.Tests`. Test-first: RED observed as compile failure (18 errors), then GREEN.
  - `dotnet build publisher`: success, 0 warnings, 0 errors.
  - `dotnet test publisher`: 64 passed, 0 failed, 0 skipped.
  - Commit 8fa81f2. Native review for T1: UNAVAILABLE (preflight requires `intended_untracked_selection`; every
    submission returned `invalid_request`).
- T2 done (delegated writer): `Cubitos.Publisher.Infrastructure` with `SqliteDatabase` (WAL, `CREATE TABLE IF NOT
  EXISTS` schema: queue_items, snapshots + (video_id, taken_at) index, videos), `SqliteQueueStore`,
  `SqliteSnapshotStore`, `SqliteVideoCatalog`, `UploadedJsonLog` (atomic write, unknown keys kept, `-old`/`-oldN`
  on re-upload), `EpisodePackageReader` (mirrors `upload.mjs` metadata/fallbacks), `YouTubePlatform` (refresh-token
  `UserCredential`; `NodeTokenDataStore` merges refreshed tokens back into token.json), `YouTubeErrors`
  (`uploadLimitExceeded`/message -> `UploadLimitExceededException`; `quotaExceeded`/`dailyLimitExceeded` -> new Core
  `PlatformQuotaExceededException`), `PublisherOptions`, `SystemClock`. Core `EpisodePackage` gained nullable
  `ThumbnailPath` and CategoryId/languages/MadeForKids with defaults.
  - Test-first: RED observed as compile failure (missing Infrastructure namespaces), then GREEN.
  - Exception: YouTube network calls are not tested; only pure mapping (errors, status, privacy, batching, token
    parse/merge) is unit-tested.
  - `dotnet build publisher`: success, 0 warnings, 0 errors.
  - `dotnet test publisher`: Core 64 passed; Infrastructure 41 passed; 0 failed, 0 skipped.
  - Commit 68b7267. Native review for T2: UNAVAILABLE (same cause as T1).
- T3 done (delegated writer): `Cubitos.Publisher.Worker` (Microsoft.NET.Sdk.Worker, `AddWindowsService`
  "CubitosPublisher") and `Cubitos.Publisher.Worker.Tests`.
  - `PublishCycle` (depends only on Core ports): planner actions in order, every transition persisted at once,
    per-item error isolation; upload limit -> WaitingForQuota via `UploadLimitBackoff` over upload-log times; API
    quota -> WaitingForQuota at next Pacific midnight + 5 min (new Core `QuotaReset`); other errors ->
    `TransientRetryPolicy`; replacement Keep check before upload; thumbnail and upload-log failures only logged;
    `RecoverInterruptedAsync` fails items left Uploading at service start (avoids double uploads).
  - `StatsCycle`: refreshes `videos` (episode id from upload log, `-oldN` stripped) and writes one snapshot per video.
  - `PublishWorker`/`StatsWorker` (PeriodicTimer, stats run at start); Event Log when a service, console otherwise,
    plus `DailyFileLoggerProvider` -> `publisher/data/logs/publisher-YYYYMMDD.log` (Peru date, created lazily).
  - CLI in the same exe: `enqueue`, `list`, `cancel`, `run-once`, `stats`, `help`; `--Publisher:Key=value` overrides.
    `LazyYouTubePlatform` only reads secrets on the first YouTube call.
  - Core additions: `QueueStatus.Cancelled` + `Cancel`, `Keep` also from WaitingForQuota, `FailOldVideoHide`
    (Published replacement -> Failed), `IsActive`, ports `IVideoCatalog`/`CatalogVideo` (moved from Infrastructure)
    and `IEpisodeReader`; `PublisherOptions.LogDirectory`; options validated at startup.
  - Scripts: `publisher/scripts/install-service.ps1` (elevation check, self-contained publish to `publisher/dist/worker`,
    `sc.exe create|config` delayed-auto, description, failure restart actions, event source, start),
    `uninstall-service.ps1`, `publisher/cubitos-publisher.cmd`; `publisher/README.md`; `.gitignore` adds dist/, data/.
  - Test-first: RED observed as compile failure (missing Cancel/IsActive/QuotaReset/ports/Worker types), then GREEN.
  - `dotnet build publisher`: success, 0 warnings, 0 errors.
  - `dotnet test publisher`: Core 73, Infrastructure 41, Worker 29 passed; 0 failed, 0 skipped.
  - `dotnet run --project publisher/src/Cubitos.Publisher.Worker -- list --Publisher:DatabasePath=<scratch>`:
    "Queue is empty.", exit 0, no `publisher/data` created. Also exercised enqueue/duplicate/cancel/stats against
    the scratch DB. Size ~1,770 changed lines (over the ~400 heuristic: worker, CLI, scripts, tests are one unit).
  - Commit 407a155. Native review for T3: UNAVAILABLE (same cause as T1/T2).
- T4 done (delegated writer): `Cubitos.Publisher.Dashboard.Core` (net10.0, testable without MAUI) and
  `Cubitos.Publisher.Dashboard` (MAUI, `net10.0-windows10.0.19041.0`, unpackaged, Windows App SDK self-contained).
  - `ReadOnlyDashboardStore`: `Mode=ReadOnly`, no pooling, no schema creation; missing file -> null (empty state
    "El servicio todavía no juntó datos"); missing tables -> empty lists; unknown status strings skipped. Loads
    snapshots of the last 28 days plus the latest snapshot per video, and launch snapshots (first 25 h after
    `published_at`, via `julianday`).
  - `DashboardBuilder` reuses Core `HourlyViewsCalculator` (Rank, Heatmap, new `ViewsBetween`/`HourlySeries`) and
    `FirstDayCurve`: KPIs (total, views since Peru midnight, videos, next publish), ranking + 24 h sparkline, Monday-first
    7x24 heatmap + 3 best hours of day, cumulative launch curves and channel average (only complete curves whose first
    snapshot is <= 3 h after publish), queue (active by time, then finished newest first, youtu.be links).
  - Formatting (Spanish, Peru time, fixed day/month names), countdown, status labels, DB path resolution
    (`--db`, `--Publisher:DatabasePath=`, `Publisher__DatabasePath`, appsettings.json, default path).
  - UI: one window "Historia en Cubitos — Panel" (1440x900, min 1100x720), sidebar nav, header KPIs, theme picker
    (Preferences), refresh button, "Última actualización hh:mm" (Peru), 30 s auto-refresh, 1 s countdown tick. Charts
    are `GraphicsView` drawables (sparkline, crest, heatmap, first-day chart, ornate frame, ambient background).
    Themes are ResourceDictionaries built in C# and swapped in `Application.Resources.MergedDictionaries` at runtime
    (all XAML uses DynamicResource): Cubitos (navy/yellow/red, hard black shadows, Arial Black), Halloween:
    Cazadragones (owner palette 2026-10-30: midnight/plum background, indigo panels, gold corner flourishes, Cinzel
    Decorative OFL font, shield crests with roman ranks, "Salón de los Héroes"/"Misiones", rising embers + slow
    jellyfish-like glow orbs + header lantern string at ~25 fps, paused when the window is stopped/minimized), Neón.
    App icon cropped from the logo's "C" cube. Smoke hooks: `--theme=`, `--section=`, `--screenshot=<png>`.
  - Test-first: RED observed as compile failure (missing Dashboard.Core namespaces, `ViewsBetween`, `HourlySeries`),
    then GREEN. Exception: XAML/drawables have no runnable unit test; covered by the screenshot smoke test.
  - `dotnet build publisher`: success, 0 warnings, 0 errors (includes the MAUI project).
  - `dotnet test publisher`: Core 75, Infrastructure 41, Worker 29, Dashboard 33 passed; 0 failed, 0 skipped.
  - Smoke test: scratch DB `%TEMP%\cubitos-dash-smoke\publisher.db` seeded with the Infrastructure stores (12 videos,
    5,660 snapshots, 7 queue rows). Screenshots (window rendered by the app itself; desktop capture via PowerShell
    was denied by the permission classifier): `%TEMP%\cubitos-dash-{cubitos,halloween,neon}-{ranking,heatmap,firstday,queue}.png`
    and `%TEMP%\cubitos-dash-cubitos-empty.png` (missing DB: empty state, no file or folder created).
  - Size ~2,780 added lines incl. a 93-line font license (over the ~400 heuristic: one UI unit with its tests).

## Next step
T5 cut-over (install service, enqueue 019-022, update AGENT_GUIDE.md); optionally publish the dashboard exe.

- T4 commit `4233cdb`. Native review for T4 UNAVAILABLE (same cause).
- T5 (parent, inline, PARTIAL 2026-10-30 13:24 Peru): enqueued 019-022 replacements for 2026-10-31 (12:00, 13:00,
  18:00, 19:00 Peru; replaces Mn7luaowBwU, olIqXwWlFMY, Y_NQYVvqhAY, lBK8IypZTVY; keep if >= 100 views). Session cron
  job cancelled so nothing uploads twice. Real `run-once`: upload limit detected, all 4 items WaitingForQuota; stats
  cycle wrote 21 snapshots (first real YouTube calls OK). Dashboard launched on the real DB. PENDING: service install
  needs an elevated PowerShell (owner). Known cosmetic: theme picker label can show "Cubitos" while another theme is active.
- T6 done (delegated writer, 2026-10-30): responsive layout + left-edge pumpkin notch + theme picker fix.
  - Dashboard.Core: `NotchStateMachine` (Collapsed/Expanded/Pinned, 400 ms hover-out delay, exits without an enter
    ignored, spring for open/pin progress, staggered reveal), `PumpkinIdleCycle` (flicker, wink, flame burst, bounce,
    spark shower every 4 s), `LaunchArgs` (`--size=WxH`, `--notch=`), `ResponsiveGrid.Columns`, `EpisodeTitles`
    (metadata.json title, repo-relative lookup above the DB, slug fallback). `NextPublish` and `QueueEntry` gained
    `Title` (metadata, then catalog video of the episode, then slug).
  - UI: FlexLayout podium/best-hours replaced by `PodiumLayout` (equal columns, 2-1-3 order, natural height + lift,
    bottom aligned) and `UniformGridLayout` (wraps evenly: stats 4 or 2 columns); `ClampedLabel` (2-line word wrap with
    ellipsis only on the last line); ranking rows use star columns with headers padded like the cards; KPI shows the
    title and puts the countdown in the same wrapping label; heatmap/first-day charts keep an aspect ratio; ambient
    particles rescale on resize instead of reseeding. Sidebar replaced by `NotchPanel` (GraphicsView tab + panel morph,
    pumpkin drawn with paths, flare on open, pin persisted in Preferences, content margin springs when pinned, root only
    as wide as the tab while collapsed). One 33 ms timer drives pumpkin + background, stopped while minimized.
  - Theme picker: re-applies SelectedIndex after the control loads and after each theme swap.
  - Test-first: RED observed (20 compile errors for the new Core types), then GREEN.
  - `dotnet build publisher`: 0 errors, 0 warnings. `dotnet test publisher`: Core 75, Infrastructure 41, Worker 29,
    Dashboard 69 passed; 0 failed.
  - Screenshots (`%TEMP%\cubitos-t6-*.png`; copy of the real DB in `%TEMP%\cubitos-t6-db`, seeded DB for charts):
    halloween-ranking-1100, halloween-ranking-1640, halloween-ranking-2560 (collapsed), halloween-ranking-expanded,
    halloween-ranking-pinned, cubitos-ranking-1640, neon-ranking-1640, halloween-queue-1100, halloween-heatmap-2560,
    neon-firstday-1100. No clipping or overlap observed.
  - Gaps: hover/pin interaction and resize smoothness verified only by forced states (no pointer automation).
