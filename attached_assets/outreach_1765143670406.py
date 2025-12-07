"""
Outreach Generation System.
Generates personalized cold emails, WhatsApp messages, and audit reports per business.
"""
import json
from datetime import datetime
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_settings
from models import Business, BusinessCategory


# Pain points and automation opportunities by category
VERTICAL_INTELLIGENCE = {
    "restaurant": {
        "pain_points": [
            "Reservation chaos across phone, WhatsApp, Instagram DMs",
            "No-shows costing 15-20% of bookings",
            "Staff overwhelmed answering the same questions",
            "Menu updates scattered across platforms",
            "Review management is manual and slow",
        ],
        "automations": [
            "WhatsApp booking bot with confirmation + reminders",
            "AI receptionist for calls (reservation + FAQ)",
            "Automated review response system",
            "Digital menu with real-time updates",
            "No-show prediction + deposit system",
        ],
        "hook_angles": [
            "reservation system",
            "WhatsApp inquiries",
            "Google reviews",
            "no-show problem",
        ],
    },
    "hotel": {
        "pain_points": [
            "Guest inquiries 24/7 across multiple channels",
            "Upsell opportunities missed (tours, dining, spa)",
            "Check-in/out friction",
            "OTA dependency eating margins",
            "Slow response to booking requests",
        ],
        "automations": [
            "AI concierge (WhatsApp) for guest requests",
            "Automated pre-arrival upsell sequences",
            "Direct booking chatbot to reduce OTA fees",
            "Review solicitation automation",
            "Staff task automation (housekeeping, maintenance)",
        ],
        "hook_angles": [
            "guest experience",
            "direct bookings",
            "OTA commissions",
            "concierge automation",
        ],
    },
    "tour_operator": {
        "pain_points": [
            "Manual booking and itinerary creation",
            "WhatsApp groups with tourists are chaos",
            "No-shows and last-minute cancellations",
            "Difficulty scaling without more staff",
            "Payment collection is fragmented",
        ],
        "automations": [
            "Booking bot with availability + instant confirmation",
            "Automated itinerary delivery",
            "Payment integration with reminders",
            "AI FAQ handler for common questions",
            "Post-tour review automation",
        ],
        "hook_angles": [
            "booking process",
            "WhatsApp management",
            "scaling operations",
            "customer communication",
        ],
    },
    "boat_charter": {
        "pain_points": [
            "Inquiry overload via WhatsApp/Instagram",
            "Complex availability and pricing communication",
            "Deposits and payment tracking",
            "Weather-related rescheduling chaos",
            "Crew coordination",
        ],
        "automations": [
            "Instant quote bot with availability checker",
            "Automated booking + deposit collection",
            "Weather alert + rescheduling system",
            "Post-trip review + rebooking automation",
            "Crew scheduling automation",
        ],
        "hook_angles": [
            "booking inquiries",
            "quote requests",
            "availability management",
            "customer experience",
        ],
    },
    "spa": {
        "pain_points": [
            "Appointment scheduling across channels",
            "No-shows without deposits",
            "Staff scheduling complexity",
            "Upsell and rebooking missed",
            "Review management",
        ],
        "automations": [
            "WhatsApp booking with reminders",
            "Deposit collection automation",
            "Automated rebooking sequences",
            "Review request automation",
            "Staff schedule optimization",
        ],
        "hook_angles": [
            "appointment bookings",
            "no-show rate",
            "client retention",
            "online presence",
        ],
    },
    "club": {
        "pain_points": [
            "Table reservation chaos",
            "VIP guest management",
            "Event promotion fragmented",
            "Guest list management",
            "Bottle service coordination",
        ],
        "automations": [
            "Table reservation bot with deposits",
            "VIP CRM with automated outreach",
            "Event promotion automation",
            "Guest list + check-in system",
            "Post-event rebooking sequences",
        ],
        "hook_angles": [
            "table reservations",
            "VIP experience",
            "event promotion",
            "guest management",
        ],
    },
    "chef": {
        "pain_points": [
            "Inquiry management across platforms",
            "Menu customization discussions are lengthy",
            "Deposit and payment collection",
            "Calendar and availability management",
            "Client follow-up for rebooking",
        ],
        "automations": [
            "Inquiry bot with menu options + pricing",
            "Automated booking with deposits",
            "Client preference tracking",
            "Post-event feedback + rebooking",
            "Social proof automation",
        ],
        "hook_angles": [
            "booking process",
            "client inquiries",
            "menu consultations",
            "client management",
        ],
    },
    "photographer": {
        "pain_points": [
            "Inquiry response time",
            "Portfolio sharing is manual",
            "Contract and payment collection",
            "Scheduling across multiple shoots",
            "Delivery timeline communication",
        ],
        "automations": [
            "Inquiry bot with portfolio + pricing",
            "Automated contract + deposit flow",
            "Scheduling automation",
            "Delivery notification system",
            "Review + referral automation",
        ],
        "hook_angles": [
            "inquiry management",
            "booking process",
            "client communication",
            "portfolio showcase",
        ],
    },
    "videographer": {
        "pain_points": [
            "Project scoping takes multiple calls",
            "Delivery timeline management",
            "Revision request handling",
            "Payment milestones",
            "Client communication during production",
        ],
        "automations": [
            "Project scoping bot with packages",
            "Automated milestone updates",
            "Revision request system",
            "Payment automation",
            "Review + referral sequences",
        ],
        "hook_angles": [
            "project inquiries",
            "client communication",
            "booking workflow",
            "delivery process",
        ],
    },
    "event_planner": {
        "pain_points": [
            "Lead qualification takes forever",
            "Vendor coordination is manual",
            "Budget tracking across vendors",
            "Client update communication",
            "Post-event follow-up",
        ],
        "automations": [
            "Lead qualification bot with budget + vision",
            "Vendor CRM with automated outreach",
            "Budget tracking dashboard",
            "Client update automation",
            "Testimonial + referral system",
        ],
        "hook_angles": [
            "lead qualification",
            "client management",
            "vendor coordination",
            "event workflow",
        ],
    },
    "dj": {
        "pain_points": [
            "Booking inquiries scattered",
            "Song request management",
            "Contract and deposit collection",
            "Equipment logistics",
            "Building consistent bookings",
        ],
        "automations": [
            "Booking bot with availability + pricing",
            "Song request collection system",
            "Contract + deposit automation",
            "Event prep checklist automation",
            "Review + rebooking sequences",
        ],
        "hook_angles": [
            "booking process",
            "client inquiries",
            "event coordination",
            "online presence",
        ],
    },
}

# Default for categories not explicitly defined
DEFAULT_VERTICAL = {
    "pain_points": [
        "Customer inquiries across multiple channels",
        "Manual booking and scheduling",
        "Follow-up and retention is inconsistent",
        "Review management is reactive",
        "Scaling requires more staff",
    ],
    "automations": [
        "AI-powered inquiry handling",
        "Automated booking system",
        "Customer follow-up sequences",
        "Review automation",
        "Operational workflow automation",
    ],
    "hook_angles": [
        "customer communication",
        "booking process",
        "online presence",
        "operational efficiency",
    ],
}


class OutreachGenerator:
    """Generate personalized outreach for businesses."""
    
    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o-mini"
    
    def get_vertical_intel(self, category: str) -> dict:
        """Get intelligence for a business category."""
        return VERTICAL_INTELLIGENCE.get(category, DEFAULT_VERTICAL)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_email(
        self,
        business: Business,
        sender_name: str = "Your Name",
        agency_name: str = "Your Agency",
        tone: str = "professional",  # professional, casual, bold
    ) -> dict:
        """
        Generate a personalized cold outreach email.
        Returns: {subject, body, follow_up}
        """
        category = business.category.value
        intel = self.get_vertical_intel(category)
        
        prompt = f"""Generate a cold outreach email for an AI automation agency targeting this business.

BUSINESS:
- Name: {business.name}
- Type: {business.subcategory or category}
- City: {business.city}
- Website: {business.website or "None"}
- Rating: {business.rating or "N/A"} ({business.review_count or 0} reviews)
- Has Instagram: {bool(business.socials.instagram)}
- Has WhatsApp: {bool(business.contact.whatsapp)}
- AI Summary: {business.ai_summary or "Local business"}
- Outreach Hook: {business.ai_outreach_hook or ""}

VERTICAL INTELLIGENCE:
- Common Pain Points: {json.dumps(intel["pain_points"][:3])}
- Relevant Automations: {json.dumps(intel["automations"][:3])}
- Hook Angles: {json.dumps(intel["hook_angles"])}

SENDER: {sender_name} from {agency_name}

TONE: {tone}

REQUIREMENTS:
1. Subject line: Under 50 chars, specific to their business
2. Opening: Reference something specific about THEIR business (not generic)
3. Pain point: Pick ONE pain point most relevant to their situation
4. Solution: One specific automation that solves it
5. CTA: Free 15-min audit call
6. Length: Under 120 words total
7. No buzzwords like "leverage", "synergy", "game-changer"
8. Sound human, not like a template

OUTPUT JSON:
{{
    "subject": "Subject line here",
    "body": "Full email body here",
    "follow_up": "3-day follow-up message (2-3 sentences)"
}}

OUTPUT ONLY VALID JSON."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=600,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {
                "subject": f"Quick question about {business.name}",
                "body": f"Hi,\n\nI came across {business.name} and noticed you might benefit from automating your booking process.\n\nWould you be open to a quick 15-min call to explore how AI could help?\n\nBest,\n{sender_name}",
                "follow_up": f"Hey, just following up on my note about {business.name}. Still interested in that quick chat?"
            }
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_whatsapp(
        self,
        business: Business,
        sender_name: str = "Your Name",
    ) -> str:
        """Generate a WhatsApp-appropriate outreach message."""
        category = business.category.value
        intel = self.get_vertical_intel(category)
        
        prompt = f"""Generate a WhatsApp cold outreach message for an AI automation agency.

BUSINESS: {business.name} ({business.subcategory or category}) in {business.city}
PAIN POINTS: {json.dumps(intel["pain_points"][:2])}

REQUIREMENTS:
1. Casual, conversational tone (it's WhatsApp)
2. Under 50 words
3. One specific value prop
4. End with a question
5. No emojis except maybe one 👋 at start
6. Sound like a real person, not a bot

OUTPUT ONLY THE MESSAGE TEXT."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=150,
        )
        
        return response.choices[0].message.content.strip()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_audit_report(
        self,
        business: Business,
    ) -> dict:
        """
        Generate a mini AI audit report for a business.
        This is your "free value" before the sales call.
        """
        category = business.category.value
        intel = self.get_vertical_intel(category)
        
        prompt = f"""Generate a brief AI readiness audit for this business.

BUSINESS:
- Name: {business.name}
- Type: {business.subcategory or category}
- City: {business.city}
- Website: {business.website or "None"}
- Rating: {business.rating or "N/A"} ({business.review_count or 0} reviews)
- Has Instagram: {bool(business.socials.instagram)}
- Has Facebook: {bool(business.socials.facebook)}
- Has WhatsApp: {bool(business.contact.whatsapp)}
- Has Email: {bool(business.contact.email)}
- AI Readiness: {business.ai_readiness}
- Opportunity Score: {business.ai_opportunity_score}/100

VERTICAL PAIN POINTS: {json.dumps(intel["pain_points"])}
POSSIBLE AUTOMATIONS: {json.dumps(intel["automations"])}

Generate a professional mini-audit with:
1. Overall AI Readiness Grade (A/B/C/D)
2. Digital Presence Score (1-10)
3. Top 3 automation opportunities specific to their business
4. Estimated hours saved per week with automation
5. One "quick win" they could implement this week

OUTPUT JSON:
{{
    "grade": "B",
    "digital_score": 7,
    "summary": "One sentence assessment",
    "opportunities": [
        {{"name": "WhatsApp Booking Bot", "impact": "high", "complexity": "low", "hours_saved_weekly": 10}},
        {{"name": "...", "impact": "...", "complexity": "...", "hours_saved_weekly": 0}}
    ],
    "quick_win": "Specific actionable recommendation",
    "estimated_monthly_value": "$X,XXX"
}}"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=500,
        )
        
        content = response.choices[0].message.content.strip()
        
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {
                "grade": "B",
                "digital_score": 5,
                "summary": "Business has automation potential",
                "opportunities": [],
                "quick_win": "Set up a WhatsApp Business auto-reply",
                "estimated_monthly_value": "$500-1,500",
            }
    
    async def generate_batch_emails(
        self,
        businesses: list[Business],
        sender_name: str = "Your Name",
        agency_name: str = "Your Agency",
    ) -> list[dict]:
        """Generate emails for multiple businesses."""
        import asyncio
        
        results = []
        for biz in businesses:
            email = await self.generate_email(biz, sender_name, agency_name)
            results.append({
                "business_id": biz.id,
                "business_name": biz.name,
                "email": biz.contact.email,
                "category": biz.category.value,
                **email,
            })
            await asyncio.sleep(0.5)  # Rate limiting
        
        return results


def format_audit_markdown(business: Business, audit: dict) -> str:
    """Format audit report as markdown for sending/display."""
    md = f"""# AI Readiness Audit: {business.name}

**Overall Grade:** {audit.get('grade', 'N/A')}
**Digital Presence Score:** {audit.get('digital_score', 'N/A')}/10
**Estimated Monthly Value:** {audit.get('estimated_monthly_value', 'TBD')}

## Summary
{audit.get('summary', '')}

## Top Automation Opportunities

| Opportunity | Impact | Complexity | Hours Saved/Week |
|------------|--------|------------|------------------|
"""
    opportunities = audit.get('opportunities', [])
    for opp in opportunities:
        md += f"| {opp.get('name', '')} | {opp.get('impact', '')} | {opp.get('complexity', '')} | {opp.get('hours_saved_weekly', 0)} |\n"
    
    md += f"""
## Quick Win
{audit.get('quick_win', 'Set up automated responses')}

---
*Generated by Black Card Business Scanner*
"""
    return md
