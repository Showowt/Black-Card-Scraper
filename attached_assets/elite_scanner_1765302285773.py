"""
ELITE SCANNER
=============
Exhaustive business discovery that finds EVERYTHING.

The problem with basic Google Places search:
1. API has limited "types" - no photographer, videographer, DJ, chef, etc.
2. Text search only returns ~20 results per query
3. Results vary based on exact search terms

The solution:
1. Run MULTIPLE text searches with every possible term
2. Search each neighborhood separately
3. Deduplicate by place_id
4. Enrich with additional data

This finds 10x more businesses than basic scanning.
"""

import asyncio
import httpx
import sys
from pathlib import Path
from typing import Optional
from datetime import datetime
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich.table import Table

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from elite_search_config import (
    ELITE_SEARCH_TERMS,
    CITY_COORDINATES,
    GOOGLE_PLACES_TYPES,
    TEXT_SEARCH_ONLY_CATEGORIES,
    ELITE_SEARCH_CONFIG,
)
from models import Business, BusinessCategory, DataSource, GeoLocation, ContactInfo, SocialLinks
from config import settings

console = Console()


class EliteScanner:
    """
    Exhaustive business scanner that finds EVERYTHING.
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.google_places_api_key
        self.base_url = "https://places.googleapis.com/v1/places"
        self.found_place_ids = set()  # For deduplication
        self.results = []
        
    async def elite_scan(
        self,
        city: str,
        category: str,
        max_terms: int = None,
        search_neighborhoods: bool = True,
        progress_callback = None,
    ) -> list[Business]:
        """
        Run elite scan for a category in a city.
        
        Args:
            city: City name
            category: Category to scan
            max_terms: Max search terms to use (None = all)
            search_neighborhoods: Whether to also search each neighborhood
            progress_callback: Optional callback for progress updates
            
        Returns:
            List of discovered businesses
        """
        
        self.found_place_ids = set()
        self.results = []
        
        city_data = CITY_COORDINATES.get(city)
        if not city_data:
            console.print(f"[red]City not found: {city}[/red]")
            return []
        
        search_terms = ELITE_SEARCH_TERMS.get(category, [])
        if not search_terms:
            console.print(f"[red]No search terms for category: {category}[/red]")
            return []
        
        # Limit terms if specified
        if max_terms:
            search_terms = search_terms[:max_terms]
        
        console.print(f"\n[bold cyan]🔍 ELITE SCAN: {category.upper()} in {city}[/bold cyan]")
        console.print(f"[dim]Using {len(search_terms)} search terms[/dim]\n")
        
        # Build search locations
        search_locations = [
            {
                "name": city,
                "lat": city_data["lat"],
                "lng": city_data["lng"],
                "radius": city_data["radius"],
            }
        ]
        
        # Add neighborhoods if enabled
        if search_neighborhoods and city_data.get("neighborhoods"):
            for n in city_data["neighborhoods"]:
                search_locations.append({
                    "name": n["name"],
                    "lat": n["lat"],
                    "lng": n["lng"],
                    "radius": n["radius"],
                })
        
        total_searches = len(search_terms) * len(search_locations)
        completed = 0
        
        async with httpx.AsyncClient(timeout=30) as client:
            for location in search_locations:
                for term in search_terms:
                    # Build search query with city name for relevance
                    query = f"{term} {city}"
                    
                    try:
                        results = await self._text_search(
                            client=client,
                            query=query,
                            lat=location["lat"],
                            lng=location["lng"],
                            radius=location["radius"],
                        )
                        
                        # Process results
                        for place in results:
                            place_id = place.get("id")
                            if place_id and place_id not in self.found_place_ids:
                                self.found_place_ids.add(place_id)
                                
                                business = self._convert_to_business(
                                    place=place,
                                    category=category,
                                    city=city,
                                    search_term=term,
                                )
                                if business:
                                    self.results.append(business)
                        
                    except Exception as e:
                        console.print(f"[yellow]Error searching '{term}': {e}[/yellow]")
                    
                    completed += 1
                    if progress_callback:
                        progress_callback(completed, total_searches)
                    
                    # Rate limiting
                    await asyncio.sleep(ELITE_SEARCH_CONFIG["delay_between_calls"])
        
        console.print(f"\n[green]✓ Found {len(self.results)} unique businesses[/green]")
        return self.results
    
    async def _text_search(
        self,
        client: httpx.AsyncClient,
        query: str,
        lat: float,
        lng: float,
        radius: int,
    ) -> list[dict]:
        """Execute text search via Google Places API (New)."""
        
        url = f"{self.base_url}:searchText"
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": ",".join([
                "places.id",
                "places.displayName",
                "places.formattedAddress",
                "places.location",
                "places.rating",
                "places.userRatingCount",
                "places.priceLevel",
                "places.websiteUri",
                "places.nationalPhoneNumber",
                "places.internationalPhoneNumber",
                "places.googleMapsUri",
                "places.businessStatus",
                "places.types",
            ])
        }
        
        payload = {
            "textQuery": query,
            "locationBias": {
                "circle": {
                    "center": {
                        "latitude": lat,
                        "longitude": lng,
                    },
                    "radius": float(radius),
                }
            },
            "maxResultCount": 20,  # API max per request
            "languageCode": "es",  # Spanish results
        }
        
        response = await client.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("places", [])
        else:
            # Try without location bias for broader search
            payload.pop("locationBias", None)
            payload["textQuery"] = f"{query} Colombia"
            
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                return data.get("places", [])
            
        return []
    
    def _convert_to_business(
        self,
        place: dict,
        category: str,
        city: str,
        search_term: str,
    ) -> Optional[Business]:
        """Convert Google Places result to Business model."""
        
        try:
            # Extract name
            display_name = place.get("displayName", {})
            name = display_name.get("text", "") if isinstance(display_name, dict) else str(display_name)
            
            if not name:
                return None
            
            # Extract location
            location = place.get("location", {})
            geo = GeoLocation(
                lat=location.get("latitude", 0),
                lng=location.get("longitude", 0),
            )
            
            # Extract contact
            phone = place.get("internationalPhoneNumber") or place.get("nationalPhoneNumber")
            contact = ContactInfo(
                phone=phone,
                email=None,
                whatsapp=phone,
            )
            
            # Check for Instagram in website (common pattern)
            website = place.get("websiteUri", "")
            socials = SocialLinks()
            if website:
                if "instagram.com" in website.lower():
                    socials.instagram = website
                    website = None  # Don't use IG as website
            
            # Price level mapping
            price_map = {
                "PRICE_LEVEL_FREE": "free",
                "PRICE_LEVEL_INEXPENSIVE": "budget",
                "PRICE_LEVEL_MODERATE": "moderate",
                "PRICE_LEVEL_EXPENSIVE": "expensive",
                "PRICE_LEVEL_VERY_EXPENSIVE": "luxury",
            }
            price_level = price_map.get(place.get("priceLevel"), "moderate")
            
            # Create business
            business = Business(
                source=DataSource.GOOGLE_PLACES,
                external_id=place.get("id", ""),
                name=name,
                description=f"Found via: {search_term}",
                address=place.get("formattedAddress", ""),
                city=city,
                country="Colombia",
                geo=geo,
                category=BusinessCategory(category),
                tags=[search_term],
                website=website if website and "instagram" not in website.lower() else None,
                contact=contact,
                socials=socials,
                rating=place.get("rating"),
                review_count=place.get("userRatingCount"),
                price_level=price_level,
                is_verified=place.get("businessStatus") == "OPERATIONAL",
            )
            
            return business
            
        except Exception as e:
            console.print(f"[yellow]Error converting place: {e}[/yellow]")
            return None


async def run_elite_scan(
    city: str,
    category: str,
    max_terms: int = None,
    save: bool = True,
) -> list[Business]:
    """
    Run elite scan and optionally save to database.
    
    Usage:
        results = await run_elite_scan("Cartagena", "photographer")
    """
    
    scanner = EliteScanner()
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console,
    ) as progress:
        task = progress.add_task("Scanning...", total=100)
        
        def update_progress(completed, total):
            progress.update(task, completed=(completed / total) * 100)
        
        results = await scanner.elite_scan(
            city=city,
            category=category,
            max_terms=max_terms,
            progress_callback=update_progress,
        )
    
    if save and results:
        from services.storage import SupabaseStorage
        storage = SupabaseStorage()
        
        console.print(f"\n[cyan]Saving {len(results)} businesses to database...[/cyan]")
        saved = 0
        for business in results:
            try:
                await storage.upsert(business)
                saved += 1
            except Exception as e:
                console.print(f"[yellow]Failed to save {business.name}: {e}[/yellow]")
        
        console.print(f"[green]✓ Saved {saved} businesses[/green]")
    
    return results


async def run_full_elite_scan(
    city: str,
    categories: list[str] = None,
    save: bool = True,
) -> dict[str, list[Business]]:
    """
    Run elite scan for ALL categories (or specified list).
    
    Usage:
        results = await run_full_elite_scan("Cartagena")
        results = await run_full_elite_scan("Cartagena", ["photographer", "videographer", "dj"])
    """
    
    if categories is None:
        categories = list(ELITE_SEARCH_TERMS.keys())
    
    all_results = {}
    
    console.print(f"\n[bold magenta]🚀 FULL ELITE SCAN: {city}[/bold magenta]")
    console.print(f"[dim]Categories: {', '.join(categories)}[/dim]\n")
    
    for category in categories:
        results = await run_elite_scan(
            city=city,
            category=category,
            save=save,
        )
        all_results[category] = results
        
        # Summary for this category
        console.print(f"\n[green]{category}: {len(results)} businesses found[/green]")
    
    # Final summary
    console.print(f"\n[bold green]═══ ELITE SCAN COMPLETE ═══[/bold green]")
    
    table = Table(title="Results Summary")
    table.add_column("Category", style="cyan")
    table.add_column("Businesses Found", style="green")
    
    total = 0
    for cat, businesses in all_results.items():
        table.add_row(cat, str(len(businesses)))
        total += len(businesses)
    
    table.add_row("TOTAL", str(total), style="bold")
    console.print(table)
    
    return all_results


# ═══════════════════════════════════════════════════════════════════════════════
# SPECIALIZED SCANNERS FOR HARD-TO-FIND CATEGORIES
# ═══════════════════════════════════════════════════════════════════════════════

async def scan_photographers(city: str, save: bool = True) -> list[Business]:
    """Specialized scan for photographers."""
    return await run_elite_scan(city, "photographer", save=save)


async def scan_videographers(city: str, save: bool = True) -> list[Business]:
    """Specialized scan for videographers."""
    return await run_elite_scan(city, "videographer", save=save)


async def scan_djs(city: str, save: bool = True) -> list[Business]:
    """Specialized scan for DJs."""
    return await run_elite_scan(city, "dj", save=save)


async def scan_chefs(city: str, save: bool = True) -> list[Business]:
    """Specialized scan for private chefs."""
    return await run_elite_scan(city, "chef", save=save)


async def scan_event_planners(city: str, save: bool = True) -> list[Business]:
    """Specialized scan for event planners."""
    return await run_elite_scan(city, "event_planner", save=save)


async def scan_boats(city: str, save: bool = True) -> list[Business]:
    """Specialized scan for boat charters."""
    return await run_elite_scan(city, "boat_charter", save=save)


async def scan_hotels(city: str, save: bool = True) -> list[Business]:
    """Specialized scan for hotels."""
    return await run_elite_scan(city, "hotel", save=save)


async def scan_villas(city: str, save: bool = True) -> list[Business]:
    """Specialized scan for villa rentals."""
    return await run_elite_scan(city, "villa_rental", save=save)


async def scan_concierges(city: str, save: bool = True) -> list[Business]:
    """Specialized scan for concierge services."""
    return await run_elite_scan(city, "concierge", save=save)


# ═══════════════════════════════════════════════════════════════════════════════
# SCAN ALL HARD-TO-FIND CATEGORIES
# ═══════════════════════════════════════════════════════════════════════════════

async def scan_hard_to_find(city: str, save: bool = True) -> dict[str, list[Business]]:
    """
    Scan all the categories that are hard to find with basic search.
    These have no Google Places type, so require exhaustive text search.
    """
    
    hard_categories = [
        "photographer",
        "videographer", 
        "dj",
        "chef",
        "event_planner",
        "boat_charter",
        "villa_rental",
        "concierge",
    ]
    
    return await run_full_elite_scan(city, hard_categories, save=save)
