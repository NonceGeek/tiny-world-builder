---
name: tinyworld-tool-icons-and-modes
description: Use when changing Tiny World Builder's mode indicator, boot tool selection, or Esc-to-Select behaviour.
---

# Tiny World Mode Safety

## Mode safety

- Boot always ends on the Select tool: `bootApp` calls
  `selectTool(DEFAULT_TOOL)` *after* `loadState()`, so a restored world's saved
  `toolId` never leaves a fresh session "armed" for building.
- `#mode-indicator` (HUD chip, updated in `updateModeIndicator` in
  `19-tools-toolbar.js`) names the current mode and colours itself: calm
  `mode-select`, amber `mode-build`, red `mode-erase`. Keep it
  `pointer-events:none`.
- `Esc` disarms any build/paint/erase tool back to Select (handler in
  `20-input-place-erase.js`, skipped in first-person walk mode).

## Gotcha

`npm test` (`tools/check.js` / `smoke-static.js`) is stale post-split: it
string-matches the old inline `<script>`/`setCell(` in
`tiny-world-builder.html` and fails regardless of these changes. Verify with a
headless boot (no new console errors) instead.
