#!/bin/bash
set -e

# Log output to file
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting WatchAgent server setup..."

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install other utilities
apt-get install -y git nginx certbot python3-certbot-nginx

# Create app directory
mkdir -p /opt/watchagent
cd /opt/watchagent

# Create .env file with secrets
cat > .env <<EOF
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=watchagent
DB_USER=postgres
DB_PASSWORD=$(openssl rand -hex 16)
DB_SSL=false
DB_POOL_SIZE=10

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# External API Keys
TMDB_API_KEY=${tmdb_api_key}
OMDB_API_KEY=${omdb_api_key}
ANTHROPIC_API_KEY=${anthropic_api_key}

# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=https://${domain}

# Web Configuration
NEXT_PUBLIC_API_URL=https://${api_domain}/api/v1
NEXT_PUBLIC_TMDB_IMAGE_BASE=https://image.tmdb.org/t/p

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Logging
LOG_LEVEL=info
EOF

# Create docker-compose.yml
cat > docker-compose.yml <<'EOFCOMPOSE'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: watchagent-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: $${DB_NAME}
      POSTGRES_USER: $${DB_USER}
      POSTGRES_PASSWORD: $${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: watchagent-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  api:
    image: public.ecr.aws/docker/library/node:20-alpine
    container_name: watchagent-api
    restart: unless-stopped
    working_dir: /app
    env_file: .env
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
    volumes:
      - ./app:/app
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: sh -c "npm run db:migrate && npm run start --workspace=@watchagent/api"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  web:
    image: public.ecr.aws/docker/library/node:20-alpine
    container_name: watchagent-web
    restart: unless-stopped
    working_dir: /app
    environment:
      - NODE_ENV=production
      - PORT=3001
      - NEXT_PUBLIC_API_URL=https://${api_domain}/api/v1
      - NEXT_PUBLIC_TMDB_IMAGE_BASE=https://image.tmdb.org/t/p
    volumes:
      - ./app:/app
    ports:
      - "3001:3001"
    depends_on:
      - api
    command: sh -c "npm run start --workspace=@watchagent/web"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:
  redis_data:
EOFCOMPOSE

# Create nginx configuration
cat > /etc/nginx/sites-available/watchagent <<'EOFNGINX'
# API subdomain
server {
    listen 80;
    server_name ${api_domain};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Web application
server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOFNGINX

# Enable nginx site
ln -sf /etc/nginx/sites-available/watchagent /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Note: SSL certificates will be added after DNS is configured
# Run: certbot --nginx -d ${domain} -d ${api_domain}

echo "Server setup complete. Waiting for application deployment..."
echo "To deploy the app, run: ./scripts/deploy-to-ec2.sh"
