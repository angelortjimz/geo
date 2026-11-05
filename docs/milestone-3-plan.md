# Milestone 3 — Creative and Performance Polish Implementation Plan

> **Status:** Steps 1 and 2 (scene document foundation, six primitives, and five materials) are implemented. Browser visual tuning and manual verification of the expanded library remain, as do generation, aspect UI, fullscreen, broader behavior tuning, and profiling. Automated checks pass for the completed steps.

This plan implements only the Milestone 3 checklist in [`roadmap.md`](roadmap.md). Full-track export, the resolution matrix, persistence, timeline/keyframes, viewport picking, transform gizmos, orthographic camera, and the perspective-grid world mode remain out of scope.

## Confirmed decisions

| Area | Decision |
| --- | --- |
| Primitives | Torus, torus knot, box, icosphere (the existing `icosahedron` kind), cone, cylinder |
| Materials | Chrome, glossy plastic, matte, emissive, wireframe |
| Wireframe | A material kind with an optional emission/glow and selective bloom |
| Default aspect ratio | 16:9, letterboxed inside the canvas stage |
| Generation | Scene inspector seed + **Generate scene**, with dirty-scene confirmation |
| Object mutation | Object inspector **Mutate object**, preserving identity, position, and scale |
| Intensity behavior | Add per-object `reaction.energy` so sustained loudness accelerates rotation |
| Global performance controls | Deferred; this milestone tunes existing mappings and adds energy spin |

## Goals

- Complete the curated primitive and material libraries without making the editor feel like a general-purpose 3D suite.
- Make generated scenes deterministic, coherent, bounded, and editable as ordinary scene configuration.
- Give the viewport a real aspect-format frame and a clean fullscreen preview.
- Make audio response legible across quiet, loud, sparse, bass-heavy, mono, and wide-stereo material without destroying the composed resting pose.
- Improve accessibility and remove measurable per-frame allocation and rendering overhead.

## Step 1 — Scene document foundation

Extend the versioned document so later steps have one source of truth.

Files:

- `src/scene/sceneConfig.ts`
  - Bump `SCENE_VERSION` to 3.
  - Add `cone`, `cylinder`, and `torusKnot` primitives.
  - Add `matte` and `wireframe` materials.
  - Add `ReactionConfig.energy`.
  - Add `SceneCanvasConfig.format` using `AspectRatioKind`.
  - Add `SceneConfig.generationSequence` for deterministic repeated mutations.
  - Add canonical kind lists and labels.
- `src/scene/aspectRatio.ts`
  - Own the aspect-format kind, labels, numeric ratios, and runtime guard.
- `src/scene/sceneLimits.ts`
  - Add energy, seed, and generation-sequence ranges.
- `src/scene/sceneDefaults.ts`
  - Add `DEFAULT_CANVAS`, default energy, and wireframe emission defaults.
- `src/scene/sceneNormalize.ts`
  - Normalize every new enum, number, and canvas field.
- `src/scene/sceneOperations.ts`
  - Add seed and canvas-format setters; preserve the format when the DPR cap changes.
- `src/scene/starterScene.ts`
  - Use the canonical canvas default and add energy values to the starter objects.

Tests cover version 3, new enum values, seed and generation-sequence clamping, invalid aspect fallback, and canonical defaults.

## Step 2 — Six primitives and five materials

The renderer half of this step landed with Step 1 because the expanded unions must stay exhaustive. Inspector exposure landed in Step 2.

- ~~Add cone, cylinder, and torus-knot geometry to `src/render/objectFactory.ts`.~~
- ~~Add matte and wireframe material presets.~~
- ~~Make wireframe participate in selective bloom when it has emission.~~
- ~~Update the Object inspector options, detail hint, and emission controls.~~
- ~~Keep geometry keyed by primitive and detail; keep material changes in place.~~
- Tune the new presets against the starter scene and representative compositions in the browser.

Tests cover every primitive, detail escalation, matte values, wireframe flag, and material-key stability.

## Step 3 — Seeded generation and selected-object mutation

New pure modules:

- `src/scene/seededRandom.ts`
  - Deterministic hashing and bounded random selection; no `Math.random()`.
- `src/scene/generation.ts`
  - Curated palettes and bounded composition templates.
  - `createGeneratedScene(seed)`.
  - `mutateSceneObject(scene, id)`.
  - Mutations preserve identity, transform, and object sequence, and increment `generationSequence`.

Editor:

- Generation and mutation actions in `sceneEditorState.ts`.
- Dirty-scene confirmation for generation.
- Seed and **Generate scene** controls in the Scene inspector.
- **Mutate object** in the Object inspector.
- Accessible status feedback for generation and mutation.

Tests cover determinism, palette validity, object bounds, mutation stability, confirmation, cancel, and consecutive actions.

## Step 4 — Fullscreen preview, aspect ratios, and viewport controls

- Add fitted-size calculation to `src/scene/aspectRatio.ts`.
- Frame the canvas inside the stage at the selected aspect ratio.
- Resize the renderer and post-processing targets to the framed canvas.
- Add a keyboard-accessible fullscreen preview control using the Fullscreen API.
- Apply `inert` to the rest of the workspace while fullscreen.
- Disable fullscreen while capture is active so canvas dimensions stay stable.
- Add aspect-format and DPR-cap controls to the Scene inspector.
- Keep capture output free of letterboxing and interface elements.

## Step 5 — Behavior tuning and accessibility

- Move loudness shaping into a pure helper.
- Add energy-driven rotation from `intensity`.
- Reuse reaction result objects to avoid per-frame allocation.
- Add synthetic audio tests for quiet, loud, sparse, mono, wide, and silent material.
- Verify the response in the browser with representative tracks.
- Add labels, focus-visible states, fullscreen focus handling, live status regions, and reduced-motion coverage for all interface transitions.

## Step 6 — Performance profiling

- Reuse camera-position and impact-scale results.
- Cap bloom target resolution independently from the main renderer.
- Measure DPR, bloom, reflection, geometry detail, and object count in desktop Chromium.
- Expose the DPR cap as a user-facing quality control.
- Record measured results and any remaining limitations in `docs/code-quality-audit.md`.

## Step 7 — Documentation and verification

- Update `CHANGELOG.md`, `README.md`, the roadmap checkboxes, the code-quality audit, and `AGENTS.md` as behavior is implemented and verified.
- Run `pnpm format`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
- Manually verify the library, generation, aspect formats, fullscreen, keyboard flow, audio tuning, capture, Strict Mode cleanup, and GPU cleanup in desktop Chromium.

## Risks

- Fullscreen focus management and browser Fullscreen API rejection.
- Aspect framing interacting with resize, camera drag, and capture dimensions.
- Generated compositions becoming incoherent or unbounded.
- Wireframe bloom washing out the scene.
- Per-frame allocation refactors changing existing behavior.
- The version bump touching every normalization, default, and test consumer.
