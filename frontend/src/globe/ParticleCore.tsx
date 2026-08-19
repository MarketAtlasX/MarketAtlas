import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { worldStates } from '../data/worldState'
import { resolveCoords } from '../features/globe/globeData'
import type { CoreTransition } from '../features/globe/SceneDirector'

const DEFAULT_COUNT = 26000

function redClusterCenters(): { x: number; y: number; z: number }[] {
  const centers: { x: number; y: number; z: number }[] = []
  for (const ws of worldStates) {
    if (ws.riskScore >= 60) {
      const c = resolveCoords(ws.name)
      if (!c) continue
      const phi = (90 - c.lat) * (Math.PI / 180)
      const theta = (c.lng + 180) * (Math.PI / 180)
      centers.push({
        x: -Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta),
      })
    }
  }
  return centers
}

function buildParticles(count: number): { positions: Float32Array; colors: Float32Array; seeds: Float32Array; sizes: Float32Array } {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const sizes = new Float32Array(count)

  const clusters = redClusterCenters()
  const gold = new THREE.Color('#e8b84b')
  const blue = new THREE.Color('#38a8ff')
  const red = new THREE.Color('#ff3b30')
  const dimGold = new THREE.Color('#b8862b')
  const dimBlue = new THREE.Color('#1e5f8a')
  const c = new THREE.Color()

  const goldenRatio = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const radius = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = goldenRatio * i
    const x = Math.cos(theta) * radius
    const z = Math.sin(theta) * radius

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    const seed = (i / count) * 2.4 + (i % 7) * 0.03
    seeds[i] = seed

    let distToRisk = 1
    for (const cl of clusters) {
      const d = x * cl.x + y * cl.y + z * cl.z
      if (d > distToRisk) distToRisk = d
    }

    const r = Math.random()
    if (distToRisk > 0.72 && r < 0.16) {
      c.copy(red)
    } else if (r < 0.62) {
      c.copy(gold).lerp(dimGold, Math.random() * 0.5)
    } else {
      c.copy(blue).lerp(dimBlue, Math.random() * 0.55)
    }
    c.offsetHSL((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.05)

    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b

    sizes[i] = 0.035 + Math.random() * 0.05
  }

  return { positions, colors, seeds, sizes }
}

const vertexShader = `
  attribute vec3 aPosition;
  attribute vec3 aColor;
  attribute float aSeed;
  attribute float aSize;

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

    float breathe = sin(uTime * (0.7 + aSeed * 1.7) + aSeed * 6.2831) * 0.045 + 1.0;
    float baseR = uRadius * breathe;

    float s1 = fract(sin(aSeed * 39.4) * 43758.5453);
    float s2 = fract(sin(aSeed * 61.2) * 43758.5453);
    float s3 = fract(sin(aSeed * 71.7) * 43758.5453);
    vec3 scatterDir = normalize(vec3(sin(s1 * 6.2831) * cos(s2 * 6.2831), sin(s2 * 6.2831), cos(s1 * 6.2831)));
    float scatterR = uRadius * (1.9 + s3 * 2.3);

    vec3 pos = mix(dir * baseR, scatterDir * scatterR, uDetach);

    float swirl = uTime * 0.1 * (0.25 + aSeed);
    float ca = cos(swirl);
    float sa = sin(swirl);
    pos.xz = mat2(ca, -sa, sa, ca) * pos.xz;

    vec3 focusDir = normalize(uFocus + vec3(0.001, 0.0, 0.0));
    float focusDist = distance(normalize(pos), focusDir);
    float focusFactor = smoothstep(uFocusRadius, 0.0, focusDist);
    float heat = focusFactor * uFocusStrength;
    pos += (focusDir - normalize(pos)) * heat * 0.9;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float size = aSize * (1.0 + heat * 2.2) * (0.75 + breathe * 0.3);
    gl_PointSize = size * (140.0 / max(0.1, -mv.z));

    vColor = aColor;
    vAlpha = mix(0.5, 1.0, heat);
    vHeat = heat;
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = `
  precision highp float;

  uniform vec3 uHeatColor;
  uniform float uTime;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vHeat;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float falloff = smoothstep(0.5, 0.0, d);
    falloff = pow(falloff, 1.6);
    vec3 col = mix(vColor, uHeatColor, clamp(vHeat * 0.9, 0.0, 1.0));
    float twinkle = 0.82 + 0.18 * sin(uTime * 3.0 + d * 40.0);
    gl_FragColor = vec4(col * twinkle, vAlpha * falloff);
  }
`

export interface ParticleCoreProps {
  transition: CoreTransition
  radius?: number
  count?: number
}

export default function ParticleCore({ transition, radius = 2, count = DEFAULT_COUNT }: ParticleCoreProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const groupRef = useRef<THREE.Group>(null)

  const state = useMemo(
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

  const target = useMemo(
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

  const particles = useMemo(() => buildParticles(count), [count])

  const uniforms = useMemo(
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

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    const lerp = Math.min(1, delta * 1.8)

    state.detach += (target.detach - state.detach) * lerp
    state.focusStrength += (target.focusStrength - state.focusStrength) * lerp
    state.focusRadius += (target.focusRadius - state.focusRadius) * lerp
    state.focus.lerp(target.focus, lerp)
    state.heatColor.lerp(target.heatColor, lerp)

    const u = uniforms
    u.uTime.value = t
    u.uDetach.value = state.detach
    u.uFocusStrength.value = state.focusStrength
    u.uFocusRadius.value = state.focusRadius
    u.uHeatColor.value = state.heatColor
    u.uFocus.value.copy(state.focus)

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.03
    }
  })

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute args={[particles.positions, 3]} attach="attributes-position" count={count} />
          <bufferAttribute args={[particles.colors, 3]} attach="attributes-color" count={count} />
          <bufferAttribute args={[particles.seeds, 1]} attach="attributes-aSeed" count={count} />
          <bufferAttribute args={[particles.sizes, 1]} attach="attributes-aSize" count={count} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          args={[{ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }]}
        />
      </points>
    </group>
  )
}