# Code Quality Audit

Audit of the Milestone 2 codebase (approximately 7,000 lines under `src/`), focused on
repetition, consistency, and refactor opportunities. Baseline at audit time: `pnpm lint`,
`pnpm typecheck`, and `pnpm test` (78 tests) all passed.

Items are ordered by payoff. Status reflects the first remediation pass.

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

## Backlog

### High value

4. **`useSceneEditor` state handling.** Add/duplicate/remove read render-captured `scene` and
   `selectedObjectId`, while patch actions use functional updates. Two actions dispatched in
   one event can lose the first update. Moving the editor to `useReducer` would remove this
   class of bug, centralize dirty marking, and make the hook testable (it currently has no
   tests).
5. **`SceneRenderer` internal duplication.** `resetMotion` and `syncAudioRevision` repeat the
   same per-runtime transient reset; extract a helper. `syncFloor` accepts the whole
   `WorldConfig` only to read the backdrop horizon. `createFloor` repeats plane setup, and
   `updateFloor` repeats shared fade uniforms.
6. **`captureSpike.ts` size.** The 451-line module mixes pure helpers (MIME candidates,
   MP4 header check, filename sanitizing, support detection) with orchestration. Extracting
   the pure helpers into `captureSupport.ts` would improve unit-testability without expanding
   the Milestone 4 exporter scope.

### Smaller cleanups

- Remove the unused `AudioEngine.isPlaying()` method and unexport the internal-only camera
  sensitivity constants.
- Simplify redundant naming in `addObject`: `createObjectConfig` builds a name that
  `addObject` immediately overwrites.
- Move `SceneCanvas` ref assignments out of render and into effects to avoid concurrent-React
  tearing.
- Extract the nested transport status ternary in `App.tsx` into a named helper or component.
- `AudioEngine` and `CaptureSpike` duplicate external-store scaffolding (`listeners`,
  `getSnapshot`, `subscribe`, `updateSnapshot`). A shared `createExternalStore<T>` is only
  worth it if a third store appears.
- Four modules define a local `clamp` helper. Consolidation would cross the scene, motion, and
  render layers and is not worth a new shared module yet.

## Verification performed

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Browser checks for the capture reset and inspector rendering are still required before the
change is considered complete.
