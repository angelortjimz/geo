import { useEffect, useId, useRef, useState } from 'react'
import type { AudioEngine, PlaybackStatus } from '../audio/AudioEngine'
import { clampVolume, formatPlaybackTime } from '../audio/playback'

interface PlaybackControlsProps {
  engine: AudioEngine
  status: PlaybackStatus
  duration: number
  locked?: boolean
}

const SEEKABLE_STATUSES: readonly PlaybackStatus[] = ['ready', 'playing', 'paused', 'ended']

export function PlaybackControls({
  engine,
  status,
  duration,
  locked = false,
}: PlaybackControlsProps) {
  const seekId = useId()
  const volumeId = useId()
  const [elapsed, setElapsed] = useState(0)
  const [volume, setVolume] = useState(() => engine.getVolume())
  const scrubbingRef = useRef(false)
  const draftTimeRef = useRef<number | null>(null)
  const displayDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0
  const visibleTime = Math.min(Math.max(0, elapsed), displayDuration)
  const seekable = SEEKABLE_STATUSES.includes(status) && displayDuration > 0 && !locked
  const playbackEnabled = SEEKABLE_STATUSES.includes(status) && !locked
  const label =
    status === 'playing'
      ? 'Pause'
      : status === 'paused'
        ? 'Resume'
        : status === 'ended'
          ? 'Play again'
          : status === 'loading'
            ? 'Loading'
            : 'Play'

  useEffect(() => {
    const syncTime = () => {
      if (!scrubbingRef.current) {
        setElapsed(engine.getCurrentTime())
      }
    }

    syncTime()
    if (status !== 'playing') {
      return
    }

    const timer = window.setInterval(syncTime, 200)
    return () => window.clearInterval(timer)
  }, [duration, engine, status])

  const commitSeek = () => {
    if (!scrubbingRef.current) {
      return
    }
    scrubbingRef.current = false
    const target = draftTimeRef.current
    draftTimeRef.current = null
    if (target !== null) {
      engine.seek(target)
      setElapsed(engine.getCurrentTime())
    }
  }

  const cancelSeek = () => {
    scrubbingRef.current = false
    draftTimeRef.current = null
    setElapsed(engine.getCurrentTime())
  }

  const handleSeekChange = (value: number) => {
    if (scrubbingRef.current) {
      draftTimeRef.current = value
      setElapsed(value)
      return
    }
    engine.seek(value)
    setElapsed(engine.getCurrentTime())
  }

  return (
    <div className="playback-controls">
      <button
        type="button"
        className="playback-button"
        disabled={!playbackEnabled}
        onClick={() => void engine.togglePlayback()}
      >
        {label}
      </button>

      <div className="seek-control">
        <input
          id={seekId}
          className="transport-range seek-range"
          type="range"
          min={0}
          max={displayDuration}
          step={0.1}
          value={visibleTime}
          disabled={!seekable}
          aria-label="Seek"
          aria-valuetext={`${formatPlaybackTime(visibleTime)} of ${formatPlaybackTime(displayDuration)}`}
          onPointerDown={() => {
            scrubbingRef.current = true
            draftTimeRef.current = null
          }}
          onPointerUp={commitSeek}
          onPointerCancel={cancelSeek}
          onBlur={commitSeek}
          onChange={(event) => handleSeekChange(Number(event.currentTarget.value))}
        />
        <span className="time-readout" aria-hidden="true">
          {formatPlaybackTime(visibleTime)}
          <span> / </span>
          {formatPlaybackTime(displayDuration)}
        </span>
      </div>

      <div className="volume-control">
        <label htmlFor={volumeId}>Volume</label>
        <input
          id={volumeId}
          className="transport-range volume-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          aria-valuetext={`${Math.round(volume * 100)} percent`}
          onChange={(event) => {
            const nextVolume = clampVolume(Number(event.currentTarget.value))
            setVolume(nextVolume)
            engine.setVolume(nextVolume)
          }}
        />
        <output htmlFor={volumeId}>{Math.round(volume * 100)}%</output>
      </div>
    </div>
  )
}
