import type { LightingConfig, SceneConfig } from './sceneConfig'
import { SCENE_VERSION } from './sceneConfig'
import { normalizeSceneConfig } from './sceneNormalize'

const SCENE_SEED = 0x1994
const DEFAULT_DPR_CAP = 2
const DEFAULT_LIGHTING: LightingConfig = {
  ambientColor: '#e2e6ea',
  ambientIntensity: 0.6,
  keyColor: '#eef7ff',
  keyIntensity: 2.2,
  fillColor: '#e6e2ff',
  fillIntensity: 1.5,
}

/** A neutral, empty stage. It looks intentional before the first object exists. */
export function createBlankScene(): SceneConfig {
  return normalizeSceneConfig({
    version: SCENE_VERSION,
    seed: SCENE_SEED,
    objectSequence: 0,
    canvas: { dprCap: DEFAULT_DPR_CAP },
    objects: [],
    world: {
      backdrop: {
        type: 'gradient',
        top: '#e6ecec',
        horizon: '#f2f2ee',
        bottom: '#c7cfd0',
      },
      floor: {
        type: 'reflective',
        color: '#c2cbcd',
        size: 80,
        fadeStart: 6,
        fadeEnd: 28,
      },
      fog: {
        type: 'linear',
        color: '#dfe4e4',
        near: 12,
        far: 34,
      },
      lighting: DEFAULT_LIGHTING,
    },
    camera: {
      target: [0, 0.9, 0],
      distance: 11.64,
      azimuth: 34.12,
      elevation: 18.28,
      fov: 38,
      drift: 0.13,
    },
    finish: {
      exposure: 1.05,
      bloom: {
        enabled: true,
        threshold: 0.85,
        strength: 0.26,
        radius: 0.18,
      },
    },
  })
}

/**
 * The fixed visual study expressed as ordinary scene configuration: a chrome
 * torus and an emissive satellite above a reflective floor.
 */
export function createStarterScene(): SceneConfig {
  return normalizeSceneConfig({
    version: SCENE_VERSION,
    seed: SCENE_SEED,
    objectSequence: 2,
    canvas: { dprCap: DEFAULT_DPR_CAP },
    objects: [
      {
        id: 'object-1',
        name: 'Chrome torus',
        form: { primitive: 'torus', detail: 3, flatShading: false },
        transform: {
          position: [0, 2.05, 0],
          rotation: [41.25, -16.04, -8.02],
          scale: [1.28, 1.28, 1.28],
        },
        material: { kind: 'chrome', color: '#e4edf2', gloss: 0.84, emission: 0 },
        motion: {
          spin: 0.14,
          float: 0.09,
          floatSpeed: 0.68,
          orbitRadius: 0,
          orbitSpeed: 0,
          phase: 0,
        },
        reaction: {
          breathe: 0.065,
          strike: 0.16,
          flare: 0.65,
          drift: 0,
          expand: 0,
        },
      },
      {
        id: 'object-2',
        name: 'Emissive satellite',
        form: { primitive: 'icosahedron', detail: 1, flatShading: true },
        transform: {
          position: [0, 2.15, 0],
          rotation: [0, 0, 0],
          scale: [0.24, 0.24, 0.24],
        },
        material: { kind: 'emissive', color: '#b7f5ff', gloss: 0.76, emission: 0.55 },
        motion: {
          spin: 0.24,
          float: 0.24,
          floatSpeed: 0.38,
          orbitRadius: 2.7,
          orbitSpeed: 0.19,
          phase: 0.42,
        },
        reaction: {
          breathe: 0,
          strike: 0,
          flare: 0.25,
          drift: 0.52,
          expand: 0.82,
        },
      },
    ],
    world: {
      backdrop: {
        type: 'gradient',
        top: '#b9dce3',
        horizon: '#ddd7e9',
        bottom: '#94a9b5',
      },
      floor: {
        type: 'reflective',
        color: '#9daebf',
        size: 80,
        fadeStart: 7,
        fadeEnd: 29,
      },
      fog: {
        type: 'linear',
        color: '#c8d3df',
        near: 12,
        far: 34,
      },
      lighting: {
        ambientColor: '#d7dcf1',
        ambientIntensity: 0.58,
        keyColor: '#d5fbff',
        keyIntensity: 2.4,
        fillColor: '#dec2ff',
        fillIntensity: 1.65,
      },
    },
    camera: {
      target: [0, 0.9, 0],
      distance: 11.64,
      azimuth: 34.12,
      elevation: 18.28,
      fov: 38,
      drift: 0.13,
    },
    finish: {
      exposure: 1.08,
      bloom: {
        enabled: true,
        threshold: 0.85,
        strength: 0.26,
        radius: 0.18,
      },
    },
  })
}
