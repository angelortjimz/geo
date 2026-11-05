import type { AspectRatioKind } from './aspectRatio'

export type Vector3Tuple = readonly [number, number, number]

export const SCENE_VERSION = 3

export const PRIMITIVE_KINDS = [
  'torus',
  'torusKnot',
  'box',
  'icosahedron',
  'cone',
  'cylinder',
] as const

export type PrimitiveKind = (typeof PRIMITIVE_KINDS)[number]

export const MATERIAL_KINDS = ['chrome', 'plastic', 'matte', 'emissive', 'wireframe'] as const

export type MaterialKind = (typeof MATERIAL_KINDS)[number]
export type BackdropKind = 'solid' | 'gradient'
export type FloorKind = 'none' | 'reflective' | 'checker'
export type FogKind = 'none' | 'linear'

export const PRIMITIVE_LABELS: Record<PrimitiveKind, string> = {
  torus: 'Torus',
  torusKnot: 'Torus knot',
  box: 'Box',
  icosahedron: 'Icosphere',
  cone: 'Cone',
  cylinder: 'Cylinder',
}

export const MATERIAL_LABELS: Record<MaterialKind, string> = {
  chrome: 'Chrome',
  plastic: 'Glossy plastic',
  matte: 'Matte',
  emissive: 'Emissive',
  wireframe: 'Wireframe',
}

export interface FormConfig {
  readonly primitive: PrimitiveKind
  /** Tessellation level, interpreted per primitive as a segment or subdivision count. */
  readonly detail: number
  readonly flatShading: boolean
}

export interface TransformConfig {
  readonly position: Vector3Tuple
  /** Euler rotation in degrees, applied in XYZ order. */
  readonly rotation: Vector3Tuple
  readonly scale: Vector3Tuple
}

export interface MaterialConfig {
  readonly kind: MaterialKind
  readonly color: string
  /** 0 is fully diffuse, 1 is mirror-like; mapped to roughness by the renderer. */
  readonly gloss: number
  /** Emissive strength for emissive and wireframe materials; unused by other kinds. */
  readonly emission: number
}

export interface MotionConfig {
  /** Autonomous rotation speed around the object's vertical axis. */
  readonly spin: number
  /** Floating amplitude in world units. */
  readonly float: number
  readonly floatSpeed: number
  /** Orbit radius around the object's base position; 0 disables orbiting. */
  readonly orbitRadius: number
  readonly orbitSpeed: number
  /** Normalized 0–1 phase used to offset autonomous motion. */
  readonly phase: number
}

export interface ReactionConfig {
  readonly breathe: number
  readonly strike: number
  readonly flare: number
  /** Sustained intensity-driven rotation speed. */
  readonly energy: number
  readonly drift: number
  readonly expand: number
}

export interface SceneObjectConfig {
  readonly id: string
  readonly name: string
  readonly form: FormConfig
  readonly transform: TransformConfig
  readonly material: MaterialConfig
  readonly motion: MotionConfig
  readonly reaction: ReactionConfig
}

export interface SolidBackdropConfig {
  readonly type: 'solid'
  readonly color: string
}

export interface GradientBackdropConfig {
  readonly type: 'gradient'
  readonly top: string
  readonly horizon: string
  readonly bottom: string
}

export type BackdropConfig = SolidBackdropConfig | GradientBackdropConfig

export interface NoFloorConfig {
  readonly type: 'none'
}

export interface ReflectiveFloorConfig {
  readonly type: 'reflective'
  readonly color: string
  readonly size: number
  readonly fadeStart: number
  readonly fadeEnd: number
}

export interface CheckerFloorConfig {
  readonly type: 'checker'
  readonly lightColor: string
  readonly darkColor: string
  readonly size: number
  readonly fadeStart: number
  readonly fadeEnd: number
}

export type FloorConfig = NoFloorConfig | ReflectiveFloorConfig | CheckerFloorConfig

export interface NoFogConfig {
  readonly type: 'none'
}

export interface LinearFogConfig {
  readonly type: 'linear'
  readonly color: string
  readonly near: number
  readonly far: number
}

export type FogConfig = NoFogConfig | LinearFogConfig

export interface LightingConfig {
  readonly ambientColor: string
  readonly ambientIntensity: number
  readonly keyColor: string
  readonly keyIntensity: number
  readonly fillColor: string
  readonly fillIntensity: number
}

export interface WorldConfig {
  readonly backdrop: BackdropConfig
  readonly floor: FloorConfig
  readonly fog: FogConfig
  readonly lighting: LightingConfig
}

export interface CameraConfig {
  readonly target: Vector3Tuple
  /** Distance from the target in world units. */
  readonly distance: number
  /** Horizontal orbit angle around the target, in degrees. */
  readonly azimuth: number
  /** Vertical orbit angle above the target plane, in degrees. */
  readonly elevation: number
  readonly fov: number
  /** Bounded autonomous camera drift in world units. */
  readonly drift: number
}

export interface BloomConfig {
  readonly enabled: boolean
  readonly threshold: number
  readonly strength: number
  readonly radius: number
}

export interface FinishConfig {
  readonly exposure: number
  readonly bloom: BloomConfig
}

export interface SceneCanvasConfig {
  readonly dprCap: number
  readonly format: AspectRatioKind
}

export interface SceneConfig {
  readonly version: typeof SCENE_VERSION
  /** Shared seed for deterministic generation and object mutations. */
  readonly seed: number
  /** Monotonic counter backing stable object ids and names. */
  readonly objectSequence: number
  /** Monotonic counter for deterministic repeated object mutations. */
  readonly generationSequence: number
  readonly canvas: SceneCanvasConfig
  readonly objects: readonly SceneObjectConfig[]
  readonly world: WorldConfig
  readonly camera: CameraConfig
  readonly finish: FinishConfig
}
