# WatchAgent API Endpoints

Complete API reference for all available endpoints.

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```

Get tokens by logging in or registering.

---

## 🔐 Authentication Endpoints

### Register
```http
POST /auth/register
Content-Type: application/json

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
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "rememberMe": true
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

### Logout
```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

---

## 🎬 Content Endpoints

### Search Content
```http
GET /content/search?query=inception&type=movie&page=1
```

**Query Parameters:**
- `query` (required): Search query
- `type` (optional): `movie` or `tv`
- `page` (optional): Page number (default: 1)

**Example:**
```bash
curl 'http://localhost:3000/api/v1/content/search?query=inception'
```

### Get Content Details
```http
GET /content/:tmdbId?type=movie
```

**Parameters:**
- `tmdbId` (path): TMDB content ID
- `type` (query): `movie` or `tv`

**Example:**
```bash
curl 'http://localhost:3000/api/v1/content/27205?type=movie'
```

### Get Trending
```http
GET /content/trending?type=movie&timeWindow=week
```

**Query Parameters:**
- `type` (optional): `movie` or `tv`
- `timeWindow` (optional): `day` or `week` (default: week)

**Example:**
```bash
curl 'http://localhost:3000/api/v1/content/trending?type=movie'
```

### Get Popular
```http
GET /content/popular?type=movie&page=1
```

**Query Parameters:**
- `type` (required): `movie` or `tv`
- `page` (optional): Page number (default: 1)

**Example:**
```bash
curl 'http://localhost:3000/api/v1/content/popular?type=movie'
```

### Discover Content
```http
GET /content/discover?type=movie&genres=28,12&yearFrom=2020&ratingFrom=7&sortBy=popularity.desc&page=1
```

**Query Parameters:**
- `type` (required): `movie` or `tv`
- `genres` (optional): Comma-separated genre IDs
- `yearFrom` (optional): Minimum release year
- `yearTo` (optional): Maximum release year
- `ratingFrom` (optional): Minimum rating (0-10)
- `ratingTo` (optional): Maximum rating (0-10)
- `sortBy` (optional): Sort field (default: popularity.desc)
- `page` (optional): Page number (default: 1)

**Example:**
```bash
curl 'http://localhost:3000/api/v1/content/discover?type=movie&genres=28&yearFrom=2020'
```

---

## 📋 Watchlist Endpoints

All watchlist endpoints require authentication.

### Get Watchlist
```http
GET /watchlist?status=to_watch&sortBy=added_at&sortOrder=desc&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): `to_watch`, `watching`, or `watched`
- `sortBy` (optional): `added_at`, `priority`, `title`, `rating` (default: added_at)
- `sortOrder` (optional): `asc` or `desc` (default: desc)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example:**
```bash
TOKEN="your_access_token"
curl http://localhost:3000/api/v1/watchlist \
  -H "Authorization: Bearer $TOKEN"
```

### Add to Watchlist
```http
POST /watchlist
Authorization: Bearer <token>
Content-Type: application/json

{
  "contentId": "3bf839e3-ed8a-484a-8e42-80fc8e51b02c",
  "status": "to_watch",
  "priority": 5,
  "notes": "Recommended by friend"
}
```

**Example:**
```bash
TOKEN="your_access_token"
curl -X POST http://localhost:3000/api/v1/watchlist \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contentId":"3bf839e3-ed8a-484a-8e42-80fc8e51b02c","status":"to_watch"}'
```

### Update Watchlist Item
```http
PUT /watchlist/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "watched",
  "priority": 10,
  "notes": "Great movie!",
  "watchedAt": "2026-01-18T00:00:00Z"
}
```

**Example:**
```bash
TOKEN="your_access_token"
curl -X PUT http://localhost:3000/api/v1/watchlist/2a25a4c6-546a-4e61-925f-aa69fd15b5f7 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"watched"}'
```

### Remove from Watchlist
```http
DELETE /watchlist/:id
Authorization: Bearer <token>
```

**Example:**
```bash
TOKEN="your_access_token"
curl -X DELETE http://localhost:3000/api/v1/watchlist/2a25a4c6-546a-4e61-925f-aa69fd15b5f7 \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⭐ Ratings Endpoints

### Get Ratings
```http
GET /ratings?userId=<uuid>&contentId=<uuid>&minRating=7&maxRating=10&sortBy=created_at&sortOrder=desc&page=1&limit=20
```

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `contentId` (optional): Filter by content ID
- `minRating` (optional): Minimum rating (0-10)
- `maxRating` (optional): Maximum rating (0-10)
- `sortBy` (optional): `created_at` or `rating` (default: created_at)
- `sortOrder` (optional): `asc` or `desc` (default: desc)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example:**
```bash
curl 'http://localhost:3000/api/v1/ratings?minRating=8'
```

### Get My Rating for Content
```http
GET /ratings/my/:contentId
Authorization: Bearer <token>
```

**Example:**
```bash
TOKEN="your_access_token"
curl http://localhost:3000/api/v1/ratings/my/3bf839e3-ed8a-484a-8e42-80fc8e51b02c \
  -H "Authorization: Bearer $TOKEN"
```

### Create Rating
```http
POST /ratings
Authorization: Bearer <token>
Content-Type: application/json

{
  "contentId": "3bf839e3-ed8a-484a-8e42-80fc8e51b02c",
  "rating": 9,
  "review": "Amazing movie! Mind-bending plot.",
  "isPublic": true
}
```

**Example:**
```bash
TOKEN="your_access_token"
curl -X POST http://localhost:3000/api/v1/ratings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contentId":"3bf839e3-ed8a-484a-8e42-80fc8e51b02c","rating":9,"review":"Amazing movie"}'
```

### Update Rating
```http
PUT /ratings/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 8.5,
  "review": "Updated review after second watch",
  "isPublic": true
}
```

**Example:**
```bash
TOKEN="your_access_token"
curl -X PUT http://localhost:3000/api/v1/ratings/37c70e19-11c4-4f96-ba4a-0e99b0a00f9e \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":8.5}'
```

### Delete Rating
```http
DELETE /ratings/:id
Authorization: Bearer <token>
```

**Example:**
```bash
TOKEN="your_access_token"
curl -X DELETE http://localhost:3000/api/v1/ratings/37c70e19-11c4-4f96-ba4a-0e99b0a00f9e \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Testing Workflow

### 1. Register or Login
```bash
# Register new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"testuser","email":"test@example.com","password":"SecureP@ss123"}'

# Or login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'
```

Save the `accessToken` from the response.

### 2. Search for Content
```bash
curl 'http://localhost:3000/api/v1/content/search?query=inception'
```

Note a `tmdbId` from the results (e.g., `27205`).

### 3. Get Content Details
```bash
curl 'http://localhost:3000/api/v1/content/27205?type=movie'
```

This will store the content in your database and return the database `id`.

### 4. Add to Watchlist
```bash
TOKEN="your_access_token"
CONTENT_ID="the_database_id_from_step_3"

curl -X POST http://localhost:3000/api/v1/watchlist \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"contentId\":\"$CONTENT_ID\",\"status\":\"to_watch\"}"
```

### 5. Rate the Content
```bash
curl -X POST http://localhost:3000/api/v1/ratings \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"contentId\":\"$CONTENT_ID\",\"rating\":9,\"review\":\"Great movie!\"}"
```

### 6. View Your Watchlist
```bash
curl http://localhost:3000/api/v1/watchlist \
  -H "Authorization: Bearer $TOKEN"
```

### 7. View Your Ratings
```bash
curl 'http://localhost:3000/api/v1/ratings?userId=YOUR_USER_ID'
```

---

## 🔍 API Documentation

Visit http://localhost:3000/docs for interactive API documentation with Swagger UI.

You can test all endpoints directly from the browser!

---

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": { ... }
  }
}
```

---

## 🚀 What's Working

✅ **Authentication** - Register, login, token refresh
✅ **Content Search** - Search movies and TV shows via TMDB
✅ **Content Details** - Get full details with cast, crew, trailers
✅ **Trending** - Get trending content (day/week)
✅ **Popular** - Get popular movies and TV shows
✅ **Discover** - Advanced filtering by genre, year, rating
✅ **Watchlist** - Full CRUD operations
✅ **Ratings** - Full CRUD operations with reviews

## 🎯 Coming Soon

⏳ **LLM Recommendations** - AI-powered personalized recommendations
⏳ **Social Features** - Follow users, activity feed
⏳ **User Profiles** - Public profiles, stats, followers
⏳ **Similar Content** - Find similar movies/shows

---

**Server**: http://localhost:3000
**API Docs**: http://localhost:3000/docs
**Health Check**: http://localhost:3000/health
