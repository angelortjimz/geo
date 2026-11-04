import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { AudioEngine } from '../audio/AudioEngine'
import { drawCaptureFrame, getCaptureDimensions } from '../export/captureCanvas'
import type { SceneCaptureHandle } from '../export/captureTypes'
import { SceneRenderer } from '../render/SceneRenderer'
import { getBackdropHorizonColor } from '../render/sceneTextures'
import { applyCameraDrag, applyCameraZoom, type CameraNavigationPatch } from '../scene/camera'
import type { SceneConfig } from '../scene/sceneConfig'

interface SceneCanvasProps {
  engine: AudioEngine
  scene: SceneConfig
  cameraLocked?: boolean
  onCameraChange?: (patch: CameraNavigationPatch) => void
}

interface PointerDrag {
  readonly pointerId: number
  lastX: number
  lastY: number
}

export const SceneCanvas = forwardRef<SceneCaptureHandle, SceneCanvasProps>(function SceneCanvas(
  { engine, scene, cameraLocked = false, onCameraChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<SceneRenderer | null>(null)
  const exportTargetRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef(scene)
  const onCameraChangeRef = useRef(onCameraChange)
  const cameraLockedRef = useRef(cameraLocked)
  const dragRef = useRef<PointerDrag | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOrbiting, setIsOrbiting] = useState(false)

  sceneRef.current = scene
  onCameraChangeRef.current = onCameraChange
  cameraLockedRef.current = cameraLocked

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

        drawCaptureFrame(source, target, getBackdropHorizonColor(sceneRef.current.world.backdrop))
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
      renderer = new SceneRenderer(canvas, engine, sceneRef.current)
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
      console.error('[geo] The WebGL artwork could not be initialized.', cause)
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

  useEffect(() => {
    rendererRef.current?.applyConfig(scene)
  }, [scene])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const handleWheel = (event: WheelEvent) => {
      const changeCamera = onCameraChangeRef.current
      if (cameraLockedRef.current || !changeCamera) {
        return
      }

      event.preventDefault()
      changeCamera(applyCameraZoom(sceneRef.current.camera, event.deltaY))
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [])

  const endDrag = () => {
    dragRef.current = null
    setIsOrbiting(false)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (
      event.button !== 0 ||
      cameraLockedRef.current ||
      !onCameraChangeRef.current ||
      dragRef.current
    ) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    }
    setIsOrbiting(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    const changeCamera = onCameraChangeRef.current
    if (!drag || drag.pointerId !== event.pointerId || !changeCamera || cameraLockedRef.current) {
      return
    }

    const deltaX = event.clientX - drag.lastX
    const deltaY = event.clientY - drag.lastY
    drag.lastX = event.clientX
    drag.lastY = event.clientY

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    changeCamera(applyCameraDrag(sceneRef.current.camera, deltaX, deltaY))
  }

  return (
    <div ref={containerRef} className="canvas-stage scene-canvas-container">
      <canvas
        ref={canvasRef}
        className={`scene-canvas${isOrbiting ? ' scene-canvas--orbiting' : ''}${
          cameraLocked ? ' scene-canvas--locked' : ''
        }`}
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      />
      {error && (
        <div className="render-error" role="alert">
          {error}
        </div>
      )}
    </div>
  )
})
