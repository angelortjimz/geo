# Code Quality Audit

Audit of the Milestone 2 codebase (approximately 7,000 lines under `src/`), focused on
repetition, consistency, and refactor opportunities. Baseline at audit time: `pnpm lint`,
`pnpm typecheck`, and `pnpm test` (78 tests) all passed.

Items are ordered by payoff. Status reflects the remediation passes.

## 1. Capture never reset motion or analysis envelopes — fixed

`SceneCaptureHandle.resetMotion` existed in `src/export/captureTypes.ts`, was exposed by
`SceneCanvas`, and was implemented by `SceneRenderer`, but no caller used it. A capture
therefore started from the preview's current clock, orbit angles, spring state, and smoothed
stereo values.

`CaptureSpike.start()` now calls `handle.resetMotion()` after a successful `beginCapture()`,
so every capture starts from the composed resting state.

Remaining manual check: record a capture after orbiting an object for several seconds and
confirm the exported frames start from the authored pose.

## 2. Default configuration was duplicated and had drifted — fixed

Defaults previously lived in three places:

- per-field fallbacks in `src/scene/sceneNormalize.ts`
- literal blank-scene values in `src/scene/starterScene.ts`
- backdrop/floor/fog constructors in `src/components/inspector/WorldPanel.tsx`

They had already diverged: camera distance `11.6` vs `11.64`, exposure `1.08` vs `1.05`, and
checker dark color `#b9c1c1` vs `#8f9c9f`. Changing a default in one place could silently fail
to reach the others.

`src/scene/sceneDefaults.ts` now owns the canonical defaults (`DEFAULT_SEED`,
`DEFAULT_DPR_CAP`, `DEFAULT_GRADIENT_BACKDROP`, `DEFAULT_REFLECTIVE_FLOOR`,
`DEFAULT_CHECKER_FLOOR`, `DEFAULT_LINEAR_FOG`, `DEFAULT_LIGHTING`, `DEFAULT_CAMERA`,
`DEFAULT_BLOOM`, `DEFAULT_FINISH`, `DEFAULT_WORLD`). Normalization fallbacks, the blank and
starter scenes, and the World inspector constructors all reference those constants.

The canonical values are the tuned editor values: distance `11.64`, exposure `1.08`, and
checker dark `#8f9c9f`. The blank scene now uses exposure `1.08` instead of `1.05`.

### Remaining drift found during remediation — fixed

The first defaults pass missed three copies:

- `src/scene/camera.ts` still used fallback distance `11.6` and elevation `18`.
- `src/scene/sceneNormalize.ts` still hardcoded DPR cap `2`.
- Checker-floor normalization used the reflective floor size as its fallback.

All three now reference the canonical constants. New-object styling also lives in
`sceneDefaults.ts` (`DEFAULT_OBJECT_FORM`, `DEFAULT_OBJECT_MATERIAL`,
`DEFAULT_OBJECT_MOTION`, `DEFAULT_OBJECT_REACTION`) instead of being duplicated between
`sceneOperations.ts` and normalization. `sceneDefaults.test.ts` verifies that canonical
defaults stay inside their editable ranges and that new objects use those values;
`sceneNormalize.test.ts` verifies that non-finite values fall back to the canonical defaults.

## 3. Inspector field repetition — fixed

- `SliderField` now takes a shared `range: NumericRange` instead of a `minimum`/`maximum`
  pair. This removed 37 repeated pairs of prop assignments across `ObjectPanel`,
  `WorldPanel`, and `FinishPanel`, and keeps displayed bounds tied to the same limits used
  by normalization.
- Shared formatters live in `src/components/inspector/formatters.ts` (`formatPercent`,
  `formatUnits`, `formatDegrees`, `formatRadiansPerSecond`), replacing repeated inline
  `toFixed` templates.
- `WorldPanel` extracts `FloorDistanceFields`, removing the duplicated size/fade sliders from
  the reflective and checker branches.

## 4. `useSceneEditor` state handling — fixed

Add/duplicate/remove previously read render-captured `scene` and `selectedObjectId`, while
patch actions used functional updates. Two actions dispatched in one event could lose the
first update.

Editor workflow state now lives in `src/editor/sceneEditorState.ts` as a pure reducer. The
hook is a thin adapter around `useReducer`, and `selectedObject` remains derived. Dirty
marking is centralized, dirty replacement confirmation is unchanged, and reducer tests cover
welcome replacement, selection after add/duplicate/remove, consecutive actions, limits,
no-ops, and confirm/cancel flows.

## 5. `SceneRenderer` internal duplication — fixed

- `resetMotion` and `syncAudioRevision` share `resetTransientSignals`; motion reset additionally
  resets the clock, orbit phase, and spin.
- `syncFloor` accepts only the floor and horizon color instead of the whole `WorldConfig`.
- Reflective and checker floors share mesh placement, and `updateFloor` applies shared scale,
  horizon, and fade uniforms once before branching on floor-specific colors.
- Reflective-floor material validation happens before the mesh is attached to the scene, so a
  failed construction cannot leave an orphan.

## 6. `captureSpike.ts` size — fixed

Pure helpers now live in `src/export/captureSupport.ts`: MIME candidates, supported-codec
selection, MP4 `ftyp` header validation, and safe filename creation. `CaptureSpike` keeps
browser capability detection and capture orchestration. Tests moved to
`captureSupport.test.ts`; behavior is unchanged.

## Smaller cleanups — fixed

- Removed the unused `AudioEngine.isPlaying()` method.
- Unexported the internal-only camera sensitivity constants.
- Removed the redundant `addObject` rename; object naming now has one path.
- Moved `SceneCanvas` prop-to-ref synchronization out of render and into an effect.
- Extracted the transport status copy in `App.tsx` into `getTransportMessage`.
- Moved the World inspector's azimuth slider range into `sceneLimits.ts` with the other shared ranges.

## Deferred

- `AudioEngine` and `CaptureSpike` still duplicate external-store scaffolding (`listeners`,
  `getSnapshot`, `subscribe`, `updateSnapshot`). A shared `createExternalStore<T>` is only
  worth it if a third store appears.
- Four modules still define a local `clamp` helper. Consolidation would cross the scene,
  motion, and render layers and is not worth a shared module yet.

Both deferrals follow the new refactor threshold in `AGENTS.md`: domain invariants are
single-sourced immediately, generic one-line utilities wait for a third use.

## Verification performed

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (99 tests)
- `pnpm build`

## Manual checks still required

- Record a capture after orbiting an object and confirm the export starts from the authored
  resting pose.
- Verify inspector controls, camera drag/zoom, and capture preparation still update and lock
  the existing renderer correctly.
- Verify capture completion, cancellation, and failure cleanup in the browser.
- Run one development Strict Mode pass to confirm there is no duplicate renderer, animation
  loop, or audio graph.
- Verify all six primitives and five materials, including matte shading and wireframe bloom,
  across the blank and starter scenes in desktop Chromium.
