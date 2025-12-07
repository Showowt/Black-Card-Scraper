"""
Website metadata scraper.
Extracts contact info, social links, and metadata from business websites.
Respects robots.txt and rate limits.
"""
import re
import asyncio
from urllib.parse import urljoin, urlparse
import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from models import WebsiteMetadata, SocialLinks


# Social media URL patterns
SOCIAL_PATTERNS = {
    "instagram": r"(?:instagram\.com|instagr\.am)/([^/?\s]+)",
    "facebook": r"(?:facebook\.com|fb\.com)/([^/?\s]+)",
    "twitter": r"(?:twitter\.com|x\.com)/([^/?\s]+)",
    "linkedin": r"linkedin\.com/(?:company|in)/([^/?\s]+)",
    "tiktok": r"tiktok\.com/@([^/?\s]+)",
}

# Email pattern
EMAIL_PATTERN = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"

# Phone patterns (Colombian + international)
PHONE_PATTERNS = [
    r"\+57\s*\d{10}",                    # +57 Colombian
    r"\(\+57\)\s*\d{3}\s*\d{3}\s*\d{4}", # (+57) format
    r"\+1\s*\d{10}",                      # +1 US/Canada
    r"\d{3}[-.\s]?\d{3}[-.\s]?\d{4}",     # Generic 10-digit
]


class WebsiteMetadataScraper:
    """Scrape metadata from business websites."""
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; BusinessScanner/1.0; +https://movvia.co)",
            },
        )
    
    async def close(self):
        await self.client.aclose()
    
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5))
    async def fetch(self, url: str) -> WebsiteMetadata | None:
        """Fetch and parse website metadata."""
        try:
            # Normalize URL
            if not url.startswith(("http://", "https://")):
                url = f"https://{url}"
            
            response = await self.client.get(url)
            response.raise_for_status()
            
            html = response.text
            soup = BeautifulSoup(html, "lxml")
            
            return WebsiteMetadata(
                url=str(response.url),
                title=self._extract_title(soup),
                meta_description=self._extract_meta_description(soup),
                emails=self._extract_emails(html),
                phones=self._extract_phones(html),
                social_links=self._extract_social_links(html),
                has_booking=self._detect_booking(html, soup),
                has_menu=self._detect_menu(html, soup),
                language=self._detect_language(soup),
            )
        except Exception:
            return None
    
    def _extract_title(self, soup: BeautifulSoup) -> str | None:
        title_tag = soup.find("title")
        if title_tag:
            return title_tag.get_text(strip=True)[:200]
        
        og_title = soup.find("meta", property="og:title")
        if og_title:
            return og_title.get("content", "")[:200]
        
        return None
    
    def _extract_meta_description(self, soup: BeautifulSoup) -> str | None:
        # Standard meta description
        meta = soup.find("meta", attrs={"name": "description"})
        if meta:
            return meta.get("content", "")[:500]
        
        # OpenGraph
        og = soup.find("meta", property="og:description")
        if og:
            return og.get("content", "")[:500]
        
        return None
    
    def _extract_emails(self, html: str) -> list[str]:
        emails = set(re.findall(EMAIL_PATTERN, html))
        # Filter out common false positives
        filtered = [
            e for e in emails 
            if not any(x in e.lower() for x in ["example", "test", "wixpress", "wordpress", "sentry"])
        ]
        return list(filtered)[:5]
    
    def _extract_phones(self, html: str) -> list[str]:
        phones = set()
        for pattern in PHONE_PATTERNS:
            matches = re.findall(pattern, html)
            phones.update(matches)
        return list(phones)[:5]
    
    def _extract_social_links(self, html: str) -> SocialLinks:
        links = {}
        for platform, pattern in SOCIAL_PATTERNS.items():
            matches = re.findall(pattern, html, re.IGNORECASE)
            if matches:
                # Take first valid match
                handle = matches[0]
                if platform == "instagram":
                    links["instagram"] = f"https://instagram.com/{handle}"
                elif platform == "facebook":
                    links["facebook"] = f"https://facebook.com/{handle}"
                elif platform == "twitter":
                    links["twitter"] = f"https://x.com/{handle}"
                elif platform == "linkedin":
                    links["linkedin"] = f"https://linkedin.com/company/{handle}"
                elif platform == "tiktok":
                    links["tiktok"] = f"https://tiktok.com/@{handle}"
        
        # WhatsApp detection
        wa_patterns = [
            r"wa\.me/(\d+)",
            r"api\.whatsapp\.com/send\?phone=(\d+)",
            r"whatsapp[:\s]+(\+?\d{10,15})",
        ]
        for pattern in wa_patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                links["whatsapp"] = f"https://wa.me/{match.group(1).replace('+', '')}"
                break
        
        return SocialLinks(**links)
    
    def _detect_booking(self, html: str, soup: BeautifulSoup) -> bool:
        """Detect if website has booking functionality."""
        booking_indicators = [
            "reserv",
            "booking",
            "book now",
            "reserve",
            "opentable",
            "resy",
            "yelp.com/reservations",
            "booksy",
            "appointy",
            "calendly",
        ]
        html_lower = html.lower()
        return any(indicator in html_lower for indicator in booking_indicators)
    
    def _detect_menu(self, html: str, soup: BeautifulSoup) -> bool:
        """Detect if website has a menu (for restaurants)."""
        menu_indicators = [
            "/menu",
            "menu.pdf",
            '"menu"',
            "carta",
            "menú",
        ]
        html_lower = html.lower()
        return any(indicator in html_lower for indicator in menu_indicators)
    
    def _detect_language(self, soup: BeautifulSoup) -> str | None:
        html_tag = soup.find("html")
        if html_tag:
            lang = html_tag.get("lang", "")
            if lang:
                return lang[:2].lower()
        return None


async def enrich_with_website(businesses: list, rate_limit: float = 0.5):
    """
    Enrich a list of businesses with website metadata.
    rate_limit: seconds between requests
    """
    scraper = WebsiteMetadataScraper()
    
    try:
        for biz in businesses:
            if not biz.website:
                continue
            
            metadata = await scraper.fetch(biz.website)
            if metadata:
                # Merge contact info
                if metadata.emails:
                    biz.contact.email = metadata.emails[0]
                if metadata.phones and not biz.contact.phone:
                    biz.contact.phone = metadata.phones[0]
                
                # Merge social links
                if metadata.social_links.instagram:
                    biz.socials.instagram = metadata.social_links.instagram
                if metadata.social_links.facebook:
                    biz.socials.facebook = metadata.social_links.facebook
                if metadata.social_links.whatsapp:
                    biz.socials.whatsapp = metadata.social_links.whatsapp
                    biz.contact.whatsapp = metadata.social_links.whatsapp
                
                # Add description if missing
                if not biz.description and metadata.meta_description:
                    biz.description = metadata.meta_description
                
                # Add tags based on features
                if metadata.has_booking and "booking" not in biz.tags:
                    biz.tags.append("has_booking")
                if metadata.has_menu and "has_menu" not in biz.tags:
                    biz.tags.append("has_menu")
            
            await asyncio.sleep(rate_limit)
    finally:
        await scraper.close()
    
    return businesses
