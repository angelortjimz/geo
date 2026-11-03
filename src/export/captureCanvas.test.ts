import { describe, expect, it } from 'vitest'
import { getCaptureDimensions, getContainedRect } from './captureCanvas'

describe('capture canvas sizing', () => {
  it('uses even H.264-friendly dimensions without changing layout size', () => {
    expect(getCaptureDimensions(1096, 795)).toEqual({ width: 1096, height: 796 })
    expect(getCaptureDimensions(1280, 720)).toEqual({ width: 1280, height: 720 })
  })

  it('contains the source without stretching its aspect ratio', () => {
    expect(getContainedRect(100, 50, 200, 200)).toEqual({
      x: 0,
      y: 50,
      width: 200,
      height: 100,
    })
  })
})
