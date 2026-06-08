# Random passwords and secrets
resource "random_password" "jwt_access_secret" {
  length  = 64
  special = true
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = true
}

# Secrets Manager - Database Password
resource "aws_secretsmanager_secret" "db_password" {
  name_prefix             = "${var.project_name}-${var.environment}-db-password-"
  description             = "Database password for ${var.project_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# Secrets Manager - JWT Access Secret
resource "aws_secretsmanager_secret" "jwt_access" {
  name_prefix             = "${var.project_name}-${var.environment}-jwt-access-"
  description             = "JWT access secret for ${var.project_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-jwt-access"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_access" {
  secret_id     = aws_secretsmanager_secret.jwt_access.id
  secret_string = random_password.jwt_access_secret.result
}

# Secrets Manager - JWT Refresh Secret
resource "aws_secretsmanager_secret" "jwt_refresh" {
  name_prefix             = "${var.project_name}-${var.environment}-jwt-refresh-"
  description             = "JWT refresh secret for ${var.project_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-jwt-refresh"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_refresh" {
  secret_id     = aws_secretsmanager_secret.jwt_refresh.id
  secret_string = random_password.jwt_refresh_secret.result
}

# Secrets Manager - TMDB API Key
resource "aws_secretsmanager_secret" "tmdb_api_key" {
  name_prefix             = "${var.project_name}-${var.environment}-tmdb-api-"
  description             = "TMDB API Key for ${var.project_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-tmdb-api-key"
  }
}

resource "aws_secretsmanager_secret_version" "tmdb_api_key" {
  secret_id     = aws_secretsmanager_secret.tmdb_api_key.id
  secret_string = var.tmdb_api_key
}

# Secrets Manager - OMDB API Key
resource "aws_secretsmanager_secret" "omdb_api_key" {
  name_prefix             = "${var.project_name}-${var.environment}-omdb-api-"
  description             = "OMDB API Key for ${var.project_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-omdb-api-key"
  }
}

resource "aws_secretsmanager_secret_version" "omdb_api_key" {
  secret_id     = aws_secretsmanager_secret.omdb_api_key.id
  secret_string = var.omdb_api_key
}

# Secrets Manager - Anthropic API Key
resource "aws_secretsmanager_secret" "anthropic_api_key" {
  name_prefix             = "${var.project_name}-${var.environment}-anthropic-api-"
  description             = "Anthropic API Key for ${var.project_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-anthropic-api-key"
  }
}

resource "aws_secretsmanager_secret_version" "anthropic_api_key" {
  secret_id     = aws_secretsmanager_secret.anthropic_api_key.id
  secret_string = var.anthropic_api_key
}
