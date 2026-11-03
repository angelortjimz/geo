import { describe, expect, it } from 'vitest'
import { ImpactSpring } from './spring'

describe('ImpactSpring', () => {
  it('stays at rest without an impulse', () => {
    const spring = new ImpactSpring()
    expect(spring.update(1 / 60)).toBe(0)
  })

  it('compresses, overshoots, and settles back to rest', () => {
    const spring = new ImpactSpring()
    spring.kick(1)

    let maximum = 0
    let minimum = 0
    for (let index = 0; index < 600; index += 1) {
      const value = spring.update(1 / 60)
      maximum = Math.max(maximum, value)
      minimum = Math.min(minimum, value)
    }

    expect(maximum).toBeGreaterThan(0.05)
    expect(minimum).toBeLessThan(0)
    expect(spring.update(1 / 60)).toBeCloseTo(0, 3)
  })

  it('clamps long frame deltas and supports a deterministic reset', () => {
    const spring = new ImpactSpring()
    spring.kick(2)
    const value = spring.update(10)
    expect(Number.isFinite(value)).toBe(true)
    expect(Math.abs(value)).toBeLessThanOrEqual(1.25)

    spring.reset()
    expect(spring.update(1 / 60)).toBe(0)
  })

  it('ignores invalid impulses and deltas', () => {
    const spring = new ImpactSpring()
    spring.kick(Number.NaN)
    expect(spring.update(Number.NaN)).toBe(0)
    expect(spring.update(-1)).toBe(0)
  })
})
