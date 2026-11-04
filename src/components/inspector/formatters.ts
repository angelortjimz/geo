/** Shared inspector display formats, kept next to the fields they label. */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatUnits(value: number): string {
  return `${value.toFixed(1)} units`
}

export function formatDegrees(value: number): string {
  return `${value.toFixed(0)}°`
}

export function formatRadiansPerSecond(value: number): string {
  return `${value.toFixed(2)} rad/s`
}
