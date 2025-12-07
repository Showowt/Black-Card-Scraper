"""
Venue Instagram Monitoring.

REALITY CHECK:
- Instagram scraping is against ToS and will get you blocked
- Official Instagram Graph API requires business account connection
- Best approach: RSS feeds via third-party services + manual monitoring

This module provides:
1. A list of venues to monitor
2. Integration with RSS-to-Instagram services
3. A framework for storing Instagram post alerts
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class VenueToMonitor(BaseModel):
    """A venue whose Instagram we want to track."""
    name: str
    instagram_handle: str
    instagram_url: str
    category: str  # nightclub, hotel, restaurant, boat
    tier: str  # luxury, upscale, standard
    city: str = "Cartagena"
    priority: int = 1  # 1 = highest priority
    
    # RSS integration
    rss_feed_url: Optional[str] = None  # If using a service like RSS.app or Feedity
    
    # Monitoring config
    keywords: list[str] = Field(default_factory=list)  # Alert on these words
    is_active: bool = True


class InstagramPost(BaseModel):
    """An Instagram post detected from a venue."""
    id: str
    venue_handle: str
    venue_name: str
    
    # Content
    caption: Optional[str] = None
    image_url: Optional[str] = None
    post_url: str
    
    # Detection
    is_event_announcement: bool = False
    detected_event_name: Optional[str] = None
    detected_date: Optional[str] = None
    detected_keywords: list[str] = Field(default_factory=list)
    
    # Metadata
    posted_at: Optional[datetime] = None
    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Status
    is_processed: bool = False
    notes: Optional[str] = None


# Cartagena venues to monitor - prioritized by event frequency + tier
CARTAGENA_VENUES = [
    # Nightclubs
    VenueToMonitor(
        name="Alquimico",
        instagram_handle="alquimico",
        instagram_url="https://instagram.com/alquimico",
        category="rooftop_bar",
        tier="luxury",
        priority=1,
        keywords=["event", "party", "dj", "live", "show", "fiesta", "especial"],
    ),
    VenueToMonitor(
        name="La Movida",
        instagram_handle="lamovida",
        instagram_url="https://instagram.com/lamovida",
        category="nightclub",
        tier="luxury",
        priority=1,
        keywords=["fiesta", "party", "dj", "presenta", "evento"],
    ),
    VenueToMonitor(
        name="El Arsenal",
        instagram_handle="elarsenalctg",
        instagram_url="https://instagram.com/elarsenalctg",
        category="nightclub",
        tier="luxury",
        priority=1,
        keywords=["party", "night", "evento", "presenta"],
    ),
    VenueToMonitor(
        name="Cafe del Mar",
        instagram_handle="cafedelmarcartagena",
        instagram_url="https://instagram.com/cafedelmarcartagena",
        category="rooftop_bar",
        tier="upscale",
        priority=2,
        keywords=["sunset", "party", "dj", "live", "music"],
    ),
    
    # Beach Clubs
    VenueToMonitor(
        name="Bagatelle",
        instagram_handle="bagatellecolombia",
        instagram_url="https://instagram.com/bagatellecolombia",
        category="beach_club",
        tier="luxury",
        priority=1,
        keywords=["party", "brunch", "dj", "pool", "event"],
    ),
    
    # Boat parties
    VenueToMonitor(
        name="La Passion Cartagena",
        instagram_handle="lapassioncartagena",
        instagram_url="https://instagram.com/lapassioncartagena",
        category="boat_party",
        tier="luxury",
        priority=1,
        keywords=["party", "boat", "sunset", "tour", "privado"],
    ),
    VenueToMonitor(
        name="Sibarita",
        instagram_handle="sibaritacartagena",
        instagram_url="https://instagram.com/sibaritacartagena",
        category="boat_party",
        tier="upscale",
        priority=2,
        keywords=["tour", "island", "boat", "party"],
    ),
    
    # Hotels with events
    VenueToMonitor(
        name="Sofitel Legend Santa Clara",
        instagram_handle="sofitelcartagena",
        instagram_url="https://instagram.com/sofitelcartagena",
        category="hotel",
        tier="luxury",
        priority=2,
        keywords=["event", "new year", "christmas", "gala", "dinner"],
    ),
    VenueToMonitor(
        name="Casa San Agustin",
        instagram_handle="casasanagustin",
        instagram_url="https://instagram.com/casasanagustin",
        category="hotel",
        tier="luxury",
        priority=2,
        keywords=["event", "dinner", "experience"],
    ),
    VenueToMonitor(
        name="Tcherassi Hotel",
        instagram_handle="tcherassihotel",
        instagram_url="https://instagram.com/tcherassihotel",
        category="hotel",
        tier="luxury",
        priority=2,
        keywords=["event", "experience", "exclusive"],
    ),
    
    # Restaurants that host events
    VenueToMonitor(
        name="Carmen Cartagena",
        instagram_handle="carmencartagena",
        instagram_url="https://instagram.com/carmencartagena",
        category="restaurant",
        tier="luxury",
        priority=3,
        keywords=["chef", "dinner", "event", "special", "tasting"],
    ),
    VenueToMonitor(
        name="La Vitrola",
        instagram_handle="lavitrolacartagena",
        instagram_url="https://instagram.com/lavitrolacartagena",
        category="restaurant",
        tier="luxury",
        priority=3,
        keywords=["live", "music", "jazz", "evento"],
    ),
]


def get_monitoring_list(
    tier: str = None,
    category: str = None,
    priority: int = None,
) -> list[VenueToMonitor]:
    """Get filtered list of venues to monitor."""
    venues = [v for v in CARTAGENA_VENUES if v.is_active]
    
    if tier:
        venues = [v for v in venues if v.tier == tier]
    if category:
        venues = [v for v in venues if v.category == category]
    if priority:
        venues = [v for v in venues if v.priority <= priority]
    
    return sorted(venues, key=lambda x: x.priority)


def generate_monitoring_csv(output_path: str = "venues_to_monitor.csv"):
    """Generate a CSV of venues to manually monitor."""
    import csv
    
    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Name", "Handle", "URL", "Category", "Tier", 
            "Priority", "Keywords", "Notes"
        ])
        
        for venue in CARTAGENA_VENUES:
            writer.writerow([
                venue.name,
                venue.instagram_handle,
                venue.instagram_url,
                venue.category,
                venue.tier,
                venue.priority,
                ", ".join(venue.keywords),
                "",  # Notes column for manual tracking
            ])
    
    return output_path


# RSS Integration instructions
RSS_SETUP_GUIDE = """
# Instagram Monitoring via RSS

Since direct Instagram scraping is blocked, use RSS services:

## Option 1: RSS.app (Paid, ~$10/mo)
1. Go to https://rss.app/
2. Create RSS feed for each Instagram account
3. Add feed URLs to VenueToMonitor.rss_feed_url
4. Use feedparser to poll feeds

## Option 2: Feedity (Free tier available)
1. Go to https://feedity.com/
2. Create feeds for Instagram profiles
3. Similar integration

## Option 3: IFTTT/Zapier
1. Create applet: "New Instagram post from @handle"
2. Action: "Add row to Google Sheet" or "Webhook to your endpoint"
3. Poll the sheet or receive webhooks

## Option 4: Instagram Graph API (If you have business connections)
1. Requires Instagram Business Account
2. The venue must connect their account to your app
3. Not practical for monitoring competitors

## Recommended Approach:
1. Manual daily check of top 5-10 venues (15 min/day)
2. Use RSS.app for automated alerts on priority 1 venues
3. Set up phone notifications for new posts from key accounts
"""


def detect_event_in_caption(caption: str) -> dict:
    """
    Analyze Instagram caption to detect event announcements.
    Returns detection signals.
    """
    caption_lower = caption.lower()
    
    signals = {
        "is_event": False,
        "event_keywords": [],
        "date_mentions": [],
        "price_mentions": [],
        "booking_signal": False,
    }
    
    # Event keywords
    event_keywords = [
        "event", "evento", "party", "fiesta", "show", "presenta",
        "live", "en vivo", "dj", "lineup", "tickets", "boletas",
        "reserva", "booking", "new year", "año nuevo", "christmas",
        "navidad", "special", "especial", "exclusive", "exclusivo",
    ]
    
    for kw in event_keywords:
        if kw in caption_lower:
            signals["event_keywords"].append(kw)
    
    # Date patterns
    import re
    date_patterns = [
        r"\d{1,2}/\d{1,2}",  # 31/12
        r"\d{1,2}\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)",
        r"(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}",
        r"(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)",
        r"(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)",
    ]
    
    for pattern in date_patterns:
        matches = re.findall(pattern, caption_lower)
        signals["date_mentions"].extend(matches)
    
    # Price patterns
    price_patterns = [
        r"\$[\d,]+",
        r"[\d,]+\s*(?:cop|usd|pesos)",
        r"free\s+entry",
        r"entrada\s+libre",
        r"cover:\s*[\d,]+",
    ]
    
    for pattern in price_patterns:
        matches = re.findall(pattern, caption_lower)
        signals["price_mentions"].extend(matches)
    
    # Booking signals
    booking_keywords = ["reserva", "book", "dm", "link in bio", "whatsapp", "contact"]
    signals["booking_signal"] = any(kw in caption_lower for kw in booking_keywords)
    
    # Determine if this is an event announcement
    if len(signals["event_keywords"]) >= 2:
        signals["is_event"] = True
    elif signals["event_keywords"] and signals["date_mentions"]:
        signals["is_event"] = True
    elif signals["event_keywords"] and signals["price_mentions"]:
        signals["is_event"] = True
    
    return signals
