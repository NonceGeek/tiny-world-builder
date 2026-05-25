The file looks complete and accurate. Here is the final content for `.codesurf/DREAMING.md`:

---

# tinyworld — CodeSurf Generated Memory

_Generated 2026-05-25. Do not edit by hand — overwritten on each dreaming run._

---

## Overview

**tinyworld** is a single-file browser app (`tiny-world-builder.html`) — a low-poly infinite-canvas 3D world builder on Three.js r128. No bundler, no npm runtime dependencies. All CSS and JS inline (~29k+ LoC). Static deploy via `publish.sh` → `dist/`, served by both Vercel (`vercel.json`) and Netlify (`netlify.toml`).

The workspace runs inside **CodeSurf** canvas with an **OpenClaw** agent infrastructure managing scheduled crons and heartbeat polling.

---

## Durable Facts

### App Architecture

- **Single source of truth**: `tiny-world-builder.html` — all code lives here
- **Two parallel data structures**: `world[x][z]` (intent) and `cellMeshes['x,z']` (render) — mutate only via `setCell(x, z, opts)`
- Three.js r128 pinned; materials in `M.*` are shared — clone before mutating color
- `userData.landing` guards drop-in animations; `disposeGroup` skips shared materials
- Grid: 8×8 default, up to 48×48; storage key `tinyworld:v1` schema v4
- Section comments `// -------- name --------` are structural — preserve grouping

### Procedural Texture System

- `makeMulberry32(seed)` seeded RNG — stable procedural textures across reloads
- Cottage deterministic canvas textures: `texCottageGrass`, `texCottageWood`, `texCottageGlass`, `texCottageStone`, `texCottageDirt`
- `texturedGrass` defaults **on** (`!== '0'`); UI label: "Cottage grass texture"

### Waterfall Effect (committed `1551393`)

- Flat plane geometry replaced with layered curtains, surface flows, and **foam-puff system**
- 16 puffs per exposed water edge, lanes `lip / fall / splash`; per-tick non-uniform scale pulse
- Puffs carry full position state (`baseX/Y/Z`, `acrossDrift`, `fallHeight`, salts)
- Single shared material: `M.waterfallFoamPuff`

### Tower Building Variant (committed `1551393`)

- **`makeVoxelStoneTower(floors, palette)`** — dedicated voxel factory for `buildingType === 'tower'`; replaces `makeVoxelTurret(..., true)` for towers
- **`makeVoxelTurret`** now reserved exclusively for castle turrets
- `tinyworld-lowpoly-stylized-3d` SKILL.md updated to reflect this split

### Stamp Builder UI (committed `1551393`)

- AI/prompt controls fully removed; only "Import build JSON" remains
- Cards clickable to select; `selected` CSS state; `stampBuilderSelectionKey()` tracks selection
- Compact layout: `86px` min col, `104px` min card height, `72×72` thumbnails; keyboard/role accessibility added

### Orbit Camera & Terrain (committed `1551393`)

- `MIN_ORBIT_POLAR = 0.18` / `MAX_ORBIT_POLAR = Math.PI - 0.18` — camera can now orbit below island
- Terrain gap fix: `positiveTerrainOffset = Math.max(0, terrainOffset)` fed into riser height

### LandscapeEngine (committed `d77a172`)

- **Airfield config injectable**: `_makeAirfieldConfig(airfield)`, pass `false` to disable; all constants data-driven
- Lives in `LandscapeEngine.js` — separate file, not inlined

### Git State (as of 2026-05-25)

- **3 commits ahead of `origin/main`** — not pushed
- **Working tree**: clean apart from this dreaming update (`DREAMING.md` itself)
- `cottage.html` committed; `context.md` deleted; `tinyworld-ghost-world-gen` skill added — all in `d77a172`

---

## Active OpenClaw Infrastructure

| Agent / Cron | Status |
|---|---|
| Ava heartbeat (lead board `c3f78d0c`) | **OK** |
| VibeClaw Article Generator | **OK** |
| Codesurf Extension Skills Scout | **OK** |
| MC Gateway `894a3d5b` (`localhost:19789`) | **BROKEN** — connection refused; all assistant turns returning empty |
| Tom Doerr Tweet Tracker | **BROKEN** — X.com auth wall |
| DGX image server | **UNREACHABLE** |

---

## Companion Repo: hermes-agent-core-rs

Several Codex sessions today worked in `/Users/jkneen/Documents/GitHub/hermes-agent/agent-core-rs`. Separate project, frequently co-active in this workspace.

**TUI Gateway Config Fix** — `ui-tui/src/gatewayClient.ts` patched: was falling back to Apple Python 3.9, which crashes on Hermes' modern syntax before `gateway.ready`. Now discovers parent Hermes checkout, prefers parent `.venv`/`venv`, falls back to `~/.hermes/hermes-agent/venv/bin/python`. `npm run dev` in `agent-core-rs/ui-tui/` now connects correctly.

**Codex Provider Routing Split** — `src/main.rs` oneshot/manual CLI uses `CommandPrompt`; `src/gateway.rs` gateway uses `ApiServer`. Cargo check + clippy pass; local-listener socket-bind failures are a known sandbox limitation, not a regression.

**Crossterm Input: Slash & @ Modals** — `/` at prompt start opens slash command modal; `@` anywhere opens file mention modal with relative paths. Hermes-aware: local commands surface as `//command` so single-slash still routes to Hermes backend. Tests added for all modal behaviors.

**SmallHarness / Open Issues** — SmallHarness → Hermes migration thread exists but not executed. Startup profiling incomplete. Second-stage runtime issue: gateway connects but Hermes context loads without provider/skills state — root cause uninvestigated.

---

## Companion Repo: CortexIDE (Electron app)

Security hardening pass completed today (same workspace operator).

- `npm test` passes: 194 tests, 0 failures
- Hardened: custom protocol file/resource access; chat/extension iframe `postMessage` source validation; collab IPC path/mailbox/filename validation; browser tile URL scheme blocking + localhost-only host bridge injection; mac release signing/notarization guardrails
- Touched-file TypeScript errors resolved; broader repo-wide TS debt (`App.tsx`, `Kanban*`, `MCPPanel`, relay tests) intentionally deferred

---

## Open Threads

- **3 commits not pushed** to `origin/main` (tinyworld)
- `cottage.html` integration decision pending
- `tinyworld-ghost-world-gen` skill contents unreviewed
- MC Gateway `894a3d5b` root cause not investigated
- `grok-cli` inline-image patch needs a write-capable session
- LandscapeEngine browser QA (outlines, cel-shading, fog) backlogged
- openclicky build verification pending
- hermes-agent-core-rs: SmallHarness → Hermes migration not executed; startup profiling incomplete
- hermes-agent-core-rs: gateway connects but Hermes context missing provider/skills state — unresolved
- CortexIDE: broader TypeScript debt pass backlogged
