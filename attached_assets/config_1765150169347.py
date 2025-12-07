"""
Configuration management using Pydantic Settings.
Loads from .env file and environment variables.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase
    supabase_url: str
    supabase_key: str

    # Google Places
    google_places_api_key: str

    # AI Enrichment
    openai_api_key: str
    anthropic_api_key: str | None = None
    
    # Event Discovery (Optional)
    eventbrite_api_key: str | None = None

    # Rate limiting
    requests_per_second: float = 2.0
    max_concurrent_requests: int = 5

    # Defaults
    default_city: str = "Cartagena"
    default_country: str = "Colombia"


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Category mappings for Google Places
CATEGORY_MAPPING = {
    # Hospitality
    "restaurant": ["restaurant", "cafe", "bar", "bakery", "food"],
    "hotel": ["lodging", "hotel", "resort", "hostel", "guest_house"],
    "club": ["night_club", "bar", "casino"],
    "spa": ["spa", "beauty_salon", "hair_care"],
    
    # Tourism & Experiences
    "tour_operator": ["travel_agency", "tourist_attraction", "tour_operator"],
    "boat_charter": ["boat_rental", "marina", "boat_tour"],  # Will need text search supplement
    
    # Event Services (Limited in Places API - use text search)
    "event_planner": ["event_planner", "wedding_planner", "party_planner"],
    "photographer": ["photographer", "photo_studio"],
    "videographer": ["video_production", "film_studio"],
    "dj": ["dj", "entertainment_agency"],  # Sparse - text search required
    "chef": ["caterer", "personal_chef", "catering"],  # Sparse - text search required
    
    # Other
    "real_estate": ["real_estate_agency"],
    "gym": ["gym", "fitness_center"],
    "coworking": ["coworking_space"],
}

# Text search queries for categories with limited Places API coverage
# These supplement the standard category scans
TEXT_SEARCH_SUPPLEMENTS = {
    "boat_charter": [
        "yacht charter",
        "boat rental",
        "party boat",
        "catamaran tour",
        "sailing charter",
        "island boat tour",
        "fishing charter",
    ],
    "chef": [
        "private chef",
        "personal chef",
        "catering service",
        "chef privado",
        "chef a domicilio",
    ],
    "dj": [
        "dj services",
        "wedding dj",
        "event dj",
        "party dj",
    ],
    "photographer": [
        "wedding photographer",
        "event photographer",
        "portrait photographer",
        "fotografo bodas",
    ],
    "videographer": [
        "wedding videographer",
        "event videographer",
        "video production",
        "videografo",
    ],
    "event_planner": [
        "wedding planner",
        "event planner",
        "party planner",
        "destination wedding",
        "organizador de eventos",
    ],
}

# Google Places types to our categories (reverse mapping)
PLACES_TO_CATEGORY = {}
for category, place_types in CATEGORY_MAPPING.items():
    for place_type in place_types:
        PLACES_TO_CATEGORY[place_type] = category


# Supported cities with coordinates
CITY_COORDINATES = {
    "Cartagena": {"lat": 10.3910, "lng": -75.4794, "radius": 15000},
    "Medellín": {"lat": 6.2442, "lng": -75.5812, "radius": 20000},
    "Bogotá": {"lat": 4.7110, "lng": -74.0721, "radius": 25000},
    "Santa Marta": {"lat": 11.2408, "lng": -74.1990, "radius": 12000},
    "Barranquilla": {"lat": 10.9639, "lng": -74.7964, "radius": 15000},
}
