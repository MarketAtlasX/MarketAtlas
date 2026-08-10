import type { GraphNode, GraphEdge } from '../types/graphTypes'

export interface Position {
  x: number
  y: number
}

const TYPE_ORDER: Record<string, number> = {
  event: 0,
  country: 1,
  commodity: 2,
  sector: 3,
  company: 4,
  asset: 5,
  agent: 3,
  concept: 2,
  forecast: 5,
  confidence_factor: 1,
}

export function hierarchicalLayout(nodes: GraphNode[], edges: GraphEdge[]): Map<string, Position> {
  const adj = new Map<string, string[]>()
  const inDeg = new Map<string, number>()
  const positions = new Map<string, Position>()

  for (const n of nodes) {
    adj.set(n.id, [])
    inDeg.set(n.id, 0)
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target)
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1)
  }

  const levels = new Map<string, number>()
  const queue: string[] = []
  for (const [id, deg] of inDeg) {
    if (deg === 0) queue.push(id)
  }
  for (const id of queue) levels.set(id, 0)

  while (queue.length > 0) {
    const cur = queue.shift()!
    const level = levels.get(cur) ?? 0
    for (const next of adj.get(cur) ?? []) {
      const nextLevel = level + 1
      if (!levels.has(next) || nextLevel > (levels.get(next) ?? 0)) {
        levels.set(next, nextLevel)
      }
      const nd = inDeg.get(next) ?? 1
      inDeg.set(next, nd - 1)
      if ((inDeg.get(next) ?? 0) <= 0) {
        queue.push(next)
      }
    }
  }

  for (const n of nodes) {
    if (!levels.has(n.id)) levels.set(n.id, 0)
  }

  const levelBuckets = new Map<number, GraphNode[]>()
  for (const n of nodes) {
    const l = levels.get(n.id) ?? 0
    if (!levelBuckets.has(l)) levelBuckets.set(l, [])
    levelBuckets.get(l)!.push(n)
  }

  const SPACING_X = 200
  const SPACING_Y = 100

  for (const [level, bucket] of levelBuckets) {
    bucket.sort((a, b) => (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99))
    const totalWidth = (bucket.length - 1) * SPACING_X
    for (let i = 0; i < bucket.length; i++) {
      positions.set(bucket[i].id, {
        x: -totalWidth / 2 + i * SPACING_X,
        y: level * SPACING_Y,
      })
    }
  }

  return positions
}

export function toReactFlowNodes(
  nodes: GraphNode[],
  positions: Map<string, Position>,
  type: string = 'default',
) {
  return nodes.map((n) => {
    const pos = positions.get(n.id) ?? { x: 0, y: 0 }
    return {
      id: n.id,
      type: 'custom',
      position: pos,
      data: {
        label: n.label,
        type: n.type,
        confidence: n.confidence,
        value: n.value,
        change_pct: n.change_pct,
        risk: n.risk,
        metadata: n.metadata,
      },
    }
  })
}

export function toReactFlowEdges(edges: GraphEdge[]) {
  return edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: e.type === 'contradicts' ? '#ef4444' : '#6366f1',
      strokeWidth: (e.weight ?? 0.5) * 3,
    },
    labelStyle: { fontSize: 10, fill: '#94a3b8' },
    data: {
      type: e.type,
      weight: e.weight,
      confidence: e.confidence,
    },
  }))
}

export function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    event: '#ef4444',
    country: '#3b82f6',
    commodity: '#f59e0b',
    sector: '#8b5cf6',
    company: '#10b981',
    asset: '#06b6d4',
    agent: '#f97316',
    concept: '#64748b',
    forecast: '#6366f1',
    confidence_factor: '#14b8a6',
  }
  return colors[type] ?? '#6366f1'
}
