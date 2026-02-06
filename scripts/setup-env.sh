#!/bin/bash

# Setup Environment Files
# This script helps set up .env files from .env.example templates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Environment Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Function to copy env file if it doesn't exist
copy_env_file() {
    local example_file=$1
    local target_file=$2
    local description=$3

    if [ -f "$target_file" ]; then
        echo -e "${YELLOW}⚠ $target_file already exists${NC}"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}→ Skipping $description${NC}"
            return
        fi
    fi

    if [ -f "$example_file" ]; then
        cp "$example_file" "$target_file"
        echo -e "${GREEN}✓ Created $target_file${NC}"
    else
        echo -e "${RED}✗ $example_file not found${NC}"
    fi
}

# Copy environment files
echo -e "${BLUE}Setting up environment files...${NC}"
echo ""

copy_env_file "apps/api/.env.example" "apps/api/.env" "API environment"
copy_env_file "apps/web/.env.example" "apps/web/.env.local" "Web environment"
copy_env_file "packages/database/.env.example" "packages/database/.env" "Database environment"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Important: Update Your API Keys!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "You need to update the following files with your actual API keys:"
echo ""
echo -e "${YELLOW}1. apps/api/.env${NC}"
echo "   - TMDB_API_KEY (Get from: https://www.themoviedb.org/settings/api)"
echo "   - OMDB_API_KEY (Get from: http://www.omdbapi.com/apikey.aspx)"
echo "   - ANTHROPIC_API_KEY (Get from: https://console.anthropic.com/)"
echo "   - JWT_ACCESS_SECRET (Generate a random 32+ character string)"
echo "   - JWT_REFRESH_SECRET (Generate a different random 32+ character string)"
echo ""
echo -e "${YELLOW}2. packages/database/.env${NC}"
echo "   - DB_PASSWORD (Set a secure database password)"
echo ""
echo -e "${BLUE}Quick generate secrets:${NC}"
echo "  openssl rand -hex 32"
echo ""
echo -e "${RED}IMPORTANT: Never commit .env files to git!${NC}"
echo "They are already in .gitignore, but always double-check before committing."
echo ""

# Offer to generate secrets
read -p "Would you like to generate JWT secrets now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    JWT_ACCESS=$(openssl rand -hex 32)
    JWT_REFRESH=$(openssl rand -hex 32)

    echo ""
    echo -e "${GREEN}Generated JWT secrets:${NC}"
    echo ""
    echo "JWT_ACCESS_SECRET=$JWT_ACCESS"
    echo "JWT_REFRESH_SECRET=$JWT_REFRESH"
    echo ""
    echo -e "${YELLOW}Copy these to apps/api/.env${NC}"
    echo ""
fi

echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit the .env files and add your API keys"
echo "  2. Start the development environment:"
echo "     docker-compose -f docker-compose.dev.yml up -d"
echo "  3. Run the application:"
echo "     npm run dev"
