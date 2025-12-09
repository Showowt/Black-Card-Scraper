"""
Lead Intent Signals Scraper.
Monitors travel forums, Reddit, and social for people planning Cartagena trips.
Feeds directly into Movvia's demand pipeline.
"""
import asyncio
import re
from datetime import datetime, timedelta
from typing import Optional
import httpx
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_settings


# Intent signal patterns - what indicates someone is planning a trip
INTENT_PATTERNS = {
    "high_intent": [
        r"planning\s+(?:a\s+)?trip\s+to\s+cartagena",
        r"visiting\s+cartagena\s+(?:in|next|this)",
        r"cartagena\s+(?:in\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)",
        r"booked\s+(?:a\s+)?(?:flight|hotel|airbnb)\s+(?:to|in)\s+cartagena",
        r"honeymoon\s+(?:in|to)\s+cartagena",
        r"bachelor(?:ette)?\s+party\s+cartagena",
        r"cartagena\s+itinerary",
        r"heading\s+to\s+cartagena",
    ],
    "medium_intent": [
        r"thinking\s+(?:about|of)\s+(?:going\s+to\s+)?cartagena",
        r"cartagena\s+(?:or|vs)\s+",
        r"should\s+i\s+(?:go\s+to\s+|visit\s+)?cartagena",
        r"cartagena\s+worth\s+(?:it|visiting)",
        r"considering\s+cartagena",
    ],
    "recommendation_seeking": [
        r"recommend(?:ations?)?\s+(?:for\s+)?cartagena",
        r"best\s+(?:restaurants?|hotels?|bars?|clubs?|tours?)\s+(?:in\s+)?cartagena",
        r"where\s+to\s+(?:stay|eat|go)\s+(?:in\s+)?cartagena",
        r"cartagena\s+tips",
        r"cartagena\s+must\s+(?:do|see|visit)",
        r"hidden\s+gems?\s+cartagena",
        r"local\s+(?:spots?|places?)\s+cartagena",
    ],
    "luxury_signals": [
        r"luxury\s+(?:hotel|resort|experience)\s+cartagena",
        r"high.?end\s+cartagena",
        r"private\s+(?:tour|chef|boat|yacht)\s+cartagena",
        r"vip\s+cartagena",
        r"splurge\s+cartagena",
        r"money\s+(?:is\s+)?no\s+object.*cartagena",
        r"amex\s+(?:platinum|centurion).*cartagena",
        r"concierge.*cartagena",
    ],
    "competitor_complaints": [
        r"(?:bad|terrible|awful|worst)\s+experience.*cartagena",
        r"cartagena.*(?:scam|rip.?off|overpriced|disappointed)",
        r"avoid.*cartagena",
        r"warning.*cartagena",
        r"don't\s+(?:go|book|use).*cartagena",
    ],
}

# Subreddits to monitor
REDDIT_TARGETS = [
    "travel",
    "solotravel", 
    "TravelHacks",
    "churning",  # Credit card points people - high spenders
    "awardtravel",  # Points travelers
    "luxury",
    "Shoestring",  # Budget but still planning
    "Colombia",
    "expats",
    "digitalnomad",
    "honeymoonplanning",
    "weddingplanning",  # Destination weddings
]

# Keywords for search
SEARCH_KEYWORDS = [
    "Cartagena Colombia",
    "Cartagena trip",
    "Cartagena travel",
    "Cartagena vacation",
    "Cartagena honeymoon",
    "Cartagena bachelor party",
    "Cartagena recommendations",
]


class IntentSignal(BaseModel):
    """A detected intent signal from the web."""
    id: str
    source: str  # reddit, twitter, tripadvisor, etc.
    url: str
    title: Optional[str] = None
    content: str
    author: Optional[str] = None
    author_url: Optional[str] = None
    
    # Classification
    intent_level: str  # high, medium, low
    intent_types: list[str] = Field(default_factory=list)  # recommendation_seeking, luxury_signals, etc.
    is_complaint: bool = False
    
    # Extracted info
    travel_dates: Optional[str] = None
    party_size: Optional[str] = None
    interests: list[str] = Field(default_factory=list)
    budget_signals: list[str] = Field(default_factory=list)
    
    # Metadata
    posted_at: Optional[datetime] = None
    scraped_at: datetime = Field(default_factory=datetime.utcnow)
    score: Optional[int] = None  # upvotes, likes, etc.
    comment_count: Optional[int] = None


class RedditScraper:
    """
    Reddit intent signal scraper.
    Uses Reddit's JSON endpoints (no auth required for public data).
    """
    
    BASE_URL = "https://www.reddit.com"
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; TravelResearchBot/1.0)",
            },
        )
    
    async def close(self):
        await self.client.aclose()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def search_subreddit(
        self,
        subreddit: str,
        query: str,
        limit: int = 25,
        time_filter: str = "month",  # hour, day, week, month, year, all
    ) -> list[dict]:
        """Search a subreddit for posts matching query."""
        url = f"{self.BASE_URL}/r/{subreddit}/search.json"
        params = {
            "q": query,
            "restrict_sr": "true",
            "sort": "new",
            "t": time_filter,
            "limit": limit,
        }
        
        response = await self.client.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        posts = []
        
        for child in data.get("data", {}).get("children", []):
            post = child.get("data", {})
            posts.append({
                "id": post.get("id"),
                "title": post.get("title"),
                "selftext": post.get("selftext", ""),
                "author": post.get("author"),
                "url": f"{self.BASE_URL}{post.get('permalink', '')}",
                "score": post.get("score", 0),
                "num_comments": post.get("num_comments", 0),
                "created_utc": post.get("created_utc"),
                "subreddit": subreddit,
            })
        
        return posts
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_post_comments(self, post_url: str, limit: int = 50) -> list[dict]:
        """Get comments from a post for deeper intent analysis."""
        url = f"{post_url.rstrip('/')}.json"
        params = {"limit": limit}
        
        response = await self.client.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        comments = []
        
        if len(data) > 1:
            for child in data[1].get("data", {}).get("children", []):
                comment = child.get("data", {})
                if comment.get("body"):
                    comments.append({
                        "id": comment.get("id"),
                        "body": comment.get("body"),
                        "author": comment.get("author"),
                        "score": comment.get("score", 0),
                    })
        
        return comments
    
    async def scan_all_subreddits(
        self,
        keywords: list[str] = None,
        time_filter: str = "week",
        limit_per_sub: int = 15,
    ) -> list[dict]:
        """Scan all target subreddits for intent signals."""
        keywords = keywords or SEARCH_KEYWORDS
        all_posts = []
        
        for subreddit in REDDIT_TARGETS:
            for keyword in keywords[:3]:  # Limit to avoid rate limits
                try:
                    posts = await self.search_subreddit(
                        subreddit, keyword, limit_per_sub, time_filter
                    )
                    all_posts.extend(posts)
                    await asyncio.sleep(2)  # Rate limiting - Reddit is strict
                except Exception as e:
                    print(f"Error scanning r/{subreddit}: {e}")
                    continue
        
        # Dedupe by post ID
        seen = set()
        unique = []
        for post in all_posts:
            if post["id"] not in seen:
                seen.add(post["id"])
                unique.append(post)
        
        return unique


class IntentClassifier:
    """Classify and score intent signals."""
    
    def __init__(self):
        self.patterns = {
            category: [re.compile(p, re.IGNORECASE) for p in patterns]
            for category, patterns in INTENT_PATTERNS.items()
        }
    
    def classify(self, text: str) -> dict:
        """Classify text for intent signals."""
        text_lower = text.lower()
        
        matches = {
            "high_intent": [],
            "medium_intent": [],
            "recommendation_seeking": [],
            "luxury_signals": [],
            "competitor_complaints": [],
        }
        
        for category, patterns in self.patterns.items():
            for pattern in patterns:
                if pattern.search(text):
                    matches[category].append(pattern.pattern)
        
        # Determine overall intent level
        if matches["high_intent"]:
            intent_level = "high"
        elif matches["medium_intent"] or matches["recommendation_seeking"]:
            intent_level = "medium"
        else:
            intent_level = "low"
        
        # Extract travel dates
        travel_dates = self._extract_dates(text)
        
        # Extract party size
        party_size = self._extract_party_size(text)
        
        # Extract interests
        interests = self._extract_interests(text)
        
        # Budget signals
        budget_signals = []
        if matches["luxury_signals"]:
            budget_signals.append("luxury")
        if re.search(r"budget|cheap|affordable|backpack", text_lower):
            budget_signals.append("budget")
        if re.search(r"mid.?range|moderate|reasonable", text_lower):
            budget_signals.append("midrange")
        
        return {
            "intent_level": intent_level,
            "intent_types": [k for k, v in matches.items() if v],
            "is_complaint": bool(matches["competitor_complaints"]),
            "travel_dates": travel_dates,
            "party_size": party_size,
            "interests": interests,
            "budget_signals": budget_signals,
            "matched_patterns": matches,
        }
    
    def _extract_dates(self, text: str) -> Optional[str]:
        """Extract potential travel dates from text."""
        # Month mentions
        months = re.findall(
            r"(?:in\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+\d{4})?",
            text.lower()
        )
        if months:
            return months[0].title()
        
        # Relative dates
        if re.search(r"next\s+(?:week|month)", text.lower()):
            return "next_month"
        if re.search(r"this\s+(?:weekend|week|month)", text.lower()):
            return "this_month"
        
        return None
    
    def _extract_party_size(self, text: str) -> Optional[str]:
        """Extract party size from text."""
        # Direct numbers
        match = re.search(r"(\d+)\s+(?:people|friends|of us|travelers)", text.lower())
        if match:
            return match.group(1)
        
        # Keywords
        if re.search(r"solo|alone|by myself", text.lower()):
            return "1"
        if re.search(r"couple|partner|wife|husband|girlfriend|boyfriend", text.lower()):
            return "2"
        if re.search(r"family|kids|children", text.lower()):
            return "family"
        if re.search(r"group|friends|bachelor|bachelorette", text.lower()):
            return "group"
        
        return None
    
    def _extract_interests(self, text: str) -> list[str]:
        """Extract travel interests from text."""
        interests = []
        interest_patterns = {
            "food": r"food|restaurant|eat|dining|cuisine|gastronomy",
            "nightlife": r"nightlife|club|bar|party|dancing",
            "beach": r"beach|swimming|ocean|sea|coast",
            "culture": r"culture|museum|history|architecture|old\s+town",
            "adventure": r"adventure|diving|snorkeling|kayak|hike",
            "relaxation": r"relax|spa|wellness|massage|peaceful",
            "romance": r"romantic|honeymoon|anniversary|couples",
            "luxury": r"luxury|high.?end|upscale|five\s+star|boutique",
        }
        
        text_lower = text.lower()
        for interest, pattern in interest_patterns.items():
            if re.search(pattern, text_lower):
                interests.append(interest)
        
        return interests


def process_reddit_posts(posts: list[dict]) -> list[IntentSignal]:
    """Process raw Reddit posts into IntentSignal objects."""
    classifier = IntentClassifier()
    signals = []
    
    for post in posts:
        # Combine title and body for analysis
        full_text = f"{post.get('title', '')} {post.get('selftext', '')}"
        
        # Skip if no real content
        if len(full_text.strip()) < 20:
            continue
        
        classification = classifier.classify(full_text)
        
        # Skip low intent unless it's a complaint
        if classification["intent_level"] == "low" and not classification["is_complaint"]:
            continue
        
        signal = IntentSignal(
            id=f"reddit_{post['id']}",
            source="reddit",
            url=post.get("url", ""),
            title=post.get("title"),
            content=post.get("selftext", "")[:1000],
            author=post.get("author"),
            author_url=f"https://reddit.com/u/{post.get('author')}" if post.get("author") else None,
            intent_level=classification["intent_level"],
            intent_types=classification["intent_types"],
            is_complaint=classification["is_complaint"],
            travel_dates=classification["travel_dates"],
            party_size=classification["party_size"],
            interests=classification["interests"],
            budget_signals=classification["budget_signals"],
            posted_at=datetime.fromtimestamp(post.get("created_utc", 0)) if post.get("created_utc") else None,
            score=post.get("score"),
            comment_count=post.get("num_comments"),
        )
        signals.append(signal)
    
    return signals


async def scan_reddit_intent(
    time_filter: str = "week",
    limit_per_sub: int = 15,
) -> list[IntentSignal]:
    """
    Main function to scan Reddit for Cartagena travel intent.
    Returns classified intent signals.
    """
    scraper = RedditScraper()
    try:
        posts = await scraper.scan_all_subreddits(
            keywords=SEARCH_KEYWORDS,
            time_filter=time_filter,
            limit_per_sub=limit_per_sub,
        )
        return process_reddit_posts(posts)
    finally:
        await scraper.close()


# Google Alerts alternative - search Google for recent mentions
class WebMentionScraper:
    """
    Scrape Google search results for recent Cartagena travel discussions.
    Use sparingly - Google blocks aggressive scraping.
    """
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        )
    
    async def close(self):
        await self.client.aclose()
    
    async def search_forums(self, query: str, num_results: int = 20) -> list[dict]:
        """
        Search for forum discussions.
        NOTE: This is rate-limited and may get blocked. Use Google Alerts instead for production.
        """
        # Target forum sites
        site_queries = [
            f'site:tripadvisor.com/ShowTopic "{query}"',
            f'site:reddit.com "{query}"',
            f'site:flyertalk.com "{query}"',
            f'site:lonelyplanet.com/thorntree "{query}"',
        ]
        
        results = []
        # This is a placeholder - actual Google scraping requires more infrastructure
        # For production, use Google Custom Search API or SerpAPI
        
        return results


# Export functions for CLI integration
async def run_intent_scan(
    sources: list[str] = ["reddit"],
    time_filter: str = "week",
    output_file: str = None,
) -> list[IntentSignal]:
    """Run intent signal scan across specified sources."""
    all_signals = []
    
    if "reddit" in sources:
        reddit_signals = await scan_reddit_intent(time_filter=time_filter)
        all_signals.extend(reddit_signals)
    
    # Sort by intent level and recency
    intent_order = {"high": 0, "medium": 1, "low": 2}
    all_signals.sort(
        key=lambda x: (intent_order.get(x.intent_level, 3), -(x.score or 0))
    )
    
    if output_file:
        import json
        with open(output_file, "w") as f:
            json.dump(
                [s.model_dump(mode="json") for s in all_signals],
                f,
                indent=2,
                default=str,
            )
    
    return all_signals


def generate_outreach_from_signal(signal: IntentSignal) -> str:
    """
    Generate a helpful Reddit comment or DM for a travel planning post.
    NOT sales-y. Pure value.
    """
    # This should be genuinely helpful, not promotional
    template = """Hey! I live in Cartagena and saw your post.

{personalized_tip}

{specific_recommendation}

Happy to answer any questions about the area. Have a great trip!"""
    
    # Personalize based on interests
    tips = []
    if "food" in signal.interests:
        tips.append("For food, skip the tourist traps in the walled city center. The best local spots are in Getsemaní.")
    if "nightlife" in signal.interests:
        tips.append("Nightlife is best Thursday-Saturday. Start in Getsemaní, end up in Bocagrande if you want clubs.")
    if "beach" in signal.interests:
        tips.append("City beaches aren't great. Take a boat to Playa Blanca or the Rosario Islands for actual beach days.")
    if "luxury" in signal.budget_signals:
        tips.append("For high-end, look into Sofitel Legend, Casa San Agustín, or the new Four Seasons.")
    
    if signal.party_size == "group":
        tips.append("For groups, book a private boat day. Way better than the party boats IMO.")
    
    personalized = tips[0] if tips else "The old walled city is beautiful but very touristy. Getsemaní has more local flavor."
    
    return template.format(
        personalized_tip=personalized,
        specific_recommendation="",
    )
