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
| `deploy` | Deploy to Vercel | the deploy command exits non-zero (only runs when `VERCEL_TOKEN` is set) |
| `deploy` | Smoke test | the deployed URL does not return HTTP 200, has no `#root`, or a referenced JS/CSS asset 404s |

`deploy` only runs once `ci` has passed, and it re-downloads the exact artifact that `ci` built, so nothing is rebuilt between checks.

## Deploy targets

The deploy job deploys to **Vercel** when the `VERCEL_TOKEN` secret exists: it runs `vercel deploy` against `apps/web/dist`, with `--prod` on `main` and a preview deployment otherwise.

Without that secret, CI still lints, typechecks, builds and verifies the output; the deploy steps are skipped with a notice instead of failing. In that case the site is published from the Remy app (`publish_site`), which is how `frenos-xp` is served today.

If a deployment happens, the smoke test then loads the live URL and checks:

- the page answers HTTP 200 after redirects;
- it contains the `<div id="root">` the app mounts into;
- every JS and CSS file the page references also answers 200 (this catches a wrong `base` path).

### Repository settings to add

| Kind | Name | Value |
|---|---|---|
| Secret | `VERCEL_TOKEN` | a Vercel token, to allow CI deploys |
| Variable | `FRENOS_SITE_URL` | the site to smoke-test when Vercel is not used, e.g. `https://frenos-xp-f46776.corepass-sites.com/` |

Neither is required for the lint / typecheck / build gate — that part is green with no configuration at all.

## Running the same checks locally

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run build
```

## A note on linting

The project uses TypeScript 7 (the native preview). `typescript-eslint` refuses to run against that compiler, so linting uses **oxlint** instead: it parses TSX itself, runs in about 0.1 s and needs no TypeScript API. The rule set lives in `apps/web/.oxlintrc.json` and is intentionally limited to correctness rules — the React Compiler advisory rules are off because this codebase deliberately uses render-time refs and canvas loops.
