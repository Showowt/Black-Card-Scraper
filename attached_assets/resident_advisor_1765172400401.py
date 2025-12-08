"""
Resident Advisor Event Scraper.
Best source for electronic music events.
"""
import asyncio
import re
from datetime import datetime
from typing import Optional
import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from .models import (
    Event, EventSource, EventCategory, Venue, Artist,
    detect_venue_tier,
)


class ResidentAdvisorScraper:
    BASE_URL = "https://ra.co"
    
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
    async def get_events_listing(self, area: str = "colombia") -> list[dict]:
        url = f"{self.BASE_URL}/events/co"
        
        response = await self.client.get(url)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "lxml")
        events = []
        
        # Find event items
        event_links = soup.find_all("a", href=re.compile(r"/events/\d+"))
        
        for link in event_links:
            try:
                href = link.get("href", "")
                if not href.startswith("http"):
                    href = f"{self.BASE_URL}{href}"
                
                match = re.search(r"/events/(\d+)", href)
                external_id = match.group(1) if match else href.split("/")[-1]
                
                title = link.get_text(strip=True)
                
                events.append({
                    "external_id": external_id,
                    "url": href,
                    "title": title[:200],
                })
            except:
                continue
        
        return events
    
    async def discover_all(self, area: str = "colombia") -> list[Event]:
        raw_events = await self.get_events_listing(area=area)
        
        events = []
        for raw in raw_events:
            event = Event(
                source=EventSource.RESIDENT_ADVISOR,
                external_id=raw["external_id"],
                url=raw["url"],
                name=raw.get("title", "RA Event"),
                start_date=datetime.now(),
                city="Cartagena",
                category=EventCategory.NIGHTCLUB,
            )
            event.event_tier = event.calculate_tier()
            event.is_flagged = event.should_flag()
            events.append(event)
        
        return events


async def scrape_resident_advisor(area: str = "colombia", enrich_details: bool = False) -> list[Event]:
    scraper = ResidentAdvisorScraper()
    try:
        return await scraper.discover_all(area=area)
    finally:
        await scraper.close()
