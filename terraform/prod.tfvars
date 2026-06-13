# Production environment configuration
# Run from terraform/ with:
#   terraform workspace select prod
#   terraform apply -var-file=prod.tfvars
#
# Secrets (tmdb_api_key, omdb_api_key, anthropic_api_key) must be supplied
# via TF_VAR_* environment variables — do not add them here.

environment = "prod"
subdomain   = "watchagent"

# VPC
vpc_cidr              = "10.0.0.0/16"
public_subnet_cidrs   = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs  = ["10.0.10.0/24", "10.0.11.0/24"]
database_subnet_cidrs = ["10.0.20.0/24", "10.0.21.0/24"]

# ECS — 2 tasks desired, scale up to 4
api_desired_count   = 2
web_desired_count   = 2
api_autoscaling_max = 4
web_autoscaling_max = 4

# IAM / Networking
enable_vpc_flow_logs    = true
# permissions_boundary_arn not set — prod IAM is not collaborator-scoped
