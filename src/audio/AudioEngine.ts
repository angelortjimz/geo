import { clampPlaybackTime, clampVolume } from './playback'
import { describeAudioFileIssue } from './validation'

export type PlaybackStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error'

export interface AudioSnapshot {
  status: PlaybackStatus
  trackName: string | null
  duration: number
  error: string | null
}

export interface AudioRecordingTap {
  stream: MediaStream
  dispose: () => void
}

const INITIAL_SNAPSHOT: AudioSnapshot = {
  status: 'idle',
  trackName: null,
  duration: 0,
  error: null,
}

const ANALYSIS_FRAME_SIZE = 2_048
const DECODE_ERROR =
  'This file could not be decoded. Try an MP3, WAV, or another supported audio file.'
const EMPTY_AUDIO_ERROR = 'This file contains no playable audio. Try another track.'
const AUDIO_CONTEXT_ERROR =
  'Web Audio is unavailable in this browser. Try a browser with audio support, such as Chromium.'
const PLAYBACK_BLOCKED_ERROR =
  'The browser blocked playback. Press Play again, and check that this site is allowed to play audio.'
const RESUME_TIMEOUT_MS = 1_500

function resumeAudioContext(context: AudioContext): Promise<boolean> {
  if (context.state !== 'suspended') {
    return Promise.resolve(true)
  }

  return Promise.race([
    context.resume().then(
      () => true,
      () => false,
    ),
    new Promise<boolean>((resolve) => {
      globalThis.setTimeout(() => resolve(false), RESUME_TIMEOUT_MS)
    }),
  ]).then((resumed) => resumed && context.state !== 'suspended')
}

function stopAndDisconnectSource(source: AudioBufferSourceNode | null): void {
  if (!source) {
    return
  }

  source.onended = null
  try {
    source.stop()
  } catch {
    // A source that already ended can be disconnected safely.
  }
  source.disconnect()
}

export class AudioEngine {
  private context: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private volumeNode: GainNode | null = null
  private recordingDestination: MediaStreamAudioDestinationNode | null = null
  private channelSplitter: ChannelSplitterNode | null = null
  private leftAnalyser: AnalyserNode | null = null
  private rightAnalyser: AnalyserNode | null = null
  private buffer: AudioBuffer | null = null
  private source: AudioBufferSourceNode | null = null
  private snapshot: AudioSnapshot = INITIAL_SNAPSHOT
  private readonly listeners = new Set<() => void>()
  private loadGeneration = 0
  private playbackGeneration = 0
  private analysisRevision = 0
  private startedAt = 0
  private offset = 0
  private volume = 1

  getSnapshot = (): AudioSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async load(file: File): Promise<void> {
    const generation = ++this.loadGeneration
    this.analysisRevision += 1
    this.stopSources()
    this.buffer = null
    this.offset = 0

    const fileIssue = describeAudioFileIssue(file)
    if (fileIssue) {
      this.updateSnapshot({
        status: 'error',
        trackName: file.name,
        duration: 0,
        error: fileIssue.message,
      })
      return
    }

    this.updateSnapshot({
      status: 'loading',
      trackName: file.name,
      duration: 0,
      error: null,
    })

    let context: AudioContext
    try {
      // Decoding works while the context is suspended, so loading never depends
      // on the browser granting audio playback from a gesture.
      context = this.ensureAudioGraph().context
    } catch {
      if (generation !== this.loadGeneration) {
        return
      }

      this.updateSnapshot({
        status: 'error',
        trackName: file.name,
        duration: 0,
        error: AUDIO_CONTEXT_ERROR,
      })
      return
    }

    try {
      const data = await file.arrayBuffer()
      const buffer = await context.decodeAudioData(data)
      if (generation !== this.loadGeneration) {
        return
      }

      if (!(buffer.duration > 0)) {
        this.buffer = null
        this.updateSnapshot({
          status: 'error',
          trackName: file.name,
          duration: 0,
          error: EMPTY_AUDIO_ERROR,
        })
        return
      }

      this.buffer = buffer
      this.offset = 0
      this.updateSnapshot({
        status: 'ready',
        trackName: file.name,
        duration: buffer.duration,
        error: null,
      })
    } catch {
      if (generation !== this.loadGeneration) {
        return
      }

      this.buffer = null
      this.updateSnapshot({
        status: 'error',
        trackName: file.name,
        duration: 0,
        error: DECODE_ERROR,
      })
    }
  }

  async play(): Promise<void> {
    const buffer = this.buffer
    if (!buffer || this.snapshot.status === 'playing' || this.snapshot.status === 'loading') {
      return
    }

    const loadGeneration = this.loadGeneration
    const playbackGeneration = ++this.playbackGeneration

    try {
      const { context, analyser, channelSplitter } = this.ensureAudioGraph()
      const resumed = await resumeAudioContext(context)
      if (!resumed) {
        if (playbackGeneration === this.playbackGeneration) {
          this.updateSnapshot({ ...this.snapshot, error: PLAYBACK_BLOCKED_ERROR })
        }
        return
      }

      if (
        playbackGeneration !== this.playbackGeneration ||
        loadGeneration !== this.loadGeneration ||
        this.buffer !== buffer
      ) {
        return
      }

      if (this.snapshot.status === 'ended' || this.offset >= buffer.duration) {
        this.offset = 0
      }

      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(analyser)
      source.connect(channelSplitter)
      this.source = source

      const startAt = context.currentTime
      this.startedAt = startAt
      source.onended = () => {
        if (playbackGeneration !== this.playbackGeneration) {
          return
        }

        if (this.source === source) {
          this.source = null
        }
        stopAndDisconnectSource(source)
        this.offset = buffer.duration
        this.updateSnapshot({ ...this.snapshot, status: 'ended', error: null })
      }

      source.start(startAt, this.offset)
      this.updateSnapshot({ ...this.snapshot, status: 'playing', error: null })
    } catch {
      if (playbackGeneration !== this.playbackGeneration) {
        return
      }

      this.stopSources()
      this.updateSnapshot({
        ...this.snapshot,
        status: 'error',
        error: 'Playback could not start. Try selecting the audio file again.',
      })
    }
  }

  pause(): void {
    if (this.snapshot.status !== 'playing') {
      return
    }

    this.offset = this.getCurrentTime()
    this.stopSources()
    this.updateSnapshot({ ...this.snapshot, status: 'paused', error: null })
  }

  async togglePlayback(): Promise<void> {
    if (this.snapshot.status === 'playing') {
      this.pause()
      return
    }

    await this.play()
  }

  seek(seconds: number): void {
    const buffer = this.buffer
    if (!buffer) {
      return
    }

    const wasPlaying = this.snapshot.status === 'playing'
    const target = clampPlaybackTime(seconds, buffer.duration)
    this.stopSources()
    this.offset = target
    this.analysisRevision += 1

    if (wasPlaying && target < buffer.duration) {
      this.updateSnapshot({ ...this.snapshot, status: 'paused', error: null })
      void this.play()
      return
    }

    const status =
      target >= buffer.duration
        ? 'ended'
        : this.snapshot.status === 'ended' || this.snapshot.status === 'ready'
          ? 'paused'
          : this.snapshot.status
    this.updateSnapshot({ ...this.snapshot, status, error: null })
  }

  setVolume(value: number): void {
    this.volume = clampVolume(value)
    const context = this.context
    const volumeNode = this.volumeNode
    if (!context || !volumeNode || context.state === 'closed') {
      return
    }

    const now = context.currentTime
    volumeNode.gain.cancelScheduledValues(now)
    volumeNode.gain.setTargetAtTime(this.volume, now, 0.015)
  }

  getVolume(): number {
    return this.volume
  }

  createRecordingTap(): AudioRecordingTap | null {
    if (typeof MediaStream === 'undefined') {
      return null
    }

    this.disposeRecordingTap()
    const { context, analyser } = this.ensureAudioGraph()
    if (context.state === 'closed') {
      return null
    }

    const destination = context.createMediaStreamDestination()
    analyser.connect(destination)
    this.recordingDestination = destination
    let disposed = false

    return {
      stream: destination.stream,
      dispose: () => {
        if (disposed) {
          return
        }

        disposed = true
        if (this.recordingDestination === destination) {
          this.recordingDestination = null
          try {
            analyser.disconnect(destination)
          } catch {
            // The export tap may already have been disconnected during teardown.
          }
        }
        destination.disconnect()
        for (const track of destination.stream.getTracks()) {
          track.stop()
        }
      },
    }
  }

  readStereoTimeDomainData(
    left: Float32Array<ArrayBuffer>,
    right: Float32Array<ArrayBuffer>,
  ): void {
    left.fill(0)
    right.fill(0)

    const leftAnalyser = this.leftAnalyser
    const rightAnalyser = this.rightAnalyser
    if (this.snapshot.status !== 'playing' || !this.buffer || !leftAnalyser || !rightAnalyser) {
      return
    }

    if (left.length > 0) {
      leftAnalyser.getFloatTimeDomainData(left)
    }

    if (this.buffer.numberOfChannels === 1) {
      const length = Math.min(left.length, right.length)
      for (let index = 0; index < length; index += 1) {
        right[index] = left[index]!
      }
      return
    }

    if (right.length > 0) {
      rightAnalyser.getFloatTimeDomainData(right)
    }
  }

  getAnalysisFrameSize(): number {
    return ANALYSIS_FRAME_SIZE
  }

  getAnalysisRevision(): number {
    return this.analysisRevision
  }

  async dispose(): Promise<void> {
    this.loadGeneration += 1
    this.analysisRevision += 1
    this.stopSources()
    this.disposeRecordingTap()
    this.buffer = null
    this.offset = 0
    this.analyser?.disconnect()
    this.volumeNode?.disconnect()
    this.channelSplitter?.disconnect()
    this.leftAnalyser?.disconnect()
    this.rightAnalyser?.disconnect()

    const context = this.context
    this.context = null
    this.analyser = null
    this.volumeNode = null
    this.channelSplitter = null
    this.leftAnalyser = null
    this.rightAnalyser = null
    this.updateSnapshot(INITIAL_SNAPSHOT)

    if (context && context.state !== 'closed') {
      await context.close()
    }
  }

  getCurrentTime(): number {
    if (!this.buffer || !this.context || this.snapshot.status !== 'playing') {
      return this.offset
    }

    return Math.min(
      this.buffer.duration,
      this.offset + Math.max(0, this.context.currentTime - this.startedAt),
    )
  }

  private ensureAudioGraph(): {
    context: AudioContext
    analyser: AnalyserNode
    volumeNode: GainNode
    channelSplitter: ChannelSplitterNode
  } {
    if (
      this.context &&
      this.analyser &&
      this.volumeNode &&
      this.channelSplitter &&
      this.leftAnalyser &&
      this.rightAnalyser &&
      this.context.state !== 'closed'
    ) {
      return {
        context: this.context,
        analyser: this.analyser,
        volumeNode: this.volumeNode,
        channelSplitter: this.channelSplitter,
      }
    }

    const context = new AudioContext()
    const analyser = context.createAnalyser()
    const volumeNode = context.createGain()
    const channelSplitter = context.createChannelSplitter(2)
    const leftAnalyser = context.createAnalyser()
    const rightAnalyser = context.createAnalyser()
    analyser.fftSize = ANALYSIS_FRAME_SIZE
    leftAnalyser.fftSize = ANALYSIS_FRAME_SIZE
    rightAnalyser.fftSize = ANALYSIS_FRAME_SIZE
    volumeNode.gain.value = this.volume

    analyser.connect(volumeNode)
    volumeNode.connect(context.destination)
    channelSplitter.connect(leftAnalyser, 0)
    channelSplitter.connect(rightAnalyser, 1)

    this.context = context
    this.analyser = analyser
    this.volumeNode = volumeNode
    this.channelSplitter = channelSplitter
    this.leftAnalyser = leftAnalyser
    this.rightAnalyser = rightAnalyser

    return { context, analyser, volumeNode, channelSplitter }
  }

  private disposeRecordingTap(): void {
    const destination = this.recordingDestination
    if (!destination) {
      return
    }

    this.recordingDestination = null
    try {
      this.analyser?.disconnect(destination)
    } catch {
      // The analyser may already have been disconnected during disposal.
    }
    destination.disconnect()
    for (const track of destination.stream.getTracks()) {
      track.stop()
    }
  }

  private stopSources(): void {
    this.playbackGeneration += 1
    const source = this.source
    this.source = null
    stopAndDisconnectSource(source)
  }

  private updateSnapshot(snapshot: AudioSnapshot): void {
    this.snapshot = snapshot
    for (const listener of this.listeners) {
      listener()
    }
  }
}
