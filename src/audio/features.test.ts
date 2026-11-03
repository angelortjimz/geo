import { describe, expect, it } from 'vitest'
import {
  AudioFeatureExtractor,
  NEUTRAL_AUDIO_FEATURES,
  createNeutralAudioFeatures,
  type AudioFeatures,
} from './features'

function channels(
  length: number,
  leftValue: number | ((index: number) => number),
  rightValue: number | ((index: number) => number) = leftValue,
): { left: Float32Array<ArrayBuffer>; right: Float32Array<ArrayBuffer> } {
  const left = new Float32Array(length)
  const right = new Float32Array(length)
  for (let index = 0; index < length; index += 1) {
    left[index] = typeof leftValue === 'function' ? leftValue(index) : leftValue
    right[index] = typeof rightValue === 'function' ? rightValue(index) : rightValue
  }
  return { left, right }
}

function expectBounded(features: Readonly<AudioFeatures>): void {
  expect(features.level).toBeGreaterThanOrEqual(0)
  expect(features.level).toBeLessThanOrEqual(1)
  expect(features.intensity).toBeGreaterThanOrEqual(0)
  expect(features.intensity).toBeLessThanOrEqual(1)
  expect(features.impact).toBeGreaterThanOrEqual(0)
  expect(features.impact).toBeLessThanOrEqual(1)
  expect(features.balance).toBeGreaterThanOrEqual(-1)
  expect(features.balance).toBeLessThanOrEqual(1)
  expect(features.width).toBeGreaterThanOrEqual(0)
  expect(features.width).toBeLessThanOrEqual(1)
  expect(Number.isFinite(features.level)).toBe(true)
  expect(Number.isFinite(features.intensity)).toBe(true)
  expect(Number.isFinite(features.impact)).toBe(true)
  expect(Number.isFinite(features.balance)).toBe(true)
  expect(Number.isFinite(features.width)).toBe(true)
}

describe('AudioFeatureExtractor loudness', () => {
  it('measures known combined RMS and keeps every signal bounded', () => {
    const extractor = new AudioFeatureExtractor()
    const { left, right } = channels(2_048, 0.5)
    const features = extractor.process(left, right, 10)

    expect(features.level).toBeCloseTo(0.5, 6)
    expect(features.intensity).toBeCloseTo(0.5, 6)
    expect(features.balance).toBe(0)
    expect(features.width).toBe(0)
    expectBounded(features)
  })

  it('uses fast level and slow intensity attack/release envelopes', () => {
    const extractor = new AudioFeatureExtractor()
    const loud = channels(2_048, 0.8)
    const silence = channels(2_048, 0)

    const attacked = extractor.process(loud.left, loud.right, 0.05)
    expect(attacked.level).toBeGreaterThan(0.65)
    expect(attacked.intensity).toBeGreaterThan(0)
    expect(attacked.intensity).toBeLessThan(attacked.level * 0.2)

    const loudLevel = attacked.level
    const loudIntensity = attacked.intensity
    const released = extractor.process(silence.left, silence.right, 0.03)
    expect(released.level).toBeLessThan(loudLevel)
    expect(released.level).toBeGreaterThan(0)
    expect(released.intensity).toBeLessThan(loudIntensity)

    const neutral = extractor.process(silence.left, silence.right, 20)
    expect(neutral).toEqual(NEUTRAL_AUDIO_FEATURES)
  })

  it('resets all envelopes and reuses its allocation-free result object', () => {
    const extractor = new AudioFeatureExtractor()
    const loud = channels(2_048, 0.9, 0)
    const result = extractor.process(loud.left, loud.right, 0.1)
    expect(result).not.toEqual(NEUTRAL_AUDIO_FEATURES)

    extractor.reset()
    expect(result).toEqual(NEUTRAL_AUDIO_FEATURES)
    expect(extractor.process(loud.left, loud.right, 0)).toBe(result)
    expect(createNeutralAudioFeatures()).toEqual(NEUTRAL_AUDIO_FEATURES)
    expect(createNeutralAudioFeatures()).not.toBe(NEUTRAL_AUDIO_FEATURES)
  })
})

describe('AudioFeatureExtractor stereo signals', () => {
  it('keeps identical and mono-style channels centered with exactly zero width', () => {
    const extractor = new AudioFeatureExtractor()
    const mono = channels(
      2_048,
      (index) => Math.sin(index * 0.17) * 0.7,
      (index) => Math.sin(index * 0.17) * 0.7,
    )
    const features = extractor.process(mono.left, mono.right, 1 / 60)

    expect(features.balance).toBe(0)
    expect(features.width).toBe(0)
    expectBounded(features)
  })

  it('reports hard-left and hard-right balance with useful side energy', () => {
    const leftExtractor = new AudioFeatureExtractor()
    const hardLeft = channels(2_048, 0.75, 0)
    const leftFeatures = leftExtractor.process(hardLeft.left, hardLeft.right, 1 / 60)
    expect(leftFeatures.balance).toBe(-1)
    expect(leftFeatures.width).toBeCloseTo(Math.sqrt(0.5), 6)

    const rightExtractor = new AudioFeatureExtractor()
    const hardRight = channels(2_048, 0, 0.75)
    const rightFeatures = rightExtractor.process(hardRight.left, hardRight.right, 1 / 60)
    expect(rightFeatures.balance).toBe(1)
    expect(rightFeatures.width).toBeCloseTo(Math.sqrt(0.5), 6)
  })

  it('reports full width for anti-phase stereo while remaining centered', () => {
    const extractor = new AudioFeatureExtractor()
    const wide = channels(2_048, 0.5, -0.5)
    const features = extractor.process(wide.left, wide.right, 1 / 60)

    expect(features.balance).toBe(0)
    expect(features.width).toBe(1)
    expect(features.level).toBeGreaterThan(0)
    expectBounded(features)
  })

  it('returns neutral stereo signals for silence and tiny signals', () => {
    const extractor = new AudioFeatureExtractor()
    const silence = channels(2_048, 0)
    expect(extractor.process(silence.left, silence.right, 1 / 60)).toEqual(NEUTRAL_AUDIO_FEATURES)

    const tiny = channels(2_048, 0.000001, 0)
    const features = extractor.process(tiny.left, tiny.right, 1 / 60)
    expect(features.balance).toBe(0)
    expect(features.width).toBe(0)
    expect(features.level).toBe(0)
    expectBounded(features)
  })
})

describe('AudioFeatureExtractor impacts', () => {
  it('creates a decaying impulse for a positive rise', () => {
    const extractor = new AudioFeatureExtractor()
    const silence = channels(2_048, 0)
    const loud = channels(2_048, 0.9)

    const onset = extractor.process(loud.left, loud.right, 1 / 60).impact
    expect(onset).toBe(1)
    const decayed = extractor.process(silence.left, silence.right, 0.05).impact
    expect(decayed).toBeGreaterThan(0)
    expect(decayed).toBeLessThan(onset)
  })

  it('honors the refractory period before allowing a stronger impulse', () => {
    const extractor = new AudioFeatureExtractor()
    const moderate = channels(2_048, 0.2)
    const loud = channels(2_048, 1)

    const firstImpact = extractor.process(moderate.left, moderate.right, 1 / 60).impact
    expect(firstImpact).toBeGreaterThan(0)
    const duringRefractory = extractor.process(loud.left, loud.right, 0.01).impact
    expect(duringRefractory).toBeLessThan(firstImpact)

    const afterRefractory = extractor.process(loud.left, loud.right, 0.2).impact
    expect(afterRefractory).toBe(1)
  })

  it('does not continuously retrigger on sustained loud material', () => {
    const extractor = new AudioFeatureExtractor()
    const sustained = channels(2_048, 0.8)
    expect(extractor.process(sustained.left, sustained.right, 1 / 60).impact).toBe(1)

    let latestImpact = 1
    for (let frame = 0; frame < 180; frame += 1) {
      latestImpact = extractor.process(sustained.left, sustained.right, 1 / 60).impact
    }
    expect(latestImpact).toBe(0)
  })
})

describe('AudioFeatureExtractor defensive timing and sizing', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'does not advance state for invalid delta %s',
    (deltaSeconds) => {
      const extractor = new AudioFeatureExtractor()
      const stereo = channels(2_048, 0.8, 0.2)
      const before = { ...extractor.process(stereo.left, stereo.right, 0.05) }
      const silence = channels(2_048, 0)
      const after = extractor.process(silence.left, silence.right, deltaSeconds)
      expect({ ...after }).toEqual(before)
      expectBounded(after)
    },
  )

  it('uses the shorter channel length and tolerates empty channels', () => {
    const extractor = new AudioFeatureExtractor()
    const left = new Float32Array(32).fill(0.5)
    const right = new Float32Array(16).fill(0.5)
    const features = extractor.process(left, right, 10)
    expect(features.level).toBeCloseTo(0.5, 6)
    expect(features.balance).toBe(0)
    expect(features.width).toBe(0)
    expectBounded(features)

    extractor.reset()
    const empty = extractor.process(new Float32Array(0), new Float32Array(8), 1 / 60)
    expect(empty).toEqual(NEUTRAL_AUDIO_FEATURES)
  })

  it('treats non-finite samples as silence instead of propagating NaN', () => {
    const extractor = new AudioFeatureExtractor()
    const left = new Float32Array([Number.NaN, Number.POSITIVE_INFINITY, 0])
    const right = new Float32Array([Number.NaN, Number.NEGATIVE_INFINITY, 0])
    const features = extractor.process(left, right, 1 / 60)
    expect(features).toEqual(NEUTRAL_AUDIO_FEATURES)
    expectBounded(features)
  })
})
