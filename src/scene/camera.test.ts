import { describe, expect, it } from 'vitest'
import { applyCameraDrag, applyCameraZoom, getCameraPosition } from './camera'
import type { CameraConfig } from './sceneConfig'
import { DEFAULT_CAMERA } from './sceneDefaults'

const CAMERA: CameraConfig = {
  target: [0, 1, 0],
  distance: 10,
  azimuth: 0,
  elevation: 0,
  fov: 40,
  drift: 0,
}

describe('spherical camera', () => {
  it('places the camera on its orbit around the target', () => {
    expect(getCameraPosition(CAMERA)).toEqual([0, 1, 10])
    const side = getCameraPosition({ ...CAMERA, azimuth: 90 })
    expect(side[0]).toBeCloseTo(10, 6)
    expect(side[1]).toBeCloseTo(1, 6)
    expect(side[2]).toBeCloseTo(0, 6)
  })

  it('clamps elevation and distance', () => {
    const high = getCameraPosition({ ...CAMERA, elevation: 90 })
    expect(high[1]).toBeCloseTo(1 + 10 * Math.sin((85 * Math.PI) / 180), 2)

    expect(getCameraPosition({ ...CAMERA, distance: 100 })[2]).toBeCloseTo(30, 5)
    expect(getCameraPosition({ ...CAMERA, distance: 0 })[2]).toBeCloseTo(2, 5)
  })

  it('keeps invalid input finite and falls back to canonical defaults', () => {
    const position = getCameraPosition({
      ...CAMERA,
      distance: Number.NaN,
      elevation: Number.NaN,
      azimuth: Number.NaN,
    })

    for (const value of position) {
      expect(Number.isFinite(value)).toBe(true)
    }

    const elevationRadians = (DEFAULT_CAMERA.elevation * Math.PI) / 180
    expect(position[1]).toBeCloseTo(
      CAMERA.target[1] + Math.sin(elevationRadians) * DEFAULT_CAMERA.distance,
      5,
    )
    expect(position[2]).toBeCloseTo(Math.cos(elevationRadians) * DEFAULT_CAMERA.distance, 5)
  })

  it('converts pointer drag into clamped camera patches', () => {
    expect(applyCameraDrag(CAMERA, 0, 0)).toEqual({ azimuth: 0, elevation: 0 })
    expect(applyCameraDrag(CAMERA, 100, 0).azimuth).toBeCloseTo(-28, 5)
    expect(applyCameraDrag(CAMERA, 0, 100).elevation).toBeCloseTo(-24, 5)
    expect(applyCameraDrag(CAMERA, 0, -10_000).elevation).toBe(85)
    expect(applyCameraDrag(CAMERA, 0, 10_000).elevation).toBe(-85)
    expect(applyCameraDrag({ ...CAMERA, azimuth: 170 }, -100, 0).azimuth).toBeCloseTo(-162, 5)
  })

  it('zooms deterministically within the distance range', () => {
    expect(applyCameraZoom(CAMERA, 0).distance).toBeCloseTo(10, 5)
    expect(applyCameraZoom(CAMERA, 1_000).distance).toBe(30)
    expect(applyCameraZoom(CAMERA, -10_000).distance).toBe(2)
    expect(applyCameraZoom(CAMERA, Number.NaN).distance).toBeCloseTo(10, 5)
  })
})
