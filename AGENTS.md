# Frenstein 95 (apps/web)

Frenstein is a Windows 95-style interactive desktop in a browser. Active app: `apps/web` only; `packages/*` is unused and `concept/` is stale legacy birthday-app code.

## Commands (Bun)

- `bun install`
- `bun run dev`
- `bun run build` (runs `tsc -b && vite build` in `apps/web`)
- `bun run typecheck` (`tsc -b`)
- `bun run preview`
- No `lint` or `test` scripts exist here.

## Architecture

- `src/main.tsx` -> `src/App.tsx`: boot -> login -> desktop -> shutdown state machine.
- Logical stage is exactly 320x180 CSS px (`STAGE_W`/`STAGE_H`) scaled by `useStageScale`.
- `@/*` alias -> `src/*`.
- `src/os/` holds OS state, reducer, storage, stage scale, SFX, cursor.
- `src/components/` holds desktop/window/taskbar chrome.
- `src/apps/` holds app windows (Notepad, Music, Photos, etc.).
- `concept/README.md` describes the old birthday app and is not authoritative.

## Chrome fidelity

Read `specs/01-chrome-foundations.md` before changing chrome; then the relevant component spec. `frenstein-pixel-spec.md` wireframe numbers are illustrative coarser density, so component specs win. Preserve Windows 95 metrics, two 1px bevel layers, pixel fonts/rasters, disabled emboss, and dotted focus.

## CodeGraph

`.codegraph/` holds a local, gitignored index for this repo. Use it before grep or file reads to trace symbols/call paths:
- Shell: `codegraph explore "symbol or file names"`
- MCP: `codegraph_explore` with `projectPath` = repo root.
- Do not commit `.codegraph/` contents; only `.gitignore` is intended to be shared.