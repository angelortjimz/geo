import type {
  BloomConfig,
  CameraConfig,
  CheckerFloorConfig,
  FinishConfig,
  FormConfig,
  GradientBackdropConfig,
  LightingConfig,
  LinearFogConfig,
  MaterialConfig,
  MotionConfig,
  ReactionConfig,
  ReflectiveFloorConfig,
  WorldConfig,
} from './sceneConfig'

/** Stable seed shared by the blank and starter scenes. */
export const DEFAULT_SEED = 0x1994
export const DEFAULT_DPR_CAP = 2

export const DEFAULT_MATERIAL_COLOR = '#e4edf2'
export const DEFAULT_EMISSIVE_COLOR = '#b7f5ff'
export const DEFAULT_EMISSIVE_EMISSION = 0.5

export const DEFAULT_OBJECT_FORM: FormConfig = {
  primitive: 'torus',
  detail: 3,
  flatShading: false,
}

export const DEFAULT_OBJECT_MATERIAL: MaterialConfig = {
  kind: 'chrome',
  color: DEFAULT_MATERIAL_COLOR,
  gloss: 0.84,
  emission: 0,
}

export const DEFAULT_OBJECT_MOTION: MotionConfig = {
  spin: 0.12,
  float: 0.06,
  floatSpeed: 0.6,
  orbitRadius: 0,
  orbitSpeed: 0.2,
  phase: 0,
}

export const DEFAULT_OBJECT_REACTION: ReactionConfig = {
  breathe: 0.06,
  strike: 0.14,
  flare: 0.35,
  drift: 0,
  expand: 0,
}

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
