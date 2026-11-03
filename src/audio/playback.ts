export function clampPlaybackTime(value: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0
  }

  const safeValue = Number.isFinite(value) ? value : 0
  return Math.min(duration, Math.max(0, safeValue))
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(1, Math.max(0, value))
}

export function formatPlaybackTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const totalSeconds = Math.floor(safeSeconds + 0.0005)
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}
