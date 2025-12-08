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
    """Complete psychology-driven analysis output for a business."""
    # Business info
    business_name: str
    category: str
    city: str
    
    # Analysis
    pain_points: list[str]
    revenue_leakage: list[str]
    operational_weaknesses: list[str]
    
    # Psychology-driven elements
    emotional_pain_trigger: str = ""  # Visceral scenario they've felt
    identity_gap: str = ""  # Who they are vs want to be
    loss_framed_value: str = ""  # What they're losing NOW
    future_pacing_hook: str = ""  # Transformation vision
    closing_trigger: str = ""  # Psychological lever to close
    
    # AI Solutions
    starter_automations: list[dict]
    core_automations: list[dict]
    flagship_system: dict
    
    # Psychology
    owner_fears: list[str]
    owner_wants: list[str]
    owner_mindset: str = ""
    likely_objections: list[str]
    objection_reframes: list[dict] = []  # {objection, reframe}
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
        return f"""You are Phil McGill's elite business analyst powered by a proprietary sales psychology system.

═══════════════════════════════════════════════════════════════════════════
METHODOLOGY CREDENTIALS
═══════════════════════════════════════════════════════════════════════════
• 47 years of combined sales psychology research
• 1,400+ successful client transformations  
• $4.7 million in documented results
• Integrating: Neuroscience, NLP, Behavioral Economics, Identity Transformation

PHIL'S VOICE: {PHIL_VOICE['tone']}
POSITIONING: {PHIL_VOICE['positioning']}
APPROACH: {PHIL_VOICE['approach']}

═══════════════════════════════════════════════════════════════════════════
FRAMEWORK 1: NEUROSCIENCE & NLP
═══════════════════════════════════════════════════════════════════════════
The emotional brain decides. The logical brain justifies.

DECISION HIERARCHY:
1. Reptilian brain (survival) → "Is my business at risk?"
2. Limbic system (emotion) → "How does this make me feel?"
3. Neocortex (logic) → "Does the math make sense?"

ALWAYS trigger in this order. Emotion FIRST, logic SECOND.

NLP PATTERNS TO USE:
• Presuppositions: "When you implement this..." (assumes the sale)
• Embedded commands: "You might find yourself wondering why you waited"
• Pattern interrupts: "I'm not going to pitch you anything"
• Future pacing: "Picture this: 90 days from now..."
• Sensory language: "Feel what it's like when..."

═══════════════════════════════════════════════════════════════════════════
FRAMEWORK 2: BEHAVIORAL ECONOMICS (Kahneman, Thaler, Cialdini)
═══════════════════════════════════════════════════════════════════════════

LOSS AVERSION (2.5x multiplier):
• BAD: "You could earn $3,000/month more"
• GOOD: "You're LOSING $3,000/month right now"
• BEST: "That $100/day loss has already cost you $3,000 this month"

ANCHORING:
• Set HIGH reference first: "Most agencies charge $15-20k..."
• Then reveal your price: "My approach is different."

SOCIAL PROOF:
• Specific > General: "37 restaurants in Colombia" not "many businesses"
• Local > Global: "Three restaurants in Getsemaní" not "restaurants everywhere"
• Similar > Different: Match their exact category and city

SCARCITY (must be genuine):
• Capacity: "I take 3 new clients per month"
• Time: "High season is 8 weeks away. We need 4 weeks to implement."
• Offer: "This pricing is only available through the pilot"

RECIPROCITY:
• Give value BEFORE asking: "I did a quick audit... here's what I found"
• Create obligation through generosity

COMMITMENT/CONSISTENCY:
• Get small yeses: "Would you agree no-shows are a problem?"
• Build to bigger yeses: "If I could fix that, worth 15 minutes?"

═══════════════════════════════════════════════════════════════════════════
FRAMEWORK 3: IDENTITY TRANSFORMATION ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════

Core insight: People don't buy products. They buy who they BECOME.

CURRENT IDENTITY (pain state):
• Overwhelmed operator, reactive, losing control
• "I can't keep up", "There's not enough time", "I'm doing everything myself"

ASPIRATIONAL IDENTITY (desired state):
• Strategic owner, proactive, in control
• "My business runs itself", "I focus on what matters"

THE GAP = PURCHASE MOTIVATION

Identity triggers by vertical:
• Restaurant: "You didn't open a restaurant to be a full-time receptionist."
• Hotel: "You built a hotel to create experiences, not answer the same question 50x."
• Tour: "You started this to share adventures, not be buried in logistics."
• Charter: "You bought boats to live the life, not be chained to your phone."

Frame the purchase as IDENTITY PROTECTION:
• "Is this who you want to be known as?"
• "The owners winning in {city} have one thing in common..."
• "A year from now, will you be glad you made this move?"

═══════════════════════════════════════════════════════════════════════════
FRAMEWORK 4: COMPLIANCE PSYCHOLOGY
═══════════════════════════════════════════════════════════════════════════

AUTHORITY MARKERS (increases compliance):
• Reference methodology: "Based on 47 years of research..."
• Cite results: "This methodology has generated $4.7M..."
• Use specifics: Numbers, frameworks, named techniques

PROCEDURAL COMPLIANCE:
• Clear next steps: "Here's how this works: Step 1..."
• Remove ambiguity: Make the path forward obvious
• Frame as standard: "The typical process is..."

═══════════════════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════

Every outreach piece MUST:
1. Open with pattern interrupt (break autopilot rejection)
2. Demonstrate specificity (show you know THEIR business)
3. Trigger emotion BEFORE logic (pain, fear, desire)
4. Frame as LOSS, not gain ("you're losing" not "you could gain")
5. Include identity hook ("Is this who you want to be?")
6. Future pace the transformation ("Picture this: 90 days from now...")
7. Use embedded commands and presuppositions naturally
8. End with micro-commitment CTA ("Reply 'yes' if...")

NEVER:
• Sound salesy or desperate
• Use generic language that could apply to any business
• Lead with features or logic before emotion
• Forget the 47-year methodology positioning
• Skip the identity transformation angle"""
    
    def _build_analysis_prompt(self, business: Business, intel: dict, city_context: dict) -> str:
        return f"""Analyze this business using elite sales psychology for Phil's outreach:

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

═══════════════════════════════════════════════════════════════════════════
GENERATE USING THESE PSYCHOLOGY FRAMEWORKS:
═══════════════════════════════════════════════════════════════════════════

1. EMOTIONAL PAIN TRIGGER (Make them FEEL the problem)
   Write a visceral, specific scenario they've experienced. Use present tense.
   Example: "It's Saturday night. Your phone buzzes. Another WhatsApp message. You're trying to have dinner with your family..."

2. IDENTITY GAP (Who they are vs. who they want to be)
   Show the gap between their current identity and their aspirational identity.
   Example: "You didn't become a restaurateur to be a full-time receptionist."

3. WHATSAPP OPENER (25-40 words)
   Structure: Pattern interrupt → Specificity → Curiosity hook → Soft question
   Use presupposition: Assume you already know something valuable about their business.
   Example: "Hey [name], noticed something about [specific detail]. Quick question - [pain-related question]?"
   
4. INSTAGRAM DM (15-25 words)
   Structure: Reference their content → Genuine observation → Question (not pitch)
   Must feel like you actually looked at their profile.

5. LOSS-FRAMED VALUE PROP
   Frame everything as what they're LOSING right now, not what they could gain.
   Use specific numbers. "You're losing $X" hits harder than "You could earn $X"

6. FUTURE PACING HOOK
   Paint a vivid picture of their life AFTER the transformation.
   Use "Picture this:" or "Imagine:" followed by specific sensory details.

7. OBJECTION PREVENTION
   The #1 objection they'll have, and a REFRAME (not a counter-argument).

8. CLOSING TRIGGER
   The single psychological lever that will make THIS owner say yes.
   Consider: FOMO, identity threat, loss aversion, social proof, or scarcity.

Format response as JSON:
{{
    "emotional_pain_trigger": "Vivid present-tense scenario (50-80 words)",
    "identity_gap_statement": "One powerful sentence showing who they are vs want to be",
    "whatsapp_opener": "Pattern interrupt + specificity + curiosity (25-40 words)",
    "instagram_dm": "Reference content + genuine observation + question (15-25 words)",
    "loss_framed_value": "What they're losing RIGHT NOW with specific numbers",
    "future_pacing_hook": "Vivid transformation scenario starting with 'Picture this:' or 'Imagine:'",
    "objection_prevention": {{"objection": "Their likely pushback", "reframe": "How Phil turns it into a reason to buy"}},
    "closing_trigger": "The psychological lever that closes THIS owner",
    "specific_pain_points": ["Pain 1", "Pain 2", "Pain 3"],
    "revenue_leakage": ["Loss 1", "Loss 2", "Loss 3"],
    "operational_weaknesses": ["Weakness 1", "Weakness 2"]
}}"""""
    
    def _parse_analysis(self, business: Business, intel: dict, ai_response: str) -> BusinessDeepScan:
        """Parse AI response and build complete psychology-driven analysis."""
        # Try to parse AI response as JSON
        try:
            if "```json" in ai_response:
                ai_response = ai_response.split("```json")[1].split("```")[0]
            elif "```" in ai_response:
                ai_response = ai_response.split("```")[1].split("```")[0]
            ai_data = json.loads(ai_response)
        except (json.JSONDecodeError, IndexError):
            ai_data = {}
        
        # Build email script with psychology
        email_script = self._generate_email(business, intel, ai_data)
        
        # Build psychology-driven follow-up sequence
        follow_ups = self._generate_follow_ups(business, ai_data)
        
        # Build 30-day roadmap
        roadmap = self._generate_roadmap(business, intel)
        
        solutions = intel.get("ai_solutions", {})
        psychology = intel.get("owner_psychology", {})
        
        # Extract objection prevention
        objection_data = ai_data.get("objection_prevention", {})
        objection_reframes = []
        if objection_data:
            objection_reframes.append(objection_data)
        
        return BusinessDeepScan(
            business_name=business.name,
            category=business.category.value,
            city=business.city,
            
            # Analysis
            pain_points=ai_data.get("specific_pain_points", intel.get("pain_points", [])[:3]),
            revenue_leakage=ai_data.get("revenue_leakage", intel.get("revenue_leakage", [])[:3]),
            operational_weaknesses=ai_data.get("operational_weaknesses", []),
            
            # Psychology elements
            emotional_pain_trigger=ai_data.get("emotional_pain_trigger", ""),
            identity_gap=ai_data.get("identity_gap_statement", ""),
            loss_framed_value=ai_data.get("loss_framed_value", ""),
            future_pacing_hook=ai_data.get("future_pacing_hook", ""),
            closing_trigger=ai_data.get("closing_trigger", ""),
            
            # AI Solutions
            starter_automations=solutions.get("starter", []),
            core_automations=solutions.get("core", []),
            flagship_system=solutions.get("flagship", {}),
            
            # Owner psychology
            owner_fears=psychology.get("fears", []),
            owner_wants=psychology.get("wants", []),
            owner_mindset=psychology.get("leverage", ""),
            likely_objections=psychology.get("objections", []),
            objection_reframes=objection_reframes,
            leverage_angles=[ai_data.get("closing_trigger", psychology.get("leverage", ""))],
            
            # Outreach
            whatsapp_opener=ai_data.get("whatsapp_opener", ""),
            email_script=email_script,
            instagram_dm=ai_data.get("instagram_dm", ""),
            follow_up_sequence=follow_ups,
            
            # Transformation plan
            thirty_day_roadmap=roadmap,
            roi_justification=self._generate_roi(business, intel),
            quick_wins=[s["name"] for s in solutions.get("starter", [])][:3],
        )
    
    def _generate_email(self, business: Business, intel: dict, ai_data: dict) -> str:
        """Generate Phil's psychology-driven email script."""
        
        # Get elements from AI analysis
        emotional_trigger = ai_data.get("emotional_pain_trigger", "")
        identity_gap = ai_data.get("identity_gap_statement", "")
        loss_value = ai_data.get("loss_framed_value", intel.get('revenue_leakage', ['Missed bookings'])[0])
        future_hook = ai_data.get("future_pacing_hook", "")
        closing_trigger = ai_data.get("closing_trigger", "")
        
        return f"""Subject: {business.name} — noticed something

I'm not going to waste your time with a sales pitch.

{emotional_trigger}

{identity_gap}

Here's what I see happening right now:
• {loss_value}
• {intel.get('revenue_leakage', ['Slow response times'])[1] if len(intel.get('revenue_leakage', [])) > 1 else 'Inquiries slipping through the cracks'}
• {intel.get('revenue_leakage', ['No follow-up system'])[2] if len(intel.get('revenue_leakage', [])) > 2 else 'Zero automation on repetitive tasks'}

{future_hook}

I build AI systems that make this happen. Not concepts — working systems that run while you sleep.

15 minutes. I'll show you exactly what I'd fix first. No pitch, just a walkthrough.

Reply "show me" and I'll send times.

— Phil McGill
AI Systems for Colombian Hospitality

P.S. {closing_trigger}"""

    def _generate_follow_ups(self, business: Business, ai_data: dict) -> list[str]:
        """Generate psychology-driven follow-up sequence."""
        
        identity_gap = ai_data.get("identity_gap_statement", f"The {business.category.value} owners winning in {business.city} have one thing in common: they automated 6 months ago.")
        future_hook = ai_data.get("future_pacing_hook", f"Imagine checking your phone and seeing the week's bookings handled without you.")
        objection = ai_data.get("objection_prevention", {})
        
        return [
            # Day 3: Add NEW value + social proof
            f"""Quick follow-up on {business.name}.

Just finished a project with a {business.category.value} in {business.city}. 
Results: 47% fewer no-shows in 30 days. Revenue up $3,200/month.

Made me think of you. Same issues, same fix.

Still worth that 15-min call?

— Phil""",

            # Day 7: Case study + identity leverage
            f"""One more thought on this.

{identity_gap}

I've got a case study from a {business.category.value} owner who said exactly what you might be thinking: "{objection.get('objection', 'I don\\'t have time for this')}"

60 days later, she's saving 12 hours a week and her bookings are up 35%.

Last chance to see if this makes sense for {business.name}. After this week, I'm heads-down with other projects.

— Phil""",

            # Day 14: Scarcity + future pacing + door open
            f"""Closing the loop on this.

{future_hook}

That's what I build. If the timing isn't right, totally get it.

But if {business.name} is still dealing with the same problems in 6 months, you'll know where to find me.

Door's open if you want to revisit.

— Phil

P.S. I've got one spot left this month if you want to move fast.""",
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


async def run_batch_deep_scan(businesses: list[Business], output_dir: str = "outreach") -> list[BusinessDeepScan]:
    """Run Business Deep Scan™ on multiple businesses and save to files."""
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    engine = DeepScanEngine()
    results = []
    
    for biz in businesses:
        try:
            scan = await engine.analyze_business(biz)
            results.append(scan)
            
            # Save to file
            filename = f"{output_dir}/{biz.name.replace(' ', '_')[:30]}.md"
            with open(filename, "w") as f:
                f.write(_format_scan_markdown(scan))
                
        except Exception as e:
            print(f"Error scanning {biz.name}: {e}")
    
    return results


def _format_scan_markdown(scan: BusinessDeepScan) -> str:
    """Format scan as psychology-driven markdown document."""
    md = f"""# OUTREACH PACKAGE: {scan.business_name}
## {scan.category.upper()} | {scan.city}
### Generated by Phil McGill's Deep Scan™ Engine

---

## 🧠 PSYCHOLOGY TRIGGERS

### Emotional Pain Point
> {scan.emotional_pain_trigger}

### Identity Gap
> {scan.identity_gap}

### Loss-Framed Value
> {scan.loss_framed_value}

### Future Pacing
> {scan.future_pacing_hook}

### Closing Trigger
> {scan.closing_trigger}

---

## 📊 BUSINESS ANALYSIS

### Pain Points
"""
    for p in scan.pain_points:
        md += f"- {p}\n"
    
    md += "\n### Revenue Leakage\n"
    for r in scan.revenue_leakage:
        md += f"- {r}\n"
    
    md += "\n### Operational Weaknesses\n"
    for w in scan.operational_weaknesses:
        md += f"- {w}\n"
    
    md += f"""
---

## 💬 OUTREACH SCRIPTS

### WhatsApp Opener
```
{scan.whatsapp_opener}
```

### Instagram DM
```
{scan.instagram_dm}
```

### Email Script
```
{scan.email_script}
```

---

## 📧 FOLLOW-UP SEQUENCE

"""
    for i, f in enumerate(scan.follow_up_sequence, 1):
        md += f"### Follow-up {i}\n```\n{f}\n```\n\n"
    
    md += f"""
---

## 🎯 OWNER PSYCHOLOGY

### What They Fear
"""
    for fear in scan.owner_fears:
        md += f"- {fear}\n"
    
    md += "\n### What They Want\n"
    for want in scan.owner_wants:
        md += f"- {want}\n"
    
    md += "\n### Likely Objections\n"
    for obj in scan.likely_objections:
        md += f"- \"{obj}\"\n"
    
    if scan.objection_reframes:
        md += "\n### Objection Reframes\n"
        for reframe in scan.objection_reframes:
            md += f"**Objection:** \"{reframe.get('objection', '')}\"\n"
            md += f"**Reframe:** {reframe.get('reframe', '')}\n\n"
    
    md += f"""
---

## 🚀 AI SOLUTIONS

### Quick Wins (Week 1)
"""
    for s in scan.starter_automations:
        md += f"- **{s.get('name', '')}**: {s.get('desc', '')} → {s.get('roi', '')}\n"
    
    md += "\n### Core Systems (Weeks 2-3)\n"
    for s in scan.core_automations:
        md += f"- **{s.get('name', '')}**: {s.get('desc', '')} → {s.get('roi', '')}\n"
    
    md += f"""
### Flagship System
**{scan.flagship_system.get('name', '')}**
{scan.flagship_system.get('desc', '')}

ROI: {scan.flagship_system.get('roi', '')}
Investment: {scan.flagship_system.get('price_range', '')}

---

## 📈 ROI JUSTIFICATION

{scan.roi_justification}

---

*Generated by Phil McGill's Business Deep Scan™ Engine*
*Elite Sales Psychology Framework v2.0*
"""
    return md
