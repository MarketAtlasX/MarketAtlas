import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { Line2 } from 'three/examples/jsm/lines/Line2.js'
import type { RouteFlow, RegionFocus } from '../features/globe/SceneDirector'
import { latLngToPlane, buildMapCountryPoints, buildHubMapPoints, buildMapLabels, buildMapFrame } from '../features/globe/globeData'

const MAP_WIDTH = 10
const MAP_DEPTH = 6.5
const MAP_Y = -2.65

interface MapChildProps {
  getOpacity: () => number
}

interface HolographicMapProps {
  visible?: boolean
  routes?: RouteFlow[]
  regions?: RegionFocus[]
}

const surfaceVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const surfaceFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uLine;
  uniform vec3 uBase;
  uniform vec3 uGlow;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;

    float latLines = sin(uv.x * 24.0 * 3.14159);
    float lngLines = sin(uv.y * 16.0 * 3.14159);
    float grid = smoothstep(0.97, 0.999, abs(latLines)) + smoothstep(0.97, 0.999, abs(lngLines));
    float major = smoothstep(0.995, 0.9995, abs(sin(uv.x * 8.0 * 3.14159))) + smoothstep(0.995, 0.9995, abs(sin(uv.y * 5.0 * 3.14159)));
    grid = clamp(grid, 0.0, 1.0);

    float scan = smoothstep(0.0, 0.25, abs(fract(uv.y * 3.0 - uTime * 0.05) - 0.5));
    float bar = smoothstep(0.04, 0.0, abs(fract(uv.x * 2.0 - uTime * 0.09) - 0.5));
    float noise = hash(floor(uv * 120.0) + floor(uTime * 4.0)) * 0.06;

    vec2 c = uv - 0.5;
    float vig = 1.0 - smoothstep(0.28, 0.78, length(c) * 1.5);

    float border = smoothstep(0.5, 0.485, abs(uv.x - 0.5)) * smoothstep(0.5, 0.485, abs(uv.y - 0.5));

    vec3 base = uBase + uGlow * (0.02 + 0.02 * sin(uTime * 0.8));
    vec3 col = mix(base, uLine, grid * 0.5);
    col += uLine * major * 0.6;
    col += uLine * bar * 0.22;
    col += noise;
    col *= (0.55 + 0.45 * vig);

    float alpha = uOpacity * (0.55 + 0.35 * scan) * border;
    gl_FragColor = vec4(col, alpha);
  }
`

function MapSurface({ getOpacity }: MapChildProps) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uLine: { value: new THREE.Color('#38e8ff') },
      uBase: { value: new THREE.Color('#051322') },
      uGlow: { value: new THREE.Color('#0a3d5c') },
    }),
    [],
  )

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime()
    uniforms.uOpacity.value = getOpacity() * 0.85
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <planeGeometry args={[MAP_WIDTH, MAP_DEPTH, 1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={surfaceVertexShader}
        fragmentShader={surfaceFragmentShader}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function MapCountryParticles({ getOpacity }: MapChildProps) {
  const ref = useRef<THREE.Points>(null)
  const data = useMemo(() => buildMapCountryPoints(MAP_WIDTH, MAP_DEPTH), [])

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(data.length * 3)
    const col = new Float32Array(data.length * 3)
    const siz = new Float32Array(data.length)
    for (let i = 0; i < data.length; i++) {
      pos[i * 3] = data[i].x
      pos[i * 3 + 1] = 0.04
      pos[i * 3 + 2] = data[i].z
      const c = new THREE.Color(data[i].color)
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
      siz[i] = data[i].size
    }
    return { positions: pos, colors: col, sizes: siz }
  }, [data])

  const material = useRef<THREE.PointsMaterial>(null)

  useFrame(({ clock }) => {
    const o = getOpacity()
    if (material.current) material.current.opacity = o * 0.85
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.1) * 0.004
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" count={data.length} />
        <bufferAttribute args={[colors, 3]} attach="attributes-color" count={data.length} />
        <bufferAttribute args={[sizes, 1]} attach="attributes-size" count={data.length} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        size={0.09}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

function HubArcs({ getOpacity }: MapChildProps) {
  const hubs = useMemo(() => buildHubMapPoints(MAP_WIDTH, MAP_DEPTH), [])
  const groupRef = useRef<THREE.Group>(null)

  const lines = useMemo(() => {
    const result: { points: THREE.Vector3[]; color: string; opacity: number }[] = []
    for (let i = 0; i < hubs.length; i++) {
      for (const j of [(i + 1) % hubs.length, (i + 3) % hubs.length]) {
        if (j <= i) continue
        const a = hubs[i]
        const b = hubs[j]
        const p0 = new THREE.Vector3(a.x, 0.05, a.z)
        const p1 = new THREE.Vector3(b.x, 0.05, b.z)
        const mid = p0.clone().lerp(p1, 0.5)
        const dist = p0.distanceTo(p1)
        const perp = new THREE.Vector3(-(p1.z - p0.z), 0, p1.x - p0.x).normalize()
        const ctrl = mid.clone().add(perp.multiplyScalar(Math.min(dist * 0.35, 1.4)))
        const pts: THREE.Vector3[] = []
        for (let k = 0; k <= 32; k++) {
          const t = k / 32
          const a1 = p0.clone().lerp(ctrl, t)
          const b1 = ctrl.clone().lerp(p1, t)
          pts.push(a1.lerp(b1, t))
        }
        result.push({ points: pts, color: '#1e6f96', opacity: 0.35 })
      }
    }
    return result
  }, [hubs])

  const refs = useMemo(() => lines.map(() => ({ current: null as Line2 | null })), [lines])

  useFrame(({ clock }) => {
    const o = getOpacity()
    const pulse = 0.28 + 0.12 * Math.sin(clock.getElapsedTime() * 0.6)
    refs.forEach((r, idx) => {
      const line = r.current
      if (line) line.material.opacity = o * pulse * (0.8 + (idx % 3) * 0.2)
    })
  })

  return (
    <group ref={groupRef}>
      {lines.map((l, i) => (
        <Line
          key={i}
          ref={refs[i]}
          points={l.points}
          color={l.color}
          lineWidth={1}
          transparent
          opacity={l.opacity}
          dashed
          dashSize={0.12}
          gapSize={0.08}
        />
      ))}
    </group>
  )
}

function planeArcPoints(a: { x: number; z: number }, b: { x: number; z: number }, segments = 40): THREE.Vector3[] {
  const p0 = new THREE.Vector3(a.x, 0.05, a.z)
  const p1 = new THREE.Vector3(b.x, 0.05, b.z)
  const mid = p0.clone().lerp(p1, 0.5)
  const dist = p0.distanceTo(p1)
  const perp = new THREE.Vector3(-(p1.z - p0.z), 0, p1.x - p0.x).normalize()
  const ctrl = mid.clone().add(perp.multiplyScalar(Math.min(dist * 0.3, 1.2)))
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const a1 = p0.clone().lerp(ctrl, t)
    const b1 = ctrl.clone().lerp(p1, t)
    pts.push(a1.lerp(b1, t))
  }
  return pts
}

function MapRouteArcs({ routes, getOpacity }: { routes: RouteFlow[] } & MapChildProps) {
  const arcs = useMemo(() => {
    return routes
      .map(flow => {
        const a = latLngToPlane(flow.startLat, flow.startLng, MAP_WIDTH, MAP_DEPTH)
        const b = latLngToPlane(flow.endLat, flow.endLng, MAP_WIDTH, MAP_DEPTH)
        return { flow, points: planeArcPoints(a, b) }
      })
      .filter(arc => arc.points.length > 0)
  }, [routes])

  const refs = useMemo(() => arcs.map(() => ({ current: null as Line2 | null })), [arcs])

  useFrame(({ clock }) => {
    const o = getOpacity()
    refs.forEach((r, i) => {
      const line = r.current
      if (!line || !arcs[i]) return
      const heat = arcs[i].flow.intensity ?? 0.5
      line.material.opacity = o * (0.35 + heat * 0.5) * (0.9 + 0.1 * Math.sin(clock.getElapsedTime() * 1.4 + i))
    })
  })

  if (arcs.length === 0) return null

  return (
    <group>
      {arcs.map((arc, i) => {
        const heat = arc.flow.intensity ?? 0.5
        return (
          <Line
            key={i}
            ref={refs[i]}
            points={arc.points}
            color={arc.flow.color}
            lineWidth={Math.max(1, heat * 3)}
            transparent
            opacity={0.4}
          />
        )
      })}
    </group>
  )
}

const STREAM_COUNT = 90

function MapEnergyStreams({ routes, getOpacity }: { routes: RouteFlow[] } & MapChildProps) {
  const streams = useMemo(() => {
    return routes
      .map(flow => {
        const a = latLngToPlane(flow.startLat, flow.startLng, MAP_WIDTH, MAP_DEPTH)
        const b = latLngToPlane(flow.endLat, flow.endLng, MAP_WIDTH, MAP_DEPTH)
        const pts = planeArcPoints(a, b, 80)
        if (pts.length === 0) return null
        const pos = new Float32Array(STREAM_COUNT * 3)
        const col = new Float32Array(STREAM_COUNT * 3)
        const c = new THREE.Color(flow.color)
        for (let i = 0; i < STREAM_COUNT; i++) {
          const t = i / STREAM_COUNT
          const p = pts[Math.min(pts.length - 1, Math.floor(t * (pts.length - 1)))]
          pos[i * 3] = p.x
          pos[i * 3 + 1] = p.y + 0.02
          pos[i * 3 + 2] = p.z
          col[i * 3] = c.r
          col[i * 3 + 1] = c.g
          col[i * 3 + 2] = c.b
        }
        return { flow, pts, pos, col }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
  }, [routes])

  const refs = useMemo(
    () => streams.map(() => ({ points: { current: null as THREE.Points | null }, material: { current: null as THREE.PointsMaterial | null } })),
    [streams],
  )
  const speeds = useMemo(() => streams.map(() => 0.08 + Math.random() * 0.1), [streams])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const o = getOpacity()
    streams.forEach((s, si) => {
      const points = refs[si].points.current
      const mat = refs[si].material.current
      if (!points || !mat) return
      mat.opacity = o * 0.9
      const posAttr = points.geometry.attributes.position as THREE.BufferAttribute
      const arr = posAttr.array as Float32Array
      const speed = speeds[si]
      const heat = s.flow.intensity ?? 0.5
      for (let i = 0; i < STREAM_COUNT; i++) {
        const phase = (i / STREAM_COUNT + t * speed) % 1
        const head = Math.exp(-Math.pow((phase - 0.55) * 6, 2))
        const idx = Math.min(s.pts.length - 1, Math.floor(phase * (s.pts.length - 1)))
        const p = s.pts[idx]
        arr[i * 3] = p.x
        arr[i * 3 + 1] = p.y + 0.03 + head * 0.03
        arr[i * 3 + 2] = p.z
        void heat
      }
      posAttr.needsUpdate = true
    })
  })

  if (streams.length === 0) return null

  return (
    <group>
      {streams.map((s, si) => (
        <points key={si} ref={refs[si].points}>
          <bufferGeometry>
            <bufferAttribute args={[s.pos, 3]} attach="attributes-position" count={STREAM_COUNT} />
            <bufferAttribute args={[s.col, 3]} attach="attributes-color" count={STREAM_COUNT} />
          </bufferGeometry>
          <pointsMaterial
            ref={refs[si].material}
            size={0.06}
            vertexColors
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>
      ))}
    </group>
  )
}

function MapFocusRings({ regions, getOpacity }: { regions: RegionFocus[] } & MapChildProps) {
  const rings = useMemo(
    () =>
      regions.map(r => {
        const p = latLngToPlane(r.lat, r.lng, MAP_WIDTH, MAP_DEPTH)
        return { x: p.x, z: p.z, color: r.color, region: r }
      }),
    [regions],
  )

  const refs = useMemo(
    () =>
      rings.map(() => ({
        mesh: { current: null as THREE.Mesh | null },
        material: { current: null as THREE.MeshBasicMaterial | null },
      })),
    [rings],
  )
  const seeds = useMemo(() => rings.map(() => Math.random() * Math.PI * 2), [rings])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const o = getOpacity()
    rings.forEach((ring, i) => {
      const mesh = refs[i].mesh.current
      const mat = refs[i].material.current
      if (!mesh || !mat) return
      const pulse = 1 + Math.sin(t * 2.2 + seeds[i]) * 0.45
      mesh.scale.setScalar(pulse)
      mat.opacity = o * (0.75 - (pulse - 1) * 0.5)
    })
  })

  if (rings.length === 0) return null

  return (
    <group>
      {rings.map((ring, i) => (
        <mesh
          key={i}
          ref={refs[i].mesh}
          position={[ring.x, 0.06, ring.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.14, 0.2, 48]} />
          <meshBasicMaterial
            ref={refs[i].material}
            color={ring.color}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

function MapLabels({ getOpacity }: MapChildProps) {
  const labels = useMemo(() => buildMapLabels(MAP_WIDTH, MAP_DEPTH), [])
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!groupRef.current) return
    const o = getOpacity()
    groupRef.current.visible = o > 0.05
  })

  return (
    <group ref={groupRef} visible={false}>
      {labels.map((l, i) => (
        <group key={i} position={[l.x, 0.3, l.z]}>
          <Text
            fontSize={l.size}
            color={l.color}
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.9}
            outlineWidth={0}
          >
            {l.text}
          </Text>
        </group>
      ))}
    </group>
  )
}

function MapFrame({ getOpacity }: MapChildProps) {
  const points = useMemo(() => buildMapFrame(MAP_WIDTH, MAP_DEPTH), [])
  const ref = useRef<Line2 | null>(null)

  useFrame(({ clock }) => {
    const o = getOpacity()
    if (ref.current) ref.current.material.opacity = o * (0.5 + 0.1 * Math.sin(clock.getElapsedTime() * 0.8))
  })

  return (
    <Line ref={ref} points={points} color="#38e8ff" lineWidth={1.2} transparent opacity={0} />
  )
}

export default function HolographicMap({ visible = false, routes = [], regions = [] }: HolographicMapProps) {
  const groupRef = useRef<THREE.Group>(null)
  const opacityRef = useRef(0)

  const getOpacity = () => opacityRef.current

  useFrame(({ clock }, delta) => {
    const target = visible ? 1 : 0
    opacityRef.current += (target - opacityRef.current) * Math.min(1, delta * 1.4)

    if (groupRef.current) {
      const o = opacityRef.current
      const eased = 1 - Math.pow(1 - o, 3)
      groupRef.current.position.y = -5 + (MAP_Y + 5) * eased
      groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.06) * 0.012 * o
      groupRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.05) * 0.02 * o
      groupRef.current.visible = o > 0.01
    }
  })

  return (
    <group ref={groupRef} position={[0, -5, 0]}>
      <MapSurface getOpacity={getOpacity} />
      <MapCountryParticles getOpacity={getOpacity} />
      <HubArcs getOpacity={getOpacity} />
      <MapRouteArcs routes={routes} getOpacity={getOpacity} />
      <MapEnergyStreams routes={routes} getOpacity={getOpacity} />
      <MapFocusRings regions={regions} getOpacity={getOpacity} />
      <MapLabels getOpacity={getOpacity} />
      <MapFrame getOpacity={getOpacity} />
    </group>
  )
}