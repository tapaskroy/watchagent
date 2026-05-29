# Contributing to WatchAgent

Welcome! This guide covers how to get changes into WatchAgent. The conventions
here are kept in the repo on purpose, so that humans and AI assistants
(Claude Code) work from the same rules. For deeper architecture and deployment
context, read [CLAUDE.md](./CLAUDE.md) first.

**Production:** https://watchagent.tapaskroy.me

---

## Who can do what

| | Push to a branch | Push directly to `main` | Approve / merge PRs |
|---|---|---|---|
| Maintainer (`@tapaskroy`) | ✅ | ✅ (admin bypass) | ✅ |
| Collaborators | ✅ | ❌ | ❌ |

`main` is protected by a branch ruleset: every change from a collaborator lands
through a **pull request that requires one approval** from the maintainer, and
force-pushes to `main` are blocked. Open a PR, get it approved, then it merges.

---

## Getting started

```bash
git clone https://github.com/tapaskroy/watchagent.git
cd watchagent
npm install
npm run dev          # web → http://localhost:3001, api → http://localhost:3000
```

Monorepo layout (see CLAUDE.md for detail):

```
apps/        web (Next.js), api (Fastify), ios, mobile
packages/    shared, api-client, ui, database
```

---

## Development workflow

### 1. Branch

Branch off `main` using a type prefix:

```bash
git checkout -b feat/short-description
git checkout -b fix/short-description
```

Prefixes: `feat/`, `fix/`, `refactor/`, `chore/`, `docs/`, `test/`.

### 2. Make focused changes

- Match the style and patterns already in the surrounding code.
- Keep commits small and self-contained.
- Never hardcode Claude model strings — use the constants in
  `packages/shared/src/constants/index.ts`.

### 3. Verify locally before pushing

CI re-runs all of this on your PR (see [Automated checks](#automated-checks)),
but running it locally first saves a round-trip:

```bash
npm run lint                                              # eslint across the monorepo
npm run test:unit                                         # unit tests
npm run build                                             # turbo build all packages

# Web type-checking — Docker's `next build` does full strict type checks,
# so catch them here first:
npx tsc --noEmit --project apps/web/tsconfig.json
```

> **`@watchagent/ui` gotcha:** the UI package compiles to `dist/` (gitignored).
> Source edits under `packages/ui/src/` are NOT picked up by the web dev server
> until you `npm run build --workspace=@watchagent/ui` and restart `npm run dev`.
> Docker builds run `npm run build` automatically, so you only commit source.

### 4. Commit (conventional commits)

```bash
git commit -m "feat: add watchlist export"
git commit -m "fix: token refresh reads response.data.data"
git commit -m "docs: clarify ECS rollout timing"
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

### 5. Push and open a PR

```bash
git push -u origin feat/short-description
gh pr create        # fills in the PR template below
```

Then request review from `@tapaskroy`. Merging happens after approval.

---

## Automated checks

`.github/workflows/ci.yml` runs on every PR to `main` and must pass before merge:

- `npm run lint`
- `npm run test:unit`
- `npm run build`
- Docker build test for both `api` and `web` images

Deployment is **separate and manual** — it does not happen on merge by itself.
After your PR is merged to `main`, the maintainer triggers a build:

```bash
aws codebuild start-build --project-name watchagent-prod-docker-build --source-version main
```

ECS replaces tasks ~2 min later. See CLAUDE.md → Deployment for the full flow.

---

## Code standards

- **TypeScript strict mode** is enforced by the Docker build — type errors fail
  the deploy, not just CI. Run `tsc --noEmit` locally.
- **ESLint disable comments:** use a bare `// eslint-disable-line`, not the named
  form `// eslint-disable-line react-hooks/exhaustive-deps` — the named rule
  isn't in the config and breaks the build.
- Prefer `const`, `async/await`, and existing patterns over new abstractions.
- No secrets, tokens, or credentials in code or commits.

---

## Versioning

Bump `apps/web/src/lib/version.ts` (`APP_VERSION`) in any PR intended for
release. The login page exposes the version so a deploy can be verified:

```bash
curl -sk https://watchagent.tapaskroy.me/login | grep -o "0\.[0-9]*"
```

Current version lives in that file (`0.604` at the time of writing).

---

## Pull request checklist

Before requesting review:

- [ ] Branch uses a type prefix; commits are conventional
- [ ] `npm run lint`, `npm run test:unit`, `npm run build` pass locally
- [ ] `npx tsc --noEmit --project apps/web/tsconfig.json` is clean
- [ ] New behavior / bug fixes have tests where practical
- [ ] `version.ts` bumped if this is a release change
- [ ] No secrets or hardcoded model strings
- [ ] PR description explains the "why", not just the "what"

---

## Getting help

- **Questions / bugs / ideas:** open a GitHub issue or ask the maintainer.
- **Architecture & deployment details:** [CLAUDE.md](./CLAUDE.md).

Thanks for contributing! 🎬
