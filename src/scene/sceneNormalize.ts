import type {
  BackdropConfig,
  BloomConfig,
  CameraConfig,
  CheckerFloorConfig,
  FinishConfig,
  FloorConfig,
  FogConfig,
  FormConfig,
  GradientBackdropConfig,
  LightingConfig,
  LinearFogConfig,
  MaterialConfig,
  MaterialKind,
  MotionConfig,
  PrimitiveKind,
  ReactionConfig,
  ReflectiveFloorConfig,
  SceneConfig,
  SceneObjectConfig,
  SolidBackdropConfig,
  TransformConfig,
  Vector3Tuple,
  WorldConfig,
} from './sceneConfig'
import { PRIMITIVE_LABELS, SCENE_VERSION } from './sceneConfig'
import {
  AMBIENT_INTENSITY_RANGE,
  BLOOM_RADIUS_RANGE,
  BLOOM_STRENGTH_RANGE,
  BLOOM_THRESHOLD_RANGE,
  BREATHE_RANGE,
  CAMERA_DISTANCE_RANGE,
  CAMERA_DRIFT_RANGE,
  CAMERA_ELEVATION_RANGE,
  CAMERA_FOV_RANGE,
  CAMERA_TARGET_RANGE,
  DETAIL_RANGE,
  DPR_CAP_RANGE,
  DRIFT_RANGE,
  EMISSION_RANGE,
  EXPAND_RANGE,
  EXPOSURE_RANGE,
  FLARE_RANGE,
  FLOAT_RANGE,
  FLOAT_SPEED_RANGE,
  FLOOR_FADE_END_RANGE,
  FLOOR_FADE_START_RANGE,
  FLOOR_SIZE_RANGE,
  FOG_FAR_RANGE,
  FOG_NEAR_RANGE,
  GLOSS_RANGE,
  LIGHT_INTENSITY_RANGE,
  MAX_OBJECT_COUNT,
  ORBIT_RADIUS_RANGE,
  ORBIT_SPEED_RANGE,
  PHASE_RANGE,
  POSITION_RANGE,
  ROTATION_RANGE,
  SCALE_RANGE,
  SPIN_RANGE,
  STRIKE_RANGE,
  clampInteger,
  clampNumber,
  clampOrderedPair,
  clampVector3,
  normalizeDegrees,
  sanitizeColor,
} from './sceneLimits'

const DEFAULT_POSITION: Vector3Tuple = [0, 0, 0]
const DEFAULT_ROTATION: Vector3Tuple = [0, 0, 0]
const DEFAULT_SCALE: Vector3Tuple = [1, 1, 1]
const DEFAULT_OBJECT_ID = 'object-1'
const MAX_ID_LENGTH = 60
const MAX_NAME_LENGTH = 40
const DEFAULT_OBJECT_SEQUENCE_LIMIT = 9_999

const DEFAULT_SOLID_COLOR = '#cfd6d6'
const DEFAULT_GRADIENT: GradientBackdropConfig = {
  type: 'gradient',
  top: '#e6ecec',
  horizon: '#f2f2ee',
  bottom: '#c7cfd0',
}
const DEFAULT_REFLECTIVE_FLOOR: ReflectiveFloorConfig = {
  type: 'reflective',
  color: '#c2cbcd',
  size: 80,
  fadeStart: 6,
  fadeEnd: 28,
}
const DEFAULT_CHECKER_LIGHT = '#dfe4e2'
const DEFAULT_CHECKER_DARK = '#b9c1c1'
const DEFAULT_FOG_COLOR = '#dfe4e4'
const DEFAULT_AMBIENT_COLOR = '#e2e6ea'
const DEFAULT_KEY_COLOR = '#eef7ff'
const DEFAULT_FILL_COLOR = '#e6e2ff'
const DEFAULT_MATERIAL_COLOR = '#e4edf2'
const DEFAULT_EMISSIVE_COLOR = '#b7f5ff'

function isPrimitiveKind(value: unknown): value is PrimitiveKind {
  return value === 'torus' || value === 'box' || value === 'icosahedron'
}

function isMaterialKind(value: unknown): value is MaterialKind {
  return value === 'chrome' || value === 'plastic' || value === 'emissive'
}

export function normalizeForm(form: FormConfig): FormConfig {
  return {
    primitive: isPrimitiveKind(form.primitive) ? form.primitive : 'torus',
    detail: clampInteger(form.detail, DETAIL_RANGE, 2),
    flatShading: Boolean(form.flatShading),
  }
}

export function normalizeTransform(transform: TransformConfig): TransformConfig {
  return {
    position: clampVector3(transform.position, POSITION_RANGE, DEFAULT_POSITION),
    rotation: clampVector3(transform.rotation, ROTATION_RANGE, DEFAULT_ROTATION),
    scale: clampVector3(transform.scale, SCALE_RANGE, DEFAULT_SCALE),
  }
}

export function normalizeMaterial(material: MaterialConfig): MaterialConfig {
  const kind = isMaterialKind(material.kind) ? material.kind : 'chrome'
  const fallbackColor = kind === 'emissive' ? DEFAULT_EMISSIVE_COLOR : DEFAULT_MATERIAL_COLOR

  return {
    kind,
    color: sanitizeColor(material.color, fallbackColor),
    gloss: clampNumber(material.gloss, GLOSS_RANGE, 0.7),
    emission: clampNumber(material.emission, EMISSION_RANGE, kind === 'emissive' ? 0.5 : 0),
  }
}

export function normalizeMotion(motion: MotionConfig): MotionConfig {
  return {
    spin: clampNumber(motion.spin, SPIN_RANGE, 0.12),
    float: clampNumber(motion.float, FLOAT_RANGE, 0.06),
    floatSpeed: clampNumber(motion.floatSpeed, FLOAT_SPEED_RANGE, 0.6),
    orbitRadius: clampNumber(motion.orbitRadius, ORBIT_RADIUS_RANGE, 0),
    orbitSpeed: clampNumber(motion.orbitSpeed, ORBIT_SPEED_RANGE, 0.2),
    phase: clampNumber(motion.phase, PHASE_RANGE, 0),
  }
}

export function normalizeReaction(reaction: ReactionConfig): ReactionConfig {
  return {
    breathe: clampNumber(reaction.breathe, BREATHE_RANGE, 0.06),
    strike: clampNumber(reaction.strike, STRIKE_RANGE, 0.14),
    flare: clampNumber(reaction.flare, FLARE_RANGE, 0.35),
    drift: clampNumber(reaction.drift, DRIFT_RANGE, 0),
    expand: clampNumber(reaction.expand, EXPAND_RANGE, 0),
  }
}

function normalizeName(name: string, form: FormConfig): string {
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH)
  return trimmed.length > 0 ? trimmed : PRIMITIVE_LABELS[form.primitive]
}

function normalizeObjectId(id: string): string {
  const trimmed = id.trim().slice(0, MAX_ID_LENGTH)
  return trimmed.length > 0 ? trimmed : DEFAULT_OBJECT_ID
}

export function normalizeObjectConfig(object: SceneObjectConfig): SceneObjectConfig {
  const form = normalizeForm(object.form)

  return {
    id: normalizeObjectId(object.id),
    name: normalizeName(object.name, form),
    form,
    transform: normalizeTransform(object.transform),
    material: normalizeMaterial(object.material),
    motion: normalizeMotion(object.motion),
    reaction: normalizeReaction(object.reaction),
  }
}

function normalizeObjectList(objects: readonly SceneObjectConfig[]): readonly SceneObjectConfig[] {
  const usedIds = new Set<string>()
  const normalized: SceneObjectConfig[] = []

  for (const object of objects.slice(0, MAX_OBJECT_COUNT)) {
    const candidate = normalizeObjectConfig(object)
    let id = candidate.id
    let suffix = 1
    while (usedIds.has(id)) {
      suffix += 1
      id = `${candidate.id}-${suffix}`
    }
    usedIds.add(id)
    normalized.push(id === candidate.id ? candidate : { ...candidate, id })
  }

  return normalized
}

export function normalizeSolidBackdrop(backdrop: SolidBackdropConfig): SolidBackdropConfig {
  return {
    type: 'solid',
    color: sanitizeColor(backdrop.color, DEFAULT_SOLID_COLOR),
  }
}

export function normalizeGradientBackdrop(
  backdrop: GradientBackdropConfig,
): GradientBackdropConfig {
  return {
    type: 'gradient',
    top: sanitizeColor(backdrop.top, DEFAULT_GRADIENT.top),
    horizon: sanitizeColor(backdrop.horizon, DEFAULT_GRADIENT.horizon),
    bottom: sanitizeColor(backdrop.bottom, DEFAULT_GRADIENT.bottom),
  }
}

export function normalizeBackdrop(backdrop: BackdropConfig): BackdropConfig {
  return backdrop.type === 'solid'
    ? normalizeSolidBackdrop(backdrop)
    : normalizeGradientBackdrop(backdrop)
}

export function normalizeReflectiveFloor(floor: ReflectiveFloorConfig): ReflectiveFloorConfig {
  const fade = clampOrderedPair(
    floor.fadeStart,
    floor.fadeEnd,
    FLOOR_FADE_START_RANGE,
    FLOOR_FADE_END_RANGE,
    0.5,
  )

  return {
    type: 'reflective',
    color: sanitizeColor(floor.color, DEFAULT_REFLECTIVE_FLOOR.color),
    size: clampNumber(floor.size, FLOOR_SIZE_RANGE, DEFAULT_REFLECTIVE_FLOOR.size),
    fadeStart: fade.start,
    fadeEnd: fade.end,
  }
}

export function normalizeCheckerFloor(floor: CheckerFloorConfig): CheckerFloorConfig {
  const fade = clampOrderedPair(
    floor.fadeStart,
    floor.fadeEnd,
    FLOOR_FADE_START_RANGE,
    FLOOR_FADE_END_RANGE,
    0.5,
  )

  return {
    type: 'checker',
    lightColor: sanitizeColor(floor.lightColor, DEFAULT_CHECKER_LIGHT),
    darkColor: sanitizeColor(floor.darkColor, DEFAULT_CHECKER_DARK),
    size: clampNumber(floor.size, FLOOR_SIZE_RANGE, DEFAULT_REFLECTIVE_FLOOR.size),
    fadeStart: fade.start,
    fadeEnd: fade.end,
  }
}

export function normalizeFloor(floor: FloorConfig): FloorConfig {
  switch (floor.type) {
    case 'none':
      return { type: 'none' }
    case 'reflective':
      return normalizeReflectiveFloor(floor)
    case 'checker':
      return normalizeCheckerFloor(floor)
  }
}

export function normalizeLinearFog(fog: LinearFogConfig): LinearFogConfig {
  const range = clampOrderedPair(fog.near, fog.far, FOG_NEAR_RANGE, FOG_FAR_RANGE, 0.5)

  return {
    type: 'linear',
    color: sanitizeColor(fog.color, DEFAULT_FOG_COLOR),
    near: range.start,
    far: range.end,
  }
}

export function normalizeFog(fog: FogConfig): FogConfig {
  return fog.type === 'none' ? { type: 'none' } : normalizeLinearFog(fog)
}

export function normalizeLighting(lighting: LightingConfig): LightingConfig {
  return {
    ambientColor: sanitizeColor(lighting.ambientColor, DEFAULT_AMBIENT_COLOR),
    ambientIntensity: clampNumber(lighting.ambientIntensity, AMBIENT_INTENSITY_RANGE, 0.6),
    keyColor: sanitizeColor(lighting.keyColor, DEFAULT_KEY_COLOR),
    keyIntensity: clampNumber(lighting.keyIntensity, LIGHT_INTENSITY_RANGE, 2.2),
    fillColor: sanitizeColor(lighting.fillColor, DEFAULT_FILL_COLOR),
    fillIntensity: clampNumber(lighting.fillIntensity, LIGHT_INTENSITY_RANGE, 1.5),
  }
}

export function normalizeWorld(world: WorldConfig): WorldConfig {
  return {
    backdrop: normalizeBackdrop(world.backdrop),
    floor: normalizeFloor(world.floor),
    fog: normalizeFog(world.fog),
    lighting: normalizeLighting(world.lighting),
  }
}

export function normalizeCamera(camera: CameraConfig): CameraConfig {
  return {
    target: clampVector3(camera.target, CAMERA_TARGET_RANGE, DEFAULT_POSITION),
    distance: clampNumber(camera.distance, CAMERA_DISTANCE_RANGE, 11.6),
    azimuth: normalizeDegrees(camera.azimuth, 0),
    elevation: clampNumber(camera.elevation, CAMERA_ELEVATION_RANGE, 18),
    fov: clampNumber(camera.fov, CAMERA_FOV_RANGE, 38),
    drift: clampNumber(camera.drift, CAMERA_DRIFT_RANGE, 0.13),
  }
}

export function normalizeBloom(bloom: BloomConfig): BloomConfig {
  return {
    enabled: Boolean(bloom.enabled),
    threshold: clampNumber(bloom.threshold, BLOOM_THRESHOLD_RANGE, 0.85),
    strength: clampNumber(bloom.strength, BLOOM_STRENGTH_RANGE, 0.26),
    radius: clampNumber(bloom.radius, BLOOM_RADIUS_RANGE, 0.18),
  }
}

export function normalizeFinish(finish: FinishConfig): FinishConfig {
  return {
    exposure: clampNumber(finish.exposure, EXPOSURE_RANGE, 1.08),
    bloom: normalizeBloom(finish.bloom),
  }
}

/** Returns a fully clamped copy of a scene document. Valid input is preserved. */
export function normalizeSceneConfig(scene: SceneConfig): SceneConfig {
  return {
    version: SCENE_VERSION,
    seed: Number.isFinite(scene.seed) ? Math.max(0, Math.trunc(scene.seed)) : 0,
    objectSequence: clampInteger(
      scene.objectSequence,
      { minimum: 0, maximum: DEFAULT_OBJECT_SEQUENCE_LIMIT },
      0,
    ),
    canvas: {
      dprCap: clampNumber(scene.canvas.dprCap, DPR_CAP_RANGE, 2),
    },
    objects: normalizeObjectList(scene.objects),
    world: normalizeWorld(scene.world),
    camera: normalizeCamera(scene.camera),
    finish: normalizeFinish(scene.finish),
  }
}
