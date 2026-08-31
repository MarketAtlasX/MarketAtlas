# Frontend Styles

## Design Tokens

Defined in `index.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#030507` | Page background |
| `--bg-raised` | `#081018` | Panel background |
| `--accent` | `#38e8ff` | Holographic cyan accent |
| `--positive` | `#2ee6a8` | Positive states |
| `--warning` | `#f5b941` | Warning states |
| `--critical` | `#ff4d5e` | Critical states |
| `--neutral` | `#5f7d99` | Neutral text |
| `--text-hi` | Light | High emphasis text |
| `--text-mid` | Mid gray | Medium emphasis |
| `--text-lo` | Dark gray | Low emphasis |

## Utility Classes

- `panel` — Base panel styling
- `panel-title` — Panel title typography
- `hud-corners` — Corner HUD decoration
- `scanline` — Scanline overlay
- `pulse-dot` — Animated pulse dot
- `stream-in` — Stream-in animation
- `shimmer-bar` — Shimmer loading bar

## Globe Styling

The globe uses `cinematic-globe.css` for:
- Vignette overlays
- Caption animations
- Risk ring pulse effects
- Gold node ring rotation
- Canvas overrides

## Conventions

- All styling uses Tailwind + CSS variables
- Components use `interface XxxProps` for typing
- No code comments in source files
- Design system is dark-only
