#!/bin/bash
# Promote a staging-tested image to production without rebuilding.
#
# Usage:
#   scripts/promote.sh <git-sha>
#   scripts/promote.sh abc1234
#
# Prerequisites: Docker running, AWS credentials with ECR + ECS access,
#                the SHA must already exist in staging ECR.

set -e

SHA=${1:?Usage: promote.sh <git-sha>}
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="watchagent"
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

STAGING_API="${ECR_BASE}/${PROJECT_NAME}-staging-api"
STAGING_WEB="${ECR_BASE}/${PROJECT_NAME}-staging-web"
PROD_API="${ECR_BASE}/${PROJECT_NAME}-prod-api"
PROD_WEB="${ECR_BASE}/${PROJECT_NAME}-prod-web"

echo -e "${GREEN}Promoting ${PROJECT_NAME} @ ${SHA}: staging → prod${NC}"
echo ""

echo -e "${YELLOW}Logging in to ECR...${NC}"
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "${ECR_BASE}"

echo -e "${YELLOW}Pulling staging images @ ${SHA}...${NC}"
docker pull "${STAGING_API}:${SHA}"
docker pull "${STAGING_WEB}:${SHA}"

echo -e "${YELLOW}Retagging for prod...${NC}"
docker tag "${STAGING_API}:${SHA}" "${PROD_API}:${SHA}"
docker tag "${STAGING_API}:${SHA}" "${PROD_API}:latest"
docker tag "${STAGING_WEB}:${SHA}" "${PROD_WEB}:${SHA}"
docker tag "${STAGING_WEB}:${SHA}" "${PROD_WEB}:latest"

echo -e "${YELLOW}Pushing to prod ECR...${NC}"
docker push "${PROD_API}:${SHA}"
docker push "${PROD_API}:latest"
docker push "${PROD_WEB}:${SHA}"
docker push "${PROD_WEB}:latest"
echo -e "${GREEN}✓ Images in prod ECR${NC}"

echo ""
echo -e "${YELLOW}Deploying to prod ECS @ ${SHA}...${NC}"
bash "$(dirname "$0")/deploy.sh" prod "$SHA"

echo ""
echo -e "${GREEN}Promotion complete. Prod is now running the same image as staging @ ${SHA}.${NC}"
echo ""
echo "Verify:"
echo "  curl -sk https://watchagent.tapaskroy.me/login | grep -o '0\\.[0-9]*'"
