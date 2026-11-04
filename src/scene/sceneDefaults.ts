import type {
  BloomConfig,
  CameraConfig,
  CheckerFloorConfig,
  FinishConfig,
  GradientBackdropConfig,
  LightingConfig,
  LinearFogConfig,
  ReflectiveFloorConfig,
  WorldConfig,
} from './sceneConfig'

/** Stable seed shared by the blank and starter scenes. */
export const DEFAULT_SEED = 0x1994
export const DEFAULT_DPR_CAP = 2

export const DEFAULT_SOLID_COLOR = '#cfd6d6'

export const DEFAULT_GRADIENT_BACKDROP: GradientBackdropConfig = {
  type: 'gradient',
  top: '#e6ecec',
  horizon: '#f2f2ee',
  bottom: '#c7cfd0',
}

export const DEFAULT_REFLECTIVE_FLOOR: ReflectiveFloorConfig = {
  type: 'reflective',
  color: '#c2cbcd',
  size: 80,
  fadeStart: 6,
  fadeEnd: 28,
}

export const DEFAULT_CHECKER_FLOOR: CheckerFloorConfig = {
  type: 'checker',
  lightColor: '#dfe4e2',
  darkColor: '#8f9c9f',
  size: 80,
  fadeStart: 6,
  fadeEnd: 28,
}

export const DEFAULT_LINEAR_FOG: LinearFogConfig = {
  type: 'linear',
  color: '#dfe4e4',
  near: 12,
  far: 34,
}

export const DEFAULT_LIGHTING: LightingConfig = {
  ambientColor: '#e2e6ea',
  ambientIntensity: 0.6,
  keyColor: '#eef7ff',
  keyIntensity: 2.2,
  fillColor: '#e6e2ff',
  fillIntensity: 1.5,
}

export const DEFAULT_CAMERA: CameraConfig = {
  target: [0, 0.9, 0],
  distance: 11.64,
  azimuth: 34.12,
  elevation: 18.28,
  fov: 38,
  drift: 0.13,
}

export const DEFAULT_BLOOM: BloomConfig = {
  enabled: true,
  threshold: 0.85,
  strength: 0.26,
  radius: 0.18,
}

export const DEFAULT_FINISH: FinishConfig = {
  exposure: 1.08,
  bloom: DEFAULT_BLOOM,
}

export const DEFAULT_WORLD: WorldConfig = {
  backdrop: DEFAULT_GRADIENT_BACKDROP,
  floor: DEFAULT_REFLECTIVE_FLOOR,
  fog: DEFAULT_LINEAR_FOG,
  lighting: DEFAULT_LIGHTING,
}
