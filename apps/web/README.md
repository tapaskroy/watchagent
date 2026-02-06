# WatchAgent Web Frontend

A modern Next.js 14 web application for personalized movie and TV show recommendations powered by AI.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **API Client**: Axios with interceptors
- **TypeScript**: Full type safety
- **Styling**: Netflix-style dark theme

## Project Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Authentication pages
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (main)/           # Main application pages
│   │   │   ├── content/[id]/ # Content detail page
│   │   │   ├── search/       # Search & browse
│   │   │   ├── watchlist/    # User's watchlist
│   │   │   ├── recommendations/ # AI recommendations
│   │   │   └── page.tsx      # Home page
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles
│   ├── components/           # Page-specific components
│   ├── hooks/               # React Query hooks
│   │   ├── useAuth.ts
│   │   ├── useContent.ts
│   │   ├── useWatchlist.ts
│   │   └── useRecommendations.ts
│   ├── store/               # Zustand stores
│   │   └── auth.ts
│   ├── lib/                 # Utilities
│   │   └── providers.tsx
│   └── middleware.ts        # Auth middleware
├── public/                  # Static assets
├── next.config.js
├── tailwind.config.js
└── package.json
```

## Features

### Authentication
- User registration with validation
- Login with remember me
- Protected routes via middleware
- Automatic token refresh
- Persistent authentication

### Home Page
- Personalized AI recommendations
- Trending movies/shows
- Popular content
- Category-based browsing

### Search & Discovery
- Real-time search with debouncing
- Filter by genre, year, rating
- Infinite scroll pagination
- Empty states

### Content Details
- Full movie/TV show information
- Cast and crew
- Similar content recommendations
- Add to watchlist
- Rate and review

### Watchlist
- Organized by status (To Watch, Watching, Watched)
- Quick actions (edit, remove)
- Grid/list view toggle
- Priority sorting

### Recommendations
- LLM-powered personalized suggestions
- Reasoning explanations
- Match percentage
- Refresh recommendations

## Environment Variables

Create a `.env.local` file in the `apps/web` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_TMDB_IMAGE_BASE=https://image.tmdb.org/t/p
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Running WatchAgent API backend

### Installation

```bash
# From project root
cd apps/web

# Install dependencies
npm install
# or
bun install

# Run development server
npm run dev
# or
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:e2e` - Run Playwright E2E tests

### Code Organization

#### Routes
- **(auth)** - Auth pages with centered card layout
- **(main)** - Main app with header/footer layout
- Dynamic routes for content details

#### Hooks
All API interactions are abstracted into React Query hooks for:
- Automatic caching
- Optimistic updates
- Error handling
- Loading states

#### State Management
- **Zustand** for global state (auth)
- **React Query** for server state
- **Local state** for UI interactions

## Styling

### Theme
- Dark background: `#141414`
- Card background: `#1F1F1F`
- Primary (Netflix red): `#E50914`
- Text primary: `#FFFFFF`
- Text secondary: `#A3A3A3`

### Fonts
- Body: Inter
- Headings: Poppins

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly targets (44x44px minimum)

## API Integration

All API calls go through the `@watchagent/api-client` package which provides:
- Centralized axios instance
- Automatic token management
- Request/response interceptors
- Token refresh logic
- Error handling

## Performance Optimizations

- Next.js Image optimization for posters/backdrops
- Code splitting by route
- React Query caching (5 min for content, 1 min for user data)
- Lazy loading images
- Debounced search

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support

## Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests (Playwright)
```bash
npm run test:e2e
```

Test coverage:
- Authentication flow
- Search and browse
- Watchlist management
- Content details
- Recommendations

## Deployment

### Vercel (Recommended)
```bash
vercel
```

### Docker
```bash
docker build -t watchagent-web .
docker run -p 3001:3001 watchagent-web
```

### Environment Variables (Production)
Set these in your deployment platform:
- `NEXT_PUBLIC_API_URL` - Production API URL
- `NEXT_PUBLIC_TMDB_IMAGE_BASE` - TMDB image CDN

## Troubleshooting

### Build Errors
- Clear `.next` folder: `npm run clean`
- Delete `node_modules` and reinstall
- Check TypeScript errors: `npx tsc --noEmit`

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check API is running
- Check CORS settings on API

### Authentication Issues
- Clear localStorage
- Check token expiration
- Verify refresh token logic

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests
4. Submit PR

## License

Proprietary - WatchAgent
