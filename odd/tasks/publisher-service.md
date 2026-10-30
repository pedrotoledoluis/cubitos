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
- [ ] T2 Infrastructure: SQLite store, YouTube adapter (upload + thumbnail + status + stats + channel video list),
      uploaded.json sync. Route: delegated.
- [ ] T3 Worker: Windows Service host, publish loop, stats loop, CLI `enqueue`/`list`, install/uninstall scripts.
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

## Next step
T2 Infrastructure (SQLite store, YouTube adapter, uploaded.json sync).
