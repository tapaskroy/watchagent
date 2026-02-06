# WatchAgent Deployment Guide

Complete guide to deploying WatchAgent to AWS and managing it in production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Security Setup](#security-setup)
3. [AWS Infrastructure Setup](#aws-infrastructure-setup)
4. [Domain Configuration](#domain-configuration)
5. [First Deployment](#first-deployment)
6. [GitHub Setup](#github-setup)
7. [Automated Deployments](#automated-deployments)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

Install these tools on your local machine:

```bash
# Node.js 20+
node --version  # Should be 20.x.x

# Docker
docker --version

# AWS CLI
aws --version

# Terraform
terraform --version  # Should be 1.0+

# Git
git --version
```

### AWS Account Setup

1. **Create/Login to AWS Account**
   - Go to https://aws.amazon.com/
   - Sign in or create a new account

2. **Create IAM User for Deployment**
   ```bash
   # Create user via AWS Console:
   # IAM > Users > Add User
   # User name: watchagent-deployer
   # Access type: Programmatic access
   ```

3. **Attach Required Policies**
   - AmazonECS_FullAccess
   - AmazonEC2ContainerRegistryFullAccess
   - AmazonVPCFullAccess
   - AmazonRDSFullAccess
   - ElastiCacheFullAccess
   - AmazonRoute53FullAccess
   - AWSCertificateManagerFullAccess
   - IAMFullAccess (for role creation)
   - SecretsManagerReadWrite

4. **Configure AWS CLI**
   ```bash
   aws configure
   # AWS Access Key ID: <your-access-key>
   # AWS Secret Access Key: <your-secret-key>
   # Default region: us-east-1
   # Default output format: json
   ```

### Required API Keys

Obtain these API keys before deployment:

1. **TMDB (The Movie Database)**
   - Go to https://www.themoviedb.org/settings/api
   - Create account and request API key
   - Free tier is sufficient

2. **OMDB (Open Movie Database)**
   - Go to http://www.omdbapi.com/apikey.aspx
   - Sign up for free API key

3. **Anthropic Claude**
   - Go to https://console.anthropic.com/
   - Create account and get API key
   - Requires payment method for production use

---

## Security Setup

### 1. Local Environment Variables

**CRITICAL: Never commit API keys to Git!**

```bash
# Set up local .env files
./scripts/setup-env.sh

# Edit the files and add your API keys
nano apps/api/.env
```

Update these values in `apps/api/.env`:
```env
TMDB_API_KEY=your_actual_tmdb_key
OMDB_API_KEY=your_actual_omdb_key
ANTHROPIC_API_KEY=your_actual_anthropic_key
JWT_ACCESS_SECRET=<generate with: openssl rand -hex 32>
JWT_REFRESH_SECRET=<generate with: openssl rand -hex 32>
```

### 2. Verify .gitignore

```bash
# Ensure .env files are ignored
git status

# Should NOT show any .env files
# If it does, they're in .gitignore
```

### 3. Test Locally

```bash
# Start local development environment
./scripts/local-env.sh start

# Run the application
npm run dev

# Test the API
curl http://localhost:3000/health
```

---

## AWS Infrastructure Setup

### Step 1: Prepare Terraform Variables

```bash
cd terraform

# Copy example tfvars
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

Update `terraform.tfvars`:
```hcl
aws_region  = "us-east-1"
environment = "prod"
domain_name = "tapaskroy.me"
subdomain   = "watchagent"
```

### Step 2: Set API Keys as Environment Variables

**DO NOT put API keys in terraform.tfvars!**

```bash
export TF_VAR_tmdb_api_key="your_tmdb_key"
export TF_VAR_omdb_api_key="your_omdb_key"
export TF_VAR_anthropic_api_key="your_anthropic_key"
```

Or create a local file (NOT committed):
```bash
# Create terraform/secrets.env (already in .gitignore)
cat > secrets.env <<EOF
export TF_VAR_tmdb_api_key="your_tmdb_key"
export TF_VAR_omdb_api_key="your_omdb_key"
export TF_VAR_anthropic_api_key="your_anthropic_key"
EOF

# Load secrets
source secrets.env
```

### Step 3: Initialize Terraform

```bash
terraform init
```

This will:
- Download required providers
- Set up the backend
- Prepare for deployment

### Step 4: Plan Infrastructure

```bash
terraform plan
```

Review the plan carefully. It will create:
- VPC with public/private/database subnets
- RDS PostgreSQL database
- ElastiCache Redis cluster
- ECS cluster and services
- Application Load Balancer
- ECR repositories
- Route53 records
- ACM SSL certificate
- Secrets Manager secrets

### Step 5: Apply Infrastructure

```bash
terraform apply
```

Type `yes` when prompted.

**Expected time: 20-30 minutes**

### Step 6: Save Terraform Outputs

```bash
# Save important outputs
terraform output > ../infrastructure-outputs.txt

# View specific outputs
terraform output alb_dns_name
terraform output ecr_api_repository_url
terraform output ecr_web_repository_url
terraform output nameservers
```

---

## Domain Configuration

### Option 1: Domain Registered with Squarespace

If your domain (`tapaskroy.me`) is registered with Squarespace:

1. **Get Route53 Nameservers**
   ```bash
   cd terraform
   terraform output nameservers
   ```

2. **Update Squarespace DNS**
   - Log in to Squarespace
   - Go to Settings > Domains
   - Click on `tapaskroy.me`
   - Go to DNS Settings
   - Under "Name Servers", select "Custom Name Servers"
   - Enter the 4 nameservers from Terraform output
   - Save changes

3. **Wait for DNS Propagation**
   - Can take 24-48 hours
   - Check status: `dig watchagent.tapaskroy.me`

### Option 2: Domain Already in Route53

If you already have a Route53 hosted zone:

1. **Update Terraform**
   ```bash
   # The terraform code will use the existing zone
   # Verify in terraform/route53.tf
   ```

2. **DNS records are created automatically**

### Verify SSL Certificate

```bash
# Check certificate status
aws acm list-certificates --region us-east-1

# Certificate should be "ISSUED" status
# If "PENDING_VALIDATION", wait for DNS propagation
```

---

## First Deployment

### Step 1: Build Docker Images

```bash
# From project root
./scripts/build-and-push.sh prod
```

This will:
- Authenticate with ECR
- Build API and Web Docker images
- Push images to ECR with multiple tags

**Expected time: 10-15 minutes**

### Step 2: Deploy to ECS

```bash
./scripts/deploy-ecs.sh prod
```

This will:
- Update ECS services with new images
- Wait for services to become stable
- Show deployment status

**Expected time: 5-10 minutes**

### Step 3: Verify Deployment

```bash
# Check ECS services
aws ecs describe-services \
  --cluster watchagent-prod-cluster \
  --services watchagent-prod-api watchagent-prod-web

# Check running tasks
aws ecs list-tasks --cluster watchagent-prod-cluster

# View API logs
aws logs tail /ecs/watchagent-prod-api --follow

# View Web logs
aws logs tail /ecs/watchagent-prod-web --follow
```

### Step 4: Test the Application

```bash
# Test API health
curl https://api.watchagent.tapaskroy.me/health

# Test Web application
curl https://watchagent.tapaskroy.me

# Or open in browser
open https://watchagent.tapaskroy.me
```

---

## GitHub Setup

### Step 1: Create GitHub Repository

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Create repository on GitHub
# Go to https://github.com/new

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/watchagent.git
git branch -M main
git push -u origin main
```

### Step 2: Add GitHub Secrets

Go to your repository on GitHub:
1. Click **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `TMDB_API_KEY` | Your TMDB API key |
| `OMDB_API_KEY` | Your OMDB API key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

### Step 3: Configure GitHub Environment

1. Go to **Settings** > **Environments**
2. Click **New environment**
3. Name it `prod`
4. Configure protection rules:
   - ✅ **Required reviewers** (optional, for approval before deploy)
   - ✅ **Deployment branches**: Only `main` branch

### Step 4: Test GitHub Actions

```bash
# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "Test GitHub Actions"
git push origin main

# Go to GitHub Actions tab to see deployment
```

---

## Automated Deployments

### Automatic Deployment on Push to Main

Every push to `main` branch automatically:
1. Builds Docker images
2. Pushes to ECR
3. Updates ECS services
4. Waits for deployment to complete

### Manual Deployment

1. Go to GitHub **Actions** tab
2. Select "Deploy to AWS" workflow
3. Click "Run workflow"
4. Choose environment (prod/staging)
5. Click "Run workflow"

### Deploying from Local Machine

```bash
# Build and push images
./scripts/build-and-push.sh prod

# Deploy to ECS
./scripts/deploy-ecs.sh prod
```

---

## Monitoring and Maintenance

### View Application Logs

```bash
# Real-time API logs
aws logs tail /ecs/watchagent-prod-api --follow

# Real-time Web logs
aws logs tail /ecs/watchagent-prod-web --follow

# Logs from specific time range
aws logs filter-log-events \
  --log-group-name /ecs/watchagent-prod-api \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

### Monitor ECS Services

```bash
# Service status
aws ecs describe-services \
  --cluster watchagent-prod-cluster \
  --services watchagent-prod-api watchagent-prod-web

# Running tasks
aws ecs list-tasks --cluster watchagent-prod-cluster

# Task details
aws ecs describe-tasks \
  --cluster watchagent-prod-cluster \
  --tasks <task-id>
```

### CloudWatch Dashboards

Access CloudWatch in AWS Console:
- Metrics: ECS CPU, Memory, Network
- Alarms: Set up alerts for high CPU/Memory
- Logs Insights: Query application logs

### Database Monitoring

```bash
# RDS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=watchagent-prod-db \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### Scaling

Auto-scaling is configured for both API and Web services:
- Scales up when CPU > 70%
- Scales down when CPU < 30%
- Min tasks: 1
- Max tasks: 4

To adjust:
```bash
cd terraform
# Edit variables.tf for min/max values
# Apply changes
terraform apply
```

### Cost Monitoring

```bash
# View current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost
```

Set up AWS Budget alerts:
1. Go to AWS Console > Billing > Budgets
2. Create budget for monthly spending
3. Set alert threshold (e.g., $100/month)

---

## Troubleshooting

### Deployment Fails

1. **Check GitHub Actions logs**
   - Go to Actions tab
   - Click on failed workflow
   - Review error messages

2. **Check ECS service events**
   ```bash
   aws ecs describe-services \
     --cluster watchagent-prod-cluster \
     --services watchagent-prod-api \
     | grep -A 20 "events"
   ```

3. **Check task stopped reason**
   ```bash
   aws ecs describe-tasks \
     --cluster watchagent-prod-cluster \
     --tasks <task-id>
   ```

### Application Not Accessible

1. **Check ALB health**
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn <target-group-arn>
   ```

2. **Verify DNS**
   ```bash
   dig watchagent.tapaskroy.me
   dig api.watchagent.tapaskroy.me
   ```

3. **Check SSL certificate**
   ```bash
   openssl s_client -connect watchagent.tapaskroy.me:443
   ```

### Database Connection Issues

1. **Verify security groups**
   - ECS tasks should have access to RDS security group

2. **Check RDS endpoint**
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier watchagent-prod-db
   ```

3. **Test connection from ECS task**
   ```bash
   # Use ECS Exec to connect to running task
   aws ecs execute-command \
     --cluster watchagent-prod-cluster \
     --task <task-id> \
     --container api \
     --interactive \
     --command "/bin/sh"
   ```

### High Costs

1. **Check NAT Gateway usage** (largest cost)
   - Consider single NAT for non-prod environments

2. **Check ECS task count**
   - Reduce desired count if not needed

3. **Check RDS instance size**
   - Use db.t3.micro for development

4. **Enable RDS storage autoscaling**
   - Prevents over-provisioning

### Secrets Not Loading

1. **Verify Secrets Manager**
   ```bash
   aws secretsmanager list-secrets
   ```

2. **Check IAM permissions**
   - ECS task execution role needs secretsmanager:GetSecretValue

3. **View task definition**
   ```bash
   aws ecs describe-task-definition \
     --task-definition watchagent-prod-api
   ```

---

## Rollback

### Rollback to Previous Version

```bash
# List recent images
aws ecr describe-images \
  --repository-name watchagent-prod-api \
  --query 'sort_by(imageDetails,& imagePushedAt)[-5:]'

# Update task definition with specific image tag
# Then force new deployment
./scripts/deploy-ecs.sh prod
```

### Emergency Rollback

```bash
# Scale down to 0
aws ecs update-service \
  --cluster watchagent-prod-cluster \
  --service watchagent-prod-api \
  --desired-count 0

# Investigate issue

# Scale back up
aws ecs update-service \
  --cluster watchagent-prod-cluster \
  --service watchagent-prod-api \
  --desired-count 2
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review CloudWatch logs for errors
- Check application metrics
- Monitor costs

**Monthly:**
- Review and rotate secrets
- Update dependencies
- Review security patches

**Quarterly:**
- Review and optimize infrastructure costs
- Update Terraform modules
- Security audit

### Updating Infrastructure

```bash
cd terraform

# Make changes to .tf files
nano vpc.tf

# Plan changes
terraform plan

# Apply changes
terraform apply
```

### Database Backups

RDS automatically creates:
- Daily snapshots (retained 7 days)
- Point-in-time recovery

Manual snapshot:
```bash
aws rds create-db-snapshot \
  --db-instance-identifier watchagent-prod-db \
  --db-snapshot-identifier watchagent-manual-$(date +%Y%m%d)
```

---

## Complete Teardown

To completely remove all AWS resources:

```bash
cd terraform

# This will DELETE EVERYTHING including database!
terraform destroy

# Type 'yes' when prompted
```

**WARNING**: This is irreversible and will delete all data!

---

## Support and Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Terraform AWS Provider**: https://registry.terraform.io/providers/hashicorp/aws
- **GitHub Actions**: https://docs.github.com/en/actions
- **Project Repository**: https://github.com/YOUR_USERNAME/watchagent

For issues, create a GitHub issue or contact the maintainers.
