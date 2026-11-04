import type { MaterialKind, PrimitiveKind, SceneObjectConfig } from '../../scene/sceneConfig'
import type { ObjectPatch } from '../../scene/sceneOperations'
import {
  BREATHE_RANGE,
  DETAIL_RANGE,
  DRIFT_RANGE,
  EMISSION_RANGE,
  EXPAND_RANGE,
  FLARE_RANGE,
  FLOAT_RANGE,
  FLOAT_SPEED_RANGE,
  GLOSS_RANGE,
  ORBIT_RADIUS_RANGE,
  ORBIT_SPEED_RANGE,
  PHASE_RANGE,
  POSITION_RANGE,
  ROTATION_RANGE,
  SCALE_RANGE,
  SPIN_RANGE,
  STRIKE_RANGE,
} from '../../scene/sceneLimits'
import { ColorField, SelectField, SliderField, ToggleField, Vector3Field } from './fields'
import { formatPercent, formatRadiansPerSecond } from './formatters'

const PRIMITIVE_OPTIONS: readonly { value: PrimitiveKind; label: string }[] = [
  { value: 'torus', label: 'Torus' },
  { value: 'box', label: 'Box' },
  { value: 'icosahedron', label: 'Icosahedron' },
]

const MATERIAL_OPTIONS: readonly { value: MaterialKind; label: string }[] = [
  { value: 'chrome', label: 'Chrome' },
  { value: 'plastic', label: 'Glossy plastic' },
  { value: 'emissive', label: 'Emissive' },
]

interface ObjectPanelProps {
  object: SceneObjectConfig | null
  locked: boolean
  onPatch: (patch: ObjectPatch) => void
}

export function ObjectPanel({ object, locked, onPatch }: ObjectPanelProps) {
  if (!object) {
    return (
      <div className="inspector-panel">
        <p className="panel-empty">
          Select an object from the Scene list to edit its form, transform, surface, motion, and
          audio reaction.
        </p>
      </div>
    )
  }

  return (
    <fieldset className="inspector-fields" disabled={locked}>
      <legend className="sr-only">Object properties</legend>

      <div className="inspector-panel">
        <section className="inspector-section" aria-labelledby="object-form-heading">
          <h3 id="object-form-heading">Form</h3>
          <SelectField
            label="Primitive"
            value={object.form.primitive}
            options={PRIMITIVE_OPTIONS}
            onChange={(primitive) => onPatch({ form: { primitive } })}
          />
          {object.form.primitive === 'box' ? (
            <p className="field-hint">
              A box keeps one quad per face; detail applies to the torus and icosahedron.
            </p>
          ) : (
            <SliderField
              label="Detail"
              value={object.form.detail}
              range={DETAIL_RANGE}
              step={1}
              onChange={(detail) => onPatch({ form: { detail } })}
            />
          )}
          <ToggleField
            label="Flat shading"
            checked={object.form.flatShading}
            onChange={(flatShading) => onPatch({ form: { flatShading } })}
          />
        </section>

        <section className="inspector-section" aria-labelledby="object-transform-heading">
          <h3 id="object-transform-heading">Transform</h3>
          <Vector3Field
            label="Position"
            value={object.transform.position}
            minimum={POSITION_RANGE.minimum}
            maximum={POSITION_RANGE.maximum}
            step={0.05}
            onChange={(position) => onPatch({ transform: { position } })}
          />
          <Vector3Field
            label="Rotation (degrees)"
            value={object.transform.rotation}
            minimum={ROTATION_RANGE.minimum}
            maximum={ROTATION_RANGE.maximum}
            step={1}
            onChange={(rotation) => onPatch({ transform: { rotation } })}
          />
          <Vector3Field
            label="Scale"
            value={object.transform.scale}
            minimum={SCALE_RANGE.minimum}
            maximum={SCALE_RANGE.maximum}
            step={0.01}
            onChange={(scale) => onPatch({ transform: { scale } })}
          />
        </section>

        <section className="inspector-section" aria-labelledby="object-surface-heading">
          <h3 id="object-surface-heading">Surface</h3>
          <SelectField
            label="Material"
            value={object.material.kind}
            options={MATERIAL_OPTIONS}
            onChange={(kind) =>
              onPatch({
                material: {
                  kind,
                  ...(kind === 'emissive' && object.material.emission === 0
                    ? { emission: 0.6 }
                    : {}),
                },
              })
            }
          />
          <ColorField
            label="Color"
            value={object.material.color}
            onChange={(color) => onPatch({ material: { color } })}
          />
          <SliderField
            label="Gloss"
            value={object.material.gloss}
            range={GLOSS_RANGE}
            step={0.01}
            onChange={(gloss) => onPatch({ material: { gloss } })}
          />
          {object.material.kind === 'emissive' && (
            <SliderField
              label="Emission"
              value={object.material.emission}
              range={EMISSION_RANGE}
              step={0.01}
              onChange={(emission) => onPatch({ material: { emission } })}
            />
          )}
        </section>

        <section className="inspector-section" aria-labelledby="object-motion-heading">
          <h3 id="object-motion-heading">Motion</h3>
          <SliderField
            label="Spin"
            value={object.motion.spin}
            range={SPIN_RANGE}
            step={0.01}
            format={formatRadiansPerSecond}
            onChange={(spin) => onPatch({ motion: { spin } })}
          />
          <SliderField
            label="Float"
            value={object.motion.float}
            range={FLOAT_RANGE}
            step={0.01}
            onChange={(float) => onPatch({ motion: { float } })}
          />
          <SliderField
            label="Float speed"
            value={object.motion.floatSpeed}
            range={FLOAT_SPEED_RANGE}
            step={0.01}
            format={(value) => `${value.toFixed(2)} cycles`}
            onChange={(floatSpeed) => onPatch({ motion: { floatSpeed } })}
          />
          <SliderField
            label="Orbit radius"
            value={object.motion.orbitRadius}
            range={ORBIT_RADIUS_RANGE}
            step={0.05}
            onChange={(orbitRadius) => onPatch({ motion: { orbitRadius } })}
          />
          {object.motion.orbitRadius > 0 ? (
            <>
              <SliderField
                label="Orbit speed"
                value={object.motion.orbitSpeed}
                range={ORBIT_SPEED_RANGE}
                step={0.01}
                format={formatRadiansPerSecond}
                onChange={(orbitSpeed) => onPatch({ motion: { orbitSpeed } })}
              />
              <SliderField
                label="Phase"
                value={object.motion.phase}
                range={PHASE_RANGE}
                step={0.01}
                onChange={(phase) => onPatch({ motion: { phase } })}
              />
            </>
          ) : (
            <p className="field-hint">
              Raise the orbit radius to move this object around its authored position.
            </p>
          )}
        </section>

        <section className="inspector-section" aria-labelledby="object-reaction-heading">
          <h3 id="object-reaction-heading">Reaction</h3>
          <p className="field-hint">Bounded responses layer over the pose above.</p>
          <SliderField
            label="Breathe"
            value={object.reaction.breathe}
            range={BREATHE_RANGE}
            step={0.005}
            format={formatPercent}
            onChange={(breathe) => onPatch({ reaction: { breathe } })}
          />
          <SliderField
            label="Strike"
            value={object.reaction.strike}
            range={STRIKE_RANGE}
            step={0.005}
            format={formatPercent}
            onChange={(strike) => onPatch({ reaction: { strike } })}
          />
          <SliderField
            label="Flare"
            value={object.reaction.flare}
            range={FLARE_RANGE}
            step={0.01}
            format={formatPercent}
            onChange={(flare) => onPatch({ reaction: { flare } })}
          />
          <SliderField
            label="Balance drift"
            value={object.reaction.drift}
            range={DRIFT_RANGE}
            step={0.01}
            onChange={(drift) => onPatch({ reaction: { drift } })}
          />
          <SliderField
            label="Width expand"
            value={object.reaction.expand}
            range={EXPAND_RANGE}
            step={0.01}
            onChange={(expand) => onPatch({ reaction: { expand } })}
          />
        </section>
      </div>
    </fieldset>
  )
}
