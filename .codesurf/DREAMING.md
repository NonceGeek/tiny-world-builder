# CodeSurf Workspace Memory — tinyworld

_Generated: 2026-05-27 (seventh pass)_

---

## Overview

Tiny World Builder is a single-file, no-bundler 3-D isometric world editor built on Three.js r128. The runtime is `tiny-world-builder.html` (inline CSS + JS, currently ~32.5k lines / ~1.3 MB). `LandscapeEngine.js` handles procedural underlay terrain; refactored into `engine/landscape/` mixin modules. Deployment is static: `publish.sh` → `dist/`. `npm test` runs ESLint + HTMLHint static checks; all pass after recent sessions.

---

## Durable Architecture Facts

**Core data contract**
- `world[x][z]` — intent layer; `cellMeshes['x,z']` — render layer
- All mutations via `setCell(x, z, opts)`; sparse-safe reads via `getWorldCell()` / `ensureWorldCell()`
- Never write to `world[x][z]` directly outside init

**Planet underlay** (committed and clean)
- Separate `planetLandscapeEngine` instance; decorative backdrop — no shadows, no pointer picks
- `tickPlanetLandscapeStream()` drives updates; `setPlanetFog()` defensively guards uniform holders
- `world.schema.json` includes `planetLandscape` serialisation fields

**Water flow system** (committed and clean)
- `waterTextureFlowStates`, `applyFlowingWaterUVs`, `waterFlowMaterial`, `tickWaterTextureFlow()`
- `waterFlow` field on cells (default `'auto'`); persisted; UI-editable per tile

**Ghost world generation**
- Deterministic seeded (`ghostHash` / `cellRand`), connection-aware across board edges
- Cached in `ghostBoardCells`; reproduced identically on pan-back

**Weather system** (added 2026-05-27)
- `currentWeather` — `'sunny'` / `'cloudy'` / `'rain'` / `'storm'`; serialised
- `WEATHER_CONFIG`, `applyWeatherConfig()`, rain particles (capped 2000), lightning bolt + flash
- Toolbar shortcut `W`

**Day/night cycle** (added 2026-05-27)
- `timeOfDay` (0–1), keyframe config covering sun/moon position, lights, fog, stars
- `sunMesh`, `moonMesh`, `starField` (2000 stars) in scene
- Toolbar shortcut `T`; long-press cycles 1×/5×/20× speed

**Dynamic shadows** (added 2026-05-27, default off)
- `dynamicShadows` setting; moves `dirLight.position` with sun/moon; sets `shadowMap.needsUpdate`
- ~2–4ms extra per frame at 48×48

**NPC / Character system** (added 2026-05-27)
- `CHARACTERS` registry, `worldNPCs` array, A\* pathfinding, NPC schedules, relationships graph, Claude API dialog, memory compression at 20-message cap, GLTF model support with capsule fallback
- 12 pre-built fantasy village characters shipped
- Toolbar shortcut `N`; fully serialised with save/load

**Stamp Panel** (WIP) — shortcut `M`; missing undo and rotation/flip

**Seasons system** (WIP) — 4 seasons, animated transitions, seasonal particles; directly mutates shared `M.*` materials (fragile)

---

## Skills Registry (13 on disk, 11 routed)

**Not in AGENTS.md:** `tinyworld-ghost-world-gen`, `threejs-primitive-reconstructor`

---

## Open Threads

- Add both unrouted skills to AGENTS.md routing
- Seasons system mutates shared `M.*` materials directly — audit before adding new tinting systems
- NPC `memorySummary` growth unbounded across many save cycles
- Rain cap (2000) and lightning bolt geometry are candidates for sprite upgrade
- Stamp panel missing undo and rotation/flip
- `plugins/` directory at repo root — not yet documented in skills or memory
- `PORT-NOTES.md` and `status.MD` at repo root — review before adding new systems
- Verify `dynamicShadows` round-trips safely on older saves
