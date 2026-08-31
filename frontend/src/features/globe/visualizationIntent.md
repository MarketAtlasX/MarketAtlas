# Visualization Intent Guide

## Overview

Visualization intents drive how the globe renders data. Each intent specifies a mode, scale, camera position, and visual theme.

## Intent Modes

| Mode | Description |
|------|-------------|
| `globe` | Default 3D globe view |
| `country` | Focus on a single country |
| `region` | Focus on a regional area |
| `route` | Show a route between two points |
| `network` | Show knowledge graph connections |
| `risk` | Highlight high-risk zones with conflict routes |
| `conflict` | Show conflict zones in detail |
| `supply` | Display supply chain routes |
| `map` | Planar world map view |
| `abstract` | Abstract reasoning visualization |

## Creating Intents

```ts
import { createIntent } from './visualizationIntent'

const intent = createIntent({
  mode: 'risk',
  scale: 'regional',
  camera: 'zoom_in',
  palette: 'risk',
  transition: 'disintegrate',
  caption: 'GEOPOLITICAL RISK & WAR ZONES',
})
```

## Replay on Globe

From World Memory, replay intents are encoded into the URL:

```ts
import { buildReplayIntent, encodeReplayIntent } from './replayOnGlobe'

const intent = buildReplayIntent(analogue)
const encoded = encodeReplayIntent(intent)
// Navigate to /dashboard?replay={encoded}
```
