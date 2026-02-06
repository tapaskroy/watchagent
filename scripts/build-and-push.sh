#!/bin/bash

# Build and Push Docker Images to AWS ECR
# Usage: ./scripts/build-and-push.sh [environment]
# Environment: prod (default) or staging

set -e

# Configuration
ENVIRONMENT=${1:-prod}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
PROJECT_NAME="watchagent"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Building and Pushing Docker Images${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Environment: $ENVIRONMENT"
echo "AWS Region: $AWS_REGION"
echo "AWS Account: $AWS_ACCOUNT_ID"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Authenticate with ECR
echo -e "${YELLOW}Authenticating with Amazon ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $ECR_REGISTRY

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to authenticate with ECR${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated with ECR${NC}"
echo ""

# Get git commit SHA for tagging
GIT_SHA=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Build and push API image
echo -e "${YELLOW}Building API Docker image...${NC}"
docker build \
    -f apps/api/Dockerfile \
    -t ${PROJECT_NAME}-${ENVIRONMENT}-api:latest \
    -t ${PROJECT_NAME}-${ENVIRONMENT}-api:${GIT_SHA} \
    -t ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-api:latest \
    -t ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-api:${GIT_SHA} \
    -t ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-api:${TIMESTAMP} \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ API image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build API image${NC}"
    exit 1
fi

echo -e "${YELLOW}Pushing API image to ECR...${NC}"
docker push ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-api:latest
docker push ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-api:${GIT_SHA}
docker push ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-api:${TIMESTAMP}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ API image pushed successfully${NC}"
else
    echo -e "${RED}✗ Failed to push API image${NC}"
    exit 1
fi
echo ""

# Build and push Web image
echo -e "${YELLOW}Building Web Docker image...${NC}"
docker build \
    -f apps/web/Dockerfile \
    -t ${PROJECT_NAME}-${ENVIRONMENT}-web:latest \
    -t ${PROJECT_NAME}-${ENVIRONMENT}-web:${GIT_SHA} \
    -t ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-web:latest \
    -t ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-web:${GIT_SHA} \
    -t ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-web:${TIMESTAMP} \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Web image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build Web image${NC}"
    exit 1
fi

echo -e "${YELLOW}Pushing Web image to ECR...${NC}"
docker push ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-web:latest
docker push ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-web:${GIT_SHA}
docker push ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-web:${TIMESTAMP}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Web image pushed successfully${NC}"
else
    echo -e "${RED}✗ Failed to push Web image${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build and Push Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Images pushed:"
echo "  API:  ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-api:${GIT_SHA}"
echo "  Web:  ${ECR_REGISTRY}/${PROJECT_NAME}-${ENVIRONMENT}-web:${GIT_SHA}"
echo ""
echo "To deploy these images to ECS, run:"
echo "  ./scripts/deploy-ecs.sh $ENVIRONMENT"
