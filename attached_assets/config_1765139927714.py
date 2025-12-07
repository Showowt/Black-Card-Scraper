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
    "restaurant": ["restaurant", "cafe", "bar", "bakery", "food"],
    "hotel": ["lodging", "hotel", "resort", "hostel", "guest_house"],
    "club": ["night_club", "bar", "casino"],
    "tour_operator": ["travel_agency", "tourist_attraction", "tour_operator"],
    "spa": ["spa", "beauty_salon", "hair_care"],
    "real_estate": ["real_estate_agency"],
    "gym": ["gym", "fitness_center"],
    "coworking": ["coworking_space"],
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
