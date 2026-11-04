import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { SceneEditor } from '../../editor/useSceneEditor'
import { FinishPanel } from './FinishPanel'
import { ObjectPanel } from './ObjectPanel'
import { ScenePanel } from './ScenePanel'
import { WorldPanel } from './WorldPanel'

const TABS = [
  { id: 'scene', label: 'Scene' },
  { id: 'object', label: 'Object' },
  { id: 'world', label: 'World' },
  { id: 'finish', label: 'Finish' },
] as const

type TabId = (typeof TABS)[number]['id']

function getNextTabIndex(key: string, currentIndex: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (currentIndex + 1) % TABS.length
    case 'ArrowLeft':
      return (currentIndex - 1 + TABS.length) % TABS.length
    case 'Home':
      return 0
    case 'End':
      return TABS.length - 1
    default:
      return null
  }
}

interface InspectorProps {
  editor: SceneEditor
  locked: boolean
}

export function Inspector({ editor, locked }: InspectorProps) {
  const [activeTab, setActiveTab] = useState<TabId>('scene')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    tabRefs.current[0]?.focus()
  }, [])

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab)
    const nextIndex = getNextTabIndex(event.key, currentIndex)
    if (nextIndex === null) {
      return
    }

    const nextTab = TABS[nextIndex]
    if (!nextTab) {
      return
    }

    event.preventDefault()
    setActiveTab(nextTab.id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="inspector">
      {locked && (
        <p className="inspector-lock" role="status">
          Editing is paused while the five-second capture runs.
        </p>
      )}

      <div
        className="inspector__tabs"
        role="tablist"
        aria-label="Scene inspector"
        onKeyDown={handleTabKeyDown}
      >
        {TABS.map((tab, index) => {
          const active = tab.id === activeTab
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              className={`inspector__tab${active ? ' inspector__tab--active' : ''}`}
              aria-selected={active}
              aria-controls={`panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="inspector__panels">
        <div
          role="tabpanel"
          id="panel-scene"
          aria-labelledby="tab-scene"
          hidden={activeTab !== 'scene'}
        >
          <ScenePanel editor={editor} locked={locked} />
        </div>
        <div
          role="tabpanel"
          id="panel-object"
          aria-labelledby="tab-object"
          hidden={activeTab !== 'object'}
        >
          <ObjectPanel
            object={editor.selectedObject}
            locked={locked}
            onPatch={editor.actions.patchSelected}
          />
        </div>
        <div
          role="tabpanel"
          id="panel-world"
          aria-labelledby="tab-world"
          hidden={activeTab !== 'world'}
        >
          <WorldPanel
            scene={editor.scene}
            locked={locked}
            onSetBackdrop={editor.actions.setBackdrop}
            onSetFloor={editor.actions.setFloor}
            onSetFog={editor.actions.setFog}
            onPatchLighting={editor.actions.patchLighting}
            onPatchCamera={editor.actions.patchCamera}
          />
        </div>
        <div
          role="tabpanel"
          id="panel-finish"
          aria-labelledby="tab-finish"
          hidden={activeTab !== 'finish'}
        >
          <FinishPanel
            finish={editor.scene.finish}
            locked={locked}
            onPatch={editor.actions.patchFinish}
          />
        </div>
      </div>
    </div>
  )
}
