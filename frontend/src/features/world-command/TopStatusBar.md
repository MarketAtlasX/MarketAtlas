# Top Status Bar

## Overview

The top status bar provides global navigation and system status across all pages.

## Elements

- **MARKETATLAS logo** — Click to return to `/dashboard`
- **Back button** — Appears on non-dashboard pages; uses browser history with fallback
- **LIVE indicator** — Shows the system is connected
- **World Risk** — Current risk score and level
- **Command Time** — Current UTC time

## Behavior

- On `/dashboard`: Shows logo only, no back button
- On other pages: Shows logo + back button + status indicators
- Back navigates `history.go(-1)` when possible, otherwise falls back to `/dashboard`
- The risk score color adapts to the current level (positive/warning/critical)

## Replay Integration

When a replay intent is active, the globe responds to the URL `?replay=` parameter with the decoded visualization intent.
