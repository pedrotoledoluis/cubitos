# Cubitos publisher

A Windows Service (`CubitosPublisher`) that uploads queued episodes to YouTube on schedule and records view
statistics, without needing a Claude session. The same exe is also the CLI used to manage the queue.

- **Publish loop** (every `PublishInterval`, default 2 min): uploads due items early with YouTube `publishAt`
  (or public right away when the time is under 15 min away), sets the thumbnail, writes `uploader/uploaded.json`,
  confirms the video went public and, for replacements, sets the old video private.
  On the daily upload limit or API quota it waits and retries instead of failing.
- **Stats loop** (at start, then every `StatsInterval`, default 15 min): refreshes the channel video list and
  stores one view/like/comment snapshot per video.

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
```

- `enqueue videos/019-x --publish-at 2026-10-31T12:00:00-05:00` validates the folder and prints the new item id.
  Without `--publish-at` it publishes as soon as possible. An episode with an active item is refused.
- `--replaces <oldVideoId> --keep-if-views 300` keeps the old video (no upload) when it already has 300+ views;
  otherwise the old one is set private once the new one is public.
- `list` shows times in Peru time (UTC-05:00). `cancel` only works for Pending or WaitingForQuota items.
- `run-once` runs one publish pass and one stats pass in the foreground (calls YouTube).
- `stats` prints the top 10 videos by views with views in the last 1 h and 24 h.
- Configuration can be overridden per call with `--Publisher:<Key>=<value>`, for example
  `--Publisher:DatabasePath=C:\temp\test.db`, or with environment variables like `Publisher__DatabasePath`.

## Dashboard

`src/Cubitos.Publisher.Dashboard` is a .NET MAUI Windows app (unpackaged exe) that reads the same SQLite DB
**read-only** (it never creates or writes it) and refreshes every 30 s, plus an "Actualizar" button:

- **Ranking**: videos by total views with +1 h / +24 h, likes, comments and a 24 h sparkline; top 3 on a podium.
- **Horas pico**: 7 x 24 heatmap of views gained (Peru time, last 4 weeks) and the 3 best hours to publish.
- **Primeras 24 h**: cumulative views per hour since publish for one video against the channel average (average uses
  only videos with a full first day that the service measured from the start).
- **Cola de publicación**: queue items with status badges, publish/retry times, last error and a link to the video.
- Header KPIs: total views, views today (Peru day), videos published, next publish with countdown.

Themes (selector in the header, remembered): **Cubitos**, **Halloween: Cazadragones** (animated embers, glow orbs and
lanterns; pauses while minimized) and **Neón**. The Halloween headings use Cinzel Decorative (SIL OFL 1.1, license in
`Resources/Fonts/OFL-CinzelDecorative.txt`).

```powershell
dotnet build publisher\src\Cubitos.Publisher.Dashboard
publisher\src\Cubitos.Publisher.Dashboard\bin\Debug\net10.0-windows10.0.19041.0\win-x64\Cubitos.Publisher.Dashboard.exe
```

The DB path comes from `--db <path>` (or `--Publisher:DatabasePath=<path>`), then `Publisher__DatabasePath`, then
`appsettings.json` next to the exe, then `D:\PROYECTS\cubitos\publisher\data\publisher.db`. `--theme=<cubitos|halloween|neon>`,
`--section=<ranking|heatmap|firstday|queue>`, `--screenshot=<file.png>` (render the window to PNG and exit),
`--size=<W>x<H>` (window size) and `--notch=<collapsed|expanded|pinned>` (forced, not remembered) exist for smoke tests.

Navigation lives in a notch on the left edge with an animated flaming pumpkin: hovering opens the panel, leaving closes
it after 0.4 s, and the pin button keeps it open beside the content (remembered). The "next publish" KPI shows the
episode title from its `metadata.json` (repo-relative folders are looked up above the DB), else the uploaded video's
title, else the folder name.

## Files

| What | Where |
|------|-------|
| Settings | `appsettings.json` next to the exe (`Publisher:RepoRoot`, intervals, optional paths) |
| SQLite DB | `publisher/data/publisher.db` (tables `queue_items`, `snapshots`, `videos`; WAL mode) |
| Logs | `publisher/data/logs/publisher-YYYYMMDD.log` (Peru date); Windows Event Log source `CubitosPublisher` when running as a service |
| Build output | `publisher/dist/worker` |

`publisher/data` and `publisher/dist` are git-ignored. Secrets are never logged.
