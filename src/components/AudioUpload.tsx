import { useId } from 'react'

interface AudioUploadProps {
  trackName: string | null
  loading: boolean
  disabled?: boolean
  onSelect: (file: File) => void
}

export function AudioUpload({ trackName, loading, disabled = false, onSelect }: AudioUploadProps) {
  const inputId = useId()

  return (
    <div className="audio-upload">
      <input
        id={inputId}
        className="file-input"
        type="file"
        accept="audio/*"
        disabled={loading || disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (file) {
            onSelect(file)
          }
          event.currentTarget.value = ''
        }}
      />
      <label htmlFor={inputId} className="file-label">
        {loading ? 'Decoding…' : trackName ? 'Change track' : 'Choose audio'}
      </label>
      {trackName && (
        <span className="track-name" title={trackName}>
          {trackName}
        </span>
      )}
    </div>
  )
}
