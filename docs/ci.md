# CI and deployment

`.github/workflows/ci.yml` runs on every push to `main`, on every pull request and on demand.

## What has to pass

| Job | Step | Fails the run when |
|---|---|---|
| `ci` | `bun install --frozen-lockfile` | the lockfile and `package.json` disagree |
| `ci` | `bun run lint` (oxlint) | a correctness rule is violated (unused vars, `any`, debugger, `no-console`) |
| `ci` | `bun run typecheck` (`tsc -b`) | any TypeScript error |
| `ci` | `bun run build` (`tsc -b && vite build`) | the production build fails |
| `ci` | Verify build output | `dist/index.html` or `dist/assets/` is missing |
| `deploy` | Deploy | the deploy command exits non-zero |
| `deploy` | Smoke test | the deployed URL does not return HTTP 200, has no `#root`, or a referenced JS/CSS asset 404s |

`deploy` only runs once `ci` has passed, and it re-downloads the exact artifact that `ci` built, so nothing is rebuilt between checks.

## Deploy targets

The deploy job picks a provider automatically:

1. **Vercel** — if the `VERCEL_TOKEN` secret exists. It runs `vercel deploy` against `apps/web/dist` (with `--prod` on `main`).
2. **corepass** — otherwise, if the `COREPASS_TOKEN` secret exists. It publishes to the existing `frenos-xp` site.

If neither secret is set, CI still lints, typechecks, builds and verifies, and the deploy step stops with a warning instead of failing the build.

### Repository settings to add

| Kind | Name | Value |
|---|---|---|
| Secret | `COREPASS_TOKEN` | a corepass deploy token, or |
| Secret | `VERCEL_TOKEN` | a Vercel token, if you would rather deploy there |
| Variable | `FRENOS_SITE_URL` | the live URL used by the smoke test, e.g. `https://frenos-xp-f46776.corepass-sites.com/` |

`FRENOS_SITE_URL` is optional; the workflow falls back to the current site URL.

## Running the same checks locally

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run build
```

## A note on linting

The project uses TypeScript 7 (the native preview). `typescript-eslint` refuses to run against that compiler, so linting uses **oxlint** instead: it parses TSX itself, runs in about 0.1 s and needs no TypeScript API. The rule set lives in `apps/web/.oxlintrc.json` and is intentionally limited to correctness rules — the React Compiler advisory rules are off because this codebase deliberately uses render-time refs and canvas loops.
