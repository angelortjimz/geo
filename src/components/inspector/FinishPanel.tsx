import type { FinishConfig } from '../../scene/sceneConfig'
import type { FinishPatch } from '../../scene/sceneOperations'
import {
  BLOOM_RADIUS_RANGE,
  BLOOM_STRENGTH_RANGE,
  BLOOM_THRESHOLD_RANGE,
  EXPOSURE_RANGE,
} from '../../scene/sceneLimits'
import { SliderField, ToggleField } from './fields'

interface FinishPanelProps {
  finish: FinishConfig
  locked: boolean
  onPatch: (patch: FinishPatch) => void
}

export function FinishPanel({ finish, locked, onPatch }: FinishPanelProps) {
  return (
    <fieldset className="inspector-fields" disabled={locked}>
      <legend className="sr-only">Finish properties</legend>

      <div className="inspector-panel">
        <section className="inspector-section" aria-labelledby="finish-exposure-heading">
          <h3 id="finish-exposure-heading">Exposure</h3>
          <SliderField
            label="Tone mapping exposure"
            value={finish.exposure}
            minimum={EXPOSURE_RANGE.minimum}
            maximum={EXPOSURE_RANGE.maximum}
            step={0.01}
            onChange={(exposure) => onPatch({ exposure })}
          />
        </section>

        <section className="inspector-section" aria-labelledby="finish-bloom-heading">
          <h3 id="finish-bloom-heading">Bloom</h3>
          <p className="field-hint">Bloom picks up emissive surfaces only.</p>
          <ToggleField
            label="Enable bloom"
            checked={finish.bloom.enabled}
            onChange={(enabled) => onPatch({ bloom: { enabled } })}
          />
          {finish.bloom.enabled && (
            <>
              <SliderField
                label="Threshold"
                value={finish.bloom.threshold}
                minimum={BLOOM_THRESHOLD_RANGE.minimum}
                maximum={BLOOM_THRESHOLD_RANGE.maximum}
                step={0.01}
                onChange={(threshold) => onPatch({ bloom: { threshold } })}
              />
              <SliderField
                label="Strength"
                value={finish.bloom.strength}
                minimum={BLOOM_STRENGTH_RANGE.minimum}
                maximum={BLOOM_STRENGTH_RANGE.maximum}
                step={0.01}
                onChange={(strength) => onPatch({ bloom: { strength } })}
              />
              <SliderField
                label="Radius"
                value={finish.bloom.radius}
                minimum={BLOOM_RADIUS_RANGE.minimum}
                maximum={BLOOM_RADIUS_RANGE.maximum}
                step={0.01}
                onChange={(radius) => onPatch({ bloom: { radius } })}
              />
            </>
          )}
        </section>
      </div>
    </fieldset>
  )
}
