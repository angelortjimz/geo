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

### Changed

- Replaced the scaffold canvas placeholder and capability footer with the fixed study, local-audio transport, capture control, status feedback, and compact signal explanation.
- Updated the README to describe implemented behavior, verified capture output, architecture, privacy, and current limitations.
