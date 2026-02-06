# Quick Start Guide

Get WatchAgent running in production in 30 minutes.

## Prerequisites Checklist

- [ ] AWS account created
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Docker installed and running
- [ ] Terraform installed (>= 1.0)
- [ ] Node.js 20+ installed
- [ ] Git installed
- [ ] Domain: tapaskroy.me accessible
- [ ] API keys obtained:
  - [ ] TMDB API key
  - [ ] OMDB API key
  - [ ] Anthropic API key

## Step-by-Step Deployment

### 1. Clone and Setup (5 minutes)

```bash
# Clone repository (or use your existing code)
cd /Users/tapas/code/watchagent

# Setup local environment files
./scripts/setup-env.sh

# Edit and add your API keys
nano apps/api/.env
# Update TMDB_API_KEY, OMDB_API_KEY, ANTHROPIC_API_KEY
```

### 2. Test Locally (5 minutes)

```bash
# Start local databases
./scripts/local-env.sh start

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start the application
npm run dev

# Test in browser: http://localhost:3001
# API health: http://localhost:3000/health
```

### 3. Deploy AWS Infrastructure (20-30 minutes)

```bash
cd terraform

# Set your API keys as environment variables
export TF_VAR_tmdb_api_key="your_key_here"
export TF_VAR_omdb_api_key="your_key_here"
export TF_VAR_anthropic_api_key="your_key_here"

# Initialize Terraform
terraform init

# Review what will be created
terraform plan

# Deploy infrastructure (type 'yes' when prompted)
terraform apply

# Save outputs
terraform output > ../infrastructure-outputs.txt
cd ..
```

### 4. Configure DNS (5 minutes + 24-48 hours for propagation)

```bash
# Get nameservers
cd terraform
terraform output nameservers

# Update in Squarespace:
# Settings > Domains > DNS Settings
# Set custom nameservers to the 4 nameservers from output
```

### 5. Build and Deploy Application (15 minutes)

```bash
# From project root
cd /Users/tapas/code/watchagent

# Build and push Docker images to AWS
./scripts/build-and-push.sh prod

# Deploy to ECS
./scripts/deploy-ecs.sh prod

# Wait for deployment to complete...
```

### 6. Verify Deployment (2 minutes)

```bash
# Test API (may take a few minutes for DNS)
curl https://api.watchagent.tapaskroy.me/health

# Open web app in browser
open https://watchagent.tapaskroy.me
```

### 7. Setup GitHub for Auto-Deployment (10 minutes)

```bash
# Create GitHub repository
# Go to https://github.com/new

# Push code
git remote add origin https://github.com/YOUR_USERNAME/watchagent.git
git add .
git commit -m "Initial deployment"
git push -u origin main

# Add GitHub Secrets (in repo Settings > Secrets):
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - TMDB_API_KEY
# - OMDB_API_KEY
# - ANTHROPIC_API_KEY
```

## You're Done! 🎉

Your application is now:
- ✅ Running on AWS ECS with auto-scaling
- ✅ Using managed PostgreSQL and Redis
- ✅ Secured with HTTPS (SSL certificate)
- ✅ Accessible at https://watchagent.tapaskroy.me
- ✅ Auto-deploying when you push to main branch

## Next Steps

1. **Invite testers**: Share https://watchagent.tapaskroy.me
2. **Monitor**: Check logs with `aws logs tail /ecs/watchagent-prod-api --follow`
3. **Update**: Push changes to GitHub main branch for auto-deployment

## Common Commands

```bash
# View logs
aws logs tail /ecs/watchagent-prod-api --follow
aws logs tail /ecs/watchagent-prod-web --follow

# Redeploy
./scripts/build-and-push.sh prod && ./scripts/deploy-ecs.sh prod

# Check service status
aws ecs describe-services \
  --cluster watchagent-prod-cluster \
  --services watchagent-prod-api watchagent-prod-web
```

## Troubleshooting

### DNS not resolving
- Wait 24-48 hours for propagation
- Check nameservers: `dig watchagent.tapaskroy.me NS`

### Application not accessible
- Check ECS services are running
- View logs for errors
- Verify security groups allow traffic

### Deployment failed
- Check GitHub Actions logs
- View ECS service events
- Check CloudWatch logs

## Full Documentation

- Detailed deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Security practices: [SECURITY.md](./SECURITY.md)
- Terraform docs: [terraform/README.md](./terraform/README.md)
- GitHub Actions: [.github/workflows/README.md](./.github/workflows/README.md)

## Estimated Costs

- **Development**: ~$80-110/month
- **Production**: ~$200-250/month

Major costs:
- NAT Gateway: ~$32-64/month
- ECS Fargate: ~$15-60/month
- RDS: ~$15-60/month
- ALB: ~$16/month
- ElastiCache: ~$15-30/month

## Support

For help:
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
2. Review AWS CloudWatch logs
3. Create GitHub issue
