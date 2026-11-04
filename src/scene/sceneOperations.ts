import { PRIMITIVE_LABELS } from './sceneConfig'
import type {
  BackdropConfig,
  BloomConfig,
  CameraConfig,
  FinishConfig,
  FloorConfig,
  FogConfig,
  FormConfig,
  LightingConfig,
  MaterialConfig,
  MotionConfig,
  ReactionConfig,
  SceneConfig,
  SceneObjectConfig,
  TransformConfig,
  Vector3Tuple,
} from './sceneConfig'
import { MAX_OBJECT_COUNT, clampNumber, DPR_CAP_RANGE } from './sceneLimits'
import {
  normalizeBackdrop,
  normalizeCamera,
  normalizeFinish,
  normalizeFloor,
  normalizeFog,
  normalizeForm,
  normalizeLighting,
  normalizeMaterial,
  normalizeMotion,
  normalizeObjectConfig,
  normalizeReaction,
  normalizeTransform,
} from './sceneNormalize'

const GOLDEN_ANGLE = 2.399_963_229_728_653
const CREATION_RING_RADIUS = 1.9
const CREATION_HEIGHT = 2
const DUPLICATE_OFFSET = 0.5

export interface ObjectPatch {
  readonly form?: Partial<FormConfig>
  readonly transform?: Partial<TransformConfig>
  readonly material?: Partial<MaterialConfig>
  readonly motion?: Partial<MotionConfig>
  readonly reaction?: Partial<ReactionConfig>
}

export interface FinishPatch {
  readonly exposure?: number
  readonly bloom?: Partial<BloomConfig>
}

function getCreationPosition(sequence: number): Vector3Tuple {
  if (sequence <= 1) {
    return [0, CREATION_HEIGHT, 0]
  }

  const angle = (sequence - 1) * GOLDEN_ANGLE
  return [
    Math.cos(angle) * CREATION_RING_RADIUS,
    CREATION_HEIGHT,
    Math.sin(angle) * CREATION_RING_RADIUS,
  ]
}

/** Curated default for a newly created object; no randomness enters the document. */
export function createObjectConfig(sequence: number): SceneObjectConfig {
  return {
    id: `object-${sequence}`,
    name: `${PRIMITIVE_LABELS.torus} ${sequence}`,
    form: {
      primitive: 'torus',
      detail: 3,
      flatShading: false,
    },
    transform: {
      position: getCreationPosition(sequence),
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    material: {
      kind: 'chrome',
      color: '#e4edf2',
      gloss: 0.84,
      emission: 0,
    },
    motion: {
      spin: 0.12,
      float: 0.06,
      floatSpeed: 0.6,
      orbitRadius: 0,
      orbitSpeed: 0.2,
      phase: 0,
    },
    reaction: {
      breathe: 0.06,
      strike: 0.14,
      flare: 0.35,
      drift: 0,
      expand: 0,
    },
  }
}

function applyObjectPatch(base: SceneObjectConfig, patch: ObjectPatch): SceneObjectConfig {
  const form = patch.form ? normalizeForm({ ...base.form, ...patch.form }) : base.form
  const primitivePrefix = `${PRIMITIVE_LABELS[base.form.primitive]} `
  // Generated names follow the primitive; curated names (such as the starter
  // scene's) are left untouched.
  const name =
    form.primitive !== base.form.primitive && base.name.startsWith(primitivePrefix)
      ? `${PRIMITIVE_LABELS[form.primitive]} ${base.name.slice(primitivePrefix.length)}`
      : base.name

  return {
    ...base,
    name,
    form,
    transform: patch.transform
      ? normalizeTransform({ ...base.transform, ...patch.transform })
      : base.transform,
    material: patch.material
      ? normalizeMaterial({ ...base.material, ...patch.material })
      : base.material,
    motion: patch.motion ? normalizeMotion({ ...base.motion, ...patch.motion }) : base.motion,
    reaction: patch.reaction
      ? normalizeReaction({ ...base.reaction, ...patch.reaction })
      : base.reaction,
  }
}

export function addObject(scene: SceneConfig, draft: ObjectPatch = {}): SceneConfig {
  if (scene.objects.length >= MAX_OBJECT_COUNT) {
    return scene
  }

  const sequence = scene.objectSequence + 1
  const object = applyObjectPatch(createObjectConfig(sequence), draft)
  const named: SceneObjectConfig = {
    ...object,
    name: `${PRIMITIVE_LABELS[object.form.primitive]} ${sequence}`,
  }

  return {
    ...scene,
    objectSequence: sequence,
    objects: [...scene.objects, named],
  }
}

export function duplicateObject(scene: SceneConfig, id: string): SceneConfig {
  const source = scene.objects.find((object) => object.id === id)
  if (!source || scene.objects.length >= MAX_OBJECT_COUNT) {
    return scene
  }

  const sequence = scene.objectSequence + 1
  const position: Vector3Tuple = [
    source.transform.position[0] + DUPLICATE_OFFSET,
    source.transform.position[1],
    source.transform.position[2] + DUPLICATE_OFFSET,
  ]
  const duplicate = normalizeObjectConfig({
    ...source,
    id: `object-${sequence}`,
    name: `${PRIMITIVE_LABELS[source.form.primitive]} ${sequence}`,
    transform: { ...source.transform, position },
  })
  return {
    ...scene,
    objectSequence: sequence,
    objects: [...scene.objects, duplicate],
  }
}

export function removeObject(scene: SceneConfig, id: string): SceneConfig {
  const objects = scene.objects.filter((object) => object.id !== id)
  return objects.length === scene.objects.length ? scene : { ...scene, objects }
}

export function patchObject(scene: SceneConfig, id: string, patch: ObjectPatch): SceneConfig {
  let changed = false
  const objects = scene.objects.map((object) => {
    if (object.id !== id) {
      return object
    }

    changed = true
    return applyObjectPatch(object, patch)
  })

  return changed ? { ...scene, objects } : scene
}

export function setBackdrop(scene: SceneConfig, backdrop: BackdropConfig): SceneConfig {
  return {
    ...scene,
    world: { ...scene.world, backdrop: normalizeBackdrop(backdrop) },
  }
}

export function setFloor(scene: SceneConfig, floor: FloorConfig): SceneConfig {
  return {
    ...scene,
    world: { ...scene.world, floor: normalizeFloor(floor) },
  }
}

export function setFog(scene: SceneConfig, fog: FogConfig): SceneConfig {
  return {
    ...scene,
    world: { ...scene.world, fog: normalizeFog(fog) },
  }
}

export function patchLighting(scene: SceneConfig, patch: Partial<LightingConfig>): SceneConfig {
  return {
    ...scene,
    world: {
      ...scene.world,
      lighting: normalizeLighting({ ...scene.world.lighting, ...patch }),
    },
  }
}

export function patchCamera(scene: SceneConfig, patch: Partial<CameraConfig>): SceneConfig {
  return {
    ...scene,
    camera: normalizeCamera({ ...scene.camera, ...patch }),
  }
}

export function patchFinish(scene: SceneConfig, patch: FinishPatch): SceneConfig {
  const finish: FinishConfig = {
    exposure: patch.exposure ?? scene.finish.exposure,
    bloom: patch.bloom ? { ...scene.finish.bloom, ...patch.bloom } : scene.finish.bloom,
  }

  return {
    ...scene,
    finish: normalizeFinish(finish),
  }
}

export function setDprCap(scene: SceneConfig, dprCap: number): SceneConfig {
  return {
    ...scene,
    canvas: { dprCap: clampNumber(dprCap, DPR_CAP_RANGE, scene.canvas.dprCap) },
  }
}
