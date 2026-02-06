variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "watchagent"
}

variable "domain_name" {
  description = "Root domain name (e.g., tapaskroy.me)"
  type        = string
  default     = "tapaskroy.me"
}

variable "subdomain" {
  description = "Subdomain for the application (e.g., watchagent)"
  type        = string
  default     = "watchagent"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.20.0/24", "10.0.21.0/24"]
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"  # Free tier eligible
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "watchagent"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "dbadmin"
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"  # Free tier eligible
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

# ECS Configuration
variable "api_cpu" {
  description = "CPU units for API container (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory for API container in MB"
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 2
}

variable "web_cpu" {
  description = "CPU units for Web container (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "web_memory" {
  description = "Memory for Web container in MB"
  type        = number
  default     = 1024
}

variable "web_desired_count" {
  description = "Desired number of Web tasks"
  type        = number
  default     = 2
}

# Auto Scaling Configuration
variable "api_autoscaling_min" {
  description = "Minimum number of API tasks"
  type        = number
  default     = 1
}

variable "api_autoscaling_max" {
  description = "Maximum number of API tasks"
  type        = number
  default     = 4
}

variable "web_autoscaling_min" {
  description = "Minimum number of Web tasks"
  type        = number
  default     = 1
}

variable "web_autoscaling_max" {
  description = "Maximum number of Web tasks"
  type        = number
  default     = 4
}

# Secrets Configuration
variable "tmdb_api_key" {
  description = "TMDB API Key (stored in Secrets Manager)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "omdb_api_key" {
  description = "OMDB API Key (stored in Secrets Manager)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "anthropic_api_key" {
  description = "Anthropic API Key (stored in Secrets Manager)"
  type        = string
  sensitive   = true
  default     = ""
}
