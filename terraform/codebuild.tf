# CodeBuild project for building Docker images

# IAM role for CodeBuild
resource "aws_iam_role" "codebuild" {
  name = "${var.project_name}-${var.environment}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-codebuild-role"
  }
}

# IAM policy for CodeBuild
resource "aws_iam_role_policy" "codebuild" {
  role = aws_iam_role.codebuild.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/codebuild/${var.project_name}-*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${aws_s3_bucket.codebuild_source.arn}/*"
      }
    ]
  })
}

# S3 bucket for CodeBuild source code
resource "aws_s3_bucket" "codebuild_source" {
  bucket = "${var.project_name}-${var.environment}-codebuild-source"

  tags = {
    Name = "${var.project_name}-${var.environment}-codebuild-source"
  }
}

# Block public access to S3 bucket
resource "aws_s3_bucket_public_access_block" "codebuild_source" {
  bucket = aws_s3_bucket.codebuild_source.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CodeBuild project
resource "aws_codebuild_project" "docker_build" {
  name          = "${var.project_name}-${var.environment}-docker-build"
  description   = "Build Docker images for WatchAgent"
  build_timeout = 60
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_LARGE"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }
  }

  source {
    type      = "S3"
    location  = "${aws_s3_bucket.codebuild_source.bucket}/source.zip"
    buildspec = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/aws/codebuild/${var.project_name}-${var.environment}-docker-build"
      stream_name = "build"
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-docker-build"
  }
}

# Data source for AWS account ID
data "aws_caller_identity" "current" {}

# Outputs
output "codebuild_project_name" {
  value       = aws_codebuild_project.docker_build.name
  description = "CodeBuild project name"
}

output "codebuild_s3_bucket" {
  value       = aws_s3_bucket.codebuild_source.bucket
  description = "S3 bucket for CodeBuild source code"
}
