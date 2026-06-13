#!/bin/bash
# Deploy a specific image tag to ECS by registering a new task definition revision.
#
# Usage:
#   scripts/deploy.sh <environment> <image-tag>
#   scripts/deploy.sh staging abc1234
#   scripts/deploy.sh prod     abc1234
#
# Called by buildspec.yml (staging and prod) after images are pushed to ECR,
# and by scripts/promote.sh when promoting a staging-tested image to prod.

set -e

ENVIRONMENT=${1:?Usage: deploy.sh <environment> <image-tag>}
IMAGE_TAG=${2:?Usage: deploy.sh <environment> <image-tag>}
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="watchagent"
CLUSTER="${PROJECT_NAME}-${ENVIRONMENT}-cluster"
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${GREEN}Deploying ${PROJECT_NAME}-${ENVIRONMENT} @ ${IMAGE_TAG}${NC}"

update_service() {
  local SERVICE="$1"
  local CONTAINER="$2"
  local NEW_IMAGE="${ECR_BASE}/${PROJECT_NAME}-${ENVIRONMENT}-${CONTAINER}:${IMAGE_TAG}"

  echo -e "${YELLOW}  Registering new task definition for ${SERVICE}...${NC}"

  CURRENT=$(aws ecs describe-task-definition \
    --task-definition "$SERVICE" \
    --region "$AWS_REGION" \
    --query taskDefinition \
    --output json)

  NEW_TASK_DEF=$(echo "$CURRENT" | python3 - "$CONTAINER" "$NEW_IMAGE" <<'PYEOF'
import json, sys
td = json.load(sys.stdin)
container_name, new_image = sys.argv[1], sys.argv[2]
for c in td["containerDefinitions"]:
    if c["name"] == container_name:
        c["image"] = new_image
for key in ["taskDefinitionArn","revision","status","requiresAttributes",
             "compatibilities","registeredAt","registeredBy"]:
    td.pop(key, None)
print(json.dumps(td))
PYEOF
)

  NEW_ARN=$(aws ecs register-task-definition \
    --cli-input-json "$NEW_TASK_DEF" \
    --region "$AWS_REGION" \
    --query "taskDefinition.taskDefinitionArn" \
    --output text)

  echo -e "${GREEN}  ✓ Registered: ${NEW_ARN##*/}${NC}"

  aws ecs update-service \
    --cluster "$CLUSTER" \
    --service "$SERVICE" \
    --task-definition "$NEW_ARN" \
    --region "$AWS_REGION" \
    --output none

  echo -e "${GREEN}  ✓ Service updated: ${SERVICE}${NC}"
}

update_service "${PROJECT_NAME}-${ENVIRONMENT}-api" "api"
update_service "${PROJECT_NAME}-${ENVIRONMENT}-web" "web"

echo -e "${GREEN}Deployment triggered. Monitor with:${NC}"
echo "  aws ecs wait services-stable --cluster ${CLUSTER} --services ${PROJECT_NAME}-${ENVIRONMENT}-api ${PROJECT_NAME}-${ENVIRONMENT}-web --region ${AWS_REGION}"
