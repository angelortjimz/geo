import { useState } from 'react'
import type {
  BackdropConfig,
  CameraConfig,
  FloorConfig,
  FogConfig,
  LightingConfig,
  SceneConfig,
  SceneObjectConfig,
} from '../scene/sceneConfig'
import type { FinishPatch, ObjectPatch } from '../scene/sceneOperations'
import {
  addObject as addSceneObject,
  duplicateObject as duplicateSceneObject,
  patchCamera as applyCameraPatch,
  patchFinish as applyFinishPatch,
  patchLighting as applyLightingPatch,
  patchObject as applyObjectPatch,
  removeObject as removeSceneObject,
  setBackdrop as applyBackdrop,
  setFloor as applyFloor,
  setFog as applyFog,
} from '../scene/sceneOperations'
import { createBlankScene, createStarterScene } from '../scene/starterScene'

export type EditorMode = 'welcome' | 'editing'
export type ReplacementKind = 'blank' | 'starter'

export interface SceneEditorActions {
  selectObject: (id: string | null) => void
  addObject: () => void
  duplicateSelected: () => void
  removeSelected: () => void
  patchSelected: (patch: ObjectPatch) => void
  setBackdrop: (backdrop: BackdropConfig) => void
  setFloor: (floor: FloorConfig) => void
  setFog: (fog: FogConfig) => void
  patchLighting: (patch: Partial<LightingConfig>) => void
  patchCamera: (patch: Partial<CameraConfig>) => void
  patchFinish: (patch: FinishPatch) => void
  requestBlank: () => void
  requestStarter: () => void
  confirmReplacement: () => void
  cancelReplacement: () => void
}

export interface SceneEditor {
  readonly scene: SceneConfig
  readonly mode: EditorMode
  readonly selectedObjectId: string | null
  readonly selectedObject: SceneObjectConfig | null
  readonly isDirty: boolean
  readonly pendingReplacement: ReplacementKind | null
  readonly actions: SceneEditorActions
}

/**
 * Owns the session-local scene document, selection, and replacement flow.
 * No persistence: the document exists only for as long as this hook is mounted.
 */
export function useSceneEditor(): SceneEditor {
  const [scene, setScene] = useState<SceneConfig>(createBlankScene)
  const [mode, setMode] = useState<EditorMode>('welcome')
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [pendingReplacement, setPendingReplacement] = useState<ReplacementKind | null>(null)

  const selectedObject = scene.objects.find((object) => object.id === selectedObjectId) ?? null

  const replaceScene = (kind: ReplacementKind) => {
    const next = kind === 'blank' ? createBlankScene() : createStarterScene()
    setScene(next)
    setSelectedObjectId(next.objects[0]?.id ?? null)
    setMode('editing')
    setIsDirty(false)
    setPendingReplacement(null)
  }

  const requestReplacement = (kind: ReplacementKind) => {
    if (mode === 'editing' && isDirty) {
      setPendingReplacement(kind)
      return
    }

    replaceScene(kind)
  }

  const actions: SceneEditorActions = {
    selectObject: (id) => {
      setSelectedObjectId(id)
    },

    addObject: () => {
      const next = addSceneObject(scene)
      if (next === scene) {
        return
      }

      setScene(next)
      setSelectedObjectId(next.objects[next.objects.length - 1]?.id ?? null)
      setIsDirty(true)
    },

    duplicateSelected: () => {
      if (!selectedObjectId) {
        return
      }

      const next = duplicateSceneObject(scene, selectedObjectId)
      if (next === scene) {
        return
      }

      setScene(next)
      setSelectedObjectId(next.objects[next.objects.length - 1]?.id ?? null)
      setIsDirty(true)
    },

    removeSelected: () => {
      if (!selectedObjectId) {
        return
      }

      const index = scene.objects.findIndex((object) => object.id === selectedObjectId)
      const next = removeSceneObject(scene, selectedObjectId)
      if (next === scene) {
        return
      }

      const remaining = next.objects
      const nextIndex = index < 0 ? remaining.length - 1 : Math.min(index, remaining.length - 1)
      setScene(next)
      setSelectedObjectId(remaining[nextIndex]?.id ?? null)
      setIsDirty(true)
    },

    patchSelected: (patch) => {
      if (!selectedObjectId) {
        return
      }

      setScene((current) => applyObjectPatch(current, selectedObjectId, patch))
      setIsDirty(true)
    },

    setBackdrop: (backdrop) => {
      setScene((current) => applyBackdrop(current, backdrop))
      setIsDirty(true)
    },

    setFloor: (floor) => {
      setScene((current) => applyFloor(current, floor))
      setIsDirty(true)
    },

    setFog: (fog) => {
      setScene((current) => applyFog(current, fog))
      setIsDirty(true)
    },

    patchLighting: (patch) => {
      setScene((current) => applyLightingPatch(current, patch))
      setIsDirty(true)
    },

    patchCamera: (patch) => {
      setScene((current) => applyCameraPatch(current, patch))
      setIsDirty(true)
    },

    patchFinish: (patch) => {
      setScene((current) => applyFinishPatch(current, patch))
      setIsDirty(true)
    },

    requestBlank: () => {
      requestReplacement('blank')
    },

    requestStarter: () => {
      requestReplacement('starter')
    },

    confirmReplacement: () => {
      if (pendingReplacement) {
        replaceScene(pendingReplacement)
      }
    },

    cancelReplacement: () => {
      setPendingReplacement(null)
    },
  }

  return {
    scene,
    mode,
    selectedObjectId,
    selectedObject,
    isDirty,
    pendingReplacement,
    actions,
  }
}
