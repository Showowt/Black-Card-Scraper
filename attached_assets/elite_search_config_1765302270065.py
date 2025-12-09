"""
ELITE SEARCH CONFIGURATION
===========================
Exhaustive search terms for finding EVERY business in each category.
Includes Spanish, English, slang, and every possible variation.

The Google Places API is limited - it doesn't have types for photographers,
videographers, DJs, chefs, etc. So we MUST use text search with every
possible term someone might use.
"""

# ═══════════════════════════════════════════════════════════════════════════════
# ELITE SEARCH TERMS BY CATEGORY
# Each category has multiple search queries that will be run separately
# ═══════════════════════════════════════════════════════════════════════════════

ELITE_SEARCH_TERMS = {
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHOTOGRAPHERS
    # ═══════════════════════════════════════════════════════════════════════════
    "photographer": [
        # Wedding - Spanish
        "fotografo bodas",
        "fotógrafo de bodas",
        "fotografo matrimonio",
        "fotografia bodas",
        "fotografía de bodas",
        "fotos de boda",
        "fotografo nupcial",
        
        # Wedding - English
        "wedding photographer",
        "wedding photography",
        "destination wedding photographer",
        "elopement photographer",
        "engagement photographer",
        
        # Events - Spanish
        "fotografo eventos",
        "fotógrafo de eventos",
        "fotografo profesional",
        "fotógrafo profesional",
        "fotografo fiestas",
        "fotografo corporativo",
        "fotografo empresarial",
        
        # Events - English
        "event photographer",
        "event photography",
        "corporate photographer",
        "party photographer",
        
        # Studio/Portrait - Spanish
        "estudio fotografico",
        "estudio fotográfico",
        "foto estudio",
        "fotografo retratos",
        "sesion de fotos",
        "sesión de fotos",
        "book fotografico",
        "fotografo familiar",
        
        # Studio/Portrait - English
        "photo studio",
        "photography studio",
        "portrait photographer",
        "family photographer",
        
        # Specialty - Spanish
        "fotografo producto",
        "fotografo comida",
        "fotografo gastronomico",
        "fotografo inmobiliario",
        "fotografo arquitectura",
        "fotografo drone",
        "fotografia aerea",
        "fotografo moda",
        "fotografo quince años",
        "fotografo quinceañera",
        
        # Specialty - English
        "food photographer",
        "real estate photographer",
        "drone photographer",
        "aerial photography",
        "fashion photographer",
        "commercial photographer",
        
        # Generic catches
        "fotografo",
        "fotógrafo",
        "fotografía",
        "photography",
        "photographer",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # VIDEOGRAPHERS
    # ═══════════════════════════════════════════════════════════════════════════
    "videographer": [
        # Wedding - Spanish
        "videografo bodas",
        "videógrafo de bodas",
        "video bodas",
        "video de bodas",
        "video matrimonio",
        "filmacion bodas",
        "filmación de bodas",
        "cinematografia bodas",
        "pelicula de boda",
        
        # Wedding - English
        "wedding videographer",
        "wedding videography",
        "wedding filmmaker",
        "wedding cinematographer",
        "wedding film",
        "destination wedding videographer",
        
        # Events - Spanish
        "videografo eventos",
        "videógrafo de eventos",
        "video eventos",
        "filmacion eventos",
        "video corporativo",
        "video empresarial",
        "video institucional",
        "video promocional",
        
        # Events - English
        "event videographer",
        "event videography",
        "corporate video",
        "commercial video",
        "promotional video",
        
        # Production - Spanish
        "productora audiovisual",
        "productora de video",
        "produccion de video",
        "producción de video",
        "casa productora",
        "camarografo",
        "camarógrafo",
        
        # Production - English
        "video production",
        "film production",
        "video producer",
        "filmmaker",
        "cinematographer",
        
        # Drone - Spanish
        "video drone",
        "video dron",
        "filmacion aerea",
        "video aereo",
        
        # Drone - English
        "drone videographer",
        "aerial videographer",
        "drone video",
        
        # Generic catches
        "videografo",
        "videógrafo",
        "videography",
        "videographer",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # DJs & MUSIC
    # ═══════════════════════════════════════════════════════════════════════════
    "dj": [
        # Wedding - Spanish
        "dj bodas",
        "dj de bodas",
        "dj para bodas",
        "dj matrimonio",
        "musica bodas",
        "música para bodas",
        "sonido bodas",
        
        # Wedding - English
        "wedding dj",
        "wedding music",
        "destination wedding dj",
        "beach wedding dj",
        
        # Events - Spanish
        "dj eventos",
        "dj de eventos",
        "dj para eventos",
        "dj fiestas",
        "dj para fiestas",
        "dj privado",
        "dj corporativo",
        "dj empresarial",
        "dj cumpleaños",
        "dj quince años",
        "dj quinceañera",
        
        # Events - English
        "event dj",
        "party dj",
        "corporate dj",
        "private event dj",
        "birthday party dj",
        
        # Boat/Pool - Spanish
        "dj yate",
        "dj barco",
        "dj pool party",
        "dj fiesta piscina",
        "dj despedida soltera",
        "dj despedida soltero",
        
        # Boat/Pool - English
        "yacht dj",
        "boat party dj",
        "pool party dj",
        "bachelor party dj",
        "bachelorette party dj",
        
        # Sound/Equipment - Spanish
        "sonido eventos",
        "sonido para eventos",
        "sonido fiestas",
        "alquiler sonido",
        "alquiler de sonido",
        "disco movil",
        "discoteca movil",
        "audio eventos",
        "iluminacion eventos",
        "alquiler luces",
        
        # Sound/Equipment - English
        "sound system rental",
        "audio equipment rental",
        "event lighting",
        "mobile disco",
        
        # Music services - Spanish
        "musica en vivo",
        "música en vivo",
        "musica para eventos",
        "animador fiestas",
        "animacion eventos",
        "entretenimiento eventos",
        "grupo musical",
        "banda para eventos",
        "mariachi",
        "vallenato",
        "orquesta",
        
        # Music services - English
        "live music",
        "live band",
        "musicians for hire",
        "entertainment services",
        
        # Generic catches
        "dj",
        "disc jockey",
        "deejay",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PRIVATE CHEFS & CATERING
    # ═══════════════════════════════════════════════════════════════════════════
    "chef": [
        # Private chef - Spanish
        "chef privado",
        "chef a domicilio",
        "chef en casa",
        "chef personal",
        "cocinero privado",
        "cocinero a domicilio",
        "servicio de chef",
        "chef para eventos",
        "chef para fiestas",
        
        # Private chef - English
        "private chef",
        "personal chef",
        "chef at home",
        "home chef",
        "hire a chef",
        "chef for hire",
        
        # Villa/Vacation - Spanish
        "chef para villa",
        "chef villa",
        "chef vacaciones",
        "chef airbnb",
        "chef finca",
        "chef yate",
        "chef barco",
        
        # Villa/Vacation - English
        "villa chef",
        "vacation chef",
        "yacht chef",
        "boat chef",
        
        # Catering - Spanish
        "catering",
        "servicio catering",
        "catering eventos",
        "catering bodas",
        "catering empresarial",
        "catering corporativo",
        "banquetes",
        "servicio banquetes",
        "banquetero",
        
        # Catering - English
        "catering service",
        "event catering",
        "wedding catering",
        "corporate catering",
        "party catering",
        
        # Specific experiences - Spanish
        "cena privada",
        "cenas privadas",
        "cena romantica",
        "cena romántica",
        "cena en casa",
        "experiencia gastronomica",
        "experiencia gastronómica",
        "degustacion",
        "menu degustacion",
        "cocina gourmet",
        "alta cocina",
        
        # Specific experiences - English
        "private dinner",
        "romantic dinner",
        "dining experience",
        "gourmet experience",
        "tasting menu",
        
        # Specialty - Spanish
        "parrillero",
        "asador privado",
        "bbq privado",
        "asado privado",
        "chef sushi",
        "sushi chef",
        "chef ceviche",
        "chef mariscos",
        "pastelero",
        "repostero",
        
        # Specialty - English
        "bbq chef",
        "grill master",
        "sushi chef",
        "pastry chef",
        
        # Generic catches
        "chef",
        "cocinero",
        "gastronomia",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # EVENT PLANNERS
    # ═══════════════════════════════════════════════════════════════════════════
    "event_planner": [
        # Wedding - Spanish
        "wedding planner",
        "organizador de bodas",
        "organizadora de bodas",
        "planificador de bodas",
        "planificadora de bodas",
        "coordinador de bodas",
        "coordinadora de bodas",
        "bodas destino",
        "bodas en la playa",
        "bodas cartagena",
        
        # Wedding - English
        "wedding planner",
        "wedding coordinator",
        "wedding organizer",
        "destination wedding planner",
        "beach wedding planner",
        "luxury wedding planner",
        "elopement planner",
        
        # Events - Spanish
        "organizador de eventos",
        "organizadora de eventos",
        "planificador de eventos",
        "planificadora de eventos",
        "coordinador de eventos",
        "eventos corporativos",
        "eventos empresariales",
        "produccion de eventos",
        "producción de eventos",
        "logistica eventos",
        
        # Events - English
        "event planner",
        "event coordinator",
        "event organizer",
        "event producer",
        "corporate event planner",
        "party planner",
        
        # Specific events - Spanish
        "fiestas tematicas",
        "fiestas temáticas",
        "fiesta sorpresa",
        "cumpleaños",
        "quince años",
        "quinceañera",
        "bautizo",
        "primera comunion",
        "baby shower",
        "despedida soltera",
        "despedida soltero",
        "aniversario",
        
        # Specific events - English
        "birthday party planner",
        "surprise party",
        "bachelor party planner",
        "bachelorette party planner",
        "anniversary party",
        "celebration planner",
        
        # Decor - Spanish
        "decoracion eventos",
        "decoración de eventos",
        "decoracion bodas",
        "decoración de bodas",
        "ambientacion eventos",
        "florista eventos",
        "flores bodas",
        "arreglos florales",
        
        # Decor - English
        "event decor",
        "wedding decor",
        "event design",
        "floral design",
        "event florist",
        
        # Generic catches
        "eventos",
        "event planning",
        "organizacion eventos",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BOAT CHARTERS & YACHTS
    # ═══════════════════════════════════════════════════════════════════════════
    "boat_charter": [
        # Yacht - Spanish
        "yate",
        "yates",
        "alquiler yate",
        "alquiler de yate",
        "renta yate",
        "renta de yate",
        "yate privado",
        "charter yate",
        "yate de lujo",
        "mega yate",
        "super yate",
        
        # Yacht - English
        "yacht",
        "yacht charter",
        "yacht rental",
        "luxury yacht",
        "private yacht",
        "mega yacht",
        "super yacht",
        
        # Boat general - Spanish
        "barco",
        "bote",
        "lancha",
        "alquiler barco",
        "alquiler de barco",
        "renta barco",
        "alquiler lancha",
        "alquiler de lancha",
        "paseo en barco",
        "paseo en lancha",
        "tour en barco",
        "tour en lancha",
        
        # Boat general - English
        "boat",
        "boat charter",
        "boat rental",
        "boat tour",
        "boat trip",
        "boat excursion",
        
        # Catamaran - Spanish
        "catamaran",
        "catamarán",
        "alquiler catamaran",
        "charter catamaran",
        "paseo catamaran",
        "tour catamaran",
        
        # Catamaran - English
        "catamaran",
        "catamaran charter",
        "catamaran rental",
        "catamaran tour",
        "sailing catamaran",
        
        # Sailboat - Spanish
        "velero",
        "alquiler velero",
        "charter velero",
        "paseo velero",
        "navegacion vela",
        
        # Sailboat - English
        "sailboat",
        "sailing",
        "sailboat charter",
        "sailing charter",
        "sailing tour",
        
        # Party boats - Spanish
        "fiesta en barco",
        "fiesta en yate",
        "party boat",
        "barco fiesta",
        "yate fiesta",
        "celebracion barco",
        "cumpleaños barco",
        "cumpleaños yate",
        "despedida soltera barco",
        "despedida soltero barco",
        "boda en barco",
        "boda en yate",
        
        # Party boats - English
        "party boat",
        "boat party",
        "yacht party",
        "celebration cruise",
        "birthday boat",
        "bachelor party boat",
        "bachelorette boat",
        "wedding yacht",
        "sunset cruise",
        
        # Fishing - Spanish
        "pesca deportiva",
        "pesca",
        "charter pesca",
        "barco pesca",
        "lancha pesca",
        "pesca mar adentro",
        "pesca profunda",
        "tour pesca",
        
        # Fishing - English
        "fishing charter",
        "fishing boat",
        "sport fishing",
        "deep sea fishing",
        "fishing tour",
        "fishing trip",
        
        # Specific destinations - Spanish
        "islas rosario",
        "islas del rosario",
        "isla baru",
        "playa blanca",
        "isla mucura",
        "isla grande",
        "cholon",
        "tour islas",
        "excursion islas",
        
        # Specific destinations - English
        "rosario islands",
        "baru island",
        "island tour",
        "island hopping",
        
        # Diving/Snorkel - Spanish
        "buceo",
        "snorkel",
        "tour snorkel",
        "excursion buceo",
        "barco buceo",
        
        # Diving/Snorkel - English
        "diving",
        "scuba diving",
        "snorkeling",
        "dive boat",
        "snorkel tour",
        
        # Jet ski/Water sports - Spanish
        "jet ski",
        "moto acuatica",
        "moto de agua",
        "deportes acuaticos",
        "deportes náuticos",
        "wakeboard",
        "ski acuatico",
        
        # Jet ski/Water sports - English
        "jet ski rental",
        "water sports",
        "watersports",
        "wakeboarding",
        "water skiing",
        
        # Marina - Spanish
        "marina",
        "puerto deportivo",
        "club nautico",
        "club náutico",
        
        # Marina - English
        "marina",
        "yacht club",
        "boat dock",
        
        # Generic catches
        "nautico",
        "náutico",
        "maritimo",
        "marítimo",
        "charter",
        "boat",
        "yacht",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # HOTELS - EXHAUSTIVE
    # ═══════════════════════════════════════════════════════════════════════════
    "hotel": [
        # Luxury - Spanish
        "hotel",
        "hotel boutique",
        "hotel de lujo",
        "hotel 5 estrellas",
        "hotel cinco estrellas",
        "hotel premium",
        "hotel exclusivo",
        
        # Luxury - English
        "boutique hotel",
        "luxury hotel",
        "5 star hotel",
        "five star hotel",
        "premium hotel",
        "exclusive hotel",
        
        # Types - Spanish
        "resort",
        "hotel spa",
        "hotel playa",
        "hotel frente al mar",
        "hotel piscina",
        "hotel centro historico",
        "hotel ciudad amurallada",
        "hotel colonial",
        "hotel romantico",
        "hotel adultos",
        "adults only",
        "all inclusive",
        "todo incluido",
        
        # Types - English
        "beach resort",
        "beach hotel",
        "beachfront hotel",
        "oceanfront hotel",
        "spa hotel",
        "spa resort",
        "historic hotel",
        "colonial hotel",
        "romantic hotel",
        "adults only hotel",
        "all inclusive resort",
        
        # Budget/Mid - Spanish
        "hostal",
        "hostal boutique",
        "hostel",
        "pension",
        "pensión",
        "posada",
        "hospedaje",
        "alojamiento",
        "habitacion",
        "habitación",
        
        # Budget/Mid - English
        "hostel",
        "guesthouse",
        "guest house",
        "bed and breakfast",
        "b&b",
        "inn",
        "lodge",
        "accommodation",
        
        # Apartments - Spanish
        "apart hotel",
        "apartahotel",
        "apartamento hotel",
        "suite hotel",
        "apartamento turistico",
        "apartamento vacacional",
        
        # Apartments - English
        "apart hotel",
        "serviced apartment",
        "hotel apartment",
        "suite hotel",
        
        # Eco/Special - Spanish
        "eco hotel",
        "hotel ecologico",
        "hotel sostenible",
        "glamping",
        "hotel naturaleza",
        "finca hotel",
        "hacienda hotel",
        
        # Eco/Special - English
        "eco hotel",
        "eco resort",
        "sustainable hotel",
        "glamping",
        "nature hotel",
        "hacienda hotel",
        
        # Location specific
        "hotel cartagena",
        "hotel getsemani",
        "hotel bocagrande",
        "hotel centro",
        "hotel walled city",
        
        # Generic
        "hoteles",
        "hotels",
        "alojamiento",
        "hospedaje",
        "donde dormir",
        "where to stay",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONCIERGE SERVICES
    # ═══════════════════════════════════════════════════════════════════════════
    "concierge": [
        # Concierge - Spanish
        "concierge",
        "servicio concierge",
        "conserje",
        "asistente personal",
        "asistente de viaje",
        "mayordomo",
        "butler",
        
        # Concierge - English
        "concierge service",
        "personal concierge",
        "luxury concierge",
        "travel concierge",
        "villa concierge",
        "private concierge",
        "butler service",
        
        # Fixer/Assistant - Spanish
        "fixer",
        "gestor",
        "tramitador",
        "asistente turistico",
        "guia personal",
        "guía personal",
        "acompañante turistico",
        
        # Fixer/Assistant - English
        "fixer",
        "local fixer",
        "travel assistant",
        "personal assistant",
        "local guide",
        "private guide",
        
        # Lifestyle - Spanish
        "lifestyle management",
        "gestion estilo de vida",
        "servicios vip",
        "servicios exclusivos",
        "servicios premium",
        "atencion personalizada",
        
        # Lifestyle - English
        "lifestyle management",
        "vip services",
        "exclusive services",
        "premium services",
        "personalized service",
        
        # Villa management - Spanish
        "administracion villa",
        "gestion villa",
        "property management",
        "gestion propiedades",
        
        # Villa management - English
        "villa management",
        "property management",
        "vacation rental management",
        
        # Travel planning - Spanish
        "planificacion viajes",
        "organizacion viajes",
        "itinerarios",
        "reservaciones",
        
        # Travel planning - English
        "travel planning",
        "trip planning",
        "itinerary planning",
        "reservation service",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TOUR OPERATORS
    # ═══════════════════════════════════════════════════════════════════════════
    "tour_operator": [
        # Tours - Spanish
        "tour",
        "tours",
        "tour operador",
        "operador turistico",
        "agencia de viajes",
        "agencia turistica",
        "excursion",
        "excursiones",
        "paseo",
        "paseos",
        "recorrido",
        "recorridos",
        
        # Tours - English
        "tour operator",
        "travel agency",
        "tour company",
        "excursion",
        "day trip",
        "guided tour",
        
        # City tours - Spanish
        "city tour",
        "tour ciudad",
        "tour historico",
        "tour histórico",
        "tour centro historico",
        "tour ciudad amurallada",
        "walking tour",
        "tour a pie",
        "tour nocturno",
        "tour gastronomico",
        "tour gastronómico",
        "tour comida",
        "food tour",
        
        # City tours - English
        "city tour",
        "historic tour",
        "walking tour",
        "night tour",
        "food tour",
        "culinary tour",
        
        # Adventure - Spanish
        "aventura",
        "turismo aventura",
        "ecoturismo",
        "senderismo",
        "trekking",
        "ciclismo",
        "bicicleta tour",
        
        # Adventure - English
        "adventure tour",
        "eco tour",
        "hiking tour",
        "bike tour",
        "cycling tour",
        
        # Cultural - Spanish
        "tour cultural",
        "experiencia cultural",
        "turismo cultural",
        "tour cafe",
        "tour cacao",
        "tour artesanias",
        
        # Cultural - English
        "cultural tour",
        "cultural experience",
        "coffee tour",
        "chocolate tour",
        "artisan tour",
        
        # Transport tours - Spanish
        "chiva",
        "chiva rumbera",
        "tour en chiva",
        "bus turistico",
        "transporte turistico",
        
        # Transport tours - English
        "party bus",
        "tourist bus",
        "hop on hop off",
        
        # Generic
        "turismo",
        "tourism",
        "turistico",
        "tourist",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TRANSPORTATION
    # ═══════════════════════════════════════════════════════════════════════════
    "transportation": [
        # Private driver - Spanish
        "conductor privado",
        "chofer privado",
        "chófer privado",
        "driver privado",
        "transporte privado",
        "transporte ejecutivo",
        "transporte vip",
        
        # Private driver - English
        "private driver",
        "private chauffeur",
        "personal driver",
        "executive transport",
        "vip transport",
        
        # Car rental - Spanish
        "alquiler carro",
        "alquiler de carro",
        "alquiler auto",
        "alquiler de auto",
        "renta carro",
        "renta de carro",
        "alquiler vehiculo",
        "rent a car",
        
        # Car rental - English
        "car rental",
        "rent a car",
        "vehicle rental",
        "car hire",
        
        # Luxury - Spanish
        "limusina",
        "limousine",
        "carro de lujo",
        "vehiculo de lujo",
        "transporte de lujo",
        "suv de lujo",
        "van de lujo",
        
        # Luxury - English
        "limousine",
        "limo service",
        "luxury car",
        "luxury vehicle",
        "luxury transport",
        "luxury suv",
        "luxury van",
        
        # Airport - Spanish
        "transfer aeropuerto",
        "traslado aeropuerto",
        "transporte aeropuerto",
        "shuttle aeropuerto",
        "recogida aeropuerto",
        
        # Airport - English
        "airport transfer",
        "airport shuttle",
        "airport pickup",
        "airport transportation",
        
        # Groups - Spanish
        "transporte grupos",
        "transporte grupal",
        "van para grupos",
        "bus privado",
        "minibus",
        
        # Groups - English
        "group transport",
        "van rental",
        "private bus",
        "minibus rental",
        
        # Generic
        "transporte",
        "transport",
        "traslados",
        "transfers",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # VILLA RENTALS
    # ═══════════════════════════════════════════════════════════════════════════
    "villa_rental": [
        # Villa - Spanish
        "villa",
        "villas",
        "villa de lujo",
        "villa privada",
        "villa exclusiva",
        "villa con piscina",
        "villa frente al mar",
        "villa playa",
        
        # Villa - English
        "luxury villa",
        "private villa",
        "exclusive villa",
        "villa with pool",
        "beachfront villa",
        "oceanfront villa",
        
        # House rental - Spanish
        "casa vacacional",
        "casa de vacaciones",
        "casa de playa",
        "casa frente al mar",
        "casa con piscina",
        "casa de lujo",
        "mansion",
        "mansión",
        "alquiler casa",
        "renta casa",
        
        # House rental - English
        "vacation home",
        "vacation rental",
        "beach house",
        "oceanfront home",
        "luxury home rental",
        "mansion rental",
        "house rental",
        
        # Apartments - Spanish
        "apartamento lujo",
        "apartamento de lujo",
        "penthouse",
        "atico",
        "ático",
        "apartamento vacacional",
        "apartamento turistico",
        "loft",
        
        # Apartments - English
        "luxury apartment",
        "penthouse rental",
        "vacation apartment",
        "holiday apartment",
        "loft rental",
        
        # Finca/Country - Spanish
        "finca",
        "finca de lujo",
        "finca vacacional",
        "casa campestre",
        "hacienda",
        "casa campo",
        
        # Finca/Country - English
        "country house",
        "farm stay",
        "hacienda rental",
        "estate rental",
        
        # Event venues - Spanish
        "casa para eventos",
        "casa para bodas",
        "villa para bodas",
        "villa para eventos",
        "finca para eventos",
        "finca para bodas",
        
        # Event venues - English
        "event villa",
        "wedding villa",
        "party house",
        "event venue",
        
        # Island - Spanish
        "isla privada",
        "casa isla",
        
        # Island - English
        "private island",
        "island rental",
        
        # Generic
        "alquiler vacacional",
        "vacation rental",
        "airbnb",
        "vrbo",
        "homeaway",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CLUBS & NIGHTLIFE
    # ═══════════════════════════════════════════════════════════════════════════
    "club": [
        # Clubs - Spanish
        "club",
        "discoteca",
        "disco",
        "club nocturno",
        "antro",
        "rumba",
        "fiesta",
        
        # Clubs - English
        "nightclub",
        "night club",
        "dance club",
        "club",
        
        # Beach/Pool clubs - Spanish
        "beach club",
        "club de playa",
        "pool club",
        "club piscina",
        "day club",
        
        # Beach/Pool clubs - English
        "beach club",
        "pool club",
        "day club",
        "cabana club",
        
        # Lounges - Spanish
        "lounge",
        "rooftop",
        "terraza",
        "bar lounge",
        "coctel bar",
        "cocktail bar",
        
        # Lounges - English
        "lounge",
        "rooftop bar",
        "rooftop lounge",
        "cocktail lounge",
        "sky bar",
        
        # Casino - Spanish
        "casino",
        
        # Casino - English
        "casino",
        
        # Generic
        "vida nocturna",
        "nightlife",
        "party",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SPA & WELLNESS
    # ═══════════════════════════════════════════════════════════════════════════
    "spa": [
        # Spa - Spanish
        "spa",
        "spa de lujo",
        "spa hotel",
        "day spa",
        "spa dia",
        "spa día",
        "centro de bienestar",
        "bienestar",
        "wellness",
        
        # Spa - English
        "spa",
        "luxury spa",
        "day spa",
        "wellness center",
        "wellness spa",
        
        # Treatments - Spanish
        "masajes",
        "masaje",
        "masaje relajante",
        "masaje terapeutico",
        "masaje deportivo",
        "tratamiento facial",
        "facial",
        "tratamiento corporal",
        "aromaterapia",
        "reflexologia",
        
        # Treatments - English
        "massage",
        "relaxation massage",
        "therapeutic massage",
        "facial treatment",
        "body treatment",
        "aromatherapy",
        "reflexology",
        
        # Beauty - Spanish
        "salon de belleza",
        "salón de belleza",
        "estetica",
        "estética",
        "centro estetico",
        "centro estético",
        "peluqueria",
        "peluquería",
        "manicure",
        "pedicure",
        "uñas",
        "maquillaje",
        
        # Beauty - English
        "beauty salon",
        "beauty spa",
        "nail salon",
        "hair salon",
        "makeup artist",
        
        # Wellness - Spanish
        "yoga",
        "meditacion",
        "meditación",
        "retiro bienestar",
        "retiro wellness",
        "detox",
        "ayurveda",
        
        # Wellness - English
        "yoga studio",
        "meditation",
        "wellness retreat",
        "detox retreat",
        
        # Medical - Spanish
        "spa medico",
        "spa médico",
        "medicina estetica",
        "medicina estética",
        "clinica estetica",
        "clínica estética",
        "botox",
        
        # Medical - English
        "medical spa",
        "med spa",
        "aesthetic clinic",
    ],
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RESTAURANTS
    # ═══════════════════════════════════════════════════════════════════════════
    "restaurant": [
        # Fine dining - Spanish
        "restaurante",
        "restaurante de lujo",
        "restaurante gourmet",
        "fine dining",
        "alta cocina",
        "cocina de autor",
        "restaurante exclusivo",
        
        # Fine dining - English
        "restaurant",
        "fine dining",
        "gourmet restaurant",
        "luxury restaurant",
        "upscale restaurant",
        
        # Types - Spanish
        "marisqueria",
        "marisquería",
        "cevicheria",
        "cevichería",
        "steakhouse",
        "parrilla",
        "asador",
        "comida italiana",
        "comida japonesa",
        "sushi",
        "comida peruana",
        "comida mexicana",
        "comida francesa",
        "comida mediterranea",
        "fusion",
        
        # Types - English
        "seafood restaurant",
        "steakhouse",
        "italian restaurant",
        "japanese restaurant",
        "sushi restaurant",
        "peruvian restaurant",
        "mexican restaurant",
        "french restaurant",
        "mediterranean restaurant",
        "fusion restaurant",
        
        # Casual - Spanish
        "bistro",
        "trattoria",
        "gastrobar",
        "gastropub",
        "tasca",
        "taberna",
        
        # Casual - English
        "bistro",
        "gastro pub",
        "tavern",
        
        # Setting - Spanish
        "restaurante playa",
        "restaurante terraza",
        "restaurante rooftop",
        "restaurante romantico",
        "restaurante romántico",
        "restaurante vista mar",
        
        # Setting - English
        "beach restaurant",
        "rooftop restaurant",
        "terrace restaurant",
        "romantic restaurant",
        "ocean view restaurant",
        
        # Generic
        "donde comer",
        "where to eat",
        "comida",
        "food",
        "dining",
    ],
}


# ═══════════════════════════════════════════════════════════════════════════════
# CITY COORDINATES FOR RADIUS SEARCH
# ═══════════════════════════════════════════════════════════════════════════════

CITY_COORDINATES = {
    "Cartagena": {
        "lat": 10.3910,
        "lng": -75.4794,
        "radius": 20000,  # 20km radius
        "neighborhoods": [
            {"name": "Centro Historico", "lat": 10.4236, "lng": -75.5498, "radius": 2000},
            {"name": "Getsemani", "lat": 10.4200, "lng": -75.5450, "radius": 1500},
            {"name": "Bocagrande", "lat": 10.3980, "lng": -75.5550, "radius": 3000},
            {"name": "Castillogrande", "lat": 10.3900, "lng": -75.5600, "radius": 2000},
            {"name": "Manga", "lat": 10.4100, "lng": -75.5400, "radius": 2000},
            {"name": "Laguito", "lat": 10.3950, "lng": -75.5650, "radius": 1500},
            {"name": "Crespo", "lat": 10.4450, "lng": -75.5100, "radius": 2000},
            {"name": "Marbella", "lat": 10.4350, "lng": -75.5200, "radius": 2000},
            {"name": "Baru", "lat": 10.2200, "lng": -75.5800, "radius": 5000},
            {"name": "Islas del Rosario", "lat": 10.1700, "lng": -75.7400, "radius": 8000},
        ]
    },
    "Medellín": {
        "lat": 6.2442,
        "lng": -75.5812,
        "radius": 25000,
        "neighborhoods": [
            {"name": "El Poblado", "lat": 6.2100, "lng": -75.5700, "radius": 4000},
            {"name": "Laureles", "lat": 6.2450, "lng": -75.5950, "radius": 3000},
            {"name": "Envigado", "lat": 6.1700, "lng": -75.5850, "radius": 4000},
            {"name": "Centro", "lat": 6.2500, "lng": -75.5650, "radius": 2000},
            {"name": "Sabaneta", "lat": 6.1500, "lng": -75.6150, "radius": 3000},
        ]
    },
    "Bogotá": {
        "lat": 4.7110,
        "lng": -74.0721,
        "radius": 30000,
        "neighborhoods": [
            {"name": "Zona T", "lat": 4.6650, "lng": -74.0550, "radius": 2000},
            {"name": "Zona G", "lat": 4.6550, "lng": -74.0600, "radius": 2000},
            {"name": "Usaquen", "lat": 4.6950, "lng": -74.0300, "radius": 3000},
            {"name": "Chapinero", "lat": 4.6450, "lng": -74.0650, "radius": 3000},
            {"name": "La Candelaria", "lat": 4.5950, "lng": -74.0750, "radius": 2000},
        ]
    },
    "Santa Marta": {
        "lat": 11.2408,
        "lng": -74.1990,
        "radius": 15000,
        "neighborhoods": [
            {"name": "Centro Historico", "lat": 11.2450, "lng": -74.2100, "radius": 2000},
            {"name": "Rodadero", "lat": 11.2050, "lng": -74.2250, "radius": 3000},
            {"name": "Taganga", "lat": 11.2650, "lng": -74.1900, "radius": 2000},
        ]
    },
    "Barranquilla": {
        "lat": 10.9639,
        "lng": -74.7964,
        "radius": 20000,
        "neighborhoods": [
            {"name": "Norte", "lat": 11.0050, "lng": -74.8100, "radius": 4000},
            {"name": "Centro", "lat": 10.9650, "lng": -74.7850, "radius": 3000},
        ]
    },
    "San Andres": {
        "lat": 12.5847,
        "lng": -81.7006,
        "radius": 10000,
        "neighborhoods": []
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# GOOGLE PLACES API TYPES (Limited - use text search for better coverage)
# ═══════════════════════════════════════════════════════════════════════════════

# These are the official Google Places API types - very limited for our needs
GOOGLE_PLACES_TYPES = {
    "restaurant": ["restaurant", "cafe", "bar", "bakery", "meal_takeaway"],
    "hotel": ["lodging", "hotel", "resort"],
    "club": ["night_club", "casino"],
    "spa": ["spa", "beauty_salon", "hair_care"],
    "gym": ["gym", "fitness_center"],
    "tour_operator": ["travel_agency", "tourist_attraction"],
    "transportation": ["car_rental", "taxi_stand", "transit_station"],
    "real_estate": ["real_estate_agency"],
    
    # These DON'T EXIST in Google Places API - MUST use text search:
    # - photographer (no type)
    # - videographer (no type)
    # - dj (no type)
    # - chef (no type)
    # - event_planner (no type)
    # - boat_charter (no type)
    # - villa_rental (no type)
    # - concierge (no type)
}


# Categories that REQUIRE text search (no Google Places type exists)
TEXT_SEARCH_ONLY_CATEGORIES = [
    "photographer",
    "videographer",
    "dj",
    "chef",
    "event_planner",
    "boat_charter",
    "villa_rental",
    "concierge",
]


# ═══════════════════════════════════════════════════════════════════════════════
# SEARCH CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

ELITE_SEARCH_CONFIG = {
    # How many search terms to use per category for elite scan
    "terms_per_category": 20,  # Use top 20 most effective terms
    
    # Delay between API calls to avoid rate limiting
    "delay_between_calls": 0.5,  # seconds
    
    # Maximum results per text search
    "max_results_per_search": 60,
    
    # Whether to search neighborhoods separately
    "search_neighborhoods": True,
    
    # Whether to deduplicate by place_id
    "deduplicate": True,
}
