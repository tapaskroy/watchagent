# WatchAgent

A comprehensive video recommendation service with LLM-powered personalized suggestions, social features, and cross-platform support.

## Overview

WatchAgent is a full-stack application that provides intelligent movie and TV show recommendations using Claude Sonnet 4.5. The platform combines content-based filtering, collaborative filtering, and natural language processing to deliver highly personalized recommendations with human-readable explanations.

### Key Features

- 🤖 **LLM-Powered Recommendations**: Uses Claude Sonnet 4.5 for natural, explainable recommendations
- 🎬 **Multi-Source Data**: Aggregates data from TMDB and OMDB APIs
- 👥 **Social Features**: Follow friends, share recommendations, and see what others are watching
- 📱 **Cross-Platform**: Web (Next.js) and mobile (React Native) apps with 90% code sharing
- 🔐 **Secure Authentication**: JWT-based auth with refresh tokens
- ⚡ **High Performance**: Redis caching, PostgreSQL optimization, and efficient API rate limiting
- 🎨 **Modern UI**: Clean, visual interface with dark mode support

## Architecture

### Tech Stack

**Backend:**
- **Framework**: Fastify (Node.js/TypeScript)
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis
- **External APIs**: TMDB, OMDB, Anthropic Claude
- **Authentication**: JWT with refresh tokens

**Frontend:**
- **Web**: Next.js 14 with TypeScript
- **Mobile**: React Native 0.73
- **Shared UI**: React Native Web for cross-platform components
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Styling**: Tailwind CSS (Web), React Native StyleSheet (Mobile)

**Infrastructure:**
- **Monorepo**: Turborepo for efficient builds
- **Deployment**: AWS (EC2, RDS, ElastiCache, S3, CloudFront)
- **IaC**: Terraform
- **CI/CD**: GitHub Actions

### Project Structure

```
watchagent/
├── apps/
│   ├── api/              # Fastify backend API
│   │   ├── src/
│   │   │   ├── config/   # Configuration (env, redis, logger, anthropic)
│   │   │   ├── middleware/ # Auth, error handling
│   │   │   ├── modules/  # Feature modules (auth, users, content, etc.)
│   │   │   ├── services/ # Business logic services
│   │   │   │   ├── auth/
│   │   │   │   ├── external-apis/ # TMDB, OMDB, aggregator
│   │   │   │   └── recommendation/ # LLM-powered recommendations
│   │   │   └── app.ts    # Fastify application setup
│   │   └── .env.example
│   ├── web/              # Next.js web application
│   └── mobile/           # React Native app
├── packages/
│   ├── shared/           # Shared types, constants, utils
│   │   ├── src/
│   │   │   ├── types/    # TypeScript type definitions
│   │   │   ├── constants/ # App constants and configs
│   │   │   └── utils/    # Utility functions
│   ├── database/         # Database schema and migrations
│   │   ├── src/
│   │   │   ├── schema/   # Drizzle ORM schema
│   │   │   ├── migrations/ # Database migrations
│   │   │   └── scripts/  # Migration and seed scripts
│   ├── api-client/       # API client for web/mobile
│   └── ui/               # Shared React components
└── infrastructure/
    ├── terraform/        # AWS infrastructure
    └── docker/           # Docker configurations
```

## Database Schema

### Core Tables

- **users**: User accounts and profiles
- **user_preferences**: Genre/actor preferences, notification settings
- **content**: Cached movie/TV data from TMDB/OMDB
- **watchlist_items**: User watchlists with status (to_watch, watching, watched)
- **ratings**: User ratings and reviews (0-10 scale)
- **follows**: Social graph (follower/following relationships)
- **activities**: Activity feed events
- **recommendations**: Pre-computed LLM recommendations
- **sessions**: Refresh token storage
- **api_cache**: External API response cache

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL >= 14
- Redis >= 6
- npm >= 10.0.0

### Environment Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd watchagent
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy `.env.example` files in each app and configure:

```bash
# API
cp apps/api/.env.example apps/api/.env

# Database
cp packages/database/.env.example packages/database/.env
```

Required API keys:
- **TMDB**: Get from [themoviedb.org](https://www.themoviedb.org/settings/api)
- **OMDB**: Get from [omdbapi.com](http://www.omdbapi.com/apikey.aspx)
- **Anthropic**: Get from [console.anthropic.com](https://console.anthropic.com/)

4. **Set up database**

```bash
# Create PostgreSQL database
createdb watchagent

# Run migrations
npm run db:migrate

# Seed sample data (optional)
npm run db:seed
```

5. **Start Redis**

```bash
redis-server
```

### Development

Start all services in development mode:

```bash
npm run dev
```

This starts:
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs (Swagger UI)
- **Web**: http://localhost:3001
- **Mobile**: Expo DevTools on port 19000

Start individual services:

```bash
# API only
npm run dev --workspace=@watchagent/api

# Web only
npm run dev --workspace=@watchagent/web

# Mobile only
npm run dev --workspace=@watchagent/mobile
```

### Testing

```bash
# Run all tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Linting and Formatting

```bash
# Lint all packages
npm run lint

# Format all files
npm run format
```

## API Documentation

### Authentication Endpoints

#### POST /api/v1/auth/register
Register a new user account.

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecureP@ss123",
  "fullName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

#### POST /api/v1/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecureP@ss123",
  "rememberMe": true
}
```

#### POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST /api/v1/auth/logout
Logout and revoke refresh token.

### Content Endpoints (Coming Soon)
- `GET /api/v1/content/search` - Search movies/TV shows
- `GET /api/v1/content/:id` - Get content details
- `GET /api/v1/content/trending` - Get trending content
- `GET /api/v1/content/popular` - Get popular content

### Recommendation Endpoints (Coming Soon)
- `GET /api/v1/recommendations/personalized` - Get LLM-powered recommendations
- `GET /api/v1/recommendations/similar/:id` - Get similar content

### Watchlist Endpoints (Coming Soon)
- `GET /api/v1/watchlist` - Get user's watchlist
- `POST /api/v1/watchlist` - Add to watchlist
- `PUT /api/v1/watchlist/:id` - Update watchlist item
- `DELETE /api/v1/watchlist/:id` - Remove from watchlist

### Social Endpoints (Coming Soon)
- `POST /api/v1/social/follow/:userId` - Follow user
- `DELETE /api/v1/social/unfollow/:userId` - Unfollow user
- `GET /api/v1/social/feed` - Get activity feed

## LLM-Powered Recommendations

### How It Works

1. **Context Building**: Gathers user preferences, viewing history, ratings, and social context
2. **Candidate Selection**: Fetches ~500 diverse content items from TMDB (trending, genre matches, high-rated, new releases)
3. **LLM Analysis**: Claude Sonnet 4.5 analyzes the user's taste and selects 20 best matches
4. **Personalized Reasons**: Each recommendation includes a natural language explanation
5. **Caching**: Results cached for 24 hours to minimize API costs

### Cost Management

- **Per Request**: ~$0.023 (2,500 input + 1,000 output tokens)
- **Monthly at Scale**:
  - 1,000 users: ~$23/month
  - 10,000 users: ~$230/month
  - 100,000 users: ~$2,300/month

Optimization strategies:
- 24-48 hour cache TTL
- On-demand generation
- Batch processing during off-peak hours
- Fallback to trending content

### Example Recommendation

```json
{
  "id": "abc123",
  "contentId": "xyz789",
  "score": 0.95,
  "reason": "Because you loved Inception's mind-bending plot and Christopher Nolan's direction, and rated it 9/10 for its complex storytelling.",
  "algorithm": "llm",
  "content": {
    "title": "Interstellar",
    "type": "movie",
    "genres": ["Sci-Fi", "Drama"],
    "tmdbRating": 8.6,
    "posterPath": "/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg"
  }
}
```

## Performance & Scalability

### Caching Strategy

**3-Tier Caching:**
1. **Redis (Hot)**: 1 hour TTL for frequently accessed data
2. **Redis (Warm)**: 24 hours TTL for user-specific data
3. **PostgreSQL**: 7+ days for API responses and recommendations

### Rate Limiting

- **TMDB**: 40 requests/10 seconds using Bottleneck
- **OMDB**: 1000 requests/day
- **API Endpoints**: 100 requests/minute per user

### Database Optimization

- Strategic indexing on frequently queried fields
- JSONB indexes for genre/cast searches using GIN
- Materialized views for complex analytics (coming soon)
- Read replicas for query scaling (production)

## Deployment

### AWS Architecture

```
Route 53 → CloudFront (CDN)
           ├─→ S3 (Next.js static assets)
           └─→ ALB (Application Load Balancer)
               └─→ Auto Scaling Group (EC2 t3.medium)
                   ├─→ ElastiCache Redis
                   └─→ RDS PostgreSQL Multi-AZ
```

### Terraform Deployment

```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

### Docker

```bash
# Build API image
docker build -f infrastructure/docker/api.Dockerfile -t watchagent-api .

# Run with Docker Compose
docker-compose up
```

## Contributing

### Development Workflow

1. Create a feature branch from `develop`
2. Make your changes
3. Run tests: `npm run test`
4. Run linter: `npm run lint`
5. Commit with conventional commits (feat:, fix:, docs:, etc.)
6. Create a pull request

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Follow existing patterns and conventions
- Write tests for new features

## License

[MIT License](LICENSE)

## Support

For issues and questions:
- GitHub Issues: [github.com/your-org/watchagent/issues](https://github.com/your-org/watchagent/issues)
- Documentation: [docs.watchagent.com](https://docs.watchagent.com) (coming soon)

## Roadmap

### Phase 1: MVP (Current)
- [x] Monorepo setup with Turborepo
- [x] Database schema and migrations
- [x] Shared types package
- [x] Fastify API structure
- [x] JWT authentication
- [x] TMDB & OMDB integration
- [x] LLM-powered recommendations
- [ ] Content search and detail routes
- [ ] Watchlist management
- [ ] Rating system
- [ ] Next.js web app
- [ ] Basic UI components

### Phase 2: Social Features
- [ ] Follow/unfollow system
- [ ] Activity feed
- [ ] Friend discovery
- [ ] Share recommendations
- [ ] WebSocket real-time updates

### Phase 3: Mobile App
- [ ] React Native setup
- [ ] Shared UI components with react-native-web
- [ ] Authentication screens
- [ ] Core mobile features
- [ ] Offline support
- [ ] Push notifications

### Phase 4: Enhancement
- [ ] Advanced filters
- [ ] Watchlist organization
- [ ] Export functionality
- [ ] Email notifications
- [ ] Performance monitoring
- [ ] Analytics dashboard

### Phase 5: Production
- [ ] AWS deployment with Terraform
- [ ] CI/CD pipeline
- [ ] Monitoring and alerting
- [ ] Security audit
- [ ] Load testing
- [ ] Documentation site

## Acknowledgments

- **TMDB**: Movie and TV show data
- **OMDB**: IMDb ratings and additional metadata
- **Anthropic**: Claude Sonnet 4.5 for LLM-powered recommendations
- **Open Source**: All the amazing libraries and tools that made this possible
