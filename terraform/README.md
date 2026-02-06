# Terraform Infrastructure for WatchAgent

This directory contains Terraform configuration for deploying WatchAgent to AWS.

## Architecture

- **VPC**: Custom VPC with public/private/database subnets across 2 AZs
- **ECS Fargate**: Container orchestration for API and Web services
- **RDS PostgreSQL**: Managed database service
- **ElastiCache Redis**: Managed caching layer
- **Application Load Balancer**: HTTPS traffic routing
- **Route53 + ACM**: DNS and SSL certificate management
- **ECR**: Docker image repository
- **Secrets Manager**: Secure storage for API keys and secrets

## Prerequisites

1. **AWS CLI** installed and configured
   ```bash
   aws configure
   ```

2. **Terraform** installed (>= 1.0)
   ```bash
   brew install terraform
   ```

3. **Route53 Hosted Zone** for your domain
   - The domain `tapaskroy.me` must already have a hosted zone in Route53
   - If not, create one manually in AWS Console or via CLI

4. **API Keys** - Obtain from:
   - TMDB: https://www.themoviedb.org/settings/api
   - OMDB: http://www.omdbapi.com/apikey.aspx
   - Anthropic: https://console.anthropic.com/

## Initial Setup

1. **Copy the example tfvars file**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit terraform.tfvars** and update values as needed

3. **Set API keys via environment variables** (recommended):
   ```bash
   export TF_VAR_tmdb_api_key="your_tmdb_key"
   export TF_VAR_omdb_api_key="your_omdb_key"
   export TF_VAR_anthropic_api_key="your_anthropic_key"
   ```

   Or pass them during terraform apply:
   ```bash
   terraform apply \
     -var="tmdb_api_key=YOUR_KEY" \
     -var="omdb_api_key=YOUR_KEY" \
     -var="anthropic_api_key=YOUR_KEY"
   ```

## Deployment

### 1. Initialize Terraform

```bash
terraform init
```

### 2. Plan the deployment

```bash
terraform plan
```

Review the plan to ensure everything looks correct.

### 3. Apply the configuration

```bash
terraform apply
```

Type `yes` when prompted to confirm.

This will create:
- VPC and networking infrastructure (~2 minutes)
- RDS and ElastiCache (~10-15 minutes)
- ECS cluster and services (~5 minutes)
- Load balancer and Route53 records (~5 minutes)

**Total deployment time: ~20-30 minutes**

### 4. Note the outputs

After deployment completes, Terraform will output important values:
- Load balancer DNS name
- ECR repository URLs
- Database and Redis endpoints
- Route53 nameservers (if you created a new hosted zone)

## Post-Deployment Steps

### 1. Build and push Docker images

See the root README for build and deployment scripts.

```bash
# From the project root
./scripts/build-and-push.sh
```

### 2. Update ECS services

After pushing new images, update the ECS services:

```bash
./scripts/deploy-ecs.sh
```

### 3. Configure DNS (if using Squarespace)

If your domain is registered with Squarespace:

1. Log in to Squarespace
2. Go to Settings > Domains > DNS Settings
3. Add custom nameservers from the Terraform output:
   ```
   terraform output nameservers
   ```

**Note**: DNS propagation can take 24-48 hours.

## Managing the Infrastructure

### Update infrastructure

```bash
terraform plan
terraform apply
```

### Destroy infrastructure

**WARNING**: This will delete all resources including the database!

```bash
terraform destroy
```

### View current state

```bash
terraform show
```

### View outputs

```bash
terraform output
```

## Cost Optimization

For development/testing:
- Use `db.t3.micro` and `cache.t3.micro` (free tier eligible)
- Set `single_nat_gateway = true` (saves ~$30/month per NAT)
- Reduce `desired_count` to 1 for both services
- Use `db.t3.micro` with 20GB storage

For production:
- Upgrade to `db.t3.small` or larger
- Enable Multi-AZ for RDS
- Use multiple NAT gateways for high availability
- Increase desired task count for redundancy

## Estimated Monthly Costs

**Development** (minimal setup):
- NAT Gateway: $32/month
- ALB: $16/month
- ECS Fargate: $15-30/month (2 tasks)
- RDS db.t3.micro: Free tier or ~$15/month
- ElastiCache: Free tier or ~$15/month
- **Total: ~$80-110/month**

**Production** (HA setup):
- NAT Gateways (2): $64/month
- ALB: $16/month
- ECS Fargate: $30-60/month (4+ tasks)
- RDS db.t3.small Multi-AZ: $60/month
- ElastiCache: $30/month
- **Total: ~$200-250/month**

## Troubleshooting

### Route53 hosted zone not found

If you get an error about Route53 zone not found:
1. Create a hosted zone manually:
   ```bash
   aws route53 create-hosted-zone --name tapaskroy.me --caller-reference $(date +%s)
   ```
2. Update your domain's nameservers to point to the Route53 nameservers

### ECR authentication

To authenticate Docker with ECR:
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com
```

### Database connection issues

- Ensure security groups allow traffic from ECS tasks
- Check RDS security group rules
- Verify database credentials in Secrets Manager

## Security Best Practices

1. **Never commit terraform.tfvars** - Already in .gitignore
2. **Use environment variables** for sensitive values
3. **Enable MFA** on AWS account
4. **Regularly rotate secrets** in Secrets Manager
5. **Review CloudTrail logs** for unusual activity
6. **Enable AWS GuardDuty** for threat detection
7. **Use least-privilege IAM roles**

## Support

For issues or questions:
- Check Terraform AWS provider docs: https://registry.terraform.io/providers/hashicorp/aws
- AWS ECS documentation: https://docs.aws.amazon.com/ecs/
