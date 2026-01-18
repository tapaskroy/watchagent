# Getting Started - Local Development

## Current Status

✅ Project structure created
✅ All code files committed to local git
⏳ Ready for dependency installation and testing

## Step 1: Install Prerequisites

### Install Node.js and npm

**Option A: Using Homebrew (Recommended for macOS)**
```bash
brew install node@20
```

**Option B: Using nvm (Node Version Manager)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then:
nvm install 20
nvm use 20
```

**Option C: Download from nodejs.org**
- Visit https://nodejs.org/
- Download Node.js 20 LTS
- Run the installer

**Verify installation:**
```bash
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Install PostgreSQL

**macOS:**
```bash
# Using Homebrew
brew install postgresql@14
brew services start postgresql@14

# Or download from: https://postgresapp.com/
```

**Verify:**
```bash
psql --version  # Should show PostgreSQL 14.x or higher
```

### Install Redis

**macOS:**
```bash
# Using Homebrew
brew install redis
brew services start redis
```

**Verify:**
```bash
redis-cli ping  # Should return "PONG"
```

## Step 2: Install Project Dependencies

Once Node.js is installed:

```bash
cd /Users/tapas/code/watchagent
npm install
```

This will install all dependencies for all packages in the monorepo.

## Step 3: Build Shared Packages

Build packages that other apps depend on:

```bash
# Build shared types and utilities
npm run build --workspace=@watchagent/shared

# Build database package
npm run build --workspace=@watchagent/database
```

## Step 4: Set Up Environment Variables

### Get API Keys

1. **TMDB API Key** (Free)
   - Go to https://www.themoviedb.org/signup
   - After signing up, go to Settings → API
   - Request an API key (instant approval)

2. **OMDB API Key** (Free)
   - Go to http://www.omdbapi.com/apikey.aspx
   - Enter email and select "FREE! (1,000 daily limit)"
   - Check your email for the key

3. **Anthropic API Key** (Paid, but affordable for testing)
   - Go to https://console.anthropic.com/
   - Sign up and add payment method
   - Go to Settings → API Keys → Create Key
   - **Note**: ~$0.023 per recommendation generation, cached for 24hrs

### Configure API Environment

```bash
# Copy example files
cp apps/api/.env.example apps/api/.env
cp packages/database/.env.example packages/database/.env
```

Edit `apps/api/.env`:
```bash
# Generate secure secrets (run this command):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Then update .env with:
JWT_ACCESS_SECRET=<generated_secret_1>
JWT_REFRESH_SECRET=<generated_secret_2>
TMDB_API_KEY=<your_tmdb_key>
OMDB_API_KEY=<your_omdb_key>
ANTHROPIC_API_KEY=<your_anthropic_key>

# Database (update if needed)
DB_PASSWORD=<your_postgres_password>
```

Edit `packages/database/.env` with same database credentials.

## Step 5: Set Up Database

```bash
# Create database
createdb watchagent

# Or using psql:
psql postgres
CREATE DATABASE watchagent;
\q

# Run migrations
npm run db:migrate

# (Optional) Seed sample data
npm run db:seed
```

## Step 6: Start Development Server

```bash
npm run dev
```

This starts the API server at http://localhost:3000

## Step 7: Test the API

### Test Health Endpoint
```bash
curl http://localhost:3000/health
```

### View API Documentation
Open http://localhost:3000/docs in your browser

### Test User Registration
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecureP@ss123",
    "fullName": "John Doe"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecureP@ss123"
  }'
```

## Troubleshooting

### "command not found: node"
- Node.js is not installed. See Step 1.

### "command not found: psql"
- PostgreSQL is not installed. See Step 1.

### "ECONNREFUSED" errors
- PostgreSQL or Redis is not running
- Start them: `brew services start postgresql@14 && brew services start redis`

### Port 3000 already in use
- Change port in `apps/api/.env`: `PORT=3001`

### Module not found errors
- Build shared packages: `npm run build --workspace=@watchagent/shared`
- Or rebuild everything: `npm run build`

## Next Steps

Once the API is running:

1. ✅ Test authentication endpoints
2. ✅ Verify database connections
3. ✅ Test external API integrations (TMDB/OMDB)
4. ✅ Generate your first LLM recommendation
5. 🚀 Build the web/mobile frontends
6. 📦 Push to GitHub when ready

## Quick Reference

```bash
# Start everything
npm run dev

# Run tests
npm run test

# Build all packages
npm run build

# Lint code
npm run lint

# Format code
npm run format

# Database migrations
npm run db:migrate

# View logs
# API logs appear in terminal where you ran `npm run dev`
```

## Need Help?

- Check the main [README.md](./README.md)
- Review [SETUP.md](./SETUP.md) for detailed setup guide
- Check PostgreSQL logs: `/usr/local/var/log/postgres.log`
- Check Redis: `redis-cli ping`
