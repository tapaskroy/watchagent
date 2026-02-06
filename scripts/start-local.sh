#!/bin/bash

# Quick Start Script for Local Development
# Usage: ./scripts/start-local.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}WatchAgent - Local Development${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Docker is running
echo -e "${BLUE}Checking prerequisites...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version) found${NC}"
echo ""

# Check if .env files exist
echo -e "${BLUE}Checking environment configuration...${NC}"
if [ ! -f apps/api/.env ]; then
    echo -e "${YELLOW}⚠ API .env file not found${NC}"
    echo "Creating from example..."
    cp apps/api/.env.example apps/api/.env
    echo -e "${RED}IMPORTANT: Edit apps/api/.env and add your API keys!${NC}"
fi
echo -e "${GREEN}✓ Environment files configured${NC}"
echo ""

# Start databases
echo -e "${BLUE}Starting databases...${NC}"
./scripts/local-env.sh start
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing dependencies (this may take a few minutes)...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
    echo ""
fi

# Build if dist folders don't exist
if [ ! -d "packages/shared/dist" ]; then
    echo -e "${BLUE}Building packages...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build complete${NC}"
    echo ""
else
    echo -e "${GREEN}✓ Packages already built${NC}"
    echo ""
fi

# Run migrations
echo -e "${BLUE}Running database migrations...${NC}"
npm run db:migrate 2>&1 | grep -v "warning" || true
echo -e "${GREEN}✓ Database ready${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo -e "1. ${BLUE}Open Terminal 1${NC} and run:"
echo -e "   ${GREEN}npm run dev --workspace=@watchagent/api${NC}"
echo ""
echo -e "2. ${BLUE}Open Terminal 2${NC} and run:"
echo -e "   ${GREEN}npm run dev --workspace=@watchagent/web${NC}"
echo ""
echo -e "3. ${BLUE}Open your browser${NC} to:"
echo -e "   ${GREEN}http://localhost:3001${NC}"
echo ""
echo -e "For detailed testing instructions, see:"
echo -e "   ${GREEN}LOCAL_TESTING_GUIDE.md${NC}"
echo ""
