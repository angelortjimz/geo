import { describe, expect, it } from 'vitest'
import {
  getBalanceOffset,
  getBreathingScale,
  getExpandedOrbitRadius,
  getImpactScale,
} from './behaviors'

describe('fixed-study behaviors', () => {
  it('keeps breathing bounded and neutral at silence', () => {
    expect(getBreathingScale(0, 0.065)).toBe(1)
    expect(getBreathingScale(1, 0.065)).toBeCloseTo(1.065)
    expect(getBreathingScale(100, 0.065)).toBeCloseTo(1.065)
  })

  it('compresses vertically while preserving bounded horizontal scale', () => {
    const compressed = getImpactScale(1, 0.16)
    expect(compressed.vertical).toBeLessThan(1)
    expect(compressed.horizontal).toBeGreaterThan(1)

    const overshoot = getImpactScale(-0.5, 0.16)
    expect(overshoot.vertical).toBeGreaterThan(1)
    expect(overshoot.horizontal).toBeLessThan(1)
  })

  it('centers stereo drift and expands orbit without invalid values', () => {
    expect(getBalanceOffset(0, 0.5)).toBe(0)
    expect(getBalanceOffset(1, 0.5)).toBe(0.5)
    expect(getBalanceOffset(-1, 0.5)).toBe(-0.5)
    expect(getExpandedOrbitRadius(2, 0, 0.8)).toBe(2)
    expect(getExpandedOrbitRadius(2, 1, 0.8)).toBe(2.8)
    expect(getExpandedOrbitRadius(2, Number.NaN, 0.8)).toBe(2)
  })
})
