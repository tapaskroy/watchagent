variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
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

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium" # 2 vCPU, 4GB RAM - good for small apps
}

variable "ssh_key_name" {
  description = "Name of the SSH key pair to use for EC2 instance"
  type        = string
  default     = "watchagent-key"
}

variable "ssh_public_key" {
  description = "Public SSH key content for EC2 access"
  type        = string
  default     = ""
}

# API Keys - passed via environment variables
variable "tmdb_api_key" {
  description = "TMDB API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "omdb_api_key" {
  description = "OMDB API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "anthropic_api_key" {
  description = "Anthropic API Key"
  type        = string
  sensitive   = true
  default     = ""
}
