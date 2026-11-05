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
  DEFAULT_BLOOM,
  DEFAULT_CAMERA,
  DEFAULT_CHECKER_FLOOR,
  DEFAULT_DPR_CAP,
  DEFAULT_EMISSIVE_COLOR,
  DEFAULT_EMISSIVE_EMISSION,
  DEFAULT_FINISH,
  DEFAULT_GRADIENT_BACKDROP,
  DEFAULT_LIGHTING,
  DEFAULT_LINEAR_FOG,
  DEFAULT_MATERIAL_COLOR,
  DEFAULT_OBJECT_FORM,
  DEFAULT_OBJECT_MATERIAL,
  DEFAULT_OBJECT_MOTION,
  DEFAULT_OBJECT_REACTION,
  DEFAULT_REFLECTIVE_FLOOR,
  DEFAULT_SOLID_COLOR,
} from './sceneDefaults'
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

function isPrimitiveKind(value: unknown): value is PrimitiveKind {
  return value === 'torus' || value === 'box' || value === 'icosahedron'
}

function isMaterialKind(value: unknown): value is MaterialKind {
  return value === 'chrome' || value === 'plastic' || value === 'emissive'
}

export function normalizeForm(form: FormConfig): FormConfig {
  return {
    primitive: isPrimitiveKind(form.primitive) ? form.primitive : DEFAULT_OBJECT_FORM.primitive,
    detail: clampInteger(form.detail, DETAIL_RANGE, DEFAULT_OBJECT_FORM.detail),
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
  const kind = isMaterialKind(material.kind) ? material.kind : DEFAULT_OBJECT_MATERIAL.kind
  const fallbackColor = kind === 'emissive' ? DEFAULT_EMISSIVE_COLOR : DEFAULT_MATERIAL_COLOR
  const fallbackEmission =
    kind === 'emissive' ? DEFAULT_EMISSIVE_EMISSION : DEFAULT_OBJECT_MATERIAL.emission

  return {
    kind,
    color: sanitizeColor(material.color, fallbackColor),
    gloss: clampNumber(material.gloss, GLOSS_RANGE, DEFAULT_OBJECT_MATERIAL.gloss),
    emission: clampNumber(material.emission, EMISSION_RANGE, fallbackEmission),
  }
}

export function normalizeMotion(motion: MotionConfig): MotionConfig {
  return {
    spin: clampNumber(motion.spin, SPIN_RANGE, DEFAULT_OBJECT_MOTION.spin),
    float: clampNumber(motion.float, FLOAT_RANGE, DEFAULT_OBJECT_MOTION.float),
    floatSpeed: clampNumber(motion.floatSpeed, FLOAT_SPEED_RANGE, DEFAULT_OBJECT_MOTION.floatSpeed),
    orbitRadius: clampNumber(
      motion.orbitRadius,
      ORBIT_RADIUS_RANGE,
      DEFAULT_OBJECT_MOTION.orbitRadius,
    ),
    orbitSpeed: clampNumber(motion.orbitSpeed, ORBIT_SPEED_RANGE, DEFAULT_OBJECT_MOTION.orbitSpeed),
    phase: clampNumber(motion.phase, PHASE_RANGE, DEFAULT_OBJECT_MOTION.phase),
  }
}

export function normalizeReaction(reaction: ReactionConfig): ReactionConfig {
  return {
    breathe: clampNumber(reaction.breathe, BREATHE_RANGE, DEFAULT_OBJECT_REACTION.breathe),
    strike: clampNumber(reaction.strike, STRIKE_RANGE, DEFAULT_OBJECT_REACTION.strike),
    flare: clampNumber(reaction.flare, FLARE_RANGE, DEFAULT_OBJECT_REACTION.flare),
    drift: clampNumber(reaction.drift, DRIFT_RANGE, DEFAULT_OBJECT_REACTION.drift),
    expand: clampNumber(reaction.expand, EXPAND_RANGE, DEFAULT_OBJECT_REACTION.expand),
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
    top: sanitizeColor(backdrop.top, DEFAULT_GRADIENT_BACKDROP.top),
    horizon: sanitizeColor(backdrop.horizon, DEFAULT_GRADIENT_BACKDROP.horizon),
    bottom: sanitizeColor(backdrop.bottom, DEFAULT_GRADIENT_BACKDROP.bottom),
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
    lightColor: sanitizeColor(floor.lightColor, DEFAULT_CHECKER_FLOOR.lightColor),
    darkColor: sanitizeColor(floor.darkColor, DEFAULT_CHECKER_FLOOR.darkColor),
    size: clampNumber(floor.size, FLOOR_SIZE_RANGE, DEFAULT_CHECKER_FLOOR.size),
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
    color: sanitizeColor(fog.color, DEFAULT_LINEAR_FOG.color),
    near: range.start,
    far: range.end,
  }
}

export function normalizeFog(fog: FogConfig): FogConfig {
  return fog.type === 'none' ? { type: 'none' } : normalizeLinearFog(fog)
}

export function normalizeLighting(lighting: LightingConfig): LightingConfig {
  return {
    ambientColor: sanitizeColor(lighting.ambientColor, DEFAULT_LIGHTING.ambientColor),
    ambientIntensity: clampNumber(
      lighting.ambientIntensity,
      AMBIENT_INTENSITY_RANGE,
      DEFAULT_LIGHTING.ambientIntensity,
    ),
    keyColor: sanitizeColor(lighting.keyColor, DEFAULT_LIGHTING.keyColor),
    keyIntensity: clampNumber(
      lighting.keyIntensity,
      LIGHT_INTENSITY_RANGE,
      DEFAULT_LIGHTING.keyIntensity,
    ),
    fillColor: sanitizeColor(lighting.fillColor, DEFAULT_LIGHTING.fillColor),
    fillIntensity: clampNumber(
      lighting.fillIntensity,
      LIGHT_INTENSITY_RANGE,
      DEFAULT_LIGHTING.fillIntensity,
    ),
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
    target: clampVector3(camera.target, CAMERA_TARGET_RANGE, DEFAULT_CAMERA.target),
    distance: clampNumber(camera.distance, CAMERA_DISTANCE_RANGE, DEFAULT_CAMERA.distance),
    azimuth: normalizeDegrees(camera.azimuth, DEFAULT_CAMERA.azimuth),
    elevation: clampNumber(camera.elevation, CAMERA_ELEVATION_RANGE, DEFAULT_CAMERA.elevation),
    fov: clampNumber(camera.fov, CAMERA_FOV_RANGE, DEFAULT_CAMERA.fov),
    drift: clampNumber(camera.drift, CAMERA_DRIFT_RANGE, DEFAULT_CAMERA.drift),
  }
}

export function normalizeBloom(bloom: BloomConfig): BloomConfig {
  return {
    enabled: Boolean(bloom.enabled),
    threshold: clampNumber(bloom.threshold, BLOOM_THRESHOLD_RANGE, DEFAULT_BLOOM.threshold),
    strength: clampNumber(bloom.strength, BLOOM_STRENGTH_RANGE, DEFAULT_BLOOM.strength),
    radius: clampNumber(bloom.radius, BLOOM_RADIUS_RANGE, DEFAULT_BLOOM.radius),
  }
}

export function normalizeFinish(finish: FinishConfig): FinishConfig {
  return {
    exposure: clampNumber(finish.exposure, EXPOSURE_RANGE, DEFAULT_FINISH.exposure),
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
      dprCap: clampNumber(scene.canvas.dprCap, DPR_CAP_RANGE, DEFAULT_DPR_CAP),
    },
    objects: normalizeObjectList(scene.objects),
    world: normalizeWorld(scene.world),
    camera: normalizeCamera(scene.camera),
    finish: normalizeFinish(scene.finish),
  }
}
