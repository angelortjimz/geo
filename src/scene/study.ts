export type Vector3Tuple = readonly [number, number, number]

export interface HeroObjectConfig {
  id: 'hero'
  primitive: 'torus'
  position: Vector3Tuple
  rotation: Vector3Tuple
  radius: number
  tube: number
  radialSegments: number
  tubularSegments: number
}

export interface SatelliteObjectConfig {
  id: 'satellite'
  primitive: 'icosahedron'
  radius: number
  detail: number
  orbitCenter: Vector3Tuple
  orbitRadius: number
  orbitAngle: number
  orbitSpeed: number
  floatAmplitude: number
}

export interface SceneConfig {
  version: 1
  seed: number
  canvas: {
    dprCap: number
  }
  objects: readonly [HeroObjectConfig, SatelliteObjectConfig]
  world: {
    backgroundTop: string
    backgroundHorizon: string
    backgroundBottom: string
    fogColor: string
    fogNear: number
    fogFar: number
    floorColor: string
    floorSize: number
    floorFadeStart: number
    floorFadeEnd: number
  }
  camera: {
    fov: number
    position: Vector3Tuple
    target: Vector3Tuple
    drift: number
  }
  finish: {
    exposure: number
    bloomThreshold: number
    bloomStrength: number
    bloomRadius: number
  }
  audioResponse: {
    breatheAmount: number
    strikeAmount: number
    spinBoost: number
    balanceDrift: number
    widthOrbitIncrease: number
    flareIntensity: number
  }
}

export const FIXED_STUDY_SCENE: SceneConfig = {
  version: 1,
  seed: 0x1994,
  canvas: {
    dprCap: 2,
  },
  objects: [
    {
      id: 'hero',
      primitive: 'torus',
      position: [0, 2.05, 0],
      rotation: [0.72, -0.28, -0.14],
      radius: 1.28,
      tube: 0.39,
      radialSegments: 32,
      tubularSegments: 96,
    },
    {
      id: 'satellite',
      primitive: 'icosahedron',
      radius: 0.24,
      detail: 1,
      orbitCenter: [0, 2.15, 0],
      orbitRadius: 2.7,
      orbitAngle: 0.42,
      orbitSpeed: 0.19,
      floatAmplitude: 0.24,
    },
  ],
  world: {
    backgroundTop: '#b9dce3',
    backgroundHorizon: '#ddd7e9',
    backgroundBottom: '#94a9b5',
    fogColor: '#c8d3df',
    fogNear: 12,
    fogFar: 34,
    floorColor: '#9daebf',
    floorSize: 80,
    floorFadeStart: 7,
    floorFadeEnd: 29,
  },
  camera: {
    fov: 38,
    position: [6.2, 4.55, 9.15],
    target: [0, 0.9, 0],
    drift: 0.13,
  },
  finish: {
    exposure: 1.08,
    bloomThreshold: 0.85,
    bloomStrength: 0.26,
    bloomRadius: 0.18,
  },
  audioResponse: {
    breatheAmount: 0.065,
    strikeAmount: 0.16,
    spinBoost: 0.52,
    balanceDrift: 0.52,
    widthOrbitIncrease: 0.82,
    flareIntensity: 0.65,
  },
}
