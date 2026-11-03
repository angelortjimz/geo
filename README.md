# geo

geo is a planned client-only, audio-played early-CGI scene composer. It will combine sparse geometric scenes, clean chrome and plastic materials, simple digital worlds, and autonomous motion with loudness, transient, and stereo reactivity.

The artwork is the scene—not a spectrum analyzer. Compositions should remain intentional during silence, while music adds breathing, springy impacts, and movement through stereo space.

> **Current status:** project scaffold only. The Three.js scene, audio engine, editor, and exporter are not implemented yet. See [`docs/roadmap.md`](docs/roadmap.md) for the approved plan and current milestone.

## Requirements

- Node.js `^20.19.0 || >=22.12.0`
- pnpm 12.6.0, pinned by the `packageManager` field in `package.json`

`corepack enable` is the simplest way to activate the pinned pnpm version. Use pnpm only; do not use npm or create a `package-lock.json`.

## Setup

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite development server with hot reload |
| `pnpm build` | Type-check and build the production bundle into `dist/` |
| `pnpm preview` | Serve the production build locally after building |
| `pnpm typecheck` | Run strict TypeScript project checks without emitting |
| `pnpm lint` | Lint the project with ESLint |
| `pnpm test` | Run the Vitest suite once |
| `pnpm format` | Format source and Vite/ESLint configuration with Prettier |

The test command currently allows an empty suite during scaffolding. Add focused tests as pure logic is introduced.

## Confirmed product direction

- Clean, pristine early-CGI visuals rather than heavy glitch or persistent degradation.
- A blank initial canvas with one optional polished starter scene.
- Geometric primitives, stylized reflective materials, gradients, fog, simple floors, and selective bloom.
- Loudness (`level`, `intensity`), transient (`impact`), stereo position (`balance`), and stereo spread (`width`) as the initial signals.
- No visible waveform, spectrum, frequency axes, or analyzer graphics.
- Session-local scene configuration with no persistence, accounts, backend, or audio upload.
- Desktop Chromium-first development and full-track real-time MP4 export as a planned milestone.

## Architecture direction

React will own low-frequency editor state and accessible controls. Direct Three.js classes will own the scene and render loop. Web Audio playback and recording routing can be adapted from [typo](https://github.com/angelortjimz/typo), with a separate analysis-only stereo branch and pure feature-extraction modules.

```text
Local audio
    → AudioEngine
    → Level / intensity / impact / balance / width
    → Object behaviors and scene motion
    → Three.js renderer and selective post-processing
    → WebGL canvas
    → Planned real-time MP4 export
```

## Planned project structure

```text
src/audio/       Playback, stereo analysis, feature extraction
src/scene/       Versioned configuration, defaults, seeded generation
src/motion/      Envelopes, springs, object and scene behaviors
src/render/      Three.js renderer, materials, worlds, post-processing
src/export/      Capture bridge, capability checks, MP4 exporter
src/components/  React workspace and inspector controls
docs/            Product roadmap and verification notes
```

These directories and responsibilities will be introduced with their corresponding milestones rather than created as empty abstractions.

## Privacy

The intended application is entirely local: no backend, analytics, account system, streaming integration, or audio upload. The current scaffold makes no audio requests and implements no persistence.

## Contributing

Read [`AGENTS.md`](AGENTS.md) and [`docs/roadmap.md`](docs/roadmap.md) before changing scope or architecture. Keep `CHANGELOG.md` updated for every notable change. Do not mark roadmap items complete until their visual and runtime behavior has been verified, not merely compiled.
