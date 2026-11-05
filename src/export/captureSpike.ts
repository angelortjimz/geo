import type { AudioEngine, AudioRecordingTap, PlaybackStatus } from '../audio/AudioEngine'
import { createCaptureFilename, getSupportedMp4MimeTypes, hasMp4FileHeader } from './captureSupport'
import type { SceneCaptureHandle } from './captureTypes'

export type CaptureStatus = 'idle' | 'preparing' | 'recording' | 'finalizing' | 'complete' | 'error'

export interface CaptureSnapshot {
  status: CaptureStatus
  error: string | null
  fileName: string | null
}

interface ActiveCapture {
  phase: 'preparing' | 'recording' | 'finalizing'
  cancelled: boolean
  endRequested: boolean
  mimeType: string
  recorder: MediaRecorder | null
  stream: MediaStream | null
  audioTap: AudioRecordingTap | null
  canvasHandle: SceneCaptureHandle | null
  chunks: Blob[]
  timer: number | null
  engineUnsubscribe: (() => void) | null
}

const CAPTURE_DURATION_MS = 5_000
const READY_STATUSES: readonly PlaybackStatus[] = ['ready', 'playing', 'paused', 'ended']
const INITIAL_SNAPSHOT: CaptureSnapshot = {
  status: 'idle',
  error: null,
  fileName: null,
}
const UNSUPPORTED_MESSAGE =
  'The capture test needs Chromium with WebGL canvas capture and MP4 H.264/AAC recording support.'

function detectSupport(): { mimeTypes: string[]; message: string | null } {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof MediaStream === 'undefined' ||
    typeof HTMLCanvasElement === 'undefined' ||
    typeof HTMLCanvasElement.prototype.captureStream !== 'function'
  ) {
    return { mimeTypes: [], message: UNSUPPORTED_MESSAGE }
  }

  const mimeTypes = getSupportedMp4MimeTypes((candidate) =>
    MediaRecorder.isTypeSupported(candidate),
  )
  return {
    mimeTypes,
    message: mimeTypes.length > 0 ? null : UNSUPPORTED_MESSAGE,
  }
}

export class CaptureSpike {
  private readonly engine: AudioEngine
  private readonly listeners = new Set<() => void>()
  private snapshot: CaptureSnapshot = INITIAL_SNAPSHOT
  private active: ActiveCapture | null = null
  private downloadUrl: string | null = null
  private downloadUrlTimer: number | null = null

  constructor(engine: AudioEngine) {
    this.engine = engine
  }

  getSnapshot = (): CaptureSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async start(handle: SceneCaptureHandle): Promise<void> {
    if (this.active) {
      return
    }

    const audio = this.engine.getSnapshot()
    if (!READY_STATUSES.includes(audio.status) || audio.duration <= 0) {
      this.updateSnapshot({
        ...INITIAL_SNAPSHOT,
        status: 'error',
        error: 'Load a track before capturing the study.',
      })
      return
    }

    const support = detectSupport()
    if (support.message) {
      this.updateSnapshot({ ...INITIAL_SNAPSHOT, status: 'error', error: support.message })
      return
    }

    this.releaseDownloadUrl()
    const startOffset = this.engine.getCurrentTime()
    this.engine.pause()
    this.engine.seek(startOffset)
    const session: ActiveCapture = {
      phase: 'preparing',
      cancelled: false,
      endRequested: false,
      mimeType: support.mimeTypes[0],
      recorder: null,
      stream: null,
      audioTap: null,
      canvasHandle: null,
      chunks: [],
      timer: null,
      engineUnsubscribe: null,
    }
    this.active = session
    this.updateSnapshot({ ...INITIAL_SNAPSHOT, status: 'preparing' })

    try {
      const audioTap = this.engine.createRecordingTap()
      if (!audioTap) {
        throw new Error('The browser could not create an original-audio recording stream.')
      }
      session.audioTap = audioTap

      const canvas = handle.beginCapture()
      if (!canvas) {
        throw new Error('The WebGL canvas is not ready for capture.')
      }
      session.canvasHandle = handle
      // Capture always starts from the composed resting state, never from
      // whatever clock, orbit, or envelope the editor preview happened to have.
      handle.resetMotion()

      const videoStream = canvas.captureStream(30)
      const videoTrack = videoStream.getVideoTracks()[0]
      if (!videoTrack) {
        videoStream.getTracks().forEach((track) => track.stop())
        throw new Error('The browser did not provide a WebGL video track.')
      }

      session.stream = new MediaStream([videoTrack, ...audioTap.stream.getAudioTracks()])
      if (session.stream.getAudioTracks().length === 0) {
        throw new Error('The recording stream has no original-audio track.')
      }

      session.recorder = this.createRecorder(session, support.mimeTypes)
      session.phase = 'recording'
      this.updateSnapshot({ ...INITIAL_SNAPSHOT, status: 'recording' })
      session.timer = window.setTimeout(() => this.finish(session), CAPTURE_DURATION_MS)
      session.engineUnsubscribe = this.engine.subscribe(() => {
        if (!this.isActive(session) || session.phase !== 'recording') {
          return
        }
        const status = this.engine.getSnapshot().status
        if (status === 'ended') {
          this.finish(session)
        } else if (status === 'error') {
          this.fail(session, 'Playback stopped during capture. The partial file was discarded.')
        }
      })

      await this.engine.play()
      if (!this.isActive(session)) {
        return
      }
      const status = this.engine.getSnapshot().status
      if (status !== 'playing' && status !== 'ended') {
        throw new Error(
          this.engine.getSnapshot().error ?? 'Playback did not start for the capture test.',
        )
      }
    } catch (error) {
      console.error('[geo] The WebGL capture test could not start.', error)
      if (this.isActive(session)) {
        const message =
          error instanceof Error ? error.message : 'The WebGL capture test could not start.'
        this.fail(session, message)
      }
    }
  }

  stop(): void {
    const session = this.active
    if (session && session.phase === 'recording') {
      this.finish(session)
    }
  }

  cancel(): void {
    const session = this.active
    if (!session) {
      return
    }

    session.cancelled = true
    this.releaseResources(session)
    this.active = null
    this.updateSnapshot(INITIAL_SNAPSHOT)
  }

  resetFeedback(): void {
    if (!this.active) {
      this.updateSnapshot(INITIAL_SNAPSHOT)
    }
  }

  dispose(): void {
    this.cancel()
    this.releaseDownloadUrl()
    this.listeners.clear()
  }

  private createRecorder(session: ActiveCapture, mimeTypes: string[]): MediaRecorder {
    let lastError: unknown = null
    for (const mimeType of mimeTypes) {
      let recorder: MediaRecorder | null = null
      try {
        recorder = new MediaRecorder(session.stream!, {
          mimeType,
          videoBitsPerSecond: 8_000_000,
          audioBitsPerSecond: 192_000,
        })
        recorder.ondataavailable = (event) => {
          if (this.isActive(session) && event.data.size > 0) {
            session.chunks.push(event.data)
          }
        }
        recorder.onerror = () => {
          this.fail(session, 'The browser stopped MP4 recording. No file was kept.')
        }
        recorder.onstop = () => {
          void this.finalize(session)
        }
        recorder.start(100)
        session.mimeType = mimeType
        return recorder
      } catch (error) {
        lastError = error
        if (recorder) {
          recorder.ondataavailable = null
          recorder.onerror = null
          recorder.onstop = null
          if (recorder.state !== 'inactive') {
            try {
              recorder.stop()
            } catch {
              // A recorder that failed to start may already be inactive.
            }
          }
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('No advertised MP4 recorder configuration could start.')
  }

  private finish(session: ActiveCapture): void {
    if (!this.isActive(session) || session.phase !== 'recording') {
      return
    }

    session.phase = 'finalizing'
    session.endRequested = true
    this.clearTimer(session)
    session.engineUnsubscribe?.()
    session.engineUnsubscribe = null
    this.updateSnapshot({ status: 'finalizing', error: null, fileName: null })

    const recorder = session.recorder
    if (!recorder || recorder.state === 'inactive') {
      this.fail(session, 'The MP4 recorder stopped before a file could be finalized.')
      return
    }

    try {
      recorder.stop()
    } catch (error) {
      console.error('[geo] The capture test could not stop cleanly.', error)
      this.fail(session, 'The MP4 recorder could not be finalized. No file was kept.')
    }
  }

  private async finalize(session: ActiveCapture): Promise<void> {
    if (!this.isActive(session)) {
      return
    }
    if (!session.endRequested) {
      this.fail(session, 'The capture ended before it could be finalized. No file was kept.')
      return
    }

    const recorder = session.recorder
    const chunks = session.chunks.slice()
    const blob = new Blob(chunks, { type: recorder?.mimeType || session.mimeType })
    this.releaseResources(session)

    try {
      if (blob.size === 0) {
        throw new Error('The recorder produced an empty file.')
      }
      const header = await blob.slice(0, 12).arrayBuffer()
      if (!hasMp4FileHeader(header)) {
        throw new Error('The recorder did not produce a valid MP4 container.')
      }
      if (!this.isActive(session)) {
        return
      }

      const fileName = createCaptureFilename(this.engine.getSnapshot().trackName)
      this.triggerDownload(blob, fileName)
      this.active = null
      this.updateSnapshot({ status: 'complete', error: null, fileName })
    } catch (error) {
      console.error('[geo] The capture test produced an invalid file.', error)
      if (this.isActive(session)) {
        this.active = null
        this.updateSnapshot({
          status: 'error',
          error:
            error instanceof Error
              ? `${error.message} No file was kept.`
              : 'The MP4 was invalid. No file was kept.',
          fileName: null,
        })
      }
    }
  }

  private fail(session: ActiveCapture, message: string): void {
    if (!this.isActive(session)) {
      return
    }

    this.releaseResources(session)
    this.active = null
    this.updateSnapshot({ status: 'error', error: message, fileName: null })
  }

  private releaseResources(session: ActiveCapture): void {
    this.clearTimer(session)
    session.engineUnsubscribe?.()
    session.engineUnsubscribe = null

    const recorder = session.recorder
    session.recorder = null
    if (recorder) {
      recorder.ondataavailable = null
      recorder.onerror = null
      recorder.onstop = null
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch {
          // Teardown may race a recorder that is already stopping.
        }
      }
    }

    session.canvasHandle?.endCapture()
    session.canvasHandle = null
    session.audioTap?.dispose()
    session.audioTap = null
    for (const track of session.stream?.getTracks() ?? []) {
      track.stop()
    }
    session.stream = null
    session.chunks = []
  }

  private clearTimer(session: ActiveCapture): void {
    if (session.timer !== null) {
      window.clearTimeout(session.timer)
      session.timer = null
    }
  }

  private isActive(session: ActiveCapture): boolean {
    return this.active === session && !session.cancelled
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    this.releaseDownloadUrl()
    const url = URL.createObjectURL(blob)
    this.downloadUrl = url
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.rel = 'noopener'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    this.downloadUrlTimer = window.setTimeout(() => {
      if (this.downloadUrl === url) {
        this.releaseDownloadUrl()
      }
    }, 60_000)
  }

  private releaseDownloadUrl(): void {
    if (this.downloadUrlTimer !== null) {
      window.clearTimeout(this.downloadUrlTimer)
      this.downloadUrlTimer = null
    }
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl)
      this.downloadUrl = null
    }
  }

  private updateSnapshot(snapshot: CaptureSnapshot): void {
    this.snapshot = snapshot
    for (const listener of this.listeners) {
      listener()
    }
  }
}
