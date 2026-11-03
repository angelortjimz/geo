import type { CameraConfig, Vector3Tuple } from './sceneConfig'
import {
  CAMERA_DISTANCE_RANGE,
  CAMERA_ELEVATION_RANGE,
  clampNumber,
  normalizeDegrees,
} from './sceneLimits'

const DEGREES_TO_RADIANS = Math.PI / 180
const DEFAULT_DISTANCE = 11.6
const DEFAULT_ELEVATION = 18

/** Pointer drag sensitivity in degrees per CSS pixel. */
export const AZIMUTH_DEGREES_PER_PIXEL = 0.28
export const ELEVATION_DEGREES_PER_PIXEL = 0.24
/** Wheel zoom sensitivity; positive deltas move the camera away from the target. */
export const ZOOM_PER_WHEEL_UNIT = 0.0015

export interface CameraNavigationPatch {
  readonly azimuth?: number
  readonly elevation?: number
  readonly distance?: number
}

/** Places the camera on its authored spherical orbit around the target. */
export function getCameraPosition(camera: CameraConfig): Vector3Tuple {
  const distance = clampNumber(camera.distance, CAMERA_DISTANCE_RANGE, DEFAULT_DISTANCE)
  const elevation = clampNumber(camera.elevation, CAMERA_ELEVATION_RANGE, DEFAULT_ELEVATION)
  const azimuthRadians = normalizeDegrees(camera.azimuth) * DEGREES_TO_RADIANS
  const elevationRadians = elevation * DEGREES_TO_RADIANS
  const horizontalDistance = Math.cos(elevationRadians) * distance

  return [
    camera.target[0] + Math.sin(azimuthRadians) * horizontalDistance,
    camera.target[1] + Math.sin(elevationRadians) * distance,
    camera.target[2] + Math.cos(azimuthRadians) * horizontalDistance,
  ]
}

/** Converts a pointer drag into a clamped camera patch. */
export function applyCameraDrag(
  camera: CameraConfig,
  deltaX: number,
  deltaY: number,
): CameraNavigationPatch {
  const safeDeltaX = Number.isFinite(deltaX) ? deltaX : 0
  const safeDeltaY = Number.isFinite(deltaY) ? deltaY : 0

  return {
    azimuth: normalizeDegrees(camera.azimuth - safeDeltaX * AZIMUTH_DEGREES_PER_PIXEL),
    elevation: clampNumber(
      camera.elevation - safeDeltaY * ELEVATION_DEGREES_PER_PIXEL,
      CAMERA_ELEVATION_RANGE,
      DEFAULT_ELEVATION,
    ),
  }
}

/** Converts wheel movement into a clamped distance patch. */
export function applyCameraZoom(camera: CameraConfig, wheelDelta: number): CameraNavigationPatch {
  const safeWheelDelta = Number.isFinite(wheelDelta) ? wheelDelta : 0
  const distance = camera.distance * Math.exp(safeWheelDelta * ZOOM_PER_WHEEL_UNIT)

  return {
    distance: clampNumber(distance, CAMERA_DISTANCE_RANGE, DEFAULT_DISTANCE),
  }
}
