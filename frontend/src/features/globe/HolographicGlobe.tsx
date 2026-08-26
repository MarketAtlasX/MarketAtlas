/**
 * HolographicGlobe — Thin wrapper that delegates to CinematicGlobe.
 *
 * This preserves the exact API surface that WorldCommandCenter expects
 * while the actual rendering is handled by the cinematic globe.gl implementation.
 */
import CinematicGlobe, { type GlobeMode } from './CinematicGlobe'

export type { GlobeMode }

interface HolographicGlobeProps {
  mode?: GlobeMode
  onSelect?: (entity: string, lat: number, lng: number) => void
  className?: string
}

export default function HolographicGlobe({ mode = 'world', onSelect, className }: HolographicGlobeProps) {
  return <CinematicGlobe mode={mode} onSelect={onSelect} className={className} />
}