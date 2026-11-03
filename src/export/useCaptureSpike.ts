import { useEffect, useState, useSyncExternalStore } from 'react'
import type { AudioEngine } from '../audio/AudioEngine'
import { CaptureSpike } from './captureSpike'

export function useCaptureSpike(engine: AudioEngine) {
  const [capture] = useState(() => new CaptureSpike(engine))
  const snapshot = useSyncExternalStore(capture.subscribe, capture.getSnapshot)

  useEffect(() => {
    return () => capture.dispose()
  }, [capture])

  return { capture, snapshot }
}
