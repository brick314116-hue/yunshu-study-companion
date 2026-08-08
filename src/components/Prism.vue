<script setup lang="ts">
import { Mesh, Program, Renderer, Triangle } from 'ogl'
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

type PrismProps = {
  height?: number
  baseWidth?: number
  animationType?: 'rotate' | 'hover' | '3drotate'
  glow?: number
  offset?: { x?: number; y?: number }
  noise?: number
  transparent?: boolean
  scale?: number
  hueShift?: number
  colorFrequency?: number
  hoverStrength?: number
  inertia?: number
  bloom?: number
  suspendWhenOffscreen?: boolean
  timeScale?: number
}

const props = withDefaults(defineProps<PrismProps>(), {
  height: 3.5,
  baseWidth: 5.5,
  animationType: 'rotate',
  glow: 1,
  offset: () => ({ x: 0, y: 0 }),
  noise: 0,
  transparent: true,
  scale: 3.6,
  hueShift: 0,
  colorFrequency: 1,
  hoverStrength: 2,
  inertia: 0.05,
  bloom: 1,
  suspendWhenOffscreen: false,
  timeScale: 0.5,
})

const containerRef = useTemplateRef('containerRef')
let cleanup: (() => void) | null = null

const setup = () => {
  const container = containerRef.value
  if (!container) return

  const height = Math.max(0.001, props.height)
  const baseHalf = Math.max(0.001, props.baseWidth) * 0.5
  const glow = Math.max(0, props.glow)
  const noise = Math.max(0, props.noise)
  const scale = Math.max(0.001, props.scale)
  const timeScale = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : Math.max(0, props.timeScale)
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
  const renderer = new Renderer({ dpr, alpha: props.transparent, antialias: true })
  const gl = renderer.gl

  gl.disable(gl.DEPTH_TEST)
  gl.disable(gl.CULL_FACE)
  gl.disable(gl.BLEND)
  Object.assign(gl.canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    imageRendering: 'auto',
    transform: 'translateZ(0)',
  } as Partial<CSSStyleDeclaration>)
  container.appendChild(gl.canvas)

  const vertex = /* glsl */ `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `

  const fragment = /* glsl */ `
    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;
    uniform float uHeight;
    uniform float uBaseHalf;
    uniform mat3 uRot;
    uniform int uUseBaseWobble;
    uniform float uGlow;
    uniform vec2 uOffsetPx;
    uniform float uNoise;
    uniform float uSaturation;
    uniform float uScale;
    uniform float uHueShift;
    uniform float uColorFreq;
    uniform float uBloom;
    uniform float uCenterShift;
    uniform float uInvBaseHalf;
    uniform float uInvHeight;
    uniform float uMinAxis;
    uniform float uPxScale;
    uniform float uTimeScale;

    vec4 tanh4(vec4 x) {
      vec4 e2x = exp(2.0 * x);
      return (e2x - 1.0) / (e2x + 1.0);
    }

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float sdOctaAnisoInv(vec3 p) {
      vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
      float m = q.x + q.y + q.z - 1.0;
      return m * uMinAxis * 0.5773502691896258;
    }

    float sdPyramidUpInv(vec3 p) {
      return max(sdOctaAnisoInv(p), -p.y);
    }

    mat3 hueRotation(float a) {
      float c = cos(a), s = sin(a);
      mat3 w = mat3(0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114);
      mat3 u = mat3(0.701, -0.587, -0.114, -0.299, 0.413, -0.114, -0.300, -0.588, 0.886);
      mat3 v = mat3(0.168, -0.331, 0.500, 0.328, 0.035, -0.500, -0.497, 0.296, 0.201);
      return w + u * c + v * s;
    }

    void main() {
      vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;
      float z = 5.0;
      float d = 0.0;
      vec3 p;
      vec4 o = vec4(0.0);
      mat2 wob = mat2(1.0);

      if (uUseBaseWobble == 1) {
        float t = iTime * uTimeScale;
        float c0 = cos(t);
        wob = mat2(c0, cos(t + 33.0), cos(t + 11.0), c0);
      }

      for (int i = 0; i < 100; i++) {
        p = vec3(f, z);
        p.xz = p.xz * wob;
        p = uRot * p;
        vec3 q = p;
        q.y += uCenterShift;
        d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
        z -= d;
        o += (sin((p.y + z) * uColorFreq + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
      }

      o = tanh4(o * o * (uGlow * uBloom) / 1e5);
      vec3 col = o.rgb;
      col += (rand(gl_FragCoord.xy + vec2(iTime)) - 0.5) * uNoise;
      col = clamp(col, 0.0, 1.0);
      float lightness = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = clamp(mix(vec3(lightness), col, uSaturation), 0.0, 1.0);
      if (abs(uHueShift) > 0.0001) col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
      gl_FragColor = vec4(col, o.a);
    }
  `

  const geometry = new Triangle(gl)
  const resolution = new Float32Array(2)
  const offset = new Float32Array(2)
  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      iResolution: { value: resolution },
      iTime: { value: 0 },
      uHeight: { value: height },
      uBaseHalf: { value: baseHalf },
      uUseBaseWobble: { value: 1 },
      uRot: { value: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]) },
      uGlow: { value: glow },
      uOffsetPx: { value: offset },
      uNoise: { value: noise },
      uSaturation: { value: props.transparent ? 1.5 : 1 },
      uScale: { value: scale },
      uHueShift: { value: props.hueShift },
      uColorFreq: { value: Math.max(0, props.colorFrequency) },
      uBloom: { value: Math.max(0, props.bloom) },
      uCenterShift: { value: height * 0.25 },
      uInvBaseHalf: { value: 1 / baseHalf },
      uInvHeight: { value: 1 / height },
      uMinAxis: { value: Math.min(baseHalf, height) },
      uPxScale: { value: 1 / ((gl.drawingBufferHeight || 1) * 0.1 * scale) },
      uTimeScale: { value: timeScale },
    },
  })
  const mesh = new Mesh(gl, { geometry, program })

  const resize = () => {
    const width = container.clientWidth || 1
    const viewHeight = container.clientHeight || 1
    renderer.setSize(width, viewHeight)
    resolution[0] = gl.drawingBufferWidth
    resolution[1] = gl.drawingBufferHeight
    offset[0] = (props.offset?.x ?? 0) * dpr
    offset[1] = (props.offset?.y ?? 0) * dpr
    program.uniforms.uPxScale.value = 1 / ((gl.drawingBufferHeight || 1) * 0.1 * scale)
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  resize()

  const rotation = new Float32Array(9)
  const setRotation = (yaw: number, pitch: number, roll: number) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw)
    const cx = Math.cos(pitch), sx = Math.sin(pitch)
    const cz = Math.cos(roll), sz = Math.sin(roll)
    rotation.set([
      cy * cz + sy * sx * sz, cx * sz, -sy * cz + cy * sx * sz,
      -cy * sz + sy * sx * cz, cx * cz, sy * sz + cy * sx * cz,
      sy * cx, -sx, cy * cx,
    ])
    return rotation
  }

  let frame = 0
  const startedAt = performance.now()
  let yaw = 0
  let pitch = 0
  let targetYaw = 0
  let targetPitch = 0
  let visible = true
  const frequencies = [0.3 + Math.random() * 0.6, 0.2 + Math.random() * 0.7, 0.1 + Math.random() * 0.5]
  const phases = [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2]

  const onPointerMove = (event: PointerEvent) => {
    targetYaw = -((event.clientX / Math.max(1, window.innerWidth)) * 2 - 1) * 0.6 * props.hoverStrength
    targetPitch = ((event.clientY / Math.max(1, window.innerHeight)) * 2 - 1) * 0.6 * props.hoverStrength
  }
  if (props.animationType === 'hover') window.addEventListener('pointermove', onPointerMove, { passive: true })
  if (props.animationType !== 'rotate') program.uniforms.uUseBaseWobble.value = 0

  const render = (time: number) => {
    if (!visible) return
    const elapsed = (time - startedAt) * 0.001
    program.uniforms.iTime.value = elapsed

    if (props.animationType === 'hover') {
      yaw += (targetYaw - yaw) * props.inertia
      pitch += (targetPitch - pitch) * props.inertia
      program.uniforms.uRot.value = setRotation(yaw, pitch, 0)
    } else if (props.animationType === '3drotate') {
      const scaled = elapsed * timeScale
      program.uniforms.uRot.value = setRotation(
        scaled * frequencies[1],
        Math.sin(scaled * frequencies[0] + phases[0]) * 0.6,
        Math.sin(scaled * frequencies[2] + phases[1]) * 0.5,
      )
    }

    renderer.render({ scene: mesh })
    if (timeScale > 0 || props.animationType === 'hover') frame = requestAnimationFrame(render)
  }

  const start = () => {
    if (!frame) frame = requestAnimationFrame(render)
  }
  const stop = () => {
    cancelAnimationFrame(frame)
    frame = 0
  }

  const intersectionObserver = props.suspendWhenOffscreen
    ? new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? false
        if (visible) start()
        else stop()
      })
    : null
  intersectionObserver?.observe(container)
  start()

  cleanup = () => {
    stop()
    resizeObserver.disconnect()
    intersectionObserver?.disconnect()
    window.removeEventListener('pointermove', onPointerMove)
    if (gl.canvas.parentElement === container) container.removeChild(gl.canvas)
  }
}

onMounted(setup)
onBeforeUnmount(() => cleanup?.())
watch(props, () => {
  cleanup?.()
  setup()
}, { deep: true })
</script>

<template>
  <div ref="containerRef" class="prism-canvas" />
</template>
