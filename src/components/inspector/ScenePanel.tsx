import { MAX_OBJECT_COUNT } from '../../scene/sceneLimits'
import { PRIMITIVE_LABELS } from '../../scene/sceneConfig'
import type { SceneEditor } from '../../editor/useSceneEditor'

interface ScenePanelProps {
  editor: SceneEditor
  locked: boolean
}

export function ScenePanel({ editor, locked }: ScenePanelProps) {
  const { scene, selectedObjectId, pendingReplacement, actions } = editor
  const objectCount = scene.objects.length
  const atObjectLimit = objectCount >= MAX_OBJECT_COUNT

  return (
    <div className="inspector-panel">
      <section className="inspector-section" aria-labelledby="scene-objects-heading">
        <div className="section-heading">
          <h3 id="scene-objects-heading">Objects</h3>
          <span className="section-count">
            {objectCount} / {MAX_OBJECT_COUNT}
          </span>
        </div>

        {objectCount === 0 ? (
          <p className="panel-empty">
            No objects yet. Add a torus, then shape its form and surface in the Object tab.
          </p>
        ) : (
          <ul className="object-list">
            {scene.objects.map((object) => {
              const selected = object.id === selectedObjectId
              return (
                <li key={object.id}>
                  <button
                    type="button"
                    className={`object-list__item${selected ? ' object-list__item--selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => actions.selectObject(object.id)}
                  >
                    <span>{object.name}</span>
                    <span className="object-list__meta">
                      {PRIMITIVE_LABELS[object.form.primitive]}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="button-row">
          <button
            type="button"
            className="panel-button panel-button--strong"
            onClick={actions.addObject}
            disabled={locked || atObjectLimit}
          >
            Add object
          </button>
          <button
            type="button"
            className="panel-button"
            onClick={actions.duplicateSelected}
            disabled={locked || !selectedObjectId || atObjectLimit}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="panel-button"
            onClick={actions.removeSelected}
            disabled={locked || !selectedObjectId}
          >
            Remove
          </button>
        </div>

        {atObjectLimit && (
          <p className="field-hint">
            This scene supports up to {MAX_OBJECT_COUNT} objects. Remove one to add another.
          </p>
        )}
      </section>

      <section className="inspector-section" aria-labelledby="scene-session-heading">
        <h3 id="scene-session-heading">Session</h3>
        <p className="field-hint">
          Scenes live only in this session. Audio and scene data never leave the browser.
        </p>

        <div className="button-row">
          <button
            type="button"
            className="panel-button"
            onClick={actions.requestBlank}
            disabled={locked}
          >
            New blank scene
          </button>
          <button
            type="button"
            className="panel-button"
            onClick={actions.requestStarter}
            disabled={locked}
          >
            Load starter scene
          </button>
        </div>

        {pendingReplacement && (
          <div className="replacement-confirm" role="alert">
            <p>
              {pendingReplacement === 'blank'
                ? 'Replace this scene with a blank one?'
                : 'Replace this scene with the starter scene?'}{' '}
              Unsaved changes will be lost.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="panel-button panel-button--strong"
                onClick={actions.confirmReplacement}
                disabled={locked}
              >
                Replace scene
              </button>
              <button type="button" className="panel-button" onClick={actions.cancelReplacement}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
