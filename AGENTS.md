# geo

geo is a client-only, audio-played early-CGI scene composer. Users build sparse, clean 3D compositions from geometric primitives, stylized materials, simple worlds, and autonomous motion. Loudness, transients, and stereo space perform the scene; the scene itself—not an audio analysis display—is the artwork.

Read `docs/roadmap.md` before changing scope. Implement only the current milestone unless the user explicitly requests otherwise.

Current status: Milestone 1 (fixed visual study and five-second WebGL capture spike) and Milestone 2 (blank scene editor) are implemented and verified. Milestone 3, creative and performance polish, is next. Full-track export, the full primitive/material library, generation, and release hardening remain later milestones.

Do not add full-export, generation, fullscreen/aspect-format, or polish scope until the corresponding milestone is authorized.

## Non-Negotiable Rules

### Stack and scope

- Use **pnpm only**. Never run npm, npx, or yarn, and never create `package-lock.json`.
- Use React, TypeScript, Vite, Three.js directly, Web Audio API, and WebGL.
- Keep TypeScript strict. Avoid `any`; use focused types for scene configuration and engine state.
- Do not add React Three Fiber, a state-management library, workers, FFmpeg, or offline rendering without an approved requirement.
- Do not add a backend, accounts, remote audio upload, streaming integrations, or analytics.
- Keep changes minimal and milestone-focused. Do not add timelines, keyframes, node editors, custom model imports, physics, complex particles, additional input modes, persistence, or speculative abstractions without approved scope.
- When requirements are ambiguous, choose the smallest implementation that satisfies the current milestone.

### Aesthetic

- Prioritize clean early-CGI aesthetics: geometric forms, chrome and glossy plastic, sparse compositions, gradients, fog, simple floors, controlled light, and selective bloom.
- Do not rely on heavy glitch, RGB separation, constant grain, aggressive pixelation, or retro-interface decoration.
- A composition must remain visually intentional while paused and during silence. Autonomous base motion continues at a restrained baseline; audio adds energy.
- Never display spectra, waveforms, frequency axes, analyzer bars, or audio-analysis diagnostics as artwork.
- Bloom must stay selective and restrained. Do not wash out materials or make every surface emissive.
- Prefer simple stylized reflections over expensive physically accurate simulation.

### Audio and state

- Use loudness (`level`, `intensity`), transients (`impact`), and stereo information (`balance`, `width`) as the initial reactive signals.
- Mono input must produce centered balance, zero width, and valid neutral behavior. Never divide by silent or zero-energy channels without guards.
- Stereo effects must preserve the user's base composition through additive, bounded modulation.
- Player volume must not affect analysis or exported audio.
- Scene configuration is session-local. Do not add `localStorage`, autosave, accounts, scene files, or persistent profiles without a new approved requirement.
- Keep the full scene document versioned from its introduction so persistence can be considered later without coupling it to the current release.
- Start with an empty scene and offer one optional, highly polished starter scene. Do not force the starter scene on launch. The editor implements this through its welcome state.

## Commands and Environment

Requires Node `^20.19.0 || >=22.12.0` and the pinned `pnpm@12.6.0`. Use only the existing scripts.

| Command          | Purpose                                               |
| ---------------- | ----------------------------------------------------- |
| `pnpm dev`       | Start the Vite development server with hot reload     |
| `pnpm build`     | Type-check and build the production bundle            |
| `pnpm typecheck` | Run strict TypeScript project checks without emitting |
| `pnpm lint`      | Lint the project with ESLint                          |
| `pnpm test`      | Run the Vitest suite once                             |
| `pnpm preview`   | Serve the production build locally                    |
| `pnpm format`    | Format source and tool configuration with Prettier    |

Do not add scripts that bypass this toolchain or introduce a second checker.

## Project Structure

```text
src/
  App.tsx, main.tsx, styles.css  workspace shell and global styles
  audio/       AudioEngine, playback, validation, feature extraction, audio hook
  editor/      session-local scene document, selection, welcome/editing flow
  scene/       versioned SceneConfig, limits, normalization, operations, starter
  motion/      envelopes, springs, bounded behavior helpers
  render/      SceneRenderer, object factory, textures, reflections, bloom
  export/      five-second capture orchestration, canvas bridge, MP4 checks
  components/  canvas, upload, transport, capture, inspector, welcome, workspace UI
docs/          product roadmap and milestone plan
```

Group files by feature or responsibility. Keep React components, domain types, browser engines, and pure utilities clearly separated. Do not reorganize the structure without a concrete reason.

## Architecture and Ownership

| Layer             | Owns                                                                                  | Must not own                                      |
| ----------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `useSceneEditor`  | Session-local scene document, selection, welcome/editing mode, dirty replacement flow | Per-frame values, Three.js objects, persistence   |
| React components  | Inspector and transport UI, upload state, accessible behavior                         | Per-frame values, sample arrays, Three.js objects |
| `AudioEngine`     | `AudioContext`, audio graph, playback offsets, analysis routing, decoding, cleanup    | React state, scene rendering                      |
| Feature extractor | Pure time-domain to signal math                                                       | React, Three.js, avoidable browser coupling       |
| `SceneRenderer`   | Three.js scene, camera, materials, post-processing, animation loop, GPU lifecycle     | React state, audio decoding                       |
| Pure modules      | Envelopes, springs, seeded generation, validation, sizing and timing                  | Direct browser coupling                           |

- Keep browser engines independent of React so they can be tested and tuned separately.
- Expose small, explicitly typed APIs instead of distributing implementation details across components.
- Prefer pure modules for behavior calculations, then inject their results into the renderer or UI.
- Validate values entering important boundaries: uploaded files, decoded audio, scene documents, and user-configurable parameters.

```ts
export interface AudioFeatures {
  level: number
  intensity: number
  impact: number
  balance: number
  width: number
}
```

## TypeScript and Code Style

- Preserve the strict configuration, including `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, and `allowImportingTsExtensions`.
- Never use `any` to bypass a type error. Use `unknown` at genuinely unknown boundaries, then validate or narrow explicitly.
- Avoid unnecessary type assertions and non-null assertions. Never suppress a compiler error without a specific, documented reason.
- Use explicit return types for public APIs, exported functions, and engine interfaces. Allow inference for straightforward locals.
- Use `interface` for object contracts and `type` for unions, aliases, and compositions. Model states with discriminated unions and handle them exhaustively.
- Mark data that should not be mutated as `readonly`. Prefer immutable configuration updates over in-place mutation of React state.
- Prefer `Record`, `Partial`, and `Pick` when they clarify intent. Avoid generic abstractions that obscure domain behavior.

Follow the repository's Prettier configuration: no semicolons, single quotes, 100-character print width, trailing commas, and two-space indentation. Run `pnpm format` for touched files. Do not reformat unrelated code.

### Naming

- Components, classes, interfaces, and types: `PascalCase`.
- Functions and variables: `camelCase`.
- Module-level constants: `UPPER_SNAKE_CASE`.
- Hooks: `use` prefix.
- Booleans: descriptive predicates such as `isPlaying`, `hasAudio`, `isDisposed`. Event handlers: `handle` prefix; callback props: `on` prefix.
- File names: `PascalCase.ts`/`.tsx` for a primary class or component (`SceneRenderer.ts`, `SceneCanvas.tsx`); `camelCase.ts` for other modules (`features.ts`, `playback.ts`).
- Co-locate tests as `*.test.ts`.

Prefer domain-specific names (`audioFeatures`, `sceneSeed`, `transientEnvelope`) over vague names such as `data`, `value`, and `manager`. Use abbreviations only when conventional and unambiguous.

### Imports

- Order imports consistently: external dependencies, internal modules, then relative modules and styles/assets.
- Use `import type` for type-only imports.
- Prefer explicit imports over wildcard imports, and avoid circular dependencies.
- Use configured path aliases only if they exist. Do not add aliases without updating the relevant tooling.
- Do not add barrel files that obscure dependency direction.

### Functions and errors

- Keep functions small and focused. Prefer early returns over deeply nested conditionals.
- Do not hide side effects in functions that appear to calculate values. Pass dependencies explicitly when that improves testability.
- Do not mutate input objects unless mutation is part of the documented API contract.
- Do not swallow errors. Catch at meaningful boundaries and surface readable, actionable UI errors for expected failures.
- Include enough technical context in development diagnostics without exposing internals to users.
- Do not use exceptions for ordinary control flow. Guard browser API availability, handle rejected promises, and ignore stale asynchronous results.
- Ensure cleanup happens even when initialization or rendering fails.

## React Conventions

- Use functional components and hooks. Keep each component focused on one responsibility.
- Keep ordinary UI declarative. Avoid deeply nested conditional JSX; extract subcomponents when readability suffers.
- Never store audio sample arrays, feature histories, Three.js objects, or per-frame transforms in React state. Use refs or engine instances for mutable real-time values.
- Do not use effects merely to derive state from other state. Use effects to synchronize with external systems.
- Always provide cleanup when acquiring resources or registering subscriptions.
- Never create Three.js objects, audio graphs, or animation loops as an incidental consequence of ordinary rendering.
- Extract custom hooks only for a meaningful shared abstraction. Memoize only when there is a clear identity or measurement benefit; avoid unnecessary `useMemo` and `useCallback`.
- Ensure components behave correctly under React Strict Mode, with no duplicate loops, audio graphs, renderers, or playback.

## Animation, State, and Lifecycle

- Use exactly one cleaned-up `requestAnimationFrame` loop for the scene canvas, owned by `SceneRenderer`. Do not create loops in components or individual scene objects.
- Clamp large frame deltas after tab suspension. The renderer already uses a bounded delta; preserve that guard.
- Derive procedural motion from a controlled clock rather than wall-clock time where practical. Separate simulation time from real elapsed time.
- Reset motion and analysis envelopes for capture/export. Do not let export inherit editor preview state.
- Avoid per-frame object and array allocations where practical, but do not complicate the first renderer prematurely.
- Invalidate stale callbacks and asynchronous results when a newer operation supersedes them. The audio engine's generation counters are the reference pattern.

Every acquired resource needs an explicit cleanup path: animation frames and timers; `ResizeObserver` and event listeners; audio nodes, sources, streams, and owned contexts; WebGL renderers, geometries, materials, textures, and render targets; post-processing passes; and pending asynchronous work.

Make disposal safe to call more than once where practical. Test cleanup in development Strict Mode.

## Deterministic Visuals and Motion

- Never use `Math.random()` inside the frame loop.
- Derive generated object traits from a scene seed and stable object identity, independent of iteration order where practical. Keep identity stable across selection, resizing, and unrelated configuration changes.
- Use attack/release envelopes for continuous signals and spring/impulse responses for transients.
- Separate resting transforms from reactive transforms. Audio reactions must not overwrite the composed resting state.
- Calculate reactive values from a stable base state rather than accumulating modulation into transforms every frame.
- Bound reactive scale, position, camera movement, light intensity, and bloom. Loud or wide audio must not destroy the composition.
- Use curated palettes, composition rules, and bounded ranges for generated scenes, never unrestricted slider randomization.

## Signal Contract

| Signal      | Range | Neutral | Derivation                                           | Typical use                   |
| ----------- | ----- | ------- | ---------------------------------------------------- | ----------------------------- |
| `level`     | 0–1   | 0       | Fast combined RMS                                    | Breathing, emission           |
| `intensity` | 0–1   | 0       | Slow musical energy                                  | Rotation, camera drift, bloom |
| `impact`    | 0–1   | 0       | Adaptive positive energy rise with refractory period | Spring compression, flare     |
| `balance`   | -1–1  | 0       | Normalized left/right energy                         | Horizontal drift, orbit angle |
| `width`     | 0–1   | 0       | Mid/side energy                                      | Orbit radius, separation      |

- Document normalization assumptions and signal ranges in `src/audio/features.ts`.
- Guard every division and normalization against silent or zero-energy input. Clamp outputs before they reach the renderer.
- Keep `balance` centered and `width` at zero for mono and silence.
- Ensure `impact` decays after a transient and cannot remain permanently elevated.
- Preserve the existing playback and recording route. Add analysis through a separate channel-splitter branch that never connects to an audible destination.

## Audio Lifecycle

- Create a new `AudioBufferSourceNode` for each play/resume; source nodes are one-shot.
- Resume `AudioContext` from a user gesture when browser policy requires it.
- Stop and disconnect old sources on pause, replacement, and disposal. Ignore stale decode and `onended` results after a newer action.
- Keep all audio local. Surface decoding failures as readable UI errors.
- Prevent double playback. The analysis branch must be analysis-only.
- Preserve the original-audio recording tap; analysis and recording are separate concerns.

## Three.js Rendering and Capture

- Use direct Three.js, not declarative per-frame React rendering. Keep renderer initialization, resizing, and disposal inside `SceneRenderer`.
- Keep CSS-pixel layout separate from renderer backing resolution. Cap device pixel ratio sensibly.
- Use a `ResizeObserver` and resize the renderer, camera, and post-processing targets together.
- Avoid reconstructing the scene when a small configuration property changes.
- Obtain the early-CGI look through geometry, composition, materials, environment maps or matcaps, lighting, and motion before adding post effects.
- Bloom is selective and restrained. Avoid washing out materials, excessive glow, and unnecessary full-screen effects.
- Dispose geometries, materials, textures, render targets, passes, and renderers when replaced or unmounted. Make ownership of shared resources explicit; never dispose a shared resource while another object still references it.
- Keep interface elements outside the captured artwork. Preserve aspect ratio and never stretch the 3D scene.
- The current capture is a five-second technical spike, not a full-track exporter. Reuse the `SceneCaptureHandle` contract (`beginCapture`, `endCapture`, `resetMotion`) in `src/export/captureTypes.ts` rather than rewriting exporter orchestration.
- Do not build the Milestone 4 exporter, resolution matrix, or capability messaging until that milestone is authorized.

## Interface and Accessibility

- Preserve the workspace model: large canvas, right-side inspector, and full-width transport below.
- Use Scene, Object, World, and Finish inspector views to contain complexity. Do not force every control to remain visible at once.
- Keep controls labeled, keyboard accessible, and visually subordinate to the artwork. Use consistent spacing, typography, sizing, and states.
- Do not add fake, disabled, or decorative placeholder controls. Provide meaningful empty, loading, error, and unavailable states.
- The welcome state offers Blank scene and Load starter scene as real actions. Editing keeps the editor open when the last object is removed.
- Give every control an accessible name. Use semantic HTML, visible focus indicators, sufficient contrast, and labels associated with their controls.
- Do not communicate state using color alone. Support reduced-motion preferences for interface transitions and avoid unnecessary interface motion.
- Hide meaningless scene-graph internals from assistive technology. All editing actions need accessible controls and meaningful feedback.

## Dependencies and Performance

- Prefer browser APIs and small pure modules over dependencies.
- Three.js is the approved scene/rendering dependency. Add post-processing or UI dependencies only when they replace meaningful complexity.
- Do not add a dependency for simple math, seeded hashing, class names, or state subscription. Check whether an existing dependency already solves the problem.
- Keep dependency additions limited and explain their architectural value.
- Measure before introducing workers, geometry atlases, instancing frameworks, or other optimization layers.
- Avoid per-frame object and array churn where practical. Keep audio processing lightweight and independent of audio buffer size where possible.
- Avoid unnecessary React rerenders during playback.
- Cap excessive DPR, bloom resolution, and geometry detail when needed to keep the default scene responsive.
- Target smooth desktop Chromium preview and 30 FPS real-time capture/export. Document measured limitations honestly; never claim an improvement without measurement.

## Testing and Manual Verification

- Use Vitest and place focused tests next to the module under test.
- Add tests when changing pure audio features, envelopes, springs, scene validation, deterministic generation, sizing, or export helpers.
- Test observable behavior, not internal call sequences. Keep tests deterministic; prefer controllable clocks or mocked browser APIs over arbitrary timeouts.
- Cover relevant edge cases: empty inputs, zero and silent audio, mono audio, invalid or out-of-range values, very large values, negative or large deltas, deterministic seeds, stable identities, and invalid scene configurations.

After audio changes, manually verify upload, play, pause/resume, seeking, track end and restart, replacement, volume independence, mono and stereo behavior, silence behavior, cleanup, and stale asynchronous handling.

After rendering changes, verify the empty scene, starter scene, object editing, resizing, tab suspension and restoration, silent playback, fullscreen preview, post-processing, and GPU resource cleanup.

When export work is authorized, verify a valid MP4 container, original stereo audio, synchronized visuals, correct aspect ratio, post-processing output, duration, cancellation cleanup, and playback after both completion and failure. For the current capture spike, verify the five-second file, header check, and resource cleanup. Do not claim export correctness from file generation alone.

## Documentation and Git

- Preserve `docs/roadmap.md`. Do not silently expand milestone scope. Update checkboxes only after behavior is implemented and verified.
- Update `CHANGELOG.md` for every notable user-visible, behavioral, performance, or architectural change. Add entries under `## [Unreleased]` using Keep a Changelog categories. Do not rewrite released entries; move `Unreleased` entries under a dated version heading when releasing.
- Keep `README.md` accurate about implemented functionality. Do not present roadmap items as working features. Keep setup, limitations, privacy, and accessibility statements current.
- Update this file when architecture, scope, commands, code conventions, validation requirements, or dependency policies change.
- Keep commits focused. Inspect the working tree before destructive changes; do not overwrite or revert changes you did not introduce. Do not commit, push, or publish unless explicitly requested.
- Do not commit build artifacts, temporary files, secrets, credentials, private audio, or user data.
- Change the lockfile only for approved dependency changes.
- Review the diff for unrelated modifications, dead code, debug logging, unused imports, accidental dependencies, generated files, and scope violations.

## Workflow and Definition of Done

For each task:

1. **Understand** — Read the relevant source, `docs/roadmap.md`, and existing conventions. Identify the current milestone and whether the behavior already exists.
2. **Plan** — Choose the smallest set of files, define layer ownership, and identify lifecycle and testing implications.
3. **Implement** — Make focused changes, preserve working behavior, keep types explicit, and handle errors and cleanup.
4. **Validate** — Run the relevant `pnpm` scripts, plus the required manual browser checks for audio, rendering, and capture.
5. **Document** — Update the changelog, README, roadmap, and this file only when their content actually changed.
6. **Report** — Summarize what changed, key decisions, affected areas, validation performed, manual checks, and limitations. Distinguish checks that passed from checks that were not performed.

A change is complete only when:

- The requested behavior is implemented, respects the current milestone, and meets the project's aesthetic standards.
- TypeScript, lint, tests, and the production build pass as applicable, and required manual verification and cleanup checks are complete.
- Documentation is updated where necessary.

Compilation alone is never sufficient evidence of completion.

## Provenance

The codebase was adapted from `typo`. Keep its proven playback, stereo-analysis tap, and capture-orchestration patterns. Do not reintroduce its spectrum processor, logarithmic bands, glyph assignments, fonts, or Canvas 2D typographic renderer. The current export contract is `SceneCaptureHandle` in `src/export/captureTypes.ts`.

## Final Decision Rule

When choosing between two implementations, prefer the one that:

- Respects the current milestone.
- Preserves the project's visual identity.
- Keeps responsibilities clearly separated.
- Is deterministic and testable.
- Has explicit lifecycle and cleanup behavior.
- Uses fewer dependencies.
- Introduces less complexity.
- Preserves existing working functionality.

Build the smallest robust implementation that produces the intended artistic result. Do not sacrifice visual quality, determinism, or architectural clarity for unnecessary flexibility.
