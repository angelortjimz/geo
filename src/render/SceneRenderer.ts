import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  EquirectangularReflectionMapping,
  Fog,
  HalfFloatType,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { AudioEngine } from '../audio/AudioEngine'
import { AudioFeatureExtractor } from '../audio/features'
import { drawCaptureFrame } from '../export/captureCanvas'
import {
  getBalanceOffset,
  getBreathingScale,
  getExpandedOrbitRadius,
  getImpactScale,
} from '../motion/behaviors'
import { ImpactSpring } from '../motion/spring'
import type { SceneConfig } from '../scene/study'
import {
  createBackdropTexture,
  createContactShadowTexture,
  createEnvironmentTexture,
  createSoftFloorShader,
} from './studyTextures'

const MAX_FRAME_DELTA = 0.05
const MAX_REFLECTION_DIMENSION = 1024
const BLOOM_LAYER = 1

export class SceneRenderer {
  private readonly engine: AudioEngine
  private readonly config: SceneConfig
  private readonly scene: Scene
  private readonly camera: PerspectiveCamera
  private readonly renderer: WebGLRenderer
  private readonly composer: EffectComposer
  private readonly bloomComposer: EffectComposer
  private readonly bloomPass: UnrealBloomPass
  private readonly combinePass: ShaderPass
  private readonly outputPass: OutputPass
  private readonly hero: Mesh<TorusGeometry, MeshPhysicalMaterial>
  private readonly satellite: Mesh<IcosahedronGeometry, MeshStandardMaterial>
  private readonly satelliteLight: PointLight
  private readonly reflector: Reflector
  private readonly contactShadow: Mesh<PlaneGeometry, MeshBasicMaterial>
  private readonly backdropTexture: ReturnType<typeof createBackdropTexture>
  private readonly environmentTarget: WebGLRenderTarget
  private readonly extractor = new AudioFeatureExtractor()
  private readonly leftSamples: Float32Array<ArrayBuffer>
  private readonly rightSamples: Float32Array<ArrayBuffer>
  private readonly impactSpring = new ImpactSpring()
  private readonly cameraTarget: Vector3
  private frameId: number | null = null
  private lastTime = 0
  private clock = 0
  private heroAngle = 0
  private orbitAngle: number
  private previousImpact = 0
  private flare = 0
  private smoothedBalance = 0
  private smoothedWidth = 0
  private audioRevision: number
  private captureTarget: HTMLCanvasElement | null = null
  private disposed = false

  constructor(canvas: HTMLCanvasElement, engine: AudioEngine, config: SceneConfig) {
    this.engine = engine
    this.config = config
    this.leftSamples = new Float32Array(engine.getAnalysisFrameSize())
    this.rightSamples = new Float32Array(engine.getAnalysisFrameSize())
    this.audioRevision = engine.getAnalysisRevision()
    this.orbitAngle = config.objects[1].orbitAngle
    this.cameraTarget = new Vector3(...config.camera.target)

    this.scene = new Scene()
    this.scene.fog = new Fog(config.world.fogColor, config.world.fogNear, config.world.fogFar)
    this.backdropTexture = createBackdropTexture(config)
    this.scene.background = this.backdropTexture

    this.camera = new PerspectiveCamera(config.camera.fov, 1, 0.1, 100)
    this.camera.position.set(...config.camera.position)
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

    const heroConfig = config.objects[0]
    const heroMaterial = new MeshPhysicalMaterial({
      color: '#e4edf2',
      metalness: 1,
      roughness: 0.16,
      envMapIntensity: 1.35,
      clearcoat: 0.22,
      clearcoatRoughness: 0.18,
      emissive: '#8de9ff',
      emissiveIntensity: 0,
    })
    this.hero = new Mesh(
      new TorusGeometry(
        heroConfig.radius,
        heroConfig.tube,
        heroConfig.radialSegments,
        heroConfig.tubularSegments,
      ),
      heroMaterial,
    )
    this.hero.position.set(...heroConfig.position)
    this.hero.rotation.set(...heroConfig.rotation)
    this.scene.add(this.hero)

    const satelliteConfig = config.objects[1]
    const satelliteMaterial = new MeshStandardMaterial({
      color: '#b7f5ff',
      emissive: '#74e6ff',
      emissiveIntensity: 1.45,
      roughness: 0.24,
      metalness: 0.12,
      flatShading: true,
    })
    this.satellite = new Mesh(
      new IcosahedronGeometry(satelliteConfig.radius, satelliteConfig.detail),
      satelliteMaterial,
    )
    this.satelliteLight = new PointLight('#8defff', 1.1, 4.5, 2)
    this.satellite.add(this.satelliteLight)
    this.satellite.layers.enable(BLOOM_LAYER)
    this.scene.add(this.satellite)

    const floorShader = createSoftFloorShader(config)
    this.reflector = new Reflector(
      new PlaneGeometry(config.world.floorSize, config.world.floorSize),
      {
        clipBias: 0.003,
        textureWidth: 512,
        textureHeight: 512,
        color: config.world.floorColor,
        multisample: 0,
        shader: floorShader,
      },
    )
    this.reflector.rotation.x = -Math.PI / 2
    this.reflector.position.y = 0
    this.scene.add(this.reflector)

    const shadowTexture = createContactShadowTexture()
    this.contactShadow = new Mesh(
      new PlaneGeometry(4.3, 3.2),
      new MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    this.contactShadow.rotation.x = -Math.PI / 2
    this.contactShadow.position.set(0, 0.015, 0.2)
    this.scene.add(this.contactShadow)

    const ambient = new AmbientLight('#d7dcf1', 0.58)
    const cyanLight = new DirectionalLight('#d5fbff', 2.4)
    cyanLight.position.set(4, 7, 5)
    const lavenderLight = new DirectionalLight('#dec2ff', 1.65)
    lavenderLight.position.set(-5, 3, -2)
    this.scene.add(ambient, cyanLight, lavenderLight)

    const bloomTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType })
    this.bloomComposer = new EffectComposer(this.renderer, bloomTarget)
    this.bloomComposer.renderToScreen = false
    this.bloomComposer.addPass(new RenderPass(this.scene, this.camera))
    this.bloomPass = new UnrealBloomPass(
      new Vector2(1, 1),
      config.finish.bloomStrength,
      config.finish.bloomRadius,
      config.finish.bloomThreshold,
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
          varying vec2 vUv;
          void main() {
            gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
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

    this.updateStudy(0)
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

    this.camera.aspect = safeWidth / safeHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(safeWidth, safeHeight, false)
    this.bloomComposer.setPixelRatio(pixelRatio)
    this.bloomComposer.setSize(safeWidth, safeHeight)
    this.composer.setPixelRatio(pixelRatio)
    this.composer.setSize(safeWidth, safeHeight)

    const reflectionWidth = Math.max(
      2,
      Math.min(MAX_REFLECTION_DIMENSION, Math.round(safeWidth * pixelRatio * 0.65)),
    )
    const reflectionHeight = Math.max(
      2,
      Math.min(MAX_REFLECTION_DIMENSION, Math.round(safeHeight * pixelRatio * 0.65)),
    )
    this.reflector.getRenderTarget().setSize(reflectionWidth, reflectionHeight)
    const floorMaterial = this.reflector.material as ShaderMaterial
    const texelSize = floorMaterial.uniforms.texelSize?.value as Vector2 | undefined
    texelSize?.set(1 / reflectionWidth, 1 / reflectionHeight)
  }

  setCaptureTarget(target: HTMLCanvasElement | null): void {
    this.captureTarget = target
  }

  resetMotion(): void {
    this.clock = 0
    this.heroAngle = 0
    this.orbitAngle = this.config.objects[1].orbitAngle
    this.previousImpact = 0
    this.flare = 0
    this.smoothedBalance = 0
    this.smoothedWidth = 0
    this.lastTime = 0
    this.audioRevision = this.engine.getAnalysisRevision()
    this.extractor.reset()
    this.impactSpring.reset()
    this.updateStudy(0)
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

    this.hero.geometry.dispose()
    this.hero.material.dispose()
    this.satellite.geometry.dispose()
    this.satellite.material.dispose()
    this.reflector.geometry.dispose()
    const reflectorMaterials = Array.isArray(this.reflector.material)
      ? this.reflector.material
      : [this.reflector.material]
    for (const material of reflectorMaterials) {
      material.dispose()
    }
    this.reflector.dispose()
    this.contactShadow.geometry.dispose()
    this.contactShadow.material.map?.dispose()
    this.contactShadow.material.dispose()
    this.backdropTexture.dispose()
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
    this.updateStudy(deltaSeconds)

    // Render only the emissive satellite into the bloom chain. The chrome and
    // floor stay sharp, while the final pass adds that glow back to the scene.
    const background = this.scene.background
    this.scene.background = null
    this.camera.layers.set(BLOOM_LAYER)
    try {
      this.bloomComposer.render(deltaSeconds)
    } finally {
      this.scene.background = background
      this.camera.layers.set(0)
    }
    this.composer.render(deltaSeconds)
    if (this.captureTarget) {
      drawCaptureFrame(this.renderer.domElement, this.captureTarget, this.config.world.fogColor)
    }
    this.frameId = requestAnimationFrame(this.frame)
  }

  private updateStudy(deltaSeconds: number): void {
    const revision = this.engine.getAnalysisRevision()
    if (revision !== this.audioRevision) {
      this.audioRevision = revision
      this.extractor.reset()
      this.impactSpring.reset()
      this.previousImpact = 0
      this.flare = 0
      this.smoothedBalance = 0
      this.smoothedWidth = 0
    }

    this.clock += deltaSeconds
    this.engine.readStereoTimeDomainData(this.leftSamples, this.rightSamples)
    const features = this.extractor.process(this.leftSamples, this.rightSamples, deltaSeconds)

    if (features.impact > this.previousImpact + 0.05) {
      this.impactSpring.kick(features.impact)
      this.flare = Math.max(this.flare, features.impact)
    }
    this.previousImpact = features.impact
    this.flare *= Math.exp(-deltaSeconds * 6.5)
    const stereoBlend = 1 - Math.exp(-deltaSeconds / 0.1)
    this.smoothedBalance += (features.balance - this.smoothedBalance) * stereoBlend
    this.smoothedWidth += (features.width - this.smoothedWidth) * stereoBlend
    const springValue = this.impactSpring.update(deltaSeconds)

    const heroConfig = this.config.objects[0]
    const response = this.config.audioResponse
    const perceivedLevel = Math.sqrt(features.level)
    const perceivedIntensity = Math.sqrt(features.intensity)
    this.heroAngle += deltaSeconds * (0.14 + perceivedIntensity * response.spinBoost)
    const breathe = getBreathingScale(perceivedLevel, response.breatheAmount)
    const impactScale = getImpactScale(springValue, response.strikeAmount)
    this.hero.scale.set(
      breathe * impactScale.horizontal,
      breathe * impactScale.vertical,
      breathe * impactScale.horizontal,
    )
    this.hero.position.set(
      heroConfig.position[0],
      heroConfig.position[1] + Math.sin(this.clock * 0.68) * 0.09,
      heroConfig.position[2],
    )
    this.hero.rotation.set(
      heroConfig.rotation[0] + Math.sin(this.clock * 0.23) * 0.035,
      heroConfig.rotation[1] + this.heroAngle,
      heroConfig.rotation[2] + Math.sin(this.clock * 0.31) * 0.025,
    )
    this.hero.material.emissiveIntensity = this.flare * response.flareIntensity

    const satelliteConfig = this.config.objects[1]
    this.orbitAngle += deltaSeconds * satelliteConfig.orbitSpeed
    const orbitRadius = getExpandedOrbitRadius(
      satelliteConfig.orbitRadius,
      this.smoothedWidth,
      response.widthOrbitIncrease,
    )
    const stereoOffset = getBalanceOffset(this.smoothedBalance, response.balanceDrift)
    this.satellite.position.set(
      satelliteConfig.orbitCenter[0] + Math.cos(this.orbitAngle) * orbitRadius + stereoOffset,
      satelliteConfig.orbitCenter[1] +
        Math.sin(this.orbitAngle * 1.7 + this.clock * 0.38) * satelliteConfig.floatAmplitude,
      satelliteConfig.orbitCenter[2] + Math.sin(this.orbitAngle) * orbitRadius,
    )
    this.satellite.rotation.set(this.clock * 0.24, this.clock * 0.36, this.clock * 0.12)
    this.satelliteLight.intensity = 1.1 + this.flare * 0.35

    const drift = this.config.camera.drift
    this.camera.position.set(
      this.config.camera.position[0] + Math.sin(this.clock * 0.11) * drift,
      this.config.camera.position[1] + Math.sin(this.clock * 0.09) * drift * 0.55,
      this.config.camera.position[2] + Math.cos(this.clock * 0.08) * drift * 0.8,
    )
    this.camera.lookAt(this.cameraTarget)
  }
}
