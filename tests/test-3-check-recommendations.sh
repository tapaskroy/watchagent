#!/bin/bash

# Test Case 3: Check Recommendations After Onboarding
# This script verifies that recommendations are personalized

set -e

API_URL="http://localhost:3000/api/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Login
LOGIN_DATA='{"email":"testuser1770422331@example.com","password":"TestPass123!"}'

echo "=========================================="
echo "Test Case 3: Check Recommendations"
echo "=========================================="
echo ""

echo -e "${YELLOW}[STEP 1] Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  --data-raw "$LOGIN_DATA")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}✗ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo "Access Token: ${ACCESS_TOKEN:0:20}..."
echo ""

# Check recommendations
echo -e "${YELLOW}[STEP 2] Fetching personalized recommendations...${NC}"
RECS_RESPONSE=$(curl -s -X GET "$API_URL/recommendations/personalized" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response:"
echo "$RECS_RESPONSE" | jq '.' || echo "$RECS_RESPONSE"
echo ""

# Check if recommendations exist
REC_COUNT=$(echo "$RECS_RESPONSE" | jq '.data | length' 2>/dev/null || echo "0")
echo "Recommendation count: $REC_COUNT"

if [ "$REC_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Recommendations found${NC}"
    echo ""
    echo "Top 5 recommendations:"
    echo "$RECS_RESPONSE" | jq -r '.data[0:5] | .[] | "  - \(.content.title) (\(.content.type)) - \(.reason[0:80])..."'
else
    echo -e "${RED}✗ No recommendations found${NC}"
fi
echo ""

# Force refresh recommendations
echo -e "${YELLOW}[STEP 3] Force refreshing recommendations...${NC}"
REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/recommendations/refresh" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response:"
echo "$REFRESH_RESPONSE" | jq '.meta' || echo "$REFRESH_RESPONSE"
echo ""

REFRESH_COUNT=$(echo "$REFRESH_RESPONSE" | jq '.data | length' 2>/dev/null || echo "0")
echo "New recommendation count: $REFRESH_COUNT"

if [ "$REFRESH_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Recommendations refreshed${NC}"
    echo ""
    echo "New recommendations:"
    echo "$REFRESH_RESPONSE" | jq -r '.data[0:5] | .[] | "  - \(.content.title) (\(.content.type)) - \(.reason[0:80])..."'
else
    echo -e "${RED}✗ Refresh failed${NC}"
fi
echo ""

echo "=========================================="
echo "Test Complete"
echo "=========================================="
