# Simple Deployment Guide - EC2 Single Instance

Deploy WatchAgent to a single EC2 instance for small-scale testing (few hundred users).

## Cost Comparison

| Setup | Monthly Cost | Use Case |
|-------|--------------|----------|
| **Simple EC2** (this guide) | **~$25-35/month** | Test apps, <500 users |
| Full Production (complex) | ~$200-250/month | Enterprise, >1000 users |

### Cost Breakdown (Simple Setup)
- EC2 t3.medium: ~$30/month
- 30GB EBS storage: ~$3/month
- Data transfer: ~$2-5/month
- **Total: ~$35/month**

No additional costs for:
- ❌ Load Balancer ($16/month saved)
- ❌ NAT Gateway ($32/month saved)
- ❌ Separate RDS ($15-60/month saved)
- ❌ ElastiCache ($15/month saved)

## Architecture

```
Internet
   |
   | HTTPS
   v
[EC2 Instance - t3.medium]
   |
   |-- Nginx (SSL termination)
   |-- Docker Compose
   |     |
   |     |-- Web App (Next.js) :3001
   |     |-- API (Fastify) :3000
   |     |-- PostgreSQL :5432
   |     |-- Redis :6379
   |
   v
Route53 DNS
   |
   |-- watchagent.tapaskroy.me → Web
   |-- api.watchagent.tapaskroy.me → API
```

## Prerequisites

- [ ] AWS account with CLI configured
- [ ] SSH key pair (or Terraform will create one)
- [ ] Domain: tapaskroy.me in Route53
- [ ] API keys (TMDB, OMDB, Anthropic)
- [ ] Terraform installed

## Quick Start (30 minutes)

### Step 1: Setup SSH Key (2 minutes)

```bash
# Check if you have an SSH key
ls ~/.ssh/id_rsa.pub

# If not, create one
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
```

### Step 2: Set API Keys (1 minute)

```bash
export TF_VAR_tmdb_api_key="your_tmdb_key"
export TF_VAR_omdb_api_key="your_omdb_key"
export TF_VAR_anthropic_api_key="your_anthropic_key"
```

### Step 3: Deploy Infrastructure (10 minutes)

```bash
cd terraform-simple

# Initialize Terraform
terraform init

# Preview what will be created
terraform plan

# Deploy (type 'yes' when prompted)
terraform apply

# Save the outputs
terraform output > ../server-info.txt
```

This creates:
- 1 EC2 instance (t3.medium)
- Elastic IP (static IP address)
- Security group (firewall rules)
- Route53 DNS records
- Installs Docker, Nginx, and Certbot

### Step 4: Wait for Server Setup (5 minutes)

The server takes a few minutes to install Docker and configure everything.

```bash
# Get server IP
SERVER_IP=$(terraform output -raw public_ip)

# Check if setup is complete
ssh ubuntu@$SERVER_IP "tail -f /var/log/user-data.log"
# Press Ctrl+C when you see "Server setup complete"
```

### Step 5: Deploy Application (5 minutes)

```bash
cd ..  # Back to project root

# Deploy the app
./scripts/deploy-to-ec2.sh $(cd terraform-simple && terraform output -raw public_ip)
```

This will:
- Build your application
- Upload it to the server
- Install dependencies
- Start all containers with Docker Compose

### Step 6: Setup SSL Certificates (2 minutes)

```bash
# Wait 2-3 minutes for DNS to propagate, then:
./scripts/setup-ssl.sh $(cd terraform-simple && terraform output -raw public_ip) your-email@example.com
```

This installs Let's Encrypt SSL certificates (free, auto-renewing).

### Step 7: Test Your App (1 minute)

```bash
# Test API
curl https://api.watchagent.tapaskroy.me/health

# Open in browser
open https://watchagent.tapaskroy.me
```

## Done! 🎉

Your app is live at:
- **Web**: https://watchagent.tapaskroy.me
- **API**: https://api.watchagent.tapaskroy.me

## Daily Operations

### View Logs

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

# All logs
ssh ubuntu@$SERVER_IP "cd /opt/watchagent && docker-compose logs -f"

# API only
ssh ubuntu@$SERVER_IP "cd /opt/watchagent && docker-compose logs -f api"

# Web only
ssh ubuntu@$SERVER_IP "cd /opt/watchagent && docker-compose logs -f web"
```

### Redeploy After Code Changes

```bash
# Make your code changes, then:
./scripts/deploy-to-ec2.sh $(cd terraform-simple && terraform output -raw public_ip)
```

### Restart Services

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

# Restart all services
ssh ubuntu@$SERVER_IP "cd /opt/watchagent && docker-compose restart"

# Restart specific service
ssh ubuntu@$SERVER_IP "cd /opt/watchagent && docker-compose restart api"
```

### Check Service Status

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

ssh ubuntu@$SERVER_IP "cd /opt/watchagent && docker-compose ps"
```

### SSH into Server

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)
ssh ubuntu@$SERVER_IP
```

## Monitoring

### Server Resources

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

# Check CPU, memory, disk
ssh ubuntu@$SERVER_IP "top -bn1 | head -20"
ssh ubuntu@$SERVER_IP "free -h"
ssh ubuntu@$SERVER_IP "df -h"
```

### Application Health

```bash
# API health check
curl https://api.watchagent.tapaskroy.me/health

# Check container status
ssh ubuntu@$SERVER_IP "docker ps"
```

### Setup CloudWatch Monitoring (Optional)

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

ssh ubuntu@$SERVER_IP << 'ENDSSH'
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
# Configure as needed
ENDSSH
```

## Scaling

### Upgrade Instance Size

If you need more resources:

```bash
cd terraform-simple

# Edit terraform.tfvars
# Change: instance_type = "t3.large"  # 2 vCPU, 8GB RAM

# Apply changes
terraform apply
```

Instance will restart with new size.

### Database Optimization

For better database performance with more users:

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

# Edit database settings
ssh ubuntu@$SERVER_IP "nano /opt/watchagent/.env"
# Increase: DB_POOL_SIZE=20

# Restart
ssh ubuntu@$SERVER_IP "cd /opt/watchagent && docker-compose restart api"
```

## Backup

### Automated Backups

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

# Setup daily backup cron
ssh ubuntu@$SERVER_IP << 'ENDSSH'
cat > /opt/watchagent/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/watchagent/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker exec watchagent-postgres pg_dump -U postgres watchagent > $BACKUP_DIR/db_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete

echo "Backup complete: $BACKUP_DIR/db_$DATE.sql"
EOF

chmod +x /opt/watchagent/backup.sh

# Add to cron (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/watchagent/backup.sh") | crontab -
ENDSSH
```

### Manual Backup

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

# Create backup
ssh ubuntu@$SERVER_IP "docker exec watchagent-postgres pg_dump -U postgres watchagent" > backup_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

# Upload backup file
scp backup_20240115.sql ubuntu@$SERVER_IP:/tmp/

# Restore
ssh ubuntu@$SERVER_IP << 'ENDSSH'
docker exec -i watchagent-postgres psql -U postgres watchagent < /tmp/backup_20240115.sql
rm /tmp/backup_20240115.sql
ENDSSH
```

## Security

### Restrict SSH Access

By default, SSH is open to the world. Restrict it:

```bash
cd terraform-simple

# Edit ec2.tf
# Change SSH ingress to:
#   cidr_blocks = ["YOUR.IP.ADDRESS/32"]

terraform apply
```

### Update Security

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

# Update system
ssh ubuntu@$SERVER_IP "sudo apt-get update && sudo apt-get upgrade -y"

# Update Docker images
ssh ubuntu@$SERVER_IP "cd /opt/watchagent && docker-compose pull && docker-compose up -d"
```

### Enable Firewall

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

ssh ubuntu@$SERVER_IP << 'ENDSSH'
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable
ENDSSH
```

## Troubleshooting

### App Not Accessible

1. **Check DNS**
   ```bash
   dig watchagent.tapaskroy.me
   dig api.watchagent.tapaskroy.me
   ```

2. **Check Nginx**
   ```bash
   ssh ubuntu@$SERVER_IP "sudo nginx -t"
   ssh ubuntu@$SERVER_IP "sudo systemctl status nginx"
   ```

3. **Check Containers**
   ```bash
   ssh ubuntu@$SERVER_IP "cd /opt/watchagent && docker-compose ps"
   ssh ubuntu@$SERVER_IP "cd /opt/watchagent && docker-compose logs"
   ```

### SSL Certificate Issues

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

# Check certificate status
ssh ubuntu@$SERVER_IP "sudo certbot certificates"

# Renew manually
ssh ubuntu@$SERVER_IP "sudo certbot renew"
```

### Database Connection Errors

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

# Check database
ssh ubuntu@$SERVER_IP "docker exec watchagent-postgres psql -U postgres -c 'SELECT version();'"

# Check connection from API
ssh ubuntu@$SERVER_IP "docker exec watchagent-api nc -zv postgres 5432"
```

### Out of Disk Space

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

# Check disk usage
ssh ubuntu@$SERVER_IP "df -h"

# Clean up Docker
ssh ubuntu@$SERVER_IP "docker system prune -af"
```

## Updating to Production Setup

When you're ready to scale to hundreds/thousands of users:

1. Export your database
2. Follow the full `DEPLOYMENT.md` guide
3. Use the production Terraform in `/terraform` directory
4. Import database to RDS
5. Update DNS to point to new infrastructure
6. Destroy this simple setup

## Complete Teardown

To delete everything:

```bash
cd terraform-simple
terraform destroy
# Type 'yes' to confirm
```

This will delete:
- EC2 instance
- Elastic IP
- Security group
- Route53 DNS records
- **All data will be lost!**

Make sure to backup your database first!

## Cost Optimization

### Stop Instance When Not Needed

```bash
cd terraform-simple
SERVER_IP=$(terraform output -raw public_ip)

# Stop instance (no charges except storage)
aws ec2 stop-instances --instance-ids $(terraform output -raw instance_id)

# Start again when needed
aws ec2 start-instances --instance-ids $(terraform output -raw instance_id)
```

**Note**: Elastic IP is free while attached to a running instance, but costs ~$3.60/month when instance is stopped. Consider releasing it if stopping for extended periods.

### Use Spot Instances (Advanced)

For even lower costs (~70% savings), consider spot instances, but be aware they can be terminated by AWS.

## Support

- Check logs: `ssh ubuntu@SERVER_IP "cd /opt/watchagent && docker-compose logs"`
- Check this guide's troubleshooting section
- Review Docker Compose file: `/opt/watchagent/docker-compose.yml`
- Check server setup log: `/var/log/user-data.log`

---

**Ready to deploy?** Start with Step 1 above!
