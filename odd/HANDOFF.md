# Handoff — current state (overwrite this file; history lives in git)

Last update: 2026-10-30 ~17:30 Peru. Read this first after `/clear`, then `AGENT_GUIDE.md` and the feature doc named below.

## Channel state
- Shorts 003–018 public or scheduled on 2026-10-30. 019–022 (new 35–55 s format) are public since 2026-10-30 12:00 Peru
  with a random frame as cover: Mn7luaowBwU (019), Y_NQYVvqhAY (020), olIqXwWlFMY (021), lBK8IypZTVY (022).
- Shorts ignore custom thumbnails for non-partner channels. New `hf-template/compositions/cover.html` renders a 9:16
  cover that is prepended as the first 0.1 s of each video (commit d706bf8); the owner picks that frame in the
  YouTube mobile app. `videos/019..022/*.mp4` already contain the cover.
- YouTube upload limit: ~12 uploads per rolling 24 h on this channel ("exceeded the number of videos they may upload").

## Publisher service (feature doc: `odd/tasks/publisher-service.md`, branch `feat/publisher-service`)
- .NET 10 solution in `publisher/`: Core, Infrastructure (SQLite WAL + YouTube adapter + uploaded.json sync), Worker
  (Windows Service `CubitosPublisher` + CLI `publisher/cubitos-publisher.cmd enqueue|list|cancel|run-once|stats`),
  Desktop (WPF dashboard; MAUI removed), Dashboard.Core (+ tests). 232 tests green at cbc5f25.
- Queue (real DB `publisher/data/publisher.db`): 019–022 replacements with cover, publish 2026-10-31 12:00 / 13:00 /
  18:00 / 19:00 Peru, replace the old IDs above, keep the old one if it has >= 100 views. Status WaitingForQuota.
- NOT INSTALLED YET: owner must run, in an elevated PowerShell,
  `powershell -ExecutionPolicy Bypass -File D:\PROYECTS\cubitos\publisher\scripts\install-service.ps1`.
  Without the service nothing uploads and the dashboard gets no new snapshots.
- T8 in progress: the WHOLE dashboard becomes a left-edge notch with an animated flaming pumpkin; hover opens the full
  panel, mouse leave collapses to only the pumpkin, thumbtack pins. Owner will share a reference notch later.
- Native review (gentle-ai RDD) is UNAVAILABLE on this repo: preflight asks for `intended_untracked_selection` and
  every submission returns `invalid_request`. Recorded per task; no approval claimed.
- Push / PRs: owner decides. Chain strategy chosen: stacked-to-main, one PR per task.

## Coaster Short prototype (idea from `ideas/idea1.mp4`, no SpongeBob/copyrighted elements)
- Scratch prototype (outside repo):
  `C:\Users\User\AppData\Local\Temp\claude\D--PROYECTS-cubitos\b83a4feb-5171-422a-a9f3-ff675e8c6df2\scratchpad\coaster\`
  (Three.js r169 + KayKit Halloween Bits CC0 + Poly Haven HDRI; bloom, ACES, color grade, 60 fps, 12 s renders in
  ~53 s). Draft `coaster-draft.mp4`. Owner rated it ~20 % of the reference quality. Scratch may be wiped: copy into
  the repo before relying on it.
- Owner decision: try Kling FREE tier only (66 credits/day) with Tito/Profe reference images; owner must log in.
- Blender is not installed; estimate for 1 h of agent work = 5–10 s rough EEVEE scene (not validated).

## Next 4 videos (format unchanged: 35–55 s comedy explainer, Profe/Tito/Nova, Peruvian slang in Tito's lines)
- Apply the coaster's look moderately: bloom on lights, ACES + light color grade, soft fog, vignette. Keep 30 fps.
- Approved topics: San Martín de Porres (3 Nov; dog, cat and mouse eating from one plate, told as legend);
  guaguas de pan (1–2 Nov, Andes). Rejected: Yma Sumac, Abraham Valdelomar.
- Candidates to confirm: Lisbon earthquake on All Saints' Day (1 Nov 1755); why the US votes on a Tuesday
  (midterms 3 Nov 2026); Guy Fawkes and the mask (5 Nov); Callao tsunami of 1746.

## Owner preferences
- Spanish replies with voseo, short, one question at a time. Save tokens but keep quality.
- Upload only with owner OK or explicit schedule. Never read/print `secrets/`.
