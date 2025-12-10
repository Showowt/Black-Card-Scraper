# Black Card Business Scanner

## Overview
A comprehensive business intelligence platform for scanning, enriching, and managing local business data across Colombian cities. The platform integrates Google Places API for business data fetching, OpenAI for AI-powered enrichment, and includes event discovery, intent signal monitoring, and authority content generation.

## Tech Stack
- **Frontend**: React, TanStack Query, Wouter, shadcn/ui, Recharts
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect)
- **APIs**: Google Places API (New), OpenAI

## Key Features

### Core Business Intelligence
1. **Business Scanning**: Scan restaurants, hotels, clubs, tour operators, spas, cafes, bars, galleries, museums, theaters, boat charters, private chefs, DJs, photographers, videographers, event planners, **concierge services, villa rentals, and luxury transportation** across Cartagena, Medellín, Bogotá, Cali, Barranquilla, Santa Marta, San Andrés, Bucaramanga, and Pereira
2. **Batch Scanning**: Scan multiple cities and categories simultaneously with progress tracking
3. **AI Enrichment**: Automatic scoring, classification, and outreach hook generation using vertical intelligence
4. **Website Scraping**: Extract emails, phone numbers, and social media from business websites with robust sanitization and validation
5. **Advanced Filtering**: Filter by AI readiness, minimum score, contact availability (email/website)
6. **Dashboard**: Stats, filtering, search, and business table with real-time updates
7. **Business Details**: Contact info, social links, AI insights, outreach generation, website scraping
8. **Statistics**: Charts showing category, city, and readiness breakdowns
9. **Export**: CSV and Movvia vendor format exports
10. **Outreach Management**: AI-generated personalized emails with status tracking, batch generation, and campaign management
11. **CLI-Style Operations**: Unified batch operations panel for scan, enrich, outreach, and export operations

### Event Discovery Pipeline
12. **Event Discovery**: Events from Eventbrite, Resident Advisor, and Instagram announcements
13. **Event Tier Classification**: Ultra Premium, Premium, Mid-Tier, Budget, Free based on price/venue signals
14. **Event Categories**: Nightclub, Concert, Festival, Boat Party, Pool Party, Rooftop, Private Dinner, Wellness, Cultural, Networking

### Intent Signal Monitoring
15. **Reddit Monitoring**: Track trip planning discussions for lead generation
16. **Intent Classification**: High, Medium, Low intent with travel dates and party size
17. **Luxury Signal Detection**: Identify high-value prospects from online discussions

### Instagram Venue Monitoring
18. **Venue Monitors**: Track luxury venues' Instagram accounts for event announcements
19. **Keyword Detection**: Automatic flagging of event-related posts
20. **Default Venues**: Pre-configured Cartagena luxury venues (Alquimico, La Movida, Bagatelle, etc.)

### Authority Content Generation
21. **AI Content Generation**: Create listicles, guides, comparisons, and insider tips
22. **SEO Optimization**: Auto-generated meta descriptions and keywords
23. **Business Integration**: Link content to scanned businesses for authority building

### Black Card Intelligence Vault
24. **Black Card Intelligence Page**: Full 9-component intelligence view per business
25. **Decision Maker Profiler**: Predict owner psychology, buying style, risk tolerance
26. **Financial Leak Calculator**: Precise monthly/annual loss quantification with formulas
27. **ROI Timeline**: Break-even calculation to the day, milestone tracking
28. **Competitor Ghost Mirror**: Competitor intelligence and urgency statements
29. **Greed Trigger Engine**: Advanced psychological levers for closing
30. **Pre-Emptive Objection Removal**: Anticipate and neutralize objections
31. **Offer Mutation Engine**: Dynamic custom offers based on signals
32. **Post-Close Blueprint**: Retention roadmap with weekly/monthly tasks
33. **Colombia Market Intelligence**: CONPES 4144 positioning, psychology triggers, vertical ticket sizing

### URL-Based Navigation State
34. **Filter Persistence**: All dashboard filters saved in URL query parameters
35. **Browser History Support**: Back/forward navigation preserves filter state
36. **Shareable Views**: Copy URL to share filtered business views
37. **Reset Functionality**: One-click reset to clear all filters

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
    Events.tsx      # Event discovery pipeline with tier filtering
    IntentSignals.tsx # Reddit/forum intent signal monitoring
    VenueMonitors.tsx # Instagram venue tracking for event announcements
    AuthorityContent.tsx # AI-powered content generation with OpenAI
    Statistics.tsx  # Analytics dashboard
    Outreach.tsx    # Outreach campaign management
    Operations.tsx  # CLI-style batch operations panel
    BlackCardIntel.tsx # Black Card 9-component intelligence view
  /hooks
    useAuth.ts      # Authentication hook
    useUrlState.ts  # URL-based filter state persistence
  /lib
    queryClient.ts  # TanStack Query setup
    authUtils.ts    # Auth utility functions
```

## API Routes

### Business & Scanning
- `GET /api/auth/user` - Current authenticated user
- `GET /api/businesses` - List businesses with filters
- `GET /api/businesses/stats` - Business statistics
- `GET /api/businesses/:id` - Single business
- `PATCH /api/businesses/:id` - Update business
- `DELETE /api/businesses/:id` - Delete business
- `POST /api/scan` - Start a single business scan
- `POST /api/scan/batch` - Start batch scans
- `GET /api/scans` - List scans
- `GET /api/scans/:id` - Scan status
- `POST /api/businesses/:id/enrich` - AI enrich a business
- `POST /api/businesses/:id/scrape` - Scrape website metadata
- `POST /api/businesses/enrich/batch` - Batch AI enrichment

### Outreach
- `POST /api/outreach/generate` - Generate outreach email
- `POST /api/outreach/batch` - Batch generate outreach emails
- `GET /api/outreach/all` - Get all outreach campaigns
- `PATCH /api/outreach/:id` - Update outreach campaign
- `DELETE /api/outreach/:id` - Delete outreach campaign
- `PATCH /api/businesses/:id/outreach-status` - Update outreach status

### Events
- `GET /api/events` - List events with filters (city, category, tier, source, dateRange)
- `GET /api/events/stats` - Event statistics by tier/category/source
- `GET /api/events/:id` - Single event
- `POST /api/events` - Create event
- `PATCH /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Intent Signals
- `GET /api/intent-signals` - List intent signals with filters
- `GET /api/intent-signals/:id` - Single intent signal
- `POST /api/intent-signals` - Create intent signal
- `PATCH /api/intent-signals/:id` - Update intent signal
- `DELETE /api/intent-signals/:id` - Delete intent signal

### Venue Monitors
- `GET /api/venue-monitors` - List venue monitors
- `GET /api/venue-monitors/defaults` - Get default Cartagena venues
- `GET /api/venue-monitors/:id` - Single venue monitor
- `POST /api/venue-monitors` - Create venue monitor
- `POST /api/venue-monitors/seed-defaults` - Seed default venues
- `PATCH /api/venue-monitors/:id` - Update venue monitor
- `DELETE /api/venue-monitors/:id` - Delete venue monitor

### Instagram Posts
- `GET /api/instagram-posts` - List Instagram posts
- `PATCH /api/instagram-posts/:id` - Update Instagram post

### Authority Content
- `GET /api/content` - List content pieces
- `GET /api/content/:id` - Single content
- `POST /api/content` - Create content
- `POST /api/content/generate` - AI-generate content
- `PATCH /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content

### Black Card Intelligence
- `GET /api/blackcard/:businessId` - Full Black Card intelligence for a business
- `POST /api/blackcard/generate` - Generate AI-enhanced intelligence with OpenAI
- `GET /api/blackcard/colombia-intel` - Colombia market stats and psychology triggers

### Advanced Intelligence Scrapers
- `POST /api/intel/instagram` - Scrape Instagram profile intelligence (handle)
- `POST /api/intel/reviews` - Scrape Google Reviews data (placeId, businessName)
- `POST /api/intel/tripadvisor` - Scrape TripAdvisor profile (businessName, city, category)
- `POST /api/intel/ota` - Detect OTA presence (businessName, city, category, websiteHtml)
- `POST /api/intel/whatsapp` - Test WhatsApp Business presence (phoneNumber, businessName)
- `POST /api/intel/comprehensive` - Run all scrapers for a business (businessName, category, city, etc.)
- `GET /api/intel/business/:id` - Gather comprehensive intelligence for a business by ID

### Export & Config
- `GET /api/export/csv` - Export to CSV
- `GET /api/export/movvia` - Export to Movvia format
- `GET /api/config` - Get cities, categories, event tiers, content types

## Black Card Intelligence Components

The Black Card system provides complete closing intelligence:

1. **Category Solutions**: Specific features per vertical (restaurant: QR ordering, no-show prediction; hotel: OTA bypass, AI concierge)
2. **Decision Maker Profile**: Personality type, buying style, risk tolerance, key motivators
3. **Financial Leaks**: Monthly/annual loss breakdown by category (no-shows, slow response, missing reviews)
4. **ROI Timeline**: Break-even point, implementation milestones, year 1 projection
5. **Competitor Mirror**: What competitors are doing, urgent threats, leapfrog strategies
6. **Greed Triggers**: Urgency/FOMO hooks with specific numbers to mention
7. **Objections**: Pre-emptive handling with proven frameworks
8. **Custom Offer**: Base offer + mutations based on detected gaps
9. **Retention Blueprint**: Weekly/monthly tasks, upsell opportunities

## Colombia Market Intelligence

- **CONPES 4144**: $110M USD government AI initiative positioning
- **Vertical Ticket Ranges**: $500-$10,000 based on category
- **Psychology Triggers**: Phil McGill branded Spanish/English hooks
- **WhatsApp Stats**: 66% purchase after WhatsApp, 50% abandon without fast response

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
