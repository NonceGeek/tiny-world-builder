# CodeSurf Workspace Memory — tinyworld

_Generated: 2026-05-20_

---

## Overview

This workspace is the **Tiny World Builder** project: a single-file, no-bundler, vanilla JS 3D isometric world editor running on Three.js r128. The main artifact is `tiny-world-builder.html` (~16k LoC). A parallel project, **Hermes Agent Core (Rust)**, lives at `/Users/jkneen/Documents/GitHub/hermes-agent/agent-core-rs/` and is being audited for gateway parity with a Python upstream (`api_server.py`).

---

## Durable Facts

### Tiny World Builder

- **Single file**: All CSS in `<style>`, all JS in one `<script>` block. No bundler, no npm runtime deps.
- **Three.js r128** pinned. Do not bump — shadow and material color-space semantics differ in newer releases.
- **Two parallel data structures**: `world[x][z]` (intent) and `cellMeshes['x,z']` (render). Always mutate via `setCell(x, z, opts)`, never write `world[x][z]` directly.
- **Materials in `M.*` are shared**. Never mutate `.color` in place; clone first. Per-particle materials (e.g. smoke) clone + dispose on death.
- **`userData.landing`** guards drop-in animations; never remove those checks.
- Grid defaults to 8×8; settings can expose up to 48×48.
- Deploy targets: Vercel (`vercel.json`) and Netlify (`netlify.toml`), both serving `dist/` built by `publish.sh`.
- `npm test` = static checks; `npm run build` = dist generation.
- `tiny-world-builder BACKUP.html` — do not auto-update if it exists locally.

### Code style

- Semicolons required (existing file uses them).
- 2-space indent, trailing commas, single quotes.
- Section comments: `// -------- name --------`. Keep related code grouped; new systems get their own section header.
- Boring obvious code over clever abstractions.

### Skill routing (`.codex/skills/`)

| Skill file | Covers |
|---|---|
| `tinyworld-single-file` | Repo workflow, single-file constraints |
| `tinyworld-auto-batching` | Auto palette inference/cache |
| `tinyworld-opacity-torch` | Ghost boards, panning, opacity torch |
| `tinyworld-tile-variation` | Repeat-click levels, terrain/object variation |
| `tinyworld-visual-qa` | Browser checks, visual QA |
| `tinyworld-render-performance` | Renderer, shadows, clouds, GPU budget |
| `tinyworld-webxr` | WebXR AR/VR, headset input |
| `tinyworld-crowd-layer` | 2.5D people sprites at 3D coordinates |
| `tinyworld-lowpoly-world-prompt` | Model prompting for coherent worlds |
| `tinyworld-lowpoly-stylized-3d` | Asset design, imports, materials, animation |
| `tinyworld-integrations` | API, webhook, SSE, MCP, plugin examples |

### Pre-submit checklist

- `npm test` passes
- No console errors on page load
- Keyboard shortcuts `1`–`9`, `E`, `R`, `F`, `C` still work
- Perspective ⇄ ortho toggles cleanly
- Fence neighbors update geometry on place/erase
- House clusters render L/T/+/square shapes correctly
- Smoke spawns from chimneys after landing

---

## Hermes Agent Core (Rust)

- Path: `/Users/jkneen/Documents/GitHub/hermes-agent/agent-core-rs/`
- Worktree is **dirty**: `STATUS.md`, `GATEWAY_PARITY_PLAN.md`, `src/responses.rs`, gateway parity tests are uncommitted.
- **Do not cut a parity release yet.** `STATUS.md` claims phases 0–5 complete, but `GATEWAY_PARITY_PLAN.md` still has core Responses/health items unchecked, and `src/responses.rs` is a synthetic stub.
- Python upstream exposes additional surface not yet scoped: `/v1/capabilities`, structured `/v1/runs`, approval/stop/events, `/v1/health`, cron endpoints.

### Known production risks in `streaming_handler`

1. Unbounded `mpsc::channel()` — slow client stalls producer indefinitely.
2. Missing `done: true` on stream errors — clients hang.
3. Silent `tx.send()` error drops.
4. `memory_store` mutex held across provider `await` — blocks other requests.
5. No SSE keep-alive/heartbeat — idle connections time out at load balancer.

Items 1, 2, and 4 are real production risks. No Hermes work occurred in recent sessions.

---

## Active Automated Workflows (OpenClaw crons)

| Cron | ID | Schedule | Health |
|---|---|---|---|
| Keep-Alive | `a24c6f0b` | every 15 min | ✅ HEARTBEAT_OK (confirmed 12:21 UTC) |
| Urgent Email Alert | `4e55bac5` | hourly | ✅ HEARTBEAT_OK (11:30 and 12:30 UTC) — note: consistently shows assistant turn failures before producing output; script itself runs clean |
| Tom Doerr Tweet Tracker | `cebd05e0` | ~every 2 h | ✅ Fired at ~09:06 and ~12:37 UTC on 2026-05-20; topics included WWDC 2026 AI/MCP and Claude Code; email sent to jason@bouncingfish.com |
| mc-gateway | `894a3d5b` | heartbeat | ❌ Ongoing "connection refused" failures; multiple assistant turns producing no content; root cause unresolved |
| Lead C3f78d0c (Ava) | — | heartbeat | ✅ HEARTBEAT_OK across multiple cycles; full config confirmed (BASE_URL, AUTH_TOKEN, BOARD_ID `c3f78d0c`, AGENT_NAME `Ava`, AGENT_ID `9f5f3df9`) |

---

## Feature Interest — Ant Simulation

User expressed interest (2026-05-20) in adding an Ant Simulation to Tiny World Builder. Discussed approach: ants as animated sprites or tiny 3D meshes, random-walk logic, pheromone paths as a terrain layer, colony nests as a new object kind. No plan or skill written yet — open feature thread.

---

## Open Threads

- **Hermes `src/responses.rs`** stub must be replaced with a real gateway handler before any parity release.
- **Streaming handler** risks 1, 2, and 4 should be hardened before production.
- **OpenClaw mc-gateway** (`894a3d5b`) connection-refused failures are ongoing and unresolved.
- **Ant Simulation** feature discussed but not yet planned or implemented.
- **Urgent Email Alert** pre-content turn failures are a recurring pattern; worth investigating if cron reliability matters.
