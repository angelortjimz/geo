import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BLOOM,
  DEFAULT_CAMERA,
  DEFAULT_CANVAS,
  DEFAULT_CHECKER_FLOOR,
  DEFAULT_DPR_CAP,
  DEFAULT_FINISH,
  DEFAULT_LIGHTING,
  DEFAULT_LINEAR_FOG,
  DEFAULT_OBJECT_FORM,
  DEFAULT_OBJECT_MATERIAL,
  DEFAULT_OBJECT_MOTION,
  DEFAULT_OBJECT_REACTION,
  DEFAULT_REFLECTIVE_FLOOR,
  DEFAULT_SEED,
} from './sceneDefaults'
import {
  AMBIENT_INTENSITY_RANGE,
  BREATHE_RANGE,
  BLOOM_RADIUS_RANGE,
  BLOOM_STRENGTH_RANGE,
  BLOOM_THRESHOLD_RANGE,
  CAMERA_DISTANCE_RANGE,
  CAMERA_DRIFT_RANGE,
  CAMERA_ELEVATION_RANGE,
  CAMERA_FOV_RANGE,
  DETAIL_RANGE,
  DPR_CAP_RANGE,
  DRIFT_RANGE,
  EMISSION_RANGE,
  ENERGY_RANGE,
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
  ORBIT_RADIUS_RANGE,
  ORBIT_SPEED_RANGE,
  PHASE_RANGE,
  SEED_RANGE,
  SPIN_RANGE,
  STRIKE_RANGE,
  type NumericRange,
} from './sceneLimits'
import { createObjectConfig } from './sceneOperations'

function expectInRange(value: number, range: NumericRange): void {
  expect(value).toBeGreaterThanOrEqual(range.minimum)
  expect(value).toBeLessThanOrEqual(range.maximum)
}

describe('canonical scene defaults', () => {
  it('keeps every default inside its editable range', () => {
    expectInRange(DEFAULT_SEED, SEED_RANGE)
    expectInRange(DEFAULT_DPR_CAP, DPR_CAP_RANGE)
    expectInRange(DEFAULT_CAMERA.distance, CAMERA_DISTANCE_RANGE)
    expectInRange(DEFAULT_CAMERA.elevation, CAMERA_ELEVATION_RANGE)
    expectInRange(DEFAULT_CAMERA.fov, CAMERA_FOV_RANGE)
    expectInRange(DEFAULT_CAMERA.drift, CAMERA_DRIFT_RANGE)
    expectInRange(DEFAULT_FINISH.exposure, EXPOSURE_RANGE)
    expectInRange(DEFAULT_BLOOM.threshold, BLOOM_THRESHOLD_RANGE)
    expectInRange(DEFAULT_BLOOM.strength, BLOOM_STRENGTH_RANGE)
    expectInRange(DEFAULT_BLOOM.radius, BLOOM_RADIUS_RANGE)
    expectInRange(DEFAULT_OBJECT_FORM.detail, DETAIL_RANGE)
    expectInRange(DEFAULT_OBJECT_MATERIAL.gloss, GLOSS_RANGE)
    expectInRange(DEFAULT_OBJECT_MATERIAL.emission, EMISSION_RANGE)
    expectInRange(DEFAULT_OBJECT_MOTION.spin, SPIN_RANGE)
    expectInRange(DEFAULT_OBJECT_MOTION.float, FLOAT_RANGE)
    expectInRange(DEFAULT_OBJECT_MOTION.floatSpeed, FLOAT_SPEED_RANGE)
    expectInRange(DEFAULT_OBJECT_MOTION.orbitRadius, ORBIT_RADIUS_RANGE)
    expectInRange(DEFAULT_OBJECT_MOTION.orbitSpeed, ORBIT_SPEED_RANGE)
    expectInRange(DEFAULT_OBJECT_MOTION.phase, PHASE_RANGE)
    expectInRange(DEFAULT_OBJECT_REACTION.breathe, BREATHE_RANGE)
    expectInRange(DEFAULT_OBJECT_REACTION.strike, STRIKE_RANGE)
    expectInRange(DEFAULT_OBJECT_REACTION.flare, FLARE_RANGE)
    expectInRange(DEFAULT_OBJECT_REACTION.energy, ENERGY_RANGE)
    expectInRange(DEFAULT_OBJECT_REACTION.drift, DRIFT_RANGE)
    expectInRange(DEFAULT_OBJECT_REACTION.expand, EXPAND_RANGE)
    expectInRange(DEFAULT_REFLECTIVE_FLOOR.size, FLOOR_SIZE_RANGE)
    expectInRange(DEFAULT_REFLECTIVE_FLOOR.fadeStart, FLOOR_FADE_START_RANGE)
    expectInRange(DEFAULT_REFLECTIVE_FLOOR.fadeEnd, FLOOR_FADE_END_RANGE)
    expectInRange(DEFAULT_CHECKER_FLOOR.size, FLOOR_SIZE_RANGE)
    expectInRange(DEFAULT_CHECKER_FLOOR.fadeStart, FLOOR_FADE_START_RANGE)
    expectInRange(DEFAULT_CHECKER_FLOOR.fadeEnd, FLOOR_FADE_END_RANGE)
    expectInRange(DEFAULT_LINEAR_FOG.near, FOG_NEAR_RANGE)
    expectInRange(DEFAULT_LINEAR_FOG.far, FOG_FAR_RANGE)
    expectInRange(DEFAULT_LIGHTING.ambientIntensity, AMBIENT_INTENSITY_RANGE)
    expectInRange(DEFAULT_LIGHTING.keyIntensity, LIGHT_INTENSITY_RANGE)
    expectInRange(DEFAULT_LIGHTING.fillIntensity, LIGHT_INTENSITY_RANGE)
  })

  it('creates new objects from the canonical object defaults', () => {
    const object = createObjectConfig(1)

    expect(object.form).toEqual(DEFAULT_OBJECT_FORM)
    expect(object.material).toEqual(DEFAULT_OBJECT_MATERIAL)
    expect(object.motion).toEqual(DEFAULT_OBJECT_MOTION)
    expect(object.reaction).toEqual(DEFAULT_OBJECT_REACTION)
  })

  it('shares the canonical canvas default', () => {
    expect(DEFAULT_CANVAS).toEqual({ dprCap: DEFAULT_DPR_CAP, format: '16:9' })
  })
})
