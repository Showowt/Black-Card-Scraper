"""
Google Places API client.
Uses the Places API (New) for better data.
"""
import httpx
from typing import AsyncIterator
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_settings, CITY_COORDINATES, CATEGORY_MAPPING, PLACES_TO_CATEGORY
from models import (
    RawBusinessData, DataSource, GeoLocation, Business, 
    BusinessCategory, PriceLevel, ContactInfo
)


class GooglePlacesClient:
    """
    Google Places API client.
    Uses Places API (New) - https://developers.google.com/maps/documentation/places/web-service
    """
    
    BASE_URL = "https://places.googleapis.com/v1/places"
    
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.google_places_api_key
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        await self.client.aclose()
    
    def _get_headers(self, fields: list[str]) -> dict:
        return {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": ",".join(fields),
        }
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def search_nearby(
        self,
        city: str,
        category: str,
        max_results: int = 60,
    ) -> list[RawBusinessData]:
        """
        Search for businesses near a city center.
        Uses Places API Nearby Search (New).
        """
        if city not in CITY_COORDINATES:
            raise ValueError(f"Unknown city: {city}. Available: {list(CITY_COORDINATES.keys())}")
        
        if category not in CATEGORY_MAPPING:
            raise ValueError(f"Unknown category: {category}. Available: {list(CATEGORY_MAPPING.keys())}")
        
        coords = CITY_COORDINATES[city]
        place_types = CATEGORY_MAPPING[category]
        
        results = []
        
        for place_type in place_types:
            response = await self._nearby_search_request(
                lat=coords["lat"],
                lng=coords["lng"],
                radius=coords["radius"],
                place_type=place_type,
                max_results=max_results,
            )
            
            for place in response.get("places", []):
                raw = RawBusinessData(
                    source=DataSource.GOOGLE_PLACES,
                    external_id=place.get("id", ""),
                    raw_name=place.get("displayName", {}).get("text", "Unknown"),
                    raw_address=place.get("formattedAddress"),
                    raw_category=place_type,
                    raw_data=place,
                )
                results.append(raw)
        
        # Dedupe by external_id
        seen = set()
        unique = []
        for r in results:
            if r.external_id not in seen:
                seen.add(r.external_id)
                unique.append(r)
        
        return unique[:max_results]
    
    async def _nearby_search_request(
        self,
        lat: float,
        lng: float,
        radius: int,
        place_type: str,
        max_results: int,
    ) -> dict:
        """Execute a single nearby search request."""
        url = f"{self.BASE_URL}:searchNearby"
        
        # Fields we want - balance between data and cost
        fields = [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.types",
            "places.primaryType",
            "places.primaryTypeDisplayName",
            "places.nationalPhoneNumber",
            "places.internationalPhoneNumber",
            "places.websiteUri",
            "places.googleMapsUri",
            "places.rating",
            "places.userRatingCount",
            "places.priceLevel",
            "places.regularOpeningHours",
        ]
        
        body = {
            "includedTypes": [place_type],
            "maxResultCount": min(max_results, 20),  # API max per request
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": float(radius),
                }
            },
            "rankPreference": "POPULARITY",
        }
        
        response = await self.client.post(
            url,
            headers=self._get_headers(fields),
            json=body,
        )
        response.raise_for_status()
        return response.json()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def text_search(
        self,
        query: str,
        city: str,
        max_results: int = 20,
    ) -> list[RawBusinessData]:
        """
        Text-based search for more specific queries.
        Example: "rooftop bars Cartagena"
        """
        if city not in CITY_COORDINATES:
            raise ValueError(f"Unknown city: {city}")
        
        coords = CITY_COORDINATES[city]
        url = f"{self.BASE_URL}:searchText"
        
        fields = [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.types",
            "places.websiteUri",
            "places.rating",
            "places.userRatingCount",
            "places.priceLevel",
            "places.nationalPhoneNumber",
            "places.internationalPhoneNumber",
            "places.googleMapsUri",
        ]
        
        body = {
            "textQuery": f"{query} {city}",
            "maxResultCount": min(max_results, 20),
            "locationBias": {
                "circle": {
                    "center": {"latitude": coords["lat"], "longitude": coords["lng"]},
                    "radius": float(coords["radius"]),
                }
            },
        }
        
        response = await self.client.post(
            url,
            headers=self._get_headers(fields),
            json=body,
        )
        response.raise_for_status()
        data = response.json()
        
        results = []
        for place in data.get("places", []):
            raw = RawBusinessData(
                source=DataSource.GOOGLE_PLACES,
                external_id=place.get("id", ""),
                raw_name=place.get("displayName", {}).get("text", "Unknown"),
                raw_address=place.get("formattedAddress"),
                raw_category=place.get("primaryType", "other"),
                raw_data=place,
            )
            results.append(raw)
        
        return results
    
    def normalize(self, raw: RawBusinessData, city: str) -> Business:
        """Convert raw Google Places data to normalized Business model."""
        data = raw.raw_data
        
        # Location
        location = data.get("location", {})
        geo = None
        if location:
            geo = GeoLocation(
                lat=location.get("latitude", 0),
                lng=location.get("longitude", 0),
            )
        
        # Category mapping
        primary_type = data.get("primaryType", raw.raw_category or "other")
        category = PLACES_TO_CATEGORY.get(primary_type, "other")
        try:
            category_enum = BusinessCategory(category)
        except ValueError:
            category_enum = BusinessCategory.OTHER
        
        # Price level mapping
        price_map = {
            "PRICE_LEVEL_FREE": PriceLevel.FREE,
            "PRICE_LEVEL_INEXPENSIVE": PriceLevel.BUDGET,
            "PRICE_LEVEL_MODERATE": PriceLevel.MODERATE,
            "PRICE_LEVEL_EXPENSIVE": PriceLevel.EXPENSIVE,
            "PRICE_LEVEL_VERY_EXPENSIVE": PriceLevel.LUXURY,
        }
        price_level = price_map.get(data.get("priceLevel"))
        
        # Contact
        contact = ContactInfo(
            phone=data.get("internationalPhoneNumber") or data.get("nationalPhoneNumber"),
        )
        
        # Create slug
        name = raw.raw_name
        slug = name.lower().replace(" ", "-").replace("'", "")[:50]
        
        return Business(
            source=DataSource.GOOGLE_PLACES,
            external_id=raw.external_id,
            name=name,
            slug=slug,
            address=raw.raw_address,
            city=city,
            geo=geo,
            category=category_enum,
            website=data.get("websiteUri"),
            contact=contact,
            price_level=price_level,
            rating=data.get("rating"),
            review_count=data.get("userRatingCount"),
            tags=[t for t in data.get("types", [])[:5]],  # Limit tags
        )


async def fetch_businesses(
    city: str,
    category: str,
    max_results: int = 60,
) -> list[Business]:
    """
    High-level function to fetch and normalize businesses.
    """
    client = GooglePlacesClient()
    try:
        raw_results = await client.search_nearby(city, category, max_results)
        return [client.normalize(raw, city) for raw in raw_results]
    finally:
        await client.close()
