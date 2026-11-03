import { describe, expect, it } from 'vitest'
import { describeAudioFileIssue } from './validation'

describe('describeAudioFileIssue', () => {
  it('rejects empty files before decoding', () => {
    expect(describeAudioFileIssue({ name: 'empty.mp3', size: 0, type: 'audio/mpeg' })).toEqual({
      kind: 'empty',
      message: 'This file is empty. Choose an audio file that contains sound.',
    })
  })

  it('accepts audio MIME types and supported extensions', () => {
    expect(describeAudioFileIssue({ name: 'track.bin', size: 10, type: 'audio/mpeg' })).toBeNull()
    expect(describeAudioFileIssue({ name: 'TRACK.WAV', size: 10, type: '' })).toBeNull()
    expect(
      describeAudioFileIssue({ name: 'track.ogg', size: 10, type: 'application/octet-stream' }),
    ).toBeNull()
    expect(describeAudioFileIssue({ name: 'track.flac', size: 10, type: '' })).toBeNull()
  })

  it('rejects files that do not look like audio', () => {
    const issue = describeAudioFileIssue({ name: 'notes.txt', size: 10, type: 'text/plain' })
    expect(issue?.kind).toBe('unsupported')
    expect(issue?.message).toContain('does not look like audio')
  })
})
