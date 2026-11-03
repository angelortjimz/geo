import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { AudioEngine } from '../audio/AudioEngine'
import { drawCaptureFrame, getCaptureDimensions } from '../export/captureCanvas'
import type { SceneCaptureHandle } from '../export/captureTypes'
import { SceneRenderer } from '../render/SceneRenderer'
import { getBackdropHorizonColor } from '../render/sceneTextures'
import { createStarterScene } from '../scene/starterScene'

const INITIAL_SCENE = createStarterScene()

interface SceneCanvasProps {
  engine: AudioEngine
}

export const SceneCanvas = forwardRef<SceneCaptureHandle, SceneCanvasProps>(function SceneCanvas(
  { engine },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<SceneRenderer | null>(null)
  const exportTargetRef = useRef<HTMLCanvasElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      beginCapture: () => {
        const source = canvasRef.current
        const renderer = rendererRef.current
        if (!source || !renderer) {
          return null
        }

        const target = document.createElement('canvas')
        const dimensions = getCaptureDimensions(source.width, source.height)
        target.width = dimensions.width
        target.height = dimensions.height
        if (!target.getContext('2d')) {
          return null
        }

        drawCaptureFrame(source, target, getBackdropHorizonColor(INITIAL_SCENE.world.backdrop))
        exportTargetRef.current = target
        renderer.setCaptureTarget(target)
        return target
      },
      endCapture: () => {
        rendererRef.current?.setCaptureTarget(null)
        exportTargetRef.current = null
      },
      resetMotion: () => rendererRef.current?.resetMotion(),
    }),
    [],
  )

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) {
      return
    }

    let renderer: SceneRenderer | null = null
    let observer: ResizeObserver | null = null

    try {
      renderer = new SceneRenderer(canvas, engine, INITIAL_SCENE)
      rendererRef.current = renderer
      setError(null)

      const resize = () => {
        const bounds = container.getBoundingClientRect()
        renderer?.resize(bounds.width, bounds.height, window.devicePixelRatio || 1)
      }
      observer = new ResizeObserver(resize)
      observer.observe(container)
      resize()
      renderer.start()
    } catch (cause) {
      console.error('[geo] The WebGL study could not be initialized.', cause)
      renderer?.dispose()
      rendererRef.current = null
      setError(
        'This browser could not start the WebGL artwork. Try a current desktop Chromium browser.',
      )
    }

    return () => {
      observer?.disconnect()
      exportTargetRef.current = null
      renderer?.dispose()
      if (rendererRef.current === renderer) {
        rendererRef.current = null
      }
    }
  }, [engine])

  return (
    <div ref={containerRef} className="canvas-stage scene-canvas-container">
      <canvas ref={canvasRef} className="scene-canvas" aria-hidden="true" />
      {error && (
        <div className="render-error" role="alert">
          {error}
        </div>
      )}
    </div>
  )
})
