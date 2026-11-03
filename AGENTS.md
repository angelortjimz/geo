# Project Purpose

geo is a client-only, audio-played early-CGI scene composer. Users build sparse, clean 3D compositions from geometric primitives, stylized materials, simple worlds, and autonomous motion. Loudness, transients, and stereo space perform the scene; the scene itself—not an audio analysis display—is the artwork.

Read `docs/roadmap.md` before changing scope. Implement only the current milestone unless the user requests otherwise. The current milestone is the fixed visual study: prove the starter composition and WebGL capture before building the complete editor.

## Non-Negotiable Rules

- Use **pnpm only**. Never run npm or create `package-lock.json`.
- Use React, TypeScript, Vite, Three.js directly, Web Audio API, and WebGL for the current architecture.
- Keep TypeScript strict. Avoid `any`; use focused types for scene configuration and engine state.
- Do not add React Three Fiber, a state-management library, workers, FFmpeg, or offline rendering without an approved requirement.
- Do not add a backend, accounts, remote audio upload, streaming integrations, or analytics.
- Do not display spectra, waveforms, frequency axes, analyzer bars, or audio-analysis diagnostics as artwork.
- Prioritize clean early-CGI aesthetics: geometric forms, chrome and glossy plastic, sparse compositions, gradients, fog, simple floors, controlled light, and selective bloom.
- Do not rely on heavy glitch, RGB separation, constant grain, aggressive pixelation, or retro-interface decoration to establish the aesthetic.
- A composition must remain visually intentional while paused and during silence. Autonomous base motion continues at a restrained baseline; audio adds energy.
- Start with an empty scene and offer one optional, highly polished starter scene. Do not force the starter scene on launch.
- Use loudness (`level`, `intensity`), transients (`impact`), and stereo information (`balance`, `width`) as the initial reactive signals.
- Mono input must produce centered balance, zero width, and valid neutral behavior. Never divide by silent or zero-energy channels without guards.
- Stereo effects must preserve the user's base composition through additive, bounded modulation.
- Scene configuration is session-local. Do not add `localStorage`, autosave, accounts, scene files, or persistent profiles without a new approved requirement.
- Keep the full scene document versioned from its introduction so persistence can be considered later without coupling it to the current release.
- Preserve `docs/roadmap.md` and update checkboxes only after behavior is implemented and verified.
- Keep changes minimal. Do not add timelines, keyframes, node editors, custom model imports, physics, complex particles, or additional input modes without approved scope.

## Design Patterns

### Separation of ownership

- React components manage scene configuration, selection, controls, upload state, and accessible UI.
- `AudioEngine` encapsulates AudioContext, AudioNodes, playback offsets, stereo analysis routing, and cleanup.
- A pure feature extractor converts time-domain samples into level, intensity, impact, balance, and width signals.
- `SceneRenderer` owns the Three.js scene, camera, materials, post-processing, and mutable frame data.
- Pure modules handle envelopes, springs, seeded generation, configuration validation, and behavior calculations where practical.
- Keep browser engines independent of React so they can be tested and tuned separately.

### Animation and state

- Use exactly one cleaned-up `requestAnimationFrame` loop for the scene canvas.
- Never store audio sample arrays, feature histories, Three.js objects, or per-frame transforms in React state.
- Use refs or engine instances for mutable real-time values.
- Clamp large frame deltas after tab suspension.
- Derive procedural motion from a controlled clock rather than wall-clock time where practical; reset motion and envelopes for export.
- Cancel animation frames, disconnect observers/nodes, release GPU resources, and invalidate stale audio callbacks during cleanup.
- Ensure development Strict Mode does not create duplicate loops, audio graphs, renderers, or playback.

### Deterministic visuals and motion

- Never use `Math.random()` inside the frame loop.
- Derive generated object traits from a scene seed and stable object identity.
- Keep object identity stable across selection, resizing, and unrelated configuration changes.
- Use attack/release envelopes for continuous signals and spring/impulse responses for transients.
- Base transforms and audio modulation are separate; reactions must not overwrite the composed resting state.
- Bound reactive scale, position, camera movement, light intensity, and bloom so loud or wide audio cannot destroy a scene.
- Generated scenes use curated palettes, composition rules, and bounded ranges rather than unrestricted slider randomization.

### Audio lifecycle and stereo analysis

- Create a new `AudioBufferSourceNode` for each play/resume; source nodes are one-shot.
- Resume AudioContext from a user gesture when required.
- Stop and disconnect old sources on pause, replacement, and disposal.
- Ignore stale decode and `onended` results after a newer action.
- Keep all audio local and surface decoding failures as readable UI errors.
- Preserve the existing playback/recording route when porting `typo` code. Add a separate analysis-only channel-splitter branch for left/right time-domain data.
- Never connect the stereo analysis branch to another audible destination or create double playback.
- Player volume must not affect analysis or exported audio.
- Compute combined RMS for level, adaptive positive energy changes for impact, normalized left/right energy for balance, and mid/side energy for width.
- Use a short transient refractory period and explicit silence handling.

### Three.js rendering and canvas

- Use direct Three.js rather than declarative per-frame React rendering.
- Keep CSS-pixel layout separate from renderer backing resolution; handle device pixel ratio with a sensible cap.
- Use a `ResizeObserver` and resize the renderer, camera, and post-processing targets together.
- Obtain the early-CGI look through geometry, environment maps/matcaps, lighting, materials, composition, and motion before adding post effects.
- Bloom must be selective and restrained. Avoid washing out materials or making every surface emissive.
- Prefer simple stylized reflections over expensive physically accurate simulation.
- Dispose geometries, materials, textures, render targets, passes, and renderers when replaced or unmounted.
- Keep interface elements outside the captured artwork.
- Preserve aspect ratio during export; never stretch the 3D scene.
- Validate WebGL canvas capture with post-processing early. Reuse `typo`'s export handle contract where useful rather than rewriting exporter orchestration.

### Interface and accessibility

- Preserve the workspace model: large canvas, right-side inspector, and full-width transport below.
- Use Scene, Object, World, and Finish inspector views to contain complexity; the old `typo` rule requiring every control to remain visible does not apply here.
- Keep controls labeled, keyboard accessible, and visually subordinate to the artwork.
- The empty state offers Blank scene and Load starter scene actions without fake or disabled placeholder controls.
- Support reduced-motion preferences for interface transitions. The audio-reactive artwork is the content, but provide a way to preview it without unnecessary interface motion.
- Canvas accessibility must not expose meaningless scene-graph internals to assistive technology; all editing actions need accessible controls.

## Dependencies and Performance

- Prefer browser APIs and small pure modules over dependencies.
- Do not add a dependency for simple math, seeded hashing, class names, or state subscription.
- Three.js is the approved scene/rendering dependency. Add post-processing or UI dependencies only when they replace meaningful complexity.
- Measure before introducing workers, geometry atlases, instancing frameworks, or other optimization layers.
- Avoid per-frame object and array churn where practical, but do not complicate the first renderer prematurely.
- Cap excessive DPR, bloom resolution, and geometry detail if needed to keep the default scene responsive.
- Target smooth desktop Chromium preview and 30 FPS real-time export; document measured limitations honestly.

## Documentation

- Update `CHANGELOG.md` for every notable user-visible, behavioral, performance, or architectural change. Add entries under `## [Unreleased]` using Keep a Changelog categories before considering the work complete.
- Do not rewrite released changelog entries. When cutting a release, move `Unreleased` entries under a dated version heading.
- Keep `README.md` accurate about implemented functionality. Do not present roadmap items as working features.
- Update this file when architecture, scope, commands, or project conventions change.

## Validation

Use pnpm scripts for development, build/typecheck, lint, and tests. Add focused Vitest coverage when changing pure audio features, envelopes, springs, scene validation, deterministic generation, sizing, or export helpers. After audio changes, manually verify upload, play, pause/resume, seeking, track end/restart, replacement, volume independence, mono/stereo behavior, and cleanup. After rendering changes, verify the empty scene, starter scene, object editing, resize, tab restore, silent playback, fullscreen preview, and GPU-resource cleanup.

Export verification must confirm a valid MP4 container, original stereo audio, synchronized visuals, correct aspect ratio, post-processing output, cancellation cleanup, and normal playback after completion or failure.

Do not mark roadmap work complete based only on compilation: the visual output must also satisfy the milestone's aesthetic, motion, and playback criteria.
