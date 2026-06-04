# CodeSurf Workspace Memory — tinyworld

Generated: 2026-06-04

---

## Overview

Tiny World Builder is a vanilla ES6, no-bundler 3D world editor built on Three.js r128. The app shell lives in `tiny-world-builder.html` (~1.4k lines); business logic is split across 44 ordered modules under `engine/world/` (00–41 + 09b + 99-late-boot.js), plus `engine/landscape/`. Total JS is approximately 40k+ lines. Deployed via Vercel and Netlify from `dist/` produced by `publish.sh`.

---

## Durable Facts

**Architecture**
- Primary file: `tiny-world-builder.html` — HTML shell, boot config, and ordered `<script src>` tags only
- Engine modules: 44 files total (00–41 + 09b + 99-late-boot.js), loaded in strict numeric order
- Notable late additions: `38-multiplayer-partykit.js`, `39-atmosphere-effects.js`, `40-shield-system.js`, `41-flight-combat.js` + `flight-combat-math.mjs` (ES module, not classic script)
- Skills on disk: 20 `.codex/skills/` directories — 19 `tinyworld-*` plus `threejs-primitive-reconstructor`; `threejs-primitive-reconstructor` and `tinyworld-ghost-world-gen` are on disk but absent from AGENTS.md routing
- Three.js pinned to r128; all engine modules share one global scope — duplicate top-level identifiers silently kill the declaring module; prefix module-local scratch globals (e.g. `_fl…` for flight)

**Wallet / cloud-save (subscription system removed 2026-05-31)**
- Subscription tiers, upgrade prompts, paywall gate, premium flags, and `SUBSCRIPTION_TIER` global are all gone from `21-wallet.js`, `23-settings.js`, and `00-prelude.js`
- Only neutral JWT save/load and anonymous fallback remain
- Wallet status text is now "Account cloud unavailable" (never "Local DB offline")

**Island side faces (fixed 2026-06-02/03)**
- `13-distant-dressing-ghost.js` — `M.boardSideEdge` directly on all four full-height side faces; thin overlay-strip approach is gone
- `04-textures.js` — `boardSideEdge` whitelisted as an explicit material name
- Live probe confirmed: height=11 on all four faces, `brownSideFaces: 0`, console clean

**Cloud sea render order (verified 2026-06-02)**
- `31-cloud-sea.js` — `renderOrder = 18` (late), depth test on; `tools/check.js` guard enforces this; do not revert

**showMessage bug (fixed 2026-06-03)**
- `showMessage(msg, duration = 3000)` had a hardcoded secondary `setTimeout(removeMsg, 1000)` that always cut display to 1 second; redundant 1000ms timeout removed

**Object bar scroll (fixed 2026-06-03)**
- `preventInputs` was consuming wheel events on `#objectBar`; fix gates the prevention so scroll events pass through when target (or an ancestor) is `#objectBar`

---

## Object Palette — Current State (2026-06-04)

**Terrain (10):** grass, sand, water, snow, lava, stone, dark stone, dirt, wood, ice

**Objects (60+):** houses, trees, mountains, fences, roads; vehicles (car, boat, submarine); animals; nature items; sports venues (baseball diamond, horse racetrack); amusements (ferris wheel); landmarks (lighthouse, castle, ruins, volcano, observatory, radio tower); energy (solar panel array); air (hot air balloon, airship); windmill; characters (Explorer, Merchant, Scholar, Wizard, Warrior, Knight)

Recently added across 2026-06-03/04: hot air balloon, lighthouse, castle, airship, solar panel array; windmill, observatory, volcano, ruins, radio tower; boat, submarine; ferris wheel (animated 0.5 rpm, `userData.ferrisWheelGroup`); baseball diamond, horse racetrack

All new objects include CSS icons and use standard drop-in landing animation.

**Stamps system:** `treasure-chest` stamp (`models/treasure_chest.glb`) verified working 2026-06-03. Stunt-plane stamp is the canonical flyable plane.

---

## AI Agents System (shipped 2026-06-03)

"AI Agents" tab in side panel with 6 pre-made agents (Aria/Explorer, Nova/Architect, Sage/Historian, Rex/Guard, Luna/Mystic, Byte/Engineer), each with baked-in system prompt and OpenAI-compatible LLM API chat card. Modeled after the Characters panel pattern.

---

## Memory Constraints

- No emoji in any UI, code, or output
- Reuse existing codebase components as-is; never reimplement
- Verify UI/interactions in the real app, not synthetic events
- Verify 3D correctness via positions/bbox/ray-math, not screenshots
- Main app uses SVG glyphs only — no PNG baked-icon system
- CodeSurf auto-commits and auto-pushes to main → Netlify prod; branches do not guarantee isolation
- Only HEAVY (rocket) engines have plume/glow; lift/turbo are propeller-only; plume must stay frustum-visible

---

## Open Threads

- Four unrouted subsystems need skills and AGENTS.md entries: multiplayer (38), atmosphere effects (39), shield system (40), flight combat (41)
- `tinyworld-ghost-world-gen` and `threejs-primitive-reconstructor` skills on disk but not routed in AGENTS.md — wire or remove
- `fork-improvements-report.md` at repo root — eight improvement areas; action status unknown
- `.claude/workflows/split-god-file.js` — purpose/status unconfirmed
- Blast door concept — waiting on user mockup; no code yet
- Codex setup-runner PATH issue (2026-06-04): bare `bash` fails because `/bin` is absent from `PATH`; `/bin/bash` works; resolution unconfirmed
- Day/night cycle — atmosphere module (39) exists but no time progression wired
- NPC/agent pathfinding — Characters and AI Agents are stationary; no movement system
