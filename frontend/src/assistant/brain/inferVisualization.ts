import { createIntent, type VisualizationIntent } from '../../features/globe/visualizationIntent'
import { resolveCoords } from '../../features/globe/globeData'

const ALIASES: Record<string, string> = {
  usa: 'United States',
  america: 'United States',
  uk: 'United Kingdom',
  britain: 'United Kingdom',
  'saudi arabia': 'Saudi Arabia',
  saudi: 'Saudi Arabia',
  'south korea': 'South Korea',
  'north korea': 'North Korea',
  russia: 'Russia',
  china: 'China',
  india: 'India',
  japan: 'Japan',
  germany: 'Germany',
  france: 'France',
  iran: 'Iran',
  israel: 'Israel',
  turkey: 'Turkey',
  brazil: 'Brazil',
  canada: 'Canada',
  australia: 'Australia',
  mexico: 'Mexico',
  taiwan: 'Taiwan',
  ukraine: 'Ukraine',
  'hong kong': 'Hong Kong',
  'middle east': 'Middle East',
  'persian gulf': 'Persian Gulf',
  europe: 'Europe',
  asia: 'Asia',
  'hormuz': 'Hormuz Strait',
  'strait of hormuz': 'Hormuz Strait',
  'taiwan strait': 'Taiwan Strait',
  'south china sea': 'South China Sea',
}

const COUNTRY_WORDS = [
  'United States', 'United Kingdom', 'South Korea', 'North Korea', 'Saudi Arabia',
  'Russia', 'China', 'India', 'Japan', 'Germany', 'France', 'Iran', 'Israel',
  'Turkey', 'Brazil', 'Canada', 'Australia', 'Mexico', 'Indonesia', 'Taiwan',
  'Singapore', 'Netherlands', 'Italy', 'Spain', 'Poland', 'Ukraine', 'Egypt',
  'Nigeria', 'Qatar', 'Kuwait', 'Argentina', 'Chile', 'Colombia', 'Pakistan',
  'Vietnam', 'Thailand', 'Malaysia', 'Philippines', 'Greece', 'Sweden', 'Norway',
  'Switzerland', 'Hong Kong', 'UAE', 'South Africa',
]

const ROUTE = /\b(route|routes|corridor|corridors|shipping|sea lane|sea lanes|trade route|supply chain|supply chains|from .* to |between .* and |pipeline|pipelines|flow|flows|import|export|connect|connected|link|links)\b/i
const CONFLICT = /\b(conflict|war|tension|tensions|attack|attacks|military|strike|strait|border|boundary|crisis|escalation|invasion|blockade|sanction|missile|naval|fleet|deployment)\b/i
const RISK = /\b(risk|risky|volatile|volatility|dangerous|threat|threats|hazard|danger|vulnerab)\b/i
const NETWORK = /\b(network|networks|graph|relationship|relationships|connection|connections|linked|link|ties|alliance|alliances)\b/i
const SUPPLY = /\b(supply chain|supply chains|supply network|supply map|logistics)\b/i
const MAP = /\b(map|mapping|overview|atlas|holographic map|world map|heat map|heatmap)\b/i
const ABSTRACT = /\b(explain|define|what is|what are|how does|how do|why does|why is|who is|meaning of|difference between|calculate|compute|solve|write|code|program|function|python|javascript|typescript|algorithm|formula|equation|mathematics|physics|chemistry|biology|philosophy|theory|relativity|quantum|translate|summarize|fourier|transform)\b/i

function extractEntities(query: string): string[] {
  const q = query.toLowerCase()
  const found: string[] = []
  const add = (name: string) => {
    if (!found.some(n => n.toLowerCase() === name.toLowerCase())) found.push(name)
  }
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(q)) add(canonical)
  }
  for (const name of COUNTRY_WORDS) {
    if (new RegExp(`\\b${name.toLowerCase()}\\b`, 'i').test(q)) add(name)
  }
  return found
}

export function inferVisualization(query: string): VisualizationIntent {
  const q = query.toLowerCase()
  const entities = extractEntities(query)
  const origin = entities[0] ?? null
  const destination = entities[1] ?? null

  const hasRoute = ROUTE.test(q)
  const hasConflict = CONFLICT.test(q)
  const hasRisk = RISK.test(q)
  const hasNetwork = NETWORK.test(q)
  const hasSupply = SUPPLY.test(q)
  const hasMap = MAP.test(q)
  const hasAbstract = ABSTRACT.test(q)

  if (hasAbstract && entities.length === 0) {
    return createIntent({ mode: 'abstract', transition: 'disintegrate', camera: 'orbit', palette: 'core', caption: 'Abstract reasoning' })
  }

  if (hasSupply) {
    return createIntent({ mode: 'supply', scale: 'global', focus: entities, origin, destination, camera: 'pullback', palette: 'map', transition: 'particle_reform', caption: 'Supply network' })
  }
  if (hasMap && entities.length === 0) {
    return createIntent({ mode: 'map', scale: 'global', camera: 'pullback', palette: 'map', transition: 'particle_reform', caption: 'Holographic world map' })
  }

  if (hasRoute && entities.length > 0) {
    return createIntent({ mode: 'route', focus: entities, origin, destination, camera: 'pullback', caption: `Flow path: ${origin ?? 'origin'} → ${destination ?? 'network'}` })
  }
  if (hasRoute) {
    return createIntent({ mode: 'route', camera: 'pullback', caption: 'Global route network' })
  }

  if (hasConflict) {
    return createIntent({ mode: 'conflict', scale: entities.length > 0 ? 'regional' : 'global', focus: entities, origin, destination, camera: entities.length > 0 ? 'zoom_in' : 'pullback', palette: 'risk', caption: 'Conflict field' })
  }

  if (hasRisk) {
    return createIntent({ mode: 'risk', scale: entities.length > 0 ? 'regional' : 'global', focus: entities, origin, destination, camera: entities.length > 0 ? 'zoom_in' : 'pullback', palette: 'risk', transition: 'disintegrate', caption: 'Risk heatfield' })
  }

  if (hasNetwork) {
    return createIntent({ mode: 'network', focus: entities, origin, destination, camera: 'pullback', caption: 'Knowledge web' })
  }

  if (entities.length === 1) {
    const c = resolveCoords(entities[0])
    if (c) {
      return createIntent({ mode: 'country', scale: 'country', focus: entities, origin: entities[0], camera: 'zoom_in', caption: `Focus: ${entities[0]}` })
    }
    return createIntent({ mode: 'region', scale: 'regional', focus: entities, camera: 'zoom_in', caption: `Region: ${entities[0]}` })
  }

  if (entities.length > 1) {
    return createIntent({ mode: 'region', scale: 'regional', focus: entities, origin, destination, camera: 'zoom_in', caption: 'Regional field' })
  }

  if (hasAbstract) {
    return createIntent({ mode: 'abstract', transition: 'disintegrate', camera: 'orbit', palette: 'core', caption: 'Abstract reasoning' })
  }

  return createIntent({ mode: 'globe', camera: 'pullback', caption: 'Global particle core online' })
}