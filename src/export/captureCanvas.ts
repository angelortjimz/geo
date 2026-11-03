export interface CaptureDimensions {
  width: number
  height: number
}

export interface ContainedRect extends CaptureDimensions {
  x: number
  y: number
}

function toEvenDimension(value: number): number {
  const rounded = Math.max(2, Math.round(Number.isFinite(value) ? value : 2))
  return rounded % 2 === 0 ? rounded : rounded + 1
}

export function getCaptureDimensions(sourceWidth: number, sourceHeight: number): CaptureDimensions {
  return {
    width: toEvenDimension(sourceWidth),
    height: toEvenDimension(sourceHeight),
  }
}

export function getContainedRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): ContainedRect {
  const safeSourceWidth = Math.max(1, sourceWidth)
  const safeSourceHeight = Math.max(1, sourceHeight)
  const safeTargetWidth = Math.max(1, targetWidth)
  const safeTargetHeight = Math.max(1, targetHeight)
  const scale = Math.min(safeTargetWidth / safeSourceWidth, safeTargetHeight / safeSourceHeight)
  const width = safeSourceWidth * scale
  const height = safeSourceHeight * scale

  return {
    x: (safeTargetWidth - width) / 2,
    y: (safeTargetHeight - height) / 2,
    width,
    height,
  }
}

/** Copies the just-rendered WebGL buffer before the browser can discard it. */
export function drawCaptureFrame(
  source: HTMLCanvasElement,
  target: HTMLCanvasElement,
  backgroundColor: string,
): void {
  const context = target.getContext('2d')
  if (!context || source.width <= 0 || source.height <= 0) {
    return
  }

  const frame = getContainedRect(source.width, source.height, target.width, target.height)
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalAlpha = 1
  context.fillStyle = backgroundColor
  context.fillRect(0, 0, target.width, target.height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, frame.x, frame.y, frame.width, frame.height)
  context.restore()
}
