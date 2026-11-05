# Changelog

All notable changes to geo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial client-only project scaffold with React, TypeScript, Vite, Three.js, and pnpm.
- Strict TypeScript, ESLint, Prettier, Vitest, development, production-build, and preview configuration.
- Responsive workspace shell with a scene-preview area, right-side composition panel, and full-width lower bar.
- Initial project identity, metadata, and local SVG favicon.
- Product and implementation roadmap covering the clean early-CGI art direction, scene editor, loudness/transient/stereo reactivity, optional starter scene, session-local state, and MP4 export.
- Project-specific `AGENTS.md` adapted from typo with rendering, audio lifecycle, deterministic motion, accessibility, documentation, and validation conventions.
- Root README with setup commands, current implementation status, architecture direction, and project constraints.
- Fixed audio-reactive visual study with a chrome torus, emissive satellite, reflective floor, procedural environment, gradient backdrop, fog, camera drift, controlled lighting, contact shadow, and selective satellite bloom.
- Deterministic autonomous torus rotation, float, satellite orbit, and camera drift, with bounded loudness breathing, spring impact, emissive flare, stereo drift, and width expansion layered over the composed resting state.
- Local audio upload and workspace drag-and-drop with validation, decoding errors, playback, pause/resume, seeking, volume, replacement, mono duplication, and track-end restart.
- Analysis-only stereo graph and feature extractor for level, intensity, impact, balance, and width, with silence guards, transient gating, and mono-neutral behavior.
- Five-second MP4 capture spike with original stereo audio, current-playhead restart, post-processed frame bridging, even capture dimensions, aspect-ratio containment, MP4 header validation, manual download, and capture lifecycle cleanup.
- Focused Vitest coverage for audio features, playback helpers, file validation, motion behaviors, springs, capture sizing, and MP4 helpers.
- Responsive renderer sizing with DPR cap, controlled scene clock, stale-analysis reset, and explicit GPU, audio-node, stream, observer, timer, and animation-frame teardown.
- Versioned multi-object scene document with stable object identities, shared numeric limits and normalization, immutable add/duplicate/remove/patch operations, blank and starter scene factories, and pure spherical camera navigation math, covered by focused tests.
- Blank-scene editor with a polished welcome overlay offering Start blank scene and Load starter scene as real actions, without forcing the starter on launch.
- Scene list with selection, add, duplicate, remove, a 12-object limit, generated names that follow primitive changes, and an inline confirmation before replacing unsaved session state.
- Four accessible inspector views for object form, transform, surface, motion, and reaction; world backdrop, floor, fog, lighting, and camera; and finish exposure and bloom.
- Live canvas camera navigation: drag to orbit, wheel to zoom, with the same spherical camera values exposed as keyboard-accessible World controls.
- Three primitives (torus, box, icosahedron), three surfaces (chrome, glossy plastic, emissive), solid and gradient backdrops, none/reflective/checkerboard floors, fog, lighting, contact shadows, and selective emissive bloom.

### Changed

- Bumped the scene document to version 3 with aspect-format, generation-sequence, and energy fields, added cone, cylinder, torus-knot, matte, and wireframe kinds, and taught the renderer to build all six primitives and selectively bloom glowing wireframes.
- Generalized the fixed-study renderer into a config-driven renderer that builds, updates, and disposes arbitrary scene objects by stable id, applies world, floor, fog, lighting, camera, and finish settings in place, and selects between reflective and checkerboard floors without restarting the animation loop.
- The five-second capture now records the current edited scene and locks scene editing with a visible note while capture is preparing, recording, or finalizing.
- Live scene edits and camera navigation are applied to the existing renderer through a config diff, without remounting the canvas or restarting the animation loop.
- Updated the README, roadmap, milestone plan, and project conventions to describe the implemented editor, its verification, and the remaining limitations.
- Replaced the scaffold canvas placeholder and capability footer with the fixed study, local-audio transport, capture control, status feedback, and compact signal explanation.
- Updated the README to describe implemented behavior, verified capture output, architecture, privacy, and current limitations.
- Centralized scene defaults in `sceneDefaults.ts` so normalization, the blank and starter scenes, and the World inspector share one source of truth.
- Extended the defaults contract to new-object styling, camera fallbacks, DPR cap, and checker-floor normalization, with tests that keep canonical values inside their editable ranges.
- Inspector sliders now consume shared `NumericRange` limits, with common display formatters and a single floor-distance field group.
- Moved editor workflow transitions into a pure `sceneEditorState` reducer with direct tests for replacement, selection, dirty state, limits, and consecutive actions.
- Extracted pure capture support helpers into `captureSupport.ts`, leaving `CaptureSpike` responsible only for browser capture orchestration.
- Shared renderer transient resets and floor setup, and narrowed floor synchronization to the inputs it actually reads.
- Moved canvas prop-to-ref synchronization into an effect, extracted the transport status copy into a named helper, and moved the camera azimuth slider range beside the other shared ranges.

### Fixed

- Capture now resets procedural motion and analysis envelopes before recording instead of inheriting the editor preview's clock, orbit, spring, and stereo state.
- Corrected remaining default drift in camera clamping, DPR-cap normalization, and checker-floor fallback size.
- Removed the unused `AudioEngine.isPlaying()` method and the redundant generated-name overwrite when adding an object.
