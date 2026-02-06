# Quick Start - Local Testing

Get your WatchAgent app running locally in 5 minutes!

## Prerequisites

- ✅ Node.js 20+ installed
- ✅ Docker Desktop running
- ✅ API keys configured in `apps/api/.env`

## 🚀 Start Everything (Automated)

```bash
cd /Users/tapas/code/watchagent
./scripts/start-local.sh
```

This will:
- ✅ Start PostgreSQL and Redis
- ✅ Install dependencies
- ✅ Build packages
- ✅ Run database migrations

## 🎯 Run the Application

### Open 2 Terminals

**Terminal 1 - API Server:**
```bash
npm run dev --workspace=@watchagent/api
```
Wait for: `Server listening at http://0.0.0.0:3000`

**Terminal 2 - Web App:**
```bash
npm run dev --workspace=@watchagent/web
```
Wait for: `Ready on http://localhost:3001`

### Open Browser
```bash
open http://localhost:3001
```

---

## ✅ Quick Test Checklist

### 1. Health Check
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### 2. Create Account
- Go to http://localhost:3001
- Click "Sign Up"
- Register with test credentials

### 3. Search Movies
- Login
- Search for "Inception"
- Verify results appear

### 4. Add to Watchlist
- Click "+" on any movie
- Check watchlist page

### 5. Rate Content
- Open movie details
- Give it a rating
- Verify it saves

---

## 🐛 Common Issues

**Port in use:**
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**Database not connected:**
```bash
./scripts/local-env.sh restart
```

**Build errors:**
```bash
npm run clean
npm install
npm run build
```

---

## 📊 View Data

**Database:**
```bash
docker exec -it watchagent-postgres-dev psql -U postgres watchagent
```

**Redis:**
```bash
docker exec -it watchagent-redis-dev redis-cli
```

---

## 🛑 Stop Everything

```bash
# Stop dev servers: Ctrl+C in both terminals

# Stop databases:
./scripts/local-env.sh stop
```

---

## 📚 Full Guide

For detailed testing instructions, see: **[LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md)**

---

## 🎯 Key URLs

| Service | URL |
|---------|-----|
| **Web App** | http://localhost:3001 |
| **API** | http://localhost:3000 |
| **API Docs** | http://localhost:3000/docs |
| **Health** | http://localhost:3000/health |

---

## 📝 Test Scenarios

### User Registration & Login
1. Sign up with new account
2. Logout
3. Login again
4. Verify session persists

### Content Discovery
1. Search for "Marvel"
2. Filter by genre
3. Sort by rating
4. Check pagination

### Watchlist Management
1. Add 5 different movies
2. View watchlist
3. Remove one item
4. Verify persistence after refresh

### Rating System
1. Rate 3 movies (different scores)
2. View your ratings
3. Update a rating
4. Delete a rating

### Recommendations
1. Set favorite genres
2. Get recommendations
3. Verify they match preferences
4. Test AI chat (if available)

---

**Happy Testing! 🎬**
