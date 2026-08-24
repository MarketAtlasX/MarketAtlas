import { useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'globe.gl'
import { createIntent, type VisualizationIntent } from './WorldCore'
import { INTENT_CAPTION } from './visualizationIntent'
import { useWorldStore } from '../../stores/WorldStore'
import { visualizationBus } from '../../assistant/commands/visualizationBus'
import { buildLabelData, buildNodes } from './globeData'
import { resolveScene } from './SceneDirector'

export type GlobeMode = 'world' | 'risk' | 'supply' | 'events' | 'map'

interface HolographicGlobeProps {
  mode?: GlobeMode
  onSelect?: (entity: string, lat: number, lng: number) => void
  className?: string
}

function modeToIntent(mode: GlobeMode, selectedEntity: string | null): VisualizationIntent {
  switch (mode) {
    case 'risk':
      return createIntent({ mode: 'risk', scale: 'regional', camera: 'zoom_in', palette: 'risk', transition: 'disintegrate' })
    case 'supply':
      return createIntent({ mode: 'supply', scale: 'global', camera: 'pullback', palette: 'map', transition: 'particle_reform' })
    case 'map':
      return createIntent({ mode: 'map', scale: 'global', camera: 'pullback', palette: 'map', transition: 'particle_reform' })
    case 'events':
      return createIntent({ mode: 'globe', scale: 'global', camera: 'pullback', transition: 'particle_reform' })
    case 'world':
    default:
      return createIntent({
        mode: selectedEntity ? 'country' : 'globe',
        scale: selectedEntity ? 'country' : 'global',
        focus: selectedEntity ? [selectedEntity] : [],
        origin: selectedEntity,
        camera: selectedEntity ? 'zoom_in' : 'pullback',
      })
  }
}

export default function HolographicGlobe({ mode = 'world', onSelect, className = '' }: HolographicGlobeProps) {
  const { state } = useWorldStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)
  const onSelectRef = useRef(onSelect)
  const [focusIntent, setFocusIntent] = useState<VisualizationIntent | null>(null)

  onSelectRef.current = onSelect

  useEffect(() => visualizationBus.subscribe(setFocusIntent), [])

  const intent = useMemo(() => {
    if (focusIntent) return focusIntent
    return modeToIntent(mode, state.selectedEntity)
  }, [focusIntent, mode, state.selectedEntity])

  const handleSelect = (entity: string, lat: number, lng: number) => {
    setFocusIntent(
      createIntent({
        mode: 'country',
        scale: 'country',
        focus: [entity],
        origin: entity,
        camera: 'zoom_in',
        caption: `Focus: ${entity}`,
      }),
    )
    onSelect?.(entity, lat, lng)
  }

  const caption = intent.caption ?? INTENT_CAPTION[intent.mode] ?? 'GLOBAL PARTICLE CORE'
  const scene = useMemo(() => resolveScene(intent), [intent])
  const labels = useMemo(() => buildLabelData(), [])
  const nodes = useMemo(() => buildNodes('world'), [])

  useEffect(() => {
    if (!containerRef.current || globeRef.current) return

    const globe = new Globe(containerRef.current)
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl('/globe/earth-day.jpg')
      .bumpImageUrl('/globe/earth-topology.png')
      .showAtmosphere(true)
      .atmosphereColor('#6bb8ae')
      .atmosphereAltitude(0.12)
      .arcsData([])
      .arcStartLat((d: any) => d.startLat)
      .arcStartLng((d: any) => d.startLng)
      .arcEndLat((d: any) => d.endLat)
      .arcEndLng((d: any) => d.endLng)
      .arcColor((d: any) => d.color)
      .arcAltitudeAutoScale(0.32)
      .arcStroke((d: any) => Math.max(0.18, (d.intensity ?? 0.5) * 0.42))
      .arcDashLength(0.18)
      .arcDashGap(0.18)
      .arcDashAnimateTime(6500)
      .pointsData([])
      .pointLat((d: any) => d.lat)
      .pointLng((d: any) => d.lng)
      .pointColor((d: any) => d.color)
      .pointRadius((d: any) => Math.min(0.12, d.radius ?? 0.055))
      .pointAltitude(0.012)
      .labelsData([])
      .labelLat((d: any) => d.lat)
      .labelLng((d: any) => d.lng)
      .labelText((d: any) => d.text)
      .labelColor((d: any) => d.color)
      .labelSize((d: any) => d.size ?? 0.14)
      .labelResolution(2)
      .labelDotRadius(0.028)
      .labelIncludeDot(true)
      .labelAltitude((d: any) => d.altitude ?? 0.035)
      .htmlElementsData([])
      .htmlLat((d: any) => d.lat)
      .htmlLng((d: any) => d.lng)
      .htmlAltitude(0.045)
      .htmlElement((d: any) => {
        const element = document.createElement('div')
        element.textContent = d.text
        element.style.color = d.color
        element.style.fontFamily = 'SFMono-Regular, Roboto Mono, monospace'
        element.style.fontSize = '10px'
        element.style.fontWeight = '600'
        element.style.letterSpacing = '0.08em'
        element.style.textTransform = 'uppercase'
        element.style.textShadow = '0 1px 3px #050708, 0 0 6px #050708'
        element.style.whiteSpace = 'nowrap'
        element.style.pointerEvents = 'none'
        return element
      })
      .onPointClick((d: any) => {
        const entity = d.entity || d.label
        if (entity) onSelectRef.current?.(entity, d.lat, d.lng)
      })

    globe.controls().enablePan = false
    globe.controls().minDistance = 220
    globe.controls().maxDistance = 520
    globe.controls().autoRotate = true
    globe.controls().autoRotateSpeed = 0.22
    globeRef.current = globe

    const resize = () => {
      if (!containerRef.current || !globeRef.current) return
      globe.width(containerRef.current.clientWidth).height(containerRef.current.clientHeight)
    }
    window.addEventListener('resize', resize)
    resize()
    return () => {
      window.removeEventListener('resize', resize)
      globe.controls().dispose()
      containerRef.current?.replaceChildren()
      globeRef.current = null
    }
  }, [])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    globe
      .arcsData(scene.routes)
      .pointsData(scene.showOverlays ? nodes : [])
      .labelsData(scene.showOverlays ? labels : [])
      .htmlElementsData(scene.showOverlays ? labels : [])
    globe.controls().autoRotate = scene.autoRotate
    globe.controls().autoRotateSpeed = scene.autoRotate ? 0.22 : 0

    const focus = intent.focus?.[0] || intent.origin
    if (focus) {
      const node = nodes.find((item: any) => item.label?.toLowerCase() === focus.toLowerCase())
      const label = labels.find(item => item.text.toLowerCase() === focus.toLowerCase())
      const target = node || label
      if (target) globe.pointOfView({ lat: target.lat, lng: target.lng, altitude: 1.55 }, 900)
    } else {
      globe.pointOfView({ lat: 18, lng: 10, altitude: 2.15 }, 700)
    }
  }, [intent, labels, nodes, scene])

  return (
    <div className={`globe-container relative w-full h-full ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute bottom-14 left-4 z-10 pointer-events-none select-none font-mono">
        <div key={caption} className="stream-in text-[11px] tracking-[0.3em] text-[var(--accent)] drop-shadow">
          {caption}
        </div>
        <div className="mt-1 text-[9px] tracking-widest text-[rgba(95,125,153,0.9)]">
          {mode.toUpperCase()} :: {intent.scale.toUpperCase()}
        </div>
      </div>
    </div>
  )
}