import type {
  BackdropConfig,
  BackdropKind,
  CameraConfig,
  FloorConfig,
  FloorKind,
  FogConfig,
  FogKind,
  LightingConfig,
  SceneConfig,
} from '../../scene/sceneConfig'
import {
  DEFAULT_CHECKER_FLOOR,
  DEFAULT_GRADIENT_BACKDROP,
  DEFAULT_LINEAR_FOG,
  DEFAULT_REFLECTIVE_FLOOR,
} from '../../scene/sceneDefaults'
import {
  AMBIENT_INTENSITY_RANGE,
  CAMERA_AZIMUTH_RANGE,
  CAMERA_DRIFT_RANGE,
  CAMERA_DISTANCE_RANGE,
  CAMERA_ELEVATION_RANGE,
  CAMERA_FOV_RANGE,
  CAMERA_TARGET_RANGE,
  FLOOR_FADE_END_RANGE,
  FLOOR_FADE_START_RANGE,
  FLOOR_SIZE_RANGE,
  FOG_FAR_RANGE,
  FOG_NEAR_RANGE,
  LIGHT_INTENSITY_RANGE,
} from '../../scene/sceneLimits'
import { ColorField, SelectField, SliderField, Vector3Field } from './fields'
import { formatDegrees, formatUnits } from './formatters'

const BACKDROP_OPTIONS: readonly { value: BackdropKind; label: string }[] = [
  { value: 'gradient', label: 'Gradient' },
  { value: 'solid', label: 'Solid color' },
]

const FLOOR_OPTIONS: readonly { value: FloorKind; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'reflective', label: 'Reflective' },
  { value: 'checker', label: 'Checkerboard' },
]

const FOG_OPTIONS: readonly { value: FogKind; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'linear', label: 'Linear' },
]

type ActiveFloorConfig = Exclude<FloorConfig, { readonly type: 'none' }>

function createBackdrop(kind: BackdropKind, current: BackdropConfig): BackdropConfig {
  if (kind === 'solid') {
    return {
      type: 'solid',
      color: current.type === 'gradient' ? current.horizon : current.color,
    }
  }

  return DEFAULT_GRADIENT_BACKDROP
}

interface FloorDistances {
  readonly size: number
  readonly fadeStart: number
  readonly fadeEnd: number
}

function getFloorDistance(floor: FloorConfig): FloorDistances {
  return floor.type === 'none'
    ? {
        size: DEFAULT_REFLECTIVE_FLOOR.size,
        fadeStart: DEFAULT_REFLECTIVE_FLOOR.fadeStart,
        fadeEnd: DEFAULT_REFLECTIVE_FLOOR.fadeEnd,
      }
    : { size: floor.size, fadeStart: floor.fadeStart, fadeEnd: floor.fadeEnd }
}

function createFloor(kind: FloorKind, current: FloorConfig): FloorConfig {
  const distances = getFloorDistance(current)

  switch (kind) {
    case 'none':
      return { type: 'none' }
    case 'reflective':
      return { ...DEFAULT_REFLECTIVE_FLOOR, ...distances }
    case 'checker':
      return { ...DEFAULT_CHECKER_FLOOR, ...distances }
  }
}

function createFog(kind: FogKind, current: FogConfig): FogConfig {
  if (kind === 'none') {
    return { type: 'none' }
  }

  return current.type === 'linear' ? current : DEFAULT_LINEAR_FOG
}

interface FloorDistanceFieldsProps {
  floor: ActiveFloorConfig
  onChange: (floor: FloorConfig) => void
}

function FloorDistanceFields({ floor, onChange }: FloorDistanceFieldsProps) {
  return (
    <>
      <SliderField
        label="Size"
        value={floor.size}
        range={FLOOR_SIZE_RANGE}
        step={1}
        onChange={(size) => onChange({ ...floor, size })}
      />
      <SliderField
        label="Fade start"
        value={floor.fadeStart}
        range={FLOOR_FADE_START_RANGE}
        step={0.5}
        format={formatUnits}
        onChange={(fadeStart) => onChange({ ...floor, fadeStart })}
      />
      <SliderField
        label="Fade end"
        value={floor.fadeEnd}
        range={FLOOR_FADE_END_RANGE}
        step={0.5}
        format={formatUnits}
        onChange={(fadeEnd) => onChange({ ...floor, fadeEnd })}
      />
    </>
  )
}

interface WorldPanelProps {
  scene: SceneConfig
  locked: boolean
  onSetBackdrop: (backdrop: BackdropConfig) => void
  onSetFloor: (floor: FloorConfig) => void
  onSetFog: (fog: FogConfig) => void
  onPatchLighting: (patch: Partial<LightingConfig>) => void
  onPatchCamera: (patch: Partial<CameraConfig>) => void
}

export function WorldPanel({
  scene,
  locked,
  onSetBackdrop,
  onSetFloor,
  onSetFog,
  onPatchLighting,
  onPatchCamera,
}: WorldPanelProps) {
  const { backdrop, floor, fog, lighting } = scene.world
  const { camera } = scene

  return (
    <fieldset className="inspector-fields" disabled={locked}>
      <legend className="sr-only">World and camera properties</legend>

      <div className="inspector-panel">
        <section className="inspector-section" aria-labelledby="world-backdrop-heading">
          <h3 id="world-backdrop-heading">Backdrop</h3>
          <SelectField
            label="Type"
            value={backdrop.type}
            options={BACKDROP_OPTIONS}
            onChange={(kind) => onSetBackdrop(createBackdrop(kind, backdrop))}
          />
          {backdrop.type === 'solid' ? (
            <ColorField
              label="Color"
              value={backdrop.color}
              onChange={(color) => onSetBackdrop({ type: 'solid', color })}
            />
          ) : (
            <>
              <ColorField
                label="Top"
                value={backdrop.top}
                onChange={(top) => onSetBackdrop({ ...backdrop, top })}
              />
              <ColorField
                label="Horizon"
                value={backdrop.horizon}
                onChange={(horizon) => onSetBackdrop({ ...backdrop, horizon })}
              />
              <ColorField
                label="Bottom"
                value={backdrop.bottom}
                onChange={(bottom) => onSetBackdrop({ ...backdrop, bottom })}
              />
            </>
          )}
        </section>

        <section className="inspector-section" aria-labelledby="world-floor-heading">
          <h3 id="world-floor-heading">Floor</h3>
          <SelectField
            label="Type"
            value={floor.type}
            options={FLOOR_OPTIONS}
            onChange={(kind) => onSetFloor(createFloor(kind, floor))}
          />

          {floor.type === 'none' && (
            <p className="field-hint">Objects float in the backdrop with no floor or reflection.</p>
          )}

          {floor.type === 'reflective' && (
            <>
              <ColorField
                label="Floor color"
                value={floor.color}
                onChange={(color) => onSetFloor({ ...floor, color })}
              />
              <FloorDistanceFields floor={floor} onChange={onSetFloor} />
            </>
          )}

          {floor.type === 'checker' && (
            <>
              <ColorField
                label="Light square"
                value={floor.lightColor}
                onChange={(lightColor) => onSetFloor({ ...floor, lightColor })}
              />
              <ColorField
                label="Dark square"
                value={floor.darkColor}
                onChange={(darkColor) => onSetFloor({ ...floor, darkColor })}
              />
              <FloorDistanceFields floor={floor} onChange={onSetFloor} />
            </>
          )}
        </section>

        <section className="inspector-section" aria-labelledby="world-fog-heading">
          <h3 id="world-fog-heading">Fog</h3>
          <SelectField
            label="Type"
            value={fog.type}
            options={FOG_OPTIONS}
            onChange={(kind) => onSetFog(createFog(kind, fog))}
          />
          {fog.type === 'linear' ? (
            <>
              <ColorField
                label="Color"
                value={fog.color}
                onChange={(color) => onSetFog({ ...fog, color })}
              />
              <SliderField
                label="Near"
                value={fog.near}
                range={FOG_NEAR_RANGE}
                step={0.5}
                format={formatUnits}
                onChange={(near) => onSetFog({ ...fog, near })}
              />
              <SliderField
                label="Far"
                value={fog.far}
                range={FOG_FAR_RANGE}
                step={0.5}
                format={formatUnits}
                onChange={(far) => onSetFog({ ...fog, far })}
              />
            </>
          ) : (
            <p className="field-hint">With fog off, only the floor fades into the backdrop.</p>
          )}
        </section>

        <section className="inspector-section" aria-labelledby="world-lighting-heading">
          <h3 id="world-lighting-heading">Lighting</h3>
          <ColorField
            label="Ambient color"
            value={lighting.ambientColor}
            onChange={(ambientColor) => onPatchLighting({ ambientColor })}
          />
          <SliderField
            label="Ambient intensity"
            value={lighting.ambientIntensity}
            range={AMBIENT_INTENSITY_RANGE}
            step={0.01}
            onChange={(ambientIntensity) => onPatchLighting({ ambientIntensity })}
          />
          <ColorField
            label="Key color"
            value={lighting.keyColor}
            onChange={(keyColor) => onPatchLighting({ keyColor })}
          />
          <SliderField
            label="Key intensity"
            value={lighting.keyIntensity}
            range={LIGHT_INTENSITY_RANGE}
            step={0.01}
            onChange={(keyIntensity) => onPatchLighting({ keyIntensity })}
          />
          <ColorField
            label="Fill color"
            value={lighting.fillColor}
            onChange={(fillColor) => onPatchLighting({ fillColor })}
          />
          <SliderField
            label="Fill intensity"
            value={lighting.fillIntensity}
            range={LIGHT_INTENSITY_RANGE}
            step={0.01}
            onChange={(fillIntensity) => onPatchLighting({ fillIntensity })}
          />
        </section>

        <section className="inspector-section" aria-labelledby="world-camera-heading">
          <h3 id="world-camera-heading">Camera</h3>
          <p className="field-hint">
            Drag the canvas to orbit and scroll to zoom. These values stay in the scene document.
          </p>
          <Vector3Field
            label="Target"
            value={camera.target}
            minimum={CAMERA_TARGET_RANGE.minimum}
            maximum={CAMERA_TARGET_RANGE.maximum}
            step={0.05}
            onChange={(target) => onPatchCamera({ target })}
          />
          <SliderField
            label="Distance"
            value={camera.distance}
            range={CAMERA_DISTANCE_RANGE}
            step={0.05}
            onChange={(distance) => onPatchCamera({ distance })}
          />
          <SliderField
            label="Azimuth"
            value={camera.azimuth}
            range={CAMERA_AZIMUTH_RANGE}
            step={1}
            format={formatDegrees}
            onChange={(azimuth) => onPatchCamera({ azimuth })}
          />
          <SliderField
            label="Elevation"
            value={camera.elevation}
            range={CAMERA_ELEVATION_RANGE}
            step={1}
            format={formatDegrees}
            onChange={(elevation) => onPatchCamera({ elevation })}
          />
          <SliderField
            label="Field of view"
            value={camera.fov}
            range={CAMERA_FOV_RANGE}
            step={1}
            format={formatDegrees}
            onChange={(fov) => onPatchCamera({ fov })}
          />
          <SliderField
            label="Drift"
            value={camera.drift}
            range={CAMERA_DRIFT_RANGE}
            step={0.01}
            onChange={(drift) => onPatchCamera({ drift })}
          />
        </section>
      </div>
    </fieldset>
  )
}
