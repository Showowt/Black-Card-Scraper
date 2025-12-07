"""
AI Enrichment Service.
Uses OpenAI to classify businesses, generate summaries, and create outreach hooks.
"""
import json
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_settings
from models import Business, EnrichmentResult, AIReadinessLevel


ENRICHMENT_PROMPT = """You are a business intelligence analyst for a premium AI automation agency targeting hospitality and tourism businesses in Colombia.

Analyze this business and provide structured insights:

BUSINESS DATA:
- Name: {name}
- Category: {category}
- City: {city}
- Address: {address}
- Website: {website}
- Rating: {rating} ({review_count} reviews)
- Description: {description}
- Tags: {tags}
- Has Instagram: {has_instagram}
- Has WhatsApp: {has_whatsapp}
- Has Email: {has_email}

PROVIDE JSON OUTPUT:
{{
    "subcategory": "Specific niche (e.g., 'Fine Dining', 'Boutique Hotel', 'Party Boat Tours')",
    "summary": "One sentence describing what makes this business notable",
    "readiness": "high/medium/low - based on digital presence and sophistication",
    "outreach_hook": "One personalized sentence to open a cold outreach email",
    "opportunity_score": 1-100 (likelihood they'd pay for AI/automation services),
    "tags": ["additional", "relevant", "tags"]
}}

READINESS CRITERIA:
- HIGH: Has website + multiple socials + booking system + professional photos
- MEDIUM: Has website OR active social media, but not both optimized
- LOW: Minimal online presence, no website, only phone/address

OPPORTUNITY SCORING:
- 80-100: High-end with budget, clear automation needs, growing
- 50-79: Established business, some digital presence, could benefit from AI
- 20-49: Small operation, may not have budget but could grow
- 1-19: Very small, no digital presence, unlikely to invest

OUTPUT ONLY VALID JSON, NO MARKDOWN."""


class AIEnricher:
    """Enrich business data using AI."""
    
    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o-mini"  # Cost-effective for classification
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def enrich(self, business: Business) -> EnrichmentResult:
        """Enrich a single business with AI insights."""
        prompt = ENRICHMENT_PROMPT.format(
            name=business.name,
            category=business.category.value,
            city=business.city,
            address=business.address or "Unknown",
            website=business.website or "None",
            rating=business.rating or "N/A",
            review_count=business.review_count or 0,
            description=business.description or "None",
            tags=", ".join(business.tags) if business.tags else "None",
            has_instagram=bool(business.socials.instagram),
            has_whatsapp=bool(business.contact.whatsapp),
            has_email=bool(business.contact.email),
        )
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON
        try:
            # Handle potential markdown code blocks
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            
            data = json.loads(content)
            
            # Map readiness string to enum
            readiness_map = {
                "high": AIReadinessLevel.HIGH,
                "medium": AIReadinessLevel.MEDIUM,
                "low": AIReadinessLevel.LOW,
            }
            readiness = readiness_map.get(
                data.get("readiness", "unknown").lower(),
                AIReadinessLevel.UNKNOWN
            )
            
            return EnrichmentResult(
                subcategory=data.get("subcategory"),
                summary=data.get("summary"),
                readiness=readiness,
                outreach_hook=data.get("outreach_hook"),
                opportunity_score=min(100, max(1, int(data.get("opportunity_score", 50)))),
                tags=data.get("tags", []),
            )
        except (json.JSONDecodeError, KeyError, ValueError):
            # Fallback result
            return EnrichmentResult(
                readiness=AIReadinessLevel.UNKNOWN,
                opportunity_score=50,
            )
    
    async def enrich_batch(
        self,
        businesses: list[Business],
        concurrency: int = 5,
    ) -> list[Business]:
        """Enrich multiple businesses with controlled concurrency."""
        import asyncio
        
        semaphore = asyncio.Semaphore(concurrency)
        
        async def enrich_one(biz: Business) -> Business:
            async with semaphore:
                result = await self.enrich(biz)
                
                # Apply enrichment to business
                biz.subcategory = result.subcategory
                biz.ai_summary = result.summary
                biz.ai_readiness = result.readiness
                biz.ai_outreach_hook = result.outreach_hook
                biz.ai_opportunity_score = result.opportunity_score
                
                # Merge tags
                for tag in result.tags:
                    if tag not in biz.tags:
                        biz.tags.append(tag)
                
                return biz
        
        tasks = [enrich_one(biz) for biz in businesses]
        return await asyncio.gather(*tasks)


OUTREACH_TEMPLATE_PROMPT = """Generate a personalized cold outreach email for this business.

BUSINESS:
- Name: {name}
- Type: {subcategory}
- City: {city}
- AI Summary: {summary}
- Outreach Hook: {hook}

TARGET SERVICE: AI automation for {category} businesses (chatbots, booking automation, social media AI)

Write a SHORT email (under 100 words) that:
1. Opens with the hook
2. Mentions one specific pain point for their type of business
3. Offers a free 15-min audit call
4. Sounds human, not salesy

OUTPUT ONLY THE EMAIL BODY, NO SUBJECT LINE."""


async def generate_outreach_email(business: Business) -> str:
    """Generate a personalized outreach email for a business."""
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    prompt = OUTREACH_TEMPLATE_PROMPT.format(
        name=business.name,
        subcategory=business.subcategory or business.category.value,
        city=business.city,
        summary=business.ai_summary or "Local business",
        hook=business.ai_outreach_hook or f"I noticed {business.name} in {business.city}",
        category=business.category.value,
    )
    
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=300,
    )
    
    return response.choices[0].message.content.strip()
