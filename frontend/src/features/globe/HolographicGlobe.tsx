import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import gsap from 'gsap'
import { Earth, Atmosphere, Hologram, Stars, Grid, Rings, Arcs, Nodes, Labels, Satellites, Heatmap, RiskPropagation } from '../../globe'
import { useWorldStore } from '../../stores/WorldStore'
import { globeFocusBus } from '../../assistant/commands/globeFocusBus'
import { buildNodes, buildHeatmap, buildArcs, buildRiskPaths, buildEventNodes, buildLabelData, resolveCoords } from './globeData'

export type GlobeMode = 'world' | 'risk' | 'supply' | 'events'

interface HolographicGlobeProps {
  mode?: GlobeMode
  onSelect?: (entity: string, lat: number, lng: number) => void
  className?: string
}

function flyCamera(camera: THREE.Camera, lat: number, lng: number, radius = 4.4, duration = 1.4) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  gsap.to(camera.position, {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
    duration,
    ease: 'power2.inOut',
    onUpdate: () => camera.lookAt(0, 0, 0),
  })
}

function CameraRig({ focus }: { focus: { lat: number; lng: number; n: number } | null }) {
  const { camera } = useThree()

  useEffect(() => {
    if (!focus) return
    flyCamera(camera, focus.lat, focus.lng)
  }, [focus, camera])

  return null
}

function GlobeCommandRig() {
  const { camera } = useThree()

  useEffect(
    () =>
      globeFocusBus.subscribe(target => {
        if (!target) {
          gsap.to(camera.position, {
            x: 0,
            y: 1.5,
            z: 5,
            duration: 1.4,
            ease: 'power2.inOut',
            onUpdate: () => camera.lookAt(0, 0, 0),
          })
          return
        }
        const coords = resolveCoords(target.entity)
        flyCamera(camera, target.lat ?? coords?.lat ?? 20, target.lng ?? coords?.lng ?? 80)
      }),
    [camera],
  )

  return null
}

function Scene({ mode, focus, onNodeClick }: { mode: GlobeMode; focus: { lat: number; lng: number; n: number } | null; onNodeClick: (entity: string, lat: number, lng: number) => void }) {
  const { state } = useWorldStore()

  const nodes = useMemo(() => buildNodes(mode), [mode])
  const heatmap = useMemo(() => buildHeatmap(), [])
  const arcs = useMemo(() => buildArcs(state.graphLinks), [state.graphLinks])
  const riskPaths = useMemo(() => buildRiskPaths(state.graphLinks), [state.graphLinks])
  const eventNodes = useMemo(() => buildEventNodes(state.events.slice(0, 12)), [state.events])
  const labels = useMemo(() => buildLabelData(), [])

  const shownNodes = mode === 'events' ? eventNodes : nodes
  const showRisk = mode === 'risk' || mode === 'supply'
  const showArcs = mode === 'supply' || mode === 'risk' || mode === 'world'

  return (
    <>
      <Stars />
      <directionalLight position={[8, 6, 8]} intensity={3.0} color="#ffffff" />
      <directionalLight position={[-6, -3, -4]} intensity={0.5} color="#4488ff" />
      <ambientLight intensity={0.35} color="#446688" />
      <hemisphereLight args={['#88bbff', '#002244', 0.5]} />

      <Earth />
      <Atmosphere />
      <Rings />
      <Satellites />
      <Hologram />
      <Grid />
      <Heatmap data={heatmap} visible={mode !== 'events'} />
      {showRisk && <RiskPropagation paths={riskPaths} />}
      {showArcs && <Arcs data={arcs} />}
      <Nodes
        data={shownNodes}
        visible
        onNodeClick={d => {
          const entity = (d as any).entity || d.label || ''
          const coords = resolveCoords(entity)
          onNodeClick(entity, coords?.lat ?? d.lat, coords?.lng ?? d.lng)
        }}
      />
      <Labels data={labels} visible={mode !== 'events'} />
      <CameraRig focus={focus} />
      <GlobeCommandRig />
    </>
  )
}

export default function HolographicGlobe({ mode = 'world', onSelect, className = '' }: HolographicGlobeProps) {
  const [focus, setFocus] = useState<{ lat: number; lng: number; n: number } | null>(null)
  const nRef = useRef(0)

  const handleSelect = (entity: string, lat: number, lng: number) => {
    nRef.current += 1
    setFocus({ lat, lng, n: nRef.current })
    onSelect?.(entity, lat, lng)
  }

  return (
    <div className={`globe-container relative w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 1.5, 5], fov: 45, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <Scene mode={mode} focus={focus} onNodeClick={handleSelect} />
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={2.5}
          maxDistance={12}
          autoRotate
          autoRotateSpeed={0.35}
        />
        <EffectComposer>
          <Bloom intensity={0.35} luminanceThreshold={0.6} luminanceSmoothing={0.9} mipmapBlur radius={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
