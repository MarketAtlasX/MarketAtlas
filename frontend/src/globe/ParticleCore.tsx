import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { worldStates } from '../data/worldState'
import { resolveCoords } from '../features/globe/globeData'
import type { CoreTransition } from '../features/globe/SceneDirector'

const SURFACE_COUNT = 36000
const ROAM_COUNT = 10000

function riskClusterDirs(): { x: number; y: number; z: number }[] {
  const dirs: { x: number; y: number; z: number }[] = []
  for (const ws of worldStates) {
    if (ws.riskScore >= 58) {
      const c = resolveCoords(ws.name)
      if (!c) continue
      const phi = (90 - c.lat) * (Math.PI / 180)
      const theta = (c.lng + 180) * (Math.PI / 180)
      dirs.push({
        x: -Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta),
      })
    }
  }
  return dirs
}

const PALETTE = {
  gold: new THREE.Color('#ffd54a'),
  amber: new THREE.Color('#ffa040'),
  blue: new THREE.Color('#3a86ff'),
  cyan: new THREE.Color('#38e8ff'),
  red: new THREE.Color('#ff4d5e'),
  depth: new THREE.Color('#143a4d'),
}

const dim = {
  gold: new THREE.Color('#c9993a'),
  amber: new THREE.Color('#c77a22'),
  blue: new THREE.Color('#2454b0'),
  cyan: new THREE.Color('#1a7f99'),
  red: new THREE.Color('#a82435'),
  depth: new THREE.Color('#0a1f2e'),
}

function pickColor(r: number, distToRisk: number, out: THREE.Color) {
  if (distToRisk > 0.78 && r < 0.3) {
    out.copy(PALETTE.red).lerp(dim.red, Math.random() * 0.5)
  } else if (r < 0.42) {
    const g = r < 0.2 ? PALETTE.gold : PALETTE.amber
    const gd = r < 0.2 ? dim.gold : dim.amber
    out.copy(g).lerp(gd, Math.random() * 0.45)
  } else if (r < 0.72) {
    const b = r < 0.58 ? PALETTE.blue : PALETTE.cyan
    const bd = r < 0.58 ? dim.blue : dim.cyan
    out.copy(b).lerp(bd, Math.random() * 0.4)
  } else {
    out.copy(PALETTE.depth).lerp(dim.depth, Math.random() * 0.5)
  }
}

interface SurfaceArrays {
  positions: Float32Array
  colors: Float32Array
  seeds: Float32Array
  sizes: Float32Array
  freqs: Float32Array
  turbs: Float32Array
}

function buildSurfaceParticles(count: number): SurfaceArrays {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const sizes = new Float32Array(count)
  const freqs = new Float32Array(count)
  const turbs = new Float32Array(count)

  const clusters = riskClusterDirs()
  const c = new THREE.Color()
  const goldenRatio = Math.PI * (3 - Math.sqrt(5))
  const inv = 1 / (count - 1)

  for (let i = 0; i < count; i++) {
    const y = 1 - i * inv * 2
    const radius = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = goldenRatio * i
    const x = Math.cos(theta) * radius
    const z = Math.sin(theta) * radius

    const jitter = 1 + (Math.random() - 0.5) * 0.04
    positions[i * 3] = x * jitter
    positions[i * 3 + 1] = y * jitter
    positions[i * 3 + 2] = z * jitter

    const seed = Math.random()
    seeds[i] = seed
    freqs[i] = 0.5 + Math.random() * 1.6
    turbs[i] = Math.random()

    let distToRisk = -1
    for (const cl of clusters) {
      const d = x * cl.x + y * cl.y + z * cl.z
      if (d > distToRisk) distToRisk = d
    }

    pickColor(Math.random(), distToRisk, c)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b

    sizes[i] = 0.035 + Math.random() * 0.045
  }

  return { positions, colors, seeds, sizes, freqs, turbs }
}

interface RoamArrays {
  positions: Float32Array
  colors: Float32Array
  seeds: Float32Array
  sizes: Float32Array
  freqs: Float32Array
}

function buildRoamParticles(count: number): RoamArrays {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const sizes = new Float32Array(count)
  const freqs = new Float32Array(count)

  const c = new THREE.Color()
  for (let i = 0; i < count; i++) {
    const r = 2.25 + Math.random() * 1.6
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)

    const seed = Math.random()
    seeds[i] = seed
    freqs[i] = 0.5 + Math.random() * 1.4
    sizes[i] = 0.09 + Math.random() * 0.16

    const pick = Math.random()
    if (pick < 0.42) c.copy(PALETTE.cyan).lerp(dim.cyan, Math.random() * 0.4)
    else if (pick < 0.72) c.copy(PALETTE.blue).lerp(dim.blue, Math.random() * 0.4)
    else if (pick < 0.88) c.copy(PALETTE.gold).lerp(dim.gold, Math.random() * 0.4)
    else c.copy(PALETTE.red).lerp(dim.red, Math.random() * 0.4)

    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  return { positions, colors, seeds, sizes, freqs }
}

const surfaceVertexShader = `
  attribute vec3 aPosition;
  attribute vec3 aColor;
  attribute float aSeed;
  attribute float aSize;
  attribute float aFreq;
  attribute float aTurb;

  uniform float uTime;
  uniform float uDetach;
  uniform float uFocusStrength;
  uniform vec3 uFocus;
  uniform float uFocusRadius;
  uniform float uRadius;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vHeat;

  void main() {
    vec3 dir = normalize(aPosition);
    float lat = asin(dir.y);
    float lng = atan(dir.z, dir.x);

    float drift = uTime * (0.05 + aFreq * 0.16);
    float wobble = sin(uTime * (0.22 + aFreq * 0.45) + aSeed * 6.2831) * (0.05 + aTurb * 0.13);
    float breathe = 1.0 + sin(uTime * 0.5 + aSeed * 6.2831) * 0.015;

    float la = lat + wobble;
    float lo = lng + drift;
    float r = uRadius * breathe;

    vec3 pos = vec3(
      cos(la) * cos(lo) * r,
      sin(la) * r,
      cos(la) * sin(lo) * r
    );

    float s1 = fract(sin(aSeed * 39.4) * 43758.5453);
    float s2 = fract(sin(aSeed * 61.2) * 43758.5453);
    float s3 = fract(sin(aSeed * 71.7) * 43758.5453);
    vec3 scatterDir = normalize(vec3(sin(s1 * 6.2831) * cos(s2 * 6.2831), sin(s2 * 6.2831), cos(s1 * 6.2831)));
    vec3 scattered = scatterDir * (uRadius * (2.3 + s3 * 3.4));
    pos = mix(pos, scattered, uDetach);

    vec3 focusDir = normalize(uFocus + vec3(0.001, 0.0, 0.0));
    float focusDist = distance(normalize(pos), focusDir);
    float focusFactor = smoothstep(uFocusRadius, 0.0, focusDist);
    float heat = focusFactor * uFocusStrength;
    pos += (focusDir - normalize(pos)) * heat * 1.1;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (1.0 + heat * 1.6) * (260.0 / max(0.1, -mv.z));

    vColor = aColor;
    vAlpha = mix(0.5, 1.0, heat);
    vHeat = heat;
    gl_Position = projectionMatrix * mv;
  }
`

const roamVertexShader = `
  attribute vec3 aPosition;
  attribute vec3 aColor;
  attribute float aSeed;
  attribute float aSize;
  attribute float aFreq;

  uniform float uTime;
  uniform float uDetach;
  uniform float uRadius;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vHeat;

  void main() {
    vec3 dir = normalize(aPosition);
    float homeR = length(aPosition);
    float lat = asin(dir.y);
    float lng = atan(dir.z, dir.x);

    float r = homeR + sin(uTime * (0.22 + aSeed * 0.5) + aSeed * 6.2831) * 0.4;
    float wobble = sin(uTime * (0.14 + aSeed * 0.3) + aSeed * 12.9898) * 0.35;
    float orbit = uTime * (0.03 + aFreq * 0.05);

    float la = lat + wobble;
    float lo = lng + orbit;
    vec3 pos = vec3(
      cos(la) * cos(lo) * r,
      sin(la) * r,
      cos(la) * sin(lo) * r
    );

    float s1 = fract(sin(aSeed * 47.2) * 43758.5453);
    vec3 scatterDir = normalize(vec3(sin(s1 * 6.2831), cos(s1 * 12.5661), sin((s1 + 0.5) * 6.2831)));
    pos = mix(pos, scatterDir * (uRadius * (4.2 + s1 * 4.0)), uDetach);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (220.0 / max(0.1, -mv.z));

    vColor = aColor;
    vAlpha = 0.28 + aSeed * 0.26;
    vHeat = 0.0;
    gl_Position = projectionMatrix * mv;
  }
`

const sharedFragmentShader = `
  precision highp float;

  uniform vec3 uHeatColor;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vHeat;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float falloff = pow(smoothstep(0.5, 0.0, d), 1.8);
    vec3 col = mix(vColor, uHeatColor, clamp(vHeat * 0.9, 0.0, 1.0));
    gl_FragColor = vec4(col, vAlpha * falloff);
  }
`

export interface ParticleCoreProps {
  transition: CoreTransition
  radius?: number
  count?: number
  roamCount?: number
}

interface CoreState {
  detach: number
  focusStrength: number
  focusRadius: number
  focus: THREE.Vector3
  heatColor: THREE.Color
  tint: THREE.Color
}

function SurfaceStream({ arrays, uniforms, count }: { arrays: SurfaceArrays; uniforms: Record<string, THREE.IUniform>; count: number }) {
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute args={[arrays.positions, 3]} attach="attributes-position" count={count} />
        <bufferAttribute args={[arrays.colors, 3]} attach="attributes-color" count={count} />
        <bufferAttribute args={[arrays.seeds, 1]} attach="attributes-aSeed" count={count} />
        <bufferAttribute args={[arrays.sizes, 1]} attach="attributes-aSize" count={count} />
        <bufferAttribute args={[arrays.freqs, 1]} attach="attributes-aFreq" count={count} />
        <bufferAttribute args={[arrays.turbs, 1]} attach="attributes-aTurb" count={count} />
      </bufferGeometry>
      <shaderMaterial
        args={[{ uniforms, vertexShader: surfaceVertexShader, fragmentShader: sharedFragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }]}
      />
    </points>
  )
}

function SpaceRoam({ arrays, uniforms, count }: { arrays: RoamArrays; uniforms: Record<string, THREE.IUniform>; count: number }) {
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute args={[arrays.positions, 3]} attach="attributes-position" count={count} />
        <bufferAttribute args={[arrays.colors, 3]} attach="attributes-color" count={count} />
        <bufferAttribute args={[arrays.seeds, 1]} attach="attributes-aSeed" count={count} />
        <bufferAttribute args={[arrays.sizes, 1]} attach="attributes-aSize" count={count} />
        <bufferAttribute args={[arrays.freqs, 1]} attach="attributes-aFreq" count={count} />
      </bufferGeometry>
      <shaderMaterial
        args={[{ uniforms, vertexShader: roamVertexShader, fragmentShader: sharedFragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }]}
      />
    </points>
  )
}

export default function ParticleCore({ transition, radius = 2, count = SURFACE_COUNT, roamCount = ROAM_COUNT }: ParticleCoreProps) {
  const groupRef = useRef<THREE.Group>(null)

  const state = useMemo<CoreState>(
    () => ({
      detach: 0,
      focusStrength: 0,
      focusRadius: 0.8,
      focus: new THREE.Vector3(),
      heatColor: new THREE.Color('#ffb020'),
      tint: new THREE.Color('#e8b84b'),
    }),
    [],
  )

  const target = useMemo<CoreState>(
    () => ({
      detach: transition.detach,
      focusStrength: transition.focusStrength,
      focusRadius: transition.focusRadius,
      focus: transition.focus ? transition.focus.clone() : new THREE.Vector3(),
      heatColor: new THREE.Color(transition.heatColor),
      tint: new THREE.Color(transition.tint),
    }),
    [transition],
  )

  const surface = useMemo(() => buildSurfaceParticles(count), [count])
  const roam = useMemo(() => buildRoamParticles(roamCount), [roamCount])

  const surfaceUniforms = useMemo<Record<string, THREE.IUniform>>(
    () => ({
      uTime: { value: 0 },
      uDetach: { value: state.detach },
      uFocusStrength: { value: state.focusStrength },
      uFocus: { value: state.focus },
      uFocusRadius: { value: state.focusRadius },
      uRadius: { value: radius },
      uHeatColor: { value: state.heatColor },
    }),
    [state, radius],
  )

  const roamUniforms = useMemo<Record<string, THREE.IUniform>>(
    () => ({
      uTime: { value: 0 },
      uDetach: { value: state.detach },
      uRadius: { value: radius },
      uHeatColor: { value: state.heatColor },
    }),
    [state, radius],
  )

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    const lerp = Math.min(1, delta * 1.8)

    state.detach += (target.detach - state.detach) * lerp
    state.focusStrength += (target.focusStrength - state.focusStrength) * lerp
    state.focusRadius += (target.focusRadius - state.focusRadius) * lerp
    state.focus.lerp(target.focus, lerp)
    state.heatColor.lerp(target.heatColor, lerp)
    state.tint.lerp(target.tint, lerp)

    const sh = surfaceUniforms
    sh.uTime.value = t
    sh.uDetach.value = state.detach
    sh.uFocusStrength.value = state.focusStrength
    sh.uFocusRadius.value = state.focusRadius
    sh.uHeatColor.value = state.heatColor
    sh.uFocus.value.copy(state.focus)

    const rh = roamUniforms
    rh.uTime.value = t
    rh.uDetach.value = state.detach
    rh.uHeatColor.value = state.heatColor

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.03
    }
  })

  return (
    <group ref={groupRef}>
      <SurfaceStream arrays={surface} uniforms={surfaceUniforms} count={count} />
      <SpaceRoam arrays={roam} uniforms={roamUniforms} count={roamCount} />
    </group>
  )
}