#!/bin/bash

# Manage Local Development Environment
# Usage: ./scripts/local-env.sh [start|stop|restart|status|logs]

set -e

COMMAND=${1:-start}
COMPOSE_FILE="docker-compose.dev.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

case $COMMAND in
    start)
        echo -e "${GREEN}Starting local development environment...${NC}"
        docker-compose -f $COMPOSE_FILE up -d
        echo ""
        echo -e "${GREEN}✓ Environment started${NC}"
        echo ""
        echo "Services running:"
        docker-compose -f $COMPOSE_FILE ps
        echo ""
        echo "Connection details:"
        echo "  PostgreSQL: localhost:5432"
        echo "    Database: watchagent"
        echo "    Username: postgres"
        echo "    Password: postgres"
        echo ""
        echo "  Redis: localhost:6379"
        echo ""
        echo "To view logs: $0 logs"
        echo "To stop: $0 stop"
        ;;

    stop)
        echo -e "${YELLOW}Stopping local development environment...${NC}"
        docker-compose -f $COMPOSE_FILE down
        echo -e "${GREEN}✓ Environment stopped${NC}"
        ;;

    restart)
        echo -e "${YELLOW}Restarting local development environment...${NC}"
        docker-compose -f $COMPOSE_FILE restart
        echo -e "${GREEN}✓ Environment restarted${NC}"
        ;;

    status)
        echo -e "${BLUE}Local development environment status:${NC}"
        echo ""
        docker-compose -f $COMPOSE_FILE ps
        ;;

    logs)
        SERVICE=${2:-}
        if [ -z "$SERVICE" ]; then
            docker-compose -f $COMPOSE_FILE logs -f
        else
            docker-compose -f $COMPOSE_FILE logs -f $SERVICE
        fi
        ;;

    clean)
        echo -e "${RED}WARNING: This will remove all containers and volumes!${NC}"
        read -p "Are you sure? (yes/NO): " -r
        if [ "$REPLY" = "yes" ]; then
            docker-compose -f $COMPOSE_FILE down -v
            echo -e "${GREEN}✓ Environment cleaned${NC}"
        else
            echo "Cancelled"
        fi
        ;;

    *)
        echo "Usage: $0 {start|stop|restart|status|logs|clean}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the development environment"
        echo "  stop    - Stop the development environment"
        echo "  restart - Restart the development environment"
        echo "  status  - Show status of services"
        echo "  logs    - Show logs (optional: specify service)"
        echo "  clean   - Remove all containers and volumes"
        exit 1
        ;;
esac
