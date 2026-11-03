export interface ImpactScale {
  horizontal: number
  vertical: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0
}

export function getBreathingScale(level: number, amount: number): number {
  const safeLevel = clamp(finiteOrZero(level), 0, 1)
  const safeAmount = clamp(finiteOrZero(amount), 0, 0.2)
  return 1 + safeLevel * safeAmount
}

export function getImpactScale(springValue: number, amount: number): ImpactScale {
  const displacement = clamp(finiteOrZero(springValue), -0.65, 1)
  const safeAmount = clamp(finiteOrZero(amount), 0, 0.25)

  return {
    horizontal: clamp(1 + displacement * safeAmount * 0.42, 0.9, 1.12),
    vertical: clamp(1 - displacement * safeAmount, 0.78, 1.12),
  }
}

export function getBalanceOffset(balance: number, maximumOffset: number): number {
  const safeBalance = clamp(finiteOrZero(balance), -1, 1)
  return safeBalance * Math.max(0, finiteOrZero(maximumOffset))
}

export function getExpandedOrbitRadius(
  baseRadius: number,
  width: number,
  maximumIncrease: number,
): number {
  const safeWidth = clamp(finiteOrZero(width), 0, 1)
  return (
    Math.max(0, finiteOrZero(baseRadius)) + safeWidth * Math.max(0, finiteOrZero(maximumIncrease))
  )
}
