export interface AudioFeatures {
  level: number
  intensity: number
  impact: number
  balance: number
  width: number
}

export const AUDIO_FEATURE_CONSTANTS = {
  silenceRms: 0.0001,
  zeroThreshold: 0.000001,
  levelAttackSeconds: 0.025,
  levelReleaseSeconds: 0.12,
  intensityAttackSeconds: 0.45,
  intensityReleaseSeconds: 0.9,
  impactBaselineAttackSeconds: 0.08,
  impactBaselineReleaseSeconds: 1.2,
  impactRefractorySeconds: 0.11,
  impactDecaySeconds: 0.16,
  impactMinimumRise: 0.055,
  impactRelativeRise: 0.65,
  impactStrengthReference: 0.35,
  impactMinimumStrength: 0.25,
} as const

export const NEUTRAL_AUDIO_FEATURES: Readonly<AudioFeatures> = Object.freeze({
  level: 0,
  intensity: 0,
  impact: 0,
  balance: 0,
  width: 0,
})

export function createNeutralAudioFeatures(): AudioFeatures {
  return { ...NEUTRAL_AUDIO_FEATURES }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function envelope(value: number, target: number, deltaSeconds: number, seconds: number): number {
  const amount = 1 - Math.exp(-deltaSeconds / seconds)
  return value + (target - value) * amount
}

function finiteSample(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(1, Math.max(-1, value))
}

export class AudioFeatureExtractor {
  private readonly result = createNeutralAudioFeatures()
  private level = 0
  private intensity = 0
  private impact = 0
  private impactBaseline = 0
  private refractoryRemaining = 0

  process(
    left: Float32Array<ArrayBuffer>,
    right: Float32Array<ArrayBuffer>,
    deltaSeconds: number,
  ): Readonly<AudioFeatures> {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return this.result
    }

    const length = Math.min(left.length, right.length)
    let leftEnergy = 0
    let rightEnergy = 0
    let midEnergy = 0
    let sideEnergy = 0

    for (let index = 0; index < length; index += 1) {
      const leftSample = finiteSample(left[index]!)
      const rightSample = finiteSample(right[index]!)
      const mid = (leftSample + rightSample) * 0.5
      const side = (leftSample - rightSample) * 0.5
      leftEnergy += leftSample * leftSample
      rightEnergy += rightSample * rightSample
      midEnergy += mid * mid
      sideEnergy += side * side
    }

    const sampleDivisor = Math.max(1, length)
    leftEnergy /= sampleDivisor
    rightEnergy /= sampleDivisor
    midEnergy /= sampleDivisor
    sideEnergy /= sampleDivisor

    const rms = length > 0 ? Math.sqrt((leftEnergy + rightEnergy) * 0.5) : 0
    const targetLevel = rms > AUDIO_FEATURE_CONSTANTS.silenceRms ? clamp01(rms) : 0
    this.level = envelope(
      this.level,
      targetLevel,
      deltaSeconds,
      targetLevel > this.level
        ? AUDIO_FEATURE_CONSTANTS.levelAttackSeconds
        : AUDIO_FEATURE_CONSTANTS.levelReleaseSeconds,
    )
    this.intensity = envelope(
      this.intensity,
      targetLevel,
      deltaSeconds,
      targetLevel > this.intensity
        ? AUDIO_FEATURE_CONSTANTS.intensityAttackSeconds
        : AUDIO_FEATURE_CONSTANTS.intensityReleaseSeconds,
    )

    this.refractoryRemaining = Math.max(0, this.refractoryRemaining - deltaSeconds)
    this.impact *= Math.exp(-deltaSeconds / AUDIO_FEATURE_CONSTANTS.impactDecaySeconds)

    const rise = rms - this.impactBaseline
    const threshold = Math.max(
      AUDIO_FEATURE_CONSTANTS.impactMinimumRise,
      this.impactBaseline * AUDIO_FEATURE_CONSTANTS.impactRelativeRise,
    )
    let triggered = false
    if (targetLevel > 0 && this.refractoryRemaining === 0 && rise >= threshold) {
      const strength = clamp01(
        Math.max(
          AUDIO_FEATURE_CONSTANTS.impactMinimumStrength,
          rise / AUDIO_FEATURE_CONSTANTS.impactStrengthReference,
        ),
      )
      this.impact = Math.max(this.impact, strength)
      this.refractoryRemaining = AUDIO_FEATURE_CONSTANTS.impactRefractorySeconds
      triggered = true
    }

    if (triggered) {
      // A sustained loud passage becomes the new reference immediately rather
      // than retriggering whenever the refractory interval elapses.
      this.impactBaseline = Math.max(this.impactBaseline, rms)
    } else {
      this.impactBaseline = envelope(
        this.impactBaseline,
        rms,
        deltaSeconds,
        rms > this.impactBaseline
          ? AUDIO_FEATURE_CONSTANTS.impactBaselineAttackSeconds
          : AUDIO_FEATURE_CONSTANTS.impactBaselineReleaseSeconds,
      )
    }

    const stereoEnergy = Math.sqrt(leftEnergy) + Math.sqrt(rightEnergy)
    const balance =
      stereoEnergy > AUDIO_FEATURE_CONSTANTS.silenceRms * 2
        ? (Math.sqrt(rightEnergy) - Math.sqrt(leftEnergy)) / stereoEnergy
        : 0
    const midSideEnergy = midEnergy + sideEnergy
    const width =
      midSideEnergy > AUDIO_FEATURE_CONSTANTS.silenceRms * AUDIO_FEATURE_CONSTANTS.silenceRms
        ? Math.sqrt(sideEnergy / midSideEnergy)
        : 0

    if (targetLevel === 0 && this.level < AUDIO_FEATURE_CONSTANTS.zeroThreshold) {
      this.level = 0
    }
    if (targetLevel === 0 && this.intensity < AUDIO_FEATURE_CONSTANTS.zeroThreshold) {
      this.intensity = 0
    }
    if (this.impact < AUDIO_FEATURE_CONSTANTS.zeroThreshold) {
      this.impact = 0
    }
    if (rms === 0 && this.impactBaseline < AUDIO_FEATURE_CONSTANTS.zeroThreshold) {
      this.impactBaseline = 0
    }

    this.result.level = clamp01(this.level)
    this.result.intensity = clamp01(this.intensity)
    this.result.impact = clamp01(this.impact)
    this.result.balance = Math.min(1, Math.max(-1, balance))
    this.result.width = clamp01(width)
    return this.result
  }

  reset(): void {
    this.level = 0
    this.intensity = 0
    this.impact = 0
    this.impactBaseline = 0
    this.refractoryRemaining = 0
    this.result.level = 0
    this.result.intensity = 0
    this.result.impact = 0
    this.result.balance = 0
    this.result.width = 0
  }
}
