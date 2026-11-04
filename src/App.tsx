import { useRef, useState } from 'react'
import { useAudioEngine } from './audio/useAudioEngine'
import { AudioUpload } from './components/AudioUpload'
import { CaptureControl } from './components/CaptureControl'
import { Inspector } from './components/inspector/Inspector'
import { PlaybackControls } from './components/PlaybackControls'
import { SceneCanvas } from './components/SceneCanvas'
import { WelcomeIntro, WelcomeOverlay } from './components/Welcome'
import { useSceneEditor } from './editor/useSceneEditor'
import type { SceneCaptureHandle } from './export/captureTypes'
import { useCaptureSpike } from './export/useCaptureSpike'

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
            className={snapshot.error || captureSnapshot.error ? 'transport-error' : undefined}
            role={snapshot.error || captureSnapshot.error ? 'alert' : 'status'}
          >
            {snapshot.error ??
              captureSnapshot.error ??
              (captureSnapshot.status === 'recording'
                ? 'Recording the scene…'
                : captureSnapshot.status === 'finalizing'
                  ? 'Finalizing MP4…'
                  : captureSnapshot.status === 'complete'
                    ? `Saved ${captureSnapshot.fileName}`
                    : isWelcome
                      ? 'Choose a blank or starter scene to begin.'
                      : snapshot.status === 'idle'
                        ? 'Drop audio anywhere to begin'
                        : null)}
          </span>
        </div>
      </footer>
    </main>
  )
}
