import { useEffect, useMemo, useState } from 'react'
import { Stars } from '../../globe'
import ParticleCore from '../../globe/ParticleCore'
import EnergyPaths from '../../globe/EnergyPaths'
import FocusRings from '../../globe/FocusRings'
import HolographicMap from '../../globe/HolographicMap'
import RegionClusters from '../../globe/RegionClusters'
import Atmosphere from '../../globe/Atmosphere'
import Rings from '../../globe/Rings'
import Satellites from '../../globe/Satellites'
import Grid from '../../globe/Grid'
import Nodes from '../../globe/Nodes'
import Labels from '../../globe/Labels'
import Heatmap from '../../globe/Heatmap'
import RiskPropagation from '../../globe/RiskPropagation'
import Arcs from '../../globe/Arcs'
import CameraDirector from './CameraDirector'
import { resolveScene } from './SceneDirector'
import { DEFAULT_INTENT, type VisualizationIntent } from './visualizationIntent'
import { visualizationBus } from '../../assistant/commands/visualizationBus'
import { useWorldStore } from '../../stores/WorldStore'
import { buildNodes, buildHeatmap, buildArcs, buildLabelData, buildEventNodes, buildRiskPaths, resolveCoords } from './globeData'

export interface WorldCoreProps {
  intent?: VisualizationIntent
  eventMode?: boolean
  onNodeClick?: (entity: string, lat: number, lng: number) => void
}

export default function WorldCore({ intent: intentProp, eventMode = false, onNodeClick }: WorldCoreProps) {
  const { state } = useWorldStore()
  const [intent, setIntent] = useState<VisualizationIntent>(intentProp ?? DEFAULT_INTENT)
  const [runId, setRunId] = useState(0)

  useEffect(() => {
    const unsub = visualizationBus.subscribe(next => {
      setIntent(next)
      setRunId(n => n + 1)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (intentProp) {
      setIntent(intentProp)
      setRunId(n => n + 1)
    }
  }, [intentProp])

  const scene = useMemo(() => resolveScene(intent), [intent])

  const nodes = useMemo(() => (eventMode ? buildEventNodes(state.events.slice(0, 12)) : buildNodes('world')), [eventMode, state.events])
  const heatmap = useMemo(() => buildHeatmap(), [])
  const arcs = useMemo(() => buildArcs(state.graphLinks), [state.graphLinks])
  const labels = useMemo(() => buildLabelData(), [])

  const showHeatmap = intent.mode === 'risk' || intent.mode === 'conflict'
  const showGraphLinks = intent.mode === 'network' || intent.mode === 'route'
  const riskPaths = useMemo(() => buildRiskPaths(state.graphLinks), [state.graphLinks])
  const isMap = scene.map

  return (
    <>
      <Stars />
      <directionalLight position={[8, 6, 8]} intensity={3.0} color="#ffffff" />
      <directionalLight position={[-6, -3, -4]} intensity={0.5} color="#4488ff" />
      <ambientLight intensity={0.3} color="#445566" />

      {!isMap && (
        <>
          <ParticleCore transition={scene.transition} radius={2} />
          <Atmosphere />
          <Grid />
          <Rings />
          <Satellites />
        </>
      )}

      {isMap && <HolographicMap visible routes={scene.routes} regions={scene.regions} />}

      {!isMap && scene.routes.length > 0 && <EnergyPaths flows={scene.routes} />}
      {!isMap && scene.regions.length > 0 && <FocusRings regions={scene.regions} />}
      {!isMap && scene.conflicts.length > 0 && <RegionClusters regions={scene.conflicts} />}

      {!isMap && showHeatmap && <Heatmap data={heatmap} />}
      {!isMap && showHeatmap && riskPaths.length > 0 && <RiskPropagation paths={riskPaths} />}
      {!isMap && showGraphLinks && arcs.length > 0 && <Arcs data={arcs} />}
      {!isMap && scene.showOverlays && (
        <Nodes
          data={nodes}
          onNodeClick={d => {
            if (!onNodeClick) return
            const entity = (d as any).entity || (d as any).label || ''
            const coords = resolveCoords(entity)
            onNodeClick(entity, coords?.lat ?? (d as any).lat, coords?.lng ?? (d as any).lng)
          }}
        />
      )}
      {!isMap && scene.showOverlays && intent.mode !== 'abstract' && intent.mode !== 'core' && <Labels data={labels} />}

      <CameraDirector scene={scene} runId={runId} />
    </>
  )
}

export { resolveScene } from './SceneDirector'
export type { SceneConfig, CoreTransition, RouteFlow, RegionFocus } from './SceneDirector'
export { DEFAULT_INTENT, createIntent } from './visualizationIntent'
export type { VisualizationIntent } from './visualizationIntent'
export { latLngToDir } from './SceneDirector'