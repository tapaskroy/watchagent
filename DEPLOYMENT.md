# WatchAgent Deployment Guide

> This guide reflects the actual production setup as of March 2026.
> The production site is **https://watchagent.tapaskroy.me**

---

## Production Architecture

```
User Browser
    │
    ▼
Route53: watchagent.tapaskroy.me  ──→  ALB (watchagent-prod-alb)
Route53: api.watchagent.tapaskroy.me ─→  ALB (watchagent-prod-alb)
    │
    ▼
AWS Application Load Balancer
  - Port 80:  redirects → HTTPS
  - Port 443: ACM TLS cert (auto-managed)
      Host: api.watchagent.tapaskroy.me  → Target Group: watchagent-prod-api-tg  (port 3000)
      Host: watchagent.tapaskroy.me      → Target Group: watchagent-prod-web-tg  (port 3001)
    │
    ▼
ECS Fargate (cluster: watchagent-prod-cluster)
  - Service: watchagent-prod-api   → ECR image watchagent-prod-api:latest
  - Service: watchagent-prod-web   → ECR image watchagent-prod-web:latest
    │
    ├── RDS PostgreSQL: watchagent-prod-db.c4tqkfvxhad6.us-east-1.rds.amazonaws.com
    └── ElastiCache Redis: watchagent-prod-redis.z12smc.0001.use1.cache.amazonaws.com
```

**Key resource identifiers:**

| Resource | Value |
|---|---|
| AWS Account | `269267980934` |
| Region | `us-east-1` |
| ECS Cluster | `watchagent-prod-cluster` |
| ECS Web Service | `watchagent-prod-web` |
| ECS API Service | `watchagent-prod-api` |
| ECR Web Repo | `269267980934.dkr.ecr.us-east-1.amazonaws.com/watchagent-prod-web` |
| ECR API Repo | `269267980934.dkr.ecr.us-east-1.amazonaws.com/watchagent-prod-api` |
| CodeBuild Project | `watchagent-prod-docker-build` |
| CodeBuild IAM Role | `watchagent-prod-codebuild-role` |
| CloudWatch (API logs) | `/ecs/watchagent-prod-api` |
| CloudWatch (Web logs) | `/ecs/watchagent-prod-web` |
| CodeBuild logs | `/aws/codebuild/watchagent-prod-docker-build` |

> ⚠️ **The EC2 instance `i-0e85530f1d5cbda8c` (52.205.193.184) is a test box tagged
> `Environment=test`. It is NOT behind the ALB and does NOT serve production traffic.
> Deploying there has zero effect on https://watchagent.tapaskroy.me.**

---

## Normal Deployment — Push to Main

**This is the only step needed for a normal deploy:**

```bash
git add <files>
git commit -m "your message"
git push origin main
```

A GitHub webhook triggers CodeBuild automatically. The `buildspec.yml` at the repo root:

1. Builds `watchagent-prod-api:latest` (linux/amd64 Docker image)
2. Builds `watchagent-prod-web:latest` with `NEXT_PUBLIC_API_URL=https://api.watchagent.tapaskroy.me/api/v1` baked in at build time
3. Pushes both images to ECR
4. Calls `aws ecs update-service --force-new-deployment` for both ECS services
5. ECS drains old tasks and starts new ones pulling the fresh ECR images (~2–3 min)

**Verify the deploy went through:**
```bash
# Check CodeBuild ran for your commit
aws codebuild list-builds-for-project --project-name watchagent-prod-docker-build --output json \
  | python3 -c "import json,sys; [print(i) for i in json.load(sys.stdin)['ids'][:3]]"

# Check a specific build status
aws codebuild batch-get-builds --ids "<build-id>" \
  --query 'builds[0].[buildStatus,currentPhase,resolvedSourceVersion]' --output table

# Confirm the new version is live
curl -sk https://watchagent.tapaskroy.me/login | grep -o "version [0-9.]*"
```

---

## Manual / Recovery Deployment

Use this when the webhook didn't fire or you need to force a deploy without a new commit.

### Step 1 — Trigger CodeBuild manually

```bash
aws codebuild start-build \
  --project-name watchagent-prod-docker-build \
  --source-version main \
  --query 'build.id' --output text
```

### Step 2 — Monitor the build (~8–10 min)

```bash
BUILD_ID="watchagent-prod-docker-build:<id-from-step-1>"

# Poll until done
for i in $(seq 1 25); do
  sleep 30
  STATUS=$(aws codebuild batch-get-builds --ids "$BUILD_ID" \
    --query 'builds[0].buildStatus' --output text)
  PHASE=$(aws codebuild batch-get-builds --ids "$BUILD_ID" \
    --query 'builds[0].currentPhase' --output text)
  echo "$(date -u +%H:%M:%S) - $STATUS | $PHASE"
  if [ "$STATUS" = "SUCCEEDED" ] || [ "$STATUS" = "FAILED" ]; then break; fi
done
```

### Step 3 — Monitor ECS rollout (~2–3 min after build)

```bash
aws ecs describe-services \
  --cluster watchagent-prod-cluster \
  --services watchagent-prod-web watchagent-prod-api \
  --query 'services[*].[serviceName,runningCount,desiredCount,deployments[0].status]' \
  --output table
```

Both services should show `1 | 1 | PRIMARY` when stable.

### Step 4 — Confirm version is live

```bash
curl -sk https://watchagent.tapaskroy.me/login | grep -o "version [0-9.]*"
```

---

## Checking Production Logs

ECS Fargate logs stream to CloudWatch. Use `aws logs tail` for live streaming:

```bash
# Live-tail API logs
aws logs tail /ecs/watchagent-prod-api --follow

# Live-tail Web logs
aws logs tail /ecs/watchagent-prod-web --follow

# Last 50 API log lines (snapshot)
aws logs get-log-events \
  --log-group-name /ecs/watchagent-prod-api \
  --log-stream-name $(aws logs describe-log-streams \
    --log-group-name /ecs/watchagent-prod-api \
    --order-by LastEventTime --descending \
    --query 'logStreams[0].logStreamName' --output text) \
  --limit 50 \
  --query 'events[*].message' --output text
```

For CodeBuild build logs:
```bash
aws logs get-log-events \
  --log-group-name /aws/codebuild/watchagent-prod-docker-build \
  --log-stream-name "build/<build-id>" \
  --query 'events[*].message' --output text
```

---

## Versioning

The app version lives in `apps/web/src/lib/version.ts`:

```typescript
export const APP_VERSION = '0.6';
```

- Bump this **manually** before each release: `0.6 → 0.7 → 0.8`
- It renders at the bottom of every screen (login page, home page chat bar, all inner pages)
- After a deploy, check `curl -sk https://watchagent.tapaskroy.me/login | grep "version"` — if the new version number shows, the deploy succeeded

---

## Known Issues & Fixes

### Webhook not firing / CodeBuild not triggered on push

The GitHub webhook is configured on CodeBuild. If it stops working, trigger manually:
```bash
aws codebuild start-build --project-name watchagent-prod-docker-build --source-version main
```

### CodeBuild POST_BUILD fails: `AccessDeniedException` on `ecs:UpdateService`

The CodeBuild IAM role is missing ECS permissions. Fix once:
```bash
aws iam put-role-policy \
  --role-name watchagent-prod-codebuild-role \
  --policy-name ecs-update-service \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["ecs:UpdateService", "ecs:DescribeServices"],
      "Resource": "*"
    }]
  }'
```

Then re-trigger the build.

### Code appears on EC2 but not on https://watchagent.tapaskroy.me

You deployed to the wrong place. The EC2 instance (`i-0e85530f1d5cbda8c`) is a test box only.
The production traffic goes through the ALB → ECS Fargate pipeline. Use the CodeBuild flow above.

### ECS task keeps restarting / unhealthy

Check the latest stopped task reason:
```bash
# Get recent stopped tasks
aws ecs list-tasks --cluster watchagent-prod-cluster --desired-status STOPPED \
  --query 'taskArns[0]' --output text

# Check why it stopped
aws ecs describe-tasks --cluster watchagent-prod-cluster --tasks <task-arn> \
  --query 'tasks[0].containers[0].reason' --output text

# Then check CloudWatch logs for the error
aws logs tail /ecs/watchagent-prod-api --follow
```

### Environment variables / secrets not loading

Production secrets are stored in AWS Secrets Manager and injected at ECS task launch:
- `DB_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `TMDB_API_KEY`, `OMDB_API_KEY`, `ANTHROPIC_API_KEY`

The `NEXT_PUBLIC_API_URL` is baked into the web image at build time via `buildspec.yml` `--build-arg`.

---

## Emergency Rollback

If a bad deploy causes the site to go down, force a redeployment from the previous image digest:

```bash
# 1. List recent ECR images to find the previous good one
aws ecr describe-images --repository-name watchagent-prod-web \
  --query 'sort_by(imageDetails, &imagePushedAt)[-5:].[imagePushedAt,imageDigest]' \
  --output table

# 2. Scale the broken service to 0 immediately
aws ecs update-service --cluster watchagent-prod-cluster \
  --service watchagent-prod-web --desired-count 0

# 3. Update task definition to use previous image digest, then redeploy
# (or revert the git commit, trigger a new CodeBuild build)

# 4. Scale back up
aws ecs update-service --cluster watchagent-prod-cluster \
  --service watchagent-prod-web --desired-count 1
```
