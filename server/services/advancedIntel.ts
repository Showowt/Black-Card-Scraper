/**
 * Advanced Intelligence Scrapers
 * Phil McGill - MachineMind
 * 
 * High-priority data collection for Colombian hospitality market:
 * 1. Instagram Profile Intelligence
 * 2. Google Maps Review Scraping
 * 3. TripAdvisor Integration
 * 4. Booking.com/OTA Presence Detection
 * 5. WhatsApp Response Time Testing
 */

// Data Types
export interface InstagramIntelligence {
  handle: string;
  profileUrl: string;
  followers: number;
  following: number;
  postsCount: number;
  bio: string;
  isBusinessAccount: boolean;
  isVerified: boolean;
  externalUrl: string;
  engagementEstimate: 'unknown' | 'low' | 'medium' | 'high';
  postingFrequency: 'unknown' | 'inactive' | 'sporadic' | 'regular' | 'active';
  followerTier: 'unknown' | 'micro' | 'small' | 'medium' | 'large' | 'mega';
  dmLink: string;
  hasContactButton: boolean;
  scrapedAt: string;
  scrapeSuccess: boolean;
  error: string;
}

export interface GoogleReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
  language: string;
  responseFromOwner: string;
  hasOwnerResponse: boolean;
}

export interface GoogleReviewsIntelligence {
  placeId: string;
  businessName: string;
  overallRating: number;
  totalReviews: number;
  reviews: GoogleReview[];
  ratingDistribution: Record<number, number>;
  reviewVelocity: 'unknown' | 'slow' | 'moderate' | 'fast';
  avgReviewLength: number;
  responseRate: number;
  sentimentSummary: string;
  commonComplaints: string[];
  commonPraises: string[];
  negativeReviewCount: number;
  unansweredReviews: number;
  scrapeSuccess: boolean;
  error: string;
}

export interface TripAdvisorIntelligence {
  url: string;
  businessName: string;
  rating: number;
  totalReviews: number;
  ranking: string;
  rankingPosition: number;
  rankingTotal: number;
  excellentCount: number;
  veryGoodCount: number;
  averageCount: number;
  poorCount: number;
  terribleCount: number;
  reviewByType: Record<string, number>;
  recentReviews: any[];
  certificateOfExcellence: boolean;
  travelerChoice: boolean;
  reviewVelocity: 'unknown' | 'slow' | 'moderate' | 'fast';
  scrapeSuccess: boolean;
  error: string;
}

export interface OTAPresence {
  businessName: string;
  onBookingCom: boolean;
  bookingUrl: string;
  bookingRating: number;
  bookingReviews: number;
  onExpedia: boolean;
  expediaUrl: string;
  expediaRating: number;
  onHotelsCom: boolean;
  onAirbnb: boolean;
  airbnbUrl: string;
  onVrbo: boolean;
  onViator: boolean;
  onGetyourguide: boolean;
  otaDependencyScore: number;
  directBookingOpportunity: 'low' | 'medium' | 'high';
  estimatedCommissionLoss: number;
  scrapeSuccess: boolean;
  error: string;
}

export interface WhatsAppResponseTest {
  phoneNumber: string;
  waLink: string;
  testPerformed: boolean;
  testTimestamp: string;
  hasWhatsappBusiness: boolean;
  hasAutoReply: boolean;
  autoReplyMessage: string;
  businessHoursSet: boolean;
  awayMessage: string;
  estimatedResponseTime: 'unknown' | 'instant' | 'fast' | 'slow' | 'very_slow' | 'no_response' | 'no_whatsapp';
  responseTimeHook: string;
  scrapeSuccess: boolean;
  error: string;
}

export interface ComprehensiveIntelligence {
  businessName: string;
  category: string;
  city: string;
  instagram: InstagramIntelligence | null;
  googleReviews: GoogleReviewsIntelligence | null;
  tripadvisor: TripAdvisorIntelligence | null;
  otaPresence: OTAPresence | null;
  whatsapp: WhatsAppResponseTest | null;
  totalSocialFollowers: number;
  totalReviewsAllPlatforms: number;
  averageRatingAllPlatforms: number;
  digitalPresenceScore: number;
  automationOpportunityScore: number;
  outreachHooks: string[];
}

// Instagram Intelligence Scraper
export class InstagramScraper {
  private parseCount(countStr: string): number {
    const cleaned = countStr.toUpperCase().replace(/,/g, '');
    const multipliers: Record<string, number> = { K: 1000, M: 1000000, B: 1000000000 };
    
    for (const [suffix, mult] of Object.entries(multipliers)) {
      if (cleaned.includes(suffix)) {
        const num = parseFloat(cleaned.replace(suffix, ''));
        return Math.floor(num * mult);
      }
    }
    return parseInt(cleaned) || 0;
  }

  private calculateMetrics(result: InstagramIntelligence): InstagramIntelligence {
    // Follower tier
    if (result.followers >= 1000000) result.followerTier = 'mega';
    else if (result.followers >= 100000) result.followerTier = 'large';
    else if (result.followers >= 10000) result.followerTier = 'medium';
    else if (result.followers >= 1000) result.followerTier = 'small';
    else result.followerTier = 'micro';

    // Posting frequency
    if (result.postsCount === 0) result.postingFrequency = 'inactive';
    else if (result.postsCount < 50) result.postingFrequency = 'sporadic';
    else if (result.postsCount < 200) result.postingFrequency = 'regular';
    else result.postingFrequency = 'active';

    // Engagement estimate
    if (result.followers > 0 && result.following > 0) {
      const ratio = result.followers / result.following;
      if (ratio > 10) result.engagementEstimate = 'high';
      else if (ratio > 2) result.engagementEstimate = 'medium';
      else result.engagementEstimate = 'low';
    }

    return result;
  }

  async scrapeProfile(handle: string): Promise<InstagramIntelligence> {
    handle = handle.replace(/^@/, '').trim();
    const profileUrl = `https://www.instagram.com/${handle}/`;
    
    const result: InstagramIntelligence = {
      handle,
      profileUrl,
      followers: 0,
      following: 0,
      postsCount: 0,
      bio: '',
      isBusinessAccount: false,
      isVerified: false,
      externalUrl: '',
      engagementEstimate: 'unknown',
      postingFrequency: 'unknown',
      followerTier: 'unknown',
      dmLink: `https://ig.me/m/${handle}`,
      hasContactButton: false,
      scrapedAt: new Date().toISOString(),
      scrapeSuccess: false,
      error: '',
    };

    try {
      const response = await fetch(profileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (response.status === 404) {
        result.error = 'Profile not found';
        return result;
      }

      const html = await response.text();
      
      // Method 1: Meta description parsing
      const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
                        html.match(/<meta\s+content="([^"]+)"\s+name="description"/i);
      
      if (metaMatch) {
        const content = metaMatch[1];
        const followersMatch = content.match(/([\d,.]+[KMB]?)\s*Followers/i);
        const followingMatch = content.match(/([\d,.]+[KMB]?)\s*Following/i);
        const postsMatch = content.match(/([\d,.]+[KMB]?)\s*Posts/i);
        
        if (followersMatch) {
          result.followers = this.parseCount(followersMatch[1]);
          result.scrapeSuccess = true;
        }
        if (followingMatch) result.following = this.parseCount(followingMatch[1]);
        if (postsMatch) result.postsCount = this.parseCount(postsMatch[1]);
      }

      // Method 2: JSON patterns in HTML
      if (!result.scrapeSuccess) {
        const patterns = [
          /"edge_followed_by":\s*\{\s*"count":\s*(\d+)/,
          /"follower_count":\s*(\d+)/,
          /"followers_count":\s*(\d+)/,
        ];
        
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match) {
            result.followers = parseInt(match[1]);
            result.scrapeSuccess = true;
            break;
          }
        }
      }

      if (result.scrapeSuccess) {
        return this.calculateMetrics(result);
      }

    } catch (error: any) {
      result.error = error.message;
    }

    return result;
  }
}

// Google Reviews Scraper
export class GoogleReviewsScraper {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_PLACES_API_KEY || '';
  }

  private analyzeReviews(result: GoogleReviewsIntelligence): GoogleReviewsIntelligence {
    // Calculate response rate
    const reviewsWithResponse = result.reviews.filter(r => r.hasOwnerResponse).length;
    result.responseRate = result.reviews.length > 0 
      ? (reviewsWithResponse / result.reviews.length) * 100 
      : 0;

    // Calculate average review length
    const totalLength = result.reviews.reduce((sum, r) => sum + r.text.length, 0);
    result.avgReviewLength = result.reviews.length > 0 
      ? Math.floor(totalLength / result.reviews.length) 
      : 0;

    // Count negative reviews (1-2 stars)
    result.negativeReviewCount = result.reviews.filter(r => r.rating <= 2).length;

    // Count unanswered reviews
    result.unansweredReviews = result.reviews.filter(r => !r.hasOwnerResponse).length;

    // Detect common complaints (Spanish keywords)
    const complaintKeywords = ['lento', 'caro', 'esperamos', 'malo', 'sucio', 'frío', 'pequeño', 'ruidoso', 'demora'];
    const praiseKeywords = ['excelente', 'increíble', 'recomiendo', 'perfecto', 'delicioso', 'amable', 'hermoso'];
    
    const allText = result.reviews.map(r => r.text.toLowerCase()).join(' ');
    
    result.commonComplaints = complaintKeywords.filter(k => allText.includes(k));
    result.commonPraises = praiseKeywords.filter(k => allText.includes(k));

    // Sentiment summary
    const positiveReviews = result.reviews.filter(r => r.rating >= 4).length;
    const negativeReviews = result.reviews.filter(r => r.rating <= 2).length;
    
    if (positiveReviews > negativeReviews * 3) {
      result.sentimentSummary = 'Mayormente positivo';
    } else if (negativeReviews > positiveReviews) {
      result.sentimentSummary = 'Preocupante';
    } else {
      result.sentimentSummary = 'Mixto';
    }

    // Review velocity (based on time patterns)
    result.reviewVelocity = result.totalReviews > 500 ? 'fast' 
      : result.totalReviews > 100 ? 'moderate' 
      : 'slow';

    return result;
  }

  async scrapeReviews(placeId: string, businessName: string, maxReviews: number = 20): Promise<GoogleReviewsIntelligence> {
    const result: GoogleReviewsIntelligence = {
      placeId,
      businessName,
      overallRating: 0,
      totalReviews: 0,
      reviews: [],
      ratingDistribution: {},
      reviewVelocity: 'unknown',
      avgReviewLength: 0,
      responseRate: 0,
      sentimentSummary: '',
      commonComplaints: [],
      commonPraises: [],
      negativeReviewCount: 0,
      unansweredReviews: 0,
      scrapeSuccess: false,
      error: '',
    };

    if (!this.apiKey) {
      result.error = 'Google Places API key not configured';
      return result;
    }

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      url.searchParams.append('place_id', placeId);
      url.searchParams.append('fields', 'name,rating,user_ratings_total,reviews');
      url.searchParams.append('reviews_sort', 'newest');
      url.searchParams.append('key', this.apiKey);

      const response = await fetch(url.toString());
      const data = await response.json() as any;

      if (data.status !== 'OK') {
        result.error = `API error: ${data.status}`;
        return result;
      }

      const place = data.result;
      result.overallRating = place.rating || 0;
      result.totalReviews = place.user_ratings_total || 0;
      
      if (place.reviews) {
        result.reviews = place.reviews.slice(0, maxReviews).map((r: any) => ({
          authorName: r.author_name || 'Anonymous',
          rating: r.rating || 0,
          text: r.text || '',
          relativeTime: r.relative_time_description || '',
          language: r.language || 'es',
          responseFromOwner: '',
          hasOwnerResponse: false,
        }));
      }

      result.scrapeSuccess = true;
      return this.analyzeReviews(result);

    } catch (error: any) {
      result.error = error.message;
    }

    return result;
  }
}

// TripAdvisor Scraper
export class TripAdvisorScraper {
  private categoryMap: Record<string, string> = {
    restaurant: 'Restaurant',
    hotel: 'Hotel',
    spa: 'Spa',
    tour_operator: 'Attraction',
    boat_charter: 'Attraction',
  };

  async scrapeProfile(businessName: string, city: string, category: string): Promise<TripAdvisorIntelligence> {
    const result: TripAdvisorIntelligence = {
      url: '',
      businessName,
      rating: 0,
      totalReviews: 0,
      ranking: '',
      rankingPosition: 0,
      rankingTotal: 0,
      excellentCount: 0,
      veryGoodCount: 0,
      averageCount: 0,
      poorCount: 0,
      terribleCount: 0,
      reviewByType: {},
      recentReviews: [],
      certificateOfExcellence: false,
      travelerChoice: false,
      reviewVelocity: 'unknown',
      scrapeSuccess: false,
      error: '',
    };

    try {
      // Construct search URL
      const taCategory = this.categoryMap[category] || 'Restaurant';
      const searchQuery = encodeURIComponent(`${businessName} ${city} Colombia`);
      result.url = `https://www.tripadvisor.com/Search?q=${searchQuery}`;

      const response = await fetch(result.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        result.error = `HTTP ${response.status}`;
        return result;
      }

      const html = await response.text();
      
      // Extract rating
      const ratingMatch = html.match(/class="[^"]*rating[^"]*"[^>]*>([0-9.]+)/i) ||
                          html.match(/"ratingValue":\s*"?([0-9.]+)/);
      if (ratingMatch) {
        result.rating = parseFloat(ratingMatch[1]);
      }

      // Extract review count
      const reviewMatch = html.match(/([\d,]+)\s*reviews?/i);
      if (reviewMatch) {
        result.totalReviews = parseInt(reviewMatch[1].replace(/,/g, ''));
      }

      // Extract ranking
      const rankingMatch = html.match(/#(\d+)\s+of\s+(\d+)/i);
      if (rankingMatch) {
        result.rankingPosition = parseInt(rankingMatch[1]);
        result.rankingTotal = parseInt(rankingMatch[2]);
        result.ranking = `#${result.rankingPosition} of ${result.rankingTotal} in ${city}`;
      }

      // Check for awards
      result.certificateOfExcellence = html.toLowerCase().includes('certificate of excellence');
      result.travelerChoice = html.toLowerCase().includes('travelers\' choice') || 
                              html.toLowerCase().includes('traveler choice');

      result.scrapeSuccess = result.rating > 0 || result.totalReviews > 0;

      // Review velocity estimate
      result.reviewVelocity = result.totalReviews > 1000 ? 'fast'
        : result.totalReviews > 200 ? 'moderate'
        : 'slow';

    } catch (error: any) {
      result.error = error.message;
    }

    return result;
  }
}

// OTA Presence Detector
export class OTAPresenceDetector {
  private calculateDependency(result: OTAPresence, category: string): OTAPresence {
    const otaCount = [
      result.onBookingCom,
      result.onExpedia,
      result.onHotelsCom,
      result.onAirbnb,
      result.onVrbo,
      result.onViator,
      result.onGetyourguide,
    ].filter(Boolean).length;

    if (otaCount >= 3) {
      result.otaDependencyScore = 80;
      result.directBookingOpportunity = 'high';
    } else if (otaCount >= 2) {
      result.otaDependencyScore = 60;
      result.directBookingOpportunity = 'high';
    } else if (otaCount >= 1) {
      result.otaDependencyScore = 40;
      result.directBookingOpportunity = 'medium';
    } else {
      result.otaDependencyScore = 10;
      result.directBookingOpportunity = 'low';
    }

    // Commission rates by category
    const commissionRates: Record<string, number> = {
      hotel: 0.18,
      villa_rental: 0.15,
      tour_operator: 0.20,
      boat_charter: 0.20,
    };

    const estimatedRevenue: Record<string, number> = {
      hotel: 50000,
      villa_rental: 30000,
      tour_operator: 20000,
      boat_charter: 40000,
    };

    const rate = commissionRates[category] || 0.15;
    const monthlyRev = estimatedRevenue[category] || 30000;
    const otaPortion = result.otaDependencyScore > 50 ? 0.7 : 0.4;

    result.estimatedCommissionLoss = monthlyRev * otaPortion * rate;

    return result;
  }

  async detectPresence(businessName: string, city: string, category: string, websiteHtml?: string): Promise<OTAPresence> {
    const result: OTAPresence = {
      businessName,
      onBookingCom: false,
      bookingUrl: '',
      bookingRating: 0,
      bookingReviews: 0,
      onExpedia: false,
      expediaUrl: '',
      expediaRating: 0,
      onHotelsCom: false,
      onAirbnb: false,
      airbnbUrl: '',
      onVrbo: false,
      onViator: false,
      onGetyourguide: false,
      otaDependencyScore: 0,
      directBookingOpportunity: 'low',
      estimatedCommissionLoss: 0,
      scrapeSuccess: false,
      error: '',
    };

    try {
      // Analyze website HTML for OTA integrations if provided
      if (websiteHtml) {
        const htmlLower = websiteHtml.toLowerCase();
        
        const otaIndicators: Record<string, { field: keyof OTAPresence; keywords: string[] }> = {
          bookingCom: { field: 'onBookingCom', keywords: ['booking.com', 'res.booking.com', 'booking-widget'] },
          expedia: { field: 'onExpedia', keywords: ['expedia.com', 'expedia-widget'] },
          hotelsCom: { field: 'onHotelsCom', keywords: ['hotels.com'] },
          airbnb: { field: 'onAirbnb', keywords: ['airbnb.com', 'abnb.me'] },
          vrbo: { field: 'onVrbo', keywords: ['vrbo.com', 'homeaway'] },
          viator: { field: 'onViator', keywords: ['viator.com', 'partner.viator'] },
          gyg: { field: 'onGetyourguide', keywords: ['getyourguide.com', 'gyg-widget'] },
        };

        for (const [, config] of Object.entries(otaIndicators)) {
          if (config.keywords.some(k => htmlLower.includes(k))) {
            (result as any)[config.field] = true;
          }
        }
      }

      // Search booking.com
      try {
        const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(businessName + ' ' + city)}`;
        const response = await fetch(bookingUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        const html = await response.text();
        const nameParts = businessName.toLowerCase().split(' ').slice(0, 2);
        if (nameParts.some(part => html.toLowerCase().includes(part))) {
          result.onBookingCom = true;
        }
      } catch {}

      result.scrapeSuccess = true;
      return this.calculateDependency(result, category);

    } catch (error: any) {
      result.error = error.message;
    }

    return result;
  }
}

// WhatsApp Response Tester
export class WhatsAppResponseTester {
  private generateHooks(result: WhatsAppResponseTest, businessName: string): WhatsAppResponseTest {
    if (!result.hasWhatsappBusiness) {
      result.estimatedResponseTime = 'no_whatsapp';
      result.responseTimeHook = `${businessName} no tiene WhatsApp Business configurado. El 66% de los colombianos compran después de chatear por WhatsApp. Sin WhatsApp Business, estás perdiendo ventas cada día. — Phil McGill`;
    } else if (result.hasAutoReply) {
      result.estimatedResponseTime = 'instant';
      result.responseTimeHook = `${businessName} tiene auto-respuesta configurada — eso es un buen comienzo. Pero un auto-respuesta no responde preguntas ni cierra ventas. Un bot AI sí lo hace. — Phil McGill`;
    } else {
      result.estimatedResponseTime = 'unknown';
      result.responseTimeHook = `¿Cuánto tarda ${businessName} en responder un WhatsApp? El 50% de los colombianos abandonan si no reciben respuesta rápida. Con AI, respondes en segundos, 24/7, mientras duermes. — Phil McGill`;
    }
    return result;
  }

  async testWhatsApp(phoneNumber: string, businessName: string = ''): Promise<WhatsAppResponseTest> {
    let phone = phoneNumber.replace(/[^\d+]/g, '');
    if (!phone.startsWith('+')) {
      phone = phone.startsWith('57') ? '+' + phone : '+57' + phone;
    }
    const phoneClean = phone.replace('+', '');

    const result: WhatsAppResponseTest = {
      phoneNumber: phone,
      waLink: `https://wa.me/${phoneClean}`,
      testPerformed: false,
      testTimestamp: new Date().toISOString(),
      hasWhatsappBusiness: false,
      hasAutoReply: false,
      autoReplyMessage: '',
      businessHoursSet: false,
      awayMessage: '',
      estimatedResponseTime: 'unknown',
      responseTimeHook: '',
      scrapeSuccess: false,
      error: '',
    };

    try {
      const response = await fetch(`https://wa.me/${phoneClean}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' },
        redirect: 'manual',
      });

      if ([200, 301, 302].includes(response.status)) {
        result.testPerformed = true;
        result.hasWhatsappBusiness = true; // Assume business if valid
        result.scrapeSuccess = true;
      }

    } catch (error: any) {
      result.error = error.message;
    }

    return this.generateHooks(result, businessName);
  }
}

// Comprehensive Intelligence Gatherer
export async function gatherComprehensiveIntelligence(params: {
  businessName: string;
  category: string;
  city: string;
  instagramHandle?: string;
  placeId?: string;
  phoneNumber?: string;
  websiteHtml?: string;
  googleApiKey?: string;
}): Promise<ComprehensiveIntelligence> {
  const result: ComprehensiveIntelligence = {
    businessName: params.businessName,
    category: params.category,
    city: params.city,
    instagram: null,
    googleReviews: null,
    tripadvisor: null,
    otaPresence: null,
    whatsapp: null,
    totalSocialFollowers: 0,
    totalReviewsAllPlatforms: 0,
    averageRatingAllPlatforms: 0,
    digitalPresenceScore: 0,
    automationOpportunityScore: 100,
    outreachHooks: [],
  };

  const tasks: Promise<any>[] = [];
  const taskNames: string[] = [];

  // Instagram
  if (params.instagramHandle) {
    const scraper = new InstagramScraper();
    tasks.push(scraper.scrapeProfile(params.instagramHandle));
    taskNames.push('instagram');
  }

  // Google Reviews
  if (params.placeId) {
    const scraper = new GoogleReviewsScraper(params.googleApiKey);
    tasks.push(scraper.scrapeReviews(params.placeId, params.businessName));
    taskNames.push('googleReviews');
  }

  // TripAdvisor (for relevant categories)
  if (['restaurant', 'hotel', 'tour_operator', 'spa', 'boat_charter'].includes(params.category)) {
    const scraper = new TripAdvisorScraper();
    tasks.push(scraper.scrapeProfile(params.businessName, params.city, params.category));
    taskNames.push('tripadvisor');
  }

  // OTA Presence (for relevant categories)
  if (['hotel', 'villa_rental', 'tour_operator', 'boat_charter'].includes(params.category)) {
    const detector = new OTAPresenceDetector();
    tasks.push(detector.detectPresence(params.businessName, params.city, params.category, params.websiteHtml));
    taskNames.push('otaPresence');
  }

  // WhatsApp
  if (params.phoneNumber) {
    const tester = new WhatsAppResponseTester();
    tasks.push(tester.testWhatsApp(params.phoneNumber, params.businessName));
    taskNames.push('whatsapp');
  }

  // Run all tasks concurrently
  const results = await Promise.allSettled(tasks);

  results.forEach((res, index) => {
    if (res.status === 'fulfilled') {
      (result as any)[taskNames[index]] = res.value;
    }
  });

  // Calculate summary metrics
  return calculateSummaryMetrics(result);
}

function calculateSummaryMetrics(result: ComprehensiveIntelligence): ComprehensiveIntelligence {
  // Total followers
  if (result.instagram?.scrapeSuccess) {
    result.totalSocialFollowers = result.instagram.followers;
  }

  // Total reviews and ratings
  let reviews = 0;
  const ratings: number[] = [];

  if (result.googleReviews?.scrapeSuccess) {
    reviews += result.googleReviews.totalReviews;
    if (result.googleReviews.overallRating) ratings.push(result.googleReviews.overallRating);
  }

  if (result.tripadvisor?.scrapeSuccess) {
    reviews += result.tripadvisor.totalReviews;
    if (result.tripadvisor.rating) ratings.push(result.tripadvisor.rating);
  }

  result.totalReviewsAllPlatforms = reviews;
  result.averageRatingAllPlatforms = ratings.length > 0 
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
    : 0;

  // Digital presence score
  let presencePoints = 0;
  
  if (result.instagram?.scrapeSuccess) {
    if (result.instagram.followers > 10000) presencePoints += 25;
    else if (result.instagram.followers > 1000) presencePoints += 15;
    else if (result.instagram.followers > 100) presencePoints += 10;
  }

  if (result.googleReviews?.totalReviews) {
    if (result.googleReviews.totalReviews > 100) presencePoints += 25;
    else if (result.googleReviews.totalReviews > 20) presencePoints += 15;
  }

  if (result.tripadvisor?.scrapeSuccess) presencePoints += 20;
  if (result.whatsapp?.hasWhatsappBusiness) presencePoints += 15;
  if (result.otaPresence?.onBookingCom) presencePoints += 15;

  result.digitalPresenceScore = Math.min(presencePoints, 100);

  // Automation opportunity score
  let automationPoints = 100;
  if (result.whatsapp?.hasAutoReply) automationPoints -= 20;
  if (result.otaPresence?.otaDependencyScore && result.otaPresence.otaDependencyScore < 30) automationPoints -= 20;
  if (result.googleReviews?.responseRate && result.googleReviews.responseRate > 50) automationPoints -= 15;

  result.automationOpportunityScore = Math.max(automationPoints, 0);

  // Generate outreach hooks
  result.outreachHooks = [];
  
  if (result.googleReviews?.unansweredReviews && result.googleReviews.unansweredReviews > 10) {
    result.outreachHooks.push(`Tienes ${result.googleReviews.unansweredReviews} reseñas sin responder. Cada reseña sin respuesta es un cliente que siente que no le importas. — Phil McGill`);
  }

  if (result.otaPresence?.estimatedCommissionLoss && result.otaPresence.estimatedCommissionLoss > 1000) {
    result.outreachHooks.push(`Estás pagando ~$${Math.round(result.otaPresence.estimatedCommissionLoss).toLocaleString()}/mes en comisiones OTA. Con reservas directas, ese dinero se queda contigo. — Phil McGill`);
  }

  if (result.whatsapp?.responseTimeHook) {
    result.outreachHooks.push(result.whatsapp.responseTimeHook);
  }

  if (result.instagram?.scrapeSuccess && result.instagram.engagementEstimate === 'low') {
    result.outreachHooks.push(`${result.instagram.followers.toLocaleString()} seguidores pero engagement bajo = oportunidad perdida. — Phil McGill`);
  }

  return result;
}

export function formatIntelligenceSummary(intel: ComprehensiveIntelligence): string {
  const lines: string[] = [
    `INTELLIGENCE REPORT: ${intel.businessName}`,
    '='.repeat(50),
    '',
  ];

  if (intel.instagram?.scrapeSuccess) {
    lines.push('INSTAGRAM');
    lines.push(`   Followers: ${intel.instagram.followers.toLocaleString()}`);
    lines.push(`   Posts: ${intel.instagram.postsCount.toLocaleString()}`);
    lines.push(`   Tier: ${intel.instagram.followerTier}`);
    lines.push(`   Activity: ${intel.instagram.postingFrequency}`);
    lines.push('');
  }

  if (intel.googleReviews?.scrapeSuccess) {
    lines.push('GOOGLE REVIEWS');
    lines.push(`   Rating: ${intel.googleReviews.overallRating}/5`);
    lines.push(`   Total: ${intel.googleReviews.totalReviews.toLocaleString()}`);
    lines.push(`   Response Rate: ${intel.googleReviews.responseRate.toFixed(0)}%`);
    lines.push(`   Negative Reviews: ${intel.googleReviews.negativeReviewCount}`);
    if (intel.googleReviews.commonComplaints.length > 0) {
      lines.push(`   Common Issues: ${intel.googleReviews.commonComplaints.slice(0, 3).join(', ')}`);
    }
    lines.push('');
  }

  if (intel.tripadvisor?.scrapeSuccess) {
    lines.push('TRIPADVISOR');
    lines.push(`   Rating: ${intel.tripadvisor.rating}/5`);
    lines.push(`   Reviews: ${intel.tripadvisor.totalReviews.toLocaleString()}`);
    lines.push(`   Ranking: ${intel.tripadvisor.ranking}`);
    if (intel.tripadvisor.certificateOfExcellence) lines.push('   Award: Certificate of Excellence');
    if (intel.tripadvisor.travelerChoice) lines.push('   Award: Travelers\' Choice');
    lines.push('');
  }

  if (intel.otaPresence?.scrapeSuccess) {
    const otas: string[] = [];
    if (intel.otaPresence.onBookingCom) otas.push('Booking.com');
    if (intel.otaPresence.onExpedia) otas.push('Expedia');
    if (intel.otaPresence.onAirbnb) otas.push('Airbnb');
    if (intel.otaPresence.onViator) otas.push('Viator');

    lines.push('OTA PRESENCE');
    lines.push(`   Listed on: ${otas.length > 0 ? otas.join(', ') : 'None detected'}`);
    lines.push(`   Dependency Score: ${intel.otaPresence.otaDependencyScore}/100`);
    lines.push(`   Est. Commission Loss: $${intel.otaPresence.estimatedCommissionLoss.toLocaleString()}/month`);
    lines.push('');
  }

  if (intel.whatsapp?.scrapeSuccess) {
    lines.push('WHATSAPP');
    lines.push(`   Business Account: ${intel.whatsapp.hasWhatsappBusiness ? 'Yes' : 'No'}`);
    lines.push(`   Auto-Reply: ${intel.whatsapp.hasAutoReply ? 'Yes' : 'No'}`);
    lines.push(`   Est. Response: ${intel.whatsapp.estimatedResponseTime}`);
    lines.push('');
  }

  lines.push('SUMMARY SCORES');
  lines.push(`   Digital Presence: ${intel.digitalPresenceScore}/100`);
  lines.push(`   Automation Opportunity: ${intel.automationOpportunityScore}/100`);
  lines.push(`   Total Reviews: ${intel.totalReviewsAllPlatforms.toLocaleString()}`);
  lines.push(`   Avg Rating: ${intel.averageRatingAllPlatforms.toFixed(1)}/5`);

  return lines.join('\n');
}
