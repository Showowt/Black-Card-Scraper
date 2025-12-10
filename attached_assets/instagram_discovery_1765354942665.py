"""
INSTAGRAM DISCOVERY ENGINE
===========================
Phil McGill — MachineMind

Problem: Businesses don't always have their Instagram on their website or Google listing.
Solution: Search MULTIPLE sources to find and validate the correct Instagram handle.

Sources:
1. Google Search ("[business name] [city] instagram")
2. Business website scraping (multiple patterns)
3. Facebook page (often links to Instagram)
4. Google Maps data
5. TripAdvisor (sometimes has social links)
6. Direct Instagram search

Validation:
- Check if handle exists
- Check if bio/name matches business
- Check if location matches
- Confidence scoring
"""

import asyncio
import re
import json
from dataclasses import dataclass, field
from typing import Optional, List, Tuple
from urllib.parse import quote, urlparse, parse_qs
import httpx
from bs4 import BeautifulSoup


@dataclass
class InstagramCandidate:
    """A potential Instagram handle found during discovery."""
    handle: str
    source: str  # Where we found it
    confidence: float  # 0.0 - 1.0
    profile_url: str = ""
    validation_notes: str = ""
    
    # Validation data (if we could fetch profile)
    followers: int = 0
    bio: str = ""
    full_name: str = ""
    is_verified: bool = False
    is_business: bool = False
    external_url: str = ""


@dataclass 
class InstagramDiscoveryResult:
    """Complete Instagram discovery result for a business."""
    business_name: str
    city: str
    
    # Best match
    best_match: Optional[InstagramCandidate] = None
    
    # All candidates found
    all_candidates: List[InstagramCandidate] = field(default_factory=list)
    
    # Discovery metadata
    sources_checked: List[str] = field(default_factory=list)
    discovery_successful: bool = False
    error: str = ""


class InstagramDiscoveryEngine:
    """
    Multi-source Instagram handle discovery.
    
    Searches everywhere to find the correct Instagram for a business.
    """
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
            },
        )
        
        # Instagram handle patterns
        self.ig_patterns = [
            # Full URLs
            r'(?:https?://)?(?:www\.)?instagram\.com/([a-zA-Z0-9_.]+)/?',
            r'(?:https?://)?(?:www\.)?instagr\.am/([a-zA-Z0-9_.]+)/?',
            # @ mentions
            r'@([a-zA-Z0-9_.]{1,30})(?:\s|$|[,.])',
            # Instagram: handle format
            r'[Ii]nstagram[:\s]+@?([a-zA-Z0-9_.]+)',
            r'[Ii]G[:\s]+@?([a-zA-Z0-9_.]+)',
            # href patterns
            r'href=["\'](?:https?://)?(?:www\.)?instagram\.com/([a-zA-Z0-9_.]+)',
        ]
        
        # Common false positives to filter
        self.false_positives = {
            'instagram', 'explore', 'p', 'reel', 'reels', 'stories', 'story',
            'accounts', 'login', 'signup', 'about', 'legal', 'privacy',
            'terms', 'help', 'support', 'developer', 'blog', 'press',
            'jobs', 'careers', 'api', 'share', 'direct', 'tv', 'igtv',
        }
    
    async def close(self):
        await self.client.aclose()
    
    async def discover(
        self,
        business_name: str,
        city: str,
        country: str = "Colombia",
        website_url: str = None,
        facebook_url: str = None,
        google_maps_url: str = None,
        existing_candidates: List[str] = None,
    ) -> InstagramDiscoveryResult:
        """
        Discover Instagram handle for a business using all available sources.
        
        Args:
            business_name: Name of the business
            city: City where business is located
            country: Country (default Colombia)
            website_url: Business website if known
            facebook_url: Facebook page if known
            google_maps_url: Google Maps URL if known
            existing_candidates: Any handles already found to validate
        """
        result = InstagramDiscoveryResult(
            business_name=business_name,
            city=city,
        )
        
        candidates = []
        
        # Add any existing candidates first
        if existing_candidates:
            for handle in existing_candidates:
                handle_clean = self._clean_handle(handle)
                if handle_clean:
                    candidates.append(InstagramCandidate(
                        handle=handle_clean,
                        source="existing_data",
                        confidence=0.5,  # Medium - needs validation
                        profile_url=f"https://instagram.com/{handle_clean}",
                    ))
        
        # Source 1: Google Search
        try:
            google_candidates = await self._search_google(business_name, city, country)
            candidates.extend(google_candidates)
            result.sources_checked.append("google_search")
        except Exception as e:
            result.sources_checked.append(f"google_search (failed: {str(e)[:30]})")
        
        # Source 2: Business Website
        if website_url:
            try:
                website_candidates = await self._search_website(website_url, business_name)
                candidates.extend(website_candidates)
                result.sources_checked.append("business_website")
            except Exception as e:
                result.sources_checked.append(f"business_website (failed: {str(e)[:30]})")
        
        # Source 3: Facebook Page
        if facebook_url:
            try:
                fb_candidates = await self._search_facebook(facebook_url)
                candidates.extend(fb_candidates)
                result.sources_checked.append("facebook_page")
            except Exception as e:
                result.sources_checked.append(f"facebook_page (failed: {str(e)[:30]})")
        
        # Source 4: Google Maps / Places
        if google_maps_url:
            try:
                maps_candidates = await self._search_google_maps(google_maps_url)
                candidates.extend(maps_candidates)
                result.sources_checked.append("google_maps")
            except Exception as e:
                result.sources_checked.append(f"google_maps (failed: {str(e)[:30]})")
        
        # Source 5: Direct name-based search
        try:
            name_candidates = await self._search_by_name_variations(business_name, city)
            candidates.extend(name_candidates)
            result.sources_checked.append("name_variations")
        except Exception as e:
            result.sources_checked.append(f"name_variations (failed: {str(e)[:30]})")
        
        # Source 6: Bing Search (backup)
        try:
            bing_candidates = await self._search_bing(business_name, city, country)
            candidates.extend(bing_candidates)
            result.sources_checked.append("bing_search")
        except Exception as e:
            result.sources_checked.append(f"bing_search (failed: {str(e)[:30]})")
        
        # Deduplicate candidates
        unique_candidates = self._deduplicate_candidates(candidates)
        
        # Validate and score each candidate
        validated_candidates = []
        for candidate in unique_candidates[:10]:  # Limit to top 10 to avoid rate limits
            try:
                validated = await self._validate_candidate(candidate, business_name, city)
                validated_candidates.append(validated)
            except Exception:
                validated_candidates.append(candidate)
            await asyncio.sleep(0.5)  # Rate limiting
        
        # Sort by confidence
        validated_candidates.sort(key=lambda x: x.confidence, reverse=True)
        
        result.all_candidates = validated_candidates
        
        # Select best match
        if validated_candidates and validated_candidates[0].confidence >= 0.5:
            result.best_match = validated_candidates[0]
            result.discovery_successful = True
        
        return result
    
    async def _search_google(
        self,
        business_name: str,
        city: str,
        country: str,
    ) -> List[InstagramCandidate]:
        """Search Google for the business Instagram."""
        candidates = []
        
        # Multiple search queries for better coverage
        queries = [
            f'"{business_name}" {city} instagram',
            f'{business_name} {city} instagram.com',
            f'"{business_name}" {city} @',
            f'{business_name} {city} site:instagram.com',
        ]
        
        for query in queries:
            try:
                url = f"https://www.google.com/search?q={quote(query)}&num=10"
                
                response = await self.client.get(url)
                html = response.text
                
                # Extract Instagram URLs from results
                handles = self._extract_handles_from_html(html)
                
                for handle in handles:
                    candidates.append(InstagramCandidate(
                        handle=handle,
                        source="google_search",
                        confidence=0.7,
                        profile_url=f"https://instagram.com/{handle}",
                    ))
                
                await asyncio.sleep(1)  # Don't hammer Google
                
            except Exception:
                continue
        
        return candidates
    
    async def _search_bing(
        self,
        business_name: str,
        city: str,
        country: str,
    ) -> List[InstagramCandidate]:
        """Search Bing as backup."""
        candidates = []
        
        query = f'"{business_name}" {city} instagram'
        url = f"https://www.bing.com/search?q={quote(query)}"
        
        try:
            response = await self.client.get(url)
            html = response.text
            
            handles = self._extract_handles_from_html(html)
            
            for handle in handles:
                candidates.append(InstagramCandidate(
                    handle=handle,
                    source="bing_search",
                    confidence=0.6,
                    profile_url=f"https://instagram.com/{handle}",
                ))
        except Exception:
            pass
        
        return candidates
    
    async def _search_website(
        self,
        website_url: str,
        business_name: str,
    ) -> List[InstagramCandidate]:
        """Search business website for Instagram links."""
        candidates = []
        
        # Normalize URL
        if not website_url.startswith(('http://', 'https://')):
            website_url = f"https://{website_url}"
        
        try:
            response = await self.client.get(website_url)
            html = response.text
            
            handles = self._extract_handles_from_html(html)
            
            for handle in handles:
                candidates.append(InstagramCandidate(
                    handle=handle,
                    source="business_website",
                    confidence=0.9,  # High confidence - from their own site
                    profile_url=f"https://instagram.com/{handle}",
                ))
            
            # Also check common pages
            soup = BeautifulSoup(html, 'lxml')
            
            # Check footer (often has social links)
            footer = soup.find('footer')
            if footer:
                footer_handles = self._extract_handles_from_html(str(footer))
                for handle in footer_handles:
                    if handle not in [c.handle for c in candidates]:
                        candidates.append(InstagramCandidate(
                            handle=handle,
                            source="website_footer",
                            confidence=0.95,
                            profile_url=f"https://instagram.com/{handle}",
                        ))
            
            # Check contact page if exists
            contact_links = soup.find_all('a', href=re.compile(r'contact|contacto', re.I))
            for link in contact_links[:2]:
                try:
                    contact_url = link.get('href', '')
                    if not contact_url.startswith('http'):
                        contact_url = f"{website_url.rstrip('/')}/{contact_url.lstrip('/')}"
                    
                    contact_response = await self.client.get(contact_url)
                    contact_handles = self._extract_handles_from_html(contact_response.text)
                    
                    for handle in contact_handles:
                        if handle not in [c.handle for c in candidates]:
                            candidates.append(InstagramCandidate(
                                handle=handle,
                                source="website_contact_page",
                                confidence=0.9,
                                profile_url=f"https://instagram.com/{handle}",
                            ))
                except Exception:
                    continue
                    
        except Exception:
            pass
        
        return candidates
    
    async def _search_facebook(self, facebook_url: str) -> List[InstagramCandidate]:
        """Search Facebook page for linked Instagram."""
        candidates = []
        
        try:
            response = await self.client.get(facebook_url)
            html = response.text
            
            handles = self._extract_handles_from_html(html)
            
            for handle in handles:
                candidates.append(InstagramCandidate(
                    handle=handle,
                    source="facebook_page",
                    confidence=0.85,
                    profile_url=f"https://instagram.com/{handle}",
                ))
                
        except Exception:
            pass
        
        return candidates
    
    async def _search_google_maps(self, maps_url: str) -> List[InstagramCandidate]:
        """Extract Instagram from Google Maps listing."""
        candidates = []
        
        try:
            response = await self.client.get(maps_url)
            html = response.text
            
            handles = self._extract_handles_from_html(html)
            
            for handle in handles:
                candidates.append(InstagramCandidate(
                    handle=handle,
                    source="google_maps",
                    confidence=0.8,
                    profile_url=f"https://instagram.com/{handle}",
                ))
                
        except Exception:
            pass
        
        return candidates
    
    async def _search_by_name_variations(
        self,
        business_name: str,
        city: str,
    ) -> List[InstagramCandidate]:
        """Generate and check name-based handle variations."""
        candidates = []
        
        # Clean business name
        name_clean = re.sub(r'[^a-zA-Z0-9\s]', '', business_name.lower())
        name_parts = name_clean.split()
        
        # Generate variations
        variations = set()
        
        # Basic variations
        variations.add(name_clean.replace(' ', ''))  # casasanagustin
        variations.add(name_clean.replace(' ', '_'))  # casa_san_agustin
        variations.add(name_clean.replace(' ', '.'))  # casa.san.agustin
        
        # With city
        city_clean = city.lower().replace(' ', '')
        variations.add(f"{name_clean.replace(' ', '')}_{city_clean}")
        variations.add(f"{name_clean.replace(' ', '')}{city_clean}")
        
        # First word + city
        if name_parts:
            variations.add(f"{name_parts[0]}_{city_clean}")
            variations.add(f"{name_parts[0]}{city_clean}")
        
        # Common suffixes
        base = name_clean.replace(' ', '')
        for suffix in ['oficial', 'official', 'co', 'col', 'ctg', 'medellin', 'bogota']:
            variations.add(f"{base}_{suffix}")
            variations.add(f"{base}{suffix}")
        
        # Check each variation exists on Instagram
        for handle in list(variations)[:15]:  # Limit checks
            if len(handle) < 3 or len(handle) > 30:
                continue
                
            exists = await self._check_handle_exists(handle)
            if exists:
                candidates.append(InstagramCandidate(
                    handle=handle,
                    source="name_variation",
                    confidence=0.4,  # Low confidence until validated
                    profile_url=f"https://instagram.com/{handle}",
                ))
            
            await asyncio.sleep(0.3)
        
        return candidates
    
    async def _check_handle_exists(self, handle: str) -> bool:
        """Check if an Instagram handle exists."""
        try:
            url = f"https://www.instagram.com/{handle}/"
            response = await self.client.get(url)
            
            # If we get 200 and page has profile data, it exists
            if response.status_code == 200:
                # Check for 404 page content
                if "Sorry, this page isn't available" not in response.text:
                    return True
            
            return False
        except Exception:
            return False
    
    async def _validate_candidate(
        self,
        candidate: InstagramCandidate,
        business_name: str,
        city: str,
    ) -> InstagramCandidate:
        """Validate a candidate by checking their profile."""
        try:
            url = f"https://www.instagram.com/{candidate.handle}/"
            response = await self.client.get(url)
            
            if response.status_code != 200:
                candidate.confidence *= 0.2
                candidate.validation_notes = "Profile not found"
                return candidate
            
            html = response.text
            
            # Check for page not found
            if "Sorry, this page isn't available" in html:
                candidate.confidence *= 0.1
                candidate.validation_notes = "Profile does not exist"
                return candidate
            
            # Extract profile data
            soup = BeautifulSoup(html, 'lxml')
            
            # Try to get name from meta tags
            og_title = soup.find('meta', property='og:title')
            if og_title:
                full_name = og_title.get('content', '').split('(')[0].strip()
                candidate.full_name = full_name
                
                # Check if business name appears in profile name
                name_lower = business_name.lower()
                profile_lower = full_name.lower()
                
                # Calculate name similarity
                name_words = set(name_lower.split())
                profile_words = set(profile_lower.split())
                
                overlap = len(name_words & profile_words)
                if overlap > 0:
                    # Name match found - boost confidence
                    candidate.confidence = min(candidate.confidence + 0.3, 1.0)
                    candidate.validation_notes = f"Name match: {overlap} words overlap"
            
            # Try to get bio from meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc:
                desc = meta_desc.get('content', '')
                candidate.bio = desc[:200]
                
                # Check if city appears in bio
                if city.lower() in desc.lower():
                    candidate.confidence = min(candidate.confidence + 0.2, 1.0)
                    candidate.validation_notes += f" | City '{city}' found in bio"
                
                # Parse follower count from description
                follower_match = re.search(r'([\d,.]+[KMB]?)\s*Followers', desc, re.I)
                if follower_match:
                    candidate.followers = self._parse_count(follower_match.group(1))
            
            # Check for business account indicators
            if 'business' in html.lower() or 'contact' in html.lower():
                candidate.is_business = True
                candidate.confidence = min(candidate.confidence + 0.1, 1.0)
            
            # Extract external URL
            ext_url_match = re.search(r'"external_url":\s*"([^"]+)"', html)
            if ext_url_match:
                candidate.external_url = ext_url_match.group(1)
            
        except Exception as e:
            candidate.validation_notes = f"Validation error: {str(e)[:50]}"
        
        return candidate
    
    def _extract_handles_from_html(self, html: str) -> List[str]:
        """Extract all Instagram handles from HTML."""
        handles = set()
        
        for pattern in self.ig_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                handle = self._clean_handle(match)
                if handle:
                    handles.add(handle)
        
        return list(handles)
    
    def _clean_handle(self, handle: str) -> Optional[str]:
        """Clean and validate an Instagram handle."""
        if not handle:
            return None
        
        # Remove @ and clean
        handle = handle.strip().lstrip('@').lower()
        
        # Remove trailing punctuation
        handle = re.sub(r'[.,;:!?\'"]+$', '', handle)
        
        # Validate format
        if not re.match(r'^[a-zA-Z0-9_.]{1,30}$', handle):
            return None
        
        # Filter false positives
        if handle in self.false_positives:
            return None
        
        # Filter handles that are too generic
        if len(handle) < 3:
            return None
        
        return handle
    
    def _deduplicate_candidates(
        self,
        candidates: List[InstagramCandidate],
    ) -> List[InstagramCandidate]:
        """Deduplicate candidates, keeping highest confidence for each handle."""
        seen = {}
        
        for candidate in candidates:
            handle = candidate.handle.lower()
            
            if handle not in seen:
                seen[handle] = candidate
            else:
                # Keep the one with higher confidence
                if candidate.confidence > seen[handle].confidence:
                    # Merge sources
                    candidate.source = f"{seen[handle].source}, {candidate.source}"
                    seen[handle] = candidate
                else:
                    seen[handle].source = f"{seen[handle].source}, {candidate.source}"
        
        return list(seen.values())
    
    def _parse_count(self, count_str: str) -> int:
        """Parse follower count strings like '1.2M', '500K'."""
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


# ═══════════════════════════════════════════════════════════════════════════════
# BATCH DISCOVERY
# ═══════════════════════════════════════════════════════════════════════════════

async def discover_instagram_batch(
    businesses: List[dict],
    max_concurrent: int = 3,
) -> List[InstagramDiscoveryResult]:
    """
    Discover Instagram handles for multiple businesses.
    
    Args:
        businesses: List of dicts with keys: name, city, website (optional), facebook (optional)
        max_concurrent: Max concurrent discovery operations
    """
    engine = InstagramDiscoveryEngine()
    results = []
    
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def discover_one(biz):
        async with semaphore:
            result = await engine.discover(
                business_name=biz.get('name', ''),
                city=biz.get('city', 'Cartagena'),
                website_url=biz.get('website'),
                facebook_url=biz.get('facebook'),
                existing_candidates=biz.get('existing_instagram'),
            )
            await asyncio.sleep(1)  # Rate limiting between businesses
            return result
    
    try:
        tasks = [discover_one(biz) for biz in businesses]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions
        results = [r for r in results if isinstance(r, InstagramDiscoveryResult)]
        
    finally:
        await engine.close()
    
    return results


# ═══════════════════════════════════════════════════════════════════════════════
# FORMATTING
# ═══════════════════════════════════════════════════════════════════════════════

def format_discovery_result(result: InstagramDiscoveryResult) -> str:
    """Format discovery result for display."""
    lines = [
        f"📸 INSTAGRAM DISCOVERY: {result.business_name}",
        f"   City: {result.city}",
        f"   Sources Checked: {', '.join(result.sources_checked)}",
        "",
    ]
    
    if result.best_match:
        bm = result.best_match
        lines.extend([
            f"✅ BEST MATCH: @{bm.handle}",
            f"   Confidence: {bm.confidence:.0%}",
            f"   Source: {bm.source}",
            f"   URL: {bm.profile_url}",
        ])
        
        if bm.followers:
            lines.append(f"   Followers: {bm.followers:,}")
        if bm.full_name:
            lines.append(f"   Profile Name: {bm.full_name}")
        if bm.validation_notes:
            lines.append(f"   Notes: {bm.validation_notes}")
    else:
        lines.append("❌ NO CONFIDENT MATCH FOUND")
    
    if len(result.all_candidates) > 1:
        lines.extend([
            "",
            "Other Candidates:",
        ])
        for c in result.all_candidates[1:5]:
            lines.append(f"   • @{c.handle} ({c.confidence:.0%}) - {c.source}")
    
    return "\n".join(lines)
