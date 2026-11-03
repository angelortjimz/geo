import type { CaptureSnapshot } from '../export/captureSpike'

interface CaptureControlProps {
  snapshot: CaptureSnapshot
  disabled: boolean
  onStart: () => void
  onStop: () => void
}

export function CaptureControl({ snapshot, disabled, onStart, onStop }: CaptureControlProps) {
  const recording = snapshot.status === 'recording'
  const busy = snapshot.status === 'preparing' || snapshot.status === 'finalizing'
  const label =
    snapshot.status === 'preparing'
      ? 'Preparing…'
      : recording
        ? 'Stop capture'
        : snapshot.status === 'finalizing'
          ? 'Saving…'
          : 'Capture 5 s'

  return (
    <div className="capture-control">
      <button
        type="button"
        className="capture-button"
        disabled={busy || (disabled && !recording)}
        onClick={recording ? onStop : onStart}
      >
        {label}
      </button>
      <span className="capture-hint">MP4 · original audio</span>
    </div>
  )
}
