"""
Eventbrite Event Scraper.
"""
import asyncio
import re
from datetime import datetime, timedelta
from typing import Optional
import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from .models import (
    Event, EventSource, EventCategory, Venue, Artist,
    classify_event_category, detect_venue_tier,
)


class EventbriteScraper:
    BASE_URL = "https://www.eventbrite.com"
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        )
    
    async def close(self):
        await self.client.aclose()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def search_events(self, city: str = "cartagena", category: str = None, page: int = 1) -> list[dict]:
        url = f"{self.BASE_URL}/d/colombia--{city}/all-events/"
        if category:
            url = f"{self.BASE_URL}/d/colombia--{city}/{category}/"
        
        response = await self.client.get(url, params={"page": page})
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "lxml")
        events = []
        
        # Try multiple selector patterns
        for selector in [
            ("div", {"data-testid": "event-card"}),
            ("article", {"class": re.compile(r"event")}),
            ("div", {"class": re.compile(r"discover-search")}),
        ]:
            cards = soup.find_all(*selector)
            if cards:
                break
        
        for card in cards:
            try:
                link = card.find("a", href=True)
                if not link:
                    continue
                
                url = link.get("href", "")
                if not url.startswith("http"):
                    url = f"{self.BASE_URL}{url}"
                
                match = re.search(r"tickets?-(\d+)", url)
                external_id = match.group(1) if match else url.split("/")[-1]
                
                title = ""
                for tag in ["h2", "h3", "div"]:
                    elem = card.find(tag, class_=re.compile(r"title|name", re.I))
                    if elem:
                        title = elem.get_text(strip=True)
                        break
                if not title:
                    title = link.get_text(strip=True)
                
                events.append({
                    "external_id": external_id,
                    "url": url,
                    "title": title[:200],
                })
            except:
                continue
        
        return events
    
    async def discover_all(self, city: str = "cartagena", max_pages: int = 3) -> list[Event]:
        categories = ["nightlife", "music", "food-and-drink"]
        all_events = []
        seen_ids = set()
        
        for category in categories:
            for page in range(1, max_pages + 1):
                try:
                    results = await self.search_events(city, category, page)
                    for raw in results:
                        if raw["external_id"] in seen_ids:
                            continue
                        seen_ids.add(raw["external_id"])
                        
                        event = Event(
                            source=EventSource.EVENTBRITE,
                            external_id=raw["external_id"],
                            url=raw["url"],
                            name=raw.get("title", "Unknown"),
                            start_date=datetime.now() + timedelta(days=7),
                            city=city.title(),
                            category=classify_event_category(raw.get("title", "")),
                        )
                        event.event_tier = event.calculate_tier()
                        event.is_flagged = event.should_flag()
                        all_events.append(event)
                    
                    await asyncio.sleep(1)
                    if len(results) < 10:
                        break
                except Exception as e:
                    continue
        
        return all_events


async def scrape_eventbrite(city: str = "cartagena", max_pages: int = 3) -> list[Event]:
    scraper = EventbriteScraper()
    try:
        return await scraper.discover_all(city=city, max_pages=max_pages)
    finally:
        await scraper.close()
