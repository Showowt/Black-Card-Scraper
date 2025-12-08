"""
Event Discovery Pipeline.
Scrapes upcoming events in Cartagena from multiple sources.
Flags high-end events for Movvia curation.
"""
import asyncio
import re
from datetime import datetime, timedelta
from typing import Optional
from enum import Enum
import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_settings


class EventTier(str, Enum):
    LUXURY = "luxury"      # $100+ tickets, exclusive venues
    PREMIUM = "premium"    # $50-100, upscale
    STANDARD = "standard"  # $20-50
    BUDGET = "budget"      # Under $20
    FREE = "free"


class EventCategory(str, Enum):
    MUSIC = "music"
    PARTY = "party"
    CULTURAL = "cultural"
    FOOD = "food"
    WELLNESS = "wellness"
    BUSINESS = "business"
    SPORTS = "sports"
    OTHER = "other"


class Event(BaseModel):
    """Normalized event data."""
    id: str
    source: str  # eventbrite, resident_advisor, venue_direct
    external_id: str
    external_url: str
    
    # Core info
    name: str
    description: Optional[str] = None
    
    # When
    start_date: datetime
    end_date: Optional[datetime] = None
    
    # Where
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    city: str = "Cartagena"
    
    # Classification
    category: EventCategory = EventCategory.OTHER
    tier: EventTier = EventTier.STANDARD
    tags: list[str] = Field(default_factory=list)
    
    # Pricing
    is_free: bool = False
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    currency: str = "COP"
    ticket_url: Optional[str] = None
    
    # Capacity signals
    capacity: Optional[int] = None
    tickets_sold: Optional[int] = None
    is_sold_out: bool = False
    
    # Lineup (for music events)
    lineup: list[str] = Field(default_factory=list)
    headliner: Optional[str] = None
    
    # Media
    image_url: Optional[str] = None
    
    # Metadata
    scraped_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Movvia flags
    is_high_priority: bool = False  # Flag for immediate attention
    movvia_notes: Optional[str] = None


# Cartagena venue Instagram handles to monitor (manual list)
CARTAGENA_VENUES = {
    "alquimico": {
        "name": "Alquímico",
        "instagram": "alquimico",
        "type": "bar",
        "tier": "premium",
    },
    "cafe_del_mar": {
        "name": "Café del Mar",
        "instagram": "cafedelmarcartagena",
        "type": "club",
        "tier": "luxury",
    },
    "la_movida": {
        "name": "La Movida",
        "instagram": "lamovidacartagena", 
        "type": "club",
        "tier": "premium",
    },
    "teatro_heredia": {
        "name": "Teatro Adolfo Mejía",
        "instagram": "teatroheredia",
        "type": "theater",
        "tier": "premium",
    },
    "eivissa": {
        "name": "Eivissa Beach Club",
        "instagram": "eivissacartagena",
        "type": "beach_club",
        "tier": "luxury",
    },
    "la_jugada": {
        "name": "La Jugada",
        "instagram": "lajugadacartagena",
        "type": "club",
        "tier": "premium",
    },
    "donde_fidel": {
        "name": "Donde Fidel",
        "instagram": "dondefidel",
        "type": "bar",
        "tier": "standard",
    },
    "bazurto_social_club": {
        "name": "Bazurto Social Club",
        "instagram": "bazurtosocialclub",
        "type": "club",
        "tier": "premium",
    },
}

# Keywords that indicate high-end events
LUXURY_INDICATORS = [
    r"vip",
    r"exclusive",
    r"private",
    r"champagne",
    r"black\s*tie",
    r"gala",
    r"yacht",
    r"rooftop",
    r"sunset\s*party",
    r"brunch\s*party",
    r"pool\s*party",
    r"nye|new\s*year",
    r"residency",
    r"international\s*dj",
]

# Price thresholds (in COP)
PRICE_TIERS_COP = {
    "luxury": 400000,    # ~$100 USD
    "premium": 200000,   # ~$50 USD
    "standard": 80000,   # ~$20 USD
}


class EventbriteClient:
    """
    Eventbrite API client.
    Free tier: 1000 requests/day
    Docs: https://www.eventbrite.com/platform/api
    """
    
    BASE_URL = "https://www.eventbriteapi.com/v3"
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or get_settings().eventbrite_api_key if hasattr(get_settings(), 'eventbrite_api_key') else None
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        await self.client.aclose()
    
    def _headers(self) -> dict:
        if self.api_key:
            return {"Authorization": f"Bearer {self.api_key}"}
        return {}
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def search_events(
        self,
        location: str = "Cartagena",
        country: str = "CO",
        start_date: datetime = None,
        end_date: datetime = None,
        categories: list[str] = None,
    ) -> list[dict]:
        """
        Search for events in a location.
        Note: Without API key, uses public search endpoint with limited data.
        """
        # Public search endpoint (no auth needed)
        url = "https://www.eventbrite.com/api/v3/destination/search/"
        
        start = start_date or datetime.utcnow()
        end = end_date or (datetime.utcnow() + timedelta(days=90))
        
        params = {
            "event_search.dates": "current_future",
            "event_search.location": f"{location}, Colombia",
            "expand": "event_sales_status,primary_venue,ticket_availability",
            "page_size": 50,
        }
        
        try:
            response = await self.client.get(url, params=params, headers=self._headers())
            response.raise_for_status()
            data = response.json()
            return data.get("events", {}).get("results", [])
        except Exception:
            # Fallback to scraping public page
            return await self._scrape_public_page(location)
    
    async def _scrape_public_page(self, location: str) -> list[dict]:
        """Scrape public Eventbrite search results."""
        url = f"https://www.eventbrite.com/d/colombia--cartagena/all-events/"
        
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "lxml")
            events = []
            
            # Find event cards
            for card in soup.select("[data-testid='event-card']"):
                try:
                    link = card.select_one("a[href*='/e/']")
                    if not link:
                        continue
                    
                    event_url = link.get("href", "")
                    title = card.select_one("h2, h3")
                    date_elem = card.select_one("time, [data-testid='event-card-date']")
                    price_elem = card.select_one("[data-testid='event-card-price']")
                    
                    events.append({
                        "url": event_url,
                        "name": title.get_text(strip=True) if title else "",
                        "date_str": date_elem.get_text(strip=True) if date_elem else "",
                        "price_str": price_elem.get_text(strip=True) if price_elem else "",
                    })
                except Exception:
                    continue
            
            return events
        except Exception:
            return []
    
    def normalize(self, raw: dict) -> Event:
        """Convert raw Eventbrite data to Event model."""
        # Parse price
        price_str = raw.get("price_str", "")
        min_price = None
        is_free = "free" in price_str.lower() or "gratis" in price_str.lower()
        
        if not is_free:
            # Extract numbers from price string
            numbers = re.findall(r"[\d,]+", price_str.replace(".", ""))
            if numbers:
                try:
                    min_price = float(numbers[0].replace(",", ""))
                except ValueError:
                    pass
        
        # Determine tier
        tier = EventTier.FREE if is_free else self._classify_tier(min_price)
        
        # Parse date (simplified)
        start_date = datetime.utcnow() + timedelta(days=7)  # Default
        
        # Check for luxury indicators
        name = raw.get("name", "")
        is_luxury = any(re.search(p, name, re.IGNORECASE) for p in LUXURY_INDICATORS)
        
        return Event(
            id=f"eventbrite_{raw.get('url', '').split('/')[-1]}",
            source="eventbrite",
            external_id=raw.get("url", "").split("/")[-1],
            external_url=raw.get("url", ""),
            name=name,
            start_date=start_date,
            city="Cartagena",
            tier=EventTier.LUXURY if is_luxury else tier,
            is_free=is_free,
            min_price=min_price,
            currency="COP",
            is_high_priority=is_luxury or tier == EventTier.LUXURY,
        )
    
    def _classify_tier(self, price: float = None) -> EventTier:
        if not price:
            return EventTier.STANDARD
        if price >= PRICE_TIERS_COP["luxury"]:
            return EventTier.LUXURY
        if price >= PRICE_TIERS_COP["premium"]:
            return EventTier.PREMIUM
        if price >= PRICE_TIERS_COP["standard"]:
            return EventTier.STANDARD
        return EventTier.BUDGET


class ResidentAdvisorScraper:
    """
    Resident Advisor event scraper.
    RA has decent anti-scraping, so be gentle.
    """
    
    BASE_URL = "https://ra.co"
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
    
    async def close(self):
        await self.client.aclose()
    
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=2, min=3, max=15))
    async def get_events(self, region: str = "colombia") -> list[dict]:
        """
        Get events from RA for Colombia.
        Note: Cartagena has limited RA coverage. Most events are Bogotá/Medellín.
        """
        url = f"{self.BASE_URL}/events/{region}"
        
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "lxml")
            events = []
            
            # RA uses complex React structure, look for event links
            for link in soup.select("a[href*='/events/']"):
                href = link.get("href", "")
                if "/events/" in href and len(href.split("/")) > 3:
                    events.append({
                        "url": f"{self.BASE_URL}{href}",
                        "name": link.get_text(strip=True),
                    })
            
            return events[:20]  # Limit results
        except Exception as e:
            print(f"RA scrape error: {e}")
            return []
    
    async def get_event_details(self, event_url: str) -> dict:
        """Get detailed event info from event page."""
        try:
            response = await self.client.get(event_url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "lxml")
            
            # Extract structured data
            details = {
                "url": event_url,
                "name": "",
                "venue": "",
                "lineup": [],
                "date": "",
            }
            
            # Title
            title = soup.select_one("h1")
            if title:
                details["name"] = title.get_text(strip=True)
            
            # Venue
            venue = soup.select_one("[data-testid='venue-link']")
            if venue:
                details["venue"] = venue.get_text(strip=True)
            
            # Lineup - look for artist links
            for artist in soup.select("a[href*='/dj/']"):
                name = artist.get_text(strip=True)
                if name and name not in details["lineup"]:
                    details["lineup"].append(name)
            
            return details
        except Exception:
            return {"url": event_url}


class VenueWebsiteScraper:
    """
    Scrape events directly from venue websites.
    More reliable than platforms for local venues.
    """
    
    # Known venue event page patterns
    VENUE_PATTERNS = {
        "alquimico": {
            "url": "https://alquimico.com/eventos",
            "parser": "_parse_generic",
        },
        "cafedelmar": {
            "url": "https://www.cafedelmarcartagena.com/events",
            "parser": "_parse_generic",
        },
    }
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; EventBot/1.0)",
            },
        )
    
    async def close(self):
        await self.client.aclose()
    
    async def scrape_venue(self, venue_key: str) -> list[dict]:
        """Scrape events from a specific venue."""
        if venue_key not in self.VENUE_PATTERNS:
            return []
        
        config = self.VENUE_PATTERNS[venue_key]
        try:
            response = await self.client.get(config["url"])
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "lxml")
            return self._parse_generic(soup, venue_key)
        except Exception:
            return []
    
    def _parse_generic(self, soup: BeautifulSoup, venue_key: str) -> list[dict]:
        """Generic event parser - looks for common patterns."""
        events = []
        
        # Look for event-like elements
        for elem in soup.select(".event, .evento, [class*='event'], article"):
            try:
                title = elem.select_one("h2, h3, .title, .name")
                date = elem.select_one("time, .date, .fecha")
                
                if title:
                    events.append({
                        "name": title.get_text(strip=True),
                        "date_str": date.get_text(strip=True) if date else "",
                        "venue": venue_key,
                    })
            except Exception:
                continue
        
        return events


class EventPipeline:
    """
    Main event discovery pipeline.
    Aggregates events from all sources.
    """
    
    def __init__(self):
        self.eventbrite = EventbriteClient()
        self.ra = ResidentAdvisorScraper()
        self.venues = VenueWebsiteScraper()
    
    async def close(self):
        await self.eventbrite.close()
        await self.ra.close()
        await self.venues.close()
    
    async def discover_all(
        self,
        days_ahead: int = 90,
        include_ra: bool = True,
    ) -> list[Event]:
        """Run full event discovery pipeline."""
        all_events = []
        
        # Eventbrite
        try:
            eb_events = await self.eventbrite.search_events()
            for raw in eb_events:
                event = self.eventbrite.normalize(raw)
                all_events.append(event)
        except Exception as e:
            print(f"Eventbrite error: {e}")
        
        # Resident Advisor (optional - often blocked)
        if include_ra:
            try:
                await asyncio.sleep(2)  # Be nice
                ra_events = await self.ra.get_events()
                for raw in ra_events:
                    event = Event(
                        id=f"ra_{hash(raw.get('url', ''))}",
                        source="resident_advisor",
                        external_id=raw.get("url", "").split("/")[-1],
                        external_url=raw.get("url", ""),
                        name=raw.get("name", ""),
                        start_date=datetime.utcnow() + timedelta(days=7),
                        city="Colombia",  # RA is usually Bogotá/Medellín
                        category=EventCategory.MUSIC,
                    )
                    all_events.append(event)
            except Exception as e:
                print(f"RA error: {e}")
        
        # Dedupe by name similarity
        seen_names = set()
        unique = []
        for event in all_events:
            name_key = event.name.lower()[:30]
            if name_key not in seen_names:
                seen_names.add(name_key)
                unique.append(event)
        
        # Sort by priority, then date
        unique.sort(key=lambda x: (not x.is_high_priority, x.start_date))
        
        return unique
    
    def flag_high_priority(self, events: list[Event]) -> list[Event]:
        """Flag events that need immediate Movvia attention."""
        for event in events:
            reasons = []
            
            # Price tier
            if event.tier == EventTier.LUXURY:
                reasons.append("luxury_tier")
            
            # Name indicators
            name_lower = event.name.lower()
            for pattern in LUXURY_INDICATORS:
                if re.search(pattern, name_lower):
                    reasons.append(f"keyword:{pattern}")
                    break
            
            # Venue reputation
            for venue_key, venue_info in CARTAGENA_VENUES.items():
                if venue_info["name"].lower() in (event.venue_name or "").lower():
                    if venue_info["tier"] in ["luxury", "premium"]:
                        reasons.append(f"venue:{venue_key}")
            
            # NYE, major holidays
            if event.start_date:
                if event.start_date.month == 12 and event.start_date.day >= 28:
                    reasons.append("nye_period")
                if event.start_date.month == 1 and event.start_date.day <= 3:
                    reasons.append("nye_period")
            
            if reasons:
                event.is_high_priority = True
                event.movvia_notes = f"Priority reasons: {', '.join(reasons)}"
        
        return events


async def run_event_discovery(
    days_ahead: int = 90,
    output_file: str = None,
) -> list[Event]:
    """Run the event discovery pipeline."""
    pipeline = EventPipeline()
    
    try:
        events = await pipeline.discover_all(days_ahead=days_ahead)
        events = pipeline.flag_high_priority(events)
        
        if output_file:
            import json
            with open(output_file, "w") as f:
                json.dump(
                    [e.model_dump(mode="json") for e in events],
                    f,
                    indent=2,
                    default=str,
                )
        
        return events
    finally:
        await pipeline.close()


# Manual event input for venues without scrapeable websites
def create_manual_event(
    name: str,
    venue: str,
    date: datetime,
    price_cop: float = None,
    lineup: list[str] = None,
    ticket_url: str = None,
    notes: str = None,
) -> Event:
    """Create an event manually (for Instagram finds, word of mouth, etc.)"""
    tier = EventTier.FREE
    if price_cop:
        if price_cop >= PRICE_TIERS_COP["luxury"]:
            tier = EventTier.LUXURY
        elif price_cop >= PRICE_TIERS_COP["premium"]:
            tier = EventTier.PREMIUM
        elif price_cop >= PRICE_TIERS_COP["standard"]:
            tier = EventTier.STANDARD
        else:
            tier = EventTier.BUDGET
    
    return Event(
        id=f"manual_{hash(name + str(date))}",
        source="manual",
        external_id=str(hash(name + str(date))),
        external_url=ticket_url or "",
        name=name,
        venue_name=venue,
        start_date=date,
        city="Cartagena",
        tier=tier,
        min_price=price_cop,
        currency="COP",
        lineup=lineup or [],
        headliner=lineup[0] if lineup else None,
        ticket_url=ticket_url,
        is_high_priority=tier in [EventTier.LUXURY, EventTier.PREMIUM],
        movvia_notes=notes,
    )
