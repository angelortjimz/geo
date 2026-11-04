import {
  ACESFilmicToneMapping,
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  Fog,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import type { AudioEngine } from '../audio/AudioEngine'
import { AudioFeatureExtractor } from '../audio/features'
import type { AudioFeatures } from '../audio/features'
import { drawCaptureFrame } from '../export/captureCanvas'
import {
  getBalanceOffset,
  getBreathingScale,
  getExpandedOrbitRadius,
  getImpactScale,
} from '../motion/behaviors'
import { ImpactSpring } from '../motion/spring'
import { getCameraPosition } from '../scene/camera'
import type {
  BackdropConfig,
  CameraConfig,
  FinishConfig,
  FloorConfig,
  FogConfig,
  LightingConfig,
  SceneConfig,
  SceneObjectConfig,
  WorldConfig,
} from '../scene/sceneConfig'
import {
  EMISSION_INTENSITY_SCALE,
  FLARE_INTENSITY_SCALE,
  applyObjectMaterial,
  createObjectMaterial,
  createPrimitiveGeometry,
  getGeometryKey,
  getMaterialKey,
} from './objectFactory'
import {
  createBackdropTexture,
  createCheckerFloorShader,
  createContactShadowTexture,
  createEnvironmentTexture,
  createSoftFloorShader,
  getBackdropHorizonColor,
} from './sceneTextures'

const MAX_FRAME_DELTA = 0.05
const MAX_REFLECTION_DIMENSION = 1_024
const REFLECTION_TEXTURE_SIZE = 512
const BLOOM_LAYER = 1
const IMPACT_KICK_THRESHOLD = 0.05
const FLARE_DECAY_PER_SECOND = 6.5
const STEREO_BLEND_SECONDS = 0.1
const DEGREES_TO_RADIANS = Math.PI / 180
const ORBIT_RADIANS = Math.PI * 2
const SHADOW_FOOTPRINT = 3.2
const SHADOW_HEIGHT = 0.015
const SHADOW_MAX_OPACITY = 0.9
const SHADOW_HEIGHT_FALLOFF = 0.07
const EMISSIVE_LIGHT_INTENSITY = 1.1
const EMISSIVE_LIGHT_FLARE = 0.6

type ActiveFloorKind = Exclude<FloorConfig['type'], 'none'>
type ActiveFloorConfig = Exclude<FloorConfig, { readonly type: 'none' }>

interface MotionWobble {
  readonly tiltAmplitude: number
  readonly tiltSpeed: number
  readonly yawAmplitude: number
  readonly yawSpeed: number
  readonly rollAmplitude: number
  readonly rollSpeed: number
}

interface ObjectRuntime {
  readonly id: string
  readonly mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>
  readonly shadow: Mesh<PlaneGeometry, MeshBasicMaterial>
  readonly spring: ImpactSpring
  readonly wobble: MotionWobble
  config: SceneObjectConfig
  light: PointLight | null
  geometryKey: string
  materialKey: string
  flare: number
  previousImpact: number
  orbitAngle: number
  spinAngle: number
}

interface FloorRuntime {
  readonly kind: ActiveFloorKind
  readonly mesh: Mesh
  readonly material: ShaderMaterial
  readonly reflector: Reflector | null
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function hashText(value: string): number {
  let hash = 2_166_136_261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

function unitFromHash(hash: number, shift: number): number {
  return ((hash >>> shift) & 0xff) / 255
}

/** Subtle secondary motion derived from the stable object id, never from frame order. */
function createWobble(id: string): MotionWobble {
  const hash = hashText(id)

  return {
    tiltAmplitude: 0.025 + unitFromHash(hash, 0) * 0.03,
    tiltSpeed: 0.19 + unitFromHash(hash, 8) * 0.12,
    yawAmplitude: 0.02 + unitFromHash(hash, 16) * 0.02,
    yawSpeed: 0.3 + unitFromHash(hash, 24) * 0.15,
    rollAmplitude: 0.018 + unitFromHash(hash, 4) * 0.022,
    rollSpeed: 0.24 + unitFromHash(hash, 12) * 0.14,
  }
}

function setColorUniform(material: ShaderMaterial, name: string, color: string): void {
  const value: unknown = material.uniforms[name]?.value
  if (value instanceof Color) {
    value.set(color)
  }
}

function setNumberUniform(material: ShaderMaterial, name: string, value: number): void {
  const uniform = material.uniforms[name]
  if (uniform) {
    uniform.value = value
  }
}

function setVector2Uniform(material: ShaderMaterial, name: string, x: number, y: number): void {
  const value: unknown = material.uniforms[name]?.value
  if (value instanceof Vector2) {
    value.set(x, y)
  }
}

export class SceneRenderer {
  private readonly engine: AudioEngine
  private config: SceneConfig
  private readonly scene: Scene
  private readonly camera: PerspectiveCamera
  private readonly renderer: WebGLRenderer
  private readonly composer: EffectComposer
  private readonly bloomComposer: EffectComposer
  private readonly bloomPass: UnrealBloomPass
  private readonly combinePass: ShaderPass
  private readonly outputPass: OutputPass
  private readonly ambientLight: AmbientLight
  private readonly keyLight: DirectionalLight
  private readonly fillLight: DirectionalLight
  private readonly environmentTarget: WebGLRenderTarget
  private readonly contactShadowTexture: ReturnType<typeof createContactShadowTexture>
  private readonly shadowGeometry: PlaneGeometry
  private readonly objects = new Map<string, ObjectRuntime>()
  private readonly extractor = new AudioFeatureExtractor()
  private readonly leftSamples: Float32Array<ArrayBuffer>
  private readonly rightSamples: Float32Array<ArrayBuffer>
  private readonly cameraTarget: Vector3
  private readonly response = { level: 0, width: 0, balance: 0 }
  private floor: FloorRuntime | null = null
  private backdropTexture: ReturnType<typeof createBackdropTexture> | null = null
  private backdropSignature = ''
  private captureFillColor: string
  private clock = 0
  private smoothedBalance = 0
  private smoothedWidth = 0
  private audioRevision: number
  private viewportWidth = 1
  private viewportHeight = 1
  private viewportPixelRatio = 1
  private viewportDevicePixelRatio = 1
  private frameId: number | null = null
  private lastTime = 0
  private captureTarget: HTMLCanvasElement | null = null
  private disposed = false

  constructor(canvas: HTMLCanvasElement, engine: AudioEngine, config: SceneConfig) {
    this.engine = engine
    this.config = config
    this.captureFillColor = getBackdropHorizonColor(config.world.backdrop)
    this.leftSamples = new Float32Array(engine.getAnalysisFrameSize())
    this.rightSamples = new Float32Array(engine.getAnalysisFrameSize())
    this.audioRevision = engine.getAnalysisRevision()
    this.cameraTarget = new Vector3(...config.camera.target)

    this.scene = new Scene()
    this.camera = new PerspectiveCamera(config.camera.fov, 1, 0.1, 400)
    this.camera.lookAt(this.cameraTarget)

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.setClearColor('#000000', 1)
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = config.finish.exposure

    const environmentSource = createEnvironmentTexture()
    environmentSource.mapping = EquirectangularReflectionMapping
    const pmrem = new PMREMGenerator(this.renderer)
    this.environmentTarget = pmrem.fromEquirectangular(environmentSource)
    this.scene.environment = this.environmentTarget.texture
    this.scene.environmentIntensity = 1.2
    environmentSource.dispose()
    pmrem.dispose()

    this.contactShadowTexture = createContactShadowTexture()
    this.shadowGeometry = new PlaneGeometry(1, 1)

    const lighting = config.world.lighting
    this.ambientLight = new AmbientLight(lighting.ambientColor, lighting.ambientIntensity)
    this.keyLight = new DirectionalLight(lighting.keyColor, lighting.keyIntensity)
    this.keyLight.position.set(4, 7, 5)
    this.fillLight = new DirectionalLight(lighting.fillColor, lighting.fillIntensity)
    this.fillLight.position.set(-5, 3, -2)
    this.scene.add(this.ambientLight, this.keyLight, this.fillLight)

    const bloomTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType })
    this.bloomComposer = new EffectComposer(this.renderer, bloomTarget)
    this.bloomComposer.renderToScreen = false
    this.bloomComposer.addPass(new RenderPass(this.scene, this.camera))
    this.bloomPass = new UnrealBloomPass(
      new Vector2(1, 1),
      config.finish.bloom.strength,
      config.finish.bloom.radius,
      config.finish.bloom.threshold,
    )
    this.bloomComposer.addPass(this.bloomPass)

    const renderTarget = new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
      samples: 4,
    })
    this.composer = new EffectComposer(this.renderer, renderTarget)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.combinePass = new ShaderPass(
      new ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.bloomComposer.renderTarget2.texture },
          bloomIntensity: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          uniform float bloomIntensity;
          varying vec2 vUv;
          void main() {
            gl_FragColor =
              texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv) * bloomIntensity;
          }
        `,
        depthTest: false,
        depthWrite: false,
      }),
      'baseTexture',
    )
    this.composer.addPass(this.combinePass)
    this.outputPass = new OutputPass()
    this.composer.addPass(this.outputPass)

    this.applyConfig(config)
  }

  start(): void {
    if (this.disposed || this.frameId !== null) {
      return
    }

    this.lastTime = 0
    this.frameId = requestAnimationFrame(this.frame)
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    if (this.disposed || !(width > 0) || !(height > 0)) {
      return
    }

    const safeWidth = Math.max(1, Math.round(width))
    const safeHeight = Math.max(1, Math.round(height))
    const pixelRatio = Math.min(this.config.canvas.dprCap, Math.max(1, devicePixelRatio || 1))

    this.viewportWidth = safeWidth
    this.viewportHeight = safeHeight
    this.viewportPixelRatio = pixelRatio
    this.viewportDevicePixelRatio = devicePixelRatio || 1

    this.camera.aspect = safeWidth / safeHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(safeWidth, safeHeight, false)
    this.bloomComposer.setPixelRatio(pixelRatio)
    this.bloomComposer.setSize(safeWidth, safeHeight)
    this.composer.setPixelRatio(pixelRatio)
    this.composer.setSize(safeWidth, safeHeight)
    this.applyFloorResolution()
  }

  setCaptureTarget(target: HTMLCanvasElement | null): void {
    this.captureTarget = target
  }

  /** Applies a new scene document without restarting the loop or the clock. */
  applyConfig(next: SceneConfig): void {
    if (this.disposed) {
      return
    }

    const previousDprCap = this.config.canvas.dprCap
    this.config = next
    this.syncObjects(next)
    this.syncWorld(next.world)
    this.syncCamera(next.camera)
    this.syncFinish(next.finish)

    if (next.canvas.dprCap !== previousDprCap) {
      this.resize(this.viewportWidth, this.viewportHeight, this.viewportDevicePixelRatio)
    }

    this.updateFrame(0)
  }

  resetMotion(): void {
    this.clock = 0
    this.smoothedBalance = 0
    this.smoothedWidth = 0
    this.lastTime = 0
    this.audioRevision = this.engine.getAnalysisRevision()
    this.extractor.reset()

    for (const runtime of this.objects.values()) {
      runtime.spring.reset()
      runtime.flare = 0
      runtime.previousImpact = 0
      runtime.orbitAngle = runtime.config.motion.phase * ORBIT_RADIANS
      runtime.spinAngle = 0
    }

    this.updateFrame(0)
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.captureTarget = null
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }

    for (const runtime of this.objects.values()) {
      this.destroyRuntime(runtime)
    }
    this.objects.clear()

    if (this.floor) {
      this.disposeFloor(this.floor)
      this.floor = null
    }

    this.backdropTexture?.dispose()
    this.backdropTexture = null
    this.contactShadowTexture.dispose()
    this.shadowGeometry.dispose()
    this.environmentTarget.dispose()
    this.bloomPass.dispose()
    this.bloomComposer.dispose()
    this.combinePass.dispose()
    this.outputPass.dispose()
    this.composer.dispose()
    this.scene.clear()
    this.renderer.dispose()
  }

  private readonly frame = (timeMilliseconds: number): void => {
    if (this.disposed) {
      return
    }

    const deltaSeconds =
      this.lastTime === 0
        ? 0
        : Math.min(MAX_FRAME_DELTA, Math.max(0, (timeMilliseconds - this.lastTime) / 1000))
    this.lastTime = timeMilliseconds
    this.updateFrame(deltaSeconds)

    // Render only emissive objects into the bloom chain, then composite the glow
    // back over the sharp chrome, plastic, and floor.
    if (this.config.finish.bloom.enabled) {
      const background = this.scene.background
      this.scene.background = null
      this.camera.layers.set(BLOOM_LAYER)
      try {
        this.bloomComposer.render(deltaSeconds)
      } finally {
        this.scene.background = background
        this.camera.layers.set(0)
      }
    }

    this.composer.render(deltaSeconds)
    if (this.captureTarget) {
      drawCaptureFrame(this.renderer.domElement, this.captureTarget, this.captureFillColor)
    }
    this.frameId = requestAnimationFrame(this.frame)
  }

  private updateFrame(deltaSeconds: number): void {
    const safeDelta = Math.min(MAX_FRAME_DELTA, Math.max(0, deltaSeconds))

    this.syncAudioRevision()
    this.clock += safeDelta
    this.engine.readStereoTimeDomainData(this.leftSamples, this.rightSamples)
    const features = this.extractor.process(this.leftSamples, this.rightSamples, safeDelta)

    const stereoBlend = 1 - Math.exp(-safeDelta / STEREO_BLEND_SECONDS)
    this.smoothedBalance += (features.balance - this.smoothedBalance) * stereoBlend
    this.smoothedWidth += (features.width - this.smoothedWidth) * stereoBlend
    this.response.level = Math.sqrt(features.level)
    this.response.balance = this.smoothedBalance
    this.response.width = this.smoothedWidth

    for (const runtime of this.objects.values()) {
      this.updateObject(runtime, safeDelta, features)
    }

    this.updateCamera()
  }

  private syncAudioRevision(): void {
    const revision = this.engine.getAnalysisRevision()
    if (revision === this.audioRevision) {
      return
    }

    this.audioRevision = revision
    this.extractor.reset()
    this.smoothedBalance = 0
    this.smoothedWidth = 0

    for (const runtime of this.objects.values()) {
      runtime.spring.reset()
      runtime.previousImpact = 0
      runtime.flare = 0
    }
  }

  private updateObject(
    runtime: ObjectRuntime,
    deltaSeconds: number,
    features: Readonly<AudioFeatures>,
  ): void {
    const config = runtime.config
    const motion = config.motion
    const reaction = config.reaction

    if (features.impact > runtime.previousImpact + IMPACT_KICK_THRESHOLD) {
      runtime.spring.kick(features.impact)
      runtime.flare = Math.max(runtime.flare, features.impact)
    }
    runtime.previousImpact = features.impact
    runtime.flare *= Math.exp(-deltaSeconds * FLARE_DECAY_PER_SECOND)
    const springValue = runtime.spring.update(deltaSeconds)

    const phase = motion.phase * ORBIT_RADIANS
    runtime.orbitAngle += deltaSeconds * motion.orbitSpeed
    runtime.spinAngle += deltaSeconds * motion.spin

    const orbitRadius = getExpandedOrbitRadius(
      motion.orbitRadius,
      this.smoothedWidth,
      reaction.expand,
    )
    const stereoOffset = getBalanceOffset(this.smoothedBalance, reaction.drift)
    const floatOffset = Math.sin(this.clock * motion.floatSpeed + phase) * motion.float
    const base = config.transform

    runtime.mesh.position.set(
      base.position[0] + Math.cos(runtime.orbitAngle) * orbitRadius + stereoOffset,
      base.position[1] + floatOffset,
      base.position[2] + Math.sin(runtime.orbitAngle) * orbitRadius,
    )

    const breathe = getBreathingScale(this.response.level, reaction.breathe)
    const impact = getImpactScale(springValue, reaction.strike)
    runtime.mesh.scale.set(
      base.scale[0] * breathe * impact.horizontal,
      base.scale[1] * breathe * impact.vertical,
      base.scale[2] * breathe * impact.horizontal,
    )

    const wobble = runtime.wobble
    runtime.mesh.rotation.set(
      base.rotation[0] * DEGREES_TO_RADIANS +
        Math.sin(this.clock * wobble.tiltSpeed + phase) * wobble.tiltAmplitude,
      base.rotation[1] * DEGREES_TO_RADIANS +
        runtime.spinAngle +
        Math.sin(this.clock * wobble.yawSpeed) * wobble.yawAmplitude,
      base.rotation[2] * DEGREES_TO_RADIANS +
        Math.sin(this.clock * wobble.rollSpeed + phase * 0.5) * wobble.rollAmplitude,
    )

    const baseEmission =
      config.material.kind === 'emissive' ? config.material.emission * EMISSION_INTENSITY_SCALE : 0
    runtime.mesh.material.emissiveIntensity =
      baseEmission + runtime.flare * reaction.flare * FLARE_INTENSITY_SCALE

    if (runtime.light) {
      runtime.light.intensity =
        EMISSIVE_LIGHT_INTENSITY + runtime.flare * reaction.flare * EMISSIVE_LIGHT_FLARE
    }

    this.updateShadow(runtime)
  }

  private updateShadow(runtime: ObjectRuntime): void {
    const visible = this.floor !== null
    runtime.shadow.visible = visible
    if (!visible) {
      return
    }

    const { position, scale } = runtime.mesh
    runtime.shadow.position.set(position.x, SHADOW_HEIGHT, position.z)
    runtime.shadow.scale.set(
      Math.max(0.2, SHADOW_FOOTPRINT * scale.x),
      Math.max(0.2, SHADOW_FOOTPRINT * scale.z),
      1,
    )
    const heightFade = clamp(1 - (position.y - 1) * SHADOW_HEIGHT_FALLOFF, 0.2, 1)
    runtime.shadow.material.opacity = SHADOW_MAX_OPACITY * heightFade
  }

  private updateCamera(): void {
    const config = this.config.camera
    const [x, y, z] = getCameraPosition(config)
    const drift = config.drift

    this.camera.position.set(
      x + Math.sin(this.clock * 0.11) * drift,
      y + Math.sin(this.clock * 0.09) * drift * 0.55,
      z + Math.cos(this.clock * 0.08) * drift * 0.8,
    )
    this.cameraTarget.set(config.target[0], config.target[1], config.target[2])
    this.camera.lookAt(this.cameraTarget)
  }

  private syncObjects(scene: SceneConfig): void {
    const nextIds = new Set(scene.objects.map((object) => object.id))

    for (const [id, runtime] of this.objects) {
      if (!nextIds.has(id)) {
        this.destroyRuntime(runtime)
        this.objects.delete(id)
      }
    }

    for (const config of scene.objects) {
      const runtime = this.objects.get(config.id)
      if (runtime) {
        this.updateRuntimeConfig(runtime, config)
      } else {
        this.objects.set(config.id, this.createRuntime(config))
      }
    }
  }

  private createRuntime(config: SceneObjectConfig): ObjectRuntime {
    const geometry = createPrimitiveGeometry(config.form)
    const material = createObjectMaterial(config.form, config.material)
    const mesh = new Mesh(geometry, material)
    mesh.name = config.name

    const shadowMaterial = new MeshBasicMaterial({
      map: this.contactShadowTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    const shadow = new Mesh(this.shadowGeometry, shadowMaterial)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = SHADOW_HEIGHT
    this.scene.add(mesh, shadow)

    const runtime: ObjectRuntime = {
      id: config.id,
      mesh,
      shadow,
      spring: new ImpactSpring(),
      wobble: createWobble(config.id),
      config,
      light: null,
      geometryKey: getGeometryKey(config.form),
      materialKey: getMaterialKey(config.form, config.material),
      flare: 0,
      previousImpact: 0,
      orbitAngle: config.motion.phase * ORBIT_RADIANS,
      spinAngle: 0,
    }

    this.syncRuntimeLight(runtime)
    this.syncRuntimeLayers(runtime)
    return runtime
  }

  private updateRuntimeConfig(runtime: ObjectRuntime, config: SceneObjectConfig): void {
    const geometryKey = getGeometryKey(config.form)
    if (geometryKey !== runtime.geometryKey) {
      const geometry = createPrimitiveGeometry(config.form)
      runtime.mesh.geometry.dispose()
      runtime.mesh.geometry = geometry
      runtime.geometryKey = geometryKey
    }

    const materialKey = getMaterialKey(config.form, config.material)
    if (materialKey !== runtime.materialKey) {
      applyObjectMaterial(runtime.mesh.material, config.form, config.material)
      runtime.materialKey = materialKey
    }

    runtime.mesh.name = config.name
    runtime.config = config
    this.syncRuntimeLight(runtime)
    this.syncRuntimeLayers(runtime)
  }

  private syncRuntimeLight(runtime: ObjectRuntime): void {
    const wantsLight = runtime.config.material.kind === 'emissive'

    if (wantsLight && !runtime.light) {
      const light = new PointLight(runtime.config.material.color, EMISSIVE_LIGHT_INTENSITY, 4.5, 2)
      runtime.mesh.add(light)
      runtime.light = light
      return
    }

    if (!wantsLight && runtime.light) {
      runtime.mesh.remove(runtime.light)
      runtime.light.dispose()
      runtime.light = null
      return
    }

    runtime.light?.color.set(runtime.config.material.color)
  }

  private syncRuntimeLayers(runtime: ObjectRuntime): void {
    if (runtime.config.material.kind === 'emissive') {
      runtime.mesh.layers.enable(BLOOM_LAYER)
    } else {
      runtime.mesh.layers.disable(BLOOM_LAYER)
    }
  }

  private destroyRuntime(runtime: ObjectRuntime): void {
    this.scene.remove(runtime.mesh, runtime.shadow)
    if (runtime.light) {
      runtime.mesh.remove(runtime.light)
    }
    runtime.mesh.geometry.dispose()
    runtime.mesh.material.dispose()
    runtime.shadow.material.dispose()
  }

  private syncWorld(world: WorldConfig): void {
    this.syncBackdrop(world.backdrop)
    this.syncFloor(world)
    this.syncFog(world.fog)
    this.syncLighting(world.lighting)
  }

  private syncBackdrop(backdrop: BackdropConfig): void {
    const signature =
      backdrop.type === 'solid'
        ? `solid:${backdrop.color}`
        : `gradient:${backdrop.top}:${backdrop.horizon}:${backdrop.bottom}`

    this.captureFillColor = getBackdropHorizonColor(backdrop)
    if (signature === this.backdropSignature) {
      return
    }

    this.backdropSignature = signature
    this.backdropTexture?.dispose()
    this.backdropTexture = null

    if (backdrop.type === 'solid') {
      this.scene.background = new Color(backdrop.color)
    } else {
      this.backdropTexture = createBackdropTexture(backdrop)
      this.scene.background = this.backdropTexture
    }
  }

  private syncFloor(world: WorldConfig): void {
    const floor = world.floor

    if (floor.type === 'none') {
      if (this.floor) {
        this.disposeFloor(this.floor)
        this.floor = null
      }
      return
    }

    const horizonColor = getBackdropHorizonColor(world.backdrop)
    if (this.floor && this.floor.kind === floor.type) {
      this.updateFloor(this.floor, floor, horizonColor)
      return
    }

    if (this.floor) {
      this.disposeFloor(this.floor)
      this.floor = null
    }

    this.floor = this.createFloor(floor, horizonColor)
    this.applyFloorResolution()
  }

  private createFloor(floor: ActiveFloorConfig, horizonColor: string): FloorRuntime {
    if (floor.type === 'reflective') {
      const shader = createSoftFloorShader(floor, horizonColor)
      const reflector = new Reflector(new PlaneGeometry(1, 1), {
        clipBias: 0.003,
        textureWidth: REFLECTION_TEXTURE_SIZE,
        textureHeight: REFLECTION_TEXTURE_SIZE,
        color: floor.color,
        multisample: 0,
        shader,
      })
      reflector.rotation.x = -Math.PI / 2
      reflector.position.y = 0
      reflector.scale.set(floor.size, floor.size, 1)
      this.scene.add(reflector)

      const material = reflector.material
      if (!(material instanceof ShaderMaterial)) {
        reflector.dispose()
        throw new Error('The reflective floor did not create a shader material.')
      }

      return { kind: 'reflective', mesh: reflector, material, reflector }
    }

    const shader = createCheckerFloorShader(floor, horizonColor)
    const material = new ShaderMaterial({
      name: shader.name,
      uniforms: shader.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
    })
    const mesh = new Mesh(new PlaneGeometry(1, 1), material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = 0
    mesh.scale.set(floor.size, floor.size, 1)
    this.scene.add(mesh)

    return { kind: 'checker', mesh, material, reflector: null }
  }

  private updateFloor(runtime: FloorRuntime, floor: ActiveFloorConfig, horizonColor: string): void {
    if (runtime.kind === 'reflective' && floor.type === 'reflective') {
      runtime.mesh.scale.set(floor.size, floor.size, 1)
      setColorUniform(runtime.material, 'color', floor.color)
      setColorUniform(runtime.material, 'horizonColor', horizonColor)
      setNumberUniform(runtime.material, 'fadeStart', floor.fadeStart)
      setNumberUniform(runtime.material, 'fadeEnd', floor.fadeEnd)
      return
    }

    if (runtime.kind === 'checker' && floor.type === 'checker') {
      runtime.mesh.scale.set(floor.size, floor.size, 1)
      setColorUniform(runtime.material, 'lightColor', floor.lightColor)
      setColorUniform(runtime.material, 'darkColor', floor.darkColor)
      setColorUniform(runtime.material, 'horizonColor', horizonColor)
      setNumberUniform(runtime.material, 'fadeStart', floor.fadeStart)
      setNumberUniform(runtime.material, 'fadeEnd', floor.fadeEnd)
    }
  }

  private disposeFloor(runtime: FloorRuntime): void {
    this.scene.remove(runtime.mesh)
    runtime.mesh.geometry.dispose()
    if (runtime.reflector) {
      runtime.reflector.dispose()
    } else {
      runtime.material.dispose()
    }
  }

  private applyFloorResolution(): void {
    const reflector = this.floor?.reflector
    if (!reflector) {
      return
    }

    const reflectionWidth = Math.max(
      2,
      Math.min(
        MAX_REFLECTION_DIMENSION,
        Math.round(this.viewportWidth * this.viewportPixelRatio * 0.65),
      ),
    )
    const reflectionHeight = Math.max(
      2,
      Math.min(
        MAX_REFLECTION_DIMENSION,
        Math.round(this.viewportHeight * this.viewportPixelRatio * 0.65),
      ),
    )
    reflector.getRenderTarget().setSize(reflectionWidth, reflectionHeight)

    if (this.floor) {
      setVector2Uniform(this.floor.material, 'texelSize', 1 / reflectionWidth, 1 / reflectionHeight)
    }
  }

  private syncFog(fog: FogConfig): void {
    if (fog.type === 'none') {
      this.scene.fog = null
      return
    }

    const existing = this.scene.fog
    if (existing instanceof Fog) {
      existing.color.set(fog.color)
      existing.near = fog.near
      existing.far = fog.far
      return
    }

    this.scene.fog = new Fog(fog.color, fog.near, fog.far)
  }

  private syncLighting(lighting: LightingConfig): void {
    this.ambientLight.color.set(lighting.ambientColor)
    this.ambientLight.intensity = lighting.ambientIntensity
    this.keyLight.color.set(lighting.keyColor)
    this.keyLight.intensity = lighting.keyIntensity
    this.fillLight.color.set(lighting.fillColor)
    this.fillLight.intensity = lighting.fillIntensity
  }

  private syncCamera(camera: CameraConfig): void {
    this.camera.fov = camera.fov
    this.camera.updateProjectionMatrix()
    this.cameraTarget.set(camera.target[0], camera.target[1], camera.target[2])
  }

  private syncFinish(finish: FinishConfig): void {
    this.renderer.toneMappingExposure = finish.exposure
    this.bloomPass.threshold = finish.bloom.threshold
    this.bloomPass.strength = finish.bloom.strength
    this.bloomPass.radius = finish.bloom.radius
    setNumberUniform(this.combinePass.material, 'bloomIntensity', finish.bloom.enabled ? 1 : 0)
  }
}
