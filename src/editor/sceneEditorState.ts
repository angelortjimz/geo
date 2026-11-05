import type {
  BackdropConfig,
  CameraConfig,
  FloorConfig,
  FogConfig,
  LightingConfig,
  SceneConfig,
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

export interface SceneEditorState {
  readonly scene: SceneConfig
  readonly mode: EditorMode
  readonly selectedObjectId: string | null
  readonly isDirty: boolean
  readonly pendingReplacement: ReplacementKind | null
}

export type SceneEditorAction =
  | { readonly type: 'selectObject'; readonly id: string | null }
  | { readonly type: 'addObject' }
  | { readonly type: 'duplicateSelected' }
  | { readonly type: 'removeSelected' }
  | { readonly type: 'patchSelected'; readonly patch: ObjectPatch }
  | { readonly type: 'setBackdrop'; readonly backdrop: BackdropConfig }
  | { readonly type: 'setFloor'; readonly floor: FloorConfig }
  | { readonly type: 'setFog'; readonly fog: FogConfig }
  | { readonly type: 'patchLighting'; readonly patch: Partial<LightingConfig> }
  | { readonly type: 'patchCamera'; readonly patch: Partial<CameraConfig> }
  | { readonly type: 'patchFinish'; readonly patch: FinishPatch }
  | { readonly type: 'requestReplacement'; readonly kind: ReplacementKind }
  | { readonly type: 'confirmReplacement' }
  | { readonly type: 'cancelReplacement' }

export function createInitialSceneEditorState(): SceneEditorState {
  return {
    scene: createBlankScene(),
    mode: 'welcome',
    selectedObjectId: null,
    isDirty: false,
    pendingReplacement: null,
  }
}

function replaceScene(kind: ReplacementKind): SceneEditorState {
  const scene = kind === 'blank' ? createBlankScene() : createStarterScene()

  return {
    scene,
    mode: 'editing',
    selectedObjectId: scene.objects[0]?.id ?? null,
    isDirty: false,
    pendingReplacement: null,
  }
}

function markDirty(state: SceneEditorState, scene: SceneConfig): SceneEditorState {
  return scene === state.scene ? state : { ...state, scene, isDirty: true }
}

function addObject(state: SceneEditorState): SceneEditorState {
  const scene = addSceneObject(state.scene)
  if (scene === state.scene) {
    return state
  }

  return {
    ...state,
    scene,
    selectedObjectId: scene.objects[scene.objects.length - 1]?.id ?? null,
    isDirty: true,
  }
}

function duplicateSelected(state: SceneEditorState): SceneEditorState {
  if (!state.selectedObjectId) {
    return state
  }

  const scene = duplicateSceneObject(state.scene, state.selectedObjectId)
  if (scene === state.scene) {
    return state
  }

  return {
    ...state,
    scene,
    selectedObjectId: scene.objects[scene.objects.length - 1]?.id ?? null,
    isDirty: true,
  }
}

function removeSelected(state: SceneEditorState): SceneEditorState {
  if (!state.selectedObjectId) {
    return state
  }

  const index = state.scene.objects.findIndex((object) => object.id === state.selectedObjectId)
  const scene = removeSceneObject(state.scene, state.selectedObjectId)
  if (scene === state.scene) {
    return state
  }

  const remaining = scene.objects
  const nextIndex = index < 0 ? remaining.length - 1 : Math.min(index, remaining.length - 1)

  return {
    ...state,
    scene,
    selectedObjectId: remaining[nextIndex]?.id ?? null,
    isDirty: true,
  }
}

function patchSelected(state: SceneEditorState, patch: ObjectPatch): SceneEditorState {
  if (!state.selectedObjectId) {
    return state
  }

  return markDirty(state, applyObjectPatch(state.scene, state.selectedObjectId, patch))
}

function requestReplacement(state: SceneEditorState, kind: ReplacementKind): SceneEditorState {
  if (state.mode === 'editing' && state.isDirty) {
    return { ...state, pendingReplacement: kind }
  }

  return replaceScene(kind)
}

function assertNever(action: never): never {
  throw new Error(`Unhandled scene editor action: ${JSON.stringify(action)}`)
}

export function sceneEditorReducer(
  state: SceneEditorState,
  action: SceneEditorAction,
): SceneEditorState {
  switch (action.type) {
    case 'selectObject':
      return state.selectedObjectId === action.id
        ? state
        : { ...state, selectedObjectId: action.id }
    case 'addObject':
      return addObject(state)
    case 'duplicateSelected':
      return duplicateSelected(state)
    case 'removeSelected':
      return removeSelected(state)
    case 'patchSelected':
      return patchSelected(state, action.patch)
    case 'setBackdrop':
      return markDirty(state, applyBackdrop(state.scene, action.backdrop))
    case 'setFloor':
      return markDirty(state, applyFloor(state.scene, action.floor))
    case 'setFog':
      return markDirty(state, applyFog(state.scene, action.fog))
    case 'patchLighting':
      return markDirty(state, applyLightingPatch(state.scene, action.patch))
    case 'patchCamera':
      return markDirty(state, applyCameraPatch(state.scene, action.patch))
    case 'patchFinish':
      return markDirty(state, applyFinishPatch(state.scene, action.patch))
    case 'requestReplacement':
      return requestReplacement(state, action.kind)
    case 'confirmReplacement':
      return state.pendingReplacement ? replaceScene(state.pendingReplacement) : state
    case 'cancelReplacement':
      return state.pendingReplacement === null ? state : { ...state, pendingReplacement: null }
    default:
      return assertNever(action)
  }
}
