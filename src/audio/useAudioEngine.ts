import { useEffect, useState, useSyncExternalStore } from 'react'
import { AudioEngine } from './AudioEngine'

export function useAudioEngine() {
  const [engine] = useState(() => new AudioEngine())
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot)

  useEffect(() => {
    return () => {
      void engine.dispose()
    }
  }, [engine])

  return { engine, snapshot }
}
