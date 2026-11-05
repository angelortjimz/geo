import { describe, expect, it } from 'vitest'
import type { AspectRatioKind } from './aspectRatio'
import { createObjectConfig } from './sceneOperations'
import { MAX_OBJECT_COUNT } from './sceneLimits'
import {
  DEFAULT_CAMERA,
  DEFAULT_CANVAS,
  DEFAULT_DPR_CAP,
  DEFAULT_OBJECT_FORM,
  DEFAULT_OBJECT_MATERIAL,
  DEFAULT_OBJECT_MOTION,
  DEFAULT_OBJECT_REACTION,
} from './sceneDefaults'
import { normalizeObjectConfig, normalizeSceneConfig } from './sceneNormalize'
import type { SceneConfig, SceneObjectConfig } from './sceneConfig'
import { SCENE_VERSION } from './sceneConfig'
import { createBlankScene, createStarterScene } from './starterScene'

function createInvalidObject(): SceneObjectConfig {
  const base = createObjectConfig(1)

  return {
    ...base,
    id: '   ',
    name: '   ',
    form: { primitive: 'torus', detail: 99, flatShading: true },
    transform: {
      position: [100, -100, Number.NaN],
      rotation: [Number.NaN, 1_000, -1_000],
      scale: [0, 0.01, 9],
    },
    material: { kind: 'chrome', color: 'not-a-color', gloss: 4, emission: -1 },
    motion: {
      spin: 9,
      float: -1,
      floatSpeed: Number.NaN,
      orbitRadius: 99,
      orbitSpeed: -5,
      phase: 4,
    },
    reaction: {
      breathe: 9,
      strike: -2,
      flare: 9,
      energy: 9,
      drift: -1,
      expand: 99,
    },
  }
}

describe('scene normalization', () => {
  it('preserves valid scene documents', () => {
    expect(normalizeSceneConfig(createBlankScene())).toEqual(createBlankScene())
    expect(normalizeSceneConfig(createStarterScene())).toEqual(createStarterScene())
  })

  it('clamps every object section and repairs invalid identity', () => {
    const object = normalizeObjectConfig(createInvalidObject())

    expect(object.id).toBe('object-1')
    expect(object.name).toBe('Torus')
    expect(object.form.detail).toBe(4)
    expect(object.transform.position).toEqual([12, -12, 0])
    expect(object.transform.rotation).toEqual([0, 720, -720])
    expect(object.transform.scale).toEqual([0.05, 0.05, 4])
    expect(object.material.color).toBe('#e4edf2')
    expect(object.material.gloss).toBe(1)
    expect(object.material.emission).toBe(0)
    expect(object.motion.spin).toBe(1.5)
    expect(object.motion.float).toBe(0)
    expect(object.motion.floatSpeed).toBe(0.6)
    expect(object.motion.orbitRadius).toBe(6)
    expect(object.motion.orbitSpeed).toBe(0)
    expect(object.motion.phase).toBe(1)
    expect(object.reaction.breathe).toBe(0.2)
    expect(object.reaction.strike).toBe(0)
    expect(object.reaction.flare).toBe(1)
    expect(object.reaction.energy).toBe(1)
    expect(object.reaction.drift).toBe(0)
    expect(object.reaction.expand).toBe(2)
  })

  it('accepts the expanded primitive and material libraries', () => {
    for (const primitive of ['torusKnot', 'cone', 'cylinder'] as const) {
      const object = normalizeObjectConfig({
        ...createObjectConfig(1),
        form: { ...DEFAULT_OBJECT_FORM, primitive },
      })
      expect(object.form.primitive).toBe(primitive)
    }

    for (const kind of ['matte', 'wireframe'] as const) {
      const object = normalizeObjectConfig({
        ...createObjectConfig(1),
        material: { ...DEFAULT_OBJECT_MATERIAL, kind },
      })
      expect(object.material.kind).toBe(kind)
    }
  })

  it('keeps object ids unique and caps the object count', () => {
    const base = createBlankScene()
    const duplicate = { ...createObjectConfig(1), id: 'object-1' }
    const many: SceneObjectConfig[] = Array.from({ length: MAX_OBJECT_COUNT + 4 }, (_, index) => ({
      ...createObjectConfig(index + 1),
      id: index < 2 ? 'object-1' : `object-${index + 1}`,
    }))

    const scene: SceneConfig = {
      ...base,
      objects: [duplicate, duplicate, ...many],
    }
    const normalized = normalizeSceneConfig(scene)

    expect(normalized.objects).toHaveLength(MAX_OBJECT_COUNT)
    expect(normalized.objects[0].id).toBe('object-1')
    expect(normalized.objects[1].id).toBe('object-1-2')
    expect(new Set(normalized.objects.map((object) => object.id)).size).toBe(MAX_OBJECT_COUNT)
  })

  it('orders floor fade and fog distances', () => {
    const base = createBlankScene()
    const scene: SceneConfig = {
      ...base,
      world: {
        ...base.world,
        floor: { type: 'reflective', color: '#fff', size: -5, fadeStart: 30, fadeEnd: 10 },
        fog: { type: 'linear', color: '#fff', near: 50, far: 20 },
      },
    }
    const normalized = normalizeSceneConfig(scene)

    expect(normalized.world.floor).toEqual({
      type: 'reflective',
      color: '#fff',
      size: 4,
      fadeStart: 30,
      fadeEnd: 30.5,
    })
    expect(normalized.world.fog).toEqual({
      type: 'linear',
      color: '#fff',
      near: 50,
      far: 50.5,
    })
  })

  it('uses the canonical defaults when values are not finite', () => {
    const base = createBlankScene()
    const normalized = normalizeSceneConfig({
      ...base,
      canvas: { ...DEFAULT_CANVAS, dprCap: Number.NaN },
      camera: {
        ...base.camera,
        distance: Number.NaN,
        elevation: Number.NaN,
        fov: Number.NaN,
      },
    })

    expect(normalized.canvas.dprCap).toBe(DEFAULT_DPR_CAP)
    expect(normalized.camera.distance).toBe(DEFAULT_CAMERA.distance)
    expect(normalized.camera.elevation).toBe(DEFAULT_CAMERA.elevation)
    expect(normalized.camera.fov).toBe(DEFAULT_CAMERA.fov)

    const object = normalizeObjectConfig({
      ...createObjectConfig(1),
      form: { ...DEFAULT_OBJECT_FORM, detail: Number.NaN },
      material: { ...DEFAULT_OBJECT_MATERIAL, gloss: Number.NaN },
      motion: { ...DEFAULT_OBJECT_MOTION, spin: Number.NaN, float: Number.NaN },
      reaction: { ...DEFAULT_OBJECT_REACTION, breathe: Number.NaN, strike: Number.NaN },
    })

    expect(object.form.detail).toBe(DEFAULT_OBJECT_FORM.detail)
    expect(object.material.gloss).toBe(DEFAULT_OBJECT_MATERIAL.gloss)
    expect(object.motion.spin).toBe(DEFAULT_OBJECT_MOTION.spin)
    expect(object.motion.float).toBe(DEFAULT_OBJECT_MOTION.float)
    expect(object.reaction.breathe).toBe(DEFAULT_OBJECT_REACTION.breathe)
    expect(object.reaction.strike).toBe(DEFAULT_OBJECT_REACTION.strike)
  })

  it('clamps camera, finish, and canvas values', () => {
    const base = createBlankScene()
    const scene: SceneConfig = {
      ...base,
      seed: -12.7,
      objectSequence: -3,
      generationSequence: -3,
      canvas: { ...DEFAULT_CANVAS, dprCap: 9, format: '5:4' as AspectRatioKind },
      camera: {
        target: [100, 100, 100],
        distance: 100,
        azimuth: 540,
        elevation: -170,
        fov: 5,
        drift: Number.NaN,
      },
      finish: {
        exposure: 0,
        bloom: { enabled: true, threshold: 9, strength: 9, radius: -1 },
      },
    }
    const normalized = normalizeSceneConfig(scene)

    expect(normalized.version).toBe(SCENE_VERSION)
    expect(normalized.seed).toBe(0)
    expect(normalized.objectSequence).toBe(0)
    expect(normalized.generationSequence).toBe(0)
    expect(normalized.canvas.dprCap).toBe(3)
    expect(normalized.canvas.format).toBe(DEFAULT_CANVAS.format)
    expect(normalized.camera).toEqual({
      target: [12, 12, 12],
      distance: 30,
      azimuth: 180,
      elevation: -85,
      fov: 20,
      drift: 0.13,
    })
    expect(normalized.finish.exposure).toBe(0.2)
    expect(normalized.finish.bloom).toEqual({
      enabled: true,
      threshold: 2,
      strength: 2,
      radius: 0,
    })
  })
})
