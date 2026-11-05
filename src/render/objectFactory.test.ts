import { describe, expect, it } from 'vitest'
import type { FormConfig, MaterialConfig } from '../scene/sceneConfig'
import { MATERIAL_KINDS, PRIMITIVE_KINDS } from '../scene/sceneConfig'
import {
  createObjectMaterial,
  createPrimitiveGeometry,
  getGeometryKey,
  getMaterialKey,
  shouldMaterialBloom,
} from './objectFactory'

const SMOOTH_TORUS: FormConfig = { primitive: 'torus', detail: 1, flatShading: false }
const CHROME: MaterialConfig = { kind: 'chrome', color: '#e4edf2', gloss: 0.84, emission: 0 }

describe('object factory', () => {
  it('increases tessellation with the detail control', () => {
    const lowTorus = createPrimitiveGeometry(SMOOTH_TORUS)
    const highTorus = createPrimitiveGeometry({ ...SMOOTH_TORUS, detail: 4 })
    expect(highTorus.getAttribute('position').count).toBeGreaterThan(
      lowTorus.getAttribute('position').count,
    )
    lowTorus.dispose()
    highTorus.dispose()

    const lowIcosahedron = createPrimitiveGeometry({
      primitive: 'icosahedron',
      detail: 1,
      flatShading: true,
    })
    const highIcosahedron = createPrimitiveGeometry({
      primitive: 'icosahedron',
      detail: 4,
      flatShading: true,
    })
    expect(highIcosahedron.getAttribute('position').count).toBeGreaterThan(
      lowIcosahedron.getAttribute('position').count,
    )
    lowIcosahedron.dispose()
    highIcosahedron.dispose()

    for (const primitive of ['torusKnot', 'cone', 'cylinder'] as const) {
      const low = createPrimitiveGeometry({ primitive, detail: 1, flatShading: false })
      const high = createPrimitiveGeometry({ primitive, detail: 4, flatShading: false })
      expect(high.getAttribute('position').count).toBeGreaterThan(
        low.getAttribute('position').count,
      )
      low.dispose()
      high.dispose()
    }
  })

  it('builds every canonical primitive and material kind', () => {
    for (const primitive of PRIMITIVE_KINDS) {
      const geometry = createPrimitiveGeometry({ primitive, detail: 2, flatShading: false })
      expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
      geometry.dispose()
    }

    for (const kind of MATERIAL_KINDS) {
      const material = createObjectMaterial(SMOOTH_TORUS, {
        ...CHROME,
        kind,
        emission: kind === 'emissive' || kind === 'wireframe' ? 0.5 : 0,
      })
      expect(material.wireframe).toBe(kind === 'wireframe')
      material.dispose()
    }
  })

  it('applies material presets and flat shading', () => {
    const chrome = createObjectMaterial(SMOOTH_TORUS, CHROME)
    expect(chrome.metalness).toBe(1)
    expect(chrome.roughness).toBeCloseTo(0.16, 5)
    expect(chrome.flatShading).toBe(false)
    chrome.dispose()

    const flatEmissive = createObjectMaterial(
      { ...SMOOTH_TORUS, flatShading: true },
      { kind: 'emissive', color: '#b7f5ff', gloss: 0.5, emission: 0.55 },
    )
    expect(flatEmissive.flatShading).toBe(true)
    expect(flatEmissive.emissiveIntensity).toBe(0)
    expect(flatEmissive.metalness).toBeLessThan(1)
    flatEmissive.dispose()

    const matte = createObjectMaterial(SMOOTH_TORUS, {
      kind: 'matte',
      color: '#dde3e4',
      gloss: 0.8,
      emission: 0,
    })
    expect(matte.metalness).toBe(0)
    expect(matte.roughness).toBeGreaterThan(0.7)
    expect(matte.clearcoat).toBe(0)
    matte.dispose()

    const wireframe = createObjectMaterial(SMOOTH_TORUS, {
      kind: 'wireframe',
      color: '#b7f5ff',
      gloss: 0.6,
      emission: 0.4,
    })
    expect(wireframe.wireframe).toBe(true)
    expect(wireframe.metalness).toBeLessThan(1)
    wireframe.dispose()
  })

  it('selects solid emissive and emissive wireframe materials for bloom', () => {
    const emissive: MaterialConfig = {
      kind: 'emissive',
      color: '#b7f5ff',
      gloss: 0.5,
      emission: 0,
    }
    const glowingWireframe: MaterialConfig = { ...emissive, kind: 'wireframe', emission: 0.4 }
    const darkWireframe: MaterialConfig = { ...glowingWireframe, emission: 0 }

    expect(shouldMaterialBloom(emissive)).toBe(true)
    expect(shouldMaterialBloom(glowingWireframe)).toBe(true)
    expect(shouldMaterialBloom(darkWireframe)).toBe(false)
    expect(shouldMaterialBloom(CHROME)).toBe(false)
    expect(shouldMaterialBloom({ ...emissive, kind: 'plastic', emission: 0 })).toBe(false)
    expect(shouldMaterialBloom({ ...emissive, kind: 'matte', emission: 0 })).toBe(false)
  })

  it('rebuilds geometry only for primitive or detail changes', () => {
    const base = getGeometryKey(SMOOTH_TORUS)
    expect(getGeometryKey({ ...SMOOTH_TORUS, flatShading: true })).toBe(base)
    expect(getGeometryKey({ ...SMOOTH_TORUS, detail: 2 })).not.toBe(base)
    expect(getGeometryKey({ ...SMOOTH_TORUS, primitive: 'box' })).not.toBe(base)
  })

  it('rebuilds material only for visible material changes', () => {
    const base = getMaterialKey(SMOOTH_TORUS, CHROME)
    expect(getMaterialKey(SMOOTH_TORUS, { ...CHROME, emission: 1 })).toBe(base)
    expect(getMaterialKey(SMOOTH_TORUS, { ...CHROME, color: '#000000' })).not.toBe(base)
    expect(getMaterialKey(SMOOTH_TORUS, { ...CHROME, kind: 'plastic' })).not.toBe(base)
    expect(getMaterialKey({ ...SMOOTH_TORUS, flatShading: true }, CHROME)).not.toBe(base)
  })
})
