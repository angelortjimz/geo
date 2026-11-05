import { describe, expect, it } from 'vitest'
import { MAX_OBJECT_COUNT } from '../scene/sceneLimits'
import { createInitialSceneEditorState, sceneEditorReducer } from './sceneEditorState'
import type { SceneEditorAction, SceneEditorState } from './sceneEditorState'

function reduce(state: SceneEditorState, ...actions: SceneEditorAction[]): SceneEditorState {
  return actions.reduce(sceneEditorReducer, state)
}

describe('scene editor state', () => {
  it('starts in the welcome state with a blank scene', () => {
    const state = createInitialSceneEditorState()

    expect(state.mode).toBe('welcome')
    expect(state.scene.objects).toHaveLength(0)
    expect(state.selectedObjectId).toBeNull()
    expect(state.isDirty).toBe(false)
    expect(state.pendingReplacement).toBeNull()
  })

  it('starts blank or starter scenes from the welcome state', () => {
    const blank = sceneEditorReducer(createInitialSceneEditorState(), {
      type: 'requestReplacement',
      kind: 'blank',
    })
    expect(blank.mode).toBe('editing')
    expect(blank.scene.objects).toHaveLength(0)
    expect(blank.selectedObjectId).toBeNull()
    expect(blank.isDirty).toBe(false)

    const starter = sceneEditorReducer(createInitialSceneEditorState(), {
      type: 'requestReplacement',
      kind: 'starter',
    })
    expect(starter.mode).toBe('editing')
    expect(starter.scene.objects).toHaveLength(2)
    expect(starter.selectedObjectId).toBe('object-1')
    expect(starter.isDirty).toBe(false)
  })

  it('composes consecutive actions without losing earlier changes', () => {
    const state = reduce(
      createInitialSceneEditorState(),
      { type: 'requestReplacement', kind: 'starter' },
      { type: 'addObject' },
      { type: 'patchSelected', patch: { transform: { position: [2, 2, 2] } } },
    )

    expect(state.scene.objects).toHaveLength(3)
    expect(state.selectedObjectId).toBe('object-3')
    expect(state.scene.objects[2]?.transform.position).toEqual([2, 2, 2])
    expect(state.isDirty).toBe(true)
  })

  it('selects new copies and a neighbour after removal', () => {
    const state = reduce(
      createInitialSceneEditorState(),
      { type: 'requestReplacement', kind: 'starter' },
      { type: 'addObject' },
      { type: 'duplicateSelected' },
    )

    expect(state.selectedObjectId).toBe('object-4')
    expect(state.scene.objects.map((object) => object.id)).toEqual([
      'object-1',
      'object-2',
      'object-3',
      'object-4',
    ])

    const removed = sceneEditorReducer(state, { type: 'removeSelected' })
    expect(removed.selectedObjectId).toBe('object-3')
    expect(removed.scene.objects).toHaveLength(3)
  })

  it('keeps editing open when the last object is removed', () => {
    const state = reduce(
      createInitialSceneEditorState(),
      { type: 'requestReplacement', kind: 'blank' },
      { type: 'addObject' },
      { type: 'removeSelected' },
    )

    expect(state.mode).toBe('editing')
    expect(state.scene.objects).toHaveLength(0)
    expect(state.selectedObjectId).toBeNull()
    expect(state.isDirty).toBe(true)
  })

  it('confirms or cancels a dirty replacement without losing the scene', () => {
    const dirty = reduce(
      createInitialSceneEditorState(),
      { type: 'requestReplacement', kind: 'starter' },
      { type: 'addObject' },
    )
    const originalScene = dirty.scene

    const pending = sceneEditorReducer(dirty, { type: 'requestReplacement', kind: 'starter' })
    expect(pending.pendingReplacement).toBe('starter')
    expect(pending.scene).toBe(originalScene)

    const cancelled = sceneEditorReducer(pending, { type: 'cancelReplacement' })
    expect(cancelled.pendingReplacement).toBeNull()
    expect(cancelled.scene).toBe(originalScene)
    expect(cancelled.isDirty).toBe(true)

    const confirmed = sceneEditorReducer(
      sceneEditorReducer(dirty, { type: 'requestReplacement', kind: 'starter' }),
      { type: 'confirmReplacement' },
    )
    expect(confirmed.mode).toBe('editing')
    expect(confirmed.scene.objects).toHaveLength(2)
    expect(confirmed.selectedObjectId).toBe('object-1')
    expect(confirmed.isDirty).toBe(false)
    expect(confirmed.pendingReplacement).toBeNull()
  })

  it('replaces a clean scene immediately', () => {
    const state = reduce(
      createInitialSceneEditorState(),
      { type: 'requestReplacement', kind: 'starter' },
      { type: 'requestReplacement', kind: 'blank' },
    )

    expect(state.mode).toBe('editing')
    expect(state.scene.objects).toHaveLength(0)
    expect(state.pendingReplacement).toBeNull()
  })

  it('marks object and world edits dirty', () => {
    const base = reduce(createInitialSceneEditorState(), {
      type: 'requestReplacement',
      kind: 'starter',
    })

    const objectPatch = sceneEditorReducer(base, {
      type: 'patchSelected',
      patch: { material: { gloss: 0.4 } },
    })
    expect(objectPatch.scene.objects[0]?.material.gloss).toBe(0.4)
    expect(objectPatch.isDirty).toBe(true)

    const cameraPatch = sceneEditorReducer(base, {
      type: 'patchCamera',
      patch: { distance: 12 },
    })
    expect(cameraPatch.scene.camera.distance).toBe(12)
    expect(cameraPatch.isDirty).toBe(true)

    const lightingPatch = sceneEditorReducer(base, {
      type: 'patchLighting',
      patch: { keyIntensity: 1 },
    })
    expect(lightingPatch.scene.world.lighting.keyIntensity).toBe(1)
    expect(lightingPatch.isDirty).toBe(true)
  })

  it('ignores actions that cannot change the scene', () => {
    const welcome = createInitialSceneEditorState()

    expect(sceneEditorReducer(welcome, { type: 'duplicateSelected' })).toBe(welcome)
    expect(sceneEditorReducer(welcome, { type: 'removeSelected' })).toBe(welcome)
    expect(
      sceneEditorReducer(welcome, { type: 'patchSelected', patch: { material: { gloss: 0.2 } } }),
    ).toBe(welcome)
    expect(sceneEditorReducer(welcome, { type: 'confirmReplacement' })).toBe(welcome)
    expect(sceneEditorReducer(welcome, { type: 'cancelReplacement' })).toBe(welcome)

    let full = reduce(welcome, { type: 'requestReplacement', kind: 'blank' })
    for (let index = 0; index < MAX_OBJECT_COUNT; index += 1) {
      full = sceneEditorReducer(full, { type: 'addObject' })
    }
    expect(full.scene.objects).toHaveLength(MAX_OBJECT_COUNT)
    expect(sceneEditorReducer(full, { type: 'addObject' })).toBe(full)

    const missing = sceneEditorReducer(full, { type: 'selectObject', id: 'missing' })
    expect(sceneEditorReducer(missing, { type: 'removeSelected' })).toBe(missing)
  })
})
