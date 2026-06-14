# CodeSurf Workspace Memory — tinyworld

Generated: 2026-06-14

---

## Overview

Tiny World Builder is a vanilla ES6, no-bundler 3D world editor on Three.js r128. Shell lives in `tiny-world-builder.html` (~1.4k lines); logic is split across approximately **60 modules** under `engine/world/` (numbered 00–56 + 99, with `09b` and two `46-` files). Styles in `styles/tiny-world.css` (~5.2k lines). Deployed via Vercel and Netlify from `dist/` via `./publish.sh`. Port 8888 is the Netlify dev server; must be running with local `tinyworld` Postgres before any Worlds MMO features can be browser-tested.

A separate **landing/marketing page** (`index.html`) is also in the repo with its own build/publish pipeline — distinct from `tiny-world-builder.html`.

---

## Durable Facts

**Architecture**
- Shell: `tiny-world-builder.html` — HTML, boot config, ordered `<script src>` tags only
- Engine modules: ~60 `.js` files sharing one global scope + `flight-combat-math.mjs` (ES module companion to `34-flight-sim.js`); classic scripts, not ES modules
- Non-sequential extras: `09b-voxel-build-factories.js` (between 09 and 10); two files share the `46-` prefix (`46-mesh-terrain.js`, `46-worlds-universe.js`) — load order between them not formally documented
- Skybound additions (modules 53–56) added after the core 00–52 inventory; `99-late-boot.js` is the final late-init module
- Duplicate top-level identifiers silently kill the declaring module without affecting others; prefix module-local scratch globals (e.g. `_fl…` for flight)
- Three.js pinned to r128; MeshLambertMaterial, ExtrudeGeometry, and shadow setup assume r128 semantics — do not bump
- Materials in `M.*` are shared across meshes — clone before mutating color; `disposeGroup` disposes geometries but NOT materials
- `setCell(x, z, opts)` is the only sanctioned way to mutate world state; never write `world[x][z]` directly outside of init
- No bundler, no npm runtime dependencies; `npm test` for static checks, `./publish.sh` for dist
- Edits auto-commit to main and Netlify prod deploys immediately — branches do not guarantee isolation

**Skill directories**
- `.codex/skills/` — 23 skill files for core engine systems (tinyworld-single-file, tinyworld-render-performance, tinyworld-flight-sim, etc.)
- `.agents/skills/` — 5 additional skills: `3d-modeling`, `lightweight-3d-effects`, `poly-pizza-api`, `threejs-primitive-reconstructor`, `tinyworld-i18n`
- AGENTS.md lists only `.codex/skills/` routing; `.agents/skills/` entries are not yet referenced there

**Module reference — modules 34 and above**
- `34-flight-sim.js` — flyable plane via `stunt-plane` model-stamp; click-to-Enter/Fly, rear chase-cam, Escape exits; `flight-combat-math.mjs` is its ES module companion; static body parts (fuselage, wings, tail, cockpit, wheels) merged into single BufferGeometry via `threeStdlib.mergeGeometries`; only engine node keeps `frustumCulled=false`, merged mesh and others set to `true` via post-merge `planeGroup.traverse`
- `38-multiplayer-partykit.js` — multiplayer via PartyKit
- `39-atmosphere-effects.js` — atmosphere/day-night effects; time-progression not wired to any UI control
- `40-shield-system.js` — VoxelShield materials are Lambert (cheaper at-rest lighting); per-mesh glow material clones are explicitly disposed on teardown
- `41-flight-combat.js` — combat systems; missiles/projectiles fully implemented; player hit detection stub removed 2026-06-12 (empty `if (hit) {}` block remains — actual health/damage system not yet implemented); altitude ceiling enforcement removed 2026-06-12 (plane has no upper altitude limit)
- `42-account-wallet-players.js` — JWT/cloud-save; subscription system fully removed 2026-05-31
- `43-drag-drop-import.js` — GLB/FBX/OBJ/VOX/VDB drag-drop pipeline
- `44-sub-object-edit.js` — part-level selection, hover hulls, transform delegation
- `45-shader-fx.js` — `window.TinyShaderFX`; GLSL effects via `onBeforeCompile`
- `46-mesh-terrain.js` — opt-in voxel-block landscape sculptor; persists under `tinyworld:meshTerrain:*`; no `setCell` bake
- `46-worlds-universe.js` — Worlds MMO universe map, world buying (USDC), management/publish; dispatches `tinyworld:worlds-ready` and exposes `window.__tinyworldWorldsReady` promise; does NOT reference `window.__tinyworldBattleworlds`
- `47-worlds-room.js` — Worlds MMO room client (PartyKit `world-<slug>`); sprite system uses `Without_shadow` sheets; exposes `WS.enterRoom/leaveRoom/harvest/setAvatarClass`; `createAvatar` now routes through `window.makeVoxelAvatar` for self + peers + bots
- `48-worlds-harvest-hud.js` — Worlds MMO in-world HUD (hearts, resources, harvest actions, cooldowns, reward popups); SVG glyphs only
- `49-worlds-avatar-picker.js` — avatar picker gallery; drives `WS.setAvatarClass`; extensible via `WS.registerAvatarProvider`
- `50-worlds-play-chat.js` — play-mode chat panel; wires to `47-worlds-room.js` events (chat/typing/peers/you/enter/leave); reuses `mp-chat-*` CSS classes + `tw-play-chat-*` glassmorphism overrides; IIFE-wrapped
- `51-worlds-bots.js` — localhost-only bot simulation; spawns 3 deterministic bots via PartyKit when entering a world; deterministic via seeded LCG PRNG; **localhost/127.0.0.1 only — never runs in production**
- `52-worlds-demo-seed.js` — localhost-only demo resource seeder; injects harvestable cells into `world.data.cells` before WebSocket opens if a world has no resources; **localhost/127.0.0.1 only — never runs in production**
- `99-late-boot.js` — late boot finalization; `?meshbake=1` URL param activates the early-prototype terrain bake (swaps `prepareFadeable` tiles → `baseMat` clone); `window.runTerrainBake` exposed for console/settings invocation; distinct from the full per-cell bake in `17-tile-renderers.js`

**Skybound modules (53–56)**
- `53-voxel-avatar.js` — `window.makeVoxelAvatar`; replaces 2.5D sprite "stripes" for self + peers + bots; Phase 1 of skybound roadmap; local-only for now
- `54-fly-down.js` — fly-down mechanic (key `j`); camera transitions from orbit to surface-follow mode
- `55-stargate.js` — stargate object (key `G`); visual portal
- `56-gate-transit.js` — gate transit mechanic (key `h`); transition through stargate
- Skybound roadmap lives at `plans/ROADMAP-skybound.md`
- Flooded planet: LandscapeEngine flood config via `waterLevel` and `freqScale` levers
- On-foot surface-camera behavior not yet fully resolved (noted in skybound-systems memory)

**LandscapeEngine**
- `LandscapeEngine.js` is superseded monolith; `getHeight`/chunk-building live in `engine/landscape/*.js` mixins that override it — edit the mixins, not the monolith
- Constructor stays live (hence `VOXEL:true` but old method body); VOXEL:true flag is in the constructor, not the overridden methods

**Worlds MMO namespace**
- `window.__tinyworldWorlds` (alias `WS`) shared across all Worlds modules (46-universe, 47-room, 48-hud, 49-picker, 50-play-chat, 51-bots, 52-demo-seed); all IIFE-wrapped — no top-level globals leak
- `/api/worlds` lives at `netlify/functions/worlds.mjs`
- Worlds gameplay runs on PartyKit room server (separate infrastructure from Netlify site); a Netlify-only deploy does NOT update room behavior

**30-ui-boot-wiring.js**
- This file is 3,434 lines — it is NOT a thin delegation file; also contains full cloud sync logic (`twCloudAccessToken`, `twCloudApiCall`, `twCloudSyncLocalWorldsToCloud`, `twCloudBootstrapSync`, etc.)
- Key welcome-dialog functions: `initWelcomeDialog`, `openTinyverse` (async, waits for `window.__tinyworldWorlds.open`), `openBattleworlds` (sync stub, falls back to `chooseWelcomeMode('play')` if `window.__tinyworldBattleworlds.open` is absent)
- `waitForWorldsFrontend()` polls every 50 ms for up to 2 s; also listens to `tinyworld:worlds-ready` event and `window.__tinyworldWorldsReady` promise as dual signals

**Internationalization (i18n)**
- 4 locales: English (`en`), French (`fr`), Simplified Chinese (`zh`), Spanish (`es`)
- Locale data ships as IIFE JS files (`engine/i18n/en.js`, `fr.js`, `es.js`, `zh.js`), not JSON — avoids CORS/`file://` failures; `publish.sh` copies `engine/` recursively so no build change needed
- `engine/i18n/i18n-core.js` — IIFE; public surface: `t(key, params)` (global, with `{name}` interpolation + English fallback), `TWI18N.locale`, `TWI18N.supported`, `TWI18N.names` (endonyms), `TWI18N.apply(root)` (translate `data-i18n*` attributes), `TWI18N.setLocale(code)` (persist + reload); `en.js` is the authoritative key source
- Language switching is reload-on-switch (persist to localStorage + `location.reload()`); home grid survives because it autosaves to `tinyworld:v1` and restores on boot
- `tools/i18n-check.js` — key parity + usage checker; runs inside `npm run check` / `publish.sh`
- `docs/i18n.md` — architecture reference for the i18n system

---

## Active Workflows and Capabilities

- **Publish flow**: edit source → `./publish.sh` → dist/ updated → Netlify serves updated prod; skipping publish.sh means changes are invisible
- **Admin gate**: `TINYWORLD_ADMIN_SECRET` env var must be set and `netlify dev` restarted; without it, roadmap drag and features admin silently 403
- **Cluso widget**: injected by dev-server at runtime only; `cluso/` is gitignored; build guards forbid it in shipped HTML; never commit Cluso code
- **Shell/checkout traps**: `rm` is aliased interactive in this shell (scripted `rm` silently no-ops; use `command rm -f` and verify); cwd drifts into `~/clawd` mirror where edits auto-commit to main — always use absolute paths
- **Worlds MMO local dev**: port 8888 Netlify dev server + local `tinyworld` Postgres; `openMode` required for local peers (no WORLDS_JOIN_SECRET/SERVICE_TOKEN) or signed play token; without it bots/clients are observers only
- **CodeSurf multi-agent**: register with `mcp__contex__peer_set_state` + `peer_get_state` on every session start; coordinate before editing shared files
- **Performance**: render-bound not logic-bound; shipped: shadow cadence, shield recompile-cascade fix, ghost-detail skip; remaining lever: per-region terrain mesh bake (baseMat swap is the key; −70% draws measured)

---

## Open Threads

- `.agents/skills/` entries (`3d-modeling`, `lightweight-3d-effects`, `poly-pizza-api`, `threejs-primitive-reconstructor`, `tinyworld-i18n`) not yet referenced in AGENTS.md skill routing table — decide whether to add them
- Player hit detection in `41-flight-combat.js`: empty `if (hit) {}` stub — health/damage system not implemented
- Time-progression in `39-atmosphere-effects.js` not wired to any UI control
- `46-worlds-universe.js` and `46-mesh-terrain.js` share the `46-` prefix — load order between them not formally documented in AGENTS.md
- Worlds gameplay on PartyKit room server — Netlify-only deploy does NOT update room server behavior; separate deploy step needed
- On-foot surface-camera behavior not yet fully resolved after fly-down (54) lands the player
- `openBattleworlds` is a sync stub in `30-ui-boot-wiring.js` — falls back to `chooseWelcomeMode('play')` if `window.__tinyworldBattleworlds.open` is absent; Battleworlds mode not yet fully wired
