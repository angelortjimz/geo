const MAX_DELTA_SECONDS = 0.05
const MAX_VALUE = 1.25
const MAX_VELOCITY = 12

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

/** A damped, zero-rest-length spring used for short transient compression. */
export class ImpactSpring {
  private value = 0
  private velocity = 0

  kick(strength: number): void {
    if (!Number.isFinite(strength) || strength <= 0) {
      return
    }

    this.velocity = clamp(this.velocity + clamp(strength, 0, 1) * 5.2, -MAX_VELOCITY, MAX_VELOCITY)
  }

  update(deltaSeconds: number): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return this.value
    }

    // Substeps keep the spring stable after a suspended tab or a slow frame.
    let remaining = Math.min(deltaSeconds, MAX_DELTA_SECONDS)
    while (remaining > 0) {
      const step = Math.min(remaining, 1 / 120)
      const acceleration = -185 * this.value - 16 * this.velocity
      this.velocity = clamp(this.velocity + acceleration * step, -MAX_VELOCITY, MAX_VELOCITY)
      this.value = clamp(this.value + this.velocity * step, -MAX_VALUE, MAX_VALUE)
      remaining -= step
    }

    if (Math.abs(this.value) < 0.00001 && Math.abs(this.velocity) < 0.0001) {
      this.value = 0
      this.velocity = 0
    }

    return this.value
  }

  reset(): void {
    this.value = 0
    this.velocity = 0
  }
}
