import { describe, expect, it } from 'vitest'
import {
  FLOOR_FADE_END_RANGE,
  FLOOR_FADE_START_RANGE,
  POSITION_RANGE,
  clampInteger,
  clampNumber,
  clampOrderedPair,
  clampVector3,
  isValidHexColor,
  normalizeDegrees,
  sanitizeColor,
} from './sceneLimits'

describe('scene limits', () => {
  it('clamps finite numbers and replaces invalid ones', () => {
    const range = { minimum: 0, maximum: 1 }

    expect(clampNumber(0.5, range, 0)).toBe(0.5)
    expect(clampNumber(-2, range, 0)).toBe(0)
    expect(clampNumber(4, range, 0)).toBe(1)
    expect(clampNumber(Number.NaN, range, 0.25)).toBe(0.25)
    expect(clampNumber(Number.POSITIVE_INFINITY, range, 0.25)).toBe(0.25)
  })

  it('rounds integers into range', () => {
    const range = { minimum: 1, maximum: 4 }

    expect(clampInteger(2.6, range, 1)).toBe(3)
    expect(clampInteger(9, range, 1)).toBe(4)
    expect(clampInteger(Number.NaN, range, 2)).toBe(2)
  })

  it('clamps vectors component-wise with a fallback', () => {
    expect(clampVector3([20, -20, Number.NaN], POSITION_RANGE, [1, 2, 3])).toEqual([12, -12, 3])
  })

  it('wraps degrees into (-180, 180]', () => {
    expect(normalizeDegrees(0)).toBe(0)
    expect(normalizeDegrees(180)).toBe(180)
    expect(normalizeDegrees(-180)).toBe(180)
    expect(normalizeDegrees(540)).toBe(180)
    expect(normalizeDegrees(-190)).toBe(170)
    expect(normalizeDegrees(Number.NaN, 30)).toBe(30)
  })

  it('accepts only three- or six-digit hex colors', () => {
    expect(isValidHexColor('#abc')).toBe(true)
    expect(isValidHexColor('#A1B2C3')).toBe(true)
    expect(isValidHexColor('#abcd')).toBe(false)
    expect(isValidHexColor('red')).toBe(false)
    expect(sanitizeColor('nope', '#000000')).toBe('#000000')
    expect(sanitizeColor('#fff', '#000000')).toBe('#fff')
  })

  it('keeps fog and fade pairs ordered with a minimum gap', () => {
    const ordered = clampOrderedPair(40, 10, FLOOR_FADE_START_RANGE, FLOOR_FADE_END_RANGE, 0.5)
    expect(ordered.start).toBe(40)
    expect(ordered.end).toBe(40.5)

    expect(clampOrderedPair(60, 120, FLOOR_FADE_START_RANGE, FLOOR_FADE_END_RANGE, 0.5)).toEqual({
      start: 60,
      end: 120,
    })
  })
})
