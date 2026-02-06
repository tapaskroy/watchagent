# GitHub Actions Workflows

This directory contains CI/CD workflows for automated building, testing, and deployment.

## Workflows

### 1. CI - Build and Test (`ci.yml`)

**Trigger**: Pull requests and pushes to `develop` branch

**Purpose**: Validate code quality and ensure builds work

**Steps**:
- Lint code
- Run unit tests
- Build all packages
- Test Docker builds

**Usage**: Automatically runs on every PR. No manual action required.

---

### 2. Deploy to AWS (`deploy.yml`)

**Trigger**:
- Automatically on push to `main` branch
- Manually via GitHub Actions UI

**Purpose**: Build Docker images and deploy to AWS ECS

**Steps**:
1. Build Docker images for API and Web
2. Push images to Amazon ECR
3. Update ECS services with new images
4. Wait for deployment to stabilize

**Manual Trigger**:
1. Go to Actions tab in GitHub
2. Select "Deploy to AWS" workflow
3. Click "Run workflow"
4. Choose environment (prod/staging)

**Required Secrets**:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `TMDB_API_KEY`
- `OMDB_API_KEY`
- `ANTHROPIC_API_KEY`

---

### 3. Terraform Infrastructure (`terraform.yml`)

**Trigger**: Manual via GitHub Actions UI only

**Purpose**: Manage AWS infrastructure with Terraform

**Actions**:
- `plan`: Preview infrastructure changes
- `apply`: Create/update infrastructure
- `destroy`: Destroy all infrastructure

**Manual Trigger**:
1. Go to Actions tab in GitHub
2. Select "Terraform Infrastructure" workflow
3. Click "Run workflow"
4. Choose action (plan/apply/destroy)

**Required Secrets**: Same as Deploy workflow

---

## Setting Up GitHub Secrets

### Required Secrets

1. **AWS Credentials** (for deployment)
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key

2. **API Keys** (for application)
   - `TMDB_API_KEY`: The Movie Database API key
   - `OMDB_API_KEY`: Open Movie Database API key
   - `ANTHROPIC_API_KEY`: Anthropic Claude API key

### How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each secret with the exact name and value

### AWS IAM User Setup

Create an IAM user for GitHub Actions with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:*",
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

For Terraform workflow, add additional permissions:
- Full access to VPC, RDS, ElastiCache, ECS, EC2, Route53, ACM, IAM, Secrets Manager

**Security Best Practice**: Use separate IAM users for:
- Deployment only (limited permissions)
- Infrastructure management (Terraform permissions)

---

## Deployment Flow

### Development Flow

```
1. Create feature branch
   ↓
2. Make changes
   ↓
3. Create Pull Request
   ↓
4. CI runs automatically (lint, test, build)
   ↓
5. Merge to main
   ↓
6. Deploy workflow runs automatically
   ↓
7. Application deployed to AWS
```

### Infrastructure Changes

```
1. Modify Terraform files
   ↓
2. Run Terraform Plan workflow
   ↓
3. Review plan output
   ↓
4. Run Terraform Apply workflow
   ↓
5. Infrastructure updated
```

---

## Environments

GitHub Environments allow you to:
- Require manual approval before deployment
- Set environment-specific secrets
- Limit which branches can deploy

### Setting Up Environments

1. Go to **Settings** > **Environments**
2. Create environment named `prod`
3. Configure protection rules:
   - ✅ Required reviewers (recommended for prod)
   - ✅ Wait timer (optional delay before deployment)
   - ✅ Deployment branches: Only `main` branch

---

## Monitoring Deployments

### View Deployment Status

1. Go to **Actions** tab
2. Click on the running/completed workflow
3. View detailed logs for each step

### Check ECS Deployment

```bash
# View ECS service status
aws ecs describe-services \
  --cluster watchagent-prod-cluster \
  --services watchagent-prod-api watchagent-prod-web

# View running tasks
aws ecs list-tasks \
  --cluster watchagent-prod-cluster \
  --service-name watchagent-prod-api
```

### View Logs

```bash
# API logs
aws logs tail /ecs/watchagent-prod-api --follow

# Web logs
aws logs tail /ecs/watchagent-prod-web --follow
```

---

## Troubleshooting

### Deployment Failed

1. **Check GitHub Actions logs** for error messages
2. **Check ECS events**:
   ```bash
   aws ecs describe-services --cluster watchagent-prod-cluster --services watchagent-prod-api
   ```
3. **Check CloudWatch logs** for application errors
4. **Verify secrets** are correctly set in GitHub

### Image Push Failed

- **Verify ECR permissions** for the IAM user
- **Check ECR repository exists**
- **Ensure AWS credentials are valid**

### Service Update Timeout

- **Check health check** configuration in ECS task definition
- **View CloudWatch logs** for application startup errors
- **Increase timeout** in workflow if needed

---

## Cost Optimization

### GitHub Actions Minutes

- Free tier: 2,000 minutes/month for private repos
- Each deployment takes ~5-10 minutes
- Consider:
  - Deploying only on specific branches
  - Using manual triggers for non-critical deployments
  - Optimizing Docker build caching

### AWS Costs

- Each deployment triggers new task launches
- Consider:
  - Deploying during off-peak hours
  - Batching multiple changes
  - Using blue/green deployments for zero-downtime

---

## Best Practices

1. **Always run plan before apply** for Terraform changes
2. **Use pull request reviews** before merging to main
3. **Monitor deployment metrics** after each release
4. **Keep secrets rotated** every 90 days
5. **Test in staging** before deploying to production (if staging environment exists)
6. **Tag releases** with semantic versioning
7. **Document breaking changes** in PR descriptions

---

## Future Enhancements

- [ ] Add staging environment workflow
- [ ] Implement blue/green deployment strategy
- [ ] Add automated rollback on health check failure
- [ ] Integrate with Slack/Discord for deployment notifications
- [ ] Add database migration workflow
- [ ] Implement canary deployments
- [ ] Add performance testing in CI pipeline
