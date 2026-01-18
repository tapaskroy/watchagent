# Quick Setup Guide

This guide will help you get WatchAgent running locally in under 10 minutes.

## Prerequisites Checklist

- [ ] Node.js 20+ installed (`node --version`)
- [ ] PostgreSQL 14+ installed and running
- [ ] Redis 6+ installed and running
- [ ] npm 10+ installed (`npm --version`)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all dependencies for all workspaces in the monorepo.

### 2. Set Up PostgreSQL

```bash
# Create database
createdb watchagent

# Or using psql
psql postgres
CREATE DATABASE watchagent;
\q
```

### 3. Set Up Redis

```bash
# Start Redis server
redis-server

# Or on macOS with Homebrew
brew services start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 4. Configure Environment Variables

#### API Environment

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and configure:

```env
# Database (update if needed)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=watchagent
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Redis (update if needed)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets (generate secure secrets)
JWT_ACCESS_SECRET=your-super-secret-access-token-min-32-chars-long-here
JWT_REFRESH_SECRET=your-super-secret-refresh-token-min-32-chars-long-here

# External API Keys (required)
TMDB_API_KEY=get_from_themoviedb.org
OMDB_API_KEY=get_from_omdbapi.com
ANTHROPIC_API_KEY=get_from_console.anthropic.com
```

#### Database Environment

```bash
cp packages/database/.env.example packages/database/.env
```

Edit `packages/database/.env` (use same values as above):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=watchagent
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

### 5. Get API Keys

#### TMDB API Key (Free)
1. Go to https://www.themoviedb.org/
2. Create an account (free)
3. Go to Settings → API
4. Request an API key (instant approval)
5. Copy the API Key (v3 auth)

#### OMDB API Key (Free)
1. Go to http://www.omdbapi.com/apikey.aspx
2. Enter your email
3. Select "FREE! (1,000 daily limit)"
4. Verify your email
5. Copy your API key from the email

#### Anthropic API Key (Paid)
1. Go to https://console.anthropic.com/
2. Create an account
3. Go to Settings → API Keys
4. Create a new API key
5. Copy the key

> **Note**: Anthropic charges for API usage. Claude Sonnet 4.5 costs:
> - Input: $3 per million tokens
> - Output: $15 per million tokens
> - Estimated cost per recommendation: ~$0.023
> - With 24hr caching, costs are minimal for testing

### 6. Run Database Migrations

```bash
npm run db:migrate
```

### 7. Seed Sample Data (Optional)

```bash
npm run db:seed
```

This creates a test user:
- Email: `test@example.com`
- Password: `password123`

### 8. Start Development Server

```bash
npm run dev
```

This starts:
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs

### 9. Verify Everything Works

#### Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-17T...",
  "environment": "development"
}
```

#### Test API Docs

Open http://localhost:3000/docs in your browser. You should see the Swagger UI with all API endpoints documented.

#### Test Registration

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecureP@ss123",
    "fullName": "Test User"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbG...",
    "expiresIn": 900
  }
}
```

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, change it in `apps/api/.env`:

```env
PORT=3001
```

### Database Connection Failed

Check PostgreSQL is running:

```bash
# macOS with Homebrew
brew services list

# Or check manually
psql -U postgres -c "SELECT version();"
```

### Redis Connection Failed

Check Redis is running:

```bash
redis-cli ping
```

If not running:

```bash
# macOS with Homebrew
brew services start redis

# Linux
sudo systemctl start redis

# Or manually
redis-server
```

### Module Not Found Errors

Clear node_modules and reinstall:

```bash
npm run clean
npm install
```

### Build Errors in Turborepo

Build all packages first:

```bash
npm run build
```

## Next Steps

Once everything is running:

1. **Explore API Docs**: http://localhost:3000/docs
2. **Test Authentication**: Register and login
3. **Test Content Search**: Use TMDB API to search for movies
4. **Generate Recommendations**: Create some ratings and get personalized recommendations

## Development Tips

### Watch Mode

All packages support watch mode for hot reloading:

```bash
# API with auto-restart
npm run dev --workspace=@watchagent/api

# Packages build on change
npm run dev --workspace=@watchagent/shared
```

### Database Management

```bash
# Run migrations
npm run db:migrate

# Create new migration
npm run db:migrate:create --workspace=@watchagent/database

# Seed data
npm run db:seed

# Reset database (careful!)
dropdb watchagent && createdb watchagent && npm run db:migrate
```

### Redis Management

```bash
# View all keys
redis-cli KEYS '*'

# Clear cache
redis-cli FLUSHALL

# Monitor commands
redis-cli MONITOR
```

### Testing

```bash
# Run all tests
npm run test

# Run specific workspace tests
npm run test --workspace=@watchagent/api

# Watch mode
npm run test -- --watch
```

## Getting Help

- Check the main [README.md](./README.md) for comprehensive documentation
- Review error logs in terminal
- Check PostgreSQL logs: `/usr/local/var/log/postgres.log` (macOS)
- Check Redis logs: `/usr/local/var/log/redis.log` (macOS)

## Common Issues

### Issue: "Cannot find module '@watchagent/shared'"

**Solution**: Build the shared package first:

```bash
npm run build --workspace=@watchagent/shared
```

### Issue: JWT secret too short

**Solution**: Generate secure secrets (32+ characters):

```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Issue: TMDB API rate limit

**Solution**: The service includes automatic rate limiting (40 req/10s) and caching. If you hit limits:
- Wait 10 seconds
- Check Redis cache is working
- Reduce concurrent requests

### Issue: Anthropic API errors

**Solution**:
- Verify API key is correct
- Check you have credits in your Anthropic account
- Monitor usage at https://console.anthropic.com/

Happy coding! 🚀
