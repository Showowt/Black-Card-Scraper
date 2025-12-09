"""
Core data models for the business scanner.
All data flows through these Pydantic models for validation and serialization.
"""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import Optional


class BusinessCategory(str, Enum):
    RESTAURANT = "restaurant"
    HOTEL = "hotel"
    CLUB = "club"
    TOUR_OPERATOR = "tour_operator"
    SPA = "spa"
    REAL_ESTATE = "real_estate"
    GYM = "gym"
    COWORKING = "coworking"
    # New service categories
    BOAT_CHARTER = "boat_charter"
    CONCIERGE = "concierge"
    VILLA_RENTAL = "villa_rental"
    TRANSPORTATION = "transportation"
    PHOTOGRAPHER = "photographer"
    VIDEOGRAPHER = "videographer"
    CHEF = "chef"
    EVENT_PLANNER = "event_planner"
    DJ = "dj"
    OTHER = "other"


class DataSource(str, Enum):
    GOOGLE_PLACES = "google_places"
    DIRECTORY = "directory"
    MANUAL = "manual"
    WEBSITE_SCRAPE = "website_scrape"


class PriceLevel(str, Enum):
    FREE = "free"
    BUDGET = "budget"
    MODERATE = "moderate"
    EXPENSIVE = "expensive"
    LUXURY = "luxury"


class AIReadinessLevel(str, Enum):
    HIGH = "high"          # Has website, socials, modern presence
    MEDIUM = "medium"      # Has some digital presence
    LOW = "low"            # Minimal online presence
    UNKNOWN = "unknown"


class GeoLocation(BaseModel):
    lat: float
    lng: float


class SocialLinks(BaseModel):
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    linkedin: Optional[str] = None
    tiktok: Optional[str] = None
    whatsapp: Optional[str] = None


class ContactInfo(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    
    @field_validator("phone", mode="before")
    @classmethod
    def clean_phone(cls, v):
        if v:
            # Remove common formatting
            return "".join(c for c in str(v) if c.isdigit() or c == "+")
        return v


class BusinessHours(BaseModel):
    monday: Optional[str] = None
    tuesday: Optional[str] = None
    wednesday: Optional[str] = None
    thursday: Optional[str] = None
    friday: Optional[str] = None
    saturday: Optional[str] = None
    sunday: Optional[str] = None


class RawBusinessData(BaseModel):
    """Incoming data from any source before normalization."""
    source: DataSource
    external_id: str
    raw_name: str
    raw_address: Optional[str] = None
    raw_category: Optional[str] = None
    raw_data: dict = Field(default_factory=dict)
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


class Business(BaseModel):
    """Normalized business entity - the core data model."""
    # Identifiers
    id: Optional[str] = None  # Supabase UUID
    source: DataSource
    external_id: str
    
    # Core info
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    
    # Location
    address: Optional[str] = None
    city: str
    country: str = "Colombia"
    neighborhood: Optional[str] = None
    geo: Optional[GeoLocation] = None
    
    # Classification
    category: BusinessCategory
    subcategory: Optional[str] = None  # AI-enriched: "Fine Dining", "Boutique Hotel"
    tags: list[str] = Field(default_factory=list)
    
    # Contact
    website: Optional[str] = None
    contact: ContactInfo = Field(default_factory=ContactInfo)
    socials: SocialLinks = Field(default_factory=SocialLinks)
    
    # Business details
    hours: Optional[BusinessHours] = None
    price_level: Optional[PriceLevel] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    
    # AI Enrichment
    ai_summary: Optional[str] = None
    ai_readiness: AIReadinessLevel = AIReadinessLevel.UNKNOWN
    ai_outreach_hook: Optional[str] = None  # Personalized opener for outreach
    ai_opportunity_score: Optional[int] = None  # 1-100
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_enriched_at: Optional[datetime] = None
    is_verified: bool = False
    
    # Outreach tracking
    outreach_status: Optional[str] = None  # "pending", "contacted", "responded", "converted"
    
    def unique_key(self) -> str:
        """Unique identifier for deduplication."""
        return f"{self.source.value}:{self.external_id}"
    
    def to_supabase_dict(self) -> dict:
        """Convert to dict for Supabase upsert."""
        data = self.model_dump(exclude={"id"})
        # Flatten nested models
        if self.geo:
            data["geo_lat"] = self.geo.lat
            data["geo_lng"] = self.geo.lng
        data.pop("geo", None)
        
        # Convert enums to strings
        data["source"] = self.source.value
        data["category"] = self.category.value
        if self.price_level:
            data["price_level"] = self.price_level.value
        data["ai_readiness"] = self.ai_readiness.value
        
        # Serialize nested models as JSON
        data["contact"] = self.contact.model_dump() if self.contact else {}
        data["socials"] = self.socials.model_dump() if self.socials else {}
        data["hours"] = self.hours.model_dump() if self.hours else None
        
        return data


class WebsiteMetadata(BaseModel):
    """Extracted metadata from a business website."""
    url: str
    title: Optional[str] = None
    meta_description: Optional[str] = None
    emails: list[str] = Field(default_factory=list)
    phones: list[str] = Field(default_factory=list)
    social_links: SocialLinks = Field(default_factory=SocialLinks)
    has_booking: bool = False
    has_menu: bool = False
    language: Optional[str] = None


class EnrichmentResult(BaseModel):
    """AI enrichment output."""
    subcategory: Optional[str] = None
    summary: Optional[str] = None
    readiness: AIReadinessLevel
    outreach_hook: Optional[str] = None
    opportunity_score: int  # 1-100
    tags: list[str] = Field(default_factory=list)
