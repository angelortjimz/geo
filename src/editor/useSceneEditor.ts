import { useReducer } from 'react'
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
  createInitialSceneEditorState,
  sceneEditorReducer,
  type EditorMode,
  type ReplacementKind,
} from './sceneEditorState'

export type { EditorMode, ReplacementKind } from './sceneEditorState'

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
  const [state, dispatch] = useReducer(sceneEditorReducer, undefined, createInitialSceneEditorState)
  const selectedObject =
    state.scene.objects.find((object) => object.id === state.selectedObjectId) ?? null

  const actions: SceneEditorActions = {
    selectObject: (id) => {
      dispatch({ type: 'selectObject', id })
    },
    addObject: () => {
      dispatch({ type: 'addObject' })
    },
    duplicateSelected: () => {
      dispatch({ type: 'duplicateSelected' })
    },
    removeSelected: () => {
      dispatch({ type: 'removeSelected' })
    },
    patchSelected: (patch) => {
      dispatch({ type: 'patchSelected', patch })
    },
    setBackdrop: (backdrop) => {
      dispatch({ type: 'setBackdrop', backdrop })
    },
    setFloor: (floor) => {
      dispatch({ type: 'setFloor', floor })
    },
    setFog: (fog) => {
      dispatch({ type: 'setFog', fog })
    },
    patchLighting: (patch) => {
      dispatch({ type: 'patchLighting', patch })
    },
    patchCamera: (patch) => {
      dispatch({ type: 'patchCamera', patch })
    },
    patchFinish: (patch) => {
      dispatch({ type: 'patchFinish', patch })
    },
    requestBlank: () => {
      dispatch({ type: 'requestReplacement', kind: 'blank' })
    },
    requestStarter: () => {
      dispatch({ type: 'requestReplacement', kind: 'starter' })
    },
    confirmReplacement: () => {
      dispatch({ type: 'confirmReplacement' })
    },
    cancelReplacement: () => {
      dispatch({ type: 'cancelReplacement' })
    },
  }

  return {
    scene: state.scene,
    mode: state.mode,
    selectedObjectId: state.selectedObjectId,
    selectedObject,
    isDirty: state.isDirty,
    pendingReplacement: state.pendingReplacement,
    actions,
  }
}
