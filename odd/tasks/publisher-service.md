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
- [ ] T4 Dashboard MAUI: ranking, hourly heatmap, queue view, per-video 24 h curve, auto-refresh. Route: delegated.
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

## Next step
T4 Dashboard MAUI (reads `publisher/data/publisher.db`), then T5 cut-over (install service, enqueue 019-022).
