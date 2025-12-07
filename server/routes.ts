import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { CITIES, CATEGORIES, type Business, type InsertBusiness } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Business routes
  app.get('/api/businesses', isAuthenticated, async (req: any, res) => {
    try {
      const filters = {
        city: req.query.city as string,
        category: req.query.category as string,
        search: req.query.search as string,
        minScore: req.query.minScore ? parseInt(req.query.minScore as string) : undefined,
        maxScore: req.query.maxScore ? parseInt(req.query.maxScore as string) : undefined,
        aiReadiness: req.query.aiReadiness as string,
        outreachStatus: req.query.outreachStatus as string,
        hasEmail: req.query.hasEmail === 'true',
        hasWebsite: req.query.hasWebsite === 'true',
        isEnriched: req.query.isEnriched === 'true' ? true : req.query.isEnriched === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };
      const businesses = await storage.getBusinesses(filters);
      res.json(businesses);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({ message: "Failed to fetch businesses" });
    }
  });

  app.get('/api/businesses/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getBusinessStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/businesses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      res.json(business);
    } catch (error) {
      console.error("Error fetching business:", error);
      res.status(500).json({ message: "Failed to fetch business" });
    }
  });

  app.patch('/api/businesses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.updateBusiness(req.params.id, req.body);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      res.json(business);
    } catch (error) {
      console.error("Error updating business:", error);
      res.status(500).json({ message: "Failed to update business" });
    }
  });

  app.delete('/api/businesses/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteBusiness(req.params.id);
      res.json({ message: "Business deleted" });
    } catch (error) {
      console.error("Error deleting business:", error);
      res.status(500).json({ message: "Failed to delete business" });
    }
  });

  // Scan routes
  app.get('/api/scans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scans = await storage.getScans(userId);
      res.json(scans);
    } catch (error) {
      console.error("Error fetching scans:", error);
      res.status(500).json({ message: "Failed to fetch scans" });
    }
  });

  app.post('/api/scan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { city, category, enableAI = true, maxResults = 20 } = req.body;
      
      const cityData = CITIES.find(c => c.value === city);
      const categoryData = CATEGORIES.find(c => c.value === category);
      
      if (!cityData || !categoryData) {
        return res.status(400).json({ message: "Invalid city or category" });
      }

      const scan = await storage.createScan({
        userId,
        city,
        category,
        status: "scanning",
      });

      res.json({ scanId: scan.id, message: "Scan started" });

      // Process scan in background
      processScan(scan.id, cityData, categoryData, enableAI, maxResults).catch(err => {
        console.error("Scan error:", err);
        storage.updateScan(scan.id, { status: "failed", errorMessage: err.message });
      });
    } catch (error) {
      console.error("Error starting scan:", error);
      res.status(500).json({ message: "Failed to start scan" });
    }
  });

  app.get('/api/scans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const scan = await storage.getScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      res.json(scan);
    } catch (error) {
      console.error("Error fetching scan:", error);
      res.status(500).json({ message: "Failed to fetch scan" });
    }
  });

  // Batch scan endpoint - scan multiple cities and categories at once
  app.post('/api/scan/batch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { cities, categories, enableAI = true, maxResults = 20 } = req.body;
      
      if (!Array.isArray(cities) || !Array.isArray(categories) || cities.length === 0 || categories.length === 0) {
        return res.status(400).json({ message: "Cities and categories must be non-empty arrays" });
      }

      const scanIds: string[] = [];
      
      for (const city of cities) {
        for (const category of categories) {
          const cityData = CITIES.find(c => c.value === city);
          const categoryData = CATEGORIES.find(c => c.value === category);
          
          if (!cityData || !categoryData) continue;
          
          const scan = await storage.createScan({
            userId,
            city,
            category,
            status: "scanning",
          });
          
          scanIds.push(scan.id);
          
          // Process each scan in background
          processScan(scan.id, cityData, categoryData, enableAI, maxResults).catch(err => {
            console.error("Batch scan error:", err);
            storage.updateScan(scan.id, { status: "failed", errorMessage: err.message });
          });
        }
      }

      res.json({ scanIds, message: `Started ${scanIds.length} scans` });
    } catch (error) {
      console.error("Error starting batch scan:", error);
      res.status(500).json({ message: "Failed to start batch scan" });
    }
  });

  // AI Enrichment
  app.post('/api/businesses/:id/enrich', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const enriched = await enrichBusiness(business);
      const updated = await storage.updateBusiness(business.id, enriched);
      res.json(updated);
    } catch (error) {
      console.error("Error enriching business:", error);
      res.status(500).json({ message: "Failed to enrich business" });
    }
  });

  // Outreach
  app.get('/api/outreach', isAuthenticated, async (req: any, res) => {
    try {
      const campaigns = await storage.getOutreachCampaigns(req.query.businessId as string);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching outreach campaigns:", error);
      res.status(500).json({ message: "Failed to fetch outreach campaigns" });
    }
  });

  app.post('/api/outreach/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { businessId } = req.body;
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const email = await generateOutreachEmail(business);
      const campaign = await storage.createOutreachCampaign({
        userId,
        businessId,
        emailSubject: email.subject,
        emailBody: email.body,
        status: "draft",
      });

      res.json(campaign);
    } catch (error) {
      console.error("Error generating outreach:", error);
      res.status(500).json({ message: "Failed to generate outreach email" });
    }
  });

  app.patch('/api/outreach/:id', isAuthenticated, async (req: any, res) => {
    try {
      const campaign = await storage.updateOutreachCampaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.patch('/api/businesses/:id/outreach-status', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.body;
      const business = await storage.updateBusiness(req.params.id, { 
        outreachStatus: status,
        lastContactedAt: status === 'contacted' ? new Date() : undefined,
      });
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      res.json(business);
    } catch (error) {
      console.error("Error updating outreach status:", error);
      res.status(500).json({ message: "Failed to update outreach status" });
    }
  });

  // Export
  app.get('/api/export/csv', isAuthenticated, async (req: any, res) => {
    try {
      const filters = {
        city: req.query.city as string,
        category: req.query.category as string,
        aiReadiness: req.query.aiReadiness as string,
      };
      const businesses = await storage.getBusinesses(filters);
      
      const headers = ['Name', 'Category', 'City', 'Address', 'Phone', 'Email', 'Website', 'Rating', 'AI Score', 'Readiness', 'Outreach Hook'];
      const rows = businesses.map(b => [
        b.name,
        b.category,
        b.city,
        b.address || '',
        b.phone || '',
        b.email || '',
        b.website || '',
        b.rating?.toString() || '',
        b.aiScore?.toString() || '',
        b.aiReadiness || '',
        b.aiOutreachHook || '',
      ]);
      
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=businesses.csv');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  app.get('/api/export/movvia', isAuthenticated, async (req: any, res) => {
    try {
      const filters = {
        city: req.query.city as string,
        category: req.query.category as string,
      };
      const businesses = await storage.getBusinesses(filters);
      
      const movviaData = businesses.map(b => ({
        vendor_name: b.name,
        vendor_type: b.category,
        city: b.city,
        address: b.address,
        contact_phone: b.phone,
        contact_email: b.email,
        website_url: b.website,
        google_rating: b.rating,
        google_reviews: b.reviewCount,
        latitude: b.latitude,
        longitude: b.longitude,
        description: b.aiSummary,
        instagram_handle: b.instagram,
        facebook_url: b.facebook,
        whatsapp_number: b.whatsapp,
      }));
      
      res.json(movviaData);
    } catch (error) {
      console.error("Error exporting Movvia format:", error);
      res.status(500).json({ message: "Failed to export Movvia format" });
    }
  });

  // Website metadata scraper
  app.post('/api/businesses/:id/scrape', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      if (!business.website) {
        return res.status(400).json({ message: "Business has no website to scrape" });
      }

      const metadata = await scrapeWebsiteMetadata(business.website);
      const updated = await storage.updateBusiness(business.id, metadata);
      res.json(updated);
    } catch (error) {
      console.error("Error scraping website:", error);
      res.status(500).json({ message: "Failed to scrape website" });
    }
  });

  // Batch scan for multiple cities
  app.post('/api/scan/batch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { cities, categories, enableAI = true, maxResults = 20 } = req.body;
      
      if (!cities?.length || !categories?.length) {
        return res.status(400).json({ message: "Must provide at least one city and category" });
      }

      const scanIds: string[] = [];
      
      for (const cityValue of cities) {
        for (const categoryValue of categories) {
          const cityData = CITIES.find(c => c.value === cityValue);
          const categoryData = CATEGORIES.find(c => c.value === categoryValue);
          
          if (cityData && categoryData) {
            const scan = await storage.createScan({
              userId,
              city: cityValue,
              category: categoryValue,
              status: "scanning",
            });
            
            scanIds.push(scan.id);
            
            processScan(scan.id, cityData, categoryData, enableAI, maxResults).catch(err => {
              console.error("Batch scan error:", err);
              storage.updateScan(scan.id, { status: "failed", errorMessage: err.message });
            });
          }
        }
      }

      res.json({ scanIds, message: `Started ${scanIds.length} scans` });
    } catch (error) {
      console.error("Error starting batch scan:", error);
      res.status(500).json({ message: "Failed to start batch scan" });
    }
  });

  // Config/metadata
  app.get('/api/config', (req, res) => {
    res.json({ cities: CITIES, categories: CATEGORIES });
  });

  return httpServer;
}

// Google Places API integration
async function searchGooglePlaces(cityData: typeof CITIES[number], categoryData: typeof CATEGORIES[number], maxResults: number) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Google Places API key not configured");
  }

  const searchUrl = 'https://places.googleapis.com/v1/places:searchNearby';
  
  const response = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.priceLevel,places.location,places.googleMapsUri,places.regularOpeningHours,places.photos',
    },
    body: JSON.stringify({
      includedTypes: [categoryData.googleType],
      locationRestriction: {
        circle: {
          center: { latitude: cityData.coordinates.lat, longitude: cityData.coordinates.lng },
          radius: 10000,
        },
      },
      maxResultCount: Math.min(maxResults, 20),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Places API error: ${error}`);
  }

  const data = await response.json();
  return data.places || [];
}

async function processScan(
  scanId: string, 
  cityData: typeof CITIES[number], 
  categoryData: typeof CATEGORIES[number],
  enableAI: boolean,
  maxResults: number
) {
  try {
    const places = await searchGooglePlaces(cityData, categoryData, maxResults);
    
    await storage.updateScan(scanId, { totalFound: places.length });

    let enrichedCount = 0;
    for (const place of places) {
      const existing = place.id ? await storage.getBusinessByPlaceId(place.id) : null;
      
      // Parse price level - Google returns strings like "PRICE_LEVEL_FREE", "PRICE_LEVEL_INEXPENSIVE", etc.
      const parsePriceLevel = (priceStr: string | undefined): number | null => {
        if (!priceStr) return null;
        const priceLevels: Record<string, number> = {
          'PRICE_LEVEL_FREE': 0,
          'PRICE_LEVEL_INEXPENSIVE': 1,
          'PRICE_LEVEL_MODERATE': 2,
          'PRICE_LEVEL_EXPENSIVE': 3,
          'PRICE_LEVEL_VERY_EXPENSIVE': 4,
        };
        return priceLevels[priceStr] ?? null;
      };

      const businessData: InsertBusiness = {
        placeId: place.id,
        name: place.displayName?.text || 'Unknown',
        category: categoryData.value,
        city: cityData.value,
        address: place.formattedAddress,
        phone: place.internationalPhoneNumber || place.nationalPhoneNumber,
        website: place.websiteUri,
        rating: place.rating ? parseFloat(place.rating) : null,
        reviewCount: place.userRatingCount ? parseInt(place.userRatingCount) : null,
        priceLevel: parsePriceLevel(place.priceLevel),
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
        googleMapsUrl: place.googleMapsUri,
        openingHours: place.regularOpeningHours?.weekdayDescriptions || null,
        photoUrl: place.photos?.[0]?.name ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&key=${process.env.GOOGLE_PLACES_API_KEY}` : null,
      };

      let business: Business;
      try {
        if (existing) {
          business = (await storage.updateBusiness(existing.id, businessData))!;
        } else {
          business = await storage.createBusiness(businessData);
        }

        if (enableAI && !business.isEnriched) {
          try {
            const enriched = await enrichBusiness(business);
            await storage.updateBusiness(business.id, enriched);
            enrichedCount++;
            await storage.updateScan(scanId, { totalEnriched: enrichedCount });
          } catch (err) {
            console.error(`Failed to enrich ${business.name}:`, err);
          }
        }
      } catch (err: any) {
        console.error(`Failed to save business ${businessData.name}:`, err.message);
        // Continue processing other businesses
      }
    }

    await storage.updateScan(scanId, { 
      status: "completed", 
      completedAt: new Date(),
      totalEnriched: enrichedCount,
    });
  } catch (error: any) {
    await storage.updateScan(scanId, { 
      status: "failed", 
      errorMessage: error.message,
    });
    throw error;
  }
}

async function enrichBusiness(business: Business): Promise<Partial<InsertBusiness>> {
  const prompt = `Analyze this business for partnership potential with a luxury travel/experience platform in Colombia.

Business: ${business.name}
Category: ${business.category}
City: ${business.city}
Rating: ${business.rating || 'N/A'} (${business.reviewCount || 0} reviews)
Website: ${business.website || 'None'}
Address: ${business.address || 'N/A'}

Provide a JSON response with:
1. "score" (0-100): Partnership opportunity score based on quality, online presence, and fit
2. "readiness" ("high", "medium", "low"): How ready they are for digital partnerships
3. "classification": Brief category classification (e.g., "Upscale Restaurant", "Boutique Hotel")
4. "summary": 2-3 sentence summary of the business and partnership potential
5. "outreachHook": A personalized opening line for outreach email highlighting why they'd benefit from partnership

Respond ONLY with valid JSON, no markdown.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const result = JSON.parse(content);
  
  return {
    aiScore: result.score,
    aiReadiness: result.readiness,
    aiClassification: result.classification,
    aiSummary: result.summary,
    aiOutreachHook: result.outreachHook,
    isEnriched: true,
    enrichedAt: new Date(),
  };
}

async function generateOutreachEmail(business: Business): Promise<{ subject: string; body: string }> {
  const prompt = `Generate a professional outreach email for a luxury travel platform reaching out to this business for partnership.

Business: ${business.name}
Category: ${business.category}
City: ${business.city}
AI Hook: ${business.aiOutreachHook || 'None'}
Classification: ${business.aiClassification || business.category}
Summary: ${business.aiSummary || 'None'}

Create a personalized, professional email that:
1. References something specific about their business
2. Explains the partnership value proposition
3. Includes a clear call-to-action
4. Is concise (under 200 words)

Respond with JSON containing "subject" and "body" fields only.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return JSON.parse(content);
}

async function scrapeWebsiteMetadata(websiteUrl: string): Promise<Partial<InsertBusiness>> {
  try {
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const metadata: Partial<InsertBusiness> = {};

    // Helper to sanitize extracted values
    const sanitizeEmail = (email: string): string => {
      return email
        .toLowerCase()
        .trim()
        .replace(/^["'\s]+|["'\s>]+$/g, '') // Remove quotes, spaces, HTML chars at ends
        .replace(/[?#].*/g, '') // Remove query strings
        .split(/[&\s<>]/)[0]; // Take only valid part before invalid chars
    };

    // Priority 1: Extract emails from mailto: links (most reliable)
    const mailtoMatches = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi) || [];
    const cleanedMailtoEmails = mailtoMatches.map(m => sanitizeEmail(m.replace(/^mailto:/i, '')));

    // Priority 2: Extract emails from href attributes and data attributes  
    const hrefMatches = html.match(/(?:href|data-email)=["']([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi) || [];
    const cleanedHrefEmails = hrefMatches.map(m => sanitizeEmail(m.replace(/^(?:href|data-email)=["']?/i, '')));

    // Priority 3: General email pattern matching
    const generalEmailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const generalEmails = (html.match(generalEmailPattern) || []).map(sanitizeEmail);

    // Combine and filter emails
    const allEmails = [...cleanedMailtoEmails, ...cleanedHrefEmails, ...generalEmails];
    const invalidPatterns = [
      'example.com', 'domain.com', 'test.com', 'email.com', 'yoursite.com',
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js',
      'wixpress.com', 'sentry.io', 'googleapis.com', 'cloudflare.com',
      'facebook.com', 'twitter.com', 'instagram.com', 'google.com',
      '@2x.', '@3x.', 'placeholder', 'noreply', 'no-reply'
    ];
    
    // Prioritize business-like emails (info@, contact@, reservas@, ventas@, etc.)
    const priorityPrefixes = ['info', 'contact', 'contacto', 'reservas', 'reservations', 'ventas', 'sales', 'hola', 'hello', 'admin', 'booking'];
    
    const validEmails = allEmails
      .map(e => e.toLowerCase().trim())
      .filter(e => !invalidPatterns.some(p => e.includes(p)))
      .filter(e => e.includes('@') && e.includes('.'))
      .filter(e => e.length < 60);
    
    const uniqueEmails = Array.from(new Set(validEmails));
    
    // Sort by priority - business emails first
    const sortedEmails = uniqueEmails.sort((a, b) => {
      const aPrefix = a.split('@')[0];
      const bPrefix = b.split('@')[0];
      const aIsPriority = priorityPrefixes.some(p => aPrefix.startsWith(p));
      const bIsPriority = priorityPrefixes.some(p => bPrefix.startsWith(p));
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return 0;
    });

    // Final validation - ensure email has proper format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const finalEmail = sortedEmails.find(e => emailRegex.test(e));
    if (finalEmail) {
      metadata.email = finalEmail;
    }

    // Extract phone numbers with Colombian and international formats
    const phonePatterns = [
      /\+57[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
      /\+57[\s.-]?\d{10}/g,
      /\+1[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
      /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
      /\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/g,
      /\+\d{1,3}[\s.-]?\d{6,12}/g,
    ];
    
    for (const pattern of phonePatterns) {
      const phones = html.match(pattern);
      if (phones && phones.length > 0) {
        const phone = phones[0].replace(/[^\d+]/g, '');
        if (phone.length >= 10 && phone.length <= 15) {
          if (!metadata.phone) {
            metadata.phone = phone;
          }
          break;
        }
      }
    }

    // Extract Instagram (improved patterns)
    const instagramPatterns = [
      /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/gi,
      /@([a-zA-Z0-9_.]+)(?:\s*(?:en\s*)?instagram)/gi,
      /instagram[:\s]*@?([a-zA-Z0-9_.]+)/gi,
    ];
    const excludedInstaHandles = ['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'about', 'help', 'share', 'intent'];
    
    for (const pattern of instagramPatterns) {
      const match = html.match(pattern);
      if (match) {
        // Sanitize: take only alphanumeric, underscore, period and validate
        const handle = match[0]
          .replace(/.*[\/=@]/, '')
          .replace(/["\s<>?&#\/].*/g, '')
          .replace(/[^a-zA-Z0-9_.]/g, '')
          .trim();
        if (handle && handle.length > 1 && handle.length < 30 && !excludedInstaHandles.includes(handle.toLowerCase())) {
          metadata.instagram = handle;
          break;
        }
      }
    }

    // Extract Facebook (improved)
    const facebookPatterns = [
      /facebook\.com\/(?:pages\/)?([a-zA-Z0-9._-]+)/gi,
      /fb\.com\/([a-zA-Z0-9._-]+)/gi,
    ];
    const excludedFbPages = ['sharer', 'share', 'plugins', 'tr', 'dialog', 'login', 'profile.php', 'watch', 'groups'];
    
    for (const pattern of facebookPatterns) {
      const match = html.match(pattern);
      if (match) {
        // Sanitize: extract only the page name portion
        const page = match[0]
          .replace(/.*facebook\.com\/(?:pages\/)?|.*fb\.com\//gi, '')
          .replace(/[?\/#"'&<>].*/g, '')
          .replace(/[^a-zA-Z0-9._-]/g, '')
          .trim();
        if (page && page.length > 1 && page.length < 50 && !excludedFbPages.includes(page.toLowerCase())) {
          metadata.facebook = `https://facebook.com/${page}`;
          break;
        }
      }
    }

    // Extract WhatsApp (improved patterns) - use capturing groups
    const whatsappPatterns = [
      /wa\.me\/(\d{10,15})/i,
      /api\.whatsapp\.com\/send\?phone=(\d{10,15})/i,
      /whatsapp\.com\/send\?phone=(\d{10,15})/i,
    ];
    
    for (const pattern of whatsappPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        // Use capturing group result directly - already contains only digits
        const number = match[1];
        if (number.length >= 10 && number.length <= 15) {
          metadata.whatsapp = number;
          break;
        }
      }
    }
    
    // Log what was found for debugging
    console.log(`Scraped ${websiteUrl}: email=${metadata.email || 'none'}, phone=${metadata.phone || 'none'}, instagram=${metadata.instagram || 'none'}, facebook=${metadata.facebook || 'none'}, whatsapp=${metadata.whatsapp || 'none'}`);

    return metadata;
  } catch (error) {
    console.error(`Failed to scrape ${websiteUrl}:`, error);
    return {};
  }
}
