const AUDIO_EXTENSIONS = [
  '.aac',
  '.flac',
  '.m4a',
  '.mp3',
  '.oga',
  '.ogg',
  '.opus',
  '.wav',
  '.webm',
] as const

export interface AudioFileLike {
  name: string
  size: number
  type: string
}

export interface AudioFileIssue {
  kind: 'empty' | 'unsupported'
  message: string
}

function hasAudioExtension(name: string): boolean {
  const lowerName = name.toLowerCase()
  return AUDIO_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
}

/**
 * Rejects obviously unusable files before they reach Web Audio. Browsers report
 * inconsistent MIME types for local files, so a known audio extension is also
 * accepted when the type is missing.
 */
export function describeAudioFileIssue(file: AudioFileLike): AudioFileIssue | null {
  if (!(file.size > 0)) {
    return {
      kind: 'empty',
      message: 'This file is empty. Choose an audio file that contains sound.',
    }
  }

  if (file.type.startsWith('audio/') || hasAudioExtension(file.name)) {
    return null
  }

  return {
    kind: 'unsupported',
    message:
      'That file does not look like audio. Choose an MP3, WAV, or another audio file this browser can decode.',
  }
}
