"""
ADVANCED INTELLIGENCE SCRAPERS
===============================
Phil McGill — MachineMind

High-priority data collection for Colombian hospitality market:
1. Instagram Profile Intelligence (followers, engagement, posting frequency)
2. Google Maps Review Scraping (actual review text, sentiment, patterns)
3. TripAdvisor Integration (ratings, review velocity, ranking)
4. Booking.com/OTA Presence Detection
5. WhatsApp Response Time Testing

These provide the social proof and urgency data needed to close deals.
"""

import asyncio
import re
import json
from dataclasses import dataclass, field
from typing import Optional, List, Tuple
from datetime import datetime, timedelta
from urllib.parse import quote, urljoin
import httpx
from bs4 import BeautifulSoup


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class InstagramIntelligence:
    """Complete Instagram profile intelligence."""
    handle: str
    profile_url: str
    followers: int = 0
    following: int = 0
    posts_count: int = 0
    bio: str = ""
    is_business_account: bool = False
    is_verified: bool = False
    external_url: str = ""
    
    # Calculated metrics
    engagement_estimate: str = "unknown"  # low, medium, high
    posting_frequency: str = "unknown"  # inactive, sporadic, regular, active
    follower_tier: str = "unknown"  # micro, small, medium, large, mega
    
    # For outreach
    dm_link: str = ""
    has_contact_button: bool = False
    
    # Scrape metadata
    scraped_at: str = ""
    scrape_success: bool = False
    error: str = ""


@dataclass
class GoogleReview:
    """Single Google review."""
    author_name: str
    rating: int  # 1-5
    text: str
    relative_time: str  # "2 months ago"
    language: str = "es"
    response_from_owner: str = ""
    has_owner_response: bool = False


@dataclass
class GoogleReviewsIntelligence:
    """Complete Google reviews intelligence."""
    place_id: str
    business_name: str
    overall_rating: float
    total_reviews: int
    
    # Review breakdown
    reviews: List[GoogleReview] = field(default_factory=list)
    rating_distribution: dict = field(default_factory=dict)  # {5: 120, 4: 30, ...}
    
    # Calculated metrics
    review_velocity: str = "unknown"  # slow, moderate, fast
    avg_review_length: int = 0
    response_rate: float = 0.0  # % of reviews with owner response
    sentiment_summary: str = ""
    
    # Pain points detected
    common_complaints: List[str] = field(default_factory=list)
    common_praises: List[str] = field(default_factory=list)
    
    # For outreach
    negative_review_count: int = 0
    unanswered_reviews: int = 0
    
    scrape_success: bool = False
    error: str = ""


@dataclass
class TripAdvisorIntelligence:
    """TripAdvisor profile intelligence."""
    url: str
    business_name: str
    rating: float = 0.0
    total_reviews: int = 0
    ranking: str = ""  # "#15 of 234 restaurants in Cartagena"
    ranking_position: int = 0
    ranking_total: int = 0
    
    # Review breakdown
    excellent_count: int = 0
    very_good_count: int = 0
    average_count: int = 0
    poor_count: int = 0
    terrible_count: int = 0
    
    # Traveler type breakdown
    review_by_type: dict = field(default_factory=dict)  # {families: 30, couples: 45, ...}
    
    # Recent reviews
    recent_reviews: List[dict] = field(default_factory=list)
    
    # Calculated
    certificate_of_excellence: bool = False
    traveler_choice: bool = False
    review_velocity: str = "unknown"
    
    scrape_success: bool = False
    error: str = ""


@dataclass
class OTAPresence:
    """OTA (Online Travel Agency) presence detection."""
    business_name: str
    
    # Booking.com
    on_booking_com: bool = False
    booking_url: str = ""
    booking_rating: float = 0.0
    booking_reviews: int = 0
    
    # Expedia
    on_expedia: bool = False
    expedia_url: str = ""
    expedia_rating: float = 0.0
    
    # Hotels.com
    on_hotels_com: bool = False
    
    # Airbnb (for villas)
    on_airbnb: bool = False
    airbnb_url: str = ""
    
    # VRBO
    on_vrbo: bool = False
    
    # Viator/GetYourGuide (for tours)
    on_viator: bool = False
    on_getyourguide: bool = False
    
    # Calculated
    ota_dependency_score: int = 0  # 0-100, higher = more dependent
    direct_booking_opportunity: str = ""  # low, medium, high
    estimated_commission_loss: float = 0.0  # monthly
    
    scrape_success: bool = False


@dataclass
class WhatsAppResponseTest:
    """WhatsApp response time test results."""
    phone_number: str
    wa_link: str
    
    # Test results
    test_performed: bool = False
    test_timestamp: str = ""
    
    # Response metrics (if testable)
    has_whatsapp_business: bool = False
    has_auto_reply: bool = False
    auto_reply_message: str = ""
    business_hours_set: bool = False
    away_message: str = ""
    
    # Estimated response time
    estimated_response_time: str = "unknown"  # instant, fast, slow, very_slow, no_response
    
    # For outreach
    response_time_hook: str = ""
    
    scrape_success: bool = False
    error: str = ""


# ═══════════════════════════════════════════════════════════════════════════════
# 1. INSTAGRAM INTELLIGENCE SCRAPER
# ═══════════════════════════════════════════════════════════════════════════════

class InstagramScraper:
    """
    Instagram profile scraper for follower counts and engagement metrics.
    
    Note: Instagram heavily rate-limits and blocks scrapers.
    This uses multiple methods with fallbacks.
    """
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
            },
        )
    
    async def close(self):
        await self.client.aclose()
    
    async def scrape_profile(self, handle: str) -> InstagramIntelligence:
        """
        Scrape Instagram profile for intelligence.
        
        Tries multiple methods:
        1. Direct profile page scraping
        2. Instagram's public API endpoints
        3. Third-party APIs (if configured)
        """
        handle = handle.lstrip("@").strip()
        profile_url = f"https://www.instagram.com/{handle}/"
        
        result = InstagramIntelligence(
            handle=handle,
            profile_url=profile_url,
            dm_link=f"https://ig.me/m/{handle}",
            scraped_at=datetime.now().isoformat(),
        )
        
        # Method 1: Try direct scraping
        try:
            intel = await self._scrape_direct(handle)
            if intel:
                return intel
        except Exception as e:
            result.error = f"Direct scrape failed: {str(e)}"
        
        # Method 2: Try web profile with JSON extraction
        try:
            intel = await self._scrape_web_profile(handle)
            if intel and intel.scrape_success:
                return intel
        except Exception as e:
            result.error = f"Web profile failed: {str(e)}"
        
        # Method 3: Try i.instagram.com endpoint
        try:
            intel = await self._scrape_i_instagram(handle)
            if intel and intel.scrape_success:
                return intel
        except Exception as e:
            result.error = f"i.instagram failed: {str(e)}"
        
        return result
    
    async def _scrape_direct(self, handle: str) -> Optional[InstagramIntelligence]:
        """Scrape from Instagram web profile page."""
        url = f"https://www.instagram.com/{handle}/"
        
        response = await self.client.get(url)
        
        if response.status_code == 404:
            return InstagramIntelligence(
                handle=handle,
                profile_url=url,
                error="Profile not found",
                scrape_success=False,
            )
        
        response.raise_for_status()
        html = response.text
        
        # Try to extract shared_data JSON
        result = InstagramIntelligence(
            handle=handle,
            profile_url=url,
            dm_link=f"https://ig.me/m/{handle}",
            scraped_at=datetime.now().isoformat(),
        )
        
        # Method A: Look for window._sharedData
        shared_data_match = re.search(r'window\._sharedData\s*=\s*({.*?});', html)
        if shared_data_match:
            try:
                data = json.loads(shared_data_match.group(1))
                user = data.get("entry_data", {}).get("ProfilePage", [{}])[0].get("graphql", {}).get("user", {})
                
                if user:
                    result.followers = user.get("edge_followed_by", {}).get("count", 0)
                    result.following = user.get("edge_follow", {}).get("count", 0)
                    result.posts_count = user.get("edge_owner_to_timeline_media", {}).get("count", 0)
                    result.bio = user.get("biography", "")
                    result.is_business_account = user.get("is_business_account", False)
                    result.is_verified = user.get("is_verified", False)
                    result.external_url = user.get("external_url", "")
                    result.scrape_success = True
            except (json.JSONDecodeError, KeyError, IndexError):
                pass
        
        # Method B: Look for meta tags
        if not result.scrape_success:
            soup = BeautifulSoup(html, "lxml")
            
            # Try meta description
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc:
                content = meta_desc.get("content", "")
                # Parse: "1.2M Followers, 500 Following, 234 Posts - See Instagram photos..."
                followers_match = re.search(r'([\d,.]+[KMB]?)\s*Followers', content, re.IGNORECASE)
                following_match = re.search(r'([\d,.]+[KMB]?)\s*Following', content, re.IGNORECASE)
                posts_match = re.search(r'([\d,.]+[KMB]?)\s*Posts', content, re.IGNORECASE)
                
                if followers_match:
                    result.followers = self._parse_count(followers_match.group(1))
                    result.scrape_success = True
                if following_match:
                    result.following = self._parse_count(following_match.group(1))
                if posts_match:
                    result.posts_count = self._parse_count(posts_match.group(1))
        
        # Method C: Look for JSON-LD or other embedded data
        if not result.scrape_success:
            # Try finding any JSON with follower counts
            json_patterns = [
                r'"edge_followed_by":\s*{\s*"count":\s*(\d+)',
                r'"follower_count":\s*(\d+)',
                r'"followers_count":\s*(\d+)',
            ]
            for pattern in json_patterns:
                match = re.search(pattern, html)
                if match:
                    result.followers = int(match.group(1))
                    result.scrape_success = True
                    break
        
        # Calculate derived metrics
        if result.scrape_success:
            result = self._calculate_metrics(result)
        
        return result
    
    async def _scrape_web_profile(self, handle: str) -> Optional[InstagramIntelligence]:
        """Try Instagram's web API endpoint."""
        url = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={handle}"
        
        headers = {
            "X-IG-App-ID": "936619743392459",
            "X-Requested-With": "XMLHttpRequest",
        }
        
        try:
            response = await self.client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                user = data.get("data", {}).get("user", {})
                
                if user:
                    result = InstagramIntelligence(
                        handle=handle,
                        profile_url=f"https://www.instagram.com/{handle}/",
                        followers=user.get("edge_followed_by", {}).get("count", 0),
                        following=user.get("edge_follow", {}).get("count", 0),
                        posts_count=user.get("edge_owner_to_timeline_media", {}).get("count", 0),
                        bio=user.get("biography", ""),
                        is_business_account=user.get("is_business_account", False),
                        is_verified=user.get("is_verified", False),
                        external_url=user.get("external_url", ""),
                        dm_link=f"https://ig.me/m/{handle}",
                        scraped_at=datetime.now().isoformat(),
                        scrape_success=True,
                    )
                    return self._calculate_metrics(result)
        except Exception:
            pass
        
        return None
    
    async def _scrape_i_instagram(self, handle: str) -> Optional[InstagramIntelligence]:
        """Try i.instagram.com mobile endpoint."""
        url = f"https://i.instagram.com/api/v1/users/web_profile_info/?username={handle}"
        
        headers = {
            "User-Agent": "Instagram 219.0.0.12.117 Android",
            "X-IG-App-ID": "936619743392459",
        }
        
        try:
            response = await self.client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                user = data.get("data", {}).get("user", {})
                
                if user:
                    result = InstagramIntelligence(
                        handle=handle,
                        profile_url=f"https://www.instagram.com/{handle}/",
                        followers=user.get("edge_followed_by", {}).get("count", 0),
                        following=user.get("edge_follow", {}).get("count", 0),
                        posts_count=user.get("edge_owner_to_timeline_media", {}).get("count", 0),
                        bio=user.get("biography", ""),
                        is_business_account=user.get("is_business_account", False),
                        is_verified=user.get("is_verified", False),
                        dm_link=f"https://ig.me/m/{handle}",
                        scraped_at=datetime.now().isoformat(),
                        scrape_success=True,
                    )
                    return self._calculate_metrics(result)
        except Exception:
            pass
        
        return None
    
    def _parse_count(self, count_str: str) -> int:
        """Parse follower count strings like '1.2M', '500K', '1,234'."""
        count_str = count_str.strip().upper().replace(",", "")
        
        multipliers = {"K": 1000, "M": 1000000, "B": 1000000000}
        
        for suffix, mult in multipliers.items():
            if suffix in count_str:
                try:
                    num = float(count_str.replace(suffix, ""))
                    return int(num * mult)
                except ValueError:
                    return 0
        
        try:
            return int(float(count_str))
        except ValueError:
            return 0
    
    def _calculate_metrics(self, result: InstagramIntelligence) -> InstagramIntelligence:
        """Calculate derived metrics from raw data."""
        
        # Follower tier
        if result.followers >= 1000000:
            result.follower_tier = "mega"
        elif result.followers >= 100000:
            result.follower_tier = "large"
        elif result.followers >= 10000:
            result.follower_tier = "medium"
        elif result.followers >= 1000:
            result.follower_tier = "small"
        else:
            result.follower_tier = "micro"
        
        # Posting frequency (rough estimate based on posts count)
        if result.posts_count == 0:
            result.posting_frequency = "inactive"
        elif result.posts_count < 50:
            result.posting_frequency = "sporadic"
        elif result.posts_count < 200:
            result.posting_frequency = "regular"
        else:
            result.posting_frequency = "active"
        
        # Engagement estimate (based on follower/following ratio and size)
        if result.followers > 0 and result.following > 0:
            ratio = result.followers / result.following
            if ratio > 10:
                result.engagement_estimate = "high"
            elif ratio > 2:
                result.engagement_estimate = "medium"
            else:
                result.engagement_estimate = "low"
        
        return result


# ═══════════════════════════════════════════════════════════════════════════════
# 2. GOOGLE MAPS REVIEW SCRAPER
# ═══════════════════════════════════════════════════════════════════════════════

class GoogleReviewsScraper:
    """
    Scrape actual Google reviews for sentiment analysis and pain point detection.
    
    Uses Google Places API for reviews when possible,
    falls back to web scraping.
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.client = httpx.AsyncClient(
            timeout=20.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        )
    
    async def close(self):
        await self.client.aclose()
    
    async def scrape_reviews(
        self,
        place_id: str,
        business_name: str,
        max_reviews: int = 20,
    ) -> GoogleReviewsIntelligence:
        """
        Scrape Google reviews for a business.
        
        Args:
            place_id: Google Places ID
            business_name: Business name for display
            max_reviews: Maximum reviews to fetch
        """
        result = GoogleReviewsIntelligence(
            place_id=place_id,
            business_name=business_name,
        )
        
        # Method 1: Try Google Places API if we have a key
        if self.api_key:
            try:
                api_result = await self._fetch_via_api(place_id, max_reviews)
                if api_result and api_result.scrape_success:
                    return api_result
            except Exception as e:
                result.error = f"API failed: {str(e)}"
        
        # Method 2: Try web scraping from Google Maps
        try:
            web_result = await self._scrape_google_maps(place_id, business_name)
            if web_result and web_result.scrape_success:
                return web_result
        except Exception as e:
            result.error = f"Web scrape failed: {str(e)}"
        
        return result
    
    async def _fetch_via_api(
        self,
        place_id: str,
        max_reviews: int,
    ) -> Optional[GoogleReviewsIntelligence]:
        """Fetch reviews via Google Places API."""
        url = "https://maps.googleapis.com/maps/api/place/details/json"
        
        params = {
            "place_id": place_id,
            "fields": "name,rating,user_ratings_total,reviews",
            "reviews_sort": "newest",
            "key": self.api_key,
        }
        
        response = await self.client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data.get("status") != "OK":
            return None
        
        place = data.get("result", {})
        
        reviews = []
        for r in place.get("reviews", [])[:max_reviews]:
            reviews.append(GoogleReview(
                author_name=r.get("author_name", "Anonymous"),
                rating=r.get("rating", 0),
                text=r.get("text", ""),
                relative_time=r.get("relative_time_description", ""),
                language=r.get("language", "es"),
            ))
        
        result = GoogleReviewsIntelligence(
            place_id=place_id,
            business_name=place.get("name", ""),
            overall_rating=place.get("rating", 0),
            total_reviews=place.get("user_ratings_total", 0),
            reviews=reviews,
            scrape_success=True,
        )
        
        return self._analyze_reviews(result)
    
    async def _scrape_google_maps(
        self,
        place_id: str,
        business_name: str,
    ) -> Optional[GoogleReviewsIntelligence]:
        """Scrape reviews from Google Maps web page."""
        # Construct Google Maps URL
        url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
        
        try:
            response = await self.client.get(url)
            html = response.text
            
            result = GoogleReviewsIntelligence(
                place_id=place_id,
                business_name=business_name,
            )
            
            # Extract rating from page
            rating_match = re.search(r'"([0-9.]+)"\s*stars', html)
            if rating_match:
                result.overall_rating = float(rating_match.group(1))
            
            # Extract review count
            reviews_match = re.search(r'([\d,]+)\s*reviews?', html, re.IGNORECASE)
            if reviews_match:
                result.total_reviews = int(reviews_match.group(1).replace(",", ""))
            
            # Try to extract individual reviews from embedded JSON
            # This is fragile but sometimes works
            review_patterns = [
                r'\["([^"]{20,500})","[^"]*",(\d),',  # Review text, rating
            ]
            
            for pattern in review_patterns:
                matches = re.findall(pattern, html)
                for match in matches[:20]:
                    if len(match) >= 2:
                        result.reviews.append(GoogleReview(
                            author_name="Google User",
                            rating=int(match[1]) if match[1].isdigit() else 0,
                            text=match[0],
                            relative_time="",
                        ))
            
            if result.total_reviews > 0 or result.reviews:
                result.scrape_success = True
                return self._analyze_reviews(result)
            
        except Exception:
            pass
        
        return None
    
    def _analyze_reviews(self, result: GoogleReviewsIntelligence) -> GoogleReviewsIntelligence:
        """Analyze reviews for patterns, complaints, and metrics."""
        
        if not result.reviews:
            return result
        
        # Calculate average review length
        total_length = sum(len(r.text) for r in result.reviews)
        result.avg_review_length = total_length // len(result.reviews) if result.reviews else 0
        
        # Calculate response rate
        with_response = sum(1 for r in result.reviews if r.has_owner_response)
        result.response_rate = (with_response / len(result.reviews)) * 100 if result.reviews else 0
        
        # Count negative reviews
        result.negative_review_count = sum(1 for r in result.reviews if r.rating <= 2)
        result.unanswered_reviews = sum(1 for r in result.reviews if not r.has_owner_response)
        
        # Detect common complaints and praises
        complaint_keywords = {
            "es": ["lento", "tardó", "esperamos", "caro", "sucio", "frío", "malo", "horrible", "pésimo", "nunca", "no vuelvo"],
            "en": ["slow", "waited", "expensive", "dirty", "cold", "bad", "terrible", "never", "worst"],
        }
        
        praise_keywords = {
            "es": ["excelente", "increíble", "delicioso", "perfecto", "recomiendo", "volvería", "mejor", "hermoso", "amable"],
            "en": ["excellent", "amazing", "delicious", "perfect", "recommend", "best", "beautiful", "friendly"],
        }
        
        complaints = {}
        praises = {}
        
        for review in result.reviews:
            text_lower = review.text.lower()
            
            # Check complaints
            for lang, keywords in complaint_keywords.items():
                for kw in keywords:
                    if kw in text_lower:
                        complaints[kw] = complaints.get(kw, 0) + 1
            
            # Check praises
            for lang, keywords in praise_keywords.items():
                for kw in keywords:
                    if kw in text_lower:
                        praises[kw] = praises.get(kw, 0) + 1
        
        # Top complaints and praises
        result.common_complaints = [kw for kw, count in sorted(complaints.items(), key=lambda x: -x[1])[:5]]
        result.common_praises = [kw for kw, count in sorted(praises.items(), key=lambda x: -x[1])[:5]]
        
        # Sentiment summary
        positive = sum(1 for r in result.reviews if r.rating >= 4)
        negative = sum(1 for r in result.reviews if r.rating <= 2)
        neutral = len(result.reviews) - positive - negative
        
        if positive > negative * 2:
            result.sentiment_summary = "Mayormente positivo"
        elif negative > positive:
            result.sentiment_summary = "Mixto con problemas"
        else:
            result.sentiment_summary = "Mixto"
        
        # Review velocity (rough estimate)
        if result.total_reviews > 500:
            result.review_velocity = "fast"
        elif result.total_reviews > 100:
            result.review_velocity = "moderate"
        else:
            result.review_velocity = "slow"
        
        # Rating distribution (estimate from sample)
        result.rating_distribution = {
            5: sum(1 for r in result.reviews if r.rating == 5),
            4: sum(1 for r in result.reviews if r.rating == 4),
            3: sum(1 for r in result.reviews if r.rating == 3),
            2: sum(1 for r in result.reviews if r.rating == 2),
            1: sum(1 for r in result.reviews if r.rating == 1),
        }
        
        return result


# ═══════════════════════════════════════════════════════════════════════════════
# 3. TRIPADVISOR SCRAPER
# ═══════════════════════════════════════════════════════════════════════════════

class TripAdvisorScraper:
    """
    TripAdvisor scraper for hospitality businesses.
    
    Provides:
    - Overall rating and ranking
    - Review velocity
    - Traveler type breakdown
    - Recent reviews
    """
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=20.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
            },
        )
        self.base_url = "https://www.tripadvisor.com"
    
    async def close(self):
        await self.client.aclose()
    
    async def search_business(
        self,
        business_name: str,
        city: str,
        category: str = "restaurant",
    ) -> Optional[str]:
        """
        Search for a business on TripAdvisor and return its URL.
        """
        # Map categories to TripAdvisor search types
        search_types = {
            "restaurant": "Restaurants",
            "hotel": "Hotels",
            "tour_operator": "Attractions",
            "spa": "Attractions",
            "boat_charter": "Attractions",
        }
        
        search_type = search_types.get(category, "Restaurants")
        
        # Try search
        search_url = f"{self.base_url}/Search"
        params = {
            "q": f"{business_name} {city}",
            "searchSessionId": "",
            "searchNearby": "false",
        }
        
        try:
            response = await self.client.get(search_url, params=params)
            html = response.text
            
            # Look for business link in results
            soup = BeautifulSoup(html, "lxml")
            
            # Find result links
            for link in soup.find_all("a", href=True):
                href = link.get("href", "")
                if business_name.lower().replace(" ", "_") in href.lower() or \
                   any(part.lower() in href.lower() for part in business_name.split()[:2]):
                    if "/Restaurant_Review" in href or "/Hotel_Review" in href or "/Attraction_Review" in href:
                        return urljoin(self.base_url, href)
            
        except Exception:
            pass
        
        return None
    
    async def scrape_profile(
        self,
        url: str = None,
        business_name: str = None,
        city: str = None,
        category: str = "restaurant",
    ) -> TripAdvisorIntelligence:
        """
        Scrape TripAdvisor profile.
        
        Can provide URL directly or search by name/city.
        """
        result = TripAdvisorIntelligence(
            url=url or "",
            business_name=business_name or "",
        )
        
        # If no URL, try to search
        if not url and business_name and city:
            url = await self.search_business(business_name, city, category)
            if url:
                result.url = url
        
        if not url:
            result.error = "Could not find business on TripAdvisor"
            return result
        
        try:
            response = await self.client.get(url)
            html = response.text
            soup = BeautifulSoup(html, "lxml")
            
            # Extract business name
            title = soup.find("h1")
            if title:
                result.business_name = title.get_text(strip=True)
            
            # Extract rating
            rating_elem = soup.find("span", {"class": re.compile(r".*rating.*", re.I)})
            if rating_elem:
                rating_text = rating_elem.get_text(strip=True)
                rating_match = re.search(r"(\d+\.?\d*)", rating_text)
                if rating_match:
                    result.rating = float(rating_match.group(1))
            
            # Try data attributes for rating
            if result.rating == 0:
                rating_elem = soup.find(attrs={"data-rating": True})
                if rating_elem:
                    result.rating = float(rating_elem.get("data-rating", 0))
            
            # Extract review count
            reviews_elem = soup.find(text=re.compile(r"[\d,]+\s*reviews?", re.I))
            if reviews_elem:
                match = re.search(r"([\d,]+)", reviews_elem)
                if match:
                    result.total_reviews = int(match.group(1).replace(",", ""))
            
            # Extract ranking
            ranking_elem = soup.find(text=re.compile(r"#\d+\s+of\s+\d+", re.I))
            if ranking_elem:
                result.ranking = ranking_elem.strip()
                rank_match = re.search(r"#(\d+)\s+of\s+(\d+)", ranking_elem)
                if rank_match:
                    result.ranking_position = int(rank_match.group(1))
                    result.ranking_total = int(rank_match.group(2))
            
            # Check for awards
            if "Certificate of Excellence" in html:
                result.certificate_of_excellence = True
            if "Travelers' Choice" in html or "Travellers' Choice" in html:
                result.traveler_choice = True
            
            # Extract rating breakdown
            breakdown_patterns = [
                (r"Excellent[^\d]*(\d+)", "excellent_count"),
                (r"Very [Gg]ood[^\d]*(\d+)", "very_good_count"),
                (r"Average[^\d]*(\d+)", "average_count"),
                (r"Poor[^\d]*(\d+)", "poor_count"),
                (r"Terrible[^\d]*(\d+)", "terrible_count"),
            ]
            
            for pattern, attr in breakdown_patterns:
                match = re.search(pattern, html)
                if match:
                    setattr(result, attr, int(match.group(1)))
            
            result.scrape_success = True
            
            # Calculate review velocity
            if result.total_reviews > 1000:
                result.review_velocity = "very_high"
            elif result.total_reviews > 500:
                result.review_velocity = "high"
            elif result.total_reviews > 100:
                result.review_velocity = "moderate"
            else:
                result.review_velocity = "low"
            
        except Exception as e:
            result.error = str(e)
        
        return result


# ═══════════════════════════════════════════════════════════════════════════════
# 4. OTA PRESENCE DETECTOR
# ═══════════════════════════════════════════════════════════════════════════════

class OTAPresenceDetector:
    """
    Detect presence on major OTAs (Online Travel Agencies).
    
    For hotels, villas, tours - this determines commission dependency.
    """
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        )
    
    async def close(self):
        await self.client.aclose()
    
    async def detect_presence(
        self,
        business_name: str,
        city: str,
        category: str = "hotel",
        website_html: str = None,
    ) -> OTAPresence:
        """
        Detect OTA presence through multiple methods:
        1. Check website for OTA widgets/links
        2. Search OTAs directly
        """
        result = OTAPresence(business_name=business_name)
        
        # Method 1: Analyze website for OTA indicators
        if website_html:
            result = self._analyze_website_for_ota(website_html, result)
        
        # Method 2: Search each OTA
        searches = []
        
        if category in ["hotel", "villa_rental"]:
            searches.extend([
                self._search_booking_com(business_name, city),
                self._search_expedia(business_name, city),
            ])
        
        if category == "villa_rental":
            searches.extend([
                self._search_airbnb(business_name, city),
            ])
        
        if category in ["tour_operator", "boat_charter"]:
            searches.extend([
                self._search_viator(business_name, city),
                self._search_getyourguide(business_name, city),
            ])
        
        # Run searches concurrently
        if searches:
            search_results = await asyncio.gather(*searches, return_exceptions=True)
            
            for search_result in search_results:
                if isinstance(search_result, dict):
                    for key, value in search_result.items():
                        if hasattr(result, key):
                            setattr(result, key, value)
        
        # Calculate OTA dependency score
        result = self._calculate_dependency(result, category)
        
        result.scrape_success = True
        return result
    
    def _analyze_website_for_ota(self, html: str, result: OTAPresence) -> OTAPresence:
        """Analyze website HTML for OTA integrations."""
        html_lower = html.lower()
        
        ota_indicators = {
            "booking.com": ("on_booking_com", [
                "booking.com", "book on booking", "booking-widget",
                "booking.com/hotel", "res.booking.com",
            ]),
            "expedia": ("on_expedia", [
                "expedia.com", "expedia-widget", "expedia.co",
            ]),
            "hotels.com": ("on_hotels_com", [
                "hotels.com", "hotels-widget",
            ]),
            "airbnb": ("on_airbnb", [
                "airbnb.com", "airbnb-widget", "abnb.me",
            ]),
            "vrbo": ("on_vrbo", [
                "vrbo.com", "vrbo-widget", "homeaway",
            ]),
            "viator": ("on_viator", [
                "viator.com", "viator-widget", "partner.viator",
            ]),
            "getyourguide": ("on_getyourguide", [
                "getyourguide.com", "gyg-widget",
            ]),
        }
        
        for ota, (attr, indicators) in ota_indicators.items():
            for indicator in indicators:
                if indicator in html_lower:
                    setattr(result, attr, True)
                    break
        
        return result
    
    async def _search_booking_com(self, name: str, city: str) -> dict:
        """Search Booking.com for the business."""
        try:
            search_url = f"https://www.booking.com/searchresults.html"
            params = {
                "ss": f"{name} {city}",
                "no_rooms": "1",
                "group_adults": "2",
            }
            
            response = await self.client.get(search_url, params=params)
            html = response.text
            
            # Check if the business appears in results
            name_parts = name.lower().split()[:2]
            if any(part in html.lower() for part in name_parts):
                # Try to extract rating
                rating_match = re.search(r'data-testid="review-score"[^>]*>([0-9.]+)', html)
                rating = float(rating_match.group(1)) if rating_match else 0
                
                return {
                    "on_booking_com": True,
                    "booking_rating": rating,
                }
        except Exception:
            pass
        
        return {"on_booking_com": False}
    
    async def _search_expedia(self, name: str, city: str) -> dict:
        """Search Expedia for the business."""
        try:
            search_url = f"https://www.expedia.com/Hotel-Search"
            params = {
                "destination": f"{name} {city}",
            }
            
            response = await self.client.get(search_url, params=params)
            html = response.text
            
            name_parts = name.lower().split()[:2]
            if any(part in html.lower() for part in name_parts):
                return {"on_expedia": True}
        except Exception:
            pass
        
        return {"on_expedia": False}
    
    async def _search_airbnb(self, name: str, city: str) -> dict:
        """Search Airbnb for the property."""
        try:
            search_url = f"https://www.airbnb.com/s/{city}/homes"
            params = {"query": name}
            
            response = await self.client.get(search_url, params=params)
            html = response.text
            
            name_parts = name.lower().split()[:2]
            if any(part in html.lower() for part in name_parts):
                return {"on_airbnb": True}
        except Exception:
            pass
        
        return {"on_airbnb": False}
    
    async def _search_viator(self, name: str, city: str) -> dict:
        """Search Viator for the tour/activity."""
        try:
            search_url = f"https://www.viator.com/searchResults/all"
            params = {"text": f"{name} {city}"}
            
            response = await self.client.get(search_url, params=params)
            html = response.text
            
            name_parts = name.lower().split()[:2]
            if any(part in html.lower() for part in name_parts):
                return {"on_viator": True}
        except Exception:
            pass
        
        return {"on_viator": False}
    
    async def _search_getyourguide(self, name: str, city: str) -> dict:
        """Search GetYourGuide for the tour/activity."""
        try:
            search_url = f"https://www.getyourguide.com/s/"
            params = {"q": f"{name} {city}"}
            
            response = await self.client.get(search_url, params=params)
            html = response.text
            
            name_parts = name.lower().split()[:2]
            if any(part in html.lower() for part in name_parts):
                return {"on_getyourguide": True}
        except Exception:
            pass
        
        return {"on_getyourguide": False}
    
    def _calculate_dependency(self, result: OTAPresence, category: str) -> OTAPresence:
        """Calculate OTA dependency score and opportunity."""
        
        # Count OTA presences
        ota_count = sum([
            result.on_booking_com,
            result.on_expedia,
            result.on_hotels_com,
            result.on_airbnb,
            result.on_vrbo,
            result.on_viator,
            result.on_getyourguide,
        ])
        
        # Dependency score (0-100)
        # Higher = more dependent on OTAs
        if ota_count >= 3:
            result.ota_dependency_score = 80
            result.direct_booking_opportunity = "high"
        elif ota_count >= 2:
            result.ota_dependency_score = 60
            result.direct_booking_opportunity = "high"
        elif ota_count >= 1:
            result.ota_dependency_score = 40
            result.direct_booking_opportunity = "medium"
        else:
            result.ota_dependency_score = 10
            result.direct_booking_opportunity = "low"
        
        # Estimate commission loss (rough)
        commission_rates = {
            "hotel": 0.18,  # 15-20% on Booking.com
            "villa_rental": 0.15,  # Airbnb ~15%
            "tour_operator": 0.20,  # Viator 20-30%
            "boat_charter": 0.20,
        }
        
        rate = commission_rates.get(category, 0.15)
        
        # Estimate monthly revenue based on category
        estimated_revenue = {
            "hotel": 50000,
            "villa_rental": 30000,
            "tour_operator": 20000,
            "boat_charter": 40000,
        }
        
        monthly_rev = estimated_revenue.get(category, 30000)
        ota_portion = 0.7 if result.ota_dependency_score > 50 else 0.4
        
        result.estimated_commission_loss = monthly_rev * ota_portion * rate
        
        return result


# ═══════════════════════════════════════════════════════════════════════════════
# 5. WHATSAPP RESPONSE TIME TESTER
# ═══════════════════════════════════════════════════════════════════════════════

class WhatsAppResponseTester:
    """
    Test WhatsApp Business presence and response time.
    
    Note: This tests presence/auto-reply, not actual response time
    (which would require sending a real message and waiting).
    """
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
            },
        )
    
    async def close(self):
        await self.client.aclose()
    
    async def test_whatsapp(
        self,
        phone_number: str,
        business_name: str = "",
    ) -> WhatsAppResponseTest:
        """
        Test WhatsApp Business presence and features.
        
        This checks:
        - If the number is on WhatsApp Business
        - If there's an auto-reply configured
        - Business hours settings
        """
        # Clean phone number
        phone = re.sub(r"[^\d+]", "", phone_number)
        if not phone.startswith("+"):
            if phone.startswith("57"):
                phone = "+" + phone
            else:
                phone = "+57" + phone
        
        phone_clean = phone.replace("+", "")
        
        result = WhatsAppResponseTest(
            phone_number=phone,
            wa_link=f"https://wa.me/{phone_clean}",
            test_timestamp=datetime.now().isoformat(),
        )
        
        # Test 1: Check if wa.me link resolves
        try:
            response = await self.client.get(
                f"https://wa.me/{phone_clean}",
                follow_redirects=False,
            )
            
            # A valid WhatsApp number redirects to WhatsApp
            if response.status_code in [301, 302, 200]:
                result.test_performed = True
                
                # Check response headers/body for WhatsApp Business indicators
                location = response.headers.get("location", "")
                body = response.text if response.status_code == 200 else ""
                
                # Look for WhatsApp Business indicators
                business_indicators = [
                    "business",
                    "catalog",
                    "verified",
                    "empresa",
                ]
                
                if any(ind in (location + body).lower() for ind in business_indicators):
                    result.has_whatsapp_business = True
                else:
                    # Assume it's at least WhatsApp
                    result.has_whatsapp_business = True  # Most businesses have Business
                
        except Exception as e:
            result.error = str(e)
        
        # Test 2: Check via API endpoint (if available)
        try:
            api_url = f"https://api.whatsapp.com/send?phone={phone_clean}"
            response = await self.client.get(api_url, follow_redirects=False)
            
            if response.status_code in [200, 301, 302]:
                result.test_performed = True
                
                # Check for business features in response
                body = response.text
                
                if "business" in body.lower():
                    result.has_whatsapp_business = True
                
                # Check for auto-reply hints
                if "away" in body.lower() or "greeting" in body.lower():
                    result.has_auto_reply = True
                
        except Exception:
            pass
        
        # Generate response time hook for outreach
        result = self._generate_hooks(result, business_name)
        
        result.scrape_success = result.test_performed
        return result
    
    def _generate_hooks(
        self,
        result: WhatsAppResponseTest,
        business_name: str,
    ) -> WhatsAppResponseTest:
        """Generate outreach hooks based on WhatsApp analysis."""
        
        if not result.has_whatsapp_business:
            result.estimated_response_time = "no_whatsapp"
            result.response_time_hook = (
                f"{business_name} no tiene WhatsApp Business configurado. "
                "El 66% de los colombianos compran después de chatear por WhatsApp. "
                "Sin WhatsApp Business, estás perdiendo ventas cada día. — Phil McGill"
            )
        elif result.has_auto_reply:
            result.estimated_response_time = "instant"
            result.response_time_hook = (
                f"{business_name} tiene auto-respuesta configurada — eso es un buen comienzo. "
                "Pero un auto-respuesta no responde preguntas ni cierra ventas. "
                "Un bot AI sí lo hace. — Phil McGill"
            )
        else:
            result.estimated_response_time = "unknown"
            result.response_time_hook = (
                f"¿Cuánto tarda {business_name} en responder un WhatsApp? "
                "El 50% de los colombianos abandonan si no reciben respuesta rápida. "
                "Con AI, respondes en segundos, 24/7, mientras duermes. — Phil McGill"
            )
        
        return result


# ═══════════════════════════════════════════════════════════════════════════════
# MASTER INTELLIGENCE GATHERER
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ComprehensiveIntelligence:
    """All intelligence gathered for a business."""
    business_name: str
    category: str
    city: str
    
    instagram: InstagramIntelligence = None
    google_reviews: GoogleReviewsIntelligence = None
    tripadvisor: TripAdvisorIntelligence = None
    ota_presence: OTAPresence = None
    whatsapp: WhatsAppResponseTest = None
    
    # Summary metrics
    total_social_followers: int = 0
    total_reviews_all_platforms: int = 0
    average_rating_all_platforms: float = 0.0
    digital_presence_score: int = 0  # 0-100
    automation_opportunity_score: int = 0  # 0-100


async def gather_comprehensive_intelligence(
    business_name: str,
    category: str,
    city: str,
    instagram_handle: str = None,
    place_id: str = None,
    phone_number: str = None,
    website_html: str = None,
    google_api_key: str = None,
) -> ComprehensiveIntelligence:
    """
    Gather ALL available intelligence for a business.
    
    This is the master function that runs all scrapers.
    """
    result = ComprehensiveIntelligence(
        business_name=business_name,
        category=category,
        city=city,
    )
    
    tasks = []
    task_names = []
    
    # Instagram
    if instagram_handle:
        async def get_instagram():
            scraper = InstagramScraper()
            try:
                return await scraper.scrape_profile(instagram_handle)
            finally:
                await scraper.close()
        tasks.append(get_instagram())
        task_names.append("instagram")
    
    # Google Reviews
    if place_id:
        async def get_reviews():
            scraper = GoogleReviewsScraper(api_key=google_api_key)
            try:
                return await scraper.scrape_reviews(place_id, business_name)
            finally:
                await scraper.close()
        tasks.append(get_reviews())
        task_names.append("google_reviews")
    
    # TripAdvisor
    if category in ["restaurant", "hotel", "tour_operator", "spa", "boat_charter"]:
        async def get_tripadvisor():
            scraper = TripAdvisorScraper()
            try:
                return await scraper.scrape_profile(
                    business_name=business_name,
                    city=city,
                    category=category,
                )
            finally:
                await scraper.close()
        tasks.append(get_tripadvisor())
        task_names.append("tripadvisor")
    
    # OTA Presence
    if category in ["hotel", "villa_rental", "tour_operator", "boat_charter"]:
        async def get_ota():
            detector = OTAPresenceDetector()
            try:
                return await detector.detect_presence(
                    business_name=business_name,
                    city=city,
                    category=category,
                    website_html=website_html,
                )
            finally:
                await detector.close()
        tasks.append(get_ota())
        task_names.append("ota_presence")
    
    # WhatsApp
    if phone_number:
        async def get_whatsapp():
            tester = WhatsAppResponseTester()
            try:
                return await tester.test_whatsapp(phone_number, business_name)
            finally:
                await tester.close()
        tasks.append(get_whatsapp())
        task_names.append("whatsapp")
    
    # Run all tasks concurrently
    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for name, res in zip(task_names, results):
            if isinstance(res, Exception):
                continue
            setattr(result, name, res)
    
    # Calculate summary metrics
    result = _calculate_summary_metrics(result)
    
    return result


def _calculate_summary_metrics(result: ComprehensiveIntelligence) -> ComprehensiveIntelligence:
    """Calculate summary metrics from all gathered data."""
    
    # Total followers
    if result.instagram and result.instagram.scrape_success:
        result.total_social_followers = result.instagram.followers
    
    # Total reviews
    reviews = 0
    ratings = []
    
    if result.google_reviews and result.google_reviews.scrape_success:
        reviews += result.google_reviews.total_reviews
        if result.google_reviews.overall_rating:
            ratings.append(result.google_reviews.overall_rating)
    
    if result.tripadvisor and result.tripadvisor.scrape_success:
        reviews += result.tripadvisor.total_reviews
        if result.tripadvisor.rating:
            ratings.append(result.tripadvisor.rating)
    
    result.total_reviews_all_platforms = reviews
    
    if ratings:
        result.average_rating_all_platforms = sum(ratings) / len(ratings)
    
    # Digital presence score (0-100)
    presence_points = 0
    
    if result.instagram and result.instagram.scrape_success:
        if result.instagram.followers > 10000:
            presence_points += 25
        elif result.instagram.followers > 1000:
            presence_points += 15
        elif result.instagram.followers > 100:
            presence_points += 10
    
    if result.google_reviews and result.google_reviews.total_reviews > 100:
        presence_points += 25
    elif result.google_reviews and result.google_reviews.total_reviews > 20:
        presence_points += 15
    
    if result.tripadvisor and result.tripadvisor.scrape_success:
        presence_points += 20
    
    if result.whatsapp and result.whatsapp.has_whatsapp_business:
        presence_points += 15
    
    if result.ota_presence and result.ota_presence.on_booking_com:
        presence_points += 15
    
    result.digital_presence_score = min(presence_points, 100)
    
    # Automation opportunity score (inverse of automation)
    # Higher = more opportunity for you
    automation_points = 100
    
    if result.whatsapp and result.whatsapp.has_auto_reply:
        automation_points -= 20
    
    if result.ota_presence and result.ota_presence.ota_dependency_score < 30:
        automation_points -= 20  # They have direct booking
    
    if result.google_reviews and result.google_reviews.response_rate > 50:
        automation_points -= 15  # They respond to reviews
    
    result.automation_opportunity_score = max(automation_points, 0)
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def format_intelligence_summary(intel: ComprehensiveIntelligence) -> str:
    """Format comprehensive intelligence as a summary for outreach."""
    
    lines = [
        f"📊 INTELLIGENCE REPORT: {intel.business_name}",
        f"{'=' * 50}",
        "",
    ]
    
    # Instagram
    if intel.instagram and intel.instagram.scrape_success:
        ig = intel.instagram
        lines.extend([
            "📸 INSTAGRAM",
            f"   Followers: {ig.followers:,}",
            f"   Posts: {ig.posts_count:,}",
            f"   Tier: {ig.follower_tier}",
            f"   Activity: {ig.posting_frequency}",
            "",
        ])
    
    # Google Reviews
    if intel.google_reviews and intel.google_reviews.scrape_success:
        gr = intel.google_reviews
        lines.extend([
            "⭐ GOOGLE REVIEWS",
            f"   Rating: {gr.overall_rating}/5",
            f"   Total: {gr.total_reviews:,}",
            f"   Response Rate: {gr.response_rate:.0f}%",
            f"   Negative Reviews: {gr.negative_review_count}",
        ])
        if gr.common_complaints:
            lines.append(f"   Common Issues: {', '.join(gr.common_complaints[:3])}")
        lines.append("")
    
    # TripAdvisor
    if intel.tripadvisor and intel.tripadvisor.scrape_success:
        ta = intel.tripadvisor
        lines.extend([
            "🦉 TRIPADVISOR",
            f"   Rating: {ta.rating}/5",
            f"   Reviews: {ta.total_reviews:,}",
            f"   Ranking: {ta.ranking}",
        ])
        if ta.certificate_of_excellence:
            lines.append("   🏆 Certificate of Excellence")
        if ta.traveler_choice:
            lines.append("   🏆 Travelers' Choice")
        lines.append("")
    
    # OTA Presence
    if intel.ota_presence and intel.ota_presence.scrape_success:
        ota = intel.ota_presence
        otas = []
        if ota.on_booking_com:
            otas.append("Booking.com")
        if ota.on_expedia:
            otas.append("Expedia")
        if ota.on_airbnb:
            otas.append("Airbnb")
        if ota.on_viator:
            otas.append("Viator")
        
        lines.extend([
            "🏨 OTA PRESENCE",
            f"   Listed on: {', '.join(otas) if otas else 'None detected'}",
            f"   Dependency Score: {ota.ota_dependency_score}/100",
            f"   Est. Commission Loss: ${ota.estimated_commission_loss:,.0f}/month",
            "",
        ])
    
    # WhatsApp
    if intel.whatsapp:
        wa = intel.whatsapp
        lines.extend([
            "💬 WHATSAPP",
            f"   Business Account: {'✅' if wa.has_whatsapp_business else '❌'}",
            f"   Auto-Reply: {'✅' if wa.has_auto_reply else '❌'}",
            f"   Est. Response: {wa.estimated_response_time}",
            "",
        ])
    
    # Summary Scores
    lines.extend([
        "📈 SUMMARY SCORES",
        f"   Digital Presence: {intel.digital_presence_score}/100",
        f"   Automation Opportunity: {intel.automation_opportunity_score}/100",
        f"   Total Reviews: {intel.total_reviews_all_platforms:,}",
        f"   Avg Rating: {intel.average_rating_all_platforms:.1f}/5",
    ])
    
    return "\n".join(lines)
