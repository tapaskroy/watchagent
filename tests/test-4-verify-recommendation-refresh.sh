#!/bin/bash

# Test Case 4: Verify Recommendations Refresh After Onboarding
# This test creates a new user, completes onboarding, and verifies personalized recommendations

set -e

API_URL="http://localhost:3000/api/v1"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TIMESTAMP=$(date +%s)
TEST_EMAIL="refreshtest${TIMESTAMP}@example.com"
TEST_PASSWORD="TestPass123!"
TEST_USERNAME="refreshtest${TIMESTAMP}"

echo "=========================================="
echo "Test Case 4: Verify Recommendation Refresh"
echo "=========================================="
echo ""

# Step 1: Create new user
echo -e "${YELLOW}[STEP 1] Creating new test user...${NC}"
REGISTER_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"username\":\"$TEST_USERNAME\"}"

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  --data-raw "$REGISTER_DATA")

ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}✗ Registration failed${NC}"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi

USER_ID=$(echo "$ACCESS_TOKEN" | cut -d'.' -f2 | base64 -D 2>/dev/null | jq -r '.id // empty' || echo "unknown")

echo -e "${GREEN}✓ User created${NC}"
echo "User ID: $USER_ID"
echo ""

# Step 2: Get initial recommendations (before onboarding)
echo -e "${YELLOW}[STEP 2] Getting recommendations BEFORE onboarding...${NC}"
RECS_BEFORE=$(curl -s -X GET "$API_URL/recommendations/personalized" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

BEFORE_COUNT=$(echo "$RECS_BEFORE" | jq '.data | length' 2>/dev/null || echo "0")
echo "Recommendations before onboarding: $BEFORE_COUNT"

if [ "$BEFORE_COUNT" -gt 0 ]; then
    echo "Top recommendation before:"
    echo "$RECS_BEFORE" | jq -r '.data[0] | "  - \(.content.title): \(.reason[0:80])..."'
fi
echo ""

# Step 3: Get conversation
echo -e "${YELLOW}[STEP 3] Getting conversation...${NC}"
CONV_RESPONSE=$(curl -s -X GET "$API_URL/chat/conversation" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

CONVERSATION_ID=$(echo "$CONV_RESPONSE" | jq -r '.data.conversationId')
echo "Conversation ID: $CONVERSATION_ID"
echo ""

# Step 4: Initialize onboarding
echo -e "${YELLOW}[STEP 4] Initializing onboarding...${NC}"
curl -s -X POST "$API_URL/chat/init-onboarding" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' > /dev/null
echo -e "${GREEN}✓ Onboarding initialized${NC}"
echo ""

# Step 5: Answer onboarding questions with unique preferences
echo -e "${YELLOW}[STEP 5] Completing onboarding with specific preferences...${NC}"

ANSWER_1="I love horror movies and thrillers! My favorites are Get Out, Hereditary, The Shining, and A Quiet Place. I'm obsessed with psychological horror that makes you think. Also love true crime documentaries like Making a Murderer."

ANSWER_2="Horror, thriller, psychological horror, crime, mystery. I hate romantic comedies and musicals - they're not for me at all."

ANSWER_3="Mostly movies, love dark atmospheric content, prefer English but okay with subtitles. I want stuff that's creepy and unsettling, not gore for the sake of gore."

# Send answers
for i in 1 2 3; do
    ANSWER_VAR="ANSWER_$i"
    ANSWER="${!ANSWER_VAR}"

    echo -e "${BLUE}Sending answer $i...${NC}"

    MSG_RESPONSE=$(curl -s -X POST "$API_URL/chat/message" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\":\"$CONVERSATION_ID\",\"message\":$(echo "$ANSWER" | jq -Rs .)}")

    ONBOARDING_COMPLETED=$(echo "$MSG_RESPONSE" | jq -r '.data.onboardingCompleted')
    echo "  Onboarding completed: $ONBOARDING_COMPLETED"

    if [ "$ONBOARDING_COMPLETED" = "true" ]; then
        echo -e "${GREEN}✓ Onboarding completed!${NC}"
        break
    fi
done
echo ""

# Step 6: Wait for recommendations to be generated
echo -e "${YELLOW}[STEP 6] Waiting for recommendations to be generated...${NC}"
sleep 3
echo -e "${GREEN}✓ Wait complete${NC}"
echo ""

# Step 7: Get recommendations AFTER onboarding
echo -e "${YELLOW}[STEP 7] Getting recommendations AFTER onboarding...${NC}"
RECS_AFTER=$(curl -s -X GET "$API_URL/recommendations/personalized" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

AFTER_COUNT=$(echo "$RECS_AFTER" | jq '.data | length' 2>/dev/null || echo "0")
echo "Recommendations after onboarding: $AFTER_COUNT"

if [ "$AFTER_COUNT" -gt 0 ]; then
    echo ""
    echo "Top 5 recommendations after (should be horror/thriller focused):"
    echo "$RECS_AFTER" | jq -r '.data[0:5] | .[] | "  - \(.content.title) (\(.content.type)): \(.reason[0:100])..."'
    echo ""

    # Check if recommendations mention horror/thriller
    if echo "$RECS_AFTER" | grep -qi "horror\|thriller\|psychological\|suspense\|dark"; then
        echo -e "${GREEN}✓ Recommendations are personalized! (Horror/thriller keywords found)${NC}"
    else
        echo -e "${YELLOW}⚠ Recommendations may not be fully personalized yet${NC}"
    fi
else
    echo -e "${RED}✗ No recommendations found after onboarding${NC}"
fi
echo ""

# Step 8: Check if preferences were stored
echo -e "${YELLOW}[STEP 8] Checking stored preferences...${NC}"
PREFS_RESPONSE=$(curl -s -X GET "$API_URL/preferences/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$PREFS_RESPONSE" | jq -e '.data.preferences.learnedPreferences' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Learned preferences stored${NC}"
    echo ""
    echo "Learned preferences:"
    echo "$PREFS_RESPONSE" | jq '.data.preferences.learnedPreferences'
else
    echo -e "${RED}✗ No learned preferences found${NC}"
fi
echo ""

# Final summary
echo "=========================================="
echo -e "${GREEN}TEST CASE 4: COMPLETED${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  User created: $TEST_EMAIL"
echo "  Recommendations before: $BEFORE_COUNT"
echo "  Recommendations after: $AFTER_COUNT"
echo ""

if [ "$AFTER_COUNT" -gt "$BEFORE_COUNT" ] || [ "$AFTER_COUNT" -gt 10 ]; then
    echo -e "${GREEN}✅ SUCCESS: Recommendations were generated/refreshed after onboarding${NC}"
else
    echo -e "${YELLOW}⚠️  PARTIAL: Recommendations count didn't increase significantly${NC}"
fi
echo ""
echo "Manual Test Steps:"
echo "  1. Open http://localhost:3001 in browser"
echo "  2. Login with: $TEST_EMAIL / $TEST_PASSWORD"
echo "  3. Verify home page shows horror/thriller recommendations"
echo "  4. Check that recommendations are NOT the same as other users"
