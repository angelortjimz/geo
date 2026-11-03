import { CanvasTexture, Color, Matrix4, SRGBColorSpace, Texture, Vector2 } from 'three'
import type {
  BackdropConfig,
  CheckerFloorConfig,
  GradientBackdropConfig,
  ReflectiveFloorConfig,
} from '../scene/sceneConfig'

export interface SoftFloorShader {
  name: string
  uniforms: {
    color: { value: Color }
    horizonColor: { value: Color }
    tDiffuse: { value: Texture | null }
    textureMatrix: { value: Matrix4 | null }
    texelSize: { value: Vector2 }
    fadeStart: { value: number }
    fadeEnd: { value: number }
  }
  vertexShader: string
  fragmentShader: string
}

export interface CheckerFloorShader {
  name: string
  uniforms: {
    lightColor: { value: Color }
    darkColor: { value: Color }
    horizonColor: { value: Color }
    fadeStart: { value: number }
    fadeEnd: { value: number }
  }
  vertexShader: string
  fragmentShader: string
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/** The visible background color the floor must fade into at its horizon. */
export function getBackdropHorizonColor(backdrop: BackdropConfig): string {
  return backdrop.type === 'solid' ? backdrop.color : backdrop.horizon
}

export function createBackdropTexture(backdrop: GradientBackdropConfig): CanvasTexture {
  const canvas = createCanvas(32, 512)
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('A 2D canvas is required to create the scene backdrop.')
  }

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, backdrop.top)
  gradient.addColorStop(0.58, backdrop.horizon)
  gradient.addColorStop(1, backdrop.bottom)
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** Broad colored reflection cards, deliberately independent of the visible world. */
export function createEnvironmentTexture(): CanvasTexture {
  const canvas = createCanvas(1024, 512)
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('A 2D canvas is required to create the reflection environment.')
  }

  const atmosphere = context.createLinearGradient(0, 0, 0, canvas.height)
  atmosphere.addColorStop(0, '#b8d8e4')
  atmosphere.addColorStop(0.38, '#718392')
  atmosphere.addColorStop(0.55, '#293542')
  atmosphere.addColorStop(1, '#a99cbd')
  context.fillStyle = atmosphere
  context.fillRect(0, 0, canvas.width, canvas.height)

  const coolCard = context.createLinearGradient(80, 0, 360, 0)
  coolCard.addColorStop(0, 'rgb(205 246 255 / 0%)')
  coolCard.addColorStop(0.45, '#e2fbff')
  coolCard.addColorStop(1, 'rgb(205 246 255 / 0%)')
  context.fillStyle = coolCard
  context.fillRect(70, 52, 310, 270)

  const lavenderCard = context.createLinearGradient(620, 0, 900, 0)
  lavenderCard.addColorStop(0, 'rgb(224 196 255 / 0%)')
  lavenderCard.addColorStop(0.5, '#ead9ff')
  lavenderCard.addColorStop(1, 'rgb(224 196 255 / 0%)')
  context.fillStyle = lavenderCard
  context.fillRect(610, 82, 300, 230)

  context.fillStyle = '#f4f0e8'
  context.fillRect(425, 24, 108, 150)
  context.fillStyle = '#172530'
  context.fillRect(440, 350, 210, 90)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function createContactShadowTexture(): CanvasTexture {
  const canvas = createCanvas(128, 128)
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('A 2D canvas is required to create the contact shadow.')
  }

  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62)
  gradient.addColorStop(0, 'rgb(35 43 65 / 34%)')
  gradient.addColorStop(0.35, 'rgb(45 50 75 / 18%)')
  gradient.addColorStop(1, 'rgb(55 60 85 / 0%)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function createSoftFloorShader(
  floor: ReflectiveFloorConfig,
  horizonColor: string,
): SoftFloorShader {
  return {
    name: 'GeoSoftFloorShader',
    uniforms: {
      color: { value: new Color(floor.color) },
      horizonColor: { value: new Color(horizonColor) },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      texelSize: { value: new Vector2(1 / 512, 1 / 512) },
      fadeStart: { value: floor.fadeStart },
      fadeEnd: { value: floor.fadeEnd },
    },
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix;
      varying vec4 vUv;
      varying vec3 vWorldPosition;

      #include <common>
      #include <logdepthbuf_pars_vertex>

      void main() {
        vUv = textureMatrix * vec4(position, 1.0);
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform vec3 horizonColor;
      uniform sampler2D tDiffuse;
      uniform vec2 texelSize;
      uniform float fadeStart;
      uniform float fadeEnd;
      varying vec4 vUv;
      varying vec3 vWorldPosition;

      #include <logdepthbuf_pars_fragment>

      void main() {
        #include <logdepthbuf_fragment>
        vec2 uv = vUv.xy / vUv.w;
        vec3 reflected = texture2D(tDiffuse, uv).rgb * 0.5;
        reflected += texture2D(tDiffuse, uv + vec2(texelSize.x * 2.5, 0.0)).rgb * 0.125;
        reflected += texture2D(tDiffuse, uv - vec2(texelSize.x * 2.5, 0.0)).rgb * 0.125;
        reflected += texture2D(tDiffuse, uv + vec2(0.0, texelSize.y * 2.5)).rgb * 0.125;
        reflected += texture2D(tDiffuse, uv - vec2(0.0, texelSize.y * 2.5)).rgb * 0.125;

        vec3 floorImage = mix(reflected, color, 0.66);
        float distanceFade = smoothstep(fadeStart, fadeEnd, length(vWorldPosition.xz));
        gl_FragColor = vec4(mix(floorImage, horizonColor, distanceFade), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }
}

export function createCheckerFloorShader(
  floor: CheckerFloorConfig,
  horizonColor: string,
): CheckerFloorShader {
  return {
    name: 'GeoCheckerFloorShader',
    uniforms: {
      lightColor: { value: new Color(floor.lightColor) },
      darkColor: { value: new Color(floor.darkColor) },
      horizonColor: { value: new Color(horizonColor) },
      fadeStart: { value: floor.fadeStart },
      fadeEnd: { value: floor.fadeEnd },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;

      #include <common>
      #include <logdepthbuf_pars_vertex>

      void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 lightColor;
      uniform vec3 darkColor;
      uniform vec3 horizonColor;
      uniform float fadeStart;
      uniform float fadeEnd;
      varying vec3 vWorldPosition;

      #include <logdepthbuf_pars_fragment>

      void main() {
        #include <logdepthbuf_fragment>
        vec2 cell = floor(vWorldPosition.xz);
        float checker = mod(cell.x + cell.y, 2.0);
        vec3 surface = mix(darkColor, lightColor, checker);
        float distanceFade = smoothstep(fadeStart, fadeEnd, length(vWorldPosition.xz));
        gl_FragColor = vec4(mix(surface, horizonColor, distanceFade), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }
}
