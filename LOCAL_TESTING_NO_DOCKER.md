# Local Testing Guide (No Docker Required!)

Your local PostgreSQL and Redis are already running - no Docker needed!

## ✅ Prerequisites Already Met

- ✅ PostgreSQL installed and running (via Homebrew)
- ✅ Redis installed and running (via Homebrew)
- ✅ Database `watchagent` exists
- ✅ Node.js is available

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies (if needed)

```bash
cd /Users/tapas/code/watchagent

# Check if node_modules exists
ls node_modules 2>&1 > /dev/null && echo "Dependencies installed" || npm install
```

### Step 2: Start API Server

**Terminal 1:**
```bash
cd /Users/tapas/code/watchagent
npm run dev --workspace=@watchagent/api
```

Wait for: `Server listening at http://0.0.0.0:3000`

### Step 3: Start Web App

**Terminal 2:**
```bash
cd /Users/tapas/code/watchagent
npm run dev --workspace=@watchagent/web
```

Wait for: `Ready on http://localhost:3001`

### Step 4: Open Browser

```bash
open http://localhost:3001
```

---

## ✅ Quick Health Check

```bash
# Check if services are running
pg_isready          # PostgreSQL
redis-cli ping      # Redis
curl http://localhost:3000/health  # API
```

All should return success!

---

## 🎯 Testing Checklist

### 1. Create Account
- Go to http://localhost:3001
- Click "Sign Up"
- Username: `testuser`
- Email: `test@example.com`
- Password: `password123`

### 2. Login
- Use credentials above
- Should redirect to dashboard

### 3. Search Movies
- Search for: `"Inception"`
- Verify results with posters appear

### 4. View Movie Details
- Click on any movie
- Should show full details, cast, ratings

### 5. Add to Watchlist
- Click "Add to Watchlist" button
- Go to Watchlist page
- Verify movie appears

### 6. Rate Content
- Open movie details
- Give it a rating (1-10 or stars)
- Verify rating saves

### 7. Get Recommendations
- Set favorite genres (if available)
- Request recommendations
- Check if results match preferences

### 8. Test AI Chat (if implemented)
- Go to chat/recommendations
- Type: "Recommend sci-fi movies like Interstellar"
- Check AI response

---

## 🧪 API Testing

### Register via API
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser"
  }'
```

### Login via API
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `accessToken` from the response.

### Search Content
```bash
TOKEN="your-token-here"

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/content/search?query=inception&type=movie"
```

### Get Recommendations
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/recommendations"
```

---

## 🔍 Debugging

### View Database
```bash
# Connect to PostgreSQL
psql -U tapas watchagent

# Useful commands:
\dt                    # List tables
SELECT * FROM users;   # View users
SELECT * FROM watchlist; # View watchlists
SELECT * FROM ratings; # View ratings
\q                     # Exit
```

### View Redis Cache
```bash
# Connect to Redis
redis-cli

# Useful commands:
KEYS *                 # List all keys
GET cache:some:key     # Get a key
FLUSHALL               # Clear all cache
exit                   # Exit
```

### View API Logs
Check Terminal 1 (where API is running) for:
- Request logs
- Errors
- Database queries

### View Web Logs
Check Terminal 2 (where Web is running) for:
- Page renders
- API calls
- React warnings

---

## 🐛 Common Issues

### Issue: Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Issue: Cannot Connect to Database

**Error:** `ECONNREFUSED`

**Solution:**
```bash
# Check if PostgreSQL is running
pg_isready

# If not running, start it
brew services start postgresql@14  # or your version

# Check status
brew services list | grep postgres
```

### Issue: Redis Connection Failed

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# If not running, start it
brew services start redis

# Check status
brew services list | grep redis
```

### Issue: Module Not Found

**Error:** `Cannot find module '@watchagent/...'`

**Solution:**
```bash
# Rebuild everything
npm run clean
npm install
npm run build
```

### Issue: Database Tables Don't Exist

**Error:** `relation "users" does not exist`

**Solution:**
```bash
# Run migrations
npm run db:migrate

# Or manually create tables
cd packages/database
npm run migrate
```

---

## 🛑 Stop Testing

When done:

```bash
# Stop dev servers
# Press Ctrl+C in both Terminal 1 and Terminal 2

# Optionally stop databases (they use minimal resources)
brew services stop postgresql
brew services stop redis

# Or leave them running for next session
```

---

## 🔄 Restart Services

If you stopped the databases:

```bash
# Start PostgreSQL
brew services start postgresql

# Start Redis
brew services start redis

# Verify they're running
pg_isready
redis-cli ping
```

---

## 📊 Performance Tips

### Check Database Performance
```bash
# Connect to database
psql -U tapas watchagent

# Check slow queries
SELECT * FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

# Check database size
SELECT pg_size_pretty(pg_database_size('watchagent'));
```

### Check Redis Memory
```bash
redis-cli info memory
```

### Monitor API Performance
```bash
# Install Apache Bench (if needed)
brew install httpd

# Test API (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:3000/health
```

---

## 🎯 Test Scenarios

### Scenario 1: New User Journey
1. Visit homepage
2. Sign up
3. Complete profile
4. Search for favorite movie
5. Add to watchlist
6. Rate it
7. Get recommendations

### Scenario 2: Returning User
1. Login with existing account
2. Check watchlist
3. Update ratings
4. Search new content
5. Test recommendations

### Scenario 3: Content Discovery
1. Browse popular movies
2. Filter by genre
3. Sort by rating
4. View details
5. Read reviews
6. Check cast info

### Scenario 4: AI Features
1. Chat with AI
2. Ask for recommendations
3. Specify preferences
4. Refine suggestions
5. Save recommendations

---

## 📈 What to Look For

### Functionality
- [ ] Registration works
- [ ] Login persists after refresh
- [ ] Search returns results quickly
- [ ] Images load properly
- [ ] Watchlist updates instantly
- [ ] Ratings save correctly
- [ ] Recommendations are relevant
- [ ] No console errors

### User Experience
- [ ] Navigation is intuitive
- [ ] Loading states are clear
- [ ] Error messages are helpful
- [ ] UI is responsive
- [ ] Forms have validation
- [ ] Design is consistent
- [ ] Mobile-friendly

### Performance
- [ ] Pages load under 2 seconds
- [ ] Search results appear quickly
- [ ] No lag when scrolling
- [ ] Images load progressively
- [ ] API responses are fast

---

## 🎨 Test Different Scenarios

1. **Happy Path** - Everything works perfectly
2. **Invalid Input** - Wrong passwords, bad emails
3. **Empty States** - New user with no data
4. **Full States** - User with lots of watchlist items
5. **Slow Connection** - Throttle network in DevTools
6. **Mobile View** - Resize browser to phone size

---

## 📝 Bug Reporting Template

If you find issues, note:

```
**Bug:** [Brief description]
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Console Errors:** [Any errors in browser console]
**API Logs:** [Any errors in API terminal]
```

---

## ✨ Success Metrics

Your app is working well if:
- ✅ All core features work without errors
- ✅ UI is responsive and intuitive
- ✅ Search and recommendations are accurate
- ✅ No console errors or warnings
- ✅ Performance feels snappy
- ✅ Works on different screen sizes

---

## 🎬 Ready to Test!

Just run these commands:

**Terminal 1:**
```bash
npm run dev --workspace=@watchagent/api
```

**Terminal 2:**
```bash
npm run dev --workspace=@watchagent/web
```

**Browser:**
```bash
open http://localhost:3001
```

That's it! No Docker needed. Your local PostgreSQL and Redis are already running perfectly.

---

**Happy Testing! 🚀**
