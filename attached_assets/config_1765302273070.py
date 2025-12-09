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
    
    # Concierge & Luxury Services (Limited in Places - text search required)
    "concierge": ["concierge_service", "travel_agency"],  # Sparse - text search required
    "villa_rental": ["vacation_rental", "lodging"],  # Sparse - text search required
    "transportation": ["car_rental", "limousine_service", "taxi_service"],
    
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
# ELITE SEARCH MATRIX - Every possible name variation in English and Spanish
TEXT_SEARCH_SUPPLEMENTS = {
    # ═══════════════════════════════════════════════════════════════════
    # PHOTOGRAPHERS - EXHAUSTIVE (50+ terms)
    # ═══════════════════════════════════════════════════════════════════
    "photographer": [
        # Core English terms
        "photographer", "photography", "photo studio", "photography studio",
        "professional photographer", "freelance photographer",
        # Wedding specific
        "wedding photographer", "wedding photography", "destination wedding photographer",
        "engagement photographer", "engagement photos", "bridal photographer",
        # Event photography
        "event photographer", "event photography", "corporate photographer",
        "corporate photography", "conference photographer", "party photographer",
        "birthday photographer", "quinceañera photographer", "quince photographer",
        # Portrait & lifestyle
        "portrait photographer", "portrait photography", "family photographer",
        "family photography", "maternity photographer", "newborn photographer",
        "baby photographer", "kids photographer", "headshot photographer",
        # Commercial
        "commercial photographer", "product photographer", "food photographer",
        "fashion photographer", "brand photographer", "lifestyle photographer",
        # Real estate
        "real estate photographer", "architectural photographer", "interior photographer",
        "property photographer", "airbnb photographer", "hotel photographer",
        # Spanish terms - ALL variations
        "fotografo", "fotógrafo", "fotografia", "fotografía",
        "estudio fotografico", "estudio fotográfico", "estudio de fotografia",
        "fotografo profesional", "fotógrafo profesional",
        "fotografo de bodas", "fotógrafo de bodas", "fotografia de bodas",
        "fotografo de eventos", "fotógrafo de eventos", "fotografia de eventos",
        "fotografo de retratos", "fotógrafo de retratos",
        "fotografo comercial", "fotógrafo comercial",
        "sesion de fotos", "sesión de fotos", "sesion fotografica",
        "fotografo cartagena", "fotógrafo cartagena",
        "fotografo medellin", "fotógrafo medellín", "fotografo bogota",
        # Drone/aerial
        "drone photographer", "aerial photographer", "drone photography",
        "fotografia aerea", "fotografía aérea", "fotografo con drone",
    ],
    
    # ═══════════════════════════════════════════════════════════════════
    # VIDEOGRAPHERS - EXHAUSTIVE (50+ terms)
    # ═══════════════════════════════════════════════════════════════════
    "videographer": [
        # Core English terms
        "videographer", "videography", "video production", "video studio",
        "filmmaker", "film production", "cinematographer", "cinematography",
        "professional videographer", "freelance videographer",
        # Wedding specific
        "wedding videographer", "wedding videography", "wedding film",
        "wedding cinematography", "destination wedding videographer",
        "wedding video", "matrimonio video", "video de bodas",
        # Event video
        "event videographer", "event videography", "event video production",
        "corporate videographer", "corporate video", "corporate video production",
        "conference videographer", "party videographer", "quinceañera video",
        # Commercial video
        "commercial video", "commercial videographer", "promotional video",
        "promo video", "marketing video", "brand video", "brand film",
        "social media video", "content creator", "video content",
        # Real estate & property
        "real estate video", "property video", "hotel video",
        "airbnb video", "listing video", "virtual tour video",
        # Spanish terms - ALL variations
        "videografo", "videógrafo", "videografia", "videografía",
        "produccion de video", "producción de video", "productor de video",
        "camarografo", "camarógrafo", "cineasta",
        "video profesional", "estudio de video",
        "videografo de bodas", "videógrafo de bodas",
        "videografo de eventos", "videógrafo de eventos",
        "video corporativo", "video empresarial", "video institucional",
        "video promocional", "video publicitario",
        "edicion de video", "edición de video", "editor de video",
        "videografo cartagena", "videógrafo cartagena",
        "videografo medellin", "videógrafo medellín",
        # Drone video
        "drone videographer", "drone video", "aerial video",
        "video aereo", "video aéreo", "drone cinematography",
        # Music video
        "music video", "music video production", "video musical",
    ],
    
    # ═══════════════════════════════════════════════════════════════════
    # PRIVATE CHEFS - EXHAUSTIVE (40+ terms)
    # ═══════════════════════════════════════════════════════════════════
    "chef": [
        # Core English terms
        "private chef", "personal chef", "private cook", "in-home chef",
        "chef for hire", "hire a chef", "chef service", "chef services",
        "private dining", "in-villa chef", "villa chef", "yacht chef",
        "vacation chef", "holiday chef", "event chef",
        # Catering related
        "catering", "caterer", "catering service", "catering company",
        "private catering", "event catering", "wedding catering",
        "corporate catering", "party catering", "dinner party catering",
        "intimate catering", "small event catering", "luxury catering",
        # Specific cuisine
        "private sushi chef", "sushi catering", "japanese chef",
        "italian chef", "french chef", "peruvian chef", "colombian chef",
        "seafood chef", "paella chef", "bbq catering", "asado chef",
        # Spanish terms - ALL variations
        "chef privado", "chef a domicilio", "chef particular",
        "cocinero privado", "cocinero a domicilio",
        "servicio de chef", "chef para eventos", "chef para fiestas",
        "chef en casa", "chef en villa", "chef en yate",
        "catering", "servicio de catering", "banquetes",
        "servicio de banquetes", "chef para bodas",
        "chef ejecutivo", "chef profesional",
        "comida a domicilio gourmet", "cena privada",
        "experiencia gastronómica", "experiencia culinaria",
        "menu degustacion", "menú degustación",
        "chef cartagena", "chef privado cartagena",
        "chef medellin", "chef privado medellín",
        # Cooking classes
        "cooking class", "cooking classes", "culinary class",
        "clase de cocina", "clases de cocina", "taller de cocina",
        "cooking experience", "experiencia de cocina",
    ],
    
    # ═══════════════════════════════════════════════════════════════════
    # DJs - EXHAUSTIVE (50+ terms)
    # ═══════════════════════════════════════════════════════════════════
    "dj": [
        # Core English terms
        "dj", "disc jockey", "deejay", "professional dj", "event dj",
        "dj service", "dj services", "dj for hire", "hire a dj",
        "mobile dj", "party dj", "club dj",
        # Wedding specific
        "wedding dj", "wedding disc jockey", "reception dj",
        "ceremony dj", "cocktail hour dj", "dj for weddings",
        "matrimonio dj", "dj para bodas", "dj de bodas",
        # Event types
        "corporate dj", "corporate event dj", "conference dj",
        "birthday dj", "birthday party dj", "quinceañera dj",
        "quince dj", "sweet 16 dj", "graduation dj",
        "private party dj", "house party dj", "yacht party dj",
        "boat party dj", "pool party dj", "rooftop dj",
        # Genre specific
        "latin dj", "salsa dj", "reggaeton dj", "tropical dj",
        "electronic dj", "edm dj", "house dj", "techno dj",
        "hip hop dj", "top 40 dj", "open format dj",
        # Spanish terms - ALL variations
        "dj profesional", "disc jockey profesional",
        "dj para eventos", "dj para fiestas", "dj para quinceañeras",
        "dj para matrimonios", "dj para cumpleaños",
        "servicio de dj", "servicios de dj",
        "animador", "animador de fiestas", "animador de eventos",
        "musica para eventos", "música para eventos",
        "entretenimiento musical", "sonido para eventos",
        "dj cartagena", "dj medellin", "dj medellín", "dj bogota",
        # Equipment included
        "dj with sound system", "dj con sonido", "dj con luces",
        "dj and lighting", "dj y sonido", "sonido e iluminacion",
        # MC services
        "dj and mc", "dj mc", "emcee", "master of ceremonies",
        "maestro de ceremonias", "presentador de eventos",
    ],
    
    # ═══════════════════════════════════════════════════════════════════
    # EVENT PLANNERS - EXHAUSTIVE (50+ terms)
    # ═══════════════════════════════════════════════════════════════════
    "event_planner": [
        # Core English terms
        "event planner", "event planning", "event coordinator",
        "event organizer", "event management", "event producer",
        "event production", "event design", "event designer",
        "party planner", "party planning", "celebration planner",
        # Wedding specific
        "wedding planner", "wedding planning", "wedding coordinator",
        "destination wedding planner", "wedding designer",
        "bridal consultant", "wedding consultant",
        "day of coordinator", "full service wedding planner",
        # Corporate events
        "corporate event planner", "corporate events", "conference planner",
        "conference organizer", "meeting planner", "seminar organizer",
        "retreat planner", "team building planner", "gala planner",
        # Social events
        "birthday party planner", "anniversary planner",
        "quinceañera planner", "quince planner", "sweet 16 planner",
        "baby shower planner", "bridal shower planner",
        "engagement party planner", "graduation party planner",
        # Spanish terms - ALL variations
        "organizador de eventos", "organizadora de eventos",
        "planificador de eventos", "planificadora de eventos",
        "coordinador de eventos", "coordinadora de eventos",
        "productor de eventos", "productora de eventos",
        "wedding planner", "planeador de bodas", "planificador de bodas",
        "organizador de bodas", "coordinador de bodas",
        "bodas destino", "destination wedding", "boda destino",
        "eventos sociales", "eventos corporativos", "eventos empresariales",
        "organizacion de fiestas", "organización de fiestas",
        "decoracion de eventos", "decoración de eventos",
        "ambientacion", "ambientación", "montaje de eventos",
        "logistica de eventos", "logística de eventos",
        # Decoration/design
        "event decorator", "event decoration", "party decorator",
        "wedding decorator", "floral design", "floral designer",
        "florist events", "florista eventos", "arreglos florales",
        "balloon decorator", "decoracion con globos",
        # Destination specific
        "cartagena wedding planner", "cartagena event planner",
        "medellin wedding planner", "bogota wedding planner",
        "colombia destination wedding", "beach wedding planner",
    ],
    
    # ═══════════════════════════════════════════════════════════════════
    # HOTELS - EXHAUSTIVE (60+ terms)
    # ═══════════════════════════════════════════════════════════════════
    "hotel": [
        # Core English terms
        "hotel", "boutique hotel", "luxury hotel", "resort", "hostel",
        "bed and breakfast", "b&b", "inn", "lodge", "guest house", "guesthouse",
        "accommodation", "lodging", "suites", "hotel suites", "apart hotel",
        "aparthotel", "eco hotel", "eco lodge", "beach resort", "spa resort",
        "wellness resort", "all inclusive", "adults only hotel",
        # Spanish terms
        "hotel boutique", "hotel de lujo", "hospedaje", "alojamiento",
        "posada", "hosteria", "hostería", "finca hotel", "hacienda hotel",
        "casa hotel", "hotel colonial", "hotel histórico", "hotel centro histórico",
        # Location specific
        "beachfront hotel", "hotel frente al mar", "oceanfront hotel",
        "downtown hotel", "old town hotel", "walled city hotel",
        "airport hotel", "business hotel", "romantic hotel", "honeymoon hotel",
        # By star rating
        "5 star hotel", "hotel 5 estrellas", "4 star hotel", "hotel 4 estrellas",
        "luxury accommodation", "premium hotel", "exclusive hotel",
        # Colombia specific
        "hotel cartagena", "hotel centro historico cartagena",
        "hotel getsemani", "hotel bocagrande", "hotel ciudad amurallada",
        "hotel medellin", "hotel poblado", "hotel laureles",
        "hotel bogota", "hotel zona rosa", "hotel chapinero",
        "hotel santa marta", "hotel rodadero",
    ],
    
    # ═══════════════════════════════════════════════════════════════════
    # BOAT CHARTERS - EXHAUSTIVE (40+ terms)
    # ═══════════════════════════════════════════════════════════════════
    "boat_charter": [
        "boat charter", "yacht charter", "boat rental", "yacht rental",
        "catamaran charter", "catamaran rental", "sailboat charter",
        "sailing charter", "private boat", "private yacht",
        "party boat", "boat party", "yacht party",
        "fishing charter", "deep sea fishing", "sport fishing",
        "sunset cruise", "island cruise", "day cruise",
        "boat tour", "yacht tour", "marine experience",
        "speedboat rental", "lancha", "alquiler de lancha",
        "alquiler de barco", "alquiler de yate", "renta de yate",
        "tour en barco", "paseo en yate", "fiesta en yate",
        "charter nautico", "náutico", "velero", "catamarán",
        "islas del rosario boat", "rosario islands boat",
        "playa blanca boat", "cholon boat", "baru boat",
        "cartagena boat charter", "cartagena yacht",
        "boat rental cartagena", "yacht cartagena",
    ],
    
    # ═══════════════════════════════════════════════════════════════════
    # CONCIERGE SERVICES (30+ terms)
    # ═══════════════════════════════════════════════════════════════════
    "concierge": [
        "concierge", "concierge service", "concierge services",
        "luxury concierge", "personal concierge", "travel concierge",
        "villa concierge", "hotel concierge", "lifestyle concierge",
        "vip services", "vip concierge", "executive concierge",
        "personal assistant", "lifestyle manager", "fixer",
        "trip planner", "vacation planner", "itinerary planner",
        "relocation services", "expat services",
        "servicio concierge", "conserje", "asistente personal",
        "servicios vip", "planificador de viajes",
        "gestion de estilo de vida", "asistencia de lujo",
        "cartagena concierge", "medellin concierge",
        "colombia concierge", "luxury travel planner",
    ],
    
    # ═══════════════════════════════════════════════════════════════════
    # VILLA RENTALS (30+ terms)
    # ═══════════════════════════════════════════════════════════════════
    "villa_rental": [
        "villa rental", "luxury villa", "private villa", "vacation rental",
        "holiday rental", "vacation home", "beach house", "beach villa",
        "oceanfront villa", "beachfront villa", "pool villa", "private pool villa",
        "mansion rental", "estate rental", "luxury home rental",
        "short term rental", "weekly rental", "corporate housing",
        "alquiler de villa", "villa de lujo", "casa de vacaciones",
        "alquiler vacacional", "casa en la playa", "casa frente al mar",
        "finca en alquiler", "casa campestre", "casa con piscina",
        "apartamento de lujo", "penthouse rental", "penthouse alquiler",
        "property management", "vacation property", "holiday home",
        "airbnb management", "vrbo management", "rental management",
        "cartagena villa", "medellin villa", "luxury villa cartagena",
    ],
    
    # ═══════════════════════════════════════════════════════════════════
    # TRANSPORTATION (30+ terms)
    # ═══════════════════════════════════════════════════════════════════
    "transportation": [
        "private driver", "chauffeur", "car service", "limo service",
        "limousine", "airport transfer", "airport transportation",
        "executive transportation", "corporate transportation",
        "wedding transportation", "event transportation",
        "luxury car rental", "exotic car rental", "sports car rental",
        "van rental", "sprinter rental", "party bus",
        "transporte privado", "chofer privado", "conductor privado",
        "traslado aeropuerto", "servicio de transporte",
        "alquiler de vehiculos", "renta de autos de lujo",
        "transporte ejecutivo", "transporte vip",
        "cartagena driver", "cartagena airport transfer",
        "medellin driver", "bogota driver",
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
