# Tinyworld — CodeSurf Workspace Memory

_Last consolidated: 2026-05-20 ~08:10 UTC_

## Overview

Tinyworld is a self-contained, single-file 3D world-builder (`tiny-world-builder.html`) built on Three.js r128 with no bundler or npm runtime dependencies. It renders an infinite-canvas isometric/perspective map where users paint terrain and place objects, backed by two parallel data structures. The project is deployed via Vercel and Netlify from a static `dist/` directory.

## Durable Facts

- **Main file**: `tiny-world-builder.html` (~164KB, ~16k+ LoC). Single-file constraint is intentional and must be maintained.
- **Three.js version**: r128, pinned. Do not upgrade — shadow and material behavior changed in newer releases.
- **No bundler, no npm runtime**: `vendor/three/` hosts Three.js and GLTFLoader; `publish.sh` copies them to `dist/`.
- **Build**: `npm run build` generates dist; `npm test` runs static checks. Always run before declaring done.
- **Deploy targets**: Vercel (`vercel.json`) and Netlify (`netlify.toml`) both read from `dist/`.
- **BACKUP file**: `tiny-world-builder BACKUP.html` — do NOT auto-update.
- **Data contract**: `world[x][z]` (intent) and `cellMeshes['x,z']` (render). All mutations go through `setCell(x, z, opts)`. Never write directly to `world[x][z]`.
- **Token pill UI**: A floating overlay showing a `$TINYWORLD` ticker and Solana address was added in commit `cb16e9c` (May 19).

## Active Skills (`.codex/skills/`)

| Skill Directory | Scope |
|---|---|
| `tinyworld-single-file` | Repo workflow, single-file constraints |
| `tinyworld-auto-batching` | Palette inference and cache behavior |
| `tinyworld-opacity-torch` | Ghost boards, panning, opacity torch |
| `tinyworld-tile-variation` | Repeat-click levels, terrain/object variation |
| `tinyworld-visual-qa` | Browser checks, visual QA |
| `tinyworld-render-performance` | Renderer, shadows, clouds, GPU budget |
| `tinyworld-webxr` | WebXR AR/VR: desk placement, floating boards, headset input |
| `tinyworld-crowd-layer` | 2.5D people sprites at 3D map coordinates |
| `tinyworld-ghost-world-gen` | Ghost board generation: deterministic world gen, paths, rivers, bridges, edge continuity, user overrides, persistence |
| `tinyworld-lowpoly-world-prompt` | Prompting for coherent low-poly worlds |
| `tinyworld-lowpoly-stylized-3d` | Low-poly asset design, imports, materials, scale, animation |
| `tinyworld-integrations` | API, webhook, SSE, MCP, plugin, automation |
| `threejs-primitive-reconstructor` | Standalone Three.js primitive scene generation from reference images (import-map pattern, no CDN/React/JSX) |

## Architecture Patterns

- **Section headers**: `// -------- name --------` separate logical systems. Maintain grouping when adding code.
- **Cameras**: `orthoCam`, `softCam`, `persCam`; `camera` is a live reference swapped by `togglePerspective()` / `setCameraMode()`.
- **Materials**: Shared via `M.*`. Never mutate `M.foo.color` in place — clone first.
- **Disposal**: `disposeGroup()` frees geometries but not shared materials. Per-particle smoke clones + disposes its own material — follow for unique-per-instance materials.
- **Animations**: Drop-in queue uses `userData.landing`. Never fight it — check before animating.
- **Grid size**: 8×8 default, up to 48×48. Preserve progressive rendering; avoid broad synchronous rebuilds at large sizes.

## Ghost World Generation (key rules)

- `makeGhostWorld(boardX, boardZ)` is deterministic — cached in `ghostBoardCells`. Same coords always yield the same content.
- Paths/rivers are per-axis functions only (`pathZForRow(boardZ)`, `pathXForCol(boardX)`, `riverXForCol(boardX)`) to guarantee cross-board edge continuity.
- `ghostCellAt` crosses board edges; wraps into adjacent boards or home `world[][]`.
- User edits on ghost boards go into `world[gx][gz]` (global coords); `ghostCellAt` prefers home `world[][]` over generated data.
- Cell schema must always include `{ terrain, kind, floors, buildingType, fenceSide, extras: [] }`.

## Crowd Layer — Recent Changes (uncommitted as of 2026-05-20)

A substantial crowd panel rework is staged but not yet committed (~860 diff lines):

- **Panel repositioned**: `top: 96px → 290px`, `right: 14px → 24px`; glassmorphism styling unified with map panel.
- **Draggable**: pointer capture events on panel header; position clamped to viewport; saved to `localStorage` under `tinyworld:crowd.pos`.
- **Collapsible**: panel slides off-screen right; collapsed state persisted under `tinyworld:crowd.collapsed`; `👥` right-edge handle appears when hidden.
- **crowdEnabled toggle**: global `crowdEnabled`, persisted via `RENDER_LS.crowdEnabled`, settings version `'21'`. When false, `seedCrowdPeople()` exits early. Toggle synchronized via `syncControls()` / `applyFromControls()`.
- Skill `.codex/skills/tinyworld-crowd-layer/SKILL.md` updated to document the above — also uncommitted.

## CodeSurf Multi-Agent Protocol

- Register on every session: `peer_set_state(status="idle")` then `peer_get_state()`.
- File conflict rule: never edit a file a linked peer has in their `files` array — message first.
- Coordinate via `peer_send_message`; use `peer_add_todo` for cross-agent work items.
- All contex tools use prefix `mcp__contex__`.

## Automated Workflows (OpenClaw Crons)

| Cron Job | Cadence | Status 2026-05-20 |
|---|---|---|
| VibeClaw Article Generator | Hourly | Running; 2 articles per run, 3+ sources required, API-only |
| Daily Digest | ~04:41 and ~06:41 UTC | Running; emails AI news to jkneen@me.com |
| Urgent Email Alert | Hourly | Running; HEARTBEAT_OK each cycle |

## Open Threads

- **Uncommitted changes**: `tiny-world-builder.html` and `.codex/skills/tinyworld-crowd-layer/SKILL.md` have ~860 lines of uncommitted crowd panel rework. Commit before further edits.
- **OpenClaw gateway flapping**: MC gateway IDs `ef20b25d`, `894a3d5b`, and `8b79f6d2` failing heartbeats with "connection refused" throughout the day. Lead agent `c3f78d0c` is healthy.
- **Untracked `.antigravitycli/` directory**: Contains a JSON file. Purpose unclear; not in `.gitignore`. Investigate before committing.
- **Daily Digest ran twice**: Sent at both ~04:41 and ~06:41 UTC with overlapping story lists — possible dual-schedule or missing dedup.

## Style Rules

- Semicolons required (existing style).
- 2-space indent, trailing commas, single quotes.
- Boring > clever. Small, well-sectioned changes only.
- Section comments matter — group related code, add headers for new systems.

## Quick Checks Before Declaring Done

- `npm test` passes
- Page loads, no console errors
- Keyboard shortcuts `1`–`9`, `E` work
- `R`/`F` raise/lower terrain; reset restores preset village; `C` clears to grass with stagger
- Perspective ⇄ ortho toggles cleanly
- Fence neighbor geometry updates on place/erase
- House clusters render as L/T/+/square
- Smoke spawns from chimneys after landing
