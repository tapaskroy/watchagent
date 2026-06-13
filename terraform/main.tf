terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Store Terraform state in S3 with workspace isolation.
  # With workspaces, the S3 key becomes env:/<workspace>/terraform.tfstate
  # automatically — no separate key per environment needed.
  # Uncomment after creating the S3 bucket and DynamoDB table (see issue #11).
  # backend "s3" {
  #   bucket         = "watchagent-terraform-state"
  #   key            = "terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "watchagent-terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "WatchAgent"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Data source for Route53 zone
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}
