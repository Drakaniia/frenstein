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
| `deploy` | Deploy to GitHub Pages | publishing fails, or the smoke test below fails |
| `deploy` | Smoke test | the deployed URL does not return HTTP 200, has no `#root`, or a referenced JS/CSS asset 404s |

`deploy` only runs once `ci` has passed, and it re-downloads the exact artifact that `ci` built, so nothing is rebuilt between checks.

## Deployment

Every push to `main` deploys to **GitHub Pages**, using the exact artifact the `ci` job built (nothing is rebuilt). No secrets or tokens are needed: the job uses the repository's own Pages permissions, and the `Configure Pages` step turns Pages on the first time it runs.

Pull requests from forks run `ci` only and are never deployed.

After publishing, the job smoke-tests the live URL and fails the run when:

- the page does not answer HTTP 200 after redirects;
- the page has no `#root` element;
- a JS or CSS file it references does not answer 200 (catches a wrong `base` path);
- the deployed bundle does not contain `Frenstein`, or still contains the removed `Birthday Edition` text — a staleness guard, because a stale bundle is exactly how the old build stayed live before.

The environment URL for each run is shown on the workflow run page and in the job summary.

## Running the same checks locally

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run build
```

## A note on linting

The project uses TypeScript 7 (the native preview). `typescript-eslint` refuses to run against that compiler, so linting uses **oxlint** instead: it parses TSX itself, runs in about 0.1 s and needs no TypeScript API. The rule set lives in `apps/web/.oxlintrc.json` and is intentionally limited to correctness rules — the React Compiler advisory rules are off because this codebase deliberately uses render-time refs and canvas loops.
