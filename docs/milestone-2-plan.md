# Milestone 2 — Blank Scene Editor Implementation Plan

> **Status:** In progress. Step 1 (scene document, limits, normalization, operations, starter/blank factories, camera math) is implemented and passes type check, lint, unit tests, and the production build. Renderer generalization, editor UI, and browser verification are not started.

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

## Step 2 — Renderer generalization

- Make `SceneRenderer` own `Map<string, ObjectRuntime>` instead of two baked meshes.
- Add `applyConfig(next: SceneConfig)` that diffs objects by id, rebuilds geometry only when `primitive:detail:flatShading` changes, updates materials and transforms in place, and disposes removed objects.
- Generalize world assembly: backdrop textures regenerated only when their colors change, floor mode switches dispose the previous reflector/plane, fog and lighting update in place.
- Map camera document values onto the perspective camera; keep drift as a bounded additive sine.
- Preserve the single `requestAnimationFrame` loop, post-processing chain, capture target, reset semantics, and full disposal.
- Derive subtle autonomous wobble from a hash of the stable object id instead of the previous hard-coded hero constants.

Extract `render/objectFactory.ts` for primitive geometry and material construction. Rename `studyTextures.ts` to `sceneTextures.ts` and add the checker texture.

## Step 3 — Canvas, camera navigation, capture

- `SceneCanvas` accepts the live scene and applies it to the renderer without recreating the loop.
- Pointer drag orbits azimuth/elevation; wheel zooms distance. Both clamp and write through the editor update functions.
- Numeric camera controls in the World inspector keep navigation keyboard accessible.
- Capture keeps the existing `SceneCaptureHandle` contract and uses the live scene's backdrop/fog color for the letterbox fill.

## Step 4 — Editor state and interface

- `editor/useSceneEditor.ts` owns the scene document, selection, `welcome | editing` mode, and dirty tracking.
- Loading the starter or starting blank while dirty shows an inline confirmation before replacing the in-memory scene.
- Removing the last object keeps the editor open with a real "Add object" action; the welcome overlay does not return mid-session.
- Inspector tabs: Scene (object list, add, duplicate, remove), Object (form, surface, motion, reaction), World (backdrop, floor, fog, lighting, camera), Finish (exposure, bloom).
- Shared labeled field controls (`SliderField`, `NumberField`, `ColorField`, `SelectField`, `Vector3Field`, `ToggleField`) with accessible names and clamped commits.
- Scene editing is disabled with a stated reason while the five-second capture is active.
- Styles extend the existing restrained workspace shell; no controls appear inside the artwork.

## Step 5 — Tests and documentation

Unit tests:

- `sceneLimits.test.ts`: clamping, colors, degree wrapping, fog and fade ordering.
- `sceneNormalize.test.ts`: fallbacks, range clamping, color sanitization, object-count limit.
- `sceneOperations.test.ts`: ids, sequence, duplicate offset, removal, immutable patches, max-count guard.
- `starterScene.test.ts`: blank is empty, starter is representable, normalized, and framed like the study.
- `camera.test.ts`: spherical position, clamps, drag and zoom determinism.

Documentation: update `CHANGELOG.md`, `README.md`, the roadmap checkboxes (only after browser verification), and the project structure in `AGENTS.md`.

## Verification

Automated: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format` on touched files.

Manual desktop Chromium checks after the interface lands:

1. Welcome overlay offers Blank scene and Load starter scene as real actions.
2. Blank scene can be built into a multi-object composition through every inspector group.
3. Starter scene loads as ordinary configuration and remains attractive while paused and silent.
4. Add, duplicate, remove, select, and delete-all cycles leave no stale objects or GPU leaks.
5. Audio playback, mono/silent neutrality, seeking, volume independence, and restart keep working.
6. Camera drag, wheel, inspector values, and reset behave consistently with drift.
7. Every backdrop, floor, fog, and bloom combination renders; resizing and tab restore are stable.
8. Five-second capture still produces a valid MP4 of the edited scene.
9. Strict Mode shows one render loop, one `AudioContext`, and one source; disposal is clean.

## Risks

- Renderer diffing and disposal correctness (objects, floor, backdrop textures) is the main failure surface.
- React rerenders on slider input are acceptable if renderer updates stay in-place field writes.
- Reflector recreation should happen only on floor-mode changes, not on every size or fade edit.
