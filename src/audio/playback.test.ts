import { describe, expect, it } from 'vitest'
import { clampPlaybackTime, clampVolume, formatPlaybackTime } from './playback'

describe('clampPlaybackTime', () => {
  it('clamps playback to the available track duration', () => {
    expect(clampPlaybackTime(-4, 10)).toBe(0)
    expect(clampPlaybackTime(4.5, 10)).toBe(4.5)
    expect(clampPlaybackTime(12, 10)).toBe(10)
  })

  it('handles invalid times and durations without producing NaN', () => {
    expect(clampPlaybackTime(Number.NaN, 10)).toBe(0)
    expect(clampPlaybackTime(Number.POSITIVE_INFINITY, 10)).toBe(0)
    expect(clampPlaybackTime(5, 0)).toBe(0)
    expect(clampPlaybackTime(5, -1)).toBe(0)
    expect(clampPlaybackTime(5, Number.NaN)).toBe(0)
  })
})

describe('clampVolume', () => {
  it('bounds volume and gives invalid input a safe value', () => {
    expect(clampVolume(-0.2)).toBe(0)
    expect(clampVolume(0.4)).toBe(0.4)
    expect(clampVolume(1.2)).toBe(1)
    expect(clampVolume(Number.NaN)).toBe(0)
    expect(clampVolume(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('formatPlaybackTime', () => {
  it('formats minute and hour durations', () => {
    expect(formatPlaybackTime(0)).toBe('0:00')
    expect(formatPlaybackTime(65.2)).toBe('1:05')
    expect(formatPlaybackTime(3_661)).toBe('1:01:01')
  })

  it('handles invalid and negative durations', () => {
    expect(formatPlaybackTime(-10)).toBe('0:00')
    expect(formatPlaybackTime(Number.NaN)).toBe('0:00')
    expect(formatPlaybackTime(Number.POSITIVE_INFINITY)).toBe('0:00')
  })
})
