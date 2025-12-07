"""
Supabase storage service.
Handles all database operations for business data.
"""
from datetime import datetime
from supabase import create_client, Client
from config import get_settings
from models import Business, DataSource, BusinessCategory


class SupabaseStorage:
    """Storage layer using Supabase."""
    
    def __init__(self):
        settings = get_settings()
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_key,
        )
        self.table = "businesses"
    
    async def upsert(self, business: Business) -> dict:
        """
        Insert or update a business.
        Uses (source, external_id) as unique key.
        """
        data = business.to_supabase_dict()
        data["updated_at"] = datetime.utcnow().isoformat()
        
        result = self.client.table(self.table).upsert(
            data,
            on_conflict="source,external_id",
        ).execute()
        
        return result.data[0] if result.data else {}
    
    async def upsert_batch(self, businesses: list[Business]) -> list[dict]:
        """Batch upsert multiple businesses."""
        records = []
        for biz in businesses:
            data = biz.to_supabase_dict()
            data["updated_at"] = datetime.utcnow().isoformat()
            records.append(data)
        
        result = self.client.table(self.table).upsert(
            records,
            on_conflict="source,external_id",
        ).execute()
        
        return result.data
    
    async def get_by_id(self, id: str) -> Business | None:
        """Get a business by its Supabase ID."""
        result = self.client.table(self.table).select("*").eq("id", id).execute()
        if result.data:
            return self._from_db(result.data[0])
        return None
    
    async def get_by_external_id(self, source: DataSource, external_id: str) -> Business | None:
        """Get a business by source and external ID."""
        result = (
            self.client.table(self.table)
            .select("*")
            .eq("source", source.value)
            .eq("external_id", external_id)
            .execute()
        )
        if result.data:
            return self._from_db(result.data[0])
        return None
    
    async def search(
        self,
        city: str | None = None,
        category: BusinessCategory | None = None,
        min_score: int | None = None,
        has_email: bool | None = None,
        has_website: bool | None = None,
        outreach_status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Business]:
        """Search businesses with filters."""
        query = self.client.table(self.table).select("*")
        
        if city:
            query = query.eq("city", city)
        if category:
            query = query.eq("category", category.value)
        if min_score:
            query = query.gte("ai_opportunity_score", min_score)
        if has_email:
            query = query.neq("contact->email", None)
        if has_website:
            query = query.neq("website", None)
        if outreach_status:
            query = query.eq("outreach_status", outreach_status)
        
        query = query.order("ai_opportunity_score", desc=True)
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        return [self._from_db(row) for row in result.data]
    
    async def get_stats(self, city: str | None = None) -> dict:
        """Get aggregate statistics."""
        query = self.client.table(self.table).select("*", count="exact")
        if city:
            query = query.eq("city", city)
        
        result = query.execute()
        total = result.count or 0
        
        # Category breakdown
        categories = {}
        for row in result.data:
            cat = row.get("category", "other")
            categories[cat] = categories.get(cat, 0) + 1
        
        # Readiness breakdown
        readiness = {"high": 0, "medium": 0, "low": 0, "unknown": 0}
        for row in result.data:
            r = row.get("ai_readiness", "unknown")
            readiness[r] = readiness.get(r, 0) + 1
        
        # Outreach breakdown
        outreach = {}
        for row in result.data:
            status = row.get("outreach_status") or "not_started"
            outreach[status] = outreach.get(status, 0) + 1
        
        # Average score
        scores = [row.get("ai_opportunity_score", 0) for row in result.data if row.get("ai_opportunity_score")]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        return {
            "total": total,
            "by_category": categories,
            "by_readiness": readiness,
            "by_outreach_status": outreach,
            "average_opportunity_score": round(avg_score, 1),
            "with_email": sum(1 for r in result.data if r.get("contact", {}).get("email")),
            "with_website": sum(1 for r in result.data if r.get("website")),
        }
    
    async def update_outreach_status(self, id: str, status: str) -> bool:
        """Update the outreach status of a business."""
        result = (
            self.client.table(self.table)
            .update({"outreach_status": status, "updated_at": datetime.utcnow().isoformat()})
            .eq("id", id)
            .execute()
        )
        return bool(result.data)
    
    def _from_db(self, row: dict) -> Business:
        """Convert database row to Business model."""
        from models import GeoLocation, ContactInfo, SocialLinks, BusinessHours
        
        geo = None
        if row.get("geo_lat") and row.get("geo_lng"):
            geo = GeoLocation(lat=row["geo_lat"], lng=row["geo_lng"])
        
        return Business(
            id=row.get("id"),
            source=DataSource(row.get("source", "manual")),
            external_id=row.get("external_id", ""),
            name=row.get("name", ""),
            slug=row.get("slug"),
            description=row.get("description"),
            address=row.get("address"),
            city=row.get("city", ""),
            country=row.get("country", "Colombia"),
            neighborhood=row.get("neighborhood"),
            geo=geo,
            category=BusinessCategory(row.get("category", "other")),
            subcategory=row.get("subcategory"),
            tags=row.get("tags", []),
            website=row.get("website"),
            contact=ContactInfo(**(row.get("contact") or {})),
            socials=SocialLinks(**(row.get("socials") or {})),
            hours=BusinessHours(**(row.get("hours") or {})) if row.get("hours") else None,
            price_level=row.get("price_level"),
            rating=row.get("rating"),
            review_count=row.get("review_count"),
            ai_summary=row.get("ai_summary"),
            ai_readiness=row.get("ai_readiness", "unknown"),
            ai_outreach_hook=row.get("ai_outreach_hook"),
            ai_opportunity_score=row.get("ai_opportunity_score"),
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
            last_enriched_at=row.get("last_enriched_at"),
            is_verified=row.get("is_verified", False),
            outreach_status=row.get("outreach_status"),
        )


# SQL Schema for Supabase (run this in SQL editor)
SCHEMA_SQL = """
-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identifiers
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    
    -- Core info
    name TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    
    -- Location
    address TEXT,
    city TEXT NOT NULL,
    country TEXT DEFAULT 'Colombia',
    neighborhood TEXT,
    geo_lat FLOAT,
    geo_lng FLOAT,
    
    -- Classification
    category TEXT NOT NULL,
    subcategory TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Contact
    website TEXT,
    contact JSONB DEFAULT '{}',
    socials JSONB DEFAULT '{}',
    
    -- Business details
    hours JSONB,
    price_level TEXT,
    rating FLOAT,
    review_count INTEGER,
    
    -- AI Enrichment
    ai_summary TEXT,
    ai_readiness TEXT DEFAULT 'unknown',
    ai_outreach_hook TEXT,
    ai_opportunity_score INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_enriched_at TIMESTAMPTZ,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Outreach tracking
    outreach_status TEXT,
    
    -- Unique constraint for deduplication
    UNIQUE(source, external_id)
);

-- Intent Signals table (for Movvia demand pipeline)
CREATE TABLE IF NOT EXISTS intent_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source identification
    signal_id TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,  -- reddit, twitter, tripadvisor
    url TEXT,
    
    -- Content
    title TEXT,
    content TEXT,
    author TEXT,
    author_url TEXT,
    
    -- Classification
    intent_level TEXT NOT NULL,  -- high, medium, low
    intent_types TEXT[] DEFAULT '{}',
    is_complaint BOOLEAN DEFAULT FALSE,
    
    -- Extracted info
    travel_dates TEXT,
    party_size TEXT,
    interests TEXT[] DEFAULT '{}',
    budget_signals TEXT[] DEFAULT '{}',
    
    -- Engagement metrics
    score INTEGER,
    comment_count INTEGER,
    
    -- Timestamps
    posted_at TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Action tracking
    action_status TEXT,  -- null, contacted, converted
    notes TEXT
);

-- Events table (for Movvia event curation)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source identification
    event_id TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,  -- eventbrite, resident_advisor, manual
    external_url TEXT,
    
    -- Core info
    name TEXT NOT NULL,
    description TEXT,
    
    -- When
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    
    -- Where
    venue_name TEXT,
    venue_address TEXT,
    city TEXT DEFAULT 'Cartagena',
    
    -- Classification
    category TEXT DEFAULT 'other',
    tier TEXT DEFAULT 'standard',  -- luxury, premium, standard, budget, free
    tags TEXT[] DEFAULT '{}',
    
    -- Pricing
    is_free BOOLEAN DEFAULT FALSE,
    min_price FLOAT,
    max_price FLOAT,
    currency TEXT DEFAULT 'COP',
    ticket_url TEXT,
    
    -- Capacity
    capacity INTEGER,
    tickets_sold INTEGER,
    is_sold_out BOOLEAN DEFAULT FALSE,
    
    -- Lineup
    lineup TEXT[] DEFAULT '{}',
    headliner TEXT,
    
    -- Media
    image_url TEXT,
    
    -- Movvia flags
    is_high_priority BOOLEAN DEFAULT FALSE,
    movvia_notes TEXT,
    
    -- Timestamps
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for businesses
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_score ON businesses(ai_opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_outreach ON businesses(outreach_status);
CREATE INDEX IF NOT EXISTS idx_businesses_readiness ON businesses(ai_readiness);

-- Indexes for intent signals
CREATE INDEX IF NOT EXISTS idx_intent_level ON intent_signals(intent_level);
CREATE INDEX IF NOT EXISTS idx_intent_source ON intent_signals(source);
CREATE INDEX IF NOT EXISTS idx_intent_posted ON intent_signals(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_luxury ON intent_signals USING GIN (budget_signals);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_tier ON events(tier);
CREATE INDEX IF NOT EXISTS idx_events_priority ON events(is_high_priority);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);

-- Full text search
CREATE INDEX IF NOT EXISTS idx_businesses_search ON businesses 
USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Enable Row Level Security (optional)
-- ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE intent_signals ENABLE ROW LEVEL SECURITY;
"""
