# Changelog

## [Unreleased]

### Added
- Shared `AppLayout` shell component providing consistent top bar across all route pages
- Home button in the top bar logo that navigates to the dashboard
- Back navigation button on all non-dashboard pages
- `replayOnGlobe` utility for encoding replay intents into URLs
- World Memory "Replay on Globe" button encodes replay intent and navigates to dashboard
- `intentOverride` prop on `HolographicGlobe` and `CinematicGlobe` for URL-driven globe state
- `buildRiskFlows` in SceneDirector for dedicated risk mode route generation
- Enriched risk mode with bigger, severity-colored arcs and dedicated routes
- Replay intent decoding in WorldCommandCenter from URL search params
- Tests for replay-on-globe encoding, decoding, and mode mapping
- Tests for back button rendering in TopStatusBar
