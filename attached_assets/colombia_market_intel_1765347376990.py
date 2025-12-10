"""
COLOMBIA MARKET INTELLIGENCE ENGINE
=====================================
Phil McGill — MachineMind

Integrates:
- CONPES 4144 National AI Policy positioning
- Colombia-specific pain points & psychology
- Vertical ticket sizing
- Tech stack gap detection
- Government leverage angles
- Competitor awareness
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
# COLOMBIA MARKET STATISTICS (2025-2028)
# ═══════════════════════════════════════════════════════════════════════════════

COLOMBIA_STATS = {
    "tourism": {
        "visitors_2024": 6_200_000,
        "target_2026": 7_500_000,
        "growth_rate": "21%",
        "cartagena_occupancy": "75%",
        "top_cities": ["Bogotá", "Cartagena", "Medellín", "Santa Marta"],
    },
    "digital_behavior": {
        "whatsapp_purchase_rate": 0.66,  # 66% buy after WhatsApp chat
        "bogota_online_shopping": 0.73,  # 73% shop online
        "abandon_without_fast_response": 0.50,  # 50% abandon if slow response
        "no_web_presence_rate": 0.30,  # 25-35% have no website
    },
    "ai_adoption": {
        "fintech_ai_usage": 0.66,  # 66% of fintechs use AI
        "ai_cost_reduction": 0.44,  # 44% cost reduction
        "ai_speed_improvement": 0.56,  # 56% faster response
        "latam_ai_adoption_rank": 1,  # Tied for #1 in LATAM
    },
    "conpes_4144": {
        "approved_date": "February 14, 2025",
        "investment_cop": 479_273_000_000,  # COP
        "investment_usd": 110_000_000,  # ~$110M USD
        "target_year": 2030,
        "strategic_axes": 6,
        "concrete_actions": 106,
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# VERTICAL-SPECIFIC TICKET SIZES & PAIN POINTS
# ═══════════════════════════════════════════════════════════════════════════════

VERTICAL_TICKET_RANGES = {
    "restaurant": {
        "min_ticket": 500,
        "max_ticket": 3000,
        "avg_ticket": 1500,
        "missing_systems": [
            "QR menus",
            "Reservation automation",
            "Review funnels",
            "Upsell automation",
            "WhatsApp booking bot",
            "No-show deposit system",
        ],
        "monthly_loss_range": (2000, 15000),
        "implementation_days": 7,
    },
    "hotel": {
        "min_ticket": 1500,
        "max_ticket": 5000,
        "avg_ticket": 3000,
        "missing_systems": [
            "AI concierge",
            "OTA independence strategy",
            "Guest CRM",
            "Upsell automation",
            "Review management",
            "WhatsApp check-in/out",
            "Direct booking engine",
        ],
        "monthly_loss_range": (5000, 30000),
        "implementation_days": 14,
    },
    "tour_operator": {
        "min_ticket": 1000,
        "max_ticket": 3000,
        "avg_ticket": 1800,
        "missing_systems": [
            "Automated booking",
            "WhatsApp funnel",
            "Payment integration",
            "Follow-up sequences",
            "Review automation",
            "Availability calendar",
        ],
        "monthly_loss_range": (3000, 12000),
        "implementation_days": 10,
    },
    "club": {
        "min_ticket": 1000,
        "max_ticket": 4000,
        "avg_ticket": 2000,
        "missing_systems": [
            "Guest list automation",
            "Bottle service bot",
            "Dynamic pricing engine",
            "VIP reservation system",
            "Event promotion automation",
            "Table booking bot",
        ],
        "monthly_loss_range": (4000, 20000),
        "implementation_days": 10,
    },
    "boat_charter": {
        "min_ticket": 1500,
        "max_ticket": 10000,
        "avg_ticket": 4000,
        "missing_systems": [
            "Booking engine",
            "Payment automation",
            "Upsell automation",
            "Availability calendar",
            "WhatsApp inquiry bot",
            "Deposit collection",
            "Weather-based rebooking",
        ],
        "monthly_loss_range": (8000, 40000),
        "implementation_days": 14,
    },
    "spa": {
        "min_ticket": 500,
        "max_ticket": 2000,
        "avg_ticket": 1000,
        "missing_systems": [
            "Scheduling bot",
            "Appointment reminders",
            "Client CRM",
            "Upsell sequences",
            "Review automation",
            "Membership management",
        ],
        "monthly_loss_range": (1500, 8000),
        "implementation_days": 7,
    },
    "gym": {
        "min_ticket": 500,
        "max_ticket": 2000,
        "avg_ticket": 1000,
        "missing_systems": [
            "Online membership signup",
            "Class scheduling",
            "Referral bot",
            "Retention sequences",
            "Billing automation",
            "Check-in system",
        ],
        "monthly_loss_range": (1000, 5000),
        "implementation_days": 7,
    },
    "concierge": {
        "min_ticket": 2000,
        "max_ticket": 8000,
        "avg_ticket": 4000,
        "missing_systems": [
            "AI concierge bot",
            "Multi-vendor booking",
            "Client preference memory",
            "24/7 response system",
            "Itinerary builder",
            "Commission tracking",
        ],
        "monthly_loss_range": (10000, 50000),
        "implementation_days": 14,
    },
    "villa_rental": {
        "min_ticket": 2000,
        "max_ticket": 8000,
        "avg_ticket": 4000,
        "missing_systems": [
            "Direct booking engine",
            "OTA sync",
            "Guest communication bot",
            "Concierge integration",
            "Review automation",
            "Upsell services",
        ],
        "monthly_loss_range": (8000, 35000),
        "implementation_days": 14,
    },
    "photographer": {
        "min_ticket": 800,
        "max_ticket": 2500,
        "avg_ticket": 1500,
        "missing_systems": [
            "Booking calendar",
            "Quote automation",
            "Contract signing",
            "Payment collection",
            "Gallery delivery",
            "Review requests",
        ],
        "monthly_loss_range": (2000, 8000),
        "implementation_days": 7,
    },
    "videographer": {
        "min_ticket": 1000,
        "max_ticket": 3000,
        "avg_ticket": 1800,
        "missing_systems": [
            "Project inquiry bot",
            "Quote builder",
            "Contract automation",
            "Milestone payments",
            "Delivery system",
            "Testimonial requests",
        ],
        "monthly_loss_range": (2500, 10000),
        "implementation_days": 10,
    },
    "dj": {
        "min_ticket": 500,
        "max_ticket": 2000,
        "avg_ticket": 1000,
        "missing_systems": [
            "Booking calendar",
            "Quote automation",
            "Contract signing",
            "Deposit collection",
            "Song request system",
            "Review automation",
        ],
        "monthly_loss_range": (1500, 6000),
        "implementation_days": 5,
    },
    "chef": {
        "min_ticket": 800,
        "max_ticket": 3000,
        "avg_ticket": 1500,
        "missing_systems": [
            "Menu customization bot",
            "Quote builder",
            "Booking calendar",
            "Dietary preference tracking",
            "Payment automation",
            "Follow-up sequences",
        ],
        "monthly_loss_range": (2000, 10000),
        "implementation_days": 7,
    },
    "event_planner": {
        "min_ticket": 1500,
        "max_ticket": 5000,
        "avg_ticket": 2500,
        "missing_systems": [
            "Inquiry qualification bot",
            "Vendor coordination",
            "Client portal",
            "Timeline automation",
            "Payment milestones",
            "Review collection",
        ],
        "monthly_loss_range": (5000, 20000),
        "implementation_days": 14,
    },
    "transportation": {
        "min_ticket": 500,
        "max_ticket": 2000,
        "avg_ticket": 1000,
        "missing_systems": [
            "Booking automation",
            "WhatsApp dispatch",
            "Payment integration",
            "Driver assignment",
            "Rate calculator",
            "Review system",
        ],
        "monthly_loss_range": (1500, 8000),
        "implementation_days": 7,
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# COLOMBIA-SPECIFIC PSYCHOLOGY TRIGGERS
# ═══════════════════════════════════════════════════════════════════════════════

COLOMBIA_PSYCHOLOGY_TRIGGERS = {
    "freedom_triggers": [
        "No abriste este negocio para contestar WhatsApps a las 10pm. — Phil McGill",
        "You didn't open this place to answer WhatsApps at 10pm. — Phil McGill",
        "¿Cuántas noches has perdido respondiendo mensajes que un bot podría manejar? — Phil",
        "Tu tiempo vale más que responder '¿A qué hora abren?' 50 veces al día. — Phil McGill",
    ],
    "urgency_triggers": [
        "Cada día sin automatización es un día de dinero perdido. — Phil McGill",
        "Every day without automation is a day of money lost. — Phil McGill",
        "Mientras lees esto, 3 clientes potenciales se fueron con tu competencia porque no respondiste a tiempo. — Phil",
        "El 50% de los colombianos abandonan si no reciben respuesta rápida. ¿Cuántos perdiste hoy? — Phil McGill",
    ],
    "tourist_capture_triggers": [
        "La mayoría de turistas nunca regresan. ¿Los estás capturando la primera vez? — Phil McGill",
        "Most tourists never come back. Are you capturing them the first time? — Phil McGill",
        "6.2 millones de turistas visitaron Colombia el año pasado. ¿Cuántos se fueron sin conocerte? — Phil",
        "Un turista que no reserva en 24 horas, reserva con otro. ¿Tu sistema responde en 24 segundos? — Phil McGill",
    ],
    "competition_triggers": [
        "Tu competencia ya tiene esto. La pregunta es: ¿cuánto más vas a esperar? — Phil McGill",
        "El 66% de los colombianos compran después de chatear por WhatsApp. ¿Estás ahí cuando escriben? — Phil",
        "Los negocios con automatización cierran 3x más ventas. Los demás se preguntan por qué. — Phil McGill",
    ],
    "vision_triggers": [
        "Imagina vender todas tus mesas cada noche — automáticamente. — Phil McGill",
        "Imagine selling out your tables every night — automatically. — Phil McGill",
        "¿Qué diría tu huésped si le ofrecieras un concierge AI 24/7? — Phil",
        "What would your guest say if you offered 24/7 concierge AI? — Phil McGill",
        "En 6 meses, o tienes automatización o estás perdiendo contra los que sí la tienen. — Phil",
    ],
    "government_leverage_triggers": [
        "Colombia acaba de aprobar $110M USD para modernización AI (CONPES 4144). Los negocios que se muevan primero tendrán ventaja de 2 años. — Phil McGill",
        "El gobierno está empujando AI en turismo. ¿Vas a esperar a que tu competencia reciba los incentivos primero? — Phil",
        "CONPES 4144 significa que la automatización no es opcional — es el nuevo estándar. — Phil McGill",
    ],
}


# ═══════════════════════════════════════════════════════════════════════════════
# CONPES 4144 POSITIONING FRAMEWORK
# ═══════════════════════════════════════════════════════════════════════════════

CONPES_POSITIONING = {
    "credibility_statements": [
        "Nuestras soluciones están alineadas con la Política Nacional de AI de Colombia (CONPES 4144) — cumplimiento total, escalable, a prueba de futuro. — Phil McGill",
        "Our solutions align with Colombia's National AI Policy (CONPES 4144); compliant, scalable, future-proof. — Phil McGill",
    ],
    "urgency_statements": [
        "Colombia acaba de aprobar su Política Nacional de AI y destinó $110M USD para llevar automatización a negocios en todo el país. Si no actúas ahora, tu competidor lo hará — y tendrá un año de ventaja. — Phil McGill",
        "Colombia just approved its National AI Policy and allocated $110M to bring automation to businesses nationwide. If you don't act now, your competitor will—and they'll have a year head-start. — Phil McGill",
    ],
    "six_pillars": [
        "Ética y Gobernanza — regulación, transparencia, estándares éticos",
        "Datos e Infraestructura — construcción de infraestructura de datos",
        "I+D+i — financiamiento para investigación e innovación AI",
        "Talento Digital — capacitación y educación en AI",
        "Mitigación de Riesgos — marcos de uso responsable",
        "Adopción y Difusión — implementación en sector público y privado",
    ],
    "incentive_hook": [
        "Algunos negocios califican para apoyo gubernamental o co-financiamiento al integrar AI. Yo me encargo de la aplicación y la implementación. — Phil McGill",
        "Some businesses qualify for government-backed support when integrating AI. I handle the application AND implementation. — Phil McGill",
    ],
}


# ═══════════════════════════════════════════════════════════════════════════════
# TECH STACK GAP DETECTION SIGNALS
# ═══════════════════════════════════════════════════════════════════════════════

TECH_STACK_SIGNALS = {
    "has_booking_system": {
        "positive_signals": [
            "reserva", "booking", "book now", "reserve", "agendar",
            "calendly", "acuity", "simplybook", "booksy", "fresha",
            "opentable", "resy", "yelp reservations", "covermanager",
        ],
        "negative_signals": [
            "llámanos para reservar", "call to book", "whatsapp para reservar",
            "contacta para disponibilidad", "escríbenos",
        ],
    },
    "has_whatsapp_business": {
        "positive_signals": [
            "wa.me", "api.whatsapp", "whatsapp business", "whatsapp button",
            "chat widget", "zendesk", "intercom", "drift", "tidio",
        ],
        "negative_signals": [],
    },
    "has_online_payment": {
        "positive_signals": [
            "stripe", "paypal", "mercadopago", "pse", "nequi", "daviplata",
            "wompi", "payu", "epayco", "bold", "checkout", "pay now",
            "pagar ahora", "tarjeta de crédito", "credit card",
        ],
        "negative_signals": [
            "solo efectivo", "cash only", "pago en sitio", "pay on arrival",
            "transferencia bancaria únicamente",
        ],
    },
    "has_review_management": {
        "positive_signals": [
            "trustpilot", "yotpo", "reviews.io", "birdeye", "podium",
            "reputation.com", "google reviews widget",
        ],
        "negative_signals": [],
    },
    "is_mobile_optimized": {
        "positive_signals": [
            "viewport", "responsive", "mobile-friendly",
        ],
        "negative_signals": [
            "not mobile friendly", "desktop only",
        ],
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# COMPETITOR INTELLIGENCE
# ═══════════════════════════════════════════════════════════════════════════════

COLOMBIA_COMPETITORS = {
    "loggro_sas": {
        "name": "Loggro SAS",
        "type": "SaaS Platform",
        "focus": "POS, restaurant management, hotel management",
        "strength": "Already serves restaurants and hotels with basic tools",
        "weakness": "No AI, no WhatsApp automation, no psychology-driven sales",
        "threat_level": "medium",
    },
    "hatchworks_ai": {
        "name": "HatchWorks AI",
        "type": "AI Consulting",
        "focus": "Enterprise AI consulting",
        "strength": "Strong AI expertise, established brand",
        "weakness": "Enterprise focus, slow, expensive, not hospitality-specific",
        "threat_level": "low",
    },
    "ruta_n_startups": {
        "name": "Ruta N Backed Startups",
        "type": "Various",
        "focus": "Tech innovation in Medellín",
        "strength": "Government backing, funding access, ecosystem support",
        "weakness": "Generalist, not hospitality-focused, still scaling",
        "threat_level": "medium",
    },
    "generic_agencies": {
        "name": "Local Digital Agencies",
        "type": "Agency",
        "focus": "Websites, social media, basic marketing",
        "strength": "Local presence, relationships",
        "weakness": "No AI, slow delivery, no ROI focus, expensive",
        "threat_level": "low",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TechStackGaps:
    """Detected technology gaps for a business."""
    has_booking_system: bool = False
    has_whatsapp_business: bool = False
    has_online_payment: bool = False
    has_review_management: bool = False
    is_mobile_optimized: bool = False
    website_exists: bool = False
    gaps_detected: list = field(default_factory=list)
    gap_count: int = 0
    automation_readiness_score: int = 0  # 0-100


@dataclass
class ColombiaMarketIntel:
    """Complete Colombia market intelligence for a business."""
    category: str
    city: str
    
    # Ticket sizing
    min_ticket: float = 0
    max_ticket: float = 0
    recommended_ticket: float = 0
    
    # Pain points
    missing_systems: list = field(default_factory=list)
    monthly_loss_estimate: float = 0
    annual_loss_estimate: float = 0
    
    # Tech gaps
    tech_gaps: TechStackGaps = None
    
    # Psychology
    primary_triggers: list = field(default_factory=list)
    conpes_positioning: list = field(default_factory=list)
    
    # Competition
    local_competition_level: str = "medium"
    competitor_warnings: list = field(default_factory=list)
    
    # Implementation
    implementation_days: int = 7
    roi_timeframe_days: int = 30


# ═══════════════════════════════════════════════════════════════════════════════
# CORE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def detect_tech_stack_gaps(website_html: str, website_url: str = None) -> TechStackGaps:
    """
    Analyze website HTML to detect technology gaps.
    
    Returns a TechStackGaps object with detected missing systems.
    """
    if not website_html:
        return TechStackGaps(
            website_exists=False,
            gaps_detected=[
                "No website detected",
                "No booking system",
                "No WhatsApp integration",
                "No online payment",
                "No review management",
            ],
            gap_count=5,
            automation_readiness_score=0,
        )
    
    html_lower = website_html.lower()
    gaps = TechStackGaps(website_exists=True)
    gaps_list = []
    
    # Check booking system
    for signal in TECH_STACK_SIGNALS["has_booking_system"]["positive_signals"]:
        if signal.lower() in html_lower:
            gaps.has_booking_system = True
            break
    if not gaps.has_booking_system:
        gaps_list.append("No automated booking system")
    
    # Check WhatsApp Business
    for signal in TECH_STACK_SIGNALS["has_whatsapp_business"]["positive_signals"]:
        if signal.lower() in html_lower:
            gaps.has_whatsapp_business = True
            break
    if not gaps.has_whatsapp_business:
        gaps_list.append("No WhatsApp Business integration")
    
    # Check online payment
    for signal in TECH_STACK_SIGNALS["has_online_payment"]["positive_signals"]:
        if signal.lower() in html_lower:
            gaps.has_online_payment = True
            break
    if not gaps.has_online_payment:
        gaps_list.append("No online payment integration")
    
    # Check review management
    for signal in TECH_STACK_SIGNALS["has_review_management"]["positive_signals"]:
        if signal.lower() in html_lower:
            gaps.has_review_management = True
            break
    if not gaps.has_review_management:
        gaps_list.append("No review management system")
    
    # Check mobile optimization
    if "viewport" in html_lower and "width=device-width" in html_lower:
        gaps.is_mobile_optimized = True
    else:
        gaps_list.append("Website not mobile-optimized")
    
    gaps.gaps_detected = gaps_list
    gaps.gap_count = len(gaps_list)
    
    # Calculate automation readiness score
    checks = [
        gaps.has_booking_system,
        gaps.has_whatsapp_business,
        gaps.has_online_payment,
        gaps.has_review_management,
        gaps.is_mobile_optimized,
    ]
    gaps.automation_readiness_score = int((sum(checks) / len(checks)) * 100)
    
    return gaps


def generate_colombia_market_intel(
    category: str,
    city: str,
    website_html: str = None,
    rating: float = None,
    review_count: int = None,
) -> ColombiaMarketIntel:
    """
    Generate complete Colombia market intelligence for a business.
    
    Combines:
    - Vertical-specific ticket sizing
    - Tech stack gap detection
    - Colombia psychology triggers
    - CONPES 4144 positioning
    - Competition analysis
    """
    # Normalize category
    cat_key = category.lower().replace(" ", "_").replace("-", "_")
    
    # Get vertical data (default to restaurant if unknown)
    vertical = VERTICAL_TICKET_RANGES.get(cat_key, VERTICAL_TICKET_RANGES["restaurant"])
    
    # Calculate recommended ticket based on business size signals
    size_multiplier = 1.0
    if review_count:
        if review_count > 500:
            size_multiplier = 1.5
        elif review_count > 200:
            size_multiplier = 1.2
        elif review_count < 50:
            size_multiplier = 0.8
    
    recommended_ticket = vertical["avg_ticket"] * size_multiplier
    
    # Monthly loss estimate
    loss_min, loss_max = vertical["monthly_loss_range"]
    monthly_loss = (loss_min + loss_max) / 2 * size_multiplier
    
    # Detect tech gaps
    tech_gaps = detect_tech_stack_gaps(website_html)
    
    # Adjust loss based on gaps (more gaps = more loss)
    gap_multiplier = 1 + (tech_gaps.gap_count * 0.1)
    monthly_loss *= gap_multiplier
    
    # Select psychology triggers based on category and gaps
    triggers = []
    
    # Always include freedom trigger
    triggers.append(COLOMBIA_PSYCHOLOGY_TRIGGERS["freedom_triggers"][0])
    
    # Add urgency if many gaps
    if tech_gaps.gap_count >= 3:
        triggers.append(COLOMBIA_PSYCHOLOGY_TRIGGERS["urgency_triggers"][0])
    
    # Add tourist trigger for tourism-related categories
    tourism_cats = ["hotel", "tour_operator", "boat_charter", "concierge", "villa_rental", "transportation"]
    if cat_key in tourism_cats:
        triggers.append(COLOMBIA_PSYCHOLOGY_TRIGGERS["tourist_capture_triggers"][0])
    
    # Add competition trigger
    triggers.append(COLOMBIA_PSYCHOLOGY_TRIGGERS["competition_triggers"][0])
    
    # Add government leverage
    triggers.append(COLOMBIA_PSYCHOLOGY_TRIGGERS["government_leverage_triggers"][0])
    
    # CONPES positioning
    conpes = [
        CONPES_POSITIONING["credibility_statements"][0],
        CONPES_POSITIONING["urgency_statements"][0],
    ]
    
    # Competition analysis
    competitor_warnings = []
    if cat_key in ["restaurant", "hotel"]:
        competitor_warnings.append(
            f"⚠️ Loggro SAS ya ofrece herramientas básicas de POS/gestión para {category}s. "
            "Tu ventaja: AI + WhatsApp + velocidad + ROI demostrable."
        )
    
    return ColombiaMarketIntel(
        category=category,
        city=city,
        min_ticket=vertical["min_ticket"],
        max_ticket=vertical["max_ticket"],
        recommended_ticket=recommended_ticket,
        missing_systems=vertical["missing_systems"],
        monthly_loss_estimate=monthly_loss,
        annual_loss_estimate=monthly_loss * 12,
        tech_gaps=tech_gaps,
        primary_triggers=triggers,
        conpes_positioning=conpes,
        local_competition_level="medium" if cat_key in ["restaurant", "hotel"] else "low",
        competitor_warnings=competitor_warnings,
        implementation_days=vertical["implementation_days"],
        roi_timeframe_days=30,
    )


def generate_colombia_pitch(intel: ColombiaMarketIntel, business_name: str) -> str:
    """
    Generate a Colombia-specific pitch using market intelligence.
    """
    gaps_text = "\n".join([f"  ❌ {gap}" for gap in intel.tech_gaps.gaps_detected[:4]])
    systems_text = "\n".join([f"  ✓ {sys}" for sys in intel.missing_systems[:4]])
    
    pitch = f"""
Hola, soy Phil McGill.

Analicé {business_name} y encontré varias oportunidades de automatización.

📊 LO QUE FALTA:
{gaps_text}

💰 LO QUE ESTO TE ESTÁ COSTANDO:
${intel.monthly_loss_estimate:,.0f}/mes = ${intel.annual_loss_estimate:,.0f}/año

🚀 LO QUE PUEDO IMPLEMENTAR EN {intel.implementation_days} DÍAS:
{systems_text}

💡 DATO CLAVE:
{intel.primary_triggers[0]}

🏛️ CONTEXTO NACIONAL:
{intel.conpes_positioning[0]}

📦 INVERSIÓN: ${intel.min_ticket:,.0f} - ${intel.max_ticket:,.0f}
(ROI positivo en los primeros 30 días)

¿Vale 15 minutos para mostrarte exactamente cómo funciona?

— Phil McGill
Automatización AI para Hospitalidad
Colombia
"""
    return pitch.strip()


def get_whatsapp_stat_hook() -> str:
    """Get the WhatsApp purchase statistic hook."""
    return (
        "El 66% de los colombianos han comprado después de chatear con un negocio por WhatsApp. "
        "Si no estás ahí cuando escriben, están comprando en otro lado. — Phil McGill"
    )


def get_tourist_volume_hook(city: str = "Colombia") -> str:
    """Get tourist volume hook for urgency."""
    return (
        f"6.2 millones de turistas visitaron Colombia en 2024. "
        f"Para 2026, serán 7.5 millones. "
        f"¿Tu negocio está listo para capturar su parte? — Phil McGill"
    )


def get_abandon_rate_hook() -> str:
    """Get the abandon rate statistic hook."""
    return (
        "El 50% de los colombianos abandonan una compra si no reciben respuesta rápida. "
        "Con automatización, respondes en segundos, no en horas. — Phil McGill"
    )


def get_ai_adoption_hook() -> str:
    """Get AI adoption momentum hook."""
    return (
        "Colombia tiene la adopción de AI más alta de Latinoamérica. "
        "El 66% de las fintechs ya usan AI. Los negocios que no se adapten quedarán atrás. — Phil McGill"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# FUNDING & GOVERNMENT PATHWAY DATA
# ═══════════════════════════════════════════════════════════════════════════════

FUNDING_PATHWAYS = {
    "mintic": {
        "name": "MinTIC Digital Transformation Funds",
        "focus": ["AI adoption", "Digital tourism tools", "SME modernization"],
        "contact": "mintic.gov.co",
        "relevance": "HIGH - Direct alignment with your services",
    },
    "innpulsa": {
        "name": "INNpulsa Colombia",
        "focus": ["AI projects", "Data platforms", "Digital ecosystems", "High-impact innovation"],
        "contact": "innpulsacolombia.com",
        "relevance": "HIGH - Your platform qualifies as digital ecosystem",
    },
    "ruta_n": {
        "name": "Ruta N (Medellín)",
        "focus": ["4th Industrial Revolution AI Hub", "Tech ventures", "Global expansion"],
        "contact": "rutanmedellin.org",
        "relevance": "HIGH - Especially if you establish Medellín presence",
    },
    "mincit": {
        "name": "Ministry of Commerce, Industry & Tourism",
        "focus": ["Tourism digitalization", "Quality improvement", "SaaS tools for visitors"],
        "contact": "mincit.gov.co",
        "relevance": "HIGH - Tourism tech is priority sector",
    },
    "procolombia": {
        "name": "ProColombia",
        "focus": ["Export of services", "International positioning", "Tourism promotion"],
        "contact": "procolombia.co",
        "relevance": "MEDIUM - For international expansion",
    },
}


def get_funding_pitch() -> str:
    """Get funding pathway pitch for businesses."""
    return """
🏛️ OPCIONES DE FINANCIAMIENTO GUBERNAMENTAL

Algunos negocios califican para apoyo del gobierno al implementar AI:

1. MinTIC — Fondos de Transformación Digital
2. INNpulsa — Grants de Innovación  
3. Ministerio de Comercio — Digitalización Turística
4. Ruta N — Hub de AI (Medellín)

Yo me encargo de:
✓ Evaluar si calificas
✓ Preparar la aplicación
✓ Implementar la solución

Esto puede reducir tu inversión inicial hasta 50%.

— Phil McGill
"""
