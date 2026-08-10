export interface GraphNode {
  id: string
  label: string
  type: 'country' | 'commodity' | 'sector' | 'asset' | 'event'
  lat?: number
  lng?: number
  risk?: number
}

export interface GraphEdge {
  source: string
  target: string
  label: string
  weight: number
  type: 'affects' | 'produces' | 'depends_on' | 'invests' | 'impacts'
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const countryCoords: Record<string, { lat: number; lng: number }> = {
  US: { lat: 37.09, lng: -95.71 }, CN: { lat: 35.86, lng: 104.19 },
  RU: { lat: 61.52, lng: 105.32 }, SA: { lat: 23.89, lng: 45.08 },
  IR: { lat: 32.43, lng: 53.69 }, TW: { lat: 23.70, lng: 120.96 },
  JP: { lat: 36.20, lng: 138.25 }, DE: { lat: 51.17, lng: 10.45 },
  GB: { lat: 55.38, lng: -3.44 }, FR: { lat: 46.60, lng: 1.89 },
  IN: { lat: 20.59, lng: 78.96 }, BR: { lat: -14.24, lng: -51.93 },
  KR: { lat: 35.91, lng: 127.77 }, IL: { lat: 31.05, lng: 34.85 },
  UA: { lat: 48.38, lng: 31.17 }, IQ: { lat: 33.32, lng: 44.39 },
}

export const defaultGraph: GraphData = {
  nodes: [
    { id: 'US', label: 'United States', type: 'country', lat: 37.09, lng: -95.71 },
    { id: 'CN', label: 'China', type: 'country', lat: 35.86, lng: 104.19 },
    { id: 'RU', label: 'Russia', type: 'country', lat: 61.52, lng: 105.32 },
    { id: 'SA', label: 'Saudi Arabia', type: 'country', lat: 23.89, lng: 45.08 },
    { id: 'IR', label: 'Iran', type: 'country', lat: 32.43, lng: 53.69 },
    { id: 'TW', label: 'Taiwan', type: 'country', lat: 23.70, lng: 120.96 },
    { id: 'JP', label: 'Japan', type: 'country', lat: 36.20, lng: 138.25 },
    { id: 'DE', label: 'Germany', type: 'country', lat: 51.17, lng: 10.45 },
    { id: 'KR', label: 'South Korea', type: 'country', lat: 35.91, lng: 127.77 },
    { id: 'IL', label: 'Israel', type: 'country', lat: 31.05, lng: 34.85 },
    { id: 'IN', label: 'India', type: 'country', lat: 20.59, lng: 78.96 },
    { id: 'Oil', label: 'Oil', type: 'commodity', lat: 28.0, lng: 50.0 },
    { id: 'LNG', label: 'LNG', type: 'commodity', lat: 27.0, lng: 51.0 },
    { id: 'Semiconductors', label: 'Semiconductors', type: 'commodity', lat: 24.0, lng: 121.0 },
    { id: 'RareEarth', label: 'Rare Earth Minerals', type: 'commodity', lat: 30.0, lng: 110.0 },
    { id: 'Gold', label: 'Gold', type: 'commodity', lat: 0.0, lng: 0.0 },
    { id: 'Wheat', label: 'Wheat', type: 'commodity', lat: 45.0, lng: 40.0 },
    { id: 'Copper', label: 'Copper', type: 'commodity', lat: -30.0, lng: -70.0 },
    { id: 'Energy', label: 'Energy Sector', type: 'sector', lat: 30.0, lng: 45.0 },
    { id: 'Tech', label: 'Technology Sector', type: 'sector', lat: 37.4, lng: -122.0 },
    { id: 'Defense', label: 'Defense Sector', type: 'sector', lat: 38.9, lng: -77.0 },
    { id: 'Financial', label: 'Financial Sector', type: 'sector', lat: 40.7, lng: -74.0 },
    { id: 'Agriculture', label: 'Agriculture Sector', type: 'sector', lat: 41.0, lng: -90.0 },
    { id: 'XLE', label: 'XLE ETF', type: 'asset', lat: 40.7, lng: -74.0 },
    { id: 'XLK', label: 'XLK ETF', type: 'asset', lat: 40.7, lng: -74.0 },
    { id: 'QQQ', label: 'QQQ ETF', type: 'asset', lat: 40.7, lng: -74.0 },
    { id: 'SPY', label: 'SPY ETF', type: 'asset', lat: 40.7, lng: -74.0 },
    { id: 'NVDA', label: 'NVIDIA', type: 'asset', lat: 37.4, lng: -122.0 },
    { id: 'TSMC', label: 'TSMC', type: 'asset', lat: 25.0, lng: 121.5 },
    { id: 'SAP', label: 'SAP', type: 'asset', lat: 49.3, lng: 8.6 },
  ],
  edges: [
    { source: 'IR', target: 'Oil', label: 'produces', weight: 1, type: 'produces' },
    { source: 'SA', target: 'Oil', label: 'produces', weight: 1, type: 'produces' },
    { source: 'RU', target: 'Oil', label: 'produces', weight: 1, type: 'produces' },
    { source: 'US', target: 'Oil', label: 'produces', weight: 1, type: 'produces' },
    { source: 'RU', target: 'LNG', label: 'produces', weight: 1, type: 'produces' },
    { source: 'SA', target: 'LNG', label: 'produces', weight: 1, type: 'produces' },
    { source: 'TW', target: 'Semiconductors', label: 'produces', weight: 1, type: 'produces' },
    { source: 'KR', target: 'Semiconductors', label: 'produces', weight: 1, type: 'produces' },
    { source: 'CN', target: 'RareEarth', label: 'produces', weight: 1, type: 'produces' },
    { source: 'CN', target: 'Semiconductors', label: 'produces', weight: 1, type: 'produces' },
    { source: 'CL', target: 'Copper', label: 'produces', weight: 1, type: 'produces' },
    { source: 'RU', target: 'Wheat', label: 'produces', weight: 1, type: 'produces' },
    { source: 'Oil', target: 'Energy', label: 'feeds', weight: 1, type: 'affects' },
    { source: 'LNG', target: 'Energy', label: 'feeds', weight: 1, type: 'affects' },
    { source: 'Semiconductors', target: 'Tech', label: 'feeds', weight: 1, type: 'affects' },
    { source: 'RareEarth', target: 'Tech', label: 'feeds', weight: 1, type: 'affects' },
    { source: 'Copper', target: 'Tech', label: 'feeds', weight: 1, type: 'affects' },
    { source: 'Copper', target: 'Defense', label: 'feeds', weight: 1, type: 'affects' },
    { source: 'Oil', target: 'Defense', label: 'feeds', weight: 1, type: 'affects' },
    { source: 'Wheat', target: 'Agriculture', label: 'feeds', weight: 1, type: 'affects' },
    { source: 'Energy', target: 'XLE', label: 'tracked_by', weight: 1, type: 'invests' },
    { source: 'Tech', target: 'XLK', label: 'tracked_by', weight: 1, type: 'invests' },
    { source: 'Tech', target: 'QQQ', label: 'tracked_by', weight: 1, type: 'invests' },
    { source: 'Tech', target: 'NVDA', label: 'includes', weight: 1, type: 'invests' },
    { source: 'Semiconductors', target: 'TSMC', label: 'produced_by', weight: 1, type: 'produces' },
    { source: 'Tech', target: 'SAP', label: 'includes', weight: 1, type: 'invests' },
    { source: 'IR', target: 'IL', label: 'conflict', weight: 1, type: 'affects' },
    { source: 'RU', target: 'UA', label: 'conflict', weight: 1, type: 'affects' },
    { source: 'US', target: 'IL', label: 'ally', weight: 1, type: 'affects' },
    { source: 'US', target: 'SA', label: 'ally', weight: 1, type: 'affects' },
    { source: 'IR', target: 'Energy', label: 'threatens', weight: 1, type: 'impacts' },
    { source: 'TW', target: 'Tech', label: 'supplies', weight: 1, type: 'depends_on' },
  ],
}

export function getGraphForCountry(code: string): GraphData {
  const nodes = defaultGraph.nodes
  const edges = defaultGraph.edges.filter(
    e => e.source === code || e.target === code
  )

  const connectedIds = new Set<string>()
  connectedIds.add(code)
  for (const e of edges) {
    connectedIds.add(e.source)
    connectedIds.add(e.target)
  }

  return {
    nodes: nodes.filter(n => connectedIds.has(n.id)),
    edges,
  }
}

export function getCausalPath(sourceId: string, targetId: string): GraphEdge[] {
  const visited = new Set<string>()
  const queue: { node: string; path: GraphEdge[] }[] = [{ node: sourceId, path: [] }]

  while (queue.length > 0) {
    const { node, path } = queue.shift()!
    if (node === targetId) return path

    if (visited.has(node)) continue
    visited.add(node)

    for (const edge of defaultGraph.edges) {
      if (edge.source === node && !visited.has(edge.target)) {
        queue.push({ node: edge.target, path: [...path, edge] })
      }
    }
  }

  return []
}

export function getAllPaths(sourceId: string, maxDepth = 5): GraphEdge[][] {
  const paths: GraphEdge[][] = []

  function dfs(node: string, path: GraphEdge[], depth: number) {
    if (depth > maxDepth) return
    const outgoing = defaultGraph.edges.filter(e => e.source === node && !path.find(p => p.target === e.target))
    for (const edge of outgoing) {
      const newPath = [...path, edge]
      paths.push(newPath)
      dfs(edge.target, newPath, depth + 1)
    }
  }

  dfs(sourceId, [], 0)
  return paths
}
