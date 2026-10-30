---
workflow: general-video
flow: automation
storyboard: no
message: "Napoleon really lost a hunt to a horde of tame farm rabbits (1807)"
destination: youtube-shorts
aspect: 1080x1920
language: es
length: ~40s
angle: comedy-sketch
---

## Intent

Episode 2 of "Historia en Cubitos": a two-character comedy sketch (Profe Cubo explains, Tito reacts)
about the 1807 rabbit hunt organised by Berthier, as told in the memoirs of general Paul Thiebault.
Same look as episode 1: blocky low-poly cube characters, night office set with skyline window and a
warm lamp, white bold black-outlined captions top-center.

## Assets

- ../src/characters/*.js, ../src/set.js — episode 1 Three.js characters and set, ported (not redesigned).

## Customizations

- Seek-safe 3D camera: slow orbit of a few degrees around the speaker, gentle dolly, dutch tilt on punchlines.
- Profe: blocky dark-brown mustache (moves with speech) and an arm with a pointer stick that points at the board.
- Wall-mounted chalkboard TV next to Profe; [board] lines play flat chalk-style 2D animations drawn into a
  canvas texture mapped onto the board mesh (deterministic, a pure function of time).
- Voices: local Kokoro TTS (Spanish). Profe = em_alex (lower, slowed). Tito = ef_dora pitched up (young, energetic).
- Synthesized BGM bed + bundled/synthesized SFX (pop, squeak/boing, whoosh, hooves), ducked under voices.

## Notes

- Script text is fixed; captions must match it exactly.
- All creative decisions delegated by the user; no intent interview.
- Deliverables go to ../videos/002-napoleon-conejos/ (mp4 1080x1920 30fps, thumbnail 1280x720, description).
