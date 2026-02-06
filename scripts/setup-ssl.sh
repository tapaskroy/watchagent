#!/bin/bash

# Setup SSL certificates on EC2 instance
# Usage: ./scripts/setup-ssl.sh <server-ip> <email>

set -e

SERVER_IP=${1}
EMAIL=${2:-"admin@tapaskroy.me"}

if [ -z "$SERVER_IP" ]; then
    echo "Error: Server IP required"
    echo "Usage: $0 <server-ip> [email]"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setting up SSL Certificates${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Server: $SERVER_IP"
echo "Email: $EMAIL"
echo ""

echo -e "${YELLOW}Configuring SSL certificates...${NC}"
ssh -o StrictHostKeyChecking=no ubuntu@$SERVER_IP << ENDSSH
set -e

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# Get certificates
sudo certbot --nginx \
    -d watchagent.tapaskroy.me \
    -d api.watchagent.tapaskroy.me \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect

# Setup auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo ""
echo "SSL certificates installed and auto-renewal configured!"
ENDSSH

echo ""
echo -e "${GREEN}✓ SSL setup complete!${NC}"
echo ""
echo "Your site is now available at:"
echo "  https://watchagent.tapaskroy.me"
echo "  https://api.watchagent.tapaskroy.me"
echo ""
echo "Certificates will auto-renew before expiration."
