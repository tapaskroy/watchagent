# WatchAgent — Claude Code Instructions

## Project Overview
Personalized movie/TV recommendation platform. Monorepo with a Next.js web app and Fastify API, deployed on AWS ECS Fargate.

**Production:** https://watchagent.tapaskroy.me

---

## Repo Structure

```
apps/
  web/          Next.js 14 frontend (port 3001)
  api/          Fastify backend (port 3000)
  ios/          SwiftUI iOS app
packages/
  shared/       Shared types and constants (CLAUDE_MODEL lives here)
  api-client/   Typed API client used by web
  ui/           React component library (ContentCard, ContentCardWithFeedback, etc.)
  database/     Drizzle ORM schema and migrations
```

---

## Local Development

```bash
# Start everything
npm run dev

# Web: http://localhost:3001
# API: http://localhost:3000
```

### Critical: @watchagent/ui rebuild
The UI package compiles to `dist/` (gitignored). Source edits to `packages/ui/src/` are NOT picked up by the web dev server until you rebuild:

```bash
npm run build --workspace=@watchagent/ui
# Then restart the web server (kill and re-run npm run dev)
```

Docker builds run `npm run build` automatically, so only source needs to be committed.

---

## Deployment

**Deployment flow:** push to `main` → manually trigger CodeBuild → builds Docker images → pushes to ECR → ECS force-new-deployment

### Trigger a build
```bash
aws codebuild start-build --project-name watchagent-prod-docker-build --source-version main
```

> Note: GitHub webhook is configured but intentionally not used. Always trigger manually.

### Verify deployment
```bash
curl -sk https://watchagent.tapaskroy.me/login | grep -o "0\.[0-9]*"
```

### Monitor ECS rollout
ECS replaces tasks ~2 min after CodeBuild succeeds. The curl check above confirms the new version is live.

---

## Versioning
Bump `apps/web/src/lib/version.ts` before every deployment. Current version: **0.604**.

---

## AWS Infrastructure

| Component | Detail |
|---|---|
| Traffic flow | Route53 → ALB → ECS Fargate |
| Web service | `watchagent-prod-web` (port 3001) |
| API service | `watchagent-prod-api` (port 3000) |
| ECR images | `269267980934.dkr.ecr.us-east-1.amazonaws.com/watchagent-prod-{web,api}` |
| Logs | `/ecs/watchagent-prod-api`, `/ecs/watchagent-prod-web` |
| CodeBuild project | `watchagent-prod-docker-build` |

**EC2 instance `i-0e85530f1d5cbda8c` is a test box — NOT production. Do not deploy to it.**

---

## Key Architectural Decisions

- **Conversations** stored as JSONB in `conversations` table. Full history sent to Claude on each request.
- **Sliding window** in `chat.service.ts`: keeps last 15 messages verbatim, summarizes older into `context.summary`.
- **Recommendations** generated asynchronously on onboarding completion. Home page polls until ready.
- **Search detection** passes last 6 messages to Claude to resolve vague references ("more like those").
- **`NEXT_PUBLIC_API_URL`** is baked into the web Docker image at build time via `--build-arg`.

---

## Claude / LLM

All LLM calls use constants from `packages/shared/src/constants/index.ts`:

```typescript
export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
export const RECOMMENDATION_CONFIG = { LLM_MODEL: 'claude-haiku-4-5-20251001', ... };
```

Never hardcode model strings. Always use these constants.

---

## Known Gotchas

1. **TypeScript strict mode** — `next build` inside Docker runs full type checking. Always run `npx tsc --noEmit --project apps/web/tsconfig.json` locally before pushing to catch errors before CodeBuild.

2. **ESLint disable comments** — use bare `// eslint-disable-line` not `// eslint-disable-line react-hooks/exhaustive-deps` (the named rule isn't in the ESLint config and causes a build error).

3. **IAM for CodeBuild** — role `watchagent-prod-codebuild-role` needs `ecs:UpdateService`. If deployments stop triggering ECS rollout, check this policy.

4. **`useRecommendations` disabled guard** — the `queryFn` has `if (enabled === false) return []`, so calling `refetch()` on a disabled query always returns empty. Never rely on `refetch()` from a disabled `useRecommendations` instance.
