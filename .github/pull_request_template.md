<!--
  PR template for tapaskroy/watchagent.
  `main` requires one approval from @tapaskroy before merge (collaborators
  cannot self-merge). CI (lint + unit tests + build + docker build) must pass.
  See CONTRIBUTING.md for the full workflow.
-->

## Summary

<!-- 1–3 sentences: what changed and, more importantly, why. -->

## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — no behavior change
- [ ] `docs` — documentation only
- [ ] `test` — tests only
- [ ] `chore` — build / tooling / deps

## Test plan

<!-- How was this verified? Be specific: test files run, manual flows, where.
     For docs-only changes, write "N/A — docs only". -->

- [ ]

## Local verification

<!-- Tick what you ran locally. CI re-runs these on the PR. -->

- [ ] `npm run lint`
- [ ] `npm run test:unit`
- [ ] `npm run build`
- [ ] `npx tsc --noEmit --project apps/web/tsconfig.json`

## Checklist

- [ ] Commits follow conventional-commit prefixes
- [ ] No secrets or hardcoded Claude model strings (use `@watchagent/shared` constants)
- [ ] `apps/web/src/lib/version.ts` bumped if this is a release change
- [ ] Docs / CLAUDE.md updated if behavior or workflow changed
