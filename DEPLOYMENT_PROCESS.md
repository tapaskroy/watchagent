# WatchAgent Deployment Process

This document provides step-by-step instructions for deploying code changes to production at https://watchagent.tapaskroy.com

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Deployment Overview](#deployment-overview)
3. [Step 1: Git Commit and Push](#step-1-git-commit-and-push)
4. [Step 2: Trigger AWS CodeBuild](#step-2-trigger-aws-codebuild)
5. [Step 3: Deploy to ECS](#step-3-deploy-to-ecs)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedure](#rollback-procedure)

---

## Prerequisites

### Required Tools
- Git CLI
- AWS CLI v2 (configured with credentials)
- Access to AWS account with appropriate permissions
- Permissions for:
  - CodeBuild: `codebuild:StartBuild`, `codebuild:BatchGetBuilds`
  - ECS: `ecs:UpdateService`, `ecs:DescribeServices`
  - CloudWatch Logs: `logs:GetLogEvents`, `logs:FilterLogEvents`

### AWS Configuration
```bash
# Verify AWS CLI is configured
aws sts get-caller-identity

# Should show your AWS account and user information
```

### Environment Details
- **Region**: us-east-1
- **CodeBuild Project**: watchagent-prod-docker-build
- **ECS Cluster**: watchagent-prod-cluster
- **ECS Services**:
  - watchagent-prod-api
  - watchagent-prod-web
- **ECR Repositories**:
  - watchagent-prod-api
  - watchagent-prod-web

---

## Deployment Overview

The deployment process consists of three main steps:

```
Local Changes → GitHub → AWS CodeBuild → ECR → ECS Production
```

1. **Commit & Push**: Code changes are committed to the `main` branch on GitHub
2. **Build**: AWS CodeBuild builds Docker images and pushes to ECR
3. **Deploy**: ECS services are updated to pull and run new images

**Total Time**: ~5-7 minutes from commit to production

---

## Step 1: Git Commit and Push

### 1.1 Check Status
```bash
cd /Users/tapas/code/watchagent
git status
```

### 1.2 Review Changes
```bash
# View diff for specific files
git diff apps/api/src/path/to/file.ts
git diff apps/web/src/path/to/file.tsx

# View all diffs
git diff
```

### 1.3 Stage Files
```bash
# Stage specific files
git add apps/api/src/path/to/file.ts
git add apps/web/src/path/to/file.tsx
git add packages/shared/src/types/file.ts

# Or stage all changes (use with caution)
git add .
```

### 1.4 Commit with Descriptive Message
```bash
git commit -m "$(cat <<'EOF'
feat: Brief description of the feature or fix

Detailed explanation of changes:
- What was changed
- Why it was changed
- Any important implementation details

**API Changes:**
- List API modifications if applicable

**UI Changes:**
- List UI modifications if applicable

**Bug Fixes:**
- List bugs fixed if applicable

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

**Commit Message Guidelines:**
- Start with type: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
- First line should be 50-72 characters
- Use bullet points for detailed changes
- Include Co-Authored-By line when working with AI

### 1.5 Push to GitHub
```bash
git push origin main
```

**Expected Output:**
```
To https://github.com/tapaskroy/watchagent.git
   abc1234..def5678  main -> main
```

---

## Step 2: Trigger AWS CodeBuild

### 2.1 Start Build
```bash
aws codebuild start-build \
  --project-name watchagent-prod-docker-build \
  --region us-east-1
```

**Expected Output:**
```json
{
    "build": {
        "id": "watchagent-prod-docker-build:XXXX-XXXX-...",
        "buildNumber": 53,
        "buildStatus": "IN_PROGRESS",
        ...
    }
}
```

**Important**: Save the build ID from the output for monitoring.

### 2.2 Monitor Build Progress
```bash
# Replace BUILD_ID with the actual ID from step 2.1
BUILD_ID="watchagent-prod-docker-build:XXXX-XXXX-XXXX"

while true; do
  STATUS=$(aws codebuild batch-get-builds \
    --ids "$BUILD_ID" \
    --region us-east-1 \
    --query 'builds[0].[buildStatus,currentPhase]' \
    --output text)

  echo "$(date '+%Y-%m-%d %H:%M:%S') - Status: $STATUS"

  BUILD_STATUS=$(echo "$STATUS" | awk '{print $1}')

  if [ "$BUILD_STATUS" != "IN_PROGRESS" ]; then
    echo "Build completed with status: $BUILD_STATUS"
    break
  fi

  sleep 10
done
```

**Build Phases:**
1. SUBMITTED → QUEUED
2. QUEUED → PROVISIONING
3. PROVISIONING → PRE_BUILD
4. PRE_BUILD → BUILD (builds Docker images)
5. BUILD → POST_BUILD (pushes to ECR)
6. POST_BUILD → COMPLETED

**Expected Duration**: 3-4 minutes

### 2.3 Check Build Status
If the build **SUCCEEDS**, proceed to Step 3.

If the build **FAILS**, check the logs:
```bash
# View recent logs
aws logs tail "/aws/codebuild/watchagent-prod-docker-build" \
  --since 10m \
  --format short \
  --region us-east-1 \
  2>&1 | grep -i "error\|failed"
```

**Common Build Failures:**
- TypeScript compilation errors
- Linting errors (ESLint)
- Docker build failures
- Missing environment variables

See [Troubleshooting](#troubleshooting) section for solutions.

---

## Step 3: Deploy to ECS

Once the build succeeds, deploy the new images to production.

### 3.1 Update API Service
```bash
aws ecs update-service \
  --cluster watchagent-prod-cluster \
  --service watchagent-prod-api \
  --force-new-deployment \
  --region us-east-1 \
  --query 'service.[serviceName,status,desiredCount]' \
  --output text
```

**Expected Output:**
```
watchagent-prod-api	ACTIVE	1
```

### 3.2 Update Web Service
```bash
aws ecs update-service \
  --cluster watchagent-prod-cluster \
  --service watchagent-prod-web \
  --force-new-deployment \
  --region us-east-1 \
  --query 'service.[serviceName,status,desiredCount]' \
  --output text
```

**Expected Output:**
```
watchagent-prod-web	ACTIVE	1
```

### 3.3 Monitor Deployment Progress
```bash
while true; do
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="

  # Check API service
  API_STATUS=$(aws ecs describe-services \
    --cluster watchagent-prod-cluster \
    --services watchagent-prod-api \
    --region us-east-1 \
    --query 'services[0].[runningCount,desiredCount,deployments[0].status]' \
    --output text)
  echo "API Service: $API_STATUS"

  # Check Web service
  WEB_STATUS=$(aws ecs describe-services \
    --cluster watchagent-prod-cluster \
    --services watchagent-prod-web \
    --region us-east-1 \
    --query 'services[0].[runningCount,desiredCount,deployments[0].status]' \
    --output text)
  echo "Web Service: $WEB_STATUS"

  # Check if both services have running count = desired count
  API_RUNNING=$(echo "$API_STATUS" | awk '{print $1}')
  API_DESIRED=$(echo "$API_STATUS" | awk '{print $2}')
  WEB_RUNNING=$(echo "$WEB_STATUS" | awk '{print $1}')
  WEB_DESIRED=$(echo "$WEB_STATUS" | awk '{print $2}')

  if [ "$API_RUNNING" = "$API_DESIRED" ] && [ "$WEB_RUNNING" = "$WEB_DESIRED" ]; then
    # Check if there's only one deployment (primary) for each
    API_DEPLOYMENTS=$(aws ecs describe-services \
      --cluster watchagent-prod-cluster \
      --services watchagent-prod-api \
      --region us-east-1 \
      --query 'length(services[0].deployments)' \
      --output text)
    WEB_DEPLOYMENTS=$(aws ecs describe-services \
      --cluster watchagent-prod-cluster \
      --services watchagent-prod-web \
      --region us-east-1 \
      --query 'length(services[0].deployments)' \
      --output text)

    if [ "$API_DEPLOYMENTS" = "1" ] && [ "$WEB_DEPLOYMENTS" = "1" ]; then
      echo ""
      echo "✅ Deployment completed successfully!"
      echo "API Service: $API_RUNNING/$API_DESIRED tasks running"
      echo "Web Service: $WEB_RUNNING/$WEB_DESIRED tasks running"
      break
    fi
  fi

  echo ""
  sleep 15
done
```

**Deployment Process:**
1. ECS starts new tasks with the latest images
2. New tasks register with load balancer health checks
3. Once healthy, old tasks are drained and stopped
4. Deployment is complete when only new tasks are running

**Expected Duration**: 2-3 minutes per service

---

## Verification

### 4.1 Verify Service Status
```bash
aws ecs describe-services \
  --cluster watchagent-prod-cluster \
  --services watchagent-prod-api watchagent-prod-web \
  --region us-east-1 \
  --query 'services[*].[serviceName,status,runningCount,desiredCount,deployments[0].rolloutState]' \
  --output table
```

**Expected Output:**
```
----------------------------------------------------------
|                    DescribeServices                    |
+----------------------+---------+----+----+-------------+
|  watchagent-prod-api |  ACTIVE |  1 |  1 |  COMPLETED  |
|  watchagent-prod-web |  ACTIVE |  1 |  1 |  COMPLETED  |
+----------------------+---------+----+----+-------------+
```

### 4.2 Test Production Site
1. Open browser: https://watchagent.tapaskroy.com
2. Verify the site loads correctly
3. Test key functionality:
   - Login/Authentication
   - Browse page
   - Recommendations page
   - Feedback submission
   - Any specific features you just deployed

### 4.3 Check Application Logs
```bash
# Get task IDs
API_TASK=$(aws ecs list-tasks \
  --cluster watchagent-prod-cluster \
  --service-name watchagent-prod-api \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text | cut -d'/' -f3)

WEB_TASK=$(aws ecs list-tasks \
  --cluster watchagent-prod-cluster \
  --service-name watchagent-prod-web \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text | cut -d'/' -f3)

# Check API logs
aws logs tail "/ecs/watchagent-prod-api" \
  --since 5m \
  --format short \
  --region us-east-1

# Check Web logs
aws logs tail "/ecs/watchagent-prod-web" \
  --since 5m \
  --format short \
  --region us-east-1
```

Look for:
- ✅ No errors in startup logs
- ✅ Successful connections to database
- ✅ Successful connections to Redis
- ✅ API responding to health checks

---

## Troubleshooting

### Build Failures

#### TypeScript Compilation Error
**Error**: `error TS2322: Type 'X' is not assignable to type 'Y'`

**Solution**:
1. Fix the TypeScript error locally
2. Run `npm run build` to verify it compiles
3. Commit and push the fix
4. Trigger a new build

#### ESLint Error
**Error**: `'variableName' is assigned a value but never used`

**Solution**:
1. Remove unused variables or prefix with underscore `_variableName`
2. Or add `// eslint-disable-next-line` comment if intentional
3. Commit and push
4. Trigger a new build

#### Docker Build Timeout
**Error**: Build times out during `npm install`

**Solution**:
1. Check for network issues in AWS CodeBuild
2. Retry the build (transient issue)
3. If persistent, investigate package.json dependencies

### Deployment Failures

#### Service Won't Stabilize
**Error**: Deployment stuck with 2 tasks running (old + new)

**Causes**:
- New task failing health checks
- New task crashing on startup
- Resource constraints (CPU/Memory)

**Solution**:
```bash
# Check task logs for errors
aws logs tail "/ecs/watchagent-prod-api" \
  --since 10m \
  --format short \
  --region us-east-1 | grep -i error

# Check task health
aws ecs describe-tasks \
  --cluster watchagent-prod-cluster \
  --tasks $TASK_ARN \
  --region us-east-1
```

#### Database Connection Errors
**Error**: `Error: connect ECONNREFUSED` or `Connection timeout`

**Solution**:
1. Verify security groups allow ECS tasks to reach RDS
2. Check environment variables in task definition
3. Verify database credentials in AWS Secrets Manager

---

## Rollback Procedure

If the deployment introduces critical issues, rollback to the previous version.

### Option 1: Rollback via ECS (Recommended)

**Step 1**: Find the previous task definition revision
```bash
aws ecs describe-services \
  --cluster watchagent-prod-cluster \
  --services watchagent-prod-api \
  --region us-east-1 \
  --query 'services[0].taskDefinition'
```

**Step 2**: List recent task definition revisions
```bash
# For API
aws ecs list-task-definitions \
  --family-prefix watchagent-prod-api \
  --sort DESC \
  --max-items 5 \
  --region us-east-1

# For Web
aws ecs list-task-definitions \
  --family-prefix watchagent-prod-web \
  --sort DESC \
  --max-items 5 \
  --region us-east-1
```

**Step 3**: Update service to use previous revision
```bash
# Replace :N with the previous revision number
aws ecs update-service \
  --cluster watchagent-prod-cluster \
  --service watchagent-prod-api \
  --task-definition watchagent-prod-api:N \
  --region us-east-1

aws ecs update-service \
  --cluster watchagent-prod-cluster \
  --service watchagent-prod-web \
  --task-definition watchagent-prod-web:N \
  --region us-east-1
```

### Option 2: Rollback via Git and Rebuild

**Step 1**: Revert the commit
```bash
# Find the commit to revert
git log --oneline -10

# Revert specific commit
git revert COMMIT_HASH

# Or reset to previous commit (more destructive)
git reset --hard COMMIT_HASH
git push --force origin main
```

**Step 2**: Rebuild and deploy using Steps 2 and 3 above

---

## Quick Reference Commands

### One-Command Deployment (After Git Push)
```bash
# Start build and wait for completion
BUILD_OUTPUT=$(aws codebuild start-build --project-name watchagent-prod-docker-build --region us-east-1)
BUILD_ID=$(echo $BUILD_OUTPUT | jq -r '.build.id')

# Wait for build
while true; do
  STATUS=$(aws codebuild batch-get-builds --ids "$BUILD_ID" --region us-east-1 --query 'builds[0].buildStatus' --output text)
  echo "Build Status: $STATUS"
  [ "$STATUS" != "IN_PROGRESS" ] && break
  sleep 10
done

# If build succeeded, deploy
if [ "$STATUS" = "SUCCEEDED" ]; then
  aws ecs update-service --cluster watchagent-prod-cluster --service watchagent-prod-api --force-new-deployment --region us-east-1
  aws ecs update-service --cluster watchagent-prod-cluster --service watchagent-prod-web --force-new-deployment --region us-east-1
  echo "✅ Deployment triggered!"
else
  echo "❌ Build failed, skipping deployment"
fi
```

### Check Everything is Running
```bash
aws ecs describe-services \
  --cluster watchagent-prod-cluster \
  --services watchagent-prod-api watchagent-prod-web \
  --region us-east-1 \
  --query 'services[*].[serviceName,runningCount,desiredCount,deployments[0].rolloutState]' \
  --output table
```

### View Recent Logs
```bash
# API logs
aws logs tail "/ecs/watchagent-prod-api" --since 10m --region us-east-1

# Web logs
aws logs tail "/ecs/watchagent-prod-web" --since 10m --region us-east-1
```

---

## AI Agent Instructions

When asked to "deploy to production" or "checkin and deploy", follow this exact sequence:

1. **Verify Changes**
   ```bash
   git status
   git diff
   ```

2. **Stage and Commit**
   ```bash
   git add [files]
   git commit -m "descriptive message"
   git push origin main
   ```

3. **Trigger Build**
   ```bash
   aws codebuild start-build --project-name watchagent-prod-docker-build --region us-east-1
   ```
   Save the build ID from the response.

4. **Monitor Build**
   Use the monitoring script in Section 2.2 with the build ID.
   Wait until status is SUCCEEDED or FAILED.

5. **If Build Succeeds, Deploy**
   ```bash
   aws ecs update-service --cluster watchagent-prod-cluster --service watchagent-prod-api --force-new-deployment --region us-east-1
   aws ecs update-service --cluster watchagent-prod-cluster --service watchagent-prod-web --force-new-deployment --region us-east-1
   ```

6. **Monitor Deployment**
   Use the monitoring script in Section 3.3.
   Wait until both services show COMPLETED rollout state.

7. **Verify**
   ```bash
   aws ecs describe-services --cluster watchagent-prod-cluster --services watchagent-prod-api watchagent-prod-web --region us-east-1 --query 'services[*].[serviceName,status,runningCount,desiredCount,deployments[0].rolloutState]' --output table
   ```

8. **Report Results**
   Inform the user:
   - Build number and status
   - Deployment status for both services
   - Production URL: https://watchagent.tapaskroy.com

**Important**: Always wait for each step to complete before proceeding to the next.

---

## Checklist

Use this checklist for each deployment:

- [ ] Local testing completed
- [ ] Git status reviewed
- [ ] Changes committed with descriptive message
- [ ] Changes pushed to GitHub main branch
- [ ] AWS CodeBuild triggered (note build number: ___)
- [ ] Build completed successfully
- [ ] ECS API service updated
- [ ] ECS Web service updated
- [ ] Deployment monitoring completed
- [ ] Both services showing COMPLETED rollout
- [ ] Production site tested: https://watchagent.tapaskroy.com
- [ ] Key features verified working
- [ ] No errors in production logs

---

## Support and Resources

- **AWS Console**: https://console.aws.amazon.com/
- **CodeBuild Console**: https://console.aws.amazon.com/codesuite/codebuild/projects/watchagent-prod-docker-build
- **ECS Console**: https://console.aws.amazon.com/ecs/v2/clusters/watchagent-prod-cluster
- **GitHub Repository**: https://github.com/tapaskroy/watchagent
- **Production Site**: https://watchagent.tapaskroy.com

For issues or questions, refer to this document first, then escalate if needed.

---

**Last Updated**: 2026-02-10
**Document Version**: 1.1
