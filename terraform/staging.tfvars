# Staging environment configuration
# Run from terraform/ with:
#   terraform workspace select staging
#   terraform apply -var-file=staging.tfvars
#
# Secrets (tmdb_api_key, omdb_api_key, anthropic_api_key) must be supplied
# via TF_VAR_* environment variables — do not add them here.

environment = "staging"
subdomain   = "staging.watchagent"

# VPC — separate CIDRs from prod (10.0.x.x) to allow future VPC peering
vpc_cidr              = "10.1.0.0/16"
public_subnet_cidrs   = ["10.1.1.0/24", "10.1.2.0/24"]
private_subnet_cidrs  = ["10.1.10.0/24", "10.1.11.0/24"]
database_subnet_cidrs = ["10.1.20.0/24", "10.1.21.0/24"]

# ECS — 1 task desired, scale up to 2 (cost saving)
api_desired_count   = 1
web_desired_count   = 1
api_autoscaling_max = 2
web_autoscaling_max = 2

# IAM / Networking
enable_vpc_flow_logs = false # VPC module auto-names flow-log role outside watchagent-staging-* pattern
permissions_boundary_arn = "arn:aws:iam::269267980934:policy/watchagent-collaborator-boundary"
