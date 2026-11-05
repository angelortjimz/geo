import { describe, expect, it } from 'vitest'
import {
  createCaptureFilename,
  getSupportedMp4MimeTypes,
  hasMp4FileHeader,
  MP4_MIME_CANDIDATES,
} from './captureSupport'

function mp4Header(): ArrayBuffer {
  const buffer = new ArrayBuffer(12)
  const view = new DataView(buffer)
  view.setUint32(0, 12)
  view.setUint8(4, 102)
  view.setUint8(5, 116)
  view.setUint8(6, 121)
  view.setUint8(7, 112)
  return buffer
}

describe('capture support helpers', () => {
  it('accepts an MP4 ftyp header and rejects other containers', () => {
    expect(hasMp4FileHeader(mp4Header())).toBe(true)
    expect(hasMp4FileHeader(new ArrayBuffer(4))).toBe(false)

    const webm = mp4Header()
    new DataView(webm).setUint8(4, 0x1a)
    expect(hasMp4FileHeader(webm)).toBe(false)
  })

  it('selects only browser-supported MP4 codec candidates', () => {
    const selected = getSupportedMp4MimeTypes((mimeType) => mimeType === MP4_MIME_CANDIDATES[1])
    expect(selected).toEqual([MP4_MIME_CANDIDATES[1]])
  })

  it('creates safe local download names', () => {
    expect(createCaptureFilename('my: track.mp3')).toBe('my- track-geo-study.mp4')
    expect(createCaptureFilename(null)).toBe('geo-study.mp4')
  })
})
