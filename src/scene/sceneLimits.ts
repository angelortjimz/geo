import type { Vector3Tuple } from './sceneConfig'

export interface NumericRange {
  readonly minimum: number
  readonly maximum: number
}

export const MAX_OBJECT_COUNT = 12
export const SEED_RANGE: NumericRange = { minimum: 0, maximum: 999_999 }
export const GENERATION_SEQUENCE_RANGE: NumericRange = { minimum: 0, maximum: 9_999 }

export const DPR_CAP_RANGE: NumericRange = { minimum: 1, maximum: 3 }

export const POSITION_RANGE: NumericRange = { minimum: -12, maximum: 12 }
export const ROTATION_RANGE: NumericRange = { minimum: -720, maximum: 720 }
export const SCALE_RANGE: NumericRange = { minimum: 0.05, maximum: 4 }
export const DETAIL_RANGE: NumericRange = { minimum: 1, maximum: 4 }

export const GLOSS_RANGE: NumericRange = { minimum: 0, maximum: 1 }
export const EMISSION_RANGE: NumericRange = { minimum: 0, maximum: 1 }

export const SPIN_RANGE: NumericRange = { minimum: 0, maximum: 1.5 }
export const FLOAT_RANGE: NumericRange = { minimum: 0, maximum: 0.6 }
export const FLOAT_SPEED_RANGE: NumericRange = { minimum: 0, maximum: 1.5 }
export const ORBIT_RADIUS_RANGE: NumericRange = { minimum: 0, maximum: 6 }
export const ORBIT_SPEED_RANGE: NumericRange = { minimum: 0, maximum: 1.5 }
export const PHASE_RANGE: NumericRange = { minimum: 0, maximum: 1 }

export const BREATHE_RANGE: NumericRange = { minimum: 0, maximum: 0.2 }
export const STRIKE_RANGE: NumericRange = { minimum: 0, maximum: 0.25 }
export const FLARE_RANGE: NumericRange = { minimum: 0, maximum: 1 }
export const ENERGY_RANGE: NumericRange = { minimum: 0, maximum: 1 }
export const DRIFT_RANGE: NumericRange = { minimum: 0, maximum: 1.5 }
export const EXPAND_RANGE: NumericRange = { minimum: 0, maximum: 2 }

export const FLOOR_SIZE_RANGE: NumericRange = { minimum: 4, maximum: 200 }
export const FLOOR_FADE_START_RANGE: NumericRange = { minimum: 0, maximum: 60 }
export const FLOOR_FADE_END_RANGE: NumericRange = { minimum: 1, maximum: 120 }
export const FOG_NEAR_RANGE: NumericRange = { minimum: 0, maximum: 80 }
export const FOG_FAR_RANGE: NumericRange = { minimum: 1, maximum: 200 }
export const AMBIENT_INTENSITY_RANGE: NumericRange = { minimum: 0, maximum: 3 }
export const LIGHT_INTENSITY_RANGE: NumericRange = { minimum: 0, maximum: 6 }

export const EXPOSURE_RANGE: NumericRange = { minimum: 0.2, maximum: 2.5 }
export const BLOOM_THRESHOLD_RANGE: NumericRange = { minimum: 0, maximum: 2 }
export const BLOOM_STRENGTH_RANGE: NumericRange = { minimum: 0, maximum: 2 }
export const BLOOM_RADIUS_RANGE: NumericRange = { minimum: 0, maximum: 1 }

export const CAMERA_TARGET_RANGE: NumericRange = { minimum: -12, maximum: 12 }
export const CAMERA_AZIMUTH_RANGE: NumericRange = { minimum: -180, maximum: 180 }
export const CAMERA_DISTANCE_RANGE: NumericRange = { minimum: 2, maximum: 30 }
export const CAMERA_ELEVATION_RANGE: NumericRange = { minimum: -85, maximum: 85 }
export const CAMERA_FOV_RANGE: NumericRange = { minimum: 20, maximum: 75 }
export const CAMERA_DRIFT_RANGE: NumericRange = { minimum: 0, maximum: 0.6 }

export interface OrderedPair {
  readonly start: number
  readonly end: number
}

export function clampNumber(value: number, range: NumericRange, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(range.maximum, Math.max(range.minimum, value))
}

export function clampInteger(value: number, range: NumericRange, fallback: number): number {
  return Math.round(clampNumber(value, range, fallback))
}

export function clampVector3(
  value: Vector3Tuple,
  range: NumericRange,
  fallback: Vector3Tuple,
): Vector3Tuple {
  return [
    clampNumber(value[0], range, fallback[0]),
    clampNumber(value[1], range, fallback[1]),
    clampNumber(value[2], range, fallback[2]),
  ]
}

/** Wraps an angle in degrees into the half-open interval (-180, 180]. */
export function normalizeDegrees(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  const wrapped = value % 360
  if (wrapped > 180) {
    return wrapped - 360
  }
  if (wrapped <= -180) {
    return wrapped + 360
  }
  return wrapped
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value)
}

export function sanitizeColor(value: string, fallback: string): string {
  return isValidHexColor(value) ? value : fallback
}

/**
 * Keeps a start/end pair ordered with a minimum gap, clamped to their ranges.
 * Used for fog near/far and floor fade distances.
 */
export function clampOrderedPair(
  start: number,
  end: number,
  startRange: NumericRange,
  endRange: NumericRange,
  minimumGap: number,
): OrderedPair {
  const safeStart = clampNumber(start, startRange, startRange.minimum)
  const safeEnd = clampNumber(end, endRange, Math.max(endRange.minimum, safeStart + minimumGap))
  const minimumEnd = Math.min(endRange.maximum, safeStart + minimumGap)

  return {
    start: safeStart,
    end: Math.max(safeEnd, minimumEnd),
  }
}
