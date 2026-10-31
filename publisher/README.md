# Cubitos publisher

A Windows Service (`CubitosPublisher`) that uploads queued episodes to YouTube on schedule and records view
statistics, without needing a Claude session. The same exe is also the CLI used to manage the queue.

- **Publish loop** (every `PublishInterval`, default 2 min): uploads due items early with YouTube `publishAt`
  (or public right away when the time is under 15 min away), sets the thumbnail, writes `uploader/uploaded.json`,
  confirms the video went public and, for replacements, sets the old video private.
  On the daily upload limit or API quota it waits and retries instead of failing.
- **Stats loop** (at start, then every `StatsInterval`, default 15 min): refreshes the channel video list (with each
  video's privacy) and stores one view/like/comment snapshot per video, then rewrites the public stats JSON for the
  website (`site/data/channel-stats.json`). A failed export only logs a warning.

## Install the service

From an **elevated** PowerShell:

```powershell
D:\PROYECTS\cubitos\publisher\scripts\install-service.ps1
```

It publishes a self-contained build to `publisher/dist/worker`, creates (or updates) the service with delayed
automatic start and restart-on-failure, and starts it. Remove it with `scripts/uninstall-service.ps1`.

The service runs as **LocalSystem** and needs read/write access to the repo: `uploader/uploaded.json`,
`secrets/token.json` (refreshed tokens are written back) and `publisher/data`.

## CLI

`publisher/cubitos-publisher.cmd` runs the published exe, or `dotnet run` when nothing is published yet.

```text
cubitos-publisher enqueue <episodeDir> [--publish-at <ISO 8601 with offset>] [--replaces <videoId>] [--keep-if-views <n>]
cubitos-publisher list
cubitos-publisher cancel <itemId>
cubitos-publisher run-once
cubitos-publisher stats
cubitos-publisher export-stats [--out <path>]
```

- `enqueue videos/019-x --publish-at 2026-10-31T12:00:00-05:00` validates the folder and prints the new item id.
  Without `--publish-at` it publishes as soon as possible. An episode with an active item is refused.
- `--replaces <oldVideoId> --keep-if-views 300` keeps the old video (no upload) when it already has 300+ views;
  otherwise the old one is set private once the new one is public.
- `list` shows times in Peru time (UTC-05:00). `cancel` only works for Pending or WaitingForQuota items.
- `run-once` runs one publish pass and one stats pass in the foreground (calls YouTube).
- `stats` prints the top 10 videos by views with views in the last 1 h and 24 h.
- `export-stats` writes the public summary JSON shown by the site's stats section (default
  `Publisher:StatsExportPath`, else `site/data/channel-stats.json`; relative paths are taken from the repo root).
  It holds only public videos (id, title, publish date, views/likes/comments, views per hour over 24 h), channel
  totals, a daily total-views series (Peru days, up to 30) and the waiting queue (episode slug, title, status, times).
  No paths, errors, tokens or private video ids. Subscribers are not recorded, so they are not exported. Pushing the
  file to GitHub Pages is a manual step.
- Configuration can be overridden per call with `--Publisher:<Key>=<value>`, for example
  `--Publisher:DatabasePath=C:\temp\test.db`, or with environment variables like `Publisher__DatabasePath`.

## Files

| What | Where |
|------|-------|
| Settings | `appsettings.json` next to the exe (`Publisher:RepoRoot`, intervals, optional paths) |
| SQLite DB | `publisher/data/publisher.db` (tables `queue_items`, `snapshots`, `videos`; WAL mode) |
| Public stats | `site/data/channel-stats.json` (`Publisher:StatsExportPath`) |
| Logs | `publisher/data/logs/publisher-YYYYMMDD.log` (Peru date); Windows Event Log source `CubitosPublisher` when running as a service |
| Build output | `publisher/dist/worker` |

`publisher/data` and `publisher/dist` are git-ignored. Secrets are never logged.
