# PHIL McGILL BUSINESS INTELLIGENCE & OUTREACH SYSTEM
## Complete Technical Blueprint v1.0

---

# EXECUTIVE SUMMARY

This is an AI-powered business intelligence and outreach automation system designed for the Colombian hospitality market. It combines Google Places data scraping, website intelligence, AI enrichment, sales psychology frameworks, and automated outreach generation to create the most effective B2B outreach system for AI automation services.

**Core Value Proposition:** Transform cold outreach into hyper-personalized, psychology-driven conversations that convert at 10-30x industry standard rates.

**Target Market:** Colombian hospitality businesses (restaurants, hotels, tour operators, concierges, boat charters, villa rentals, event services)

**Primary Use Case:** Selling AI automation services to hospitality businesses

---

# SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA COLLECTION LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Google Places API    │  Website Scraper    │  Reddit Monitor    │  Events  │
│  - Business discovery │  - Contact info     │  - Travel intent   │  - Local │
│  - Ratings/reviews    │  - Social links     │  - Trip planning   │  - Seasonal│
│  - Location data      │  - Email extraction │  - Cartagena posts │          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORAGE LAYER (Supabase)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  businesses table:                                                          │
│  - Core info (name, category, city, address)                               │
│  - Contact (phone, email, website, socials)                                │
│  - Metrics (rating, review_count, price_level)                             │
│  - AI enrichment (score, summary, hooks, readiness)                        │
│  - Outreach tracking (status, last_contacted)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI ENRICHMENT LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  OpenAI GPT-4o-mini:                                                        │
│  - Business classification & subcategorization                              │
│  - Opportunity scoring (1-100)                                             │
│  - AI readiness assessment                                                  │
│  - Pain point identification                                                │
│  - Outreach hook generation                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PSYCHOLOGY ENGINE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  4 Core Frameworks (47 years combined research):                            │
│  1. Neuroscience & NLP - Emotional triggers, pattern interrupts            │
│  2. Behavioral Economics - Loss aversion, anchoring, social proof          │
│  3. Identity Transformation - Current vs aspirational self                 │
│  4. Compliance Psychology - Authority markers, procedural compliance       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ULTIMATE OUTREACH GENERATOR                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Per Business Output:                                                       │
│  - Instagram discovery (handle, URL, confidence level)                     │
│  - Problem identification (specific to their signals)                      │
│  - Custom offer recommendation                                              │
│  - Loss quantification ($/month)                                           │
│  - Psychology hooks (identity, fear, desire, urgency)                      │
│  - Copy-paste outreach (IG DM, WhatsApp, Email)                           │
│  - Follow-up sequence (Day 3, 7, 14)                                       │
│  - Pre-filled WhatsApp links                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLAUDE CO-PILOT LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Real-time API Integration:                                                 │
│  - Response drafting (they reply → perfect follow-up in 5 sec)            │
│  - Objection handling (psychology-driven reframes)                         │
│  - Conversation analysis (stage, temperature, next action)                 │
│  - Proposal generation (custom from conversation context)                  │
│  - Voice note response (transcription → emotional analysis → reply)       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            OUTPUT LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  - Interactive HTML Dashboard (copy-paste ready, click-to-send)            │
│  - CSV exports (CRM import, tracking)                                      │
│  - JSON exports (API integrations)                                         │
│  - Authority content (LinkedIn posts, brand assets)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# FILE STRUCTURE

```
business-scanner/
│
├── main.py                      # CLI entry point - all commands
├── config.py                    # Settings, category mappings, city coordinates
├── models.py                    # Pydantic data models
├── requirements.txt             # Python dependencies
├── pyproject.toml              # Project configuration
├── .env.example                # Environment variable template
├── .replit                     # Replit configuration
│
├── services/                   # Core business logic
│   ├── __init__.py            # Module exports
│   ├── storage.py             # Supabase database operations
│   ├── enricher.py            # OpenAI AI enrichment
│   ├── deep_scan.py           # Advanced business analysis
│   ├── sales_psychology.py    # 47-year psychology framework
│   ├── outreach.py            # Basic outreach generation
│   ├── outreach_ready.py      # Dashboard + export system
│   ├── ultimate_outreach.py   # THE MAIN SYSTEM - full intelligence
│   ├── claude_copilot.py      # Real-time Claude API integration
│   ├── authority_content.py   # LinkedIn content generation
│   ├── transformation.py      # Data transformation utilities
│   └── exporter.py            # CSV/JSON export functions
│
├── scrapers/                   # Data collection
│   ├── __init__.py
│   ├── google_places.py       # Google Places API client
│   ├── website.py             # Website metadata extraction
│   ├── intent_signals.py      # Reddit travel intent monitoring
│   ├── events.py              # Event discovery
│   └── events/                # Event source scrapers
│       ├── __init__.py
│       ├── eventbrite.py
│       ├── resident_advisor.py
│       ├── instagram_monitor.py
│       └── models.py
│
├── BLUE_OCEAN_PLAYBOOK.md     # Channel strategy documentation
├── PSYCHOLOGY_CHEATSHEET.md   # Quick reference for frameworks
├── API_10X_STRATEGY.md        # Claude API integration guide
├── CONCIERGE_STRATEGY.md      # Concierge vertical strategy
└── README.md                  # Quick start guide
```

---

# ENVIRONMENT VARIABLES

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-key
GOOGLE_PLACES_API_KEY=your-google-api-key
OPENAI_API_KEY=sk-your-openai-key

# Optional - Enhanced features
ANTHROPIC_API_KEY=sk-ant-your-key          # Claude co-pilot
EVENTBRITE_API_KEY=your-eventbrite-key     # Event discovery
REDDIT_CLIENT_ID=your-reddit-id            # Intent signals
REDDIT_CLIENT_SECRET=your-reddit-secret

# Rate limiting
REQUESTS_PER_SECOND=2
MAX_CONCURRENT_REQUESTS=5

# Defaults
DEFAULT_CITY=Cartagena
DEFAULT_COUNTRY=Colombia
```

---

# CLI COMMANDS REFERENCE

## Data Collection Commands

### `scan` - Primary business discovery
```bash
python main.py scan \
  --city Cartagena \
  --category restaurant \
  --max 100 \
  --enrich \
  --save

# Options:
# --city, -c       : Cartagena, Medellín, Bogotá, Santa Marta, Barranquilla
# --category, -cat : restaurant, hotel, club, tour_operator, spa, concierge, etc.
# --max, -m        : Maximum results (default: 60)
# --enrich         : Run AI enrichment (default: enabled)
# --save           : Save to Supabase (default: enabled)
# --export, -e     : Export to CSV path
```

### `search` - Text search for specific queries
```bash
python main.py search "rooftop bar" --city Cartagena
python main.py search "yacht charter" --city Cartagena
python main.py search "boutique hotel walled city" --city Cartagena
```

### `deep-scan` - Full analysis with AI enrichment
```bash
python main.py deep-scan --city Cartagena --category boat_charter
```

### `intent-scan` - Reddit travel intent monitoring
```bash
python main.py intent-scan --time week
python main.py intent-scan --time month --keywords "bachelor party"
```

### `events` - Event discovery
```bash
python main.py events --days 90 --priority
python main.py events --city Cartagena --days 60
```

---

## Outreach Generation Commands

### `ultimate` - THE MAIN COMMAND - Full intelligence + outreach
```bash
python main.py ultimate \
  --city Cartagena \
  --category restaurant \
  --min-score 60 \
  --limit 30 \
  --output ultimate_outreach

# Output:
# - ultimate_outreach/dashboard.html  (Interactive dashboard)
# - ultimate_outreach/outreach_data.csv (All data)
```

### `outreach-ready` - Dashboard with copy-paste scripts
```bash
python main.py outreach-ready \
  --city Cartagena \
  --min-score 70 \
  --limit 30

# Output:
# - outreach_ready/dashboard.html
# - outreach_ready/quick_actions.csv
# - outreach_ready/outreach_full.csv
# - outreach_ready/outreach_data.json
```

### `phil-scan` - Single business deep analysis
```bash
python main.py phil-scan <business_id> -o outreach.md --proposal
```

### `phil-batch` - Batch outreach generation
```bash
python main.py phil-batch --city Cartagena --min-score 70 --limit 20
```

---

## Claude Co-Pilot Commands

### `copilot` - Interactive mode
```bash
python main.py copilot

# Commands in interactive mode:
# /respond <message>  - Draft response to their message
# /objection <text>   - Handle objection
# /analyze            - Analyze current conversation
# /proposal           - Generate proposal
# /set name=X         - Set business context
# /quit               - Exit
```

### `respond` - One-off response generation
```bash
python main.py respond "Interesante, pero ahora no tengo tiempo" \
  --business "Café Luna" \
  --category restaurant \
  --channel whatsapp
```

### `handle-objection` - Objection reframing
```bash
python main.py handle-objection "Es muy caro para nosotros" \
  --business "Restaurant XYZ" \
  --category restaurant
```

---

## Content & Export Commands

### `content` - Authority content generation
```bash
python main.py content --type insight --topic "AI for restaurants"
python main.py content --type linkedin --topic "no-show reduction"
```

### `content-calendar` - Monthly content plan
```bash
python main.py content-calendar --city Cartagena --category restaurant
```

### `export` - Database export
```bash
python main.py export --city Cartagena --format csv --output businesses.csv
python main.py export --category hotel --format json --min-score 70
```

### `stats` - Database statistics
```bash
python main.py stats
python main.py stats --city Cartagena
```

---

# DATA MODELS

## Business (Core Entity)
```python
class Business:
    # Identifiers
    id: str                          # Supabase UUID
    source: DataSource               # google_places, directory, manual, website_scrape
    external_id: str                 # External source ID
    
    # Core Info
    name: str
    slug: str
    description: str
    
    # Location
    address: str
    city: str                        # Cartagena, Medellín, Bogotá, etc.
    country: str                     # Colombia
    neighborhood: str
    geo: GeoLocation                 # {lat, lng}
    
    # Classification
    category: BusinessCategory       # restaurant, hotel, concierge, etc.
    subcategory: str                 # "Fine Dining", "Boutique Hotel"
    tags: list[str]
    
    # Contact
    website: str
    contact: ContactInfo             # {phone, email, whatsapp}
    socials: SocialLinks             # {instagram, facebook, twitter, linkedin, tiktok}
    
    # Business Details
    hours: BusinessHours
    price_level: PriceLevel          # free, budget, moderate, expensive, luxury
    rating: float                    # 1.0-5.0
    review_count: int
    
    # AI Enrichment
    ai_summary: str                  # Business description
    ai_readiness: AIReadinessLevel   # high, medium, low, unknown
    ai_outreach_hook: str            # Personalized opener
    ai_opportunity_score: int        # 1-100
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    last_enriched_at: datetime
    is_verified: bool
    outreach_status: str             # pending, contacted, responded, converted
```

## BusinessIntelligence (Ultimate Outreach Output)
```python
class BusinessIntelligence:
    # Identity
    business_name: str
    category: str
    city: str
    
    # Contact Discovery
    instagram: InstagramProfile      # {handle, url, confidence, discovery_source}
    whatsapp: str
    whatsapp_link: str               # wa.me link
    whatsapp_link_prefilled: str     # wa.me link with message
    email: str
    phone: str
    website: str
    google_maps_link: str
    
    # Business Analysis
    rating: float
    review_count: int
    price_level: str
    opportunity_score: int           # 1-100
    
    # WHAT THEY NEED
    primary_problem: str             # The ONE biggest issue
    secondary_problems: list[str]
    current_state: str
    desired_state: str
    
    # WHAT TO OFFER
    recommended_solution: str        # The ONE thing to pitch
    solution_details: list[str]
    quick_win: str                   # Week 1 result
    full_transformation: str         # 90-day outcome
    
    # LOSS QUANTIFICATION
    monthly_loss_estimate: str       # "$X,XXX/month"
    loss_breakdown: list[str]
    competitor_advantage: str
    
    # PSYCHOLOGY HOOKS
    identity_statement: str          # "You didn't start this to..."
    fear_trigger: str
    desire_trigger: str
    urgency_angle: str
    
    # COPY-PASTE OUTREACH
    instagram_dm: str
    whatsapp_message: str
    email_subject: str
    email_body: str
    followup_day3: str
    followup_day7: str
    followup_day14: str
```

---

# BUSINESS CATEGORIES

| Category | Google Places Types | Text Search Terms |
|----------|--------------------|--------------------|
| `restaurant` | restaurant, cafe, bar, bakery, food | - |
| `hotel` | lodging, hotel, resort, hostel | - |
| `club` | night_club, bar, casino | - |
| `tour_operator` | travel_agency, tourist_attraction | - |
| `spa` | spa, beauty_salon | - |
| `boat_charter` | boat_rental, marina | yacht charter, party boat, catamaran |
| `concierge` | concierge_service | luxury concierge, villa concierge, fixer |
| `villa_rental` | vacation_rental | luxury villa, private villa |
| `transportation` | car_rental, limousine_service | private driver, chauffeur |
| `photographer` | photographer | wedding photographer, event photographer |
| `videographer` | video_production | wedding videographer |
| `chef` | caterer | private chef, chef privado |
| `event_planner` | event_planner | wedding planner, destination wedding |
| `dj` | - | dj services, wedding dj |
| `real_estate` | real_estate_agency | - |
| `gym` | gym, fitness_center | - |
| `coworking` | coworking_space | - |

---

# SUPPORTED CITIES

| City | Coordinates | Radius |
|------|-------------|--------|
| Cartagena | 10.3910, -75.4794 | 15km |
| Medellín | 6.2442, -75.5812 | 20km |
| Bogotá | 4.7110, -74.0721 | 25km |
| Santa Marta | 11.2408, -74.1990 | 12km |
| Barranquilla | 10.9639, -74.7964 | 15km |

---

# OFFER MATRIX (What to Pitch Based on Signals)

## Restaurant Offers
| Signal Detected | Problem | Your Offer | Loss Estimate |
|-----------------|---------|------------|---------------|
| No website | No online booking | AI booking bot via WhatsApp | $2,000-4,000/mo |
| Low review response | Reputation damage | Review monitoring + AI responses | 30 customers/bad review |
| Has WhatsApp | Manual responses | WhatsApp AI assistant | 15+ hrs/week |
| High volume (200+ reviews) | Popular but chaotic | Full operational automation | $5,000-8,000/mo |

## Hotel Offers
| Signal Detected | Problem | Your Offer | Loss Estimate |
|-----------------|---------|------------|---------------|
| OTA dependent | 15-25% commissions | Direct booking + AI concierge | $3,000-8,000/mo |
| Slow response | Losing to competitors | 24/7 AI concierge | 10%/hour delay |
| No upsells | Missing revenue | Pre-arrival upsell automation | $1,500-3,000/mo |

## Concierge Offers
| Signal Detected | Problem | Your Offer | Loss Estimate |
|-----------------|---------|------------|---------------|
| No client database | Preferences in head | AI client preference system | 30% lower retention |
| Vendor chaos | Manual coordination | Vendor coordination automation | 10 hrs/week |
| 24/7 availability | Burning out | AI first-response system | Burnout + missed inquiries |

## Tour Operator Offers
| Signal Detected | Problem | Your Offer | Loss Estimate |
|-----------------|---------|------------|---------------|
| Owner on tours | Missing inquiries | AI booking assistant | $3,000-5,000/mo |
| No deposits | High no-shows | Automated booking + deposits | $1,500-2,500/mo |
| Manual coordination | WhatsApp chaos | Automated guest communication | 10+ hrs/week |

## Boat Charter Offers
| Signal Detected | Problem | Your Offer | Loss Estimate |
|-----------------|---------|------------|---------------|
| On water = offline | Missing $5k+ inquiries | AI booking system | $5,000-10,000/mo |
| Weather chaos | Manual rescheduling | Automated weather system | 8+ hrs/month |

---

# PSYCHOLOGY FRAMEWORK

## 1. Neuroscience & NLP
**Principle:** Emotional brain decides, logical brain justifies. Always trigger emotion FIRST.

**Techniques:**
- **Presuppositions:** "When you implement this..." (assumes they will)
- **Embedded commands:** "You might find yourself wondering..."
- **Pattern interrupts:** "I'm not going to pitch you..." (unexpected)
- **Future pacing:** "Picture this: 90 days from now..."
- **Sensory language:** "Feel what it's like to..."

## 2. Behavioral Economics
**Principles & Application:**
- **Loss Aversion (2.5x):** "You're LOSING $3k/month" not "You could GAIN $3k"
- **Anchoring:** "Most agencies charge $15-20k..." then reveal lower price
- **Social Proof:** "37 restaurants in Cartagena" (specific > general)
- **Scarcity:** "I take 3 new clients per month" (must be genuine)
- **Reciprocity:** Give value first - "I did a quick audit of your business..."

## 3. Identity Transformation
**Framework:** They're not buying AI, they're becoming who they want to be.

**By Vertical:**
| Vertical | Current Identity | Aspirational Identity | Gap Statement |
|----------|-----------------|----------------------|---------------|
| Restaurant | Putting out fires, midnight WhatsApp | Tight operation, never misses a beat | "You didn't open a restaurant to be a receptionist" |
| Hotel | Drowning in OTAs and complaints | Guests rave, anticipates needs | "You built a hotel to create experiences" |
| Concierge | Human switchboard at 3am | Anticipates needs before they ask | "You built this to create magic" |
| Boat Charter | Chained to phone on dock | Fleet booked, living the lifestyle | "You bought boats to live the life" |

## 4. Compliance Psychology
**Authority Markers:**
- "Based on 47 years of combined research..."
- "This methodology has generated $4.7M in documented results..."
- Specific numbers (47, not "almost 50")
- Named methodologies and frameworks

**Procedural Compliance:**
- Clear next steps ("Reply 'show me' and I'll send the case study")
- Remove ambiguity
- Make saying yes easy

---

# OUTREACH TEMPLATES

## Instagram DM (First Touch)
```
Hey! Noticed {business_name} is doing great ({review_count}+ reviews 🔥). 
Quick q - are you handling all those booking inquiries manually or do 
you have something automated?
```

## WhatsApp Message (Second Touch)
```
Hola! Vi que {business_name} tiene excelentes reseñas en Google.

Pregunta rápida: {primary_problem_as_question}

Ayudo a {category}s en {city} a automatizar exactamente esto. 
{quick_win}

¿Vale la pena 15 minutos para mostrarte cómo funciona?
```

## Email Structure
```
Subject: {business_name} — vi algo que te está costando dinero

No voy a hacerte perder el tiempo.

Analicé {business_name} y encontré algo:
{primary_problem}

Los números:
{monthly_loss_estimate} - eso es lo que probablemente estás perdiendo.

Lo que hago:
{recommended_solution}

Resultado de la primera semana:
{quick_win}

15 minutos. Te muestro exactamente qué arreglaría primero.

¿Jueves o viernes funciona mejor?

— Phil McGill

P.S. {urgency_angle}
```

## Follow-up Sequence
- **Day 3:** Reciprocity + new value (give something, no ask)
- **Day 7:** Social proof + identity (case study + transformation)
- **Day 14:** Scarcity + loss (deadline + loss calculation)
- **Day 21:** Pattern interrupt (humor / direct question)
- **Day 30:** Breakup (door open, move on)

---

# CHANNEL STRATEGY (Colombia-Specific)

## Recommended Sequence
```
STEP 1: Instagram DM (warm entry)
        ↓ Wait 24-48 hours
STEP 2: WhatsApp (after IG response OR as follow-up)
        ↓ If conversation starts
STEP 3: Email (formal proposals only)
```

## Why This Order
1. **Instagram DM** feels social, can reference their content, low threat
2. **WhatsApp** after IG = continuation, not cold outreach
3. **Email** for serious conversations - won't be read as first contact in Colombia

## Timing
- **Best days:** Tuesday-Thursday
- **Best times:** 9am-11am (before chaos), 7pm-9pm (winding down)
- **Avoid:** Monday morning, Friday afternoon, weekends

## Seasonal Triggers (Colombia)
- **Oct-Nov:** "High season is 6 weeks away - get systems ready NOW"
- **Dec-Jan:** "You're about to be slammed. Is your booking system ready?"
- **Feb-Mar:** "Carnaval coming. Automate before chaos."
- **Jun-Aug:** "Vacation season. Scale without hiring."

---

# CLAUDE API INTEGRATION

## Use Cases
| Function | When to Use | API Cost |
|----------|-------------|----------|
| `draft_response()` | They reply to your outreach | ~$0.02 |
| `handle_objection()` | They push back | ~$0.015 |
| `analyze_reviews()` | Before reaching out | ~$0.04 |
| `personalize_from_content()` | Looking at their IG | ~$0.03 |
| `analyze_conversation()` | Stuck or unsure | ~$0.03 |
| `generate_proposal()` | Ready to close | ~$0.06 |
| `respond_to_voice_note()` | They send voice note | ~$0.02 |

## Example: Response Drafting
```python
from services.claude_copilot import draft_response

result = await draft_response(
    their_message="Interesante, pero ahora no tengo tiempo",
    conversation_history=[...],
    business_context={"name": "Café Luna", "category": "restaurant"},
    channel="whatsapp"
)

# Output:
# {
#   "response": "Entiendo - ese 'no tengo tiempo' es exactamente...",
#   "psychology_used": ["Loss Aversion", "Identity Transformation"],
#   "next_action": "If they give number, quantify the loss"
# }
```

---

# INTEGRATION POINTS

## Supabase Database
```python
from services.storage import SupabaseStorage

storage = SupabaseStorage()

# Search businesses
businesses = await storage.search(
    city="Cartagena",
    category=BusinessCategory.RESTAURANT,
    min_score=70,
    limit=50
)

# Upsert business
await storage.upsert(business)

# Update outreach status
await storage.update_outreach_status(business_id, "contacted")
```

## Export Formats
```python
from services.exporter import Exporter

# CSV export
Exporter.to_csv(businesses, "output.csv")

# JSON export
Exporter.to_json(businesses, "output.json")

# Movvia vendor format
Exporter.to_movvia_vendors(businesses, "movvia_import.csv")

# Outreach-ready format
Exporter.to_outreach_csv(businesses, "outreach_list.csv")
```

## Ultimate Outreach System
```python
from services.ultimate_outreach import (
    generate_business_intelligence,
    export_to_html_dashboard,
    export_to_csv,
    process_batch
)

# Single business
intel = await generate_business_intelligence(
    business_name="La Vitrola",
    category="restaurant",
    city="Cartagena",
    website="https://lavitrola.com",
    phone="+573001234567",
    rating=4.7,
    review_count=1250
)

# Batch processing
results = await process_batch(businesses_list)

# Export to dashboard
export_to_html_dashboard(results, "dashboard.html")
```

---

# TYPICAL WORKFLOWS

## Daily Outreach Workflow
```bash
# Morning: Generate fresh outreach
python main.py ultimate --city Cartagena --min-score 70 --limit 20

# Open dashboard
open ultimate_outreach/dashboard.html

# Send 10-15 Instagram DMs (copy from dashboard)

# Midday: Check responses, use co-pilot for replies
python main.py copilot

# Evening: WhatsApp follow-ups to non-responders
```

## Weekly Scan Workflow
```bash
# Scan new businesses
python main.py scan -c Cartagena -cat restaurant -m 100
python main.py scan -c Cartagena -cat hotel -m 50
python main.py scan -c Cartagena -cat concierge -m 30

# Generate outreach for high-potential
python main.py ultimate --min-score 75

# Check intent signals
python main.py intent-scan --time week
```

## Closing Workflow
```bash
# When conversation is warm, generate proposal
python main.py copilot
> /analyze  # See where conversation stands
> /proposal # Generate custom proposal

# Or via CLI
python main.py respond "me interesa, cuánto cuesta?" \
  -b "Restaurant XYZ" -cat restaurant
```

---

# API COSTS & ROI

## Cost Breakdown
| Service | Operation | Cost |
|---------|-----------|------|
| Google Places | Nearby Search (20 results) | ~$0.017 |
| Google Places | Text Search | ~$0.017 |
| OpenAI | GPT-4o-mini enrichment | ~$0.0001/business |
| Claude | Co-pilot interaction | ~$0.02/call |
| Supabase | Storage | Free tier |

## Example Monthly Cost
- 500 businesses scanned: $4.25 Google + $0.05 OpenAI = $4.30
- 200 leads contacted: $0
- 100 co-pilot interactions: $2.00
- **Total: ~$6.30/month**

## ROI Calculation
- 1 client closed = $2,000+ value
- System cost = $6.30
- **ROI: 317x**

---

# QUICK START CHECKLIST

```
[ ] 1. Clone repository / extract zip to Replit
[ ] 2. Copy .env.example to .env
[ ] 3. Add API keys:
    [ ] SUPABASE_URL
    [ ] SUPABASE_KEY
    [ ] GOOGLE_PLACES_API_KEY
    [ ] OPENAI_API_KEY
    [ ] ANTHROPIC_API_KEY (optional)
[ ] 4. Run: python main.py setup (prints database schema)
[ ] 5. Create tables in Supabase SQL editor
[ ] 6. Run first scan: python main.py scan -c Cartagena -cat restaurant -m 50
[ ] 7. Generate outreach: python main.py ultimate --min-score 60
[ ] 8. Open: ultimate_outreach/dashboard.html
[ ] 9. Send first 10 DMs
[ ] 10. Book first meeting
```

---

# STRATEGIC POSITIONING

## Phil McGill Brand
- **Positioning:** "Colombia's AI Authority"
- **Methodology:** 47 years combined sales psychology research
- **Results:** $4.7M documented results, 1,400+ transformations
- **Specialization:** Colombian hospitality (restaurants, hotels, tour operators, concierges)

## Competitive Advantages
1. **Psychology-engineered outreach** - Not generic templates
2. **Colombia-specific intelligence** - Market expertise
3. **Hyper-personalized offers** - Different pitch per business based on signals
4. **Pre-built everything** - Copy-paste ready, not "create your own"
5. **Loss quantification** - Specific $/month impact
6. **Follow-up sequences** - Systematic, not ad-hoc

## Blue Ocean Differentiators
| Generic Outreach | This System |
|------------------|-------------|
| Same message to everyone | Custom offer per business signals |
| "Hi, I help with AI" | "You're losing $3k/month. Here's how to fix it." |
| Guess their Instagram | Discover from website + generate handles |
| Manual WhatsApp | Pre-filled links, one click |
| No follow-up | 5-stage psychology sequence |
| Hope they need it | Analyze signals, pitch what they need |

---

# FUTURE ROADMAP

- [ ] Google Reviews scraper for specific pain point hooks
- [ ] Instagram content pull for hyper-personalization
- [ ] WhatsApp Business API integration
- [ ] Automated CRM pipeline tracking
- [ ] Dashboard UI (React)
- [ ] Webhook alerts for new high-score businesses
- [ ] Competitive intelligence layer
- [ ] Multi-language support (Portuguese for Brazil)

---

# SUPPORT & RESOURCES

## Documentation Files
- `README.md` - Quick start
- `BLUE_OCEAN_PLAYBOOK.md` - Channel strategy
- `PSYCHOLOGY_CHEATSHEET.md` - Framework reference
- `API_10X_STRATEGY.md` - Claude integration
- `CONCIERGE_STRATEGY.md` - Vertical strategy

## Key Commands Cheatsheet
```bash
# Scan businesses
python main.py scan -c Cartagena -cat restaurant -m 50

# Generate ultimate outreach
python main.py ultimate -c Cartagena --min-score 70

# Interactive co-pilot
python main.py copilot

# Quick response
python main.py respond "their message" -b "Business Name"

# Handle objection
python main.py handle-objection "objection text"

# Export data
python main.py export -c Cartagena --format csv
```

---

*Phil McGill Business Intelligence System v1.0*
*Built for Colombian Hospitality Market Domination*
*47 Years Research • 1,400+ Transformations • $4.7M Results*
