# Local Testing Guide for WatchAgent

Complete guide to run and test your WatchAgent application locally.

## Prerequisites Check

Run these commands to verify you have everything installed:

```bash
node --version    # Should be v20.x or higher
npm --version     # Should be 10.x or higher
docker --version  # For running databases
```

If missing, install:
- **Node.js 20+**: https://nodejs.org/
- **Docker Desktop**: https://www.docker.com/products/docker-desktop/

## Quick Start (5 minutes)

### 1. Start Databases (1 minute)

```bash
cd /Users/tapas/code/watchagent

# Start PostgreSQL and Redis
./scripts/local-env.sh start

# Verify they're running
docker ps
```

You should see:
- `watchagent-postgres-dev` (PostgreSQL)
- `watchagent-redis-dev` (Redis)

### 2. Install Dependencies (2 minutes)

```bash
# Install all workspace dependencies
npm install

# This installs dependencies for:
# - Root workspace
# - apps/api
# - apps/web
# - All packages
```

### 3. Run Database Migrations (30 seconds)

```bash
# Create database tables
npm run db:migrate
```

### 4. Start the Application (30 seconds)

Open **two terminal windows**:

**Terminal 1 - API Server:**
```bash
cd /Users/tapas/code/watchagent
npm run dev --workspace=@watchagent/api
```

Wait for: `Server listening at http://0.0.0.0:3000`

**Terminal 2 - Web App:**
```bash
cd /Users/tapas/code/watchagent
npm run dev --workspace=@watchagent/web
```

Wait for: `Ready on http://localhost:3001`

### 5. Open the Application

```bash
# Open in your default browser
open http://localhost:3001
```

Or manually navigate to: **http://localhost:3001**

---

## Testing Guide

### Test 1: Health Check (API is running)

```bash
curl http://localhost:3000/health
```

**Expected:** `{"status":"ok"}`

### Test 2: Create a User Account

**In your browser:**
1. Go to http://localhost:3001
2. Click **"Sign Up"** or **"Register"**
3. Enter:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `password123`
4. Click **"Sign Up"**

**Expected:** Redirected to login or dashboard

### Test 3: Login

1. Go to http://localhost:3001/login
2. Enter credentials:
   - Email: `test@example.com`
   - Password: `password123`
3. Click **"Login"**

**Expected:** Successfully logged in, see dashboard

### Test 4: Search for Content

**Using the Web UI:**
1. Go to dashboard
2. Find the search bar
3. Search for: `"Inception"`
4. Click **"Search"**

**Expected:** See movie results with posters, titles, descriptions

**Using API directly:**
```bash
# Get auth token first (after login)
TOKEN="your-token-here"

# Search for movies
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/content/search?query=inception&type=movie"
```

### Test 5: Get Recommendations

**Web UI:**
1. Go to your profile or preferences
2. Select some favorite genres (e.g., "Action", "Sci-Fi")
3. Click **"Get Recommendations"**

**Expected:** See personalized movie/show recommendations

**API:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/recommendations"
```

### Test 6: Add to Watchlist

1. Find a movie in search results
2. Click **"Add to Watchlist"** or **"+"** button
3. Go to your watchlist page

**Expected:** Movie appears in your watchlist

### Test 7: Rate Content

1. Open a movie detail page
2. Give it a rating (1-5 stars or 1-10)
3. Submit rating

**Expected:** Rating saved and displayed

### Test 8: Chat with AI (LLM Recommendations)

If you have the chat feature:
1. Go to chat or AI recommendations
2. Type: `"Suggest some sci-fi movies like Interstellar"`
3. Send message

**Expected:** AI responds with personalized suggestions

---

## Advanced Testing

### Test API Endpoints Directly

#### 1. Register via API
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api@example.com",
    "password": "password123",
    "username": "apiuser"
  }'
```

#### 2. Login via API
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api@example.com",
    "password": "password123"
  }'
```

Save the `accessToken` from response.

#### 3. Get Content Details
```bash
TOKEN="paste-your-token-here"

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/content/550"  # Movie ID 550 = Fight Club
```

#### 4. Add to Watchlist
```bash
curl -X POST http://localhost:3000/api/v1/watchlist \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": 550,
    "contentType": "movie"
  }'
```

#### 5. Rate Content
```bash
curl -X POST http://localhost:3000/api/v1/ratings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": 550,
    "contentType": "movie",
    "rating": 8.5
  }'
```

---

## Debugging & Logs

### View API Logs
In Terminal 1 (where API is running), you'll see:
- Request logs
- Error messages
- Database queries (if enabled)

### View Web Logs
In Terminal 2 (where Web is running), you'll see:
- Page renders
- API calls
- React component updates

### View Database
Connect to PostgreSQL:
```bash
docker exec -it watchagent-postgres-dev psql -U postgres watchagent
```

Useful SQL commands:
```sql
-- List all tables
\dt

-- See users
SELECT * FROM users;

-- See watchlist
SELECT * FROM watchlist;

-- See ratings
SELECT * FROM ratings;

-- Exit
\q
```

### View Redis Cache
```bash
docker exec -it watchagent-redis-dev redis-cli

# List all keys
KEYS *

# Get a specific key
GET "cache:key:name"

# Clear all cache
FLUSHALL

# Exit
exit
```

---

## Common Issues

### Issue 1: Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Issue 2: Database Connection Failed

**Error:** `ECONNREFUSED ::1:5432`

**Solution:**
```bash
# Check if databases are running
docker ps

# If not running, start them
./scripts/local-env.sh start

# Check logs
./scripts/local-env.sh logs postgres
```

### Issue 3: Module Not Found

**Error:** `Cannot find module '@watchagent/...'`

**Solution:**
```bash
# Clean and reinstall
npm run clean
npm install
npm run build
```

### Issue 4: Build Errors

**Error:** TypeScript compilation errors

**Solution:**
```bash
# Build shared packages first
npm run build --workspace=@watchagent/shared
npm run build --workspace=@watchagent/database
npm run build --workspace=@watchagent/api-client
npm run build --workspace=@watchagent/ui

# Then build apps
npm run build
```

### Issue 5: API Keys Not Working

**Error:** `401 Unauthorized` from TMDB/OMDB

**Check:**
```bash
# Verify API keys are set
cat apps/api/.env | grep API_KEY

# Test TMDB directly
curl "https://api.themoviedb.org/3/movie/550?api_key=YOUR_TMDB_KEY"
```

---

## Performance Testing

### Test Load with Apache Bench

```bash
# Install Apache Bench (if needed)
brew install httpd  # macOS

# Test API endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:3000/health
```

### Test with Multiple Users

Open multiple browser windows/tabs and:
1. Create different user accounts
2. Perform searches simultaneously
3. Add items to watchlists
4. Test concurrent recommendations

---

## Test Checklist

Use this checklist to ensure everything works:

- [ ] Databases start successfully
- [ ] API server starts on port 3000
- [ ] Web app starts on port 3001
- [ ] Can access http://localhost:3001 in browser
- [ ] Health check returns OK
- [ ] Can create new user account
- [ ] Can login with credentials
- [ ] Can search for movies/shows
- [ ] Search results display correctly with images
- [ ] Can view movie/show details
- [ ] Can add items to watchlist
- [ ] Can remove items from watchlist
- [ ] Can rate content
- [ ] Ratings are saved and displayed
- [ ] Can get AI recommendations (if implemented)
- [ ] Profile page shows user data
- [ ] Can logout successfully
- [ ] Can login again after logout
- [ ] Database persists data after restart
- [ ] Redis caching works (faster on second request)

---

## Stop Testing

When done testing:

```bash
# Stop the development servers
# Press Ctrl+C in both Terminal 1 and Terminal 2

# Stop databases
./scripts/local-env.sh stop

# Or leave databases running for next session
# (They consume minimal resources)
```

---

## Next Steps After Testing

Once local testing is complete:

1. **Note any bugs** - Create a list of issues found
2. **Test user flows** - Try realistic user scenarios
3. **Performance** - Check if app feels responsive
4. **UI/UX** - Note any confusing interfaces
5. **Deploy to AWS** - Once account is verified

---

## Quick Reference

| Task | Command |
|------|---------|
| Start databases | `./scripts/local-env.sh start` |
| Stop databases | `./scripts/local-env.sh stop` |
| View DB logs | `./scripts/local-env.sh logs postgres` |
| Start API | `npm run dev --workspace=@watchagent/api` |
| Start Web | `npm run dev --workspace=@watchagent/web` |
| Run migrations | `npm run db:migrate` |
| Run all tests | `npm run test` |
| Build everything | `npm run build` |
| Clean & reinstall | `npm run clean && npm install` |

---

## Getting Help

If you encounter issues:
1. Check the logs in your terminal windows
2. Check Docker container logs: `docker logs watchagent-postgres-dev`
3. Review the error messages carefully
4. Check the console in your browser's DevTools (F12)
5. Search for the error message online

---

**Ready to test?** Start with Step 1 above: `./scripts/local-env.sh start`
