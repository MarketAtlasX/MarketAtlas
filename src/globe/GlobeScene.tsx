import { Suspense, useRef, forwardRef, useImperativeHandle } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import Earth from './Earth'
import Atmosphere from './Atmosphere'
import Hologram from './Hologram'
import Stars from './Stars'
import Grid from './Grid'
import Rings from './Rings'
import Arcs from './Arcs'
import Nodes from './Nodes'
import Labels from './Labels'
import Satellites from './Satellites'
import Heatmap from './Heatmap'
import RiskPropagation from './RiskPropagation'
import HistoricalEvents from './HistoricalEvents'
import EventAnimations from './EventAnimations'
import { useCameraController, type CameraControllerHandle, type CameraTarget } from './CameraController'

export type { CameraTarget }

export interface GlobeSceneHandle {
  flyTo: (target: CameraTarget) => void
  focusCountry: (lat: number, lng: number) => void
  focusEvent: (lat: number, lng: number) => void
  zoom: (level: number) => void
  orbit: (speed: number) => void
  resetView: () => void
}

interface GlobeSceneProps {
  arcsData?: any[]
  nodesData?: any[]
  labelsData?: any[]
  heatmapData?: any[]
  riskPaths?: any[]
  historicalEvents?: any[]
  cameraTarget?: CameraTarget | null
  showHologram?: boolean
  showAtmosphere?: boolean
  showGrid?: boolean
  showRings?: boolean
  showSatellites?: boolean
  showStars?: boolean
}

function SceneInner({ onControllerReady, ...props }: GlobeSceneProps & { onControllerReady: (h: CameraControllerHandle) => void }) {
  const ctrl = useCameraController(onControllerReady)

  return (
    <>
      {props.showStars && <Stars />}

      <directionalLight position={[8, 6, 8]} intensity={2.5} color="#ffffff" />
      <directionalLight position={[-6, -3, -4]} intensity={0.6} color="#4488ff" />
      <ambientLight intensity={0.4} color="#446688" />
      <hemisphereLight args={['#88bbff', '#002244', 0.6]} />

      <Earth />

      {props.showAtmosphere && <Atmosphere />}
      {props.showRings && <Rings />}
      {props.showSatellites && <Satellites />}
      {props.showHologram && <Hologram />}
      {props.showGrid && <Grid />}

      <Arcs data={props.arcsData || []} />
      <Nodes data={props.nodesData || []} />
      <Labels data={props.labelsData || []} />
      <Heatmap data={props.heatmapData || []} />
      <RiskPropagation paths={props.riskPaths || []} />
      <HistoricalEvents events={props.historicalEvents || []} />

      <EventAnimations target={props.cameraTarget || null} />
    </>
  )
}

const GlobeScene = forwardRef<GlobeSceneHandle, GlobeSceneProps>(function GlobeScene(props, ref) {
  const controllerRef = useRef<CameraControllerHandle | null>(null)

  useImperativeHandle(ref, () => ({
    flyTo: (t) => controllerRef.current?.flyTo(t),
    focusCountry: (lat, lng) => controllerRef.current?.focusCountry(lat, lng),
    focusEvent: (lat, lng) => controllerRef.current?.focusEvent(lat, lng),
    zoom: (l) => controllerRef.current?.zoom(l),
    orbit: (s) => controllerRef.current?.orbit(s),
    resetView: () => controllerRef.current?.resetView(),
  }), [])

  return (
    <Canvas
      camera={{ position: [0, 1.5, 5], fov: 45, near: 0.1, far: 1000 }}
      gl={{
        antialias: true,
        alpha: true,
      }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <SceneInner
          {...props}
          onControllerReady={(h) => { controllerRef.current = h }}
        />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        minDistance={2.5}
        maxDistance={12}
        autoRotate={false}
      />
    </Canvas>
  )
})

export default GlobeScene
