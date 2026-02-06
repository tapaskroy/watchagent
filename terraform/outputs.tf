output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "web_url" {
  description = "URL of the web application"
  value       = "https://${var.subdomain}.${var.domain_name}"
}

output "api_url" {
  description = "URL of the API"
  value       = "https://api.${var.subdomain}.${var.domain_name}"
}

output "ecr_api_repository_url" {
  description = "URL of the API ECR repository"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_web_repository_url" {
  description = "URL of the Web ECR repository"
  value       = aws_ecr_repository.web.repository_url
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "nameservers" {
  description = "Nameservers for Route53 hosted zone (configure these in Squarespace)"
  value       = data.aws_route53_zone.main.name_servers
}

output "secrets_manager_arns" {
  description = "ARNs of secrets in Secrets Manager"
  value = {
    db_password      = aws_secretsmanager_secret.db_password.arn
    jwt_access       = aws_secretsmanager_secret.jwt_access.arn
    jwt_refresh      = aws_secretsmanager_secret.jwt_refresh.arn
    tmdb_api_key     = aws_secretsmanager_secret.tmdb_api_key.arn
    omdb_api_key     = aws_secretsmanager_secret.omdb_api_key.arn
    anthropic_api_key = aws_secretsmanager_secret.anthropic_api_key.arn
  }
}
