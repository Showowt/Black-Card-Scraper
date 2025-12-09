"""
ULTIMATE OUTREACH INTELLIGENCE SYSTEM
=====================================
The #1 outreach system. Period.

For each business:
1. Deep intelligence gathering (including Instagram)
2. Analyze EXACTLY what they need
3. Generate custom offer specific to THEIR situation
4. Create perfect copy-paste outreach

Output: Everything you need to send ONE message and close.
"""

import asyncio
import httpx
import re
import json
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from urllib.parse import quote

# ═══════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════

class InstagramProfile(BaseModel):
    """Discovered Instagram information."""
    handle: Optional[str] = None
    url: Optional[str] = None
    followers: Optional[str] = None
    bio: Optional[str] = None
    is_verified: bool = False
    discovery_source: str = "unknown"  # website, google, places_api, manual
    confidence: str = "low"  # low, medium, high


class BusinessIntelligence(BaseModel):
    """Deep intelligence on a single business."""
    # Identity
    business_name: str
    category: str
    city: str
    
    # Contact Discovery
    instagram: InstagramProfile = Field(default_factory=InstagramProfile)
    whatsapp: Optional[str] = None
    whatsapp_link: Optional[str] = None
    whatsapp_link_prefilled: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    google_maps_link: Optional[str] = None
    
    # Business Analysis
    rating: Optional[float] = None
    review_count: Optional[int] = None
    price_level: Optional[str] = None
    
    # AI Intelligence
    opportunity_score: int = 0
    
    # WHAT THEY NEED (Specific)
    primary_problem: str = ""  # The ONE biggest issue
    secondary_problems: list[str] = Field(default_factory=list)
    current_state: str = ""  # How they're operating now
    desired_state: str = ""  # Where they want to be
    
    # WHAT YOU SHOULD OFFER (Specific)
    recommended_solution: str = ""  # The ONE thing to pitch
    solution_details: list[str] = Field(default_factory=list)
    quick_win: str = ""  # What you can fix in week 1
    full_transformation: str = ""  # The 90-day outcome
    
    # WHY (Loss Quantification)
    monthly_loss_estimate: str = ""  # "$X,XXX/month"
    loss_breakdown: list[str] = Field(default_factory=list)
    competitor_advantage: str = ""  # What competitors have that they don't
    
    # PSYCHOLOGY HOOKS
    identity_statement: str = ""  # "You didn't start this to..."
    fear_trigger: str = ""  # What keeps them up at night
    desire_trigger: str = ""  # What they dream about
    urgency_angle: str = ""  # Why now
    
    # COPY-PASTE OUTREACH
    instagram_dm: str = ""
    whatsapp_message: str = ""
    email_subject: str = ""
    email_body: str = ""
    
    # FOLLOW-UPS
    followup_day3: str = ""
    followup_day7: str = ""
    followup_day14: str = ""
    
    # Metadata
    generated_at: str = ""
    confidence_level: str = "medium"  # low, medium, high


# ═══════════════════════════════════════════════════════════════════════════
# INSTAGRAM DISCOVERY
# ═══════════════════════════════════════════════════════════════════════════

async def discover_instagram(
    business_name: str,
    website: Optional[str] = None,
    city: str = "Cartagena",
    existing_social: Optional[str] = None,
) -> InstagramProfile:
    """
    Multi-source Instagram discovery.
    
    Sources (in order of reliability):
    1. Existing data (from Places API or scrape)
    2. Website scraping
    3. Google search
    """
    profile = InstagramProfile()
    
    # Source 1: Already have it
    if existing_social:
        handle = extract_ig_handle(existing_social)
        if handle:
            profile.handle = handle
            profile.url = f"https://instagram.com/{handle}"
            profile.discovery_source = "existing_data"
            profile.confidence = "high"
            profile.is_verified = True
            return profile
    
    # Source 2: Website scraping
    if website:
        try:
            handle = await scrape_website_for_instagram(website)
            if handle:
                profile.handle = handle
                profile.url = f"https://instagram.com/{handle}"
                profile.discovery_source = "website"
                profile.confidence = "high"
                profile.is_verified = True
                return profile
        except Exception:
            pass
    
    # Source 3: Google search (construct likely handle)
    likely_handles = generate_likely_handles(business_name, city)
    profile.handle = likely_handles[0] if likely_handles else None
    if profile.handle:
        profile.url = f"https://instagram.com/{profile.handle}"
        profile.discovery_source = "generated"
        profile.confidence = "low"
        profile.is_verified = False
    
    return profile


def extract_ig_handle(url_or_handle: str) -> Optional[str]:
    """Extract clean Instagram handle from URL or handle."""
    if not url_or_handle:
        return None
    
    # Already a handle
    if not "/" in url_or_handle and not "." in url_or_handle:
        return url_or_handle.replace("@", "").strip()
    
    # URL patterns
    patterns = [
        r'instagram\.com/([a-zA-Z0-9._]+)',
        r'instagr\.am/([a-zA-Z0-9._]+)',
        r'@([a-zA-Z0-9._]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url_or_handle)
        if match:
            handle = match.group(1)
            # Remove trailing slashes or query params
            handle = handle.split("/")[0].split("?")[0]
            return handle
    
    return None


async def scrape_website_for_instagram(url: str) -> Optional[str]:
    """Scrape website for Instagram link."""
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            response = await client.get(url)
            html = response.text
            
            # Look for Instagram URLs
            patterns = [
                r'href=["\']https?://(?:www\.)?instagram\.com/([a-zA-Z0-9._]+)["\']',
                r'instagram\.com/([a-zA-Z0-9._]+)',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, html)
                if match:
                    handle = match.group(1)
                    # Filter out generic pages
                    if handle not in ['p', 'reel', 'stories', 'explore', 'accounts']:
                        return handle
    except Exception:
        pass
    
    return None


def generate_likely_handles(business_name: str, city: str) -> list[str]:
    """Generate likely Instagram handles from business name."""
    # Clean name
    clean = business_name.lower()
    clean = re.sub(r'[^a-z0-9\s]', '', clean)
    words = clean.split()
    
    handles = []
    
    # Join all words
    if words:
        handles.append("".join(words))
        handles.append("_".join(words))
        handles.append(".".join(words))
        
        # With city
        handles.append(f"{''.join(words)}_{city.lower()}")
        handles.append(f"{''.join(words)}{city.lower()}")
        
        # First word only
        handles.append(words[0])
        handles.append(f"{words[0]}_{city.lower()}")
    
    return handles[:5]  # Return top 5 guesses


# ═══════════════════════════════════════════════════════════════════════════
# WHATSAPP LINK GENERATION
# ═══════════════════════════════════════════════════════════════════════════

def generate_whatsapp_link(phone: str, message: str = "") -> str:
    """Generate WhatsApp click-to-chat link with pre-filled message."""
    # Clean phone number
    clean = "".join(filter(str.isdigit, phone or ""))
    
    if not clean:
        return ""
    
    # Add Colombia code if missing
    if not clean.startswith("57"):
        clean = "57" + clean
    
    if message:
        return f"https://wa.me/{clean}?text={quote(message)}"
    return f"https://wa.me/{clean}"


def generate_maps_link(business_name: str, city: str) -> str:
    """Generate Google Maps search link."""
    query = f"{business_name} {city} Colombia"
    return f"https://www.google.com/maps/search/{quote(query)}"


# ═══════════════════════════════════════════════════════════════════════════
# OFFER INTELLIGENCE (What to pitch each business)
# ═══════════════════════════════════════════════════════════════════════════

OFFER_MATRIX = {
    "restaurant": {
        "signals": {
            "no_online_booking": {
                "problem": "No online reservation system - losing bookings to competitors with instant booking",
                "solution": "AI-powered booking bot that handles reservations 24/7 via WhatsApp",
                "quick_win": "Automated reservation confirmation + reminder system (reduces no-shows 40%)",
                "loss": "$2,000-4,000/month in no-shows and missed after-hours inquiries",
            },
            "low_review_response": {
                "problem": "Not responding to reviews - damaging reputation and losing future customers",
                "solution": "Automated review monitoring + AI-drafted responses",
                "quick_win": "Respond to last 20 unanswered reviews this week",
                "loss": "Each negative review without response costs ~30 future customers",
            },
            "no_whatsapp_automation": {
                "problem": "Manual WhatsApp responses - owner drowning in messages",
                "solution": "WhatsApp AI assistant that handles FAQs, bookings, and menu questions",
                "quick_win": "Auto-response for hours, location, menu - saves 2 hours/day",
                "loss": "15+ hours/week spent on repetitive WhatsApp messages",
            },
            "high_volume_low_efficiency": {
                "problem": "Popular but chaotic - can't scale without adding staff",
                "solution": "Full operational automation - bookings, confirmations, reviews, upsells",
                "quick_win": "Automated table management system",
                "loss": "$5,000-8,000/month in operational inefficiency",
            },
        },
        "default": {
            "problem": "Manual operations limiting growth and consuming owner's time",
            "solution": "AI-powered customer communication system",
            "quick_win": "Automated WhatsApp responses for common questions",
            "loss": "$2,000-3,000/month in missed opportunities and wasted time",
        },
    },
    "hotel": {
        "signals": {
            "high_ota_dependency": {
                "problem": "Paying 15-25% OTA commissions on most bookings",
                "solution": "Direct booking system with AI concierge to capture more direct reservations",
                "quick_win": "WhatsApp bot for inquiries that converts to direct bookings",
                "loss": "$3,000-8,000/month in OTA commissions that could be saved",
            },
            "slow_response": {
                "problem": "Slow response to guest inquiries - losing bookings to faster competitors",
                "solution": "24/7 AI concierge that responds instantly to all inquiries",
                "quick_win": "Instant auto-response with booking link",
                "loss": "Every hour of delay = 10% lower booking probability",
            },
            "no_upsell_system": {
                "problem": "Missing revenue from upsells - tours, transfers, dining",
                "solution": "Automated pre-arrival upsell sequence",
                "quick_win": "Pre-arrival email/WhatsApp offering airport transfer + experiences",
                "loss": "$1,500-3,000/month in missed ancillary revenue",
            },
        },
        "default": {
            "problem": "Guest communication bottleneck limiting direct bookings and satisfaction",
            "solution": "AI concierge system for 24/7 guest communication",
            "quick_win": "Automated pre-arrival information and upsell sequence",
            "loss": "$2,000-4,000/month in OTA fees and missed upsells",
        },
    },
    "tour_operator": {
        "signals": {
            "owner_on_tours": {
                "problem": "Can't respond to inquiries while leading tours - losing bookings",
                "solution": "AI booking assistant that handles inquiries and books tours automatically",
                "quick_win": "Instant inquiry response + availability checker",
                "loss": "$3,000-5,000/month in missed bookings while on tours",
            },
            "no_deposit_system": {
                "problem": "High no-show rate with no deposit requirement",
                "solution": "Automated booking with deposit collection",
                "quick_win": "Payment link integration with booking confirmation",
                "loss": "$1,500-2,500/month in no-shows",
            },
            "manual_coordination": {
                "problem": "Spending hours coordinating logistics via WhatsApp",
                "solution": "Automated guest communication with trip details, meeting points, reminders",
                "quick_win": "Automated trip reminder 24h before with all details",
                "loss": "10+ hours/week on repetitive coordination messages",
            },
        },
        "default": {
            "problem": "Can't scale because booking and coordination is manual",
            "solution": "AI booking and coordination system",
            "quick_win": "Automated trip confirmations and reminders",
            "loss": "$2,000-3,000/month in missed bookings and wasted time",
        },
    },
    "concierge": {
        "signals": {
            "no_client_database": {
                "problem": "Client preferences live in owner's head and WhatsApp history",
                "solution": "AI-powered client preference system that remembers everything",
                "quick_win": "Import all client history into searchable database",
                "loss": "Repeat clients treated like strangers - 30% lower retention",
            },
            "vendor_chaos": {
                "problem": "Coordinating multiple vendors manually for each event/stay",
                "solution": "Vendor coordination automation with task tracking",
                "quick_win": "Automated vendor confirmation and reminder system",
                "loss": "5-10 hours/week on vendor coordination alone",
            },
            "24_7_availability": {
                "problem": "Expected to be available 24/7 but can't clone yourself",
                "solution": "AI first-response system that handles routine requests",
                "quick_win": "After-hours auto-response with FAQ handling",
                "loss": "Burnout + missed inquiries during personal time",
            },
        },
        "default": {
            "problem": "Can't scale past current client load without burning out",
            "solution": "AI client management and coordination system",
            "quick_win": "Client preference database + automated vendor coordination",
            "loss": "$4,000-8,000/month in capacity constraints and inefficiency",
        },
    },
    "boat_charter": {
        "signals": {
            "missed_while_chartering": {
                "problem": "Missing inquiries while out on charters - huge lost revenue",
                "solution": "AI booking system that handles inquiries and quotes automatically",
                "quick_win": "Instant auto-response with availability and pricing",
                "loss": "$5,000-10,000/month in missed charter bookings",
            },
            "no_weather_system": {
                "problem": "Manual rescheduling chaos when weather changes",
                "solution": "Automated weather monitoring + rescheduling system",
                "quick_win": "Automated weather alerts and rebooking options",
                "loss": "8+ hours/month on weather-related rescheduling",
            },
        },
        "default": {
            "problem": "Can't respond fast enough while on the water",
            "solution": "AI booking and coordination system",
            "quick_win": "Instant response bot with pricing and availability",
            "loss": "$4,000-8,000/month in missed bookings",
        },
    },
    "villa_rental": {
        "signals": {
            "turnover_chaos": {
                "problem": "Turnover coordination is manual chaos",
                "solution": "Automated turnover management system",
                "quick_win": "Automated cleaning crew notifications and checklists",
                "loss": "2-4 hours per turnover in coordination time",
            },
            "guest_communication": {
                "problem": "Guests asking same questions constantly",
                "solution": "AI guest concierge with property-specific knowledge",
                "quick_win": "Automated check-in instructions and local guide",
                "loss": "Poor reviews from communication gaps",
            },
        },
        "default": {
            "problem": "Property management consuming too much time",
            "solution": "AI property management assistant",
            "quick_win": "Automated guest communication from booking to checkout",
            "loss": "$1,500-3,000/month in inefficiency per property",
        },
    },
}


def determine_offer(
    category: str,
    has_website: bool,
    has_booking_system: bool,
    review_count: int,
    rating: float,
    has_whatsapp: bool,
) -> dict:
    """Determine the best offer based on business signals."""
    
    category_offers = OFFER_MATRIX.get(category, OFFER_MATRIX.get("restaurant"))
    signals = category_offers.get("signals", {})
    
    # Detect signals
    detected_signal = None
    
    # No website = probably no online booking
    if not has_website:
        detected_signal = "no_online_booking"
    
    # High reviews but could be higher
    elif review_count and review_count > 50 and rating and rating < 4.5:
        detected_signal = "low_review_response"
    
    # Has WhatsApp but probably manual
    elif has_whatsapp:
        detected_signal = "no_whatsapp_automation"
    
    # High volume indicators
    elif review_count and review_count > 200:
        detected_signal = "high_volume_low_efficiency"
    
    # Get the matching offer or default
    if detected_signal and detected_signal in signals:
        return signals[detected_signal]
    
    return category_offers.get("default", {
        "problem": "Manual operations limiting growth",
        "solution": "AI automation system",
        "quick_win": "Automated customer communication",
        "loss": "$2,000-3,000/month",
    })


# ═══════════════════════════════════════════════════════════════════════════
# OUTREACH GENERATION
# ═══════════════════════════════════════════════════════════════════════════

def generate_instagram_dm(intel: BusinessIntelligence) -> str:
    """Generate perfect Instagram DM based on intelligence."""
    
    templates = [
        # Template 1: Observation + Question
        f"Hey! Noticed {intel.business_name} is doing great ({intel.review_count}+ reviews 🔥). Quick q - are you handling all those booking inquiries manually or do you have something automated? — Phil",
        
        # Template 2: Pain + Curiosity
        f"Quick question about {intel.business_name} - how are you handling WhatsApp inquiries when you're busy with customers? Most {intel.category}s I talk to say it's their biggest headache. — Phil McGill",
        
        # Template 3: Compliment + Hook
        f"Your spot looks incredible. Curious though - with that volume, how many booking requests do you think slip through when you can't respond fast enough? — Phil",
        
        # Template 4: Direct + Confident
        f"I'm Phil McGill - I help {intel.category}s in {intel.city} stop losing money to slow responses and no-shows. Saw {intel.business_name} and thought of a few things. Worth a quick chat?",
    ]
    
    # Choose based on what we know
    if intel.review_count and intel.review_count > 100:
        return templates[0]
    elif intel.primary_problem:
        return templates[1]
    else:
        return templates[2]


def generate_whatsapp_message(intel: BusinessIntelligence) -> str:
    """Generate perfect WhatsApp message based on intelligence."""
    
    return f"""Hola! Soy Phil McGill. Vi que {intel.business_name} tiene excelentes reseñas en Google.

Pregunta rápida: {intel.primary_problem.lower() if intel.primary_problem else '¿cómo manejan las consultas de WhatsApp cuando están ocupados?'}

Ayudo a {intel.category}s en {intel.city} a automatizar exactamente esto. {intel.quick_win if intel.quick_win else 'Resultados en la primera semana.'}

¿Vale la pena 15 minutos para mostrarte cómo funciona?

— Phil McGill"""


def generate_email(intel: BusinessIntelligence) -> tuple[str, str]:
    """Generate email subject and body."""
    
    subject = f"{intel.business_name} — vi algo que te está costando dinero"
    
    body = f"""Hola,

Soy Phil McGill. No voy a hacerte perder el tiempo.

Analicé {intel.business_name} y encontré algo:

{intel.primary_problem}

Los números:
{intel.monthly_loss_estimate} - eso es lo que probablemente estás perdiendo cada mes por esto.

{intel.loss_breakdown[0] if intel.loss_breakdown else 'Cada hora de demora en responder = clientes que se van con la competencia.'}

Lo que hago:
{intel.recommended_solution}

Resultado de la primera semana:
{intel.quick_win}

15 minutos. Te muestro exactamente qué arreglaría primero. Sin compromiso.

¿Jueves o viernes funciona mejor?

— Phil McGill
Automatización AI para Hospitalidad
{intel.city}, Colombia

P.S. {intel.urgency_angle if intel.urgency_angle else 'Solo trabajo con 3 negocios nuevos por mes. Después de eso, enero.'}"""

    return subject, body


def generate_followups(intel: BusinessIntelligence) -> tuple[str, str, str]:
    """Generate follow-up sequence."""
    
    day3 = f"""Hola, soy Phil McGill - seguimiento rápido sobre {intel.business_name}.

Encontré algo más: {intel.secondary_problems[0] if intel.secondary_problems else 'vi que tus competidores ya tienen sistemas automatizados para esto.'}

Sin pitch - solo pensé que querrías saberlo.

— Phil"""

    day7 = f"""Hola de nuevo - Phil McGill aquí.

Una cosa más sobre {intel.business_name}.

Acabo de terminar un proyecto con otro {intel.category} en {intel.city}. 

Resultado: {intel.full_transformation if intel.full_transformation else 'reducción del 40% en consultas perdidas en 30 días.'}

Me hizo pensar en ti - misma situación, misma solución disponible.

¿Todavía vale 15 minutos?

— Phil McGill"""

    day14 = f"""Última nota sobre esto - Phil McGill.

Me quedan 2 espacios este mes. Después de eso, es enero.

Las matemáticas son simples: {intel.monthly_loss_estimate} por mes significa que en 3 meses habrás perdido {intel.monthly_loss_estimate.replace('$', '$').replace('/month', '')} x 3.

Si {intel.business_name} sigue lidiando con {intel.primary_problem.lower()[:50] if intel.primary_problem else 'esto'} en 6 meses, sabes dónde encontrarme.

— Phil McGill
Automatización AI para Hospitalidad"""

    return day3, day7, day14


# ═══════════════════════════════════════════════════════════════════════════
# MAIN INTELLIGENCE GENERATOR
# ═══════════════════════════════════════════════════════════════════════════

async def generate_business_intelligence(
    business_name: str,
    category: str,
    city: str = "Cartagena",
    website: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    instagram: Optional[str] = None,
    rating: Optional[float] = None,
    review_count: Optional[int] = None,
    price_level: Optional[str] = None,
) -> BusinessIntelligence:
    """
    Generate complete business intelligence for one business.
    This is the MAIN function - produces everything needed for outreach.
    """
    
    # Initialize
    intel = BusinessIntelligence(
        business_name=business_name,
        category=category,
        city=city,
        rating=rating,
        review_count=review_count,
        price_level=price_level,
        website=website,
        email=email,
        phone=phone,
        generated_at=datetime.now().isoformat(),
    )
    
    # 1. Discover Instagram
    intel.instagram = await discover_instagram(
        business_name=business_name,
        website=website,
        city=city,
        existing_social=instagram,
    )
    
    # 2. Generate WhatsApp links
    if phone:
        intel.whatsapp = phone
        intel.whatsapp_link = generate_whatsapp_link(phone)
    
    # 3. Generate Maps link
    intel.google_maps_link = generate_maps_link(business_name, city)
    
    # 4. Determine what to offer
    offer = determine_offer(
        category=category,
        has_website=bool(website),
        has_booking_system=False,  # Would need to detect from website
        review_count=review_count or 0,
        rating=rating or 0,
        has_whatsapp=bool(phone),
    )
    
    intel.primary_problem = offer.get("problem", "")
    intel.recommended_solution = offer.get("solution", "")
    intel.quick_win = offer.get("quick_win", "")
    intel.monthly_loss_estimate = offer.get("loss", "$2,000-3,000/month")
    
    # 5. Generate psychology hooks
    intel.identity_statement = get_identity_statement(category)
    intel.fear_trigger = get_fear_trigger(category)
    intel.desire_trigger = get_desire_trigger(category)
    intel.urgency_angle = "Solo trabajo con 3 negocios nuevos por mes en Cartagena."
    
    # 6. Generate loss breakdown
    intel.loss_breakdown = generate_loss_breakdown(category, review_count, rating)
    
    # 7. Set transformation vision
    intel.full_transformation = get_transformation(category)
    
    # 8. Calculate opportunity score
    intel.opportunity_score = calculate_opportunity_score(
        has_website=bool(website),
        has_instagram=bool(intel.instagram.handle),
        has_phone=bool(phone),
        review_count=review_count or 0,
        rating=rating or 0,
    )
    
    # 9. Generate all outreach copy
    intel.instagram_dm = generate_instagram_dm(intel)
    intel.whatsapp_message = generate_whatsapp_message(intel)
    intel.email_subject, intel.email_body = generate_email(intel)
    intel.followup_day3, intel.followup_day7, intel.followup_day14 = generate_followups(intel)
    
    # 10. Pre-fill WhatsApp with message
    if phone:
        intel.whatsapp_link_prefilled = generate_whatsapp_link(phone, intel.whatsapp_message)
    
    return intel


def get_identity_statement(category: str) -> str:
    """Get identity statement by category."""
    statements = {
        "restaurant": "No abriste un restaurante para ser recepcionista de tiempo completo.",
        "hotel": "No construiste un hotel para ser servicio de atención 24/7.",
        "tour_operator": "No empezaste esto para estar enterrado en WhatsApp todo el día.",
        "concierge": "No creaste esto para ser una central de mensajes a las 3am.",
        "boat_charter": "No compraste barcos para estar encadenado al teléfono en el muelle.",
        "villa_rental": "No compraste estas propiedades para tener otro trabajo de tiempo completo.",
        "club": "No entraste en la vida nocturna para ser una línea de reservas.",
        "spa": "No abriste un spa para pasar el día respondiendo mensajes.",
    }
    return statements.get(category, "No empezaste este negocio para ahogarte en operaciones manuales.")


def get_fear_trigger(category: str) -> str:
    """Get fear trigger by category."""
    fears = {
        "restaurant": "Cada mensaje de WhatsApp sin responder es un cliente yéndose con la competencia.",
        "hotel": "Cada hora de demora reduce la probabilidad de reserva en un 10%.",
        "tour_operator": "Mientras estás en un tour, estás perdiendo el próximo booking.",
        "concierge": "Un error de coordinación en un evento de $30,000 puede destruir tu reputación.",
        "boat_charter": "Una consulta de $5,000 que no respondiste en 2 horas ya reservó con otro.",
        "villa_rental": "Una mala reseña por mala comunicación cuesta 10% menos reservas.",
    }
    return fears.get(category, "Cada día sin sistema es dinero que sale por la puerta.")


def get_desire_trigger(category: str) -> str:
    """Get desire trigger by category."""
    desires = {
        "restaurant": "Imagina un sábado lleno y no tuviste que responder ni un WhatsApp de reserva.",
        "hotel": "Imagina que el 40% de tus reservas sean directas, sin comisiones de OTA.",
        "tour_operator": "Imagina liderar tours mientras tu sistema maneja las reservas automáticamente.",
        "concierge": "Imagina anticipar las necesidades del cliente antes de que pregunten.",
        "boat_charter": "Imagina estar en el agua mientras tu calendario se llena solo.",
        "villa_rental": "Imagina ingresos pasivos reales - no otro trabajo de tiempo completo.",
    }
    return desires.get(category, "Imagina un negocio que funciona mientras duermes.")


def get_transformation(category: str) -> str:
    """Get 90-day transformation by category."""
    transformations = {
        "restaurant": "En 90 días: sistema de reservas automático, cero no-shows, reseñas respondidas, 10+ horas/semana recuperadas.",
        "hotel": "En 90 días: 30% más reservas directas, respuesta instantánea 24/7, upsells automatizados.",
        "tour_operator": "En 90 días: booking automático, coordinación sin esfuerzo, capacidad de escalar sin contratar.",
        "concierge": "En 90 días: base de datos de clientes completa, coordinación de vendors automática, capacidad 2x.",
        "boat_charter": "En 90 días: cotizaciones instantáneas, reservas automáticas, barcos al 90% de capacidad.",
        "villa_rental": "En 90 días: comunicación de huéspedes automatizada, turnovers sin caos, reseñas 5 estrellas.",
    }
    return transformations.get(category, "En 90 días: operación completamente diferente.")


def generate_loss_breakdown(category: str, review_count: Optional[int], rating: Optional[float]) -> list[str]:
    """Generate specific loss breakdown."""
    losses = []
    
    if category == "restaurant":
        losses.append("No-shows: ~15% de reservas × $50 promedio = $750/semana perdidos")
        losses.append("Consultas perdidas fuera de horario: ~5/noche × $40 = $200/noche")
        if review_count and review_count > 50:
            losses.append(f"Con {review_count} reseñas, cada respuesta tardía cuesta ~3 clientes futuros")
    
    elif category == "hotel":
        losses.append("Comisiones OTA: 18-25% de cada reserva = $150-400/booking")
        losses.append("Upsells perdidos: 30% de huéspedes comprarían extras si se les ofreciera")
        losses.append("Respuesta lenta: cada hora = 10% menos probabilidad de booking")
    
    elif category == "tour_operator":
        losses.append("Consultas perdidas durante tours: ~3/día × $100 × 40% = $120/día")
        losses.append("No-shows sin depósito: ~2/semana × $150 = $1,200/mes")
    
    elif category == "concierge":
        losses.append("Clientes perdidos por respuesta lenta: $5,000-10,000/mes en riesgo")
        losses.append("Tiempo en coordinación manual: 10+ horas/semana = $400-600/semana en valor")
        losses.append("Sin historial de cliente: 30% menos retención de clientes repetidos")
    
    elif category == "boat_charter":
        losses.append("Consultas perdidas en el agua: $3,000-5,000/mes en charters no reservados")
        losses.append("No-shows sin depósito: $4,000/mes promedio")
    
    return losses or ["Operaciones manuales consumen 15+ horas/semana del dueño"]


def calculate_opportunity_score(
    has_website: bool,
    has_instagram: bool,
    has_phone: bool,
    review_count: int,
    rating: float,
) -> int:
    """Calculate opportunity score 1-100."""
    score = 50  # Base score
    
    # Positive signals
    if has_phone:
        score += 15  # Can contact them
    if has_instagram:
        score += 10  # Can DM them
    if review_count > 50:
        score += 10  # Established business
    if review_count > 200:
        score += 5   # High volume = more to gain
    if rating and rating >= 4.0:
        score += 5   # Good business, worth helping
    
    # Opportunity signals (problems = opportunity)
    if not has_website:
        score += 5   # Probably no booking system
    if rating and rating < 4.5 and review_count > 30:
        score += 5   # Review issues = opportunity
    
    return min(100, max(1, score))


# ═══════════════════════════════════════════════════════════════════════════
# BATCH PROCESSING
# ═══════════════════════════════════════════════════════════════════════════

async def process_batch(businesses: list[dict]) -> list[BusinessIntelligence]:
    """Process multiple businesses and generate intelligence for each."""
    results = []
    
    for biz in businesses:
        intel = await generate_business_intelligence(
            business_name=biz.get("name", "Unknown"),
            category=biz.get("category", "restaurant"),
            city=biz.get("city", "Cartagena"),
            website=biz.get("website"),
            phone=biz.get("phone") or biz.get("contact", {}).get("phone"),
            email=biz.get("email") or biz.get("contact", {}).get("email"),
            instagram=biz.get("instagram") or biz.get("socials", {}).get("instagram"),
            rating=biz.get("rating"),
            review_count=biz.get("review_count"),
            price_level=biz.get("price_level"),
        )
        results.append(intel)
    
    return results


# ═══════════════════════════════════════════════════════════════════════════
# EXPORT FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def export_to_csv(results: list[BusinessIntelligence], filepath: str):
    """Export intelligence to CSV for easy use."""
    import csv
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Header
        writer.writerow([
            "Business", "Category", "Score", 
            "Instagram", "IG Link",
            "WhatsApp Link (Prefilled)", "Phone",
            "Problem", "Solution", "Loss/Month",
            "IG DM (Copy)", "WhatsApp (Copy)",
            "Email Subject", "Rating", "Reviews"
        ])
        
        for r in results:
            writer.writerow([
                r.business_name, r.category, r.opportunity_score,
                r.instagram.handle or "", r.instagram.url or "",
                r.whatsapp_link_prefilled or "", r.phone or "",
                r.primary_problem[:100] if r.primary_problem else "",
                r.recommended_solution[:100] if r.recommended_solution else "",
                r.monthly_loss_estimate,
                r.instagram_dm, r.whatsapp_message,
                r.email_subject, r.rating or "", r.review_count or ""
            ])


def export_to_html_dashboard(results: list[BusinessIntelligence], filepath: str):
    """Export to interactive HTML dashboard."""
    
    # Sort by score
    results = sorted(results, key=lambda x: x.opportunity_score, reverse=True)
    
    html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phil McGill — Ultimate Outreach System</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 40px 20px;
            border-bottom: 1px solid #333;
            margin-bottom: 30px;
        }
        .header h1 { 
            font-size: 2.5rem; 
            margin-bottom: 10px;
            background: linear-gradient(90deg, #00ff88, #00d4ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .header p { color: #888; font-size: 1.1rem; }
        
        .stats {
            display: flex;
            justify-content: center;
            gap: 60px;
            margin-top: 30px;
            flex-wrap: wrap;
        }
        .stat { text-align: center; }
        .stat-number { 
            font-size: 3rem; 
            font-weight: bold; 
            background: linear-gradient(90deg, #00ff88, #00d4ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .stat-label { color: #888; font-size: 0.9rem; margin-top: 5px; }
        
        .card {
            background: rgba(255,255,255,0.03);
            border: 1px solid #333;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            transition: all 0.3s ease;
        }
        .card:hover {
            border-color: #00ff88;
            transform: translateY(-2px);
        }
        .card.priority-high {
            border-color: #00ff88;
            background: rgba(0,255,136,0.05);
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 15px;
        }
        .business-name {
            font-size: 1.5rem;
            font-weight: 600;
        }
        .score {
            background: linear-gradient(90deg, #00ff88, #00d4ff);
            color: #000;
            padding: 8px 16px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 1.1rem;
        }
        .score.medium { background: #ffaa00; }
        .score.low { background: #666; color: #fff; }
        
        .meta {
            display: flex;
            gap: 20px;
            color: #888;
            font-size: 0.9rem;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .quick-links {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }
        .quick-link {
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .quick-link.instagram { 
            background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
            color: #fff;
        }
        .quick-link.whatsapp { background: #25d366; color: #fff; }
        .quick-link.maps { background: #4285f4; color: #fff; }
        .quick-link.website { background: #333; color: #fff; }
        .quick-link:hover { transform: scale(1.05); }
        
        .section {
            background: rgba(0,0,0,0.3);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
        }
        .section-title {
            font-size: 0.8rem;
            color: #00ff88;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .section-content {
            color: #ccc;
            line-height: 1.6;
        }
        
        .copy-area {
            background: #111;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 16px;
            margin-top: 12px;
            position: relative;
        }
        .copy-text {
            white-space: pre-wrap;
            font-size: 0.95rem;
            line-height: 1.6;
            color: #fff;
        }
        .copy-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #00ff88;
            color: #000;
            border: none;
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.8rem;
            font-weight: 600;
            transition: all 0.2s;
        }
        .copy-btn:hover { transform: scale(1.05); }
        .copy-btn.copied { background: #fff; }
        
        .tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }
        .tab {
            background: #222;
            border: 1px solid #333;
            color: #888;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        .tab:hover { border-color: #555; }
        .tab.active { 
            background: #00ff88; 
            color: #000; 
            border-color: #00ff88;
            font-weight: 600;
        }
        
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        .problem-box {
            background: rgba(255,0,0,0.1);
            border-left: 4px solid #ff4444;
            padding: 16px;
            border-radius: 0 8px 8px 0;
            margin-bottom: 16px;
        }
        .solution-box {
            background: rgba(0,255,136,0.1);
            border-left: 4px solid #00ff88;
            padding: 16px;
            border-radius: 0 8px 8px 0;
        }
        
        .loss-tag {
            display: inline-block;
            background: #ff4444;
            color: #fff;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-top: 10px;
        }
        
        @media (max-width: 768px) {
            .header h1 { font-size: 1.8rem; }
            .stats { gap: 30px; }
            .stat-number { font-size: 2rem; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Phil McGill — Ultimate Outreach System</h1>
        <p>Copy. Paste. Close.</p>
        <div class="stats">
            <div class="stat">
                <div class="stat-number">""" + str(len(results)) + """</div>
                <div class="stat-label">Businesses Ready</div>
            </div>
            <div class="stat">
                <div class="stat-number">""" + str(len([r for r in results if r.opportunity_score >= 80])) + """</div>
                <div class="stat-label">High Priority (80+)</div>
            </div>
            <div class="stat">
                <div class="stat-number">""" + str(len([r for r in results if r.instagram.handle])) + """</div>
                <div class="stat-label">Instagram Found</div>
            </div>
        </div>
    </div>
    
    <div id="cards">
"""
    
    for idx, r in enumerate(results):
        score_class = "" if r.opportunity_score >= 80 else "medium" if r.opportunity_score >= 60 else "low"
        priority_class = "priority-high" if r.opportunity_score >= 80 else ""
        
        ig_link = f'<a href="{r.instagram.url}" target="_blank" class="quick-link instagram">📸 Instagram</a>' if r.instagram.url else ''
        wa_link = f'<a href="{r.whatsapp_link_prefilled}" target="_blank" class="quick-link whatsapp">💬 WhatsApp</a>' if r.whatsapp_link_prefilled else ''
        web_link = f'<a href="{r.website}" target="_blank" class="quick-link website">🌐 Website</a>' if r.website else ''
        maps_link = f'<a href="{r.google_maps_link}" target="_blank" class="quick-link maps">📍 Maps</a>'
        
        html += f"""
        <div class="card {priority_class}">
            <div class="card-header">
                <div class="business-name">{r.business_name}</div>
                <div class="score {score_class}">{r.opportunity_score}</div>
            </div>
            
            <div class="meta">
                <span>📍 {r.city}</span>
                <span>🏷️ {r.category}</span>
                {"<span>⭐ " + str(r.rating) + " (" + str(r.review_count) + " reviews)</span>" if r.rating else ""}
                {"<span>📸 @" + r.instagram.handle + "</span>" if r.instagram.handle else "<span style='color:#ff4444'>❌ No Instagram found</span>"}
            </div>
            
            <div class="quick-links">
                {ig_link}
                {wa_link}
                {web_link}
                {maps_link}
            </div>
            
            <div class="problem-box">
                <strong>🔴 THEIR PROBLEM:</strong><br>
                {r.primary_problem}
                <div class="loss-tag">{r.monthly_loss_estimate}</div>
            </div>
            
            <div class="solution-box">
                <strong>✅ YOUR OFFER:</strong><br>
                {r.recommended_solution}<br><br>
                <strong>Quick Win (Week 1):</strong> {r.quick_win}
            </div>
            
            <div class="tabs">
                <button class="tab active" onclick="showTab({idx}, 'ig')">Instagram DM</button>
                <button class="tab" onclick="showTab({idx}, 'wa')">WhatsApp</button>
                <button class="tab" onclick="showTab({idx}, 'email')">Email</button>
                <button class="tab" onclick="showTab({idx}, 'followup')">Follow-ups</button>
            </div>
            
            <div id="tab-ig-{idx}" class="tab-content active">
                <div class="section">
                    <div class="section-title">
                        <span>Instagram DM — Copy & Send</span>
                    </div>
                    <div class="copy-area">
                        <button class="copy-btn" onclick="copyText(this, `{r.instagram_dm.replace('`', "'")}`)">Copy</button>
                        <div class="copy-text">{r.instagram_dm}</div>
                    </div>
                </div>
            </div>
            
            <div id="tab-wa-{idx}" class="tab-content">
                <div class="section">
                    <div class="section-title">WhatsApp Message — Copy & Send</div>
                    <div class="copy-area">
                        <button class="copy-btn" onclick="copyText(this, `{r.whatsapp_message.replace('`', "'")}`)">Copy</button>
                        <div class="copy-text">{r.whatsapp_message}</div>
                    </div>
                </div>
            </div>
            
            <div id="tab-email-{idx}" class="tab-content">
                <div class="section">
                    <div class="section-title">Email Subject</div>
                    <div class="copy-area">
                        <button class="copy-btn" onclick="copyText(this, `{r.email_subject.replace('`', "'")}`)">Copy</button>
                        <div class="copy-text">{r.email_subject}</div>
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">Email Body</div>
                    <div class="copy-area">
                        <button class="copy-btn" onclick="copyText(this, `{r.email_body.replace('`', "'")}`)">Copy</button>
                        <div class="copy-text">{r.email_body}</div>
                    </div>
                </div>
            </div>
            
            <div id="tab-followup-{idx}" class="tab-content">
                <div class="section">
                    <div class="section-title">Day 3 Follow-up</div>
                    <div class="copy-area">
                        <button class="copy-btn" onclick="copyText(this, `{r.followup_day3.replace('`', "'")}`)">Copy</button>
                        <div class="copy-text">{r.followup_day3}</div>
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">Day 7 Follow-up</div>
                    <div class="copy-area">
                        <button class="copy-btn" onclick="copyText(this, `{r.followup_day7.replace('`', "'")}`)">Copy</button>
                        <div class="copy-text">{r.followup_day7}</div>
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">Day 14 Follow-up</div>
                    <div class="copy-area">
                        <button class="copy-btn" onclick="copyText(this, `{r.followup_day14.replace('`', "'")}`)">Copy</button>
                        <div class="copy-text">{r.followup_day14}</div>
                    </div>
                </div>
            </div>
        </div>
"""
    
    html += """
    </div>
    
    <script>
        function copyText(btn, text) {
            navigator.clipboard.writeText(text).then(() => {
                btn.textContent = '✓ Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = 'Copy';
                    btn.classList.remove('copied');
                }, 2000);
            });
        }
        
        function showTab(cardIdx, tabName) {
            // Hide all tabs for this card
            document.querySelectorAll(`[id^="tab-"][id$="-${cardIdx}"]`).forEach(el => {
                el.classList.remove('active');
            });
            // Show selected
            document.getElementById(`tab-${tabName}-${cardIdx}`).classList.add('active');
            
            // Update buttons
            const card = document.querySelectorAll('.card')[cardIdx];
            card.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
        }
    </script>
</body>
</html>
"""
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    
    return filepath
