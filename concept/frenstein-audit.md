# Audit Report: frenstein

**Generated:** 2026-08-01
**Project:** "Frenstein" — a React 19 + TypeScript + Vite + Tailwind memory-gallery landing page with a Three.js particle system, MediaPipe hand tracking, GSAP animations, and a vendored shadcn/ui component library.
**Total files scanned:** 106 (excluding `node_modules/`, `.git/`, `.freebuff/`, `dist/` build output, `package-lock.json`)
**Source files:** 86 under `src/` (64 `.tsx`, 6 `.ts`, plus CSS, config)

---

## Executive Summary

> Frenstein is a small, well-nested frontend project (max 3 directory levels, clean PascalCase/kebab-case conventions, only 1 doc file). Its biggest structural problem is **dead weight**: a 64 MB unused 3D model, three orphaned source files, a stale duplicate hook, and duplicated `public/` assets — together these are the vast majority of the repo's 75 MB asset payload. Two hand-written components exceed the 400-line threshold (`ParticleSystem3D.tsx`, `HoverMouse.tsx`) and mix several concerns. The `src/components/ui/` folder holds 49 vendored shadcn/ui files (36 unused), and `src/assets/` totals 75 MB, exceeding the 50 MB asset threshold.

---

## Severity Legend

- 🔴 **Blocker** — must fix (broken architecture, critical structural issues)
- 🟡 **Warning** — should fix (could cause maintenance problems)
- 🟢 **Suggestion** — nice to improve (best practice, low effort)

---

## Issues Found

### Phase 1: Quick Cleanup

_Low effort, safe changes. Can be done without deep code understanding._

#### Empty / Dead Directories

| Directory | Status               | Recommendation                 |
| --------- | -------------------- | ------------------------------ |
| `docs/`   | Empty (0 files)      | Remove, or add a README if docs are planned |

- [ ] **Remove empty `docs/` directory**
  > 🟢 Reason: Empty directories clutter the codebase. Metric 7 (empty dirs).

---

#### Dead / Orphaned Files

These files are **not imported anywhere** in `src/` (verified by code search) and can be deleted safely.

| File                                       | Lines | Status               | Recommendation |
| ------------------------------------------ | ----- | -------------------- | -------------- |
| `src/pages/DashboardPlaceholder.tsx`       | 22    | Not routed anywhere  | Delete         |
| `src/pages/Index_backup.tsx`               | 39    | Backup of old Index  | Delete         |
| `src/components/ui/use-toast.ts`           | 188   | Stale duplicate      | Delete         |
| `src/assets/3D-models/Table.glb`           | —     | **64 MB**, no code references it | Delete (or wire it up) |
| `src/assets/images.jpeg`                   | —     | 8 KB, never imported | Delete         |

- [ ] **Delete dead page/component files** — `DashboardPlaceholder.tsx`, `Index_backup.tsx`, `ui/use-toast.ts`
  > 🔴 Metric 5 (orphaned files). `App.tsx` only routes `Index`, `FinalSection`, `NotFound`. The canonical toast hook is `src/hooks/use-toast.ts`; `toaster.tsx` already imports from there, so `ui/use-toast.ts` is a leftover.
- [ ] **Delete unused assets** — `3D-models/Table.glb` (64 MB!), `images.jpeg`
  > 🔴 Metric 5. A `grep` for `Table.glb`, `GLTFLoader`, and `.glb` across `src/` returns zero matches. `images.jpeg` is never imported. Removing the GLB alone shrinks `src/assets/` by 85%.

**Before:**
```
src/assets/
├── 3D-models/
│   └── Table.glb          ← 64 MB, UNUSED
├── Cover of seven by Taylor Swift.jpg
├── Hero Image.png
├── Hover (1..6).jpg
├── giig.gif
├── images.jpeg            ← UNUSED
├── memory1..4.jpg
└── seven - Taylor Swift.mp3
```

**After (proposed):**
```
src/assets/
├── Cover of seven by Taylor Swift.jpg
├── Hero Image.png
├── Hover (1..6).jpg
├── giig.gif
├── memory1..4.jpg
└── seven - Taylor Swift.mp3
```

---

#### Duplicated Assets

| Asset                            | Locations                                              | Status                  |
| -------------------------------- | ------------------------------------------------------ | ----------------------- |
| `Hero Image.png` (~600 KB)       | `src/assets/` **and** `public/`                        | ⚠️ Duplicate |
| `giig.gif` (~460 KB)             | `src/assets/` (452 KB) **and** `public/` (460 KB)       | ⚠️ Duplicate |

- [ ] **Remove `public/Hero Image.png` and `public/giig.gif`** — keep the `src/assets/` copies
  > 🟡 Metric 5. The `src/assets/` copies are the ones imported by components (`giigGif` in `LandingCard.tsx`, `HeroImage` in `HeroSection.tsx`). The `public/` copies are copied verbatim into `dist/` but nothing references `/giig.gif` or `/Hero Image.png` (current `index.html` has no favicon link or og:image). Keep one canonical copy per asset.
  > **Note:** if a favicon is desired later, keep `public/giig.gif` and add `<link rel="icon" href="/giig.gif">` to `index.html` — otherwise the site ships without one.

---

#### Naming Inconsistencies

| Directory    | Styles Detected                              | Files Affected |
| ------------ | -------------------------------------------- | -------------- |
| `src/pages/` | PascalCase + snake_case                      | `Index_backup.tsx` |
| `src/assets/` | kebab-case + **spaces/Title Case** filenames | `Hero Image.png`, `Hover (1).jpg`, `seven - Taylor Swift.mp3`, `Cover of seven by Taylor Swift.jpg` |

- [ ] **Delete `Index_backup.tsx`** — resolves the snake_case outlier in `src/pages/` (already covered above)
  > 🟢 Metric 4. All other pages use PascalCase (`Index.tsx`, `FinalSection.tsx`, `NotFound.tsx`).
- [ ] **(Optional, medium effort) Rename assets with spaces** to kebab-case (`hero-image.png`, `hover-1.jpg`, `seven-taylor-swift.mp3`) and update the 4 importing components (`HoverMouse.tsx`, `HeroSection.tsx`, `LandingCard.tsx`, `MemoryGallery.tsx`)
  > 🟢 Metric 4 suggestion. Spaces and parentheses in filenames are legal but awkward in URLs and shell commands. Only worth doing if assets are touched anyway.

---

#### Compiled / Binary Artifacts

- [x] **No action needed — `dist/` is correctly gitignored**
  > Verified: `dist/` (19 files, 13 MB) exists locally but `.gitignore` contains `dist/` and `git ls-files` shows 0 tracked files under `dist/`. ✅

> **When implementing Phase 1:** Use `skill:test-driven-development` — after deleting files, run `npx tsc --noEmit` and `npm run build` to confirm no dangling imports.

---

### Phase 2: File Refactoring

_Medium effort — each item may require splitting or moving code. Test before refactoring._

#### Oversized Files

3 files exceed the 400-line threshold (2 hand-written, 1 vendored).

| File                                    | Lines | Problem                                                                 |
| --------------------------------------- | ----- | ----------------------------------------------------------------------- |
| `src/components/ParticleSystem3D.tsx`   | **459** | Single 448-line component: one giant `useEffect` (lines 17–459) mixing THREE.js scene setup, particle text formation, animation loop, and MediaPipe hand tracking |
| `src/components/HoverMouse.tsx`         | **405** | Component mixing a GSAP mouse-trail animation **and** a music player (audio file, play/pause/skip/volume controls) |
| `src/components/ui/sidebar.tsx`         | **759** | Vendored shadcn/ui — **do not split** (see note below)                  |

> **Note on `sidebar.tsx`:** This is generated library code from the shadcn/ui CLI (same pattern as the other 48 files in `ui/`). It is not imported by any app code and should be left as-is or pruned with the rest of the unused `ui/` components — never hand-split, since regeneration would overwrite manual edits.

---

- [ ] **Split `src/components/ParticleSystem3D.tsx`** — 459 lines (threshold: ≤400) 🔴

  > **Language:** TypeScript / React (auto-detected from `.tsx`)
  > **Reason:** One component contains a single `useEffect` spanning ~440 lines that does everything: renderer/scene setup, camera, particle geometry from text, the animation loop, and hand-gesture tracking. Hard to review, test, or reuse.
  > **Proposal:** Extract into a `particles/` subdirectory (3+ modules) with a barrel file.

  **Natural Boundaries Detected:**
  | Section | Description |
  |---------|-------------|
  | Scene setup | THREE.js scene, camera, renderer, resize handling |
  | Text → particles | Converting text/emoji into particle point positions |
  | Animation loop | Frame loop, particle motion, rendering |
  | Hand tracking | MediaPipe hands wiring (loaded via CDN in `index.html`) |

  **Proposed Split:**
  ```
  src/components/particles/
  ├── index.ts                (barrel — re-exports default ParticleSystem3D)
  ├── ParticleSystem3D.tsx    (trimmed to orchestration, ~80 lines)
  ├── useParticleSystem.ts    (scene setup + animation loop hook)
  ├── textPoints.ts           (text → particle positions)
  └── handTracking.ts         (MediaPipe hand gesture wiring)
  ```

  **Before (Mermaid):**
  ```mermaid
  flowchart LR
    A["ParticleSystem3D.tsx<br/>459 lines"] --> B[Scene setup]
    A --> C[Text to particles]
    A --> D[Animation loop]
    A --> E[Hand tracking]
  ```

  **After (Mermaid):**
  ```mermaid
  flowchart LR
    A["ParticleSystem3D.tsx<br/>~80 lines"] --> B[useParticleSystem.ts]
    A --> C[textPoints.ts]
    A --> D[handTracking.ts]
    B --> E[scene]
  ```

  **Import Changes:**
  | Consumer File | Old Import | New Import |
  |--------------|-----------|-----------|
  | `src/pages/FinalSection.tsx` | `import ParticleSystem3D from '@/components/ParticleSystem3D'` | `import ParticleSystem3D from '@/components/particles'` *(or unchanged if barrel keeps default export and file path is kept — see note)* |

  > **Simpler alternative:** Keep the filename `ParticleSystem3D.tsx` and add sibling modules + an `index.ts` barrel that re-exports its default. Then **no consumer changes are required** — `FinalSection.tsx` keeps working.

  **Language-Specific Steps (TypeScript):**
  - [ ] Create `src/components/particles/` with `textPoints.ts`, `handTracking.ts`, `useParticleSystem.ts`
  - [ ] Trim `ParticleSystem3D.tsx` to compose the three modules
  - [ ] Create `index.ts` barrel re-exporting the default export
  - [ ] Update `FinalSection.tsx` import path (or keep old path if barrel re-exports in place)
  - [ ] Run `npx tsc --noEmit` and `npm run build` to verify

---

- [ ] **Split `src/components/HoverMouse.tsx`** — 405 lines 🔴

  > **Language:** TypeScript / React
  > **Reason:** Two unrelated concerns in one component: a GSAP mouse-trail animation with image sprites, and an audio player (imports `seven - Taylor Swift.mp3`, uses `Play/Pause/SkipBack/SkipForward/Volume2` icons).
  > **Proposal:** Extract the music player and the trail logic.

  **Natural Boundaries Detected:**
  | Section | Description |
  |---------|-------------|
  | Trail effect | GSAP trail animation using the 6 `Hover (n).jpg` + 4 `memory(n).jpg` images |
  | Music player | Audio element, play/pause/skip/volume controls, cover image |

  **Proposed Split:**
  ```
  src/components/
  ├── HoverMouse.tsx        (trimmed composition, ~120 lines)
  ├── MusicPlayer.tsx       (audio playback + controls)
  └── useMouseTrail.ts      (GSAP trail hook)
  ```

  **Before (Mermaid):**
  ```mermaid
  flowchart LR
    A["HoverMouse.tsx<br/>405 lines"] --> B[Trail animation]
    A --> C[Music player]
  ```

  **After (Mermaid):**
  ```mermaid
  flowchart LR
    A["HoverMouse.tsx<br/>~120 lines"] --> B[MusicPlayer.tsx]
    A --> C[useMouseTrail.ts]
  ```

  **Import Changes:**
  | Consumer File | Old Import | New Import |
  |--------------|-----------|-----------|
  | `src/pages/Index.tsx` | `import { HoverMouse } from '@/components/HoverMouse'` | **unchanged** (keep named export in place) |

  **Language-Specific Steps (TypeScript):**
  - [ ] Create `MusicPlayer.tsx` (move audio element, controls, cover image)
  - [ ] Create `useMouseTrail.ts` (move GSAP trail effect + sprite imports)
  - [ ] Trim `HoverMouse.tsx` to compose both
  - [ ] Keep the `HoverMouse` named export so `Index.tsx` needs no change
  - [ ] Run `npx tsc --noEmit` and `npm run build`

> **When implementing Phase 2:** Use `skill:test-driven-development` — capture the current rendered behavior (component renders, player plays audio, trail follows mouse) before splitting, then re-verify after. There are no existing tests in this repo, so at minimum run `npx tsc --noEmit` and `npm run build` after each split, and manually verify the `/` and `/final` routes in the dev server.

---

### Phase 3: Structural Refactoring

_Higher effort — reorganize folders, flatten nesting, improve module boundaries. Test coverage is critical._

#### Bloated Directories

1 directory exceeds the 30-file limit.

| Directory               | File Count | Threshold | Recommendation |
| ----------------------- | ---------- | --------- | -------------- |
| `src/components/ui/`    | **49**     | ≤30       | Vendored shadcn/ui — prune unused or document as generated |

**Before (ASCII tree):**
```
src/components/ui/
├── accordion.tsx
├── alert-dialog.tsx
├── alert.tsx
├── ... (49 files total)
└── tooltip.tsx
```

**After — Option A (recommended, document-as-generated):**
```
src/components/ui/          ← unchanged, 49 files; add README note
└── (vendored shadcn/ui, regenerated via npx shadcn add)
```

**After — Option B (aggressive, prune to used set):**
```
src/components/ui/
├── button.tsx
├── card.tsx
├── dialog.tsx
├── input.tsx
├── label.tsx
├── separator.tsx
├── sheet.tsx
├── skeleton.tsx
├── sonner.tsx
├── toast.tsx
├── toaster.tsx
├── toggle.tsx
└── tooltip.tsx             ← 13 files (36 unused removed)
```

- [ ] **Prune unused `ui/` components** — 36 of 49 files are never imported
  > 🟡 Metric 1 (49 files > 30 threshold). **Important nuance:** this directory is the vendored **shadcn/ui** library, regenerated via `npx shadcn@latest add`. Only **13 components are actually imported** by app code:
  > `button`, `card`, `dialog`, `input`, `label`, `separator`, `sheet`, `skeleton`, `sonner`, `toast`, `toaster`, `toggle`, `tooltip`.
  > **Option A (recommended):** Leave the folder as-is and document it as a generated dependency in `README.md` — this is the standard shadcn workflow and pruning breaks future `shadcn add` runs.
  > **Option B (aggressive):** Delete the 36 unused components and add a note in `README.md` that `npx shadcn@latest add <component>` restores any. Verify with `npx tsc --noEmit`.

---

#### Asset Bloat

`src/assets/` totals **75 MB**, exceeding the 50 MB asset threshold.

| Asset | Size | Issue |
| ----- | ---- | ----- |
| `3D-models/Table.glb` | **64 MB** | Unused (see Phase 1) — 85% of asset weight |
| `seven - Taylor Swift.mp3` | 8.2 MB | Large audio; could be compressed (e.g. 128 kbps) |

- [ ] **Remove `Table.glb` (64 MB)** — covered in Phase 1 (🔴)
- [ ] **Compress `seven - Taylor Swift.mp3`** — re-encode to 128 kbps (~50% smaller) or lazy-load it only when the music player mounts
  > 🟡 Reason: 75 MB of assets slows clone/CI/dev-server startup. After Phase 1 + compression, `src/assets/` should drop to ~4–6 MB.

---

#### Architecture Notes (no action required)

| Item | Verdict |
| ---- | ------- |
| Nesting depth | ✅ Max 3 levels (`src/components/ui`, `src/assets/3D-models`) — below the 4-level threshold |
| Doc sprawl | ✅ Only 1 `.md` (`README.md`) at root — below the 5-file threshold |
| `src/lib/` single-child | ✅ Standard shadcn `utils.ts` (cn helper) — keep as-is |
| `src/hooks/` | ✅ Clean (`use-mobile.tsx`, `use-toast.ts`) |
| `config.yaml` at root | ⚠️ Looks unrelated to the web app (operational backup settings) — verify if it's still needed; if not, delete |

---

## Refactoring Progress

Use this checklist to track completion. Start a new AI session with this report and tick items as they are completed.

```
Phase 1: Quick Cleanup
  [x] Remove empty docs/ directory
  [x] Delete DashboardPlaceholder.tsx, Index_backup.tsx, ui/use-toast.ts
  [x] Delete unused assets: Table.glb (64MB), images.jpeg
  [x] Remove duplicated public/ assets (Hero Image.png, giig.gif)
  [ ] (Optional) Rename assets with spaces to kebab-case

Phase 2: File Refactoring
  [x] Split ParticleSystem3D.tsx (459 lines) → particles/ subdirectory
  [x] Split HoverMouse.tsx (405 lines) → MusicPlayer.tsx + useMouseTrail.ts
  [x] Leave vendored sidebar.tsx as-is (do not split)

Phase 3: Structural Refactoring
  [x] Document src/components/ui/ as vendored shadcn (Option A — README note added)
  [x] Remove Table.glb (64MB)
  [ ] Compress seven - Taylor Swift.mp3 (needs audio re-encoding — manual step)

Total: [9] / [11] completed
```

> **⚠️ Important:** Before implementing any refactoring that splits or moves code, always use `skill:test-driven-development`. Write tests (or at minimum a build+manual-verify pass) for the existing behavior first, then refactor. This ensures:
> 1. You understand what the code is supposed to do
> 2. The refactored code preserves all functionality
> 3. You catch regressions immediately

---

## Implementation Notes for AI

When starting implementation in a new session with this report:

1. **Always use `skill:test-driven-development`** — write a failing test first, then make it pass, then refactor. This applies especially to:
   - Splitting `ParticleSystem3D.tsx` (giant `useEffect` — understand the API surface first)
   - Splitting `HoverMouse.tsx` (trail + music player are independent — split along that seam)
   - Moving files between directories (import paths may change)

2. **Implement Phase 1 first** — it's safe, low-risk, and gets quick wins (removes ~65 MB of dead weight).

3. **For Phase 2, tackle one file at a time** — extract modules, run `npx tsc --noEmit` + `npm run build`, then move to the next.

4. **For Phase 3, decide first** whether `ui/` gets Option A (document) or Option B (prune) — this affects how aggressively you touch vendored code.

5. **After each phase, re-run `npx tsc --noEmit` and `npm run build`** and manually check the `/` and `/final` routes.

6. **Verification commands for this project:**
   - Type check: `npx tsc --noEmit`
   - Build: `npm run build`
   - Dev server (manual route check): `npm run dev`

---

## Edge Cases Checked

| Check                          | Status                                               |
| ------------------------------ | ---------------------------------------------------- |
| Empty repository?              | ✅ No — 106 files scanned                            |
| Generated/vendor dirs skipped? | ✅ `node_modules/`, `.git/`, `.freebuff/`, `dist/`, `package-lock.json` |
| Binary-only repository?        | ✅ No — source code present (64 `.tsx` files)        |
| Symlinks?                      | ✅ None detected                                     |
| Hidden files checked?          | ✅ `.gitignore` (correctly ignores `dist/`, `node_modules/`, `.env*`); `.vscode/` ignored & only local `settings.json` |
| Build output in repo?          | ✅ `dist/` present on disk but **not tracked** (gitignored) — correct |
| Huge assets?                   | ⚠️ 75 MB in `src/assets/` — flagged (64 MB GLB unused) |
