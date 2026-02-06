#!/bin/bash

# Deploy to AWS ECS
# Usage: ./scripts/deploy-ecs.sh [environment]
# Environment: prod (default) or staging

set -e

# Configuration
ENVIRONMENT=${1:-prod}
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="watchagent"
CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-cluster"
API_SERVICE="${PROJECT_NAME}-${ENVIRONMENT}-api"
WEB_SERVICE="${PROJECT_NAME}-${ENVIRONMENT}-web"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deploying to AWS ECS${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Environment: $ENVIRONMENT"
echo "AWS Region: $AWS_REGION"
echo "Cluster: $CLUSTER_NAME"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}Error: AWS CLI is not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

# Update API service
echo -e "${YELLOW}Updating API service...${NC}"
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $API_SERVICE \
    --force-new-deployment \
    --region $AWS_REGION \
    > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ API service update initiated${NC}"
else
    echo -e "${RED}✗ Failed to update API service${NC}"
    exit 1
fi

# Update Web service
echo -e "${YELLOW}Updating Web service...${NC}"
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $WEB_SERVICE \
    --force-new-deployment \
    --region $AWS_REGION \
    > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Web service update initiated${NC}"
else
    echo -e "${RED}✗ Failed to update Web service${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Waiting for services to stabilize...${NC}"
echo "This may take 5-10 minutes..."
echo ""

# Wait for API service to stabilize
echo -e "${YELLOW}Waiting for API service...${NC}"
aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $API_SERVICE \
    --region $AWS_REGION

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ API service is stable${NC}"
else
    echo -e "${RED}✗ API service failed to stabilize${NC}"
    echo "Check ECS console for details"
    exit 1
fi

# Wait for Web service to stabilize
echo -e "${YELLOW}Waiting for Web service...${NC}"
aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $WEB_SERVICE \
    --region $AWS_REGION

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Web service is stable${NC}"
else
    echo -e "${RED}✗ Web service failed to stabilize${NC}"
    echo "Check ECS console for details"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get service information
echo "Service Details:"
echo ""
aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services $API_SERVICE $WEB_SERVICE \
    --region $AWS_REGION \
    --query 'services[*].[serviceName,status,runningCount,desiredCount]' \
    --output table

echo ""
echo "Your application should be available at:"
echo "  https://watchagent.tapaskroy.me"
echo ""
echo "To view logs:"
echo "  API: aws logs tail /ecs/${PROJECT_NAME}-${ENVIRONMENT}-api --follow"
echo "  Web: aws logs tail /ecs/${PROJECT_NAME}-${ENVIRONMENT}-web --follow"
