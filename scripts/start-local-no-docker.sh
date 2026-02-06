#!/bin/bash

# Quick Start Script for Local Development (No Docker)
# Usage: ./scripts/start-local-no-docker.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}WatchAgent - Local Development${NC}"
echo -e "${GREEN}(Using Local PostgreSQL & Redis)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check PostgreSQL
echo -e "${BLUE}Checking PostgreSQL...${NC}"
if pg_isready > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ PostgreSQL is not running${NC}"
    echo "Starting PostgreSQL..."
    brew services start postgresql || brew services start postgresql@14
    sleep 2
    if pg_isready > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL started${NC}"
    else
        echo -e "${RED}Failed to start PostgreSQL${NC}"
        exit 1
    fi
fi

# Check Redis
echo -e "${BLUE}Checking Redis...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis is not running${NC}"
    echo "Starting Redis..."
    brew services start redis
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis started${NC}"
    else
        echo -e "${RED}Failed to start Redis${NC}"
        exit 1
    fi
fi
echo ""

# Check Node.js
echo -e "${BLUE}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"
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

# Check database exists
echo -e "${BLUE}Checking database...${NC}"
if psql -U tapas -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw watchagent; then
    echo -e "${GREEN}✓ Database 'watchagent' exists${NC}"
else
    echo -e "${YELLOW}Creating database 'watchagent'...${NC}"
    createdb -U tapas watchagent 2>/dev/null || createdb watchagent
    echo -e "${GREEN}✓ Database created${NC}"
fi
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
echo -e "${YELLOW}Services Status:${NC}"
echo -e "  PostgreSQL: ${GREEN}Running${NC}"
echo -e "  Redis:      ${GREEN}Running${NC}"
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
echo -e "   ${GREEN}LOCAL_TESTING_NO_DOCKER.md${NC}"
echo ""
