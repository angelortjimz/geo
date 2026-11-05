import { useRef, useState } from 'react'
import type { AudioSnapshot } from './audio/AudioEngine'
import { useAudioEngine } from './audio/useAudioEngine'
import { AudioUpload } from './components/AudioUpload'
import { CaptureControl } from './components/CaptureControl'
import { Inspector } from './components/inspector/Inspector'
import { PlaybackControls } from './components/PlaybackControls'
import { SceneCanvas } from './components/SceneCanvas'
import { WelcomeIntro, WelcomeOverlay } from './components/Welcome'
import { useSceneEditor } from './editor/useSceneEditor'
import type { SceneCaptureHandle } from './export/captureTypes'
import type { CaptureSnapshot } from './export/captureSpike'
import { useCaptureSpike } from './export/useCaptureSpike'

function getTransportMessage(
  audio: AudioSnapshot,
  capture: CaptureSnapshot,
  isWelcome: boolean,
): string | null {
  if (audio.error) {
    return audio.error
  }
  if (capture.error) {
    return capture.error
  }

  switch (capture.status) {
    case 'recording':
      return 'Recording the scene…'
    case 'finalizing':
      return 'Finalizing MP4…'
    case 'complete':
      return `Saved ${capture.fileName}`
    default:
      break
  }

  if (isWelcome) {
    return 'Choose a blank or starter scene to begin.'
  }
  if (audio.status === 'idle') {
    return 'Drop audio anywhere to begin'
  }

  return null
}

export default function App() {
  const { engine, snapshot } = useAudioEngine()
  const { capture, snapshot: captureSnapshot } = useCaptureSpike(engine)
  const sceneRef = useRef<SceneCaptureHandle>(null)
  const dragDepthRef = useRef(0)
  const editor = useSceneEditor()
  const [dropActive, setDropActive] = useState(false)
  const captureActive = ['preparing', 'recording', 'finalizing'].includes(captureSnapshot.status)
  const trackReady = ['ready', 'playing', 'paused', 'ended'].includes(snapshot.status)
  const isWelcome = editor.mode === 'welcome'
  const feedbackMessage = getTransportMessage(snapshot, captureSnapshot, isWelcome)
  const hasFeedbackError = Boolean(snapshot.error || captureSnapshot.error)

  const loadFile = (file: File) => {
    if (captureActive) {
      return
    }
    capture.resetFeedback()
    void engine.load(file)
  }

  return (
    <main
      className={`app-shell${dropActive ? ' app-shell--drop-active' : ''}`}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes('Files')) {
          return
        }
        event.preventDefault()
        dragDepthRef.current += 1
        setDropActive(true)
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        }
      }}
      onDragLeave={(event) => {
        if (!event.dataTransfer.types.includes('Files')) {
          return
        }
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
        if (dragDepthRef.current === 0) {
          setDropActive(false)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        dragDepthRef.current = 0
        setDropActive(false)
        const file = event.dataTransfer.files[0]
        if (file) {
          loadFile(file)
        }
      }}
    >
      <SceneCanvas
        ref={sceneRef}
        engine={engine}
        scene={editor.scene}
        cameraLocked={captureActive}
        onCameraChange={editor.actions.patchCamera}
      />

      {isWelcome && (
        <WelcomeOverlay
          onStartBlank={editor.actions.requestBlank}
          onLoadStarter={editor.actions.requestStarter}
        />
      )}

      <aside className="composition-panel" aria-label="Scene workspace">
        <header className={`app-header${isWelcome ? ' app-header--welcome' : ''}`}>
          <h1 className="app-name">geo</h1>
          <p className="app-tagline">An audio-played CGI scene composer.</p>
        </header>

        {isWelcome ? <WelcomeIntro /> : <Inspector editor={editor} locked={captureActive} />}
      </aside>

      <footer className="transport" aria-label="Audio playback and capture">
        <AudioUpload
          trackName={snapshot.trackName}
          loading={snapshot.status === 'loading'}
          disabled={captureActive}
          onSelect={loadFile}
        />
        <PlaybackControls
          engine={engine}
          status={snapshot.status}
          duration={snapshot.duration}
          locked={captureActive}
        />
        <CaptureControl
          snapshot={captureSnapshot}
          disabled={!trackReady || captureActive || isWelcome}
          onStart={() => {
            const handle = sceneRef.current
            if (handle) {
              capture.resetFeedback()
              void capture.start(handle)
            }
          }}
          onStop={() => capture.stop()}
        />

        <div className="transport-feedback">
          <span>Local audio · no upload · session only</span>
          <span
            className={hasFeedbackError ? 'transport-error' : undefined}
            role={hasFeedbackError ? 'alert' : 'status'}
          >
            {feedbackMessage}
          </span>
        </div>
      </footer>
    </main>
  )
}
