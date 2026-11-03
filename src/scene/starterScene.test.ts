import { describe, expect, it } from 'vitest'
import { getCameraPosition } from './camera'
import { normalizeSceneConfig } from './sceneNormalize'
import { createBlankScene, createStarterScene } from './starterScene'

describe('blank scene', () => {
  it('starts with no objects and a valid stage', () => {
    const scene = createBlankScene()

    expect(scene.version).toBe(2)
    expect(scene.objectSequence).toBe(0)
    expect(scene.objects).toHaveLength(0)
    expect(scene.world.floor.type).toBe('reflective')
    expect(normalizeSceneConfig(scene)).toEqual(scene)
  })
})

describe('starter scene', () => {
  it('is ordinary configuration with stable identities', () => {
    const scene = createStarterScene()

    expect(scene.objects.map((object) => object.id)).toEqual(['object-1', 'object-2'])
    expect(scene.objects.map((object) => object.name)).toEqual([
      'Chrome torus',
      'Emissive satellite',
    ])
    expect(scene.objectSequence).toBe(2)
    expect(normalizeSceneConfig(scene)).toEqual(scene)
  })

  it('demonstrates every initial signal through per-object reactions', () => {
    const [hero, satellite] = createStarterScene().objects

    expect(hero.motion.spin).toBeGreaterThan(0)
    expect(hero.reaction.breathe).toBeGreaterThan(0)
    expect(hero.reaction.strike).toBeGreaterThan(0)
    expect(hero.reaction.flare).toBeGreaterThan(0)
    expect(satellite.motion.orbitRadius).toBeGreaterThan(0)
    expect(satellite.reaction.drift).toBeGreaterThan(0)
    expect(satellite.reaction.expand).toBeGreaterThan(0)
  })

  it('frames the composition like the fixed study', () => {
    const [x, y, z] = getCameraPosition(createStarterScene().camera)

    expect(x).toBeCloseTo(6.2, 1)
    expect(y).toBeCloseTo(4.55, 1)
    expect(z).toBeCloseTo(9.15, 1)
  })

  it('returns independent documents', () => {
    expect(createStarterScene()).not.toBe(createStarterScene())
    expect(createStarterScene().objects).not.toBe(createStarterScene().objects)
    expect(createBlankScene()).not.toBe(createBlankScene())
  })
})
