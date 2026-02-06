# WatchAgent - Deployment & Production Setup

This document provides an overview of the deployment architecture and quick links.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                             │
│                                                              │
│  ┌──────────────────┐                                       │
│  │   Route53 DNS    │                                       │
│  │  + SSL (ACM)     │                                       │
│  └────────┬─────────┘                                       │
│           │                                                  │
│  ┌────────▼─────────┐         ┌──────────────┐            │
│  │  Load Balancer   │────────▶│ ECS Fargate  │            │
│  │  (ALB)           │         │              │            │
│  └──────────────────┘         │ ┌──────────┐ │            │
│                                │ │ API Task │ │            │
│                                │ └──────────┘ │            │
│                                │              │            │
│                                │ ┌──────────┐ │            │
│                                │ │ Web Task │ │            │
│  ┌──────────────┐             │ └──────────┘ │            │
│  │     ECR      │────────────▶│              │            │
│  │ (Docker      │             │ Auto-Scaling │            │
│  │  Registry)   │             │ 1-4 tasks    │            │
│  └──────────────┘             └──────┬───────┘            │
│                                       │                     │
│  ┌──────────────┐              ┌─────▼──────┐            │
│  │   Secrets    │              │            │             │
│  │   Manager    │──────────────▶ Private    │             │
│  │              │              │  Subnet    │             │
│  └──────────────┘              │            │             │
│                                 │ ┌────────┐│             │
│                                 │ │  RDS   ││             │
│                                 │ │Postgres││             │
│                                 │ └────────┘│             │
│                                 │            │             │
│                                 │ ┌────────┐│             │
│                                 │ │ Redis  ││             │
│                                 │ │ElastiC.││             │
│                                 │ └────────┘│             │
│                                 └───────────┘             │
│                                                            │
└────────────────────────────────────────────────────────────┘

External Integration:
  ├─ TMDB API (Movie data)
  ├─ OMDB API (Additional metadata)
  └─ Anthropic API (LLM recommendations)

GitHub Actions CI/CD:
  Push to main → Build → ECR → ECS Deploy
```

## Quick Links

| Document | Purpose |
|----------|---------|
| [QUICK_START.md](./QUICK_START.md) | 30-minute deployment guide |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Complete deployment documentation |
| [SECURITY.md](./SECURITY.md) | Security best practices |
| [terraform/README.md](./terraform/README.md) | Infrastructure as Code docs |
| [.github/workflows/README.md](./.github/workflows/README.md) | CI/CD pipeline docs |

## Deployment Options

### 1. Manual Deployment from Local Machine

```bash
# One-time infrastructure setup
cd terraform
terraform init
terraform apply

# Build and deploy application
cd ..
./scripts/build-and-push.sh prod
./scripts/deploy-ecs.sh prod
```

**Use when**: Initial setup, major infrastructure changes

### 2. Automated Deployment via GitHub Actions

```bash
# Push to main branch
git push origin main

# Automatic deployment starts
# View progress in GitHub Actions tab
```

**Use when**: Regular application updates, continuous deployment

### 3. Manual Deployment via GitHub Actions

```bash
# Go to GitHub > Actions > "Deploy to AWS"
# Click "Run workflow" > Select environment > Run
```

**Use when**: Deploying to staging, controlled production releases

## Technology Stack

### Infrastructure
- **Cloud Provider**: AWS
- **Container Orchestration**: ECS Fargate
- **Load Balancer**: Application Load Balancer (ALB)
- **DNS**: Route53
- **SSL**: AWS Certificate Manager (ACM)
- **Infrastructure as Code**: Terraform

### Application
- **Backend**: Node.js, Fastify
- **Frontend**: Next.js, React
- **Database**: PostgreSQL (RDS)
- **Cache**: Redis (ElastiCache)
- **Container Registry**: Amazon ECR

### CI/CD
- **Automation**: GitHub Actions
- **Secrets Management**: AWS Secrets Manager + GitHub Secrets
- **Monitoring**: CloudWatch Logs & Metrics

## Environments

| Environment | Domain | Branch | Auto-Deploy |
|-------------|--------|--------|-------------|
| Production | watchagent.tapaskroy.me | main | ✅ Yes |
| Staging | (optional) | develop | ⚙️ Manual |
| Local Dev | localhost:3001 | any | 🏠 Manual |

## Cost Breakdown

### Production (~$200-250/month)
- NAT Gateways (2 AZs): $64/month
- Application Load Balancer: $16/month
- ECS Fargate (4 tasks): $30-60/month
- RDS db.t3.small Multi-AZ: $60/month
- ElastiCache: $30/month
- Data transfer: $10-20/month

### Development (~$80-110/month)
- NAT Gateway (single): $32/month
- Application Load Balancer: $16/month
- ECS Fargate (2 tasks): $15-30/month
- RDS db.t3.micro: Free tier or $15/month
- ElastiCache: Free tier or $15/month
- Data transfer: $5-10/month

**Free Tier Eligible** (first 12 months):
- 750 hours RDS db.t3.micro
- 750 hours ElastiCache cache.t3.micro
- 1M Lambda requests (if used)
- 50 GB data transfer out

## Security Features

- ✅ HTTPS only (HTTP → HTTPS redirect)
- ✅ SSL certificates auto-renewed
- ✅ Secrets in AWS Secrets Manager (never in code)
- ✅ VPC isolation (private subnets for DB/Redis)
- ✅ Security groups (least-privilege access)
- ✅ IAM roles (no hardcoded credentials)
- ✅ Encrypted RDS and ElastiCache
- ✅ Container image scanning
- ✅ CloudTrail audit logging
- ✅ Helmet security headers

## Monitoring & Observability

### CloudWatch Logs
```bash
# API logs
aws logs tail /ecs/watchagent-prod-api --follow

# Web logs
aws logs tail /ecs/watchagent-prod-web --follow
```

### Metrics
- ECS: CPU, Memory, Network
- RDS: Connections, Queries, Storage
- Redis: Cache hit rate, Memory
- ALB: Request count, Latency, Errors

### Alerts (Recommended Setup)
- High CPU/Memory usage
- Database connection failures
- API error rate > 5%
- Monthly cost > budget

## Scaling

### Automatic Scaling
- **Horizontal**: Auto-scales 1-4 tasks based on CPU (70% threshold)
- **Database**: Storage auto-scales up to 2x initial size
- **Redis**: Manual scaling (requires update)

### Manual Scaling
```bash
# Scale ECS tasks
cd terraform
# Edit variables.tf: api_desired_count, web_desired_count
terraform apply

# Scale database
# Edit variables.tf: db_instance_class
terraform apply
```

## Backup & Disaster Recovery

### Automated Backups
- **RDS**: Daily snapshots (7-day retention)
- **Point-in-time recovery**: Up to 5 minutes
- **Redis**: Daily snapshots (5-day retention in prod)

### Manual Backup
```bash
# Database snapshot
aws rds create-db-snapshot \
  --db-instance-identifier watchagent-prod-db \
  --db-snapshot-identifier manual-$(date +%Y%m%d)

# Infrastructure state
cd terraform
terraform state pull > backup-$(date +%Y%m%d).tfstate
```

### Disaster Recovery
1. Infrastructure: Re-deploy with Terraform
2. Database: Restore from RDS snapshot
3. Application: Deploy latest Docker images from ECR

**RTO (Recovery Time Objective)**: ~30 minutes
**RPO (Recovery Point Objective)**: ~5 minutes

## Maintenance Windows

### Recommended Schedule
- **Database maintenance**: Monday 4:00-5:00 AM EST
- **Infrastructure updates**: Saturday 2:00-4:00 AM EST
- **Application deployments**: Anytime (zero-downtime)

### Zero-Downtime Deployments
ECS performs rolling updates:
1. Start new task with new image
2. Wait for health check to pass
3. Stop old task
4. Repeat for all tasks

## Support & Troubleshooting

### Quick Diagnostics
```bash
# Check service health
aws ecs describe-services \
  --cluster watchagent-prod-cluster \
  --services watchagent-prod-api watchagent-prod-web

# Check task status
aws ecs list-tasks --cluster watchagent-prod-cluster

# View recent errors
aws logs tail /ecs/watchagent-prod-api --since 1h --filter ERROR
```

### Common Issues
| Issue | Solution |
|-------|----------|
| 503 errors | Check ECS task health, view logs |
| Slow response | Check RDS connections, Redis hit rate |
| High costs | Review NAT Gateway usage, reduce task count |
| DNS not resolving | Wait 24-48 hours for propagation |
| Deploy failed | Check GitHub Actions logs, verify secrets |

### Getting Help
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
2. Review CloudWatch logs for errors
3. Check AWS service health dashboard
4. Create GitHub issue with:
   - Error messages
   - CloudWatch logs
   - Steps to reproduce

## Development Workflow

### Local Development
```bash
# Start databases
./scripts/local-env.sh start

# Run application
npm run dev

# Test locally
curl http://localhost:3000/health
```

### Deploy to Production
```bash
# Option 1: Via GitHub (recommended)
git add .
git commit -m "Your changes"
git push origin main

# Option 2: Manual deploy
./scripts/build-and-push.sh prod
./scripts/deploy-ecs.sh prod
```

## Infrastructure Management

### View Current State
```bash
cd terraform
terraform show
terraform output
```

### Update Infrastructure
```bash
cd terraform
# Edit .tf files
terraform plan
terraform apply
```

### Destroy Everything
```bash
cd terraform
terraform destroy  # ⚠️ Deletes all resources including data!
```

## Next Steps

1. ✅ Deploy infrastructure (see [QUICK_START.md](./QUICK_START.md))
2. ✅ Setup GitHub repository and secrets
3. ✅ Configure domain DNS
4. ✅ Deploy application
5. 🔄 Setup monitoring alerts
6. 🔄 Configure custom domain email
7. 🔄 Add staging environment (optional)
8. 🔄 Setup error tracking (Sentry/Datadog)
9. 🔄 Configure custom metrics dashboard

## Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Terraform AWS Provider**: https://registry.terraform.io/providers/hashicorp/aws
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Fastify Production**: https://www.fastify.io/docs/latest/Guides/Deployment/
- **ECS Best Practices**: https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/

---

**Ready to deploy?** Start with [QUICK_START.md](./QUICK_START.md) for a 30-minute guided setup.
