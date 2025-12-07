# Black Card Business Scanner

## Overview
A comprehensive business intelligence platform for scanning, enriching, and managing local business data across Colombian cities. The platform integrates Google Places API for business data fetching and OpenAI for AI-powered enrichment, opportunity scoring, and outreach email generation.

## Tech Stack
- **Frontend**: React, TanStack Query, Wouter, shadcn/ui, Recharts
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect)
- **APIs**: Google Places API (New), OpenAI

## Key Features
1. **Business Scanning**: Scan restaurants, hotels, clubs, tour operators, and spas across Cartagena, Medellín, and Bogotá
2. **Batch Scanning**: Scan multiple cities and categories simultaneously with progress tracking
3. **AI Enrichment**: Automatic scoring, classification, and outreach hook generation
4. **Website Scraping**: Extract emails, phone numbers, and social media from business websites
5. **Advanced Filtering**: Filter by AI readiness, minimum score, contact availability (email/website)
6. **Dashboard**: Stats, filtering, search, and business table with real-time updates
7. **Business Details**: Contact info, social links, AI insights, outreach generation, website scraping
8. **Statistics**: Charts showing category, city, and readiness breakdowns
9. **Export**: CSV and Movvia vendor format exports
10. **Outreach**: AI-generated personalized emails with status tracking

## Project Structure
```
/shared
  schema.ts         # Database models (users, businesses, scans, outreach_campaigns)
/server
  index.ts          # Express server entry
  routes.ts         # API routes + Google Places + OpenAI integrations
  storage.ts        # Database operations (DatabaseStorage)
  replitAuth.ts     # Replit OIDC authentication
  db.ts             # Drizzle database connection
/client/src
  App.tsx           # Main router with auth handling
  /pages
    Landing.tsx     # Landing page for unauthenticated users
    Dashboard.tsx   # Main dashboard with business table
    BusinessDetail.tsx # Individual business view
    Statistics.tsx  # Analytics dashboard
  /hooks
    useAuth.ts      # Authentication hook
  /lib
    queryClient.ts  # TanStack Query setup
    authUtils.ts    # Auth utility functions
```

## API Routes
- `GET /api/auth/user` - Current authenticated user
- `GET /api/businesses` - List businesses with filters (city, category, search, aiReadiness, minScore, hasEmail, hasWebsite)
- `GET /api/businesses/stats` - Business statistics
- `GET /api/businesses/:id` - Single business
- `PATCH /api/businesses/:id` - Update business
- `DELETE /api/businesses/:id` - Delete business
- `POST /api/scan` - Start a single business scan
- `POST /api/scan/batch` - Start batch scans (multiple cities/categories)
- `GET /api/scans` - List scans
- `GET /api/scans/:id` - Scan status
- `POST /api/businesses/:id/enrich` - AI enrich a business
- `POST /api/businesses/:id/scrape` - Scrape website metadata
- `POST /api/outreach/generate` - Generate outreach email
- `PATCH /api/outreach/:id` - Update outreach campaign
- `PATCH /api/businesses/:id/outreach-status` - Update outreach status
- `GET /api/export/csv` - Export to CSV
- `GET /api/export/movvia` - Export to Movvia format
- `GET /api/config` - Get cities and categories

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_PLACES_API_KEY` - Google Places API key
- `OPENAI_API_KEY` - OpenAI API key
- `SESSION_SECRET` - Session encryption secret
- `REPL_ID` - Replit project ID (auto-set)

## Design Guidelines
Following Material Design 3 with Roboto font. See design_guidelines.md for detailed specs.

## Development
```bash
npm run dev          # Start development server
npm run db:push      # Push schema changes
```

## User Preferences
- Dark theme by default
- Material Design 3 aesthetic
- Data-focused, professional UI
- No hero images (data application)
