import {
  BoxGeometry,
  BufferGeometry,
  IcosahedronGeometry,
  MeshPhysicalMaterial,
  TorusGeometry,
} from 'three'
import type { FormConfig, MaterialConfig } from '../scene/sceneConfig'

const TORUS_RADIAL_SEGMENTS = [12, 20, 32, 48] as const
const TORUS_TUBULAR_SEGMENTS = [24, 48, 96, 160] as const

/** Emissive materials render at full strength when `emission` reaches 1. */
export const EMISSION_INTENSITY_SCALE = 2.6
/** Restrained bloom-visible flare added by transient impact. */
export const FLARE_INTENSITY_SCALE = 1.35

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function detailIndex(detail: number): number {
  return Math.round(clamp(detail, 1, 4)) - 1
}

/** Geometry is built at unit size; the object transform supplies proportion and scale. */
export function createPrimitiveGeometry(form: FormConfig): BufferGeometry {
  switch (form.primitive) {
    case 'torus':
      return new TorusGeometry(
        1,
        0.3,
        TORUS_RADIAL_SEGMENTS[detailIndex(form.detail)],
        TORUS_TUBULAR_SEGMENTS[detailIndex(form.detail)],
      )
    case 'box':
      return new BoxGeometry(1, 1, 1)
    case 'icosahedron':
      return new IcosahedronGeometry(1, Math.round(clamp(form.detail, 1, 4)))
  }
}

export function getGeometryKey(form: FormConfig): string {
  return `${form.primitive}:${Math.round(clamp(form.detail, 1, 4))}`
}

export function getMaterialKey(form: FormConfig, material: MaterialConfig): string {
  return [
    material.kind,
    material.color,
    material.gloss.toFixed(3),
    form.flatShading ? 'flat' : 'smooth',
  ].join(':')
}

export function createObjectMaterial(
  form: FormConfig,
  config: MaterialConfig,
): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial()
  applyObjectMaterial(material, form, config)
  return material
}

/**
 * Applies a material preset in place. Only call this when the material key
 * changes; it flags a shader rebuild for flat/smooth shading transitions.
 */
export function applyObjectMaterial(
  material: MeshPhysicalMaterial,
  form: FormConfig,
  config: MaterialConfig,
): void {
  const gloss = clamp(config.gloss, 0, 1)

  material.color.set(config.color)
  material.emissive.set(config.color)
  material.emissiveIntensity = 0
  material.flatShading = form.flatShading
  material.clearcoat = 0
  material.clearcoatRoughness = 0

  switch (config.kind) {
    case 'chrome':
      material.metalness = 1
      material.roughness = clamp(1 - gloss, 0.03, 1)
      material.clearcoat = 0.22
      material.clearcoatRoughness = 0.18
      material.envMapIntensity = 1.35
      break
    case 'plastic':
      material.metalness = 0.05
      material.roughness = clamp(1 - gloss * 0.85, 0.05, 1)
      material.clearcoat = 0.55
      material.clearcoatRoughness = 0.22
      material.envMapIntensity = 0.9
      break
    case 'emissive':
      material.metalness = 0.12
      material.roughness = clamp(1 - gloss * 0.8, 0.1, 1)
      material.clearcoat = 0.15
      material.clearcoatRoughness = 0.3
      material.envMapIntensity = 0.75
      break
  }

  material.needsUpdate = true
}
