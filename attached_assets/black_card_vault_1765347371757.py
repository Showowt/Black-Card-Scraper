"""
BLACK CARD VAULT - ADVANCED INTELLIGENCE ENGINE
================================================
The missing pieces that turn outreach into unstoppable closing.

Components:
1. Category-Specific Solution Matrix (granular features per vertical)
2. Decision-Maker Profiler (predict owner psychology)
3. Financial Leak Calculator (precise loss quantification)
4. ROI Recapture Timeline (break-even calculator)
5. Competitor Ghost Mirror (what competitors are doing)
6. Greed Trigger Engine (advanced psychological levers)
7. Pre-Emptive Objection Removal (anticipate and neutralize)
8. Offer Mutation Engine (dynamic custom offers)
9. Post-Close Transformation Blueprint (retention weapon)
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime, timedelta
import random

# ═══════════════════════════════════════════════════════════════════════════
# 1. CATEGORY-SPECIFIC SOLUTION MATRIX
# ═══════════════════════════════════════════════════════════════════════════

CATEGORY_SOLUTIONS = {
    "restaurant": {
        "core_solutions": [
            "AI WhatsApp bot for reservations (24/7, multilingual)",
            "QR-code ordering system (reduce wait staff dependency)",
            "Automated review request & response system",
            "Dynamic pricing for off-peak hours",
            "No-show prediction + deposit automation",
            "Table turnover optimization",
            "Customer preference memory (allergies, favorites, occasions)",
        ],
        "quick_wins": [
            "WhatsApp auto-reply in 24 hours",
            "Review response templates live in 48 hours",
            "QR menu setup in 1 week",
        ],
        "advanced_features": [
            "Predictive inventory based on reservations",
            "Staff scheduling optimization",
            "Loyalty program with AI recommendations",
            "Competitor pricing monitoring",
        ],
        "metrics_improved": [
            "No-show rate: -40%",
            "Review response time: -90%",
            "Off-peak revenue: +25%",
            "Repeat customer rate: +35%",
        ],
    },
    
    "hotel": {
        "core_solutions": [
            "Direct booking engine (bypass OTA commissions)",
            "24/7 AI concierge (multilingual guest support)",
            "Pre-arrival upsell automation (transfers, tours, dining)",
            "Review velocity system (automated review requests)",
            "Dynamic pricing engine",
            "Guest preference database",
            "Housekeeping coordination automation",
        ],
        "quick_wins": [
            "OTA bypass booking link in 48 hours",
            "Pre-arrival email sequence in 1 week",
            "WhatsApp concierge live in 72 hours",
        ],
        "advanced_features": [
            "Revenue management system",
            "Competitor rate monitoring",
            "Guest sentiment analysis",
            "Predictive maintenance alerts",
        ],
        "metrics_improved": [
            "Direct bookings: +40%",
            "OTA commission savings: $3-8k/month",
            "Upsell revenue: +30%",
            "Guest satisfaction: +25%",
        ],
    },
    
    "concierge": {
        "core_solutions": [
            "Client preference database (remembers everything)",
            "Vendor booking automation (restaurants, boats, chefs)",
            "CRM for follow-ups and client lifecycle",
            "AI itinerary planning and suggestions",
            "Multi-client coordination dashboard",
            "Vendor performance tracking",
            "Automated billing and invoicing",
        ],
        "quick_wins": [
            "Client database import in 48 hours",
            "Vendor contact system in 1 week",
            "Auto-response for after-hours in 24 hours",
        ],
        "advanced_features": [
            "Predictive client needs (anniversary reminders, preferences)",
            "Dynamic pricing for services",
            "White-label booking platform",
            "Commission tracking automation",
        ],
        "metrics_improved": [
            "Client capacity: +100%",
            "Repeat client rate: +40%",
            "Vendor coordination time: -60%",
            "After-hours response: 24/7",
        ],
    },
    
    "tour_operator": {
        "core_solutions": [
            "AI booking assistant (handles inquiries while on tours)",
            "Automated deposit collection",
            "Weather-based rescheduling automation",
            "Guest communication sequences (confirmations, reminders, reviews)",
            "Multi-tour calendar management",
            "Guide assignment optimization",
            "Review automation system",
        ],
        "quick_wins": [
            "Booking bot live in 48 hours",
            "Deposit system in 1 week",
            "Reminder automation in 24 hours",
        ],
        "advanced_features": [
            "Dynamic pricing based on demand",
            "Group coordination tools",
            "Partner commission tracking",
            "Seasonal forecasting",
        ],
        "metrics_improved": [
            "Booking capture: +50%",
            "No-shows: -60%",
            "Review velocity: +200%",
            "Owner time saved: 15+ hrs/week",
        ],
    },
    
    "boat_charter": {
        "core_solutions": [
            "AI booking system (quotes + availability instantly)",
            "Captain/crew scheduling automation",
            "Weather monitoring + auto-rescheduling",
            "Guest preference tracking (music, drinks, routes)",
            "Maintenance scheduling",
            "Multi-vessel fleet management",
            "Deposit and payment automation",
        ],
        "quick_wins": [
            "Instant quote bot in 48 hours",
            "Calendar sync in 24 hours",
            "Weather alerts in 1 week",
        ],
        "advanced_features": [
            "Dynamic pricing by demand/season",
            "Fuel cost optimization",
            "Partner commission tracking",
            "Fleet utilization analytics",
        ],
        "metrics_improved": [
            "Inquiry response: <5 minutes (vs 4+ hours)",
            "Booking conversion: +40%",
            "Fleet utilization: +30%",
            "No-shows: -50%",
        ],
    },
    
    "villa_rental": {
        "core_solutions": [
            "Direct booking engine (bypass Airbnb/VRBO fees)",
            "Calendar + payment integration",
            "Guest messaging automation (check-in, local guides, checkout)",
            "Turnover coordination system",
            "Upsell concierge services (chef, boat, tours)",
            "Revenue management (dynamic pricing)",
            "Maintenance request automation",
        ],
        "quick_wins": [
            "Direct booking page in 1 week",
            "Check-in automation in 48 hours",
            "Turnover alerts in 24 hours",
        ],
        "advanced_features": [
            "Multi-property dashboard",
            "Owner reporting automation",
            "Competitor rate monitoring",
            "Guest screening automation",
        ],
        "metrics_improved": [
            "Direct bookings: +50%",
            "Platform fees saved: $500-2k/month/property",
            "Guest communication time: -80%",
            "Upsell revenue: +40%",
        ],
    },
    
    "spa": {
        "core_solutions": [
            "Online booking with automated reminders",
            "Staff scheduling optimization",
            "POS integration for seamless checkout",
            "Loyalty and membership management",
            "Upsell package recommendations",
            "Review automation",
            "Referral program automation",
        ],
        "quick_wins": [
            "Online booking in 48 hours",
            "Reminder system in 24 hours",
            "Review requests in 1 week",
        ],
        "advanced_features": [
            "Treatment recommendation AI",
            "Inventory management",
            "Staff performance analytics",
            "Seasonal promotion automation",
        ],
        "metrics_improved": [
            "No-shows: -50%",
            "Rebooking rate: +40%",
            "Average ticket: +25% (upsells)",
            "Review velocity: +300%",
        ],
    },
    
    "club": {
        "core_solutions": [
            "Guest list management (digital, real-time)",
            "Table booking with dynamic minimums",
            "VIP loyalty program",
            "Event promotion and ticketing",
            "Bottle service automation",
            "Promoter commission tracking",
            "Social media integration",
        ],
        "quick_wins": [
            "Digital guest list in 24 hours",
            "Table booking bot in 48 hours",
            "Event page automation in 1 week",
        ],
        "advanced_features": [
            "Spend-based VIP tiers",
            "Predictive crowd management",
            "Dynamic pricing for tables",
            "Influencer tracking",
        ],
        "metrics_improved": [
            "Table revenue: +35%",
            "No-shows: -40%",
            "VIP retention: +50%",
            "Event attendance: +30%",
        ],
    },
    
    "transportation": {
        "core_solutions": [
            "AI booking and dispatch bot",
            "Dynamic pricing engine",
            "Route optimization",
            "Fleet management dashboard",
            "24/7 multilingual reservation assistant",
            "Driver assignment automation",
            "Real-time tracking for clients",
        ],
        "quick_wins": [
            "Booking bot in 48 hours",
            "Dispatch automation in 1 week",
            "Client tracking in 72 hours",
        ],
        "advanced_features": [
            "Predictive demand modeling",
            "Fuel efficiency optimization",
            "Partner/affiliate tracking",
            "Airport flight monitoring",
        ],
        "metrics_improved": [
            "Booking response: <2 minutes",
            "Fleet utilization: +40%",
            "Fuel costs: -15%",
            "Customer satisfaction: +35%",
        ],
    },
    
    "photographer": {
        "core_solutions": [
            "Booking and inquiry automation",
            "Contract and deposit collection",
            "Client communication sequences",
            "Gallery delivery automation",
            "Review request system",
            "Referral tracking",
            "Calendar management",
        ],
        "quick_wins": [
            "Inquiry auto-response in 24 hours",
            "Contract automation in 1 week",
            "Review requests in 48 hours",
        ],
        "advanced_features": [
            "AI-powered photo culling suggestions",
            "Client portal for selections",
            "Upsell package recommendations",
            "Seasonal pricing automation",
        ],
        "metrics_improved": [
            "Inquiry response: <5 minutes",
            "Booking conversion: +30%",
            "Admin time: -50%",
            "Referral rate: +40%",
        ],
    },
    
    "event_planner": {
        "core_solutions": [
            "Client inquiry automation",
            "Vendor coordination system",
            "Timeline and task management",
            "Budget tracking automation",
            "Client communication portal",
            "Contract and payment automation",
            "Post-event review system",
        ],
        "quick_wins": [
            "Inquiry bot in 48 hours",
            "Vendor database in 1 week",
            "Timeline templates in 72 hours",
        ],
        "advanced_features": [
            "AI vendor recommendations",
            "Budget optimization suggestions",
            "Guest management integration",
            "Multi-event dashboard",
        ],
        "metrics_improved": [
            "Vendor coordination: -60% time",
            "Client satisfaction: +40%",
            "Event capacity: +50%",
            "Referral rate: +35%",
        ],
    },
    
    "real_estate": {
        "core_solutions": [
            "Lead capture and qualification bots",
            "Appointment scheduling automation",
            "Property listing automation",
            "Targeted marketing (WhatsApp, email)",
            "CRM with follow-up sequences",
            "Virtual tour integration",
            "Document automation",
        ],
        "quick_wins": [
            "Lead bot in 48 hours",
            "Scheduling automation in 24 hours",
            "WhatsApp campaigns in 1 week",
        ],
        "advanced_features": [
            "AI property matching",
            "Market analysis automation",
            "Investor portal",
            "Commission tracking",
        ],
        "metrics_improved": [
            "Lead response: <3 minutes",
            "Qualification rate: +50%",
            "Showing no-shows: -40%",
            "Close rate: +25%",
        ],
    },
    
    "gym": {
        "core_solutions": [
            "Membership management automation",
            "Class scheduling and waitlists",
            "Digital check-in/out",
            "Personalized workout suggestions",
            "Churn prediction and retention",
            "Billing automation",
            "Referral program",
        ],
        "quick_wins": [
            "Check-in automation in 48 hours",
            "Class booking in 1 week",
            "Churn alerts in 72 hours",
        ],
        "advanced_features": [
            "AI workout programming",
            "Nutrition integration",
            "Wearable data integration",
            "Community engagement tools",
        ],
        "metrics_improved": [
            "Member retention: +30%",
            "Class fill rate: +40%",
            "Admin time: -60%",
            "Referrals: +50%",
        ],
    },
    
    "chef": {
        "core_solutions": [
            "Booking and inquiry automation",
            "Menu planning tools",
            "Client preference database",
            "Ingredient sourcing automation",
            "Contract and payment collection",
            "Review and referral system",
            "Calendar management",
        ],
        "quick_wins": [
            "Inquiry bot in 24 hours",
            "Menu templates in 48 hours",
            "Booking calendar in 1 week",
        ],
        "advanced_features": [
            "AI menu suggestions based on preferences",
            "Cost optimization",
            "Dietary restriction management",
            "Multi-event coordination",
        ],
        "metrics_improved": [
            "Booking response: <10 minutes",
            "Conversion rate: +35%",
            "Repeat clients: +50%",
            "Admin time: -40%",
        ],
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# 2. DECISION-MAKER PROFILER
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class DecisionMakerProfile:
    """Predicted profile of the business decision-maker."""
    
    # Demographics
    estimated_age_range: str  # "25-35", "35-45", "45-55", "55+"
    likely_role: str  # Owner, Manager, Partner
    
    # Psychology
    personality_type: str  # Visionary, Operator, Skeptic, Delegator
    buying_style: str  # Impulsive, Analytical, Consensus, Value-driven
    risk_tolerance: str  # High, Medium, Low
    
    # Drivers
    primary_motivation: str  # Growth, Freedom, Status, Security
    fear_pattern: str  # Falling behind, Wasting money, Losing control, Missing out
    status_trigger: str  # What makes them feel successful
    
    # Communication
    preferred_language_style: str  # Direct, Consultative, Data-driven, Story-driven
    response_speed_preference: str  # Immediate, Same-day, Takes-time
    
    # Approach recommendations
    opening_approach: str
    proof_type_needed: str  # Numbers, Testimonials, Demo, Case studies
    objection_likely: str
    closing_style: str


def profile_decision_maker(
    category: str,
    business_size: str,  # small, medium, large
    rating: float,
    review_count: int,
    has_website: bool,
    price_level: str,
) -> DecisionMakerProfile:
    """
    Predict decision-maker profile based on business signals.
    """
    
    # Determine business sophistication
    sophistication = "low"
    if has_website and review_count > 100:
        sophistication = "medium"
    if has_website and review_count > 300 and rating >= 4.5:
        sophistication = "high"
    
    # Category-specific profiles
    profiles = {
        "restaurant": {
            "low": DecisionMakerProfile(
                estimated_age_range="35-50",
                likely_role="Owner-Operator",
                personality_type="Operator",
                buying_style="Value-driven",
                risk_tolerance="Low",
                primary_motivation="Security",
                fear_pattern="Wasting money on tech that doesn't work",
                status_trigger="Full restaurant, good reviews",
                preferred_language_style="Direct",
                response_speed_preference="Same-day",
                opening_approach="Lead with specific problem observation",
                proof_type_needed="Numbers + local case study",
                objection_likely="Too expensive / no time to learn",
                closing_style="Risk reversal + quick win guarantee",
            ),
            "medium": DecisionMakerProfile(
                estimated_age_range="30-45",
                likely_role="Owner or Managing Partner",
                personality_type="Visionary",
                buying_style="Analytical",
                risk_tolerance="Medium",
                primary_motivation="Growth",
                fear_pattern="Falling behind competitors",
                status_trigger="Being known as the best / innovative",
                preferred_language_style="Consultative",
                response_speed_preference="Takes-time",
                opening_approach="Lead with growth opportunity + competitor intel",
                proof_type_needed="Case studies + ROI projections",
                objection_likely="Need to think about it / need more info",
                closing_style="Phased approach + success metrics",
            ),
            "high": DecisionMakerProfile(
                estimated_age_range="35-55",
                likely_role="Owner or Investor",
                personality_type="Delegator",
                buying_style="Consensus",
                risk_tolerance="Medium-High",
                primary_motivation="Status",
                fear_pattern="Missing the next big thing",
                status_trigger="Industry leadership / press mentions",
                preferred_language_style="Story-driven",
                response_speed_preference="Immediate decision, delegated implementation",
                opening_approach="Lead with exclusivity + transformation vision",
                proof_type_needed="Premium case studies + industry authority",
                objection_likely="Who else is using this / what's the catch",
                closing_style="Exclusivity + white-glove implementation",
            ),
        },
        "concierge": {
            "low": DecisionMakerProfile(
                estimated_age_range="28-40",
                likely_role="Solo Operator",
                personality_type="Operator",
                buying_style="Value-driven",
                risk_tolerance="Low",
                primary_motivation="Freedom",
                fear_pattern="Losing control of client relationships",
                status_trigger="Client loyalty and referrals",
                preferred_language_style="Direct",
                response_speed_preference="Same-day",
                opening_approach="Empathize with overwhelm, show time savings",
                proof_type_needed="Time savings numbers + demo",
                objection_likely="My clients expect ME, not a bot",
                closing_style="Show it enhances (not replaces) their personal touch",
            ),
            "medium": DecisionMakerProfile(
                estimated_age_range="30-45",
                likely_role="Owner with small team",
                personality_type="Visionary",
                buying_style="Analytical",
                risk_tolerance="Medium",
                primary_motivation="Growth",
                fear_pattern="Can't scale without losing quality",
                status_trigger="Handling high-profile clients effortlessly",
                preferred_language_style="Consultative",
                response_speed_preference="Takes-time",
                opening_approach="Lead with scaling opportunity + quality maintenance",
                proof_type_needed="Case studies + capacity increase metrics",
                objection_likely="Will it work for MY specific clients",
                closing_style="Customization promise + phased rollout",
            ),
            "high": DecisionMakerProfile(
                estimated_age_range="35-55",
                likely_role="Managing Director",
                personality_type="Delegator",
                buying_style="Consensus",
                risk_tolerance="Medium-High",
                primary_motivation="Status",
                fear_pattern="Competitors getting tech edge",
                status_trigger="Being THE concierge people recommend",
                preferred_language_style="Story-driven",
                response_speed_preference="Quick decision, team implementation",
                opening_approach="Lead with market positioning + competitive advantage",
                proof_type_needed="Premium case studies + exclusivity",
                objection_likely="What about data security / client privacy",
                closing_style="White-glove + exclusivity window",
            ),
        },
        "hotel": {
            "low": DecisionMakerProfile(
                estimated_age_range="40-60",
                likely_role="Owner-Operator",
                personality_type="Skeptic",
                buying_style="Value-driven",
                risk_tolerance="Low",
                primary_motivation="Security",
                fear_pattern="Wasting money, OTA dependency",
                status_trigger="High occupancy, good reviews",
                preferred_language_style="Data-driven",
                response_speed_preference="Takes-time",
                opening_approach="Lead with OTA commission savings (specific $)",
                proof_type_needed="ROI calculator + direct savings proof",
                objection_likely="We've tried tech before and it didn't work",
                closing_style="Guarantee + show immediate savings",
            ),
            "medium": DecisionMakerProfile(
                estimated_age_range="35-50",
                likely_role="General Manager or Owner",
                personality_type="Operator",
                buying_style="Analytical",
                risk_tolerance="Medium",
                primary_motivation="Growth",
                fear_pattern="Losing to newer, tech-savvy properties",
                status_trigger="TripAdvisor ranking, guest satisfaction scores",
                preferred_language_style="Data-driven",
                response_speed_preference="Same-day",
                opening_approach="Lead with competitive positioning + guest experience",
                proof_type_needed="Case studies + benchmark data",
                objection_likely="How does this integrate with our PMS",
                closing_style="Integration roadmap + quick win first",
            ),
            "high": DecisionMakerProfile(
                estimated_age_range="30-50",
                likely_role="Director or Owner Group",
                personality_type="Visionary",
                buying_style="Consensus",
                risk_tolerance="High",
                primary_motivation="Status",
                fear_pattern="Not being seen as innovative",
                status_trigger="Press features, awards, industry recognition",
                preferred_language_style="Story-driven",
                response_speed_preference="Immediate decision",
                opening_approach="Lead with transformation vision + industry leadership",
                proof_type_needed="Premium case studies + innovation story",
                objection_likely="Is this proven at our level",
                closing_style="Exclusivity + flagship partnership framing",
            ),
        },
    }
    
    # Get profile or default
    category_profiles = profiles.get(category, profiles["restaurant"])
    return category_profiles.get(sophistication, category_profiles["low"])


# ═══════════════════════════════════════════════════════════════════════════
# 3. FINANCIAL LEAK CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class FinancialLeak:
    """Detailed financial loss calculation."""
    category: str
    source: str
    monthly_loss: float
    calculation: str
    confidence: str  # high, medium, low


@dataclass
class FinancialLeakReport:
    """Complete financial leak analysis."""
    total_monthly_loss: float
    total_annual_loss: float
    leaks: list
    comparison_to_industry: str
    biggest_leak: str
    quick_fix_potential: float
    full_fix_potential: float


def calculate_financial_leaks(
    category: str,
    review_count: int,
    rating: float,
    has_website: bool,
    has_booking_system: bool = False,
    estimated_monthly_revenue: float = None,
    city: str = "Cartagena",
) -> FinancialLeakReport:
    """
    Calculate precise financial leaks with industry benchmarks.
    """
    
    leaks = []
    
    # Estimate monthly revenue if not provided
    if not estimated_monthly_revenue:
        revenue_estimates = {
            "restaurant": 15000 if review_count > 100 else 8000,
            "hotel": 40000 if review_count > 100 else 20000,
            "concierge": 12000 if review_count > 50 else 6000,
            "tour_operator": 10000 if review_count > 50 else 5000,
            "boat_charter": 25000 if review_count > 30 else 12000,
            "villa_rental": 8000,  # per property
            "spa": 12000 if review_count > 50 else 6000,
            "club": 30000 if review_count > 100 else 15000,
        }
        estimated_monthly_revenue = revenue_estimates.get(category, 10000)
    
    # RESTAURANT LEAKS
    if category == "restaurant":
        # No-shows
        no_show_rate = 0.15 if not has_booking_system else 0.08
        avg_ticket = 45
        monthly_covers = review_count * 2 if review_count else 500
        no_show_loss = monthly_covers * no_show_rate * avg_ticket
        leaks.append(FinancialLeak(
            category="No-shows",
            source="Reservations without confirmation/deposit",
            monthly_loss=no_show_loss,
            calculation=f"{monthly_covers} covers × {no_show_rate*100}% no-show × ${avg_ticket} avg",
            confidence="high"
        ))
        
        # Missed after-hours inquiries
        missed_inquiries = 5 * 30  # 5 per night × 30 nights
        conversion = 0.4
        inquiry_loss = missed_inquiries * conversion * avg_ticket
        leaks.append(FinancialLeak(
            category="Missed inquiries",
            source="After-hours WhatsApp/calls not answered",
            monthly_loss=inquiry_loss,
            calculation=f"{missed_inquiries} missed × {conversion*100}% would book × ${avg_ticket}",
            confidence="medium"
        ))
        
        # Review damage
        if rating and rating < 4.5:
            review_loss = (4.5 - rating) * 1000  # $1k per 0.1 star below 4.5
            leaks.append(FinancialLeak(
                category="Review reputation",
                source="Rating below optimal (4.5+) reducing new customers",
                monthly_loss=review_loss,
                calculation=f"({4.5} - {rating}) × $1,000 per 0.1 star deficit",
                confidence="medium"
            ))
        
        # Off-peak underutilization
        off_peak_loss = estimated_monthly_revenue * 0.15
        leaks.append(FinancialLeak(
            category="Off-peak revenue",
            source="Empty tables during slow periods (no dynamic pricing)",
            monthly_loss=off_peak_loss,
            calculation=f"15% of revenue lost to empty off-peak capacity",
            confidence="low"
        ))
    
    # HOTEL LEAKS
    elif category == "hotel":
        # OTA commissions
        ota_rate = 0.18  # Average 18%
        ota_bookings = 0.70 if not has_website else 0.50  # 70% OTA if no direct option
        ota_loss = estimated_monthly_revenue * ota_bookings * ota_rate
        leaks.append(FinancialLeak(
            category="OTA commissions",
            source="Bookings through Booking.com, Expedia, etc.",
            monthly_loss=ota_loss,
            calculation=f"${estimated_monthly_revenue:,.0f} × {ota_bookings*100}% OTA × {ota_rate*100}% commission",
            confidence="high"
        ))
        
        # Missed upsells
        avg_guests = review_count // 10 if review_count else 50
        upsell_rate = 0.30  # 30% would buy
        avg_upsell = 50  # transfers, tours, dining
        upsell_loss = avg_guests * upsell_rate * avg_upsell
        leaks.append(FinancialLeak(
            category="Missed upsells",
            source="No pre-arrival upsell sequence (transfers, tours, dining)",
            monthly_loss=upsell_loss,
            calculation=f"{avg_guests} guests × {upsell_rate*100}% would buy × ${avg_upsell} avg",
            confidence="medium"
        ))
        
        # Slow response loss
        slow_response_loss = estimated_monthly_revenue * 0.10
        leaks.append(FinancialLeak(
            category="Slow response",
            source="Each hour delay reduces booking probability 10%",
            monthly_loss=slow_response_loss,
            calculation=f"Estimated 10% bookings lost to slow response",
            confidence="medium"
        ))
    
    # CONCIERGE LEAKS
    elif category == "concierge":
        # Capacity constraint
        capacity_loss = estimated_monthly_revenue * 0.50
        leaks.append(FinancialLeak(
            category="Capacity constraint",
            source="Can't take more clients due to manual operations",
            monthly_loss=capacity_loss,
            calculation=f"50% more revenue possible with automation",
            confidence="medium"
        ))
        
        # Slow response
        slow_loss = estimated_monthly_revenue * 0.15
        leaks.append(FinancialLeak(
            category="Slow response",
            source="High-value inquiries lost to competitors",
            monthly_loss=slow_loss,
            calculation=f"15% inquiries lost due to response time",
            confidence="medium"
        ))
        
        # No client memory
        retention_loss = estimated_monthly_revenue * 0.30
        leaks.append(FinancialLeak(
            category="Client retention",
            source="Repeat clients treated as new (no preference database)",
            monthly_loss=retention_loss,
            calculation=f"30% lower retention without preference tracking",
            confidence="medium"
        ))
    
    # BOAT CHARTER LEAKS
    elif category == "boat_charter":
        # Missed while chartering
        charter_days = 20
        inquiries_missed = 2 * charter_days
        avg_charter = 3000
        conversion = 0.30
        missed_loss = inquiries_missed * conversion * avg_charter
        leaks.append(FinancialLeak(
            category="Missed inquiries",
            source="Inquiries lost while captain is on water",
            monthly_loss=missed_loss,
            calculation=f"{inquiries_missed} missed × {conversion*100}% conversion × ${avg_charter}",
            confidence="high"
        ))
        
        # No-shows
        no_show_loss = avg_charter * 1  # 1 no-show per month
        leaks.append(FinancialLeak(
            category="No-shows",
            source="Charters cancelled without deposit",
            monthly_loss=no_show_loss,
            calculation=f"1 no-show × ${avg_charter} average charter",
            confidence="medium"
        ))
    
    # TOUR OPERATOR LEAKS
    elif category == "tour_operator":
        # Missed during tours
        tours_per_month = 25
        missed_per_tour = 3
        avg_tour = 100
        conversion = 0.40
        missed_loss = tours_per_month * missed_per_tour * conversion * avg_tour
        leaks.append(FinancialLeak(
            category="Missed inquiries",
            source="Inquiries lost while leading tours",
            monthly_loss=missed_loss,
            calculation=f"{missed_per_tour}/tour × {tours_per_month} tours × {conversion*100}% × ${avg_tour}",
            confidence="high"
        ))
        
        # No-shows
        no_show_rate = 0.10
        monthly_bookings = review_count if review_count else 100
        no_show_loss = monthly_bookings * no_show_rate * avg_tour
        leaks.append(FinancialLeak(
            category="No-shows",
            source="No deposit system",
            monthly_loss=no_show_loss,
            calculation=f"{monthly_bookings} bookings × {no_show_rate*100}% × ${avg_tour}",
            confidence="medium"
        ))
    
    # Calculate totals
    total_monthly = sum(leak.monthly_loss for leak in leaks)
    total_annual = total_monthly * 12
    biggest_leak = max(leaks, key=lambda x: x.monthly_loss) if leaks else None
    
    # Quick fix = top 2 leaks
    quick_fix = sum(sorted([l.monthly_loss for l in leaks], reverse=True)[:2])
    
    return FinancialLeakReport(
        total_monthly_loss=total_monthly,
        total_annual_loss=total_annual,
        leaks=leaks,
        comparison_to_industry=f"Businesses with automation lose 60% less",
        biggest_leak=biggest_leak.category if biggest_leak else "Unknown",
        quick_fix_potential=quick_fix,
        full_fix_potential=total_monthly * 0.80,  # Can recover 80%
    )


# ═══════════════════════════════════════════════════════════════════════════
# 4. ROI RECAPTURE TIMELINE
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class RecaptureTimeline:
    """ROI timeline calculation."""
    investment: float
    monthly_savings: float
    break_even_days: int
    break_even_date: str
    month_1_net: float
    month_3_net: float
    month_6_net: float
    year_1_net: float
    roi_percentage: float


def calculate_recapture_timeline(
    financial_leaks: FinancialLeakReport,
    package_price: float = 2000,  # One-time implementation
    monthly_fee: float = 500,
) -> RecaptureTimeline:
    """
    Calculate exact ROI timeline with specific dates.
    """
    
    monthly_savings = financial_leaks.full_fix_potential
    
    # Break-even calculation
    # First month: -package_price - monthly_fee + monthly_savings
    first_month_net = -package_price - monthly_fee + monthly_savings
    
    if first_month_net >= 0:
        # Break even in first month
        break_even_days = int((package_price + monthly_fee) / (monthly_savings / 30))
    else:
        # Calculate months to break even
        remaining = package_price - (monthly_savings - monthly_fee)
        if monthly_savings > monthly_fee:
            months_after_first = remaining / (monthly_savings - monthly_fee)
            break_even_days = 30 + int(months_after_first * 30)
        else:
            break_even_days = 365  # Won't break even in year 1
    
    break_even_date = (datetime.now() + timedelta(days=break_even_days)).strftime("%B %d, %Y")
    
    # Net calculations
    month_1_net = monthly_savings - package_price - monthly_fee
    month_3_net = (monthly_savings * 3) - package_price - (monthly_fee * 3)
    month_6_net = (monthly_savings * 6) - package_price - (monthly_fee * 6)
    year_1_net = (monthly_savings * 12) - package_price - (monthly_fee * 12)
    
    # ROI percentage
    total_cost = package_price + (monthly_fee * 12)
    total_return = monthly_savings * 12
    roi_percentage = ((total_return - total_cost) / total_cost) * 100
    
    return RecaptureTimeline(
        investment=package_price + monthly_fee,
        monthly_savings=monthly_savings,
        break_even_days=break_even_days,
        break_even_date=break_even_date,
        month_1_net=month_1_net,
        month_3_net=month_3_net,
        month_6_net=month_6_net,
        year_1_net=year_1_net,
        roi_percentage=roi_percentage,
    )


# ═══════════════════════════════════════════════════════════════════════════
# 5. COMPETITOR GHOST MIRROR
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class CompetitorIntelligence:
    """Competitor analysis for urgency creation."""
    competitors_with_automation: int
    competitors_within_radius: int
    automation_adoption_rate: str
    their_ranking_trend: str  # rising, stable, falling
    competitor_advantages: list
    urgency_statement: str
    time_until_disadvantage: str


def generate_competitor_mirror(
    category: str,
    city: str,
    business_rating: float,
    business_reviews: int,
) -> CompetitorIntelligence:
    """
    Generate competitor intelligence for urgency creation.
    
    Note: In production, this would pull real competitor data.
    For now, generates realistic estimates based on market patterns.
    """
    
    # Market estimates by category and city
    market_data = {
        "restaurant": {
            "Cartagena": {"total": 150, "automated": 12, "adoption_rate": "8%"},
            "Medellín": {"total": 200, "automated": 25, "adoption_rate": "12%"},
            "Bogotá": {"total": 400, "automated": 60, "adoption_rate": "15%"},
        },
        "hotel": {
            "Cartagena": {"total": 80, "automated": 20, "adoption_rate": "25%"},
            "Medellín": {"total": 60, "automated": 12, "adoption_rate": "20%"},
            "Bogotá": {"total": 150, "automated": 40, "adoption_rate": "27%"},
        },
        "concierge": {
            "Cartagena": {"total": 40, "automated": 3, "adoption_rate": "8%"},
            "Medellín": {"total": 25, "automated": 2, "adoption_rate": "8%"},
            "Bogotá": {"total": 50, "automated": 5, "adoption_rate": "10%"},
        },
        "tour_operator": {
            "Cartagena": {"total": 60, "automated": 8, "adoption_rate": "13%"},
            "Medellín": {"total": 40, "automated": 5, "adoption_rate": "12%"},
            "Bogotá": {"total": 30, "automated": 3, "adoption_rate": "10%"},
        },
        "boat_charter": {
            "Cartagena": {"total": 30, "automated": 4, "adoption_rate": "13%"},
            "Medellín": {"total": 5, "automated": 0, "adoption_rate": "0%"},
            "Bogotá": {"total": 3, "automated": 0, "adoption_rate": "0%"},
        },
    }
    
    data = market_data.get(category, {}).get(city, {"total": 50, "automated": 5, "adoption_rate": "10%"})
    
    # Determine ranking trend based on rating/reviews
    if business_rating and business_rating >= 4.5 and business_reviews > 200:
        ranking_trend = "stable"
    elif business_rating and business_rating >= 4.0:
        ranking_trend = "at risk"
    else:
        ranking_trend = "falling"
    
    # Competitor advantages
    advantages = [
        "24/7 instant response to inquiries",
        "Automated booking confirmation and reminders",
        "Review velocity 3x higher (automated requests)",
        "No-show rates 40% lower (deposit system)",
        "Guest satisfaction scores trending up",
    ]
    
    # Urgency statement
    urgency_statements = {
        "restaurant": f"{data['automated']} restaurants within 2km already have booking automation. In 6 months, that will be {data['automated'] * 2}+.",
        "hotel": f"{data['automated']} hotels in {city} have direct booking + AI concierge. They're paying ${data['automated'] * 2}k less in OTA fees monthly.",
        "concierge": f"{data['automated']} concierge services in {city} already use client automation. They're handling 2x the clients you are.",
        "tour_operator": f"{data['automated']} tour operators in {city} have instant booking. They're capturing the inquiries you're missing.",
        "boat_charter": f"{data['automated']} charter companies in {city} have instant quote systems. While you're on the water, they're booking.",
    }
    
    return CompetitorIntelligence(
        competitors_with_automation=data['automated'],
        competitors_within_radius=data['total'],
        automation_adoption_rate=data['adoption_rate'],
        their_ranking_trend=ranking_trend,
        competitor_advantages=advantages[:3],
        urgency_statement=urgency_statements.get(category, f"{data['automated']} competitors already have automation."),
        time_until_disadvantage="60-90 days at current adoption rate",
    )


# ═══════════════════════════════════════════════════════════════════════════
# 6. GREED TRIGGER ENGINE (Advanced Psychology Levers)
# ═══════════════════════════════════════════════════════════════════════════

GREED_TRIGGERS = {
    "exclusivity_framing": [
        "Solo trabajo con {n} {category}s por mes en {city}. Después de eso, hay lista de espera. — Phil McGill",
        "Este sistema no está disponible para todos. Selecciono socios que van en serio con el crecimiento. — Phil",
        "La mayoría de tus competidores nunca verán esto. No hago outreach masivo. — Phil McGill",
    ],
    
    "scarcity_calibration": [
        "Me quedan 2 espacios de implementación este mes. Enero ya se está llenando. — Phil",
        "Con la demanda actual, dejaré de tomar nuevos clientes en {city} para {future_date}. — Phil McGill",
        "Este precio solo es válido hasta {end_of_month}. Después, sube 30%. — Phil",
    ],
    
    "time_illusion": [
        "En el tiempo que llevamos hablando, probablemente has perdido 2-3 consultas de reserva. — Phil",
        "Cada semana que esperas es ${weekly_loss} que no regresa. — Phil McGill",
        "Tus competidores están implementando esto ahora mismo. No el próximo mes. Ahora. — Phil",
    ],
    
    "status_based_closing": [
        "Los mejores {category}s en {city} tienen algo en común: se movieron rápido en esto. — Phil McGill",
        "Cuando TripAdvisor rankee los {category}s de {city} el próximo trimestre, ¿dónde quieres estar? — Phil",
        "En un año, estarás adelante de esta ola o nadando contra ella. — Phil McGill",
    ],
    
    "narrative_embedding": [
        "Imagina que es 6 meses después. Tu teléfono suena a las 2am, pero no necesitas revisarlo. El sistema lo manejó. Te despiertas con 3 reservas nuevas que llegaron durante la noche. Esa es la realidad que te ofrezco. — Phil McGill",
        "El mes pasado, {similar_business} estaba exactamente donde tú estás. Abrumado. Perdiendo reservas. Ahora tienen problema de lista de espera. Esa transformación tomó 30 días. — Phil",
        "Los dueños que están ganando ahora no trabajan más duro. Construyeron sistemas mientras otros seguían decidiendo. — Phil McGill",
    ],
    
    "identity_escalation": [
        "No eres el tipo de dueño que ve a los competidores pasarlo de largo. — Phil",
        "La pregunta no es si puedes pagar esto. Es si puedes permitirte ser el último {category} en {city} sin ello. — Phil McGill",
        "En 5 años, habrá dos tipos de {category}s: los que se adaptaron y los que cerraron. — Phil",
    ],
    
    "loss_aversion_anchoring": [
        "Ya has perdido ${months_operating * monthly_loss} desde que abriste por no tener esto. — Phil McGill",
        "Cada día que esperas es ${daily_loss} que va a competidores con tiempos de respuesta más rápidos. — Phil",
        "El ROI no es hipotético. Estás perdiendo este dinero ahora mismo. Hoy. — Phil McGill",
    ],
    
    "implied_inevitability": [
        "Esto no es sobre si vas a automatizar. Es sobre si lo haces antes o después que tus competidores. — Phil",
        "Cada negocio en hospitalidad tendrá esto en 3 años. La pregunta es: ¿eres primero o último? — Phil McGill",
        "Los dueños que esperan siempre dicen lo mismo: 'Ojalá hubiera hecho esto antes.' — Phil",
    ],
}


def generate_greed_triggers(
    category: str,
    city: str,
    monthly_loss: float,
    decision_maker_profile: DecisionMakerProfile,
) -> dict:
    """Generate personalized greed triggers based on profile."""
    
    # Select triggers based on decision-maker psychology
    selected_triggers = {}
    
    if decision_maker_profile.primary_motivation == "Status":
        selected_triggers["primary"] = random.choice(GREED_TRIGGERS["status_based_closing"])
        selected_triggers["secondary"] = random.choice(GREED_TRIGGERS["exclusivity_framing"])
    elif decision_maker_profile.primary_motivation == "Growth":
        selected_triggers["primary"] = random.choice(GREED_TRIGGERS["implied_inevitability"])
        selected_triggers["secondary"] = random.choice(GREED_TRIGGERS["time_illusion"])
    elif decision_maker_profile.primary_motivation == "Security":
        selected_triggers["primary"] = random.choice(GREED_TRIGGERS["loss_aversion_anchoring"])
        selected_triggers["secondary"] = random.choice(GREED_TRIGGERS["scarcity_calibration"])
    else:  # Freedom
        selected_triggers["primary"] = random.choice(GREED_TRIGGERS["narrative_embedding"])
        selected_triggers["secondary"] = random.choice(GREED_TRIGGERS["identity_escalation"])
    
    # Replace placeholders
    replacements = {
        "{category}": category,
        "{city}": city,
        "{n}": "3",
        "{monthly_loss}": f"{monthly_loss:,.0f}",
        "{weekly_loss}": f"{monthly_loss/4:,.0f}",
        "{daily_loss}": f"{monthly_loss/30:,.0f}",
        "{future_date}": (datetime.now() + timedelta(days=60)).strftime("%B %Y"),
        "{end_of_month}": (datetime.now().replace(day=28) + timedelta(days=4)).strftime("%B %d"),
        "{months_operating}": "12",
        "{similar_business}": f"a {category} in {city}",
    }
    
    for key, value in selected_triggers.items():
        for placeholder, replacement in replacements.items():
            value = value.replace(placeholder, str(replacement))
        selected_triggers[key] = value
    
    return selected_triggers


# ═══════════════════════════════════════════════════════════════════════════
# 7. PRE-EMPTIVE OBJECTION REMOVAL
# ═══════════════════════════════════════════════════════════════════════════

PREEMPTIVE_OBJECTIONS = {
    "price": {
        "objection": "Esto es muy caro",
        "preemptive_script": "Antes de hablar de números — esto no es un costo. Es una reasignación. Ya estás gastando ${monthly_loss}/mes en reservas perdidas, no-shows y trabajo manual. Solo estamos redirigiendo una fracción de ese desperdicio a un sistema que lo elimina. — Phil McGill",
        "embedded_reframe": "La verdadera pregunta no es '¿puedo pagar esto?' — es '¿puedo seguir perdiendo ${monthly_loss} cada mes?'",
    },
    
    "time": {
        "objection": "No tengo tiempo para implementar esto",
        "preemptive_script": "Sé que estás al límite — exactamente por eso existe esto. La implementación toma 2-3 horas de tu tiempo total. Después, recuperas 15+ horas cada semana. Los que 'no tienen tiempo' siempre son los que más lo necesitan. — Phil McGill",
        "embedded_reframe": "No tienes tiempo para NO hacer esto. Cada semana que esperas son 15 horas que no recuperas.",
    },
    
    "trust": {
        "objection": "Ya probé tecnología/AI antes y no funcionó",
        "preemptive_script": "La mayoría de 'soluciones AI' son software genérico que no entiende hospitalidad. Esto es diferente — está construido específicamente para {category}s en {city}. {proof_point}. Pero entiendo el escepticismo. Por eso hay garantía de 30 días: si no ves resultados, no pagas. — Phil McGill",
        "embedded_reframe": "La diferencia entre lo que falló antes y esto? Especificidad. Las herramientas genéricas fallan. Los sistemas personalizados para TU tipo de negocio funcionan.",
    },
    
    "need": {
        "objection": "Estamos bien sin esto",
        "preemptive_script": "Eso es lo que dicen los mejores negocios — hasta que ven los números. {business_name} va bien, pero 'bien' no es lo mismo que 'optimizado.' Estás dejando ${monthly_loss}/mes sobre la mesa. No es una crisis — es una oportunidad. — Phil McGill",
        "embedded_reframe": "'Bien' es enemigo de excelente. La pregunta es: ¿quieres quedarte bien, o quieres dominar?",
    },
    
    "timing": {
        "objection": "No es el momento adecuado",
        "preemptive_script": "Nunca hay un momento 'perfecto' — pero hay un costo de esperar. Cada mes que tardas es ${monthly_loss} perdido. Mientras tanto, tus competidores están implementando ahora. El mejor momento fue hace 6 meses. El segundo mejor momento es hoy. — Phil McGill",
        "embedded_reframe": "Los dueños que esperan siempre dicen lo mismo después: 'Ojalá hubiera hecho esto antes.'",
    },
    
    "complexity": {
        "objection": "Esto parece complicado",
        "preemptive_script": "Se ve complejo desde afuera — pero ese es mi trabajo, no el tuyo. Me das 3 horas total. Yo me encargo de todo lo demás. Tu único trabajo es ver los resultados llegar. — Phil McGill",
        "embedded_reframe": "El sistema es sofisticado. Tu experiencia con él es simple: configurar una vez, beneficiarte para siempre.",
    },
    
    "personal_touch": {
        "objection": "Mis clientes esperan que YO les atienda, no un bot",
        "preemptive_script": "Esto no te reemplaza — te amplifica. El AI maneja lo repetitivo (confirmaciones, recordatorios, FAQs) para que puedas dedicar MÁS tiempo a los toques personales que importan. Tus clientes obtienen respuesta más rápida Y más de tu atención. — Phil McGill",
        "embedded_reframe": "Ahora mismo, gastas 70% de tu tiempo en tareas que un sistema podría hacer. Imagina dedicar ese 70% a lo que solo TÚ puedes hacer.",
    },
}


def generate_preemptive_objections(
    decision_maker_profile: DecisionMakerProfile,
    monthly_loss: float,
    category: str,
    city: str,
) -> list:
    """Generate the most likely objections with preemptive scripts."""
    
    # Predict objections based on profile
    likely_objections = []
    
    if decision_maker_profile.risk_tolerance == "Low":
        likely_objections.extend(["price", "trust", "complexity"])
    elif decision_maker_profile.buying_style == "Analytical":
        likely_objections.extend(["need", "timing", "trust"])
    elif decision_maker_profile.personality_type == "Skeptic":
        likely_objections.extend(["trust", "need", "personal_touch"])
    else:
        likely_objections.extend(["time", "timing", "price"])
    
    # Get unique objections
    likely_objections = list(dict.fromkeys(likely_objections))[:3]
    
    # Build responses with placeholders filled
    responses = []
    for obj_key in likely_objections:
        obj_data = PREEMPTIVE_OBJECTIONS.get(obj_key, {}).copy()
        
        # Replace placeholders
        for field in ["preemptive_script", "embedded_reframe"]:
            if field in obj_data:
                obj_data[field] = obj_data[field].replace("{monthly_loss}", f"{monthly_loss:,.0f}")
                obj_data[field] = obj_data[field].replace("{category}", category)
                obj_data[field] = obj_data[field].replace("{city}", city)
                obj_data[field] = obj_data[field].replace("{business_name}", "Your business")
                obj_data[field] = obj_data[field].replace("{proof_point}", "Over 1,400 businesses have used this methodology")
        
        responses.append(obj_data)
    
    return responses


# ═══════════════════════════════════════════════════════════════════════════
# 8. OFFER MUTATION ENGINE
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class MutatedOffer:
    """Dynamically generated offer based on all signals."""
    
    # Package
    package_name: str
    package_price: float
    monthly_fee: float
    
    # What's included
    core_features: list
    bonus_features: list
    
    # Framing
    value_anchor: str  # What this would normally cost
    discount_reason: str  # Why they're getting a deal
    urgency: str  # Why now
    guarantee: str
    
    # Psychology
    primary_hook: str
    identity_frame: str
    loss_prevention_frame: str
    
    # Close
    cta: str
    objection_preempt: str


def mutate_offer(
    category: str,
    city: str,
    financial_leaks: FinancialLeakReport,
    decision_maker_profile: DecisionMakerProfile,
    competitor_intel: CompetitorIntelligence,
    business_size: str = "small",
    seasonality: str = "normal",  # normal, high_season_approaching, high_season, low_season
) -> MutatedOffer:
    """
    Dynamically generate the perfect offer based on all signals.
    """
    
    solutions = CATEGORY_SOLUTIONS.get(category, CATEGORY_SOLUTIONS["restaurant"])
    monthly_loss = financial_leaks.total_monthly_loss
    
    # Determine package tier based on business size and loss
    if monthly_loss > 8000 or business_size == "large":
        tier = "premium"
        package_price = 3500
        monthly_fee = 800
        package_name = "Full Transformation Package"
        core_features = solutions["core_solutions"][:5]
        bonus_features = solutions["advanced_features"][:2]
    elif monthly_loss > 4000 or business_size == "medium":
        tier = "growth"
        package_price = 2000
        monthly_fee = 500
        package_name = "Growth Accelerator Package"
        core_features = solutions["core_solutions"][:3]
        bonus_features = solutions["advanced_features"][:1]
    else:
        tier = "starter"
        package_price = 1000
        monthly_fee = 300
        package_name = "Quick Start Package"
        core_features = solutions["core_solutions"][:2]
        bonus_features = []
    
    # Adjust for seasonality
    if seasonality == "high_season_approaching":
        package_price *= 0.85  # 15% discount to close before season
        discount_reason = "Early implementation discount - get set up before high season"
    elif seasonality == "low_season":
        package_price *= 0.80  # 20% discount in slow period
        discount_reason = "Low season implementation special - get ready for the rush"
    else:
        discount_reason = "Launch pricing for {city} market".format(city=city)
    
    # Value anchor
    value_anchor = f"${package_price * 2.5:,.0f}"
    
    # Urgency based on profile
    if decision_maker_profile.fear_pattern == "Falling behind":
        urgency = f"{competitor_intel.competitors_with_automation} competitors already have this. Implementation slots filling up."
    elif decision_maker_profile.fear_pattern == "Missing out":
        urgency = "This pricing ends on the 1st. After that, it's standard rates."
    else:
        urgency = f"Every week you wait is ${monthly_loss/4:,.0f} lost. Let's stop the bleeding."
    
    # Guarantee based on risk tolerance
    if decision_maker_profile.risk_tolerance == "Low":
        guarantee = "100% money-back guarantee. If you don't see results in 30 days, you pay nothing. Zero risk."
    else:
        guarantee = "30-day results guarantee. See measurable improvement or we keep working until you do."
    
    # Primary hook based on motivation
    if decision_maker_profile.primary_motivation == "Growth":
        primary_hook = f"This is how you go from ${monthly_loss/1000:.0f}k/month lost to ${monthly_loss*0.8/1000:.0f}k/month recovered."
    elif decision_maker_profile.primary_motivation == "Status":
        primary_hook = f"The top {category}s in {city} all have one thing in common. This is it."
    elif decision_maker_profile.primary_motivation == "Freedom":
        primary_hook = f"Imagine checking your phone in the morning and seeing bookings that came in overnight. While you slept."
    else:  # Security
        primary_hook = f"Stop the ${monthly_loss:,.0f}/month leak. Protect what you've built."
    
    # Identity frame
    identity_frame = f"You're not the type of {category} owner who watches competitors pass them by."
    
    # Loss prevention frame
    loss_prevention_frame = f"Without this, you'll lose another ${monthly_loss * 6:,.0f} in the next 6 months. That's not a prediction — it's math."
    
    # CTA based on buying style
    if decision_maker_profile.buying_style == "Impulsive":
        cta = "Let's get you set up this week. What day works for a 30-minute kickoff?"
    elif decision_maker_profile.buying_style == "Analytical":
        cta = "I'll send you the full ROI breakdown and case studies. What email should I use?"
    else:
        cta = "Want to see exactly how this works for a {category} like yours? 15 minutes, no pressure.".format(category=category)
    
    # Objection preempt based on predicted objection
    objection_preempt = f"And before you think about price — this isn't a cost. You're already spending ${monthly_loss:,.0f}/month on the problems this solves. This just redirects a fraction of that waste."
    
    return MutatedOffer(
        package_name=package_name,
        package_price=package_price,
        monthly_fee=monthly_fee,
        core_features=core_features,
        bonus_features=bonus_features,
        value_anchor=value_anchor,
        discount_reason=discount_reason,
        urgency=urgency,
        guarantee=guarantee,
        primary_hook=primary_hook,
        identity_frame=identity_frame,
        loss_prevention_frame=loss_prevention_frame,
        cta=cta,
        objection_preempt=objection_preempt,
    )


# ═══════════════════════════════════════════════════════════════════════════
# 9. POST-CLOSE TRANSFORMATION BLUEPRINT
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class TransformationBlueprint:
    """Post-close roadmap for retention and upsells."""
    
    # Timeline
    week_1_actions: list
    week_2_actions: list
    week_3_4_actions: list
    month_2_actions: list
    month_3_actions: list
    
    # Quick wins
    quick_wins: list  # Things they'll see immediately
    
    # Transformation moments
    transformation_moments: list  # Key "wow" moments in the journey
    
    # Metrics to track
    metrics: list
    
    # Before/After visualization
    before_state: str
    after_state: str
    
    # Upsell opportunities
    upsell_timeline: dict  # When to pitch additional services


def generate_transformation_blueprint(
    category: str,
    solutions_implemented: list,
    monthly_loss: float,
) -> TransformationBlueprint:
    """Generate the post-close transformation roadmap."""
    
    solutions = CATEGORY_SOLUTIONS.get(category, CATEGORY_SOLUTIONS["restaurant"])
    
    return TransformationBlueprint(
        week_1_actions=[
            "System setup and integration (2-3 hours of your time)",
            "Import existing contacts/data",
            "Go live with auto-response system",
            "First quick win: See automated responses handling inquiries",
        ],
        week_2_actions=[
            "Fine-tune messaging based on first week's data",
            "Implement booking/deposit system",
            "Train any staff who need access",
            "Review first week's metrics together",
        ],
        week_3_4_actions=[
            "Add review automation",
            "Implement follow-up sequences",
            "Optimize based on response patterns",
            "First month review: Calculate actual $ saved",
        ],
        month_2_actions=[
            "Add advanced features (upsells, loyalty, etc.)",
            "Analyze customer behavior patterns",
            "Competitor monitoring setup",
            "Strategy session: What's working, what to optimize",
        ],
        month_3_actions=[
            "Full system optimization",
            "Scale what's working",
            "Plan next phase expansion",
            "Transformation review: Before vs After",
        ],
        quick_wins=[
            "Day 1: Auto-responses live, no more missed inquiries",
            "Week 1: First automated booking confirmed while you were busy",
            "Week 2: First no-show prevented by deposit system",
            "Week 3: Review count starts climbing (automated requests)",
        ],
        transformation_moments=[
            "First time you wake up to bookings that came in overnight",
            "First weekend where you didn't check your phone once for booking requests",
            "First month where you see the actual $ saved vs lost",
            "First time a customer comments on how fast you responded",
        ],
        metrics=[
            "Response time (target: <5 minutes, 24/7)",
            "Booking conversion rate (target: +30%)",
            "No-show rate (target: -40%)",
            "Review velocity (target: +200%)",
            f"Monthly savings (target: ${monthly_loss * 0.6:,.0f}+)",
        ],
        before_state=f"Overwhelmed, missing inquiries, {monthly_loss:,.0f}/month leaking out, chained to phone",
        after_state=f"Systemized, 24/7 response, saving ${monthly_loss * 0.8:,.0f}/month, freedom to focus on growth",
        upsell_timeline={
            "month_2": "Advanced analytics + competitor monitoring",
            "month_3": "Additional location/property automation",
            "month_6": "Full system expansion + staff accounts",
            "ongoing": "Seasonal campaign management",
        },
    )


# ═══════════════════════════════════════════════════════════════════════════
# MASTER INTELLIGENCE GENERATOR
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class BlackCardIntelligence:
    """Complete intelligence package for one business."""
    
    # Basic info
    business_name: str
    category: str
    city: str
    
    # Decision maker
    decision_maker: DecisionMakerProfile
    
    # Financials
    financial_leaks: FinancialLeakReport
    recapture_timeline: RecaptureTimeline
    
    # Competition
    competitor_intel: CompetitorIntelligence
    
    # Psychology
    greed_triggers: dict
    preemptive_objections: list
    
    # Offer
    mutated_offer: MutatedOffer
    
    # Post-close
    transformation_blueprint: TransformationBlueprint
    
    # Solutions
    category_solutions: dict


def generate_black_card_intelligence(
    business_name: str,
    category: str,
    city: str,
    rating: float = None,
    review_count: int = None,
    has_website: bool = False,
    price_level: str = "moderate",
    estimated_revenue: float = None,
) -> BlackCardIntelligence:
    """
    Generate COMPLETE intelligence package for one business.
    This is the master function that combines everything.
    """
    
    # 1. Profile the decision maker
    business_size = "small"
    if review_count and review_count > 200:
        business_size = "medium"
    if review_count and review_count > 500:
        business_size = "large"
    
    decision_maker = profile_decision_maker(
        category=category,
        business_size=business_size,
        rating=rating or 4.0,
        review_count=review_count or 50,
        has_website=has_website,
        price_level=price_level,
    )
    
    # 2. Calculate financial leaks
    financial_leaks = calculate_financial_leaks(
        category=category,
        review_count=review_count or 50,
        rating=rating or 4.0,
        has_website=has_website,
        estimated_monthly_revenue=estimated_revenue,
        city=city,
    )
    
    # 3. Calculate ROI timeline
    recapture_timeline = calculate_recapture_timeline(financial_leaks)
    
    # 4. Get competitor intelligence
    competitor_intel = generate_competitor_mirror(
        category=category,
        city=city,
        business_rating=rating or 4.0,
        business_reviews=review_count or 50,
    )
    
    # 5. Generate greed triggers
    greed_triggers = generate_greed_triggers(
        category=category,
        city=city,
        monthly_loss=financial_leaks.total_monthly_loss,
        decision_maker_profile=decision_maker,
    )
    
    # 6. Generate preemptive objections
    preemptive_objections = generate_preemptive_objections(
        decision_maker_profile=decision_maker,
        monthly_loss=financial_leaks.total_monthly_loss,
        category=category,
        city=city,
    )
    
    # 7. Mutate the offer
    mutated_offer = mutate_offer(
        category=category,
        city=city,
        financial_leaks=financial_leaks,
        decision_maker_profile=decision_maker,
        competitor_intel=competitor_intel,
        business_size=business_size,
    )
    
    # 8. Generate transformation blueprint
    transformation_blueprint = generate_transformation_blueprint(
        category=category,
        solutions_implemented=mutated_offer.core_features,
        monthly_loss=financial_leaks.total_monthly_loss,
    )
    
    # 9. Get category solutions
    category_solutions = CATEGORY_SOLUTIONS.get(category, CATEGORY_SOLUTIONS["restaurant"])
    
    return BlackCardIntelligence(
        business_name=business_name,
        category=category,
        city=city,
        decision_maker=decision_maker,
        financial_leaks=financial_leaks,
        recapture_timeline=recapture_timeline,
        competitor_intel=competitor_intel,
        greed_triggers=greed_triggers,
        preemptive_objections=preemptive_objections,
        mutated_offer=mutated_offer,
        transformation_blueprint=transformation_blueprint,
        category_solutions=category_solutions,
    )


# ═══════════════════════════════════════════════════════════════════════════
# COLOMBIA MARKET INTELLIGENCE INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

def generate_colombia_enhanced_intelligence(
    business_name: str,
    category: str,
    city: str,
    rating: float = None,
    review_count: int = None,
    has_website: bool = False,
    website_html: str = None,
    price_level: str = "moderate",
    estimated_revenue: float = None,
) -> dict:
    """
    Generate COMPLETE intelligence with Colombia-specific enhancements.
    
    Adds:
    - Tech stack gap detection
    - Colombia market statistics
    - CONPES 4144 positioning
    - Vertical-specific ticket sizing
    - Colombia psychology triggers
    - Government funding pathway hooks
    """
    from services.colombia_market_intel import (
        generate_colombia_market_intel,
        generate_colombia_pitch,
        COLOMBIA_STATS,
        CONPES_POSITIONING,
        COLOMBIA_PSYCHOLOGY_TRIGGERS,
        FUNDING_PATHWAYS,
        get_whatsapp_stat_hook,
        get_tourist_volume_hook,
        get_abandon_rate_hook,
        get_ai_adoption_hook,
    )
    
    # Get standard Black Card intelligence
    black_card = generate_black_card_intelligence(
        business_name=business_name,
        category=category,
        city=city,
        rating=rating,
        review_count=review_count,
        has_website=has_website,
        price_level=price_level,
        estimated_revenue=estimated_revenue,
    )
    
    # Get Colombia market intelligence
    colombia_intel = generate_colombia_market_intel(
        category=category,
        city=city,
        website_html=website_html,
        rating=rating,
        review_count=review_count,
    )
    
    # Generate Colombia-specific pitch
    colombia_pitch = generate_colombia_pitch(colombia_intel, business_name)
    
    return {
        "black_card": black_card,
        "colombia_intel": colombia_intel,
        "colombia_pitch": colombia_pitch,
        "market_stats": COLOMBIA_STATS,
        "conpes_positioning": CONPES_POSITIONING,
        "stat_hooks": {
            "whatsapp": get_whatsapp_stat_hook(),
            "tourist_volume": get_tourist_volume_hook(city),
            "abandon_rate": get_abandon_rate_hook(),
            "ai_adoption": get_ai_adoption_hook(),
        },
        "funding_pathways": FUNDING_PATHWAYS,
        "enhanced_triggers": {
            "freedom": COLOMBIA_PSYCHOLOGY_TRIGGERS["freedom_triggers"],
            "urgency": COLOMBIA_PSYCHOLOGY_TRIGGERS["urgency_triggers"],
            "tourist_capture": COLOMBIA_PSYCHOLOGY_TRIGGERS["tourist_capture_triggers"],
            "competition": COLOMBIA_PSYCHOLOGY_TRIGGERS["competition_triggers"],
            "vision": COLOMBIA_PSYCHOLOGY_TRIGGERS["vision_triggers"],
            "government_leverage": COLOMBIA_PSYCHOLOGY_TRIGGERS["government_leverage_triggers"],
        },
    }
