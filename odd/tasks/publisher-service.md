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
  - `Cubitos.Publisher.Dashboard`: MAUI Windows (unpackaged) app reading the same SQLite DB (replaced by the WPF app
    `Cubitos.Publisher.Desktop` in T7).
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
- [x] T7 Replace the MAUI dashboard with WPF (owner 2026-10-30: MAUI resize/animation not smooth). Reuse Dashboard.Core; notch to be refined after the owner shares a reference notch. Route: delegated.
- [x] T8 App-level hover notch (owner 2026-10-30, earlier notch was misunderstood): the whole app is a screen notch on
      the primary screen's left edge (flaming pumpkin); hover slides the full dashboard out (< 250 ms), leaving both
      windows collapses it after 0.5 s, thumbtack pins it as a normal window; sections become header tabs. Route:
      delegated (writer trigger).
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
- T6 commit `7372487`. Native review for T6 UNAVAILABLE (same cause).
- T7 done (delegated writer, 2026-10-30): `publisher/src/Cubitos.Publisher.Desktop` (WPF, `net10.0-windows`) replaces the
  MAUI app (`src/Cubitos.Publisher.Dashboard` removed from the .slnx and deleted). Feature parity: KPIs (next mission
  title + countdown), theme picker (Cubitos, Halloween: Cazadragones with the owner palette, gold flourishes and Cinzel
  Decorative OFL, Neón), ranking podium 2-1-3 + rows + sparklines, heatmap + best 3 hours, first-24 h curve vs channel
  average with video picker, queue, 30 s auto refresh + manual, last update time, empty state, read-only DB, switches
  `--db --theme --section --size --notch --screenshot` and hidden `--fps-log`.
  - Smoothness: single `CompositionTarget.Rendering` frame clock (Stopwatch delta, paused while minimized or the session
    is locked); ambient particles, notch and pumpkin are `DrawingVisual` layers redrawn without layout; frozen brushes
    and geometries; charts render from current size in `OnRender` and keep aspect through `MeasureOverride`; podium and
    even-wrap custom panels; 2-line clamps via `TextWrapping` + `TextTrimming` + `MaxHeight`; ornate frames are vector
    paths drawn at the element's size; card shadows/glow are vector layers (blur `Effect`s were re-blurred every frame
    under the animated background: 54 -> 85-93 fps idle); ranking list virtualized (pixel scrolling). Custom
    `WindowChrome` title bar, DWM rounded corners + dark mode + theme border color, PerMonitorV2 manifest. Section
    switch fade/slide 200 ms, theme cross-fade 280 ms (snapshot overlay), card hover lift + glow, count-up numbers.
  - Notch in `Notch/` behind `INavigationNotch` (`NotchControl`, `NotchSurface`, `PumpkinRenderer`), driven by
    `NotchStateMachine`; ready to be redone from the owner's reference design.
  - Dashboard.Core additions (WPF-independent, tested): `Presentation/NumberTween`, `FrameTimeStats`, `KeyedListSync`,
    `DesktopSettingsStore`, `Sections`. Test-first: RED observed (CS0234 missing `Presentation` namespace), then GREEN.
  - Fix: `Dashboard.Core/Data/ReadOnlyDashboardStore.cs` was never committed (matched the `data/` ignore rule on a
    case-insensitive FS); now force-added so a clean clone builds.
  - `dotnet build publisher`: 0 warnings, 0 errors. `dotnet test publisher`: Core 75, Dashboard 87, Infrastructure 41,
    Worker 29 passed; 0 failed.
  - Screenshots (`%TEMP%\cubitos-t7-*.png`, copy of the real DB and the T4 seeded DB): halloween-ranking-1100/-1640/-2560
    (collapsed), halloween-ranking-expanded, halloween-ranking-pinned, cubitos-ranking-1640, neon-ranking-1640,
    halloween-heatmap, halloween-firstday, halloween-queue, cubitos-empty (missing DB: empty state, no folder created).
  - fps log (Halloween ranking, 100 Hz display, RTX 3060 Ti): overall avg 62.8 fps, worst 36.2 ms, p95 25.7 ms; notch
    only 90.7 fps; while resizing every frame 44.5 fps (heatmap/queue 50 fps = every other vsync). Live resize is the
    remaining cost: each WM_SIZE lays out and renders synchronously (~20 ms for the ranking view).
  - Gaps: hover/pin verified by the fps script and forced states, not by real pointer automation.
- T7 commit `cbc5f25`; follow-up fix `b0535c1` (anchor the `data/` ignore rule to the publisher root so
  `Dashboard.Core/Data` is never ignored again). Native review for T7 UNAVAILABLE (same cause).
- T8 done (delegated writer, 2026-10-30): the app itself is the notch.
  - Dashboard.Core: `NotchStateMachine` reworked (0.5 s collapse delay; `Track(now, overNotch, overPanel, popupOpen,
    buttonDown)` treats notch + panel as one hover area, the hidden panel never opens anything, entering the closing
    panel reopens it, an open popup or a press that started inside holds it open; fixed 220 ms ease-out-cubic open /
    200 ms reverse close instead of the spring; pin spring removed). New `NotchDock` (tab flush left and centered; panel
    70% x 80% of the work area or the remembered size, left-anchored, centered, min 1100x720 capped to the screen;
    `SlideX`). `DesktopSettings` gained `PanelWidth`/`PanelHeight`.
  - Desktop: `Notch/NotchWindow` (borderless per-pixel transparent topmost tool window, `WS_EX_NOACTIVATE`, click-through
    outside the tab, right-click menu "Fijar / soltar el panel" / "Salir"), `Notch/NotchTab` (tab + pumpkin, swells and
    flares while open; `PumpkinRenderer.Heat`), `Notch/NotchController` (pre-created panel kept alive at alpha 0,
    click-through, parked left of the screen; per frame it polls the cursor over both windows, slides the panel with a
    move-only `SetWindowPos` and fades DWM alpha via `SetLayeredWindowAttributes`; pin/unpin chrome; returns focus to the
    previous window on collapse; re-docks on display/work-area changes using the primary work area + monitor DPI),
    `Notch/EmergeGlow` (light burst on the panel's left edge mid-animation). `MainWindow` is the panel: header tabs
    (replacing the old in-window notch), thumbtack, min/max only when pinned, caption drag only when pinned, remembers
    size on resize end. Old `NotchControl`/`NotchSurface`/`INavigationNotch` removed. `SettingsSession` is the single
    writer of the settings file. Taskbar: none (least intrusive; the notch is the app's presence).
  - Test-first: RED observed (CS0246 `DockRect` missing), then GREEN.
  - `dotnet build publisher`: 0 warnings, 0 errors. `dotnet test publisher`: Core 75, Dashboard 106, Infrastructure 41,
    Worker 29 passed; 0 failed.
  - Screenshots (`%TEMP%\cubitos-t8-*.png`, T6 copy of the real DB, Halloween): collapsed (notch window only), expanded
    (panel + notch at its real offset), pinned (heatmap tab, min/max shown). A desktop-region capture confirmed the real
    composition (layered WPF panel draws correctly, notch on top, transparent around the tab); not kept (it showed the
    owner's other windows).
  - fps log (10 s, 5 hover open/close cycles): all frames avg 90.7 fps, worst 32.2 ms, p95 19.0 ms, 0 slow frames;
    while animating avg 73.4 fps, worst 20.8 ms; open time avg 223.7 ms, max 232.2 ms (target 220 ms).
  - Gaps: real pointer hover/guards verified by unit tests and simulated hover only; a monitor left of the primary with a
    different DPI could rescale the parked panel; pinned window position is not remembered (size is).
