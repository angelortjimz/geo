export interface SceneCaptureHandle {
  beginCapture: () => HTMLCanvasElement | null
  endCapture: () => void
  resetMotion: () => void
}
