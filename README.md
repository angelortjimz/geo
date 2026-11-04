# geo

geo is a client-only, audio-played early-CGI scene composer. It combines sparse geometric forms, clean chrome and plastic materials, simple digital worlds, and autonomous motion with loudness, transient, and stereo reactivity.

The artwork is the scene—not a spectrum analyzer. The composition remains intentional during silence, while music adds breathing, springy impacts, and movement through stereo space.

> **Current status:** Milestone 2, the blank scene editor, is implemented and verified in Chromium. The full primitive/material library (Milestone 3) and full-track export (Milestone 4) are not implemented yet. See [`docs/roadmap.md`](docs/roadmap.md) for the approved plan.

## Requirements

- Node.js `^20.19.0 || >=22.12.0`
- pnpm 12.6.0, pinned by the `packageManager` field in `package.json`

`corepack enable` is the simplest way to activate the pinned pnpm version. Use pnpm only; do not use npm or create a `package-lock.json`.

## Setup

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite.

## Commands

| Command          | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| `pnpm dev`       | Start the Vite development server with hot reload         |
| `pnpm build`     | Type-check and build the production bundle into `dist/`   |
| `pnpm preview`   | Serve the production build locally after building         |
| `pnpm typecheck` | Run strict TypeScript project checks without emitting     |
| `pnpm lint`      | Lint the project with ESLint                              |
| `pnpm test`      | Run the Vitest suite once                                 |
| `pnpm format`    | Format source and Vite/ESLint configuration with Prettier |

## What works

### Blank scene editor

The workspace opens with a blank stage and a welcome overlay offering **Start blank scene** and **Load starter scene**. Neither choice is forced. A blank scene begins with a neutral gradient, a reflective floor, and no objects; the starter is an ordinary editable configuration rather than a special mode.

The session holds up to 12 objects with stable identities and generated names. The inspector has four views:

- **Scene:** select, add, duplicate, and remove objects, and replace the session with a blank or starter scene. Replacement asks for inline confirmation when edits would be lost.
- **Object:** torus, box, or icosahedron; detail and flat shading; position, rotation, and scale; chrome, glossy plastic, or emissive surfaces; spin, float, orbit, and phase; and per-object loudness, transient, and stereo reactions.
- **World:** solid or gradient backdrop; none, reflective, or checkerboard floor; fog; ambient, key, and fill lighting; and the spherical camera.
- **Finish:** exposure and selective bloom.

Drag the canvas to orbit and scroll to zoom. The World view exposes the same camera values for keyboard use. Scene state is session-local: there is no `localStorage`, autosave, scene file, account, or upload.

### Starter scene

The starter composition is a chrome torus above a softly reflective floor, a smaller emissive satellite, a pale cyan-to-lavender backdrop, and controlled cyan and lavender lighting. The chrome and floor stay sharp while a separate bloom layer gives the satellite a restrained glow.

The torus rotates, floats, and turns slowly on its own. The satellite follows an orbit and the camera drifts subtly. These baseline movements continue while audio is paused or silent, so the scene never depends on sound to remain a composition.

### Local audio and performance

Audio is selected with the file input or dropped anywhere on the workspace. It is decoded locally and never uploaded. The transport supports play, pause/resume, seeking, volume, replacement, and track-end restart.

The audio engine reads stereo time-domain samples through an analysis-only branch and extracts:

- `level` and `intensity` for loudness-driven response
- `impact` for transients
- `balance` and `width` for stereo position and spread

Each object maps those signals through its own bounded reaction values: breathing, spring compression and flare, sustained rotation, balance drift, and orbital expansion. Reactions layer over the authored resting pose rather than overwriting it. Mono files are duplicated into both analysis channels, producing centered balance and zero width. Silence produces neutral values while autonomous motion continues. Listener volume does not feed back into the analysis.

### Five-second capture

**Capture 5 s** records the current edited composition and original stereo audio to a downloadable MP4. It restarts playback from the current playhead so visual and audio recording begin together, pauses editing while it runs, and uses the canvas through an even-sized 2D bridge that preserves aspect ratio and the post-processed WebGL output.

The file is accepted only after an MP4 `ftyp` header check. Recording, download, stream, and canvas-capture resources are released after completion, failure, or unmount. The path was verified with H.264 video and AAC stereo audio in production Chromium during Milestone 1. The headless Chromium build used for Milestone 2 verification does not ship those codecs, so re-run the capture in production Chromium after visual changes.

### Lifecycle

The renderer, audio graph, animation frames, event subscriptions, recording streams, GPU geometries, materials, textures, and render targets are cleaned up on disposal. A development Strict Mode smoke test confirmed one active render loop, one `AudioContext`, and one audio source after mount.

## Current limitations

- The library is intentionally limited to three primitives (torus, box, icosahedron) and three materials (chrome, glossy plastic, emissive), matching Milestone 2. The complete library, seeded generation, viewport picking, transform gizmos, fullscreen preview, and aspect-format controls belong to later milestones.
- Capture is a five-second technical spike, not the full-track exporter. It captures in real time from the current playhead and always stops after five seconds.
- MP4 recording depends on desktop Chromium's `MediaRecorder`, WebGL canvas capture, and H.264/AAC codec support. Other browsers and very slow software-only GPU rendering are not verified capture targets and may drop video frames.
- Scene state is session-local. There is no autosave, project file, account, backend, or persistence.
- The study is desktop-first. Phone layouts are not a validation target for this milestone.

## Architecture

React owns low-frequency workspace state and accessible controls. Direct Three.js owns the scene, post-processing, and its single animation loop; no Three.js object or per-frame transform enters React state. Pure modules implement audio features, envelopes, springs, and behavior clamping.

```text
Local audio
    → local validation and decode
    → AudioEngine ── audible analyser → volume → speakers → original-audio tap
                   └ analysis-only splitter → left/right analysers
    → level / intensity / impact / balance / width
    → envelopes, spring, and bounded scene behaviors
    → Three.js scene and selective emissive bloom
    → WebGL canvas → optional five-second capture bridge
```

`useSceneEditor` owns the session-local `SceneConfig`, selection, and welcome/editing flow. The document is versioned from its introduction so persistence can be considered later. `SceneRenderer` diffs the document by stable object id through `applyConfig` and applies world, camera, and finish values in place. No persistence or full export is present.

## Project structure

```text
src/audio/       Playback, stereo analysis, feature extraction, audio UI hook
src/editor/      Session-local scene document, selection, welcome/editing flow
src/scene/       Versioned SceneConfig, limits, normalization, operations, starter
src/motion/      Envelopes, spring response, and bounded behavior helpers
src/render/      Three.js renderer, object factory, textures, reflection, bloom
src/export/      Five-second capture orchestration, canvas bridge, MP4 checks
src/components/  Canvas, upload, transport, capture, inspector, welcome controls
docs/            Product roadmap and milestone plan
```

## Privacy

The application is entirely local: there is no backend, analytics, account system, streaming integration, or remote audio upload. Selected audio stays in the browser and scene state is not persisted.

## Contributing

Read [`AGENTS.md`](AGENTS.md) and [`docs/roadmap.md`](docs/roadmap.md) before changing scope or architecture. Keep `CHANGELOG.md` updated for every notable change. Do not mark roadmap items complete until their visual and runtime behavior has been verified, not merely compiled.
