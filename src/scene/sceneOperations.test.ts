import { describe, expect, it } from 'vitest'
import { MAX_OBJECT_COUNT } from './sceneLimits'
import {
  addObject,
  duplicateObject,
  patchCamera,
  patchFinish,
  patchLighting,
  patchObject,
  removeObject,
  setBackdrop,
  setDprCap,
  setFloor,
  setFog,
} from './sceneOperations'
import { createBlankScene, createStarterScene } from './starterScene'

describe('scene object operations', () => {
  it('adds objects with deterministic ids, names, and placement', () => {
    const scene = addObject(addObject(createBlankScene()))
    expect(scene.objectSequence).toBe(2)
    expect(scene.objects.map((object) => object.id)).toEqual(['object-1', 'object-2'])
    expect(scene.objects[0].name).toBe('Torus 1')
    expect(scene.objects[1].name).toBe('Torus 2')
    expect(scene.objects[1].transform.position).not.toEqual(scene.objects[0].transform.position)
  })

  it('applies and clamps an add draft', () => {
    const scene = addObject(createBlankScene(), {
      form: { primitive: 'box' },
      material: { kind: 'emissive', color: '#abcdef', emission: 5 },
      motion: { orbitRadius: 99 },
    })
    const object = scene.objects[0]

    expect(object.name).toBe('Box 1')
    expect(object.form.primitive).toBe('box')
    expect(object.material.kind).toBe('emissive')
    expect(object.material.color).toBe('#abcdef')
    expect(object.material.emission).toBe(1)
    expect(object.motion.orbitRadius).toBe(6)
  })

  it('refuses to add or duplicate beyond the object limit', () => {
    let scene = createBlankScene()
    for (let index = 0; index < MAX_OBJECT_COUNT; index += 1) {
      scene = addObject(scene)
    }
    const full = scene

    expect(addObject(full)).toBe(full)
    expect(duplicateObject(full, full.objects[0].id)).toBe(full)
  })

  it('duplicates an object beside its source with a new identity', () => {
    const source = createStarterScene()
    const scene = duplicateObject(source, 'object-1')
    const copy = scene.objects[2]

    expect(scene.objectSequence).toBe(3)
    expect(copy.id).toBe('object-3')
    expect(copy.name).toBe('Torus 3')
    expect(copy.transform.position[0]).toBeCloseTo(source.objects[0].transform.position[0] + 0.5)
    expect(copy.transform.position[2]).toBeCloseTo(source.objects[0].transform.position[2] + 0.5)
    expect(copy.form).toEqual(source.objects[0].form)
    expect(copy.motion).toEqual(source.objects[0].motion)
    expect(copy.reaction).toEqual(source.objects[0].reaction)
    expect(source.objects).toHaveLength(2)
  })

  it('ignores duplicate and remove requests for unknown ids', () => {
    const scene = createStarterScene()

    expect(duplicateObject(scene, 'missing')).toBe(scene)
    expect(removeObject(scene, 'missing')).toBe(scene)
  })

  it('removes an object without disturbing the others', () => {
    const scene = createStarterScene()
    const removed = removeObject(scene, 'object-1')

    expect(removed.objects).toHaveLength(1)
    expect(removed.objects[0]).toBe(scene.objects[1])
    expect(removed.objectSequence).toBe(scene.objectSequence)
    expect(scene.objects).toHaveLength(2)
  })

  it('patches one object immutably and keeps composed identity', () => {
    const scene = createStarterScene()
    const before = JSON.stringify(scene)
    const patched = patchObject(scene, 'object-1', {
      motion: { spin: 9 },
      material: { gloss: -1 },
    })
    const object = patched.objects[0]

    expect(object.id).toBe('object-1')
    expect(object.name).toBe('Chrome torus')
    expect(object.motion.spin).toBe(1.5)
    expect(object.material.gloss).toBe(0)
    expect(object.form).toBe(scene.objects[0].form)
    expect(patched.objects[1]).toBe(scene.objects[1])
    expect(JSON.stringify(scene)).toBe(before)
    expect(patchObject(scene, 'missing', { motion: { spin: 1 } })).toBe(scene)
  })

  it('renames generated objects when their primitive changes and preserves curated names', () => {
    const scene = addObject(createBlankScene())
    const box = patchObject(scene, 'object-1', { form: { primitive: 'box' } })
    expect(box.objects[0].name).toBe('Box 1')

    const starter = createStarterScene()
    const patched = patchObject(starter, 'object-1', { form: { primitive: 'icosahedron' } })
    expect(patched.objects[0].name).toBe('Chrome torus')
  })

  it('keeps the composed base transform when only reactions change', () => {
    const scene = createStarterScene()
    const patched = patchObject(scene, 'object-2', {
      reaction: { drift: 1.5, expand: 2, breathe: 0.2, strike: 0.25, flare: 1 },
    })

    expect(patched.objects[1].transform).toEqual(scene.objects[1].transform)
    expect(patched.objects[1].reaction).toEqual({
      drift: 1.5,
      expand: 2,
      breathe: 0.2,
      strike: 0.25,
      flare: 1,
    })
  })
})

describe('scene world, camera, and finish operations', () => {
  it('sets and sanitizes the backdrop', () => {
    const scene = setBackdrop(createBlankScene(), { type: 'solid', color: 'nope' })
    expect(scene.world.backdrop).toEqual({ type: 'solid', color: '#cfd6d6' })

    const gradient = setBackdrop(scene, {
      type: 'gradient',
      top: '#111',
      horizon: '#222',
      bottom: '#333',
    })
    expect(gradient.world.backdrop).toEqual({
      type: 'gradient',
      top: '#111',
      horizon: '#222',
      bottom: '#333',
    })
  })

  it('sets floor modes with ordered fade distances', () => {
    const scene = setFloor(createBlankScene(), {
      type: 'checker',
      lightColor: '#fff',
      darkColor: '#000',
      size: 500,
      fadeStart: 20,
      fadeEnd: 5,
    })

    expect(scene.world.floor).toEqual({
      type: 'checker',
      lightColor: '#fff',
      darkColor: '#000',
      size: 200,
      fadeStart: 20,
      fadeEnd: 20.5,
    })
    expect(setFloor(scene, { type: 'none' }).world.floor).toEqual({ type: 'none' })
  })

  it('sets fog and keeps far beyond near', () => {
    const scene = setFog(createBlankScene(), {
      type: 'linear',
      color: '#123456',
      near: 60,
      far: 40,
    })

    expect(scene.world.fog).toEqual({
      type: 'linear',
      color: '#123456',
      near: 60,
      far: 60.5,
    })
    expect(setFog(scene, { type: 'none' }).world.fog).toEqual({ type: 'none' })
  })

  it('patches lighting intensities and colors', () => {
    const scene = patchLighting(createBlankScene(), {
      ambientIntensity: -4,
      keyIntensity: 99,
      fillColor: '#fff',
    })

    expect(scene.world.lighting.ambientIntensity).toBe(0)
    expect(scene.world.lighting.keyIntensity).toBe(6)
    expect(scene.world.lighting.fillColor).toBe('#fff')
  })

  it('patches the camera with clamping and degree wrapping', () => {
    const scene = patchCamera(createBlankScene(), {
      distance: 1,
      azimuth: 540,
      elevation: 120,
    })

    expect(scene.camera.distance).toBe(2)
    expect(scene.camera.azimuth).toBe(180)
    expect(scene.camera.elevation).toBe(85)
    expect(scene.camera.target).toEqual([0, 0.9, 0])
  })

  it('patches finish values and bloom partially', () => {
    const scene = patchFinish(createBlankScene(), {
      exposure: 5,
      bloom: { strength: 9 },
    })

    expect(scene.finish.exposure).toBe(2.5)
    expect(scene.finish.bloom.strength).toBe(2)
    expect(scene.finish.bloom.threshold).toBe(0.85)
    expect(scene.finish.bloom.enabled).toBe(true)
  })

  it('clamps the canvas DPR cap', () => {
    expect(setDprCap(createBlankScene(), 0.2).canvas.dprCap).toBe(1)
    expect(setDprCap(createBlankScene(), 9).canvas.dprCap).toBe(3)
  })
})
