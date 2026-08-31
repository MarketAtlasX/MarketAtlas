/**
 * HolographicGlobe — Thin wrapper that delegates to CinematicGlobe.
 *
 * This preserves the exact API surface that WorldCommandCenter expects
 * while the actual rendering is handled by the cinematic globe.gl implementation.
 */
import CinematicGlobe, { type GlobeMode } from './CinematicGlobe'
import type { VisualizationIntent } from './visualizationIntent'

export type { GlobeMode }

interface HolographicGlobeProps {
  mode?: GlobeMode
  intentOverride?: VisualizationIntent
  onSelect?: (entity: string, lat: number, lng: number) => void
  className?: string
}

export default function HolographicGlobe({ mode = 'world', intentOverride, onSelect, className }: HolographicGlobeProps) {
  return <CinematicGlobe mode={mode} intentOverride={intentOverride} onSelect={onSelect} className={className} />
}
