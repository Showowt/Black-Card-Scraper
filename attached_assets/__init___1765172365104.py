"""
Event Discovery Pipeline - Main Orchestration.
Coordinates all event sources and provides unified interface.
"""
import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import Event, EventTier, EventCategory, LUXURY_VENUES
from .eventbrite import scrape_eventbrite
from .resident_advisor import scrape_resident_advisor
from .instagram_monitor import (
    CARTAGENA_VENUES,
    get_monitoring_list,
    generate_monitoring_csv,
    RSS_SETUP_GUIDE,
)


async def discover_all_events(
    city: str = "cartagena",
    sources: list[str] = None,
    min_tier: str = None,
) -> list[Event]:
    """
    Discover events from all configured sources.
    
    Args:
        city: City to scan
        sources: List of sources to use ["eventbrite", "resident_advisor"]
        min_tier: Minimum tier to include ("premium", "mid_tier", etc.)
    
    Returns:
        List of Event objects, sorted by date
    """
    sources = sources or ["eventbrite", "resident_advisor"]
    all_events = []
    
    # Eventbrite
    if "eventbrite" in sources:
        try:
            eb_events = await scrape_eventbrite(city=city)
            all_events.extend(eb_events)
            print(f"✓ Eventbrite: {len(eb_events)} events")
        except Exception as e:
            print(f"✗ Eventbrite error: {e}")
    
    # Resident Advisor
    if "resident_advisor" in sources:
        try:
            ra_events = await scrape_resident_advisor(area="colombia")
            all_events.extend(ra_events)
            print(f"✓ Resident Advisor: {len(ra_events)} events")
        except Exception as e:
            print(f"✗ Resident Advisor error: {e}")
    
    # Filter by tier if specified
    if min_tier:
        tier_order = {
            EventTier.ULTRA_PREMIUM: 0,
            EventTier.PREMIUM: 1,
            EventTier.MID_TIER: 2,
            EventTier.BUDGET: 3,
            EventTier.FREE: 4,
            EventTier.UNKNOWN: 5,
        }
        min_tier_enum = EventTier(min_tier) if isinstance(min_tier, str) else min_tier
        min_order = tier_order.get(min_tier_enum, 5)
        
        all_events = [
            e for e in all_events
            if tier_order.get(e.event_tier, 5) <= min_order
        ]
    
    # Sort by date
    all_events.sort(key=lambda x: x.start_date)
    
    return all_events


def export_events_json(events: list[Event], output_path: str) -> Path:
    """Export events to JSON file."""
    path = Path(output_path)
    
    data = [e.to_supabase_dict() for e in events]
    
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str, ensure_ascii=False)
    
    return path


def export_events_csv(events: list[Event], output_path: str) -> Path:
    """Export events to CSV for spreadsheet work."""
    import csv
    
    path = Path(output_path)
    
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Date", "Name", "Venue", "Category", "Tier",
            "Min Price", "Max Price", "Currency",
            "Headliners", "Is Flagged", "URL", "Source"
        ])
        
        for event in events:
            writer.writerow([
                event.start_date.strftime("%Y-%m-%d %H:%M") if event.start_date else "",
                event.name,
                event.venue.name if event.venue else "",
                event.category.value,
                event.event_tier.value,
                event.min_price or "",
                event.max_price or "",
                event.currency,
                ", ".join(event.headliners) if event.headliners else "",
                "🔥" if event.is_flagged else "",
                event.url,
                event.source.value,
            ])
    
    return path


def generate_event_alert(event: Event) -> str:
    """Generate an alert message for a high-priority event."""
    tier_emoji = {
        EventTier.ULTRA_PREMIUM: "💎",
        EventTier.PREMIUM: "⭐",
        EventTier.MID_TIER: "🎫",
        EventTier.BUDGET: "💵",
        EventTier.FREE: "🆓",
    }
    
    emoji = tier_emoji.get(event.event_tier, "📅")
    
    msg = f"""
{emoji} **NEW EVENT DETECTED**

**{event.name}**
📅 {event.start_date.strftime("%B %d, %Y")}
📍 {event.venue.name if event.venue else "TBA"}
💰 {event.min_price or "?"} - {event.max_price or "?"} {event.currency}
🎯 Tier: {event.event_tier.value.upper()}

🎤 Lineup: {", ".join(event.headliners) if event.headliners else "TBA"}

🔗 {event.url}

Signals: {", ".join(event.tier_signals)}
"""
    return msg.strip()


def get_flagged_events(events: list[Event]) -> list[Event]:
    """Get only flagged (high-priority) events."""
    return [e for e in events if e.is_flagged]


def get_events_by_tier(events: list[Event], tier: EventTier) -> list[Event]:
    """Filter events by tier."""
    return [e for e in events if e.event_tier == tier]


def get_upcoming_week(events: list[Event]) -> list[Event]:
    """Get events in the next 7 days."""
    from datetime import timedelta
    
    now = datetime.now()
    week_later = now + timedelta(days=7)
    
    return [
        e for e in events
        if now <= e.start_date <= week_later
    ]


# Summary report generator
def generate_weekly_report(events: list[Event]) -> str:
    """Generate a weekly events summary."""
    flagged = get_flagged_events(events)
    premium = get_events_by_tier(events, EventTier.PREMIUM)
    ultra = get_events_by_tier(events, EventTier.ULTRA_PREMIUM)
    upcoming = get_upcoming_week(events)
    
    report = f"""
# Weekly Event Discovery Report
Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}

## Summary
- **Total Events Found:** {len(events)}
- **Flagged (High Priority):** {len(flagged)}
- **Ultra Premium:** {len(ultra)}
- **Premium:** {len(premium)}
- **This Week:** {len(upcoming)}

## 🔥 Flagged Events (Action Required)
"""
    
    for event in flagged[:10]:
        report += f"""
### {event.name}
- **Date:** {event.start_date.strftime("%B %d")}
- **Venue:** {event.venue.name if event.venue else "TBA"}
- **Price:** {event.min_price or "?"} - {event.max_price or "?"} {event.currency}
- **Tier:** {event.event_tier.value}
- **URL:** {event.url}
"""
    
    report += """
## This Week's Events
"""
    
    for event in upcoming[:10]:
        report += f"- {event.start_date.strftime('%a %d')}: **{event.name}** @ {event.venue.name if event.venue else 'TBA'}\n"
    
    report += f"""
---
*Sources: Eventbrite, Resident Advisor*
*Venues Monitored: {len(CARTAGENA_VENUES)}*
"""
    
    return report


# Supabase schema for events
EVENTS_SCHEMA_SQL = """
-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source identification
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    url TEXT NOT NULL,
    
    -- Core info
    name TEXT NOT NULL,
    description TEXT,
    
    -- Timing
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    
    -- Location
    city TEXT DEFAULT 'Cartagena',
    venue JSONB,
    
    -- Classification
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Lineup
    artists JSONB DEFAULT '[]',
    headliners TEXT[] DEFAULT '{}',
    
    -- Tickets
    ticket_tiers JSONB DEFAULT '[]',
    min_price FLOAT,
    max_price FLOAT,
    currency TEXT DEFAULT 'COP',
    is_sold_out BOOLEAN DEFAULT FALSE,
    
    -- Tier classification
    event_tier TEXT,
    tier_signals TEXT[] DEFAULT '{}',
    
    -- Capacity
    capacity INTEGER,
    
    -- Image
    image_url TEXT,
    
    -- Metadata
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_flagged BOOLEAN DEFAULT FALSE,
    
    -- Unique constraint
    UNIQUE(source, external_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_tier ON events(event_tier);
CREATE INDEX IF NOT EXISTS idx_events_flagged ON events(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);

-- Venue Instagram posts tracking
CREATE TABLE IF NOT EXISTS instagram_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    post_id TEXT NOT NULL UNIQUE,
    venue_handle TEXT NOT NULL,
    venue_name TEXT,
    
    caption TEXT,
    image_url TEXT,
    post_url TEXT,
    
    is_event_announcement BOOLEAN DEFAULT FALSE,
    detected_event_name TEXT,
    detected_keywords TEXT[] DEFAULT '{}',
    
    posted_at TIMESTAMPTZ,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    
    is_processed BOOLEAN DEFAULT FALSE,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_ig_venue ON instagram_posts(venue_handle);
CREATE INDEX IF NOT EXISTS idx_ig_event ON instagram_posts(is_event_announcement) WHERE is_event_announcement = TRUE;
"""
