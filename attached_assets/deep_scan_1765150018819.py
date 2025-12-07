"""
Business Deep Scan™ Engine.
Phil McGill's proprietary business analysis system.
Identifies pain points, revenue leakage, and AI opportunities.
"""
import json
from datetime import datetime
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_settings
from models import Business, BusinessCategory


# Phil's voice configuration
PHIL_VOICE = {
    "tone": "confident but calm, sharp, premium, high-value, strategic, no fluff",
    "positioning": "the premium quiet expert who already knows their business better than they do",
    "approach": "consultant with absolute confidence, not salesy",
}

# City-specific targeting priorities (from mission doc)
CITY_PRIORITIES = {
    "Cartagena": {
        "priority_verticals": ["restaurant", "club", "bar", "spa", "hotel", "tour_operator", "boat_charter"],
        "market_context": "Tourism-driven, high-spend visitors, WhatsApp-heavy communication, seasonal peaks",
        "decision_maker": "Usually owner-operator, values relationships, skeptical of tech unless shown ROI",
    },
    "Medellín": {
        "priority_verticals": ["restaurant", "gym", "spa", "coworking", "real_estate", "photographer"],
        "market_context": "Digital nomad hub, lifestyle businesses, younger owners, more tech-savvy",
        "decision_maker": "Often younger entrepreneurs, open to innovation, price-conscious but value quality",
    },
    "Bogotá": {
        "priority_verticals": ["real_estate", "restaurant", "hotel", "event_planner", "chef"],
        "market_context": "Corporate hub, larger businesses, formal sales cycles, higher budgets",
        "decision_maker": "Professional managers, need ROI proof, longer decision cycles",
    },
}

# Vertical-specific pain points and AI solutions (expanded from mission)
VERTICAL_DEEP_INTEL = {
    "restaurant": {
        "pain_points": [
            "WhatsApp reservation chaos - messages lost, double bookings, no confirmation system",
            "No-shows eating 15-20% of revenue with zero deposit collection",
            "Staff answering same questions 50x/day (hours, menu, location, parking)",
            "Google reviews piling up unanswered, killing SEO and trust",
            "Menu updates scattered across 5 platforms, always out of sync",
            "No customer database - regulars treated same as first-timers",
            "Peak hour phone overflow - missed reservations = missed revenue",
        ],
        "revenue_leakage": [
            "No-shows: $500-2000/month in lost covers",
            "Missed calls during rush: 10-20 lost reservations/week",
            "No upsell system: wine pairings, private dining, events",
            "Zero rebooking automation: customers forget to return",
            "Bad review responses: each unanswered review costs future customers",
        ],
        "ai_solutions": {
            "starter": [
                {"name": "WhatsApp Auto-Responder", "desc": "Instant replies to inquiries 24/7", "roi": "Capture 30% more inquiries"},
                {"name": "Google Review Bot", "desc": "Auto-respond to all reviews within 2 hours", "roi": "Improve rating by 0.3 stars"},
                {"name": "FAQ Chatbot", "desc": "Answer hours/menu/location instantly", "roi": "Save 2hrs staff time daily"},
            ],
            "core": [
                {"name": "Smart Reservation System", "desc": "WhatsApp booking with confirmations + reminders", "roi": "Cut no-shows by 60%"},
                {"name": "Deposit Collection Bot", "desc": "Automated payment links for large parties", "roi": "Eliminate no-show losses"},
                {"name": "Customer Memory System", "desc": "Track preferences, anniversaries, VIP status", "roi": "Increase repeat visits 25%"},
            ],
            "flagship": {
                "name": "AI Restaurant Command Center",
                "desc": "Unified inbox (WhatsApp, Instagram, calls) + reservation management + review automation + customer CRM",
                "roi": "Full operational automation - run front-of-house with 50% less staff overhead",
                "price_range": "$3,000-8,000 setup + $500/month",
            },
        },
        "owner_psychology": {
            "fears": ["Technology breaking during service", "Losing personal touch with guests", "Staff not adopting new systems"],
            "wants": ["More free time", "Consistent bookings", "Less phone chaos", "Higher revenue without more staff"],
            "objections": ["We're too small for this", "Our customers prefer personal service", "We tried tech before and it failed"],
            "leverage": "Show them their competitors are already automating. FOMO is real in hospitality.",
        },
    },
    "hotel": {
        "pain_points": [
            "Guest inquiries 24/7 across WhatsApp, email, OTAs - impossible to keep up",
            "OTA commissions eating 15-25% of every booking",
            "Upsell opportunities missed - tours, dining, spa, late checkout",
            "Check-in friction creates bad first impressions",
            "No pre-arrival communication = guests arrive confused",
            "Post-stay follow-up is manual or nonexistent",
            "Concierge requests pile up, response time kills satisfaction",
        ],
        "revenue_leakage": [
            "OTA dependency: $2,000-10,000/month in commissions on bookings you could own",
            "Missed upsells: Average guest spends 40% more with proper prompting",
            "No direct rebooking: Guests return via OTA, you pay commission again",
            "Slow inquiry response: Every hour delay = 10% booking drop",
        ],
        "ai_solutions": {
            "starter": [
                {"name": "WhatsApp Concierge Bot", "desc": "Answer guest questions 24/7", "roi": "90% faster response time"},
                {"name": "Pre-Arrival Sequence", "desc": "Automated welcome + upsell offers", "roi": "15% upsell conversion"},
                {"name": "Review Request Automation", "desc": "Timed ask for reviews post-checkout", "roi": "3x more reviews"},
            ],
            "core": [
                {"name": "Direct Booking Chatbot", "desc": "Website + WhatsApp booking without OTAs", "roi": "Save 15-25% per booking"},
                {"name": "AI Upsell Engine", "desc": "Personalized tour/dining/spa recommendations", "roi": "Increase ancillary revenue 30%"},
                {"name": "Guest Experience Automator", "desc": "Check-in instructions, WiFi, recommendations on autopilot", "roi": "Cut front desk load 40%"},
            ],
            "flagship": {
                "name": "AI Hotel Revenue System",
                "desc": "Full guest lifecycle automation - from inquiry to rebooking. Direct booking capture, dynamic upsells, reputation management, loyalty program.",
                "roi": "Shift 30% of bookings from OTA to direct. Increase RevPAR by 20%.",
                "price_range": "$5,000-15,000 setup + $800/month",
            },
        },
        "owner_psychology": {
            "fears": ["Losing the 'boutique' personal feel", "Technology errors embarrassing them with guests", "OTAs retaliating if they push direct"],
            "wants": ["Freedom from OTA dependency", "Higher margins", "Better reviews", "Less operational chaos"],
            "objections": ["Our guests expect human service", "We're too small for enterprise software", "OTAs bring us most of our business"],
            "leverage": "Calculate their exact OTA commission spend. Show them keeping even 20% of that = your fee paid 10x over.",
        },
    },
    "tour_operator": {
        "pain_points": [
            "Booking inquiries scattered across WhatsApp, Instagram, email - chaos",
            "Manual itinerary creation eating hours per booking",
            "No-shows and last-minute cancellations with no deposit system",
            "Availability management across multiple guides/boats is a nightmare",
            "Tourists asking same questions 100x (what to bring, pickup times, etc.)",
            "Payment collection fragmented - cash, transfer, card all separate",
            "No rebooking system - tourists do one tour and forget you exist",
        ],
        "revenue_leakage": [
            "Inquiry response delay: Tourists book whoever responds first",
            "No deposits: 20-30% no-show rate on group tours",
            "Manual follow-up: Zero rebooking of multi-day visitors",
            "Referral neglect: Happy tourists could bring 5 friends but you never ask",
        ],
        "ai_solutions": {
            "starter": [
                {"name": "Instant Quote Bot", "desc": "WhatsApp bot with tour options + pricing + availability", "roi": "Respond in 30 seconds vs 30 minutes"},
                {"name": "Booking Confirmation System", "desc": "Auto-confirm with details, what to bring, meeting point", "roi": "Cut pre-tour support 70%"},
                {"name": "Review Collector", "desc": "Automated post-tour review request with photo sharing", "roi": "5x review volume"},
            ],
            "core": [
                {"name": "Smart Booking + Deposit System", "desc": "WhatsApp booking flow with instant payment links", "roi": "Eliminate no-shows"},
                {"name": "Availability Calendar Bot", "desc": "Real-time availability across all tours/guides", "roi": "No more double bookings"},
                {"name": "Tourist Nurture Sequence", "desc": "Multi-day visitors get daily tour recommendations", "roi": "2x bookings per tourist"},
            ],
            "flagship": {
                "name": "AI Tour Operations Hub",
                "desc": "Complete booking engine + guide management + customer journey automation + multi-tour upsell system",
                "roi": "Scale from 10 to 50 bookings/day without adding staff",
                "price_range": "$4,000-10,000 setup + $600/month",
            },
        },
        "owner_psychology": {
            "fears": ["Losing the personal adventure feel", "Technology failing during tours", "Guides not using the system"],
            "wants": ["More bookings with less phone time", "Reliable income", "Ability to scale without burnout"],
            "objections": ["Tourism is personal, can't automate", "We're seasonal, not worth investing", "Our customers are older, don't use apps"],
            "leverage": "Show them their WhatsApp response time. If it's over 5 minutes, they're losing bookings to faster competitors.",
        },
    },
    "boat_charter": {
        "pain_points": [
            "Quote requests overwhelming - each one needs custom pricing based on boat, duration, extras",
            "Deposits and payment tracking is manual nightmare",
            "Weather cancellations create rebooking chaos",
            "Crew scheduling across multiple boats",
            "Tourists expect instant responses but you're on the water",
            "No system for upsells - catering, DJ, photographer, drone",
            "Seasonal demand spikes crush your capacity to respond",
        ],
        "revenue_leakage": [
            "Slow quote response: Luxury clients book whoever responds first",
            "No deposit enforcement: Cancellations cost $500-2000 per incident",
            "Missed upsells: Average charter could be 40% higher with add-ons",
            "Zero rebooking: Bachelor parties have 5 more friends coming next month",
        ],
        "ai_solutions": {
            "starter": [
                {"name": "Instant Quote Generator", "desc": "WhatsApp bot with boat options, pricing, availability", "roi": "Quote in 60 seconds vs 2 hours"},
                {"name": "Deposit Automation", "desc": "Payment link sent automatically with booking confirmation", "roi": "Eliminate cancellation losses"},
                {"name": "Weather Alert System", "desc": "Automated rescheduling flow when conditions change", "roi": "Save 5+ hours per weather event"},
            ],
            "core": [
                {"name": "Upsell Menu Bot", "desc": "Present catering, DJ, photo packages during booking", "roi": "Increase average charter 30%"},
                {"name": "Fleet Availability System", "desc": "Real-time boat + crew scheduling", "roi": "No double bookings, maximize utilization"},
                {"name": "VIP Client Nurture", "desc": "Automated follow-up for rebooking, referrals, reviews", "roi": "2x repeat bookings"},
            ],
            "flagship": {
                "name": "AI Charter Command Center",
                "desc": "Complete booking engine + fleet management + client CRM + upsell automation + weather integration",
                "roi": "Handle 3x volume with same team. Become the premium charter operation.",
                "price_range": "$6,000-15,000 setup + $800/month",
            },
        },
        "owner_psychology": {
            "fears": ["Technology failing on the water", "Losing the luxury personal touch", "Crew resistance to new systems"],
            "wants": ["Less phone time, more time on water", "Consistent high-season income", "Premium positioning"],
            "objections": ["Our clients expect white-glove service", "We're not a tech company", "High season is too busy to implement"],
            "leverage": "Position as 'what Four Seasons does for hotels, you'll do for charters.' Luxury = systems, not chaos.",
        },
    },
    "spa": {
        "pain_points": [
            "Appointment booking scattered across phone, WhatsApp, walk-ins",
            "No-shows with zero deposit system",
            "Therapist scheduling is manual puzzle",
            "No rebooking automation - clients forget to return",
            "Gift cards and packages tracked in spreadsheets",
            "No upsell flow - clients book basic when they'd pay for premium",
        ],
        "revenue_leakage": [
            "No-shows: 15-25% of appointments, each worth $50-200",
            "No rebooking: Average client could visit 2x more with reminders",
            "Missed upsells: Facial client would add massage if prompted",
            "Gift card breakage: Cards sold but tracking is chaos",
        ],
        "ai_solutions": {
            "starter": [
                {"name": "WhatsApp Booking Bot", "desc": "24/7 appointment booking with therapist/time selection", "roi": "Capture after-hours bookings"},
                {"name": "Appointment Reminder System", "desc": "48hr + 2hr reminders with easy reschedule option", "roi": "Cut no-shows 50%"},
                {"name": "Review Automation", "desc": "Post-treatment review request", "roi": "3x Google reviews"},
            ],
            "core": [
                {"name": "Deposit Collection System", "desc": "Auto-charge card on file for premium services", "roi": "Eliminate no-show losses"},
                {"name": "Rebooking Engine", "desc": "Automated follow-up based on treatment type", "roi": "Increase visit frequency 30%"},
                {"name": "Upsell Recommender", "desc": "Personalized add-on suggestions during booking", "roi": "15% higher ticket average"},
            ],
            "flagship": {
                "name": "AI Spa Management System",
                "desc": "Full booking + staff scheduling + client CRM + membership management + retail tracking",
                "roi": "Run spa operations with 50% less admin overhead",
                "price_range": "$3,000-7,000 setup + $400/month",
            },
        },
        "owner_psychology": {
            "fears": ["Losing the relaxation/wellness vibe with tech", "Staff not adopting", "Impersonal client experience"],
            "wants": ["Full appointment books", "Less phone interruptions", "Higher client retention"],
            "objections": ["Spa is about human touch", "Our clients are older, prefer phone", "We're small, don't need systems"],
            "leverage": "Every no-show is a therapist sitting idle getting paid. Math always wins.",
        },
    },
    "club": {
        "pain_points": [
            "Table reservation chaos - WhatsApp groups, Instagram DMs, phone calls",
            "VIP guest tracking is in someone's head, not a system",
            "Bottle service coordination between hosts and bar",
            "Guest list management for events is spreadsheet hell",
            "Promoter commission tracking is manual and disputed",
            "No system to reactivate past VIP guests",
        ],
        "revenue_leakage": [
            "Lost reservations: VIPs book whoever responds fastest",
            "No reactivation: Big spenders from 3 months ago forgotten",
            "Promoter disputes: Commission tracking chaos",
            "Event underperformance: No data on what works",
        ],
        "ai_solutions": {
            "starter": [
                {"name": "VIP Reservation Bot", "desc": "WhatsApp table booking with menu + deposit", "roi": "Instant response = more bookings"},
                {"name": "Guest List Automation", "desc": "Digital check-in system for events", "roi": "Eliminate door chaos"},
                {"name": "Post-Night Follow-up", "desc": "Thank you + photos + next event invite", "roi": "Build VIP loyalty"},
            ],
            "core": [
                {"name": "VIP CRM System", "desc": "Track spending, preferences, birthdays, crew", "roi": "Personalized service = higher spend"},
                {"name": "Promoter Dashboard", "desc": "Automated commission tracking + payouts", "roi": "Eliminate disputes"},
                {"name": "Event Hype Engine", "desc": "Countdown sequences, early access, FOMO creation", "roi": "Sell out events faster"},
            ],
            "flagship": {
                "name": "AI Nightlife Command Center",
                "desc": "Complete VIP management + reservation system + promoter tracking + event marketing automation",
                "roi": "Become the premium venue that runs like a machine",
                "price_range": "$5,000-12,000 setup + $700/month",
            },
        },
        "owner_psychology": {
            "fears": ["Losing the exclusive vibe", "Staff/promoters gaming the system", "Technology looking cheap"],
            "wants": ["Packed weekends", "VIP loyalty", "Less drama", "Premium reputation"],
            "objections": ["Nightlife is relationships, not tech", "Our crowd doesn't want apps", "We're already successful"],
            "leverage": "Every top club in Miami/Ibiza runs on systems. That's HOW they stay premium.",
        },
    },
    "event_planner": {
        "pain_points": [
            "Lead qualification takes forever - 80% aren't serious",
            "Vendor coordination is 100 WhatsApp groups",
            "Budget tracking across 20 vendors in spreadsheets",
            "Client wants constant updates but you're running around",
            "No system to capture referrals from happy couples",
            "Proposal creation takes hours for each lead",
        ],
        "revenue_leakage": [
            "Unqualified leads: Hours wasted on tire-kickers",
            "Referral neglect: Every wedding has 100+ guests who might get married",
            "Proposal time: 5 hours per proposal, 70% don't convert",
            "Vendor kickbacks: No system to track who sends you what",
        ],
        "ai_solutions": {
            "starter": [
                {"name": "Lead Qualification Bot", "desc": "Automated questionnaire for budget, date, vision", "roi": "Only talk to qualified leads"},
                {"name": "Client Update Automator", "desc": "Weekly status emails generated automatically", "roi": "Happy clients, less work"},
                {"name": "Testimonial Collector", "desc": "Post-event review + referral request sequence", "roi": "Systematic referral generation"},
            ],
            "core": [
                {"name": "Vendor CRM + Comms Hub", "desc": "All vendor communication in one place", "roi": "No more lost messages"},
                {"name": "Budget Tracker Dashboard", "desc": "Real-time spend vs budget across all vendors", "roi": "No budget surprises"},
                {"name": "Proposal Generator", "desc": "AI-assisted proposal creation in 30 minutes", "roi": "5x more proposals sent"},
            ],
            "flagship": {
                "name": "AI Event Planning Hub",
                "desc": "Complete CRM + vendor management + client portal + budget tracking + proposal automation",
                "roi": "Handle 3x more events without burning out",
                "price_range": "$4,000-10,000 setup + $500/month",
            },
        },
        "owner_psychology": {
            "fears": ["Losing creative control", "Clients wanting cheaper because it's 'automated'", "Looking less premium"],
            "wants": ["More events without more stress", "Higher-end clients", "Reliable income"],
            "objections": ["Each event is unique, can't systematize", "My value is the personal touch", "I'm already at capacity"],
            "leverage": "At capacity = leaving money on table. Systems let you raise prices while reducing your work.",
        },
    },
    "photographer": {
        "pain_points": [
            "Inquiry response time - clients book whoever responds first",
            "Contract + deposit collection is manual",
            "Delivery timeline communication is ad-hoc",
            "Gallery delivery and selection process is clunky",
            "No system to generate referrals from happy clients",
            "Portfolio updates scattered across platforms",
        ],
        "revenue_leakage": [
            "Slow inquiry response: 50% of clients book within 24 hours",
            "No rebooking: Family clients could book annually",
            "Referral neglect: Every wedding has guests getting engaged",
            "Album upsells: Most clients would buy if presented properly",
        ],
        "ai_solutions": {
            "starter": [
                {"name": "Inquiry Auto-Response", "desc": "Instant reply with portfolio + packages + availability", "roi": "Respond in 2 mins vs 2 days"},
                {"name": "Booking Automation", "desc": "Contract signing + deposit collection in one flow", "roi": "Book clients while you're shooting"},
                {"name": "Delivery Notifier", "desc": "Automated timeline updates during editing", "roi": "Zero 'where are my photos' messages"},
            ],
            "core": [
                {"name": "Gallery Selection Bot", "desc": "Automated favorite selection + album building", "roi": "Cut selection time 70%"},
                {"name": "Referral Engine", "desc": "Post-delivery review + referral incentive sequence", "roi": "2x referral rate"},
                {"name": "Annual Rebooking System", "desc": "Family session reminders, milestone triggers", "roi": "Predictable repeat income"},
            ],
            "flagship": {
                "name": "AI Photography Business System",
                "desc": "Complete CRM + booking + delivery + referral automation + portfolio management",
                "roi": "Double your bookings without doubling your admin time",
                "price_range": "$2,500-6,000 setup + $300/month",
            },
        },
        "owner_psychology": {
            "fears": ["Looking less artisanal", "Technology errors with precious memories", "Clients wanting cheaper"],
            "wants": ["More shooting, less admin", "Consistent bookings", "Premium positioning"],
            "objections": ["Photography is art, not business", "My clients want personal service", "I'm already busy enough"],
            "leverage": "Every hour on admin is an hour not shooting. What's your hourly rate behind the camera vs behind email?",
        },
    },
    "chef": {
        "pain_points": [
            "Inquiry to booking takes 5-10 back-and-forth messages",
            "Menu customization discussions are endless",
            "Deposit and final payment collection is awkward",
            "No system to track client preferences for repeat bookings",
            "Grocery coordination and timing is manual",
            "No way to capture referrals from dinner party guests",
        ],
        "revenue_leakage": [
            "Long booking cycle: Clients book competitors who respond faster",
            "No client memory: Regulars re-explain preferences every time",
            "Zero referral system: 8 guests at dinner = 8 potential clients",
            "Upsell neglect: Wine pairings, cooking classes, meal prep services",
        ],
        "ai_solutions": {
            "starter": [
                {"name": "Menu + Pricing Bot", "desc": "Instant replies with menu options, dietary handling, pricing", "roi": "Cut booking time from 5 days to 5 hours"},
                {"name": "Booking Confirmation System", "desc": "Auto-contract + deposit collection", "roi": "Professional + paid upfront"},
                {"name": "Post-Event Sequence", "desc": "Thank you + review request + referral offer", "roi": "Turn every dinner into leads"},
            ],
            "core": [
                {"name": "Client Preference CRM", "desc": "Track allergies, favorites, past menus", "roi": "VIP treatment for every repeat client"},
                {"name": "Guest Capture System", "desc": "Business cards or QR at dinner → email list", "roi": "8 new leads per event"},
                {"name": "Upsell Engine", "desc": "Wine pairing, cooking class, meal prep follow-ups", "roi": "30% higher client value"},
            ],
            "flagship": {
                "name": "AI Private Chef Business Hub",
                "desc": "Complete booking + client CRM + menu management + referral automation + scheduling",
                "roi": "Scale from 4 to 10 events/week without assistant",
                "price_range": "$2,500-5,000 setup + $300/month",
            },
        },
        "owner_psychology": {
            "fears": ["Losing the artisan personal feel", "Clients thinking they're getting 'automated' service", "Technology during events"],
            "wants": ["More bookings, less admin", "Higher-end clients", "Consistent income"],
            "objections": ["Cooking is personal, can't automate", "My clients want ME, not a system", "I'm not a tech person"],
            "leverage": "Every hour on WhatsApp is an hour not cooking. Your value is in the kitchen, not the inbox.",
        },
    },
}


class BusinessDeepScan(BaseModel):
    """Complete analysis output for a business."""
    # Business info
    business_name: str
    category: str
    city: str
    
    # Analysis
    pain_points: list[str]
    revenue_leakage: list[str]
    operational_weaknesses: list[str]
    
    # AI Solutions
    starter_automations: list[dict]
    core_automations: list[dict]
    flagship_system: dict
    
    # Psychology
    owner_fears: list[str]
    owner_wants: list[str]
    likely_objections: list[str]
    leverage_angles: list[str]
    
    # Outreach
    whatsapp_opener: str
    email_script: str
    instagram_dm: str
    follow_up_sequence: list[str]
    
    # Transformation plan
    thirty_day_roadmap: list[dict]
    roi_justification: str
    quick_wins: list[str]


class DeepScanEngine:
    """Phil's Business Deep Scan™ engine."""
    
    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o"  # Use best model for deep analysis
    
    def get_vertical_intel(self, category: str) -> dict:
        """Get pre-built intelligence for a vertical."""
        return VERTICAL_DEEP_INTEL.get(category, VERTICAL_DEEP_INTEL.get("restaurant"))
    
    def get_city_context(self, city: str) -> dict:
        """Get city-specific targeting context."""
        return CITY_PRIORITIES.get(city, CITY_PRIORITIES.get("Cartagena"))
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def analyze_business(self, business: Business) -> BusinessDeepScan:
        """Run full Business Deep Scan™ on a business."""
        category = business.category.value
        city = business.city
        
        intel = self.get_vertical_intel(category)
        city_context = self.get_city_context(city)
        
        # Build context for AI
        prompt = self._build_analysis_prompt(business, intel, city_context)
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=4000,
        )
        
        content = response.choices[0].message.content
        
        # Parse and structure the response
        return self._parse_analysis(business, intel, content)
    
    def _get_system_prompt(self) -> str:
        return f"""You are Phil McGill's AI business analyst. Phil is the rising AI authority in Colombia.

PHIL'S VOICE: {PHIL_VOICE['tone']}
POSITIONING: {PHIL_VOICE['positioning']}
APPROACH: {PHIL_VOICE['approach']}

Your job is to analyze businesses and generate insights that make Phil's outreach irresistible.

RULES:
- NEVER sound salesy. Sound like a consultant with absolute confidence.
- ALWAYS speak as if Phil already knows their business better than they do.
- ALWAYS present AI as practical systems, not abstract concepts.
- ALWAYS show REAL business outcomes: more bookings, less work, higher revenue.
- Keep things direct, clean, intelligent."""
    
    def _build_analysis_prompt(self, business: Business, intel: dict, city_context: dict) -> str:
        return f"""Analyze this business for Phil's outreach:

BUSINESS:
- Name: {business.name}
- Category: {business.category.value}
- City: {business.city}
- Website: {business.website or 'None'}
- Rating: {business.rating or 'N/A'} ({business.review_count or 0} reviews)
- Has Instagram: {bool(business.socials.instagram)}
- Has WhatsApp: {bool(business.contact.whatsapp)}
- Current AI Readiness: {business.ai_readiness}

KNOWN PAIN POINTS FOR THIS VERTICAL:
{json.dumps(intel.get('pain_points', []), indent=2)}

KNOWN REVENUE LEAKAGE:
{json.dumps(intel.get('revenue_leakage', []), indent=2)}

CITY CONTEXT ({business.city}):
{json.dumps(city_context, indent=2)}

OWNER PSYCHOLOGY:
{json.dumps(intel.get('owner_psychology', {}), indent=2)}

Generate:
1. TOP 3 PAIN POINTS most relevant to THIS specific business based on their online presence
2. TOP 3 REVENUE LEAKAGE opportunities
3. OPERATIONAL WEAKNESSES (based on their category and what we can infer)
4. WHATSAPP OPENER (20-35 words, Phil's voice, makes them stop scrolling)
5. INSTAGRAM DM (shorter, casual but premium)
6. OBJECTION CRUSHER (the one thing Phil should say if they push back)
7. LEVERAGE ANGLE (the psychological trigger that will make them say yes)

Format as JSON with these exact keys:
{{
    "specific_pain_points": ["...", "...", "..."],
    "revenue_leakage": ["...", "...", "..."],
    "operational_weaknesses": ["...", "...", "..."],
    "whatsapp_opener": "...",
    "instagram_dm": "...",
    "objection_crusher": "...",
    "leverage_angle": "...",
    "personalized_hook": "..."
}}"""
    
    def _parse_analysis(self, business: Business, intel: dict, ai_response: str) -> BusinessDeepScan:
        """Parse AI response and build complete analysis."""
        # Try to parse AI response as JSON
        try:
            if "```json" in ai_response:
                ai_response = ai_response.split("```json")[1].split("```")[0]
            elif "```" in ai_response:
                ai_response = ai_response.split("```")[1].split("```")[0]
            ai_data = json.loads(ai_response)
        except (json.JSONDecodeError, IndexError):
            ai_data = {}
        
        # Build email script
        email_script = self._generate_email(business, intel, ai_data)
        
        # Build follow-up sequence
        follow_ups = self._generate_follow_ups(business, ai_data)
        
        # Build 30-day roadmap
        roadmap = self._generate_roadmap(business, intel)
        
        solutions = intel.get("ai_solutions", {})
        psychology = intel.get("owner_psychology", {})
        
        return BusinessDeepScan(
            business_name=business.name,
            category=business.category.value,
            city=business.city,
            pain_points=ai_data.get("specific_pain_points", intel.get("pain_points", [])[:3]),
            revenue_leakage=ai_data.get("revenue_leakage", intel.get("revenue_leakage", [])[:3]),
            operational_weaknesses=ai_data.get("operational_weaknesses", []),
            starter_automations=solutions.get("starter", []),
            core_automations=solutions.get("core", []),
            flagship_system=solutions.get("flagship", {}),
            owner_fears=psychology.get("fears", []),
            owner_wants=psychology.get("wants", []),
            likely_objections=psychology.get("objections", []),
            leverage_angles=[ai_data.get("leverage_angle", psychology.get("leverage", ""))],
            whatsapp_opener=ai_data.get("whatsapp_opener", ""),
            email_script=email_script,
            instagram_dm=ai_data.get("instagram_dm", ""),
            follow_up_sequence=follow_ups,
            thirty_day_roadmap=roadmap,
            roi_justification=self._generate_roi(business, intel),
            quick_wins=[s["name"] for s in solutions.get("starter", [])][:3],
        )
    
    def _generate_email(self, business: Business, intel: dict, ai_data: dict) -> str:
        """Generate Phil's email script."""
        hook = ai_data.get("personalized_hook", f"I've been studying {business.category.value}s in {business.city}")
        
        return f"""Subject: Quick question about {business.name}

{hook}.

I noticed something that's probably costing you money right now — and it's fixable in a week.

Most {business.category.value}s in {business.city} are bleeding revenue in three places:
• {intel.get('revenue_leakage', ['Missed bookings'])[0]}
• {intel.get('revenue_leakage', ['No-shows'])[1] if len(intel.get('revenue_leakage', [])) > 1 else 'Slow response times'}
• {intel.get('revenue_leakage', ['No rebooking system'])[2] if len(intel.get('revenue_leakage', [])) > 2 else 'No follow-up system'}

I build AI systems that fix this. Not theory — actual working systems that run 24/7.

Worth a 15-minute call to see if it makes sense for {business.name}?

— Phil McGill
AI Systems for Colombian Hospitality
movvia.co"""
    
    def _generate_follow_ups(self, business: Business, ai_data: dict) -> list[str]:
        """Generate follow-up sequence."""
        return [
            f"Following up on my note about {business.name}. The {ai_data.get('leverage_angle', 'opportunity I mentioned')} is still sitting there. Worth a quick look?",
            f"Last thought on this — I ran the numbers for a {business.category.value} similar to yours. They're saving 15+ hours/week with one automation. Happy to show you which one if useful.",
            f"Closing the loop here. If AI systems aren't a priority right now, no problem. But if you want to see what's possible for {business.name} in 30 days, I'm around.",
        ]
    
    def _generate_roadmap(self, business: Business, intel: dict) -> list[dict]:
        """Generate 30-day implementation roadmap."""
        solutions = intel.get("ai_solutions", {})
        starters = solutions.get("starter", [])
        
        roadmap = [
            {"week": 1, "focus": "Quick Wins", "deliverables": [s["name"] for s in starters[:2]]},
            {"week": 2, "focus": "Core System", "deliverables": [solutions.get("core", [{}])[0].get("name", "Core automation")]},
            {"week": 3, "focus": "Integration", "deliverables": ["Connect all systems", "Staff training"]},
            {"week": 4, "focus": "Optimization", "deliverables": ["Performance review", "Refinements", "Handoff"]},
        ]
        return roadmap
    
    def _generate_roi(self, business: Business, intel: dict) -> str:
        """Generate ROI justification."""
        return f"""CONSERVATIVE ROI ESTIMATE FOR {business.name.upper()}:

Current State (Estimated):
• Missed inquiries due to slow response: 5-10/week
• No-shows without deposits: 10-20% of bookings
• Staff hours on repetitive tasks: 15-20 hrs/week

With AI Systems (30 days):
• Inquiry capture: +30% (instant 24/7 response)
• No-show reduction: -60% (automated deposits + reminders)
• Staff time saved: 10-15 hrs/week

Monthly Impact: $2,000-5,000 in recovered revenue + saved labor
System Investment: Pays for itself in 60-90 days, then pure profit."""


async def run_deep_scan(business: Business) -> BusinessDeepScan:
    """Run Business Deep Scan™ on a single business."""
    engine = DeepScanEngine()
    return await engine.analyze_business(business)


async def run_batch_deep_scan(businesses: list[Business], limit: int = 10) -> list[BusinessDeepScan]:
    """Run Business Deep Scan™ on multiple businesses."""
    engine = DeepScanEngine()
    results = []
    
    for biz in businesses[:limit]:
        try:
            scan = await engine.analyze_business(biz)
            results.append(scan)
        except Exception as e:
            print(f"Error scanning {biz.name}: {e}")
    
    return results
