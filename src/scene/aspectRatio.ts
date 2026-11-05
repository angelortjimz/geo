export const ASPECT_RATIO_KINDS = ['16:9', '4:3', '1:1', '9:16'] as const

export type AspectRatioKind = (typeof ASPECT_RATIO_KINDS)[number]

export const ASPECT_RATIO_LABELS: Record<AspectRatioKind, string> = {
  '16:9': '16:9',
  '4:3': '4:3',
  '1:1': '1:1',
  '9:16': '9:16',
}

export const ASPECT_RATIO_VALUES: Record<AspectRatioKind, number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '9:16': 9 / 16,
}

export function isAspectRatioKind(value: unknown): value is AspectRatioKind {
  return ASPECT_RATIO_KINDS.some((kind) => kind === value)
}

export function getAspectRatio(format: AspectRatioKind): number {
  return ASPECT_RATIO_VALUES[format]
}
