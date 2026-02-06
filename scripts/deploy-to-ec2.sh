#!/bin/bash

# Deploy WatchAgent to EC2 Instance
# Usage: ./scripts/deploy-to-ec2.sh <server-ip>

set -e

SERVER_IP=${1}

if [ -z "$SERVER_IP" ]; then
    echo "Error: Server IP required"
    echo "Usage: $0 <server-ip>"
    echo ""
    echo "Get your server IP from:"
    echo "  cd terraform-simple && terraform output public_ip"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deploying to EC2: $SERVER_IP${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if we can connect
echo -e "${YELLOW}Testing SSH connection...${NC}"
if ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@$SERVER_IP "echo 'Connected'" > /dev/null 2>&1; then
    echo -e "${RED}Cannot connect to server via SSH${NC}"
    echo "Make sure:"
    echo "  1. You have the correct SSH key (~/.ssh/watchagent-key.pem)"
    echo "  2. The security group allows SSH from your IP"
    echo "  3. The server is running"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection successful${NC}"
echo ""

# Build the application locally
echo -e "${YELLOW}Building application locally...${NC}"
npm install
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Create deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy necessary files
mkdir -p $TEMP_DIR/app
cp package*.json $TEMP_DIR/app/
cp -r apps $TEMP_DIR/app/
cp -r packages $TEMP_DIR/app/
cp turbo.json $TEMP_DIR/app/ 2>/dev/null || true

# Remove node_modules and other unnecessary files
find $TEMP_DIR/app -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find $TEMP_DIR/app -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
find $TEMP_DIR/app -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true

# Create tarball
cd $TEMP_DIR
tar -czf app.tar.gz app/
cd - > /dev/null

echo -e "${GREEN}✓ Package created${NC}"
echo ""

# Upload to server
echo -e "${YELLOW}Uploading to server...${NC}"
scp -o StrictHostKeyChecking=no $TEMP_DIR/app.tar.gz ubuntu@$SERVER_IP:/tmp/

if [ $? -ne 0 ]; then
    echo -e "${RED}Upload failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Upload successful${NC}"
echo ""

# Deploy on server
echo -e "${YELLOW}Deploying on server...${NC}"
ssh -o StrictHostKeyChecking=no ubuntu@$SERVER_IP << 'ENDSSH'
set -e

cd /opt/watchagent

# Stop existing containers
if [ -f docker-compose.yml ]; then
    docker-compose down || true
fi

# Extract new version
rm -rf app
tar -xzf /tmp/app.tar.gz
rm /tmp/app.tar.gz

# Install dependencies in container-compatible way
cd app
npm ci --production

# Build the application
npm run build

# Start containers
cd ..
docker-compose up -d

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 10

# Check if services are running
docker-compose ps

echo ""
echo "Deployment complete!"
ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Your application is now running at:"
echo "  Web: https://watchagent.tapaskroy.me"
echo "  API: https://api.watchagent.tapaskroy.me"
echo ""
echo "To view logs:"
echo "  ssh ubuntu@$SERVER_IP 'cd /opt/watchagent && docker-compose logs -f'"
echo ""
echo "To restart services:"
echo "  ssh ubuntu@$SERVER_IP 'cd /opt/watchagent && docker-compose restart'"
