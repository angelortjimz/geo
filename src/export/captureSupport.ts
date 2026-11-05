export const MP4_MIME_CANDIDATES = [
  'video/mp4;codecs="avc1.640028,mp4a.40.2"',
  'video/mp4;codecs="avc1.4D4028,mp4a.40.2"',
  'video/mp4;codecs="avc1.64001F,mp4a.40.2"',
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  'video/mp4;codecs="avc1,mp4a.40.2"',
] as const

export function getSupportedMp4MimeTypes(isTypeSupported: (mimeType: string) => boolean): string[] {
  return MP4_MIME_CANDIDATES.filter((mimeType) => isTypeSupported(mimeType))
}

export function hasMp4FileHeader(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 8) {
    return false
  }

  const view = new DataView(buffer)
  const boxSize = view.getUint32(0)
  const boxType = String.fromCharCode(
    view.getUint8(4),
    view.getUint8(5),
    view.getUint8(6),
    view.getUint8(7),
  )
  return boxSize >= 8 && boxType === 'ftyp'
}

export function createCaptureFilename(trackName: string | null): string {
  const withoutExtension = (trackName ?? '').replace(/\.[^.]+$/, '')
  const safeBase = withoutExtension
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 80)
  return safeBase ? `${safeBase}-geo-study.mp4` : 'geo-study.mp4'
}
