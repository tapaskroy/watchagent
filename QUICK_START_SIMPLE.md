# Quick Start - Simple Deployment (30 minutes)

Deploy WatchAgent to a single EC2 instance for **~$30/month**.

Perfect for test apps with a few hundred users.

## What You'll Get

- ✅ Single EC2 server (t3.medium: 2 vCPU, 4 GB RAM)
- ✅ SSL certificates (auto-renewing)
- ✅ PostgreSQL + Redis (containerized)
- ✅ HTTPS at watchagent.tapaskroy.me
- ✅ **Cost: ~$30/month** (vs $200+ for full production)

## Prerequisites

- [ ] AWS account + CLI configured (`aws configure`)
- [ ] SSH key at `~/.ssh/id_rsa.pub` (or run `ssh-keygen`)
- [ ] Domain `tapaskroy.me` in Route53
- [ ] API keys: TMDB, OMDB, Anthropic

## 6-Step Deployment

### 1. Set API Keys (1 min)

```bash
export TF_VAR_tmdb_api_key="your_tmdb_key_here"
export TF_VAR_omdb_api_key="your_omdb_key_here"
export TF_VAR_anthropic_api_key="your_anthropic_key_here"
```

### 2. Deploy Server (10 min)

```bash
cd terraform-simple
terraform init
terraform apply  # Type 'yes'
```

Wait ~10 minutes for EC2 instance to be created and configured.

### 3. Wait for Setup (5 min)

```bash
# Check when server setup is complete
SERVER_IP=$(terraform output -raw public_ip)
ssh ubuntu@$SERVER_IP "tail -f /var/log/user-data.log"
# Wait for "Server setup complete", then Ctrl+C
```

### 4. Deploy App (5 min)

```bash
cd ..  # Back to project root
./scripts/deploy-to-ec2.sh $(cd terraform-simple && terraform output -raw public_ip)
```

### 5. Setup SSL (2 min)

Wait 2-3 minutes for DNS, then:

```bash
./scripts/setup-ssl.sh $(cd terraform-simple && terraform output -raw public_ip) your-email@example.com
```

### 6. Test (1 min)

```bash
curl https://api.watchagent.tapaskroy.me/health
open https://watchagent.tapaskroy.me
```

## Done! 🎉

Your app is live:
- **Web**: https://watchagent.tapaskroy.me
- **API**: https://api.watchagent.tapaskroy.me

## Common Commands

```bash
SERVER_IP=$(cd terraform-simple && terraform output -raw public_ip)

# View logs
ssh ubuntu@$SERVER_IP "cd /opt/watchagent && docker-compose logs -f"

# Redeploy after changes
./scripts/deploy-to-ec2.sh $SERVER_IP

# Restart services
ssh ubuntu@$SERVER_IP "cd /opt/watchagent && docker-compose restart"

# SSH into server
ssh ubuntu@$SERVER_IP
```

## What's Different from Full Production?

| Feature | Simple ($30/mo) | Full Production ($200/mo) |
|---------|----------------|--------------------------|
| **Server** | 1 EC2 instance | Multi-AZ ECS cluster |
| **Database** | Container (on EC2) | RDS Multi-AZ |
| **Cache** | Container (on EC2) | ElastiCache |
| **Load Balancer** | ❌ (Nginx on server) | ✅ Application LB |
| **Auto-scaling** | ❌ | ✅ (1-4 tasks) |
| **Backups** | Manual scripts | Automated daily |
| **High Availability** | ❌ | ✅ |
| **Best for** | Test, <500 users | Production, >1000 users |

## When to Upgrade

Upgrade to full production setup when:
- [ ] You have >500 active users
- [ ] You need zero-downtime deployments
- [ ] You need automatic failover
- [ ] You need compliance/audit features
- [ ] You're ready for $200/month costs

## Full Documentation

- This quick start: You're reading it!
- Detailed guide: [DEPLOYMENT_SIMPLE.md](./DEPLOYMENT_SIMPLE.md)
- Troubleshooting: See DEPLOYMENT_SIMPLE.md
- Full production: [DEPLOYMENT.md](./DEPLOYMENT.md)

## Cost Breakdown

```
EC2 t3.medium (2 vCPU, 4GB)    $30.37/month
30 GB SSD storage              $ 3.00/month
Data transfer (~100 GB)        $ 5.00/month
Elastic IP (while running)     $ 0.00/month
─────────────────────────────────────────
Total:                         ~$38/month
```

**Free tier** (first 12 months): 750 hours of t3.micro, reducing cost to ~$15/month

## Need Help?

1. Check [DEPLOYMENT_SIMPLE.md](./DEPLOYMENT_SIMPLE.md) troubleshooting
2. View server logs: `ssh ubuntu@SERVER_IP "tail -f /var/log/user-data.log"`
3. Check containers: `ssh ubuntu@SERVER_IP "docker ps"`

---

Ready? Start with **Step 1** above!
