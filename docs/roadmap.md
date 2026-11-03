# geo — Product and Implementation Roadmap

> **Product vision:** A blank canvas for constructing pristine, dreamlike CGI objects that breathe with loudness, recoil from transients, and move through stereo space—with one excellent optional starter scene and full-track MP4 export.

## 1. Product Direction

geo is an **audio-played CGI scene composer**, not an audio visualizer.

In typo, the spectrum is the artwork. In geo, the scene is the artwork and audio performs it. A composition must remain attractive and intentional while paused or silent. There will be no waveforms, frequency axes, bars, or visible analysis data.

The first release should feel like a focused artistic instrument rather than a general-purpose 3D suite. It favors a small set of polished forms, materials, worlds, and behaviors over unrestricted complexity.

### North-star composition

A low-polygon chrome object floats above an infinite reflective floor. It rotates slowly on its own, breathes with loudness, and compresses with a springy motion on transients. Stereo position moves a satellite gently through space, while stereo width expands its orbit. Strong impacts briefly illuminate the object. The image feels like a pristine recovered 1994 rendering, not a modern game engine covered by a retro filter.

## 2. Confirmed Decisions

| Area | Decision |
| --- | --- |
| Dominant aesthetic | Clean, surreal early CGI; no heavy glitch or constant degradation |
| Initial experience | Empty scene with optional starter-scene action |
| Audio signals | Loudness, transients, and some stereo information |
| Initial stereo signals | Normalized balance and mid/side-derived width |
| Scene persistence | Session-local only; no localStorage, autosave, or scene files |
| Audio input | Local file upload and drag-and-drop, adapted from typo |
| Framework | React with strict TypeScript |
| Build tooling | Vite with pnpm 12.6.0 |
| Rendering | Direct Three.js and WebGL, not React Three Fiber |
| Animation | One `requestAnimationFrame` loop outside React rendering |
| Interface | Large canvas, right inspector, full-width transport below |
| Browser target | Desktop Chromium first |
| Export | Full-track real-time MP4 with original audio, adapted from typo |
| Backend/privacy | None; local-only audio and no analytics |

## 3. Art Direction

### Visual principles

- **Pristine digital surrealism:** simple objects in impossible but carefully composed worlds.
- **Negative space:** sparse arrangements take priority over object count.
- **Material character:** chrome, glossy plastic, matte surfaces, emissive accents, and wireframe.
- **Computational simplicity:** low-polygon options, simple colored lights, stylized reflections, gradients, fog, and basic floors.
- **Autonomous motion:** slow rotation, floating, orbiting, and camera drift exist independently of audio.
- **Controlled finish:** clean antialiasing and selective bloom; bloom must not wash out the scene.

The early-CGI identity should come from geometry, materials, lighting, composition, and motion—not from indiscriminately adding grain, pixelation, RGB separation, or fake operating-system chrome.

Heavy glitch, constant grain, aggressive pixelation, and impact distortion are excluded from the initial scope. They can be reconsidered only as a later, separate artistic direction.

### Reference interpretation

**Silicon Dreams and Animation Tour** contribute sparse surreal environments, geometric artifacts, reflective surfaces, infinite floors, simple lighting, and slightly awkward computational motion. Low-poly forms and smooth chrome can coexist.

**Uncanny's Oneohtrix Point Never project** contributes the idea of systemic behavior: events can affect the whole scene, and reactions can change state rather than merely scaling an object. geo takes that systemic lesson without adopting its degraded interface aesthetic.

The editor remains restrained and contemporary; the early-CGI aesthetic belongs to the canvas.

## 4. Creative Model

Each scene object is a small visual instrument with four groups:

| Group | Creative controls |
| --- | --- |
| Form | Primitive, proportions, detail, flat/smooth shading |
| Surface | Material, palette, reflectivity, emission, wireframe |
| Motion | Rotation, floating, orbiting, drift, speed, phase |
| Reaction | Loudness, transient, and stereo behaviors |

Global controls are divided into:

- **World:** backdrop, floor, fog, lighting, and camera.
- **Finish:** clean render treatment and selective bloom.
- **Performance:** global audio sensitivity, attack/release, and scene-wide reactions.

This model is preferable to exposing a node graph or a miniature Blender in the first release.

## 5. Initial Visual Toolkit

### Geometric forms

The initial library should contain six polished choices:

- Sphere or icosphere
- Cube
- Cone
- Cylinder
- Torus
- Torus knot or another distinctive hero form

Form controls include scale, non-uniform proportions, geometry detail, flat/smooth shading, position, rotation, and optional wireframe treatment.

Custom model importing, metaballs, and procedural mesh sculpting are deferred.

### Materials

- **Chrome:** stylized environment reflection with low roughness.
- **Glossy plastic:** saturated color and strong highlights.
- **Matte:** simple shaded surfaces.
- **Emissive:** restrained luminous color participating in bloom.
- **Wireframe:** solid or luminous lines.

A small custom environment-map or matcap collection is more important to the identity than physically accurate lighting. Reflections should be illustrated and slightly impossible rather than contemporary product-render realism.

### Background and world editor

The background editor separates **backdrop** from **stage**.

Backdrop controls:

- Solid color
- Two-color vertical or radial gradient
- Horizon color and fog
- Optional image backgrounds only if later approved and artistically justified

Stage controls:

- None: floating in a void
- Checkerboard floor
- Perspective grid used selectively, not as a mandatory synthwave motif
- Reflective floor
- Floor height, scale, color, and fade distance

World controls include two colored lights, ambient intensity, perspective/orthographic camera, camera orbit, field of view, and slow automatic camera drift.

The visible background and reflection environment remain independent: a black void may still produce colorful chrome reflections.

### Finish

The initial release needs clean antialiasing and selective bloom with threshold, strength, and radius controls. Additional finishing effects are not required to prove the aesthetic.

## 6. Audio Performance Model

### Signal contract

The audio layer should produce one reusable frame-level feature object:

```text
level      Fast overall loudness, 0–1
intensity  Slow musical energy, 0–1
impact     Decaying transient impulse, 0–1
balance    Stereo position, -1–1
width      Stereo spread, 0–1
```

No signal is displayed as an analyzer graphic.

### Level and intensity

Level is a fast combined-loudness envelope for immediate reactions such as breathing and emission. Intensity follows longer-term musical energy and may affect rotation, camera drift, or bloom.

Both require bounded attack/release smoothing and a silence noise floor. Listening volume must not affect their values.

### Impact

Impact is triggered when energy rises beyond an adaptive threshold. A short refractory period prevents uncontrolled repeated triggering.

Its primary visual expression is a spring impulse:

1. Compress or kick the object.
2. Overshoot slightly.
3. Settle back to the composed resting state.

Impacts should not cause arbitrary full-scene flashing by default.

### Stereo balance

Balance comes from normalized left/right energy and occupies approximately `[-1, 1]`.

Clean mappings include:

- Horizontal position offset
- Orbit angle
- Gentle camera drift
- Colored-light position

Balance modulation is additive to the base transform and centered around zero.

### Stereo width

Width comes from mid/side energy and occupies `[0, 1]`.

Clean mappings include:

- Orbit radius
- Separation between paired objects
- Floating amplitude
- Distance between colored lights

Width alters spatial relationships, not chromatic aberration. Mono or centered input produces neutral balance and low/zero width without invalid math.

### Initial object behaviors

| Behavior | Signal | Visual result |
| --- | --- | --- |
| Breathe | Level | Gentle scale expansion and contraction |
| Strike | Impact | Springy compression or positional kick |
| Spin | Intensity | Rotation accelerates with sustained energy |
| Drift | Balance | Subtle stereo-linked spatial movement |
| Expand | Width | Orbit radius or object spread increases |
| Flare | Impact or level | Brief restrained emissive highlight |

Global performance options may include impact-to-camera impulse, intensity-to-bloom, balance-to-camera pan, and width-to-light separation. Each needs conservative limits.

### Silence and pause

The scene retains autonomous baseline motion during silence. Audio adds energy rather than determining whether the artwork exists. Pause/editor preview behavior must be deliberate and consistent; export always resets motion and analysis envelopes at track start.

## 7. Starter Scene and Empty State

The initial workspace presents two real actions:

- **Blank scene**
- **Load starter scene**

The starter composition is a chrome torus above a softly reflective floor with one smaller emissive satellite and a pale cyan-to-lavender environment.

Its performance demonstrates all initial signals:

- Level makes the torus breathe.
- Impact gives the torus subtle spring compression.
- Intensity affects torus rotation.
- Balance moves the satellite horizontally.
- Width expands the satellite orbit.
- Strong impacts create a restrained emissive flare.

The starter is also the first fixed development prototype. It must look polished without audio before being generalized into the editor. Loading it replaces only current in-memory state, with confirmation if unsaved work would be lost.

## 8. Interface Plan

```text
┌─────────────────────────────────┬──────────────────┐
│                                 │ Scene / objects  │
│          Artwork canvas         │ Inspector        │
│                                 │                  │
├─────────────────────────────────┴──────────────────┤
│ Audio upload · playback · seek · volume · export  │
└───────────────────────────────────────────────────┘
```

Inspector views:

1. **Scene:** object list, add/duplicate/remove, generation, canvas format.
2. **Object:** Form, Surface, Motion, Reaction for the selected object.
3. **World:** background, floor, lighting, fog, camera.
4. **Finish:** bloom and global performance controls.

Viewport goals include click-to-select, camera orbit/zoom, simple transform interaction where practical, fullscreen preview, and 16:9, 1:1, 4:3, and 9:16 output formats.

All editing actions require accessible labeled controls. Interface elements never appear inside exported artwork.

## 9. Technical Architecture

### Processing flow

```text
Local audio
    ↓
AudioEngine
    ↓
Stereo time-domain feature extractor
    ↓
Level / intensity / impact / balance / width
    ↓
Object behaviors and scene performance effects
    ↓
Three.js scene
    ↓
Selective post-processing
    ↓
WebGL canvas
    ↓
Real-time MP4 exporter
```

### Audio graph

```text
AudioBufferSource
├── Existing analyser → volume → speakers
│                      └→ recording tap
│
└── ChannelSplitter
    ├── Left analyser
    └── Right analyser
```

The stereo branch is analysis-only and never connects to another audible destination. Existing original-audio recording remains intact.

### State ownership

React owns low-frequency editing through a versioned `SceneConfig`:

```text
SceneConfig
├── version and seed
├── canvas
├── objects[]
│   ├── identity and form
│   ├── base transform
│   ├── material
│   ├── motion
│   └── reaction
├── world
├── camera
├── finish
└── audio response
```

`SceneRenderer` applies configuration changes and owns the render loop, Three.js objects, audio feature history, and transient springs. Per-frame values never enter React state.

### Reuse from typo

Reuse or adapt:

- React/TypeScript/Vite/pnpm conventions.
- Workspace grid, inspector, and transport patterns.
- Local file validation and drag-and-drop behavior.
- Audio decoding, playback, seeking, volume, replacement, and error handling.
- AudioEngine subscriptions and recording tap.
- TrackExporter progress, cancellation, MP4 validation, and cleanup.
- Seeded randomness and configuration-sanitization patterns.
- Strict separation of real-time engines and React.

Replace:

- Spectrum processor and logarithmic bands.
- Crest columns, glyph assignments, and fonts.
- Canvas 2D typographic renderer.
- Typography-specific controls and flat visual configuration.

Adapt `TypographicCanvas` into `SceneCanvas`, preserving the useful `beginCapture`, `endCapture`, and `resetMotion` export contract where practical. WebGL capture with post-processing and aspect-ratio resizing requires an early technical validation.

Selected modules should be ported into this project; no shared package or monorepo abstraction is needed.

## 10. Milestones

The project scaffold and documentation are initialized. **Milestone 1 is current.** All behavior checkboxes below remain unchecked until implemented and verified.

### Milestone 1 — Fixed Visual Study and Capture Spike

**Goal:** Prove the clean CGI identity and audio-performance concept with the starter composition before building the editor.

- [ ] Initialize a direct Three.js renderer with proper lifecycle cleanup.
- [ ] Build the fixed chrome torus, emissive satellite, floor, environment, fog, camera, and lights.
- [ ] Add clean antialiasing and selective bloom.
- [ ] Add autonomous rotation, satellite orbit, and camera drift.
- [ ] Port the local audio engine and transport foundation from typo.
- [ ] Extract level, intensity, impact, balance, and width from local playback.
- [ ] Implement breathing, spring impact, stereo drift, and width expansion.
- [ ] Verify neutral behavior with mono and silent audio.
- [ ] Validate WebGL canvas capture with post-processing and original audio.
- [ ] Tune the fixed scene without audio until it is visually polished.

**Exit criteria**

- The fixed composition looks intentional without audio.
- Audio reactions feel musical and bounded rather than mechanical.
- Stereo movement is visible with suitable material and neutral with mono input.
- A WebGL capture spike proves that the planned export path is viable.
- The render loop, audio graph, and GPU resources clean up correctly in Strict Mode.

### Milestone 2 — Blank Scene Editor

**Goal:** Generalize the visual study into a focused multi-object editor.

- [ ] Add versioned scene configuration and stable object identities.
- [ ] Implement empty state and optional starter-scene loading.
- [ ] Add, select, duplicate, and remove objects.
- [ ] Add primitive, transform, material, motion, and reaction inspectors.
- [ ] Add solid/gradient backdrops and initial floor modes.
- [ ] Add camera navigation, lighting, fog, and bloom controls.
- [ ] Keep all scene state session-local.
- [ ] Preserve the composed base state under every audio behavior.

**Exit criteria**

- A user can construct a simple scene from a blank canvas.
- The starter scene is representable as ordinary scene configuration.
- Editing, selection, pause, silence, and resize do not destabilize the renderer.

### Milestone 3 — Creative and Performance Polish

**Goal:** Make the toolkit expressive while preserving art-directed output.

- [ ] Complete the six-primitive and five-material libraries.
- [ ] Add constrained seeded generation and selected-object mutation.
- [ ] Add fullscreen preview and aspect-ratio controls.
- [ ] Tune behaviors across quiet, loud, sparse, bass-heavy, mono, and wide-stereo tracks.
- [ ] Add accessible keyboard/focus states and reduced interface motion.
- [ ] Profile DPR, bloom targets, geometry detail, and per-frame allocations.

**Exit criteria**

- Generated compositions remain coherent and bounded.
- Audio response is legible across varied source material without destroying compositions.
- Desktop Chromium preview remains responsive at the default scene complexity.

### Milestone 4 — Full-Track MP4 Export

**Goal:** Produce a shareable performance with the original audio using the validated capture path.

- [ ] Port and adapt TrackExporter and capability detection.
- [ ] Capture the complete track from its beginning with original stereo audio.
- [ ] Preserve aspect ratio and support canvas-size, 720p, and 1080p output.
- [ ] Reset procedural motion and analysis envelopes at export start.
- [ ] Add progress, expected duration, cancellation, and unsupported-browser messaging.
- [ ] Validate MP4 headers and discard incomplete output.
- [ ] Verify that completion, cancellation, and failure leave playback functional.

**Exit criteria**

- The downloaded MP4 contains synchronized post-processed visuals and original audio.
- Export output matches the preview's composition and aspect ratio.
- Real-time duration and browser limitations are documented honestly.

### Milestone 5 — Release Hardening

- [ ] Unit-test loudness normalization, transient gating, stereo math, and mono/silence handling.
- [ ] Unit-test envelopes, springs, seeded generation, scene validation, and export helpers.
- [ ] Verify upload, seeking, track replacement, volume independence, and end/restart behavior.
- [ ] Verify empty/starter scenes, editing, resize, tab restore, and Strict Mode cleanup.
- [ ] Verify every export resolution, cancellation, and failure path in supported Chromium.
- [ ] Document setup, controls, browser support, limitations, privacy, and accessibility.
- [ ] Run final typecheck, lint, tests, production build, and browser smoke tests.

## 11. Deliberately Out of Scope for v1

- Spectrum or waveform artwork
- Heavy glitch and persistent digital degradation
- Timeline, keyframes, or node-based modulation editor
- Custom model import, metaballs, and sculpting
- Physics and complex particle systems
- Microphone or live-audio input
- Streaming-service integrations and remote audio URLs
- Scene persistence, autosave, accounts, and cloud sharing
- Offline frame-by-frame rendering
- Backend processing or FFmpeg-based export
- A shared typo/geo package or monorepo

## 12. Release Criteria

A new user can open a blank scene or load the starter, create a clean early-CGI composition, and immediately understand its motion. Loudness and impacts provide distinct physical responses; stereo balance and width affect space without breaking mono compatibility. The interface stays outside the artwork, all state remains session-local, and supported Chromium produces a valid full-track MP4 with original audio.

Visual quality, motion quality, and cleanup must be verified in the browser. Compilation alone never completes a milestone.
