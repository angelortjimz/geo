# Milestone 2 — Blank Scene Editor Implementation Plan

> **Status:** Implementation complete. Steps 1–4 and the documentation step are done. Automated checks pass. The editor was verified in headless Chromium with software WebGL: welcome flow, object editing, all four inspector views, world/floor modes, camera drag and wheel, resize, playback, pause, keyboard tabs, and selection. The five-second MP4 capture could not be re-run in that build because it ships without H.264/AAC `MediaRecorder` codecs; capture remains a production-Chromium manual check.

This plan implements only the Milestone 2 checklist in [`roadmap.md`](roadmap.md). Seeded generation, the complete primitive/material libraries, fullscreen preview, aspect-ratio formats, viewport picking, transform gizmos, and full-track export remain in later milestones.

## Confirmed scope

| Area         | Milestone 2 decision                                                    |
| ------------ | ----------------------------------------------------------------------- |
| Primitives   | Torus, box, icosahedron                                                 |
| Materials    | Chrome, glossy plastic, emissive                                        |
| Floors       | None, reflective, checkerboard                                          |
| Camera       | Spherical orbit parameters; drag and wheel navigate the authored camera |
| Selection    | Inspector object list only; no viewport picking                         |
| Object names | Generated deterministically; not editable yet                           |
| Capture      | Keep the five-second technical spike, now recording the edited scene    |

Explicitly excluded: perspective grid, orthographic camera, matte and wireframe materials, sphere/cone/cylinder/torus-knot, seeded generation, object reordering, rename, persistence, and full export.

## Goals

- Generalize the fixed visual study into a scene document with stable object identities.
- Let a user start from a blank scene or load the starter scene, then add, select, duplicate, and remove objects.
- Expose form, transform, material, motion, reaction, world, camera, and finish controls through four inspector views.
- Keep every reactive transform derived from the composed base state so audio never overwrites the edit.
- Keep all scene state session-local. No `localStorage`, autosave, scene files, accounts, or backend.

## Step 1 — Scene document and pure modules (done)

New modules under `src/scene/`:

| File                 | Responsibility                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `sceneConfig.ts`     | Versioned `SceneConfig` document, discriminated unions, `SCENE_VERSION`                                                     |
| `sceneLimits.ts`     | Numeric ranges, integer/vector clamping, color validation, degree wrapping, fog and floor fade ordering, object-count limit |
| `sceneNormalize.ts`  | Total normalization for a typed document (objects, world, camera, finish)                                                   |
| `sceneOperations.ts` | Immutable add, duplicate, remove, object patch, and world/camera/finish setters                                             |
| `starterScene.ts`    | `createBlankScene()` and `createStarterScene()`                                                                             |
| `camera.ts`          | Pure spherical camera position plus drag and zoom patches                                                                   |

`scene/study.ts` is retained until the renderer step replaces it, so the repository keeps compiling at every step.

### Document shape

```text
SceneConfig
├── version: 2, seed, objectSequence
├── canvas { dprCap }
├── objects[]
│   ├── id, name                      stable, never reused
│   ├── form { primitive, detail, flatShading }
│   ├── transform { position, rotation (degrees), scale }
│   ├── material { kind, color, gloss, emission }
│   ├── motion { spin, float, floatSpeed, orbitRadius, orbitSpeed, phase }
│   └── reaction { breathe, strike, flare, drift, expand }
├── world
│   ├── backdrop: solid | gradient
│   ├── floor: none | reflective | checkerboard
│   ├── fog: none | linear
│   └── lighting: ambient + key + fill color/intensity
├── camera { target, distance, azimuth, elevation, fov, drift }
└── finish { exposure, bloom { enabled, threshold, strength, radius } }
```

Object identities come from a document-level `objectSequence`, so ids and generated names are deterministic, stable across selection and resize, and never reused after deletion. `seed` stays in the document for Milestone 3 generation but is not exposed in the interface.

Geometry is built at unit size per primitive; proportions come from the transform's non-uniform scale. The orbit center is the object's base position, so `orbitRadius: 0` means no orbit. Per-object reaction values replace the previous global `audioResponse`.

## Step 2 — Renderer generalization (done)

- Make `SceneRenderer` own `Map<string, ObjectRuntime>` instead of two baked meshes.
- Add `applyConfig(next: SceneConfig)` that diffs objects by id, rebuilds geometry only when `primitive:detail` changes, rebuilds materials only when `kind:color:gloss:flatShading` changes, updates transforms in place, and disposes removed objects.
- Generalize world assembly: backdrop textures regenerated only when their colors change, floor mode switches dispose the previous reflector/plane, fog and lighting update in place.
- Map camera document values onto the perspective camera; keep drift as a bounded additive sine.
- Preserve the single `requestAnimationFrame` loop, post-processing chain, capture target, reset semantics, and full disposal.
- Derive subtle autonomous wobble from a hash of the stable object id instead of the previous hard-coded hero constants.

Extract `render/objectFactory.ts` for primitive geometry and material construction. Rename `studyTextures.ts` to `sceneTextures.ts` and add the checkerboard floor shader.

## Step 3 — Canvas, camera navigation, capture (done)

- `SceneCanvas` accepts the live scene and applies it to the renderer without recreating the loop.
- Pointer drag orbits azimuth/elevation; wheel zooms distance. Both clamp and write through the editor update functions.
- Numeric camera controls in the World inspector keep navigation keyboard accessible.
- Capture keeps the existing `SceneCaptureHandle` contract and uses the live scene's backdrop/fog color for the letterbox fill.

## Step 4 — Editor state and interface (done)

- `editor/useSceneEditor.ts` owns the scene document, selection, `welcome | editing` mode, and dirty tracking.
- Loading the starter or starting blank while dirty shows an inline confirmation before replacing the in-memory scene.
- Removing the last object keeps the editor open with a real "Add object" action; the welcome overlay does not return mid-session.
- Inspector tabs: Scene (object list, add, duplicate, remove), Object (form, surface, motion, reaction), World (backdrop, floor, fog, lighting, camera), Finish (exposure, bloom).
- Shared labeled field controls (`SliderField`, `NumberField`, `ColorField`, `SelectField`, `Vector3Field`, `ToggleField`) with accessible names and clamped commits.
- Scene editing is disabled with a stated reason while the five-second capture is active.
- Styles extend the existing restrained workspace shell; no controls appear inside the artwork.

## Step 5 — Tests and documentation (done)

Unit tests:

- `sceneLimits.test.ts`: clamping, colors, degree wrapping, fog and fade ordering.
- `sceneNormalize.test.ts`: fallbacks, range clamping, color sanitization, object-count limit.
- `sceneOperations.test.ts`: ids, sequence, duplicate offset, removal, immutable patches, max-count guard.
- `starterScene.test.ts`: blank is empty, starter is representable, normalized, and framed like the study.
- `camera.test.ts`: spherical position, clamps, drag and zoom determinism.

Documentation: update `CHANGELOG.md`, `README.md`, the roadmap checkboxes (only after browser verification), and the project structure in `AGENTS.md`.

## Verification

Automated: `pnpm typecheck`, `pnpm lint`, `pnpm test` (78 tests across 13 files), and `pnpm build` pass. Prettier was applied to touched files.

Verified in headless Google Chrome 154 with SwiftShader at 1280×900 and 1000×760:

1. The welcome overlay offers Blank scene and Load starter scene; both open editable scenes and the starter matches the original study framing.
2. A blank scene can be built into a multi-object composition through the Scene and Object inspectors; add, duplicate, and selection work, and the 12-object limit disables Add object and shows the limit hint.
3. The starter scene is ordinary configuration, remains attractive while paused, and reacts during stereo playback with bounded breathing, rotation, satellite drift, and flare.
4. Removing an object selects a neighboring object; removing the last object keeps the editor open with an active Add object action, no welcome overlay, and the empty-state guidance.
5. Backdrop solid/gradient, floor none/reflective/checkerboard, bloom off, and the associated floor/backdrop rebuild paths render without console errors.
6. Camera drag and wheel navigate the live scene; the World tab's numeric camera controls and object position commits apply and clamp. Number commits use `valueAsNumber`, so comma-locale input is safe.
7. Keyboard arrow navigation switches inspector tabs with roving focus; the DOM audit reports no unlabeled controls and no duplicate ids.
8. Resizing from 1280×900 to 1000×760 resizes the renderer backing store and preserves the composition.
9. Playback, pause/resume, seeking (verified to a 0:04 readout), and track replacement remain functional through the editor. Unsaved replacement confirmation can be cancelled without changing the scene.

Not re-verified in this environment:

- Five-second MP4 capture. Headless Chrome 154 reports no H.264/AAC `MediaRecorder` support, so the app correctly surfaces the unsupported-browser message. The capture path was verified in Milestone 1 in production Chromium; re-run the five-second capture in production Chromium after visual changes before release.
- GPU resource release and Strict Mode loop count were verified in Milestone 1. The renderer generalization keeps the same single loop and disposal ownership, but a production-Chromium cleanup pass is still advisable.

## Risks

- Renderer diffing and disposal correctness (objects, floor, backdrop textures) is the main failure surface.
- React rerenders on slider input are acceptable if renderer updates stay in-place field writes.
- Reflector recreation should happen only on floor-mode changes, not on every size or fade edit.
