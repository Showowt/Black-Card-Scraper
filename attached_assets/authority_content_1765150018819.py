"""
Phil McGill Authority Content Generator.
Creates LinkedIn posts, insights, case study frameworks for positioning.
"""
import json
from datetime import datetime
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_settings


PHIL_BRAND_VOICE = """
Phil McGill - Colombia's AI Authority

Voice characteristics:
- Confident but not arrogant
- Sharp insights, no fluff
- Uses specific examples and numbers
- References Colombian market specifically
- Early-30s high-performance energy
- Speaks from experience, not theory
- Premium positioning without being unapproachable

Content pillars:
1. AI automation for local businesses (practical, ROI-focused)
2. The future of hospitality/tourism tech
3. Behind-the-scenes of building in Colombia
4. Contrarian takes on AI hype vs. reality
5. Case studies and transformations

Never:
- Generic AI takes everyone is posting
- Buzzwords without substance
- Bragging without teaching
- Anything that sounds like ChatGPT wrote it
"""

# Content templates by type
CONTENT_TYPES = {
    "insight": {
        "structure": "Hook (contrarian or surprising) → Observation → Implication → Your take → CTA",
        "length": "150-250 words",
        "example_hooks": [
            "Everyone's talking about AI. Nobody's talking about...",
            "I audited 50 {category} businesses in {city}. Here's what I found:",
            "The biggest lie about AI automation:",
            "Why 90% of 'AI solutions' fail in Colombia:",
        ],
    },
    "case_study": {
        "structure": "Before state → Problem → Solution → Results → Takeaway",
        "length": "200-300 words",
        "example_hooks": [
            "This {category} was losing $X/month. Here's what we fixed:",
            "From 50 to 200 bookings/week. No extra staff.",
            "{business_type} owner was working 70 hours. Now it's 30.",
        ],
    },
    "market_insight": {
        "structure": "Observation about Colombia → Why it matters → Opportunity → What smart operators are doing",
        "length": "150-200 words",
        "example_hooks": [
            "Something weird is happening in {city}...",
            "The Colombia AI market in 2024:",
            "Why {city} is the best place to build AI businesses right now:",
        ],
    },
    "tactical": {
        "structure": "Problem → Step-by-step solution → Result → Offer to help",
        "length": "200-300 words",
        "example_hooks": [
            "How to automate {process} in 48 hours:",
            "The exact system I use for {outcome}:",
            "Stop doing {bad_practice}. Do this instead:",
        ],
    },
    "personal_journey": {
        "structure": "Moment/lesson → Context → What I learned → How it applies to you",
        "length": "150-250 words",
        "example_hooks": [
            "I almost made a huge mistake...",
            "Lesson from my first {X} in Colombia:",
            "What nobody tells you about building in LatAm:",
        ],
    },
}


class ContentPiece(BaseModel):
    """Generated content piece."""
    content_type: str
    hook: str
    body: str
    cta: str
    hashtags: list[str] = Field(default_factory=list)
    best_time_to_post: str = ""
    full_post: str = ""


class AuthorityContentGenerator:
    """Generate authority-building content for Phil."""
    
    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o"
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_linkedin_post(
        self,
        content_type: str,
        topic: str,
        city: str = "Cartagena",
        include_data: dict = None,
    ) -> ContentPiece:
        """Generate a LinkedIn post in Phil's voice."""
        template = CONTENT_TYPES.get(content_type, CONTENT_TYPES["insight"])
        
        prompt = f"""{PHIL_BRAND_VOICE}

Generate a LinkedIn post for Phil McGill.

TYPE: {content_type}
STRUCTURE: {template['structure']}
LENGTH: {template['length']}

TOPIC: {topic}
CITY CONTEXT: {city}, Colombia

{"ADDITIONAL DATA: " + json.dumps(include_data) if include_data else ""}

REQUIREMENTS:
1. Start with a HOOK that stops the scroll (first line is everything)
2. Use Phil's voice - confident, sharp, specific
3. Include at least one specific number or example
4. Reference Colombia/Latin America where natural
5. End with a soft CTA (not salesy)
6. NO emojis in the main text (maybe 1-2 at the end)
7. Use line breaks for readability
8. Make it feel like Phil actually wrote this, not AI

OUTPUT JSON:
{{
    "hook": "First 1-2 lines that stop the scroll",
    "body": "Main content",
    "cta": "Closing call to action",
    "hashtags": ["3-5 relevant hashtags"],
    "best_time_to_post": "Day and time recommendation",
    "full_post": "Complete post ready to copy-paste"
}}

OUTPUT ONLY VALID JSON."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=1000,
        )
        
        content = response.choices[0].message.content.strip()
        
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            data = {"full_post": content}
        
        return ContentPiece(
            content_type=content_type,
            hook=data.get("hook", ""),
            body=data.get("body", ""),
            cta=data.get("cta", ""),
            hashtags=data.get("hashtags", []),
            best_time_to_post=data.get("best_time_to_post", ""),
            full_post=data.get("full_post", ""),
        )
    
    async def generate_weekly_content_calendar(
        self,
        focus_city: str = "Cartagena",
        focus_category: str = "restaurant",
    ) -> list[dict]:
        """Generate a week of content ideas."""
        prompt = f"""{PHIL_BRAND_VOICE}

Create a 7-day LinkedIn content calendar for Phil McGill.

FOCUS: AI automation for {focus_category}s in {focus_city}, Colombia

Each day needs:
1. Content type (insight, case_study, market_insight, tactical, personal_journey)
2. Topic/angle
3. Hook (first line)
4. Key point to make
5. Best time to post

REQUIREMENTS:
- Variety in content types
- Build narrative across the week
- Mix of value-giving and authority-building
- At least 2 posts should reference specific Colombian market dynamics
- At least 1 should be slightly controversial/contrarian

OUTPUT JSON array:
[
    {{
        "day": "Monday",
        "content_type": "insight",
        "topic": "...",
        "hook": "...",
        "key_point": "...",
        "best_time": "..."
    }},
    ...
]"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=1500,
        )
        
        content = response.choices[0].message.content.strip()
        
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return []
    
    async def generate_case_study_framework(
        self,
        business_name: str,
        category: str,
        before_state: str,
        after_state: str,
        key_metrics: dict,
    ) -> str:
        """Generate a case study for social proof."""
        prompt = f"""{PHIL_BRAND_VOICE}

Create a case study for Phil's portfolio.

BUSINESS: {business_name} ({category})
BEFORE: {before_state}
AFTER: {after_state}
KEY METRICS: {json.dumps(key_metrics)}

Generate a complete case study with:
1. Headline (compelling, specific result)
2. The Challenge (before state, pain points)
3. The Solution (what Phil implemented)
4. The Results (specific metrics)
5. Key Takeaway
6. Pull quote from owner (fictional but realistic)

Format as clean markdown."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1000,
        )
        
        return response.choices[0].message.content.strip()
    
    async def generate_authority_assets(self) -> dict:
        """Generate key authority-building assets."""
        assets = {}
        
        # Tagline options
        taglines_prompt = f"""{PHIL_BRAND_VOICE}

Generate 5 tagline options for Phil McGill.
Requirements:
- Positions him as THE AI authority in Colombia
- Memorable, not generic
- Works on LinkedIn, website, business card
- Premium but not pretentious

Output as JSON array of strings."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": taglines_prompt}],
            temperature=0.9,
            max_tokens=300,
        )
        
        content = response.choices[0].message.content.strip()
        try:
            if "```" in content:
                content = content.split("```")[1].replace("json", "").strip()
            assets["taglines"] = json.loads(content)
        except:
            assets["taglines"] = []
        
        # One-liner pitch
        pitch_prompt = f"""{PHIL_BRAND_VOICE}

Generate Phil's one-liner pitch for when someone asks "What do you do?"

Requirements:
- Under 15 words
- Specific (not "I help businesses grow")
- Creates curiosity
- Premium positioning

Output just the pitch, no quotes."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": pitch_prompt}],
            temperature=0.8,
            max_tokens=50,
        )
        
        assets["elevator_pitch"] = response.choices[0].message.content.strip()
        
        # LinkedIn headline options
        headline_prompt = f"""{PHIL_BRAND_VOICE}

Generate 5 LinkedIn headline options for Phil McGill.

Requirements:
- Max 120 characters each
- Positions as authority, not job-seeker
- Includes Colombia angle
- Creates curiosity

Output as JSON array of strings."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": headline_prompt}],
            temperature=0.9,
            max_tokens=400,
        )
        
        content = response.choices[0].message.content.strip()
        try:
            if "```" in content:
                content = content.split("```")[1].replace("json", "").strip()
            assets["linkedin_headlines"] = json.loads(content)
        except:
            assets["linkedin_headlines"] = []
        
        return assets


async def generate_content_batch(
    num_posts: int = 5,
    focus_city: str = "Cartagena",
    focus_category: str = "restaurant",
) -> list[ContentPiece]:
    """Generate a batch of content pieces."""
    generator = AuthorityContentGenerator()
    
    topics = [
        ("insight", f"Why {focus_category}s in {focus_city} are leaving money on the table"),
        ("tactical", f"How to automate WhatsApp for {focus_category}s"),
        ("market_insight", f"The {focus_city} hospitality market in 2024"),
        ("case_study", f"How we transformed a {focus_city} {focus_category}"),
        ("personal_journey", "What I learned building AI systems in Colombia"),
    ]
    
    results = []
    for content_type, topic in topics[:num_posts]:
        post = await generator.generate_linkedin_post(content_type, topic, focus_city)
        results.append(post)
    
    return results
