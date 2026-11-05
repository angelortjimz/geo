import { describe, expect, it } from 'vitest'
import {
  ASPECT_RATIO_KINDS,
  ASPECT_RATIO_LABELS,
  ASPECT_RATIO_VALUES,
  getAspectRatio,
  isAspectRatioKind,
} from './aspectRatio'

describe('aspect ratios', () => {
  it('recognizes only the supported formats', () => {
    for (const kind of ASPECT_RATIO_KINDS) {
      expect(isAspectRatioKind(kind)).toBe(true)
    }

    expect(isAspectRatioKind('5:4')).toBe(false)
    expect(isAspectRatioKind(undefined)).toBe(false)
  })

  it('exposes a label and numeric ratio for every format', () => {
    for (const kind of ASPECT_RATIO_KINDS) {
      expect(ASPECT_RATIO_LABELS[kind].length).toBeGreaterThan(0)
      expect(getAspectRatio(kind)).toBe(ASPECT_RATIO_VALUES[kind])
      expect(getAspectRatio(kind)).toBeGreaterThan(0)
    }
  })
})
