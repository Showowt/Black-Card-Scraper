import type { Express } from "express";
import { type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  CITIES, CATEGORIES, TEXT_SEARCH_SUPPLEMENTS, VERTICAL_INTELLIGENCE,
  EVENT_TIERS, EVENT_CATEGORIES, EVENT_SOURCES, INTENT_LEVELS, CARTAGENA_VENUES_TO_MONITOR, CONTENT_TYPES,
  type Business, type InsertBusiness, type OutreachCampaign,
  type Event, type InsertEvent, type IntentSignal, type InsertIntentSignal,
  type VenueMonitor, type InsertVenueMonitor, type InstagramPost, type InsertInstagramPost,
  type AuthorityContent, type InsertAuthorityContent,
  insertEventSchema, insertIntentSignalSchema, insertVenueMonitorSchema, insertAuthorityContentSchema
} from "@shared/schema";
import OpenAI from "openai";
import {
  generateMultiChannelScripts,
  handleObjection,
  draftResponse,
  analyzeConversation,
} from "./claudeCopilot";

// Validation schemas for batch operations
const BatchEnrichSchema = z.object({
  businessIds: z.array(z.string().uuid()).min(1).optional(),
  filters: z.object({
    city: z.string().optional(),
    category: z.string().optional(),
  }).optional(),
  limit: z.number().min(1).max(100).default(25),
}).refine(
  data => (data.businessIds && data.businessIds.length > 0) || data.filters !== undefined || data.limit,
  { message: "Must provide businessIds, filters, or limit" }
);

const BatchOutreachSchema = z.object({
  businessIds: z.array(z.string().uuid()).min(1).optional(),
  filters: z.object({
    city: z.string().optional(),
    category: z.string().optional(),
    limit: z.number().min(1).max(100).default(50),
  }).optional(),
}).refine(
  data => (data.businessIds && data.businessIds.length > 0) || data.filters !== undefined,
  { message: "Must provide businessIds or filters" }
);

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

  // Batch AI Enrichment
  app.post('/api/businesses/enrich/batch', isAuthenticated, async (req: any, res) => {
    try {
      // Validate input
      const parseResult = BatchEnrichSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.errors 
        });
      }
      const { businessIds, filters, limit } = parseResult.data;
      
      let targetBusinesses: Business[] = [];
      
      if (businessIds && businessIds.length > 0) {
        for (const id of businessIds) {
          const business = await storage.getBusiness(id);
          if (business && !business.isEnriched) targetBusinesses.push(business);
        }
      } else if (filters) {
        targetBusinesses = await storage.getBusinesses({
          ...filters,
          isEnriched: false,
          limit: limit,
        });
      } else {
        targetBusinesses = await storage.getBusinesses({
          isEnriched: false,
          limit: limit,
        });
      }
      
      if (targetBusinesses.length === 0) {
        return res.json({ 
          totalProcessed: 0, 
          enriched: 0, 
          errors: 0, 
          message: "No unenriched businesses found" 
        });
      }
      
      const results = { enriched: 0, errors: 0, errorDetails: [] as { id: string; error: string }[] };
      
      for (const business of targetBusinesses) {
        try {
          const enriched = await enrichBusiness(business);
          await storage.updateBusiness(business.id, enriched);
          results.enriched++;
          
          // Rate limiting between enrichments
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          results.errors++;
          results.errorDetails.push({ id: business.id, error: error.message });
        }
      }
      
      res.json({
        totalProcessed: targetBusinesses.length,
        enriched: results.enriched,
        errors: results.errors,
        errorDetails: results.errorDetails,
      });
    } catch (error) {
      console.error("Error in batch enrichment:", error);
      res.status(500).json({ message: "Failed to batch enrich businesses" });
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

  // Batch outreach generation with streaming progress
  app.post('/api/outreach/batch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate input
      const parseResult = BatchOutreachSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.errors 
        });
      }
      const { businessIds, filters } = parseResult.data;
      
      let targetBusinesses: Business[] = [];
      
      if (businessIds && businessIds.length > 0) {
        // Get specific businesses by ID
        for (const id of businessIds) {
          const business = await storage.getBusiness(id);
          if (business) targetBusinesses.push(business);
        }
      } else if (filters) {
        // Get businesses matching filters
        targetBusinesses = await storage.getBusinesses({
          ...filters,
          limit: filters.limit || 50, // Default limit for batch
        });
      }
      
      if (targetBusinesses.length === 0) {
        return res.status(400).json({ message: "No businesses found for batch outreach" });
      }
      
      // Filter to only high-value prospects (score >= 60, or all if no scores yet)
      const prospects = targetBusinesses.filter(b => 
        b.isEnriched && (b.aiScore === null || b.aiScore >= 60)
      );
      
      if (prospects.length === 0) {
        return res.status(400).json({ 
          message: "No enriched high-value businesses found. Enrich businesses first." 
        });
      }
      
      // Generate outreach for each prospect
      const results: { success: OutreachCampaign[]; errors: { businessId: string; error: string }[] } = {
        success: [],
        errors: [],
      };
      
      for (const business of prospects) {
        try {
          // Check if campaign already exists for this business
          const existingCampaigns = await storage.getOutreachCampaigns(business.id);
          if (existingCampaigns.length > 0) {
            // Skip if already has outreach
            continue;
          }
          
          const email = await generateOutreachEmail(business);
          const campaign = await storage.createOutreachCampaign({
            userId,
            businessId: business.id,
            emailSubject: email.subject,
            emailBody: email.body,
            status: "draft",
          });
          results.success.push(campaign);
          
          // Rate limiting between generations
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          results.errors.push({
            businessId: business.id,
            error: error.message || "Failed to generate email",
          });
        }
      }
      
      res.json({
        totalProcessed: prospects.length,
        generated: results.success.length,
        skipped: prospects.length - results.success.length - results.errors.length,
        errors: results.errors.length,
        campaigns: results.success,
        errorDetails: results.errors,
      });
    } catch (error) {
      console.error("Error in batch outreach:", error);
      res.status(500).json({ message: "Failed to generate batch outreach" });
    }
  });

  // Get all outreach campaigns with filters
  app.get('/api/outreach/all', isAuthenticated, async (req: any, res) => {
    try {
      const status = req.query.status as string;
      const campaigns = await storage.getAllOutreachCampaigns(status);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching all campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  // Delete outreach campaign
  app.delete('/api/outreach/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteOutreachCampaign(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
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

  // Multi-channel outreach with Claude AI
  app.post('/api/outreach/multi-channel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { businessId, framework } = req.body;
      
      if (!businessId) {
        return res.status(400).json({ message: "businessId is required" });
      }
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const scripts = await generateMultiChannelScripts(business, framework);
      
      // Create or update campaign with multi-channel scripts
      const existingCampaigns = await storage.getOutreachCampaigns(businessId);
      let campaign;
      
      if (existingCampaigns.length > 0) {
        campaign = await storage.updateOutreachCampaign(existingCampaigns[0].id, {
          ...scripts,
          status: "draft",
        });
      } else {
        campaign = await storage.createOutreachCampaign({
          userId,
          businessId,
          ...scripts,
          status: "draft",
        });
      }
      
      res.json({ campaign, scripts });
    } catch (error) {
      console.error("Error generating multi-channel scripts:", error);
      res.status(500).json({ message: "Failed to generate multi-channel scripts" });
    }
  });

  // Batch multi-channel outreach
  app.post('/api/outreach/multi-channel/batch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { businessIds, filters, limit = 10 } = req.body;
      
      let targetBusinesses: Business[] = [];
      
      if (businessIds && businessIds.length > 0) {
        for (const id of businessIds) {
          const business = await storage.getBusiness(id);
          if (business) targetBusinesses.push(business);
        }
      } else if (filters) {
        targetBusinesses = await storage.getBusinesses({
          ...filters,
          limit: limit,
        });
      }
      
      // Filter to enriched businesses with contact info
      const prospects = targetBusinesses.filter(b => 
        b.isEnriched && (b.phone || b.whatsapp || b.instagram)
      ).slice(0, limit);
      
      if (prospects.length === 0) {
        return res.status(400).json({ 
          message: "No businesses found with contact info. Enrich and scrape websites first." 
        });
      }
      
      const results: { success: any[]; errors: { businessId: string; error: string }[] } = {
        success: [],
        errors: [],
      };
      
      for (const business of prospects) {
        try {
          const scripts = await generateMultiChannelScripts(business);
          
          const existingCampaigns = await storage.getOutreachCampaigns(business.id);
          let campaign;
          
          if (existingCampaigns.length > 0) {
            campaign = await storage.updateOutreachCampaign(existingCampaigns[0].id, {
              ...scripts,
            });
          } else {
            campaign = await storage.createOutreachCampaign({
              userId,
              businessId: business.id,
              ...scripts,
              status: "draft",
            });
          }
          
          results.success.push({ business: business.name, campaign });
          
          // Rate limiting between AI calls
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          results.errors.push({
            businessId: business.id,
            error: error.message || "Failed to generate scripts",
          });
        }
      }
      
      res.json({
        totalProcessed: prospects.length,
        generated: results.success.length,
        errors: results.errors.length,
        results: results.success,
        errorDetails: results.errors,
      });
    } catch (error) {
      console.error("Error in batch multi-channel outreach:", error);
      res.status(500).json({ message: "Failed to generate batch multi-channel outreach" });
    }
  });

  // Claude Copilot - Draft Response
  app.post('/api/copilot/respond', isAuthenticated, async (req: any, res) => {
    try {
      const { businessId, theirMessage, conversationHistory, intent } = req.body;
      
      if (!businessId || !theirMessage) {
        return res.status(400).json({ message: "businessId and theirMessage are required" });
      }
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = await draftResponse(theirMessage, business, conversationHistory, intent);
      res.json(result);
    } catch (error) {
      console.error("Error drafting response:", error);
      res.status(500).json({ message: "Failed to draft response" });
    }
  });

  // Claude Copilot - Handle Objection
  app.post('/api/copilot/objection', isAuthenticated, async (req: any, res) => {
    try {
      const { businessId, theirMessage, conversationHistory } = req.body;
      
      if (!businessId || !theirMessage) {
        return res.status(400).json({ message: "businessId and theirMessage are required" });
      }
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = await handleObjection(theirMessage, business, conversationHistory);
      res.json(result);
    } catch (error) {
      console.error("Error handling objection:", error);
      res.status(500).json({ message: "Failed to handle objection" });
    }
  });

  // Claude Copilot - Analyze Conversation
  app.post('/api/copilot/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const { businessId, conversationHistory } = req.body;
      
      if (!businessId || !conversationHistory) {
        return res.status(400).json({ message: "businessId and conversationHistory are required" });
      }
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = await analyzeConversation(conversationHistory, business);
      res.json(result);
    } catch (error) {
      console.error("Error analyzing conversation:", error);
      res.status(500).json({ message: "Failed to analyze conversation" });
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
    res.json({ 
      cities: CITIES, 
      categories: CATEGORIES,
      eventTiers: EVENT_TIERS,
      eventCategories: EVENT_CATEGORIES,
      eventSources: EVENT_SOURCES,
      intentLevels: INTENT_LEVELS,
      contentTypes: CONTENT_TYPES,
    });
  });

  // ==================== EVENTS API ====================
  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const filters = {
        city: req.query.city as string,
        category: req.query.category as string,
        eventTier: req.query.eventTier as string,
        source: req.query.source as string,
        isFlagged: req.query.isFlagged === 'true' ? true : undefined,
        startDateFrom: req.query.startDateFrom ? new Date(req.query.startDateFrom as string) : undefined,
        startDateTo: req.query.startDateTo ? new Date(req.query.startDateTo as string) : undefined,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };
      const events = await storage.getEvents(filters);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getEventStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching event stats:", error);
      res.status(500).json({ message: "Failed to fetch event stats" });
    }
  });

  app.get('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      // Transform date strings to Date objects before validation
      const body = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };
      const validated = insertEventSchema.parse(body);
      const event = await storage.createEvent(validated);
      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Transform date strings to Date objects if present
      const body = { ...req.body };
      if (body.startDate) body.startDate = new Date(body.startDate);
      if (body.endDate) body.endDate = new Date(body.endDate);
      
      const event = await storage.updateEvent(req.params.id, body);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.json({ message: "Event deleted" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ==================== INTENT SIGNALS API ====================
  app.get('/api/intent-signals', isAuthenticated, async (req: any, res) => {
    try {
      const filters = {
        intentLevel: req.query.intentLevel as string,
        source: req.query.source as string,
        isProcessed: req.query.isProcessed === 'true' ? true : req.query.isProcessed === 'false' ? false : undefined,
        isComplaint: req.query.isComplaint === 'true' ? true : undefined,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };
      const signals = await storage.getIntentSignals(filters);
      res.json(signals);
    } catch (error) {
      console.error("Error fetching intent signals:", error);
      res.status(500).json({ message: "Failed to fetch intent signals" });
    }
  });

  app.get('/api/intent-signals/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getIntentSignalStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching intent signal stats:", error);
      res.status(500).json({ message: "Failed to fetch intent signal stats" });
    }
  });

  app.get('/api/intent-signals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const signal = await storage.getIntentSignal(req.params.id);
      if (!signal) {
        return res.status(404).json({ message: "Intent signal not found" });
      }
      res.json(signal);
    } catch (error) {
      console.error("Error fetching intent signal:", error);
      res.status(500).json({ message: "Failed to fetch intent signal" });
    }
  });

  app.post('/api/intent-signals', isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertIntentSignalSchema.parse(req.body);
      const signal = await storage.createIntentSignal(validated);
      res.json(signal);
    } catch (error) {
      console.error("Error creating intent signal:", error);
      res.status(500).json({ message: "Failed to create intent signal" });
    }
  });

  app.patch('/api/intent-signals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const signal = await storage.updateIntentSignal(req.params.id, req.body);
      if (!signal) {
        return res.status(404).json({ message: "Intent signal not found" });
      }
      res.json(signal);
    } catch (error) {
      console.error("Error updating intent signal:", error);
      res.status(500).json({ message: "Failed to update intent signal" });
    }
  });

  app.delete('/api/intent-signals/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteIntentSignal(req.params.id);
      res.json({ message: "Intent signal deleted" });
    } catch (error) {
      console.error("Error deleting intent signal:", error);
      res.status(500).json({ message: "Failed to delete intent signal" });
    }
  });

  // ==================== VENUE MONITORS API ====================
  app.get('/api/venue-monitors', isAuthenticated, async (req: any, res) => {
    try {
      const filters = {
        city: req.query.city as string,
        tier: req.query.tier as string,
        category: req.query.category as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        priority: req.query.priority ? parseInt(req.query.priority as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };
      const venues = await storage.getVenueMonitors(filters);
      res.json(venues);
    } catch (error) {
      console.error("Error fetching venue monitors:", error);
      res.status(500).json({ message: "Failed to fetch venue monitors" });
    }
  });

  app.get('/api/venue-monitors/defaults', isAuthenticated, async (req: any, res) => {
    try {
      res.json(CARTAGENA_VENUES_TO_MONITOR);
    } catch (error) {
      console.error("Error fetching default venues:", error);
      res.status(500).json({ message: "Failed to fetch default venues" });
    }
  });

  app.get('/api/venue-monitors/:id', isAuthenticated, async (req: any, res) => {
    try {
      const venue = await storage.getVenueMonitor(req.params.id);
      if (!venue) {
        return res.status(404).json({ message: "Venue monitor not found" });
      }
      res.json(venue);
    } catch (error) {
      console.error("Error fetching venue monitor:", error);
      res.status(500).json({ message: "Failed to fetch venue monitor" });
    }
  });

  app.post('/api/venue-monitors', isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertVenueMonitorSchema.parse(req.body);
      const venue = await storage.createVenueMonitor(validated);
      res.json(venue);
    } catch (error) {
      console.error("Error creating venue monitor:", error);
      res.status(500).json({ message: "Failed to create venue monitor" });
    }
  });

  app.post('/api/venue-monitors/seed-defaults', isAuthenticated, async (req: any, res) => {
    try {
      const existing = await storage.getVenueMonitors({});
      const existingHandles = new Set(existing.map(v => v.instagramHandle));
      
      const created: VenueMonitor[] = [];
      for (const venue of CARTAGENA_VENUES_TO_MONITOR) {
        if (!existingHandles.has(venue.handle)) {
          const newVenue = await storage.createVenueMonitor({
            name: venue.name,
            instagramHandle: venue.handle,
            instagramUrl: `https://instagram.com/${venue.handle}`,
            category: venue.category,
            tier: venue.tier,
            city: "Cartagena",
            priority: venue.priority,
            keywords: venue.keywords as string[],
            isActive: true,
          });
          created.push(newVenue);
        }
      }
      
      res.json({ message: `Seeded ${created.length} default venues`, created });
    } catch (error) {
      console.error("Error seeding venue monitors:", error);
      res.status(500).json({ message: "Failed to seed venue monitors" });
    }
  });

  app.patch('/api/venue-monitors/:id', isAuthenticated, async (req: any, res) => {
    try {
      const venue = await storage.updateVenueMonitor(req.params.id, req.body);
      if (!venue) {
        return res.status(404).json({ message: "Venue monitor not found" });
      }
      res.json(venue);
    } catch (error) {
      console.error("Error updating venue monitor:", error);
      res.status(500).json({ message: "Failed to update venue monitor" });
    }
  });

  app.delete('/api/venue-monitors/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteVenueMonitor(req.params.id);
      res.json({ message: "Venue monitor deleted" });
    } catch (error) {
      console.error("Error deleting venue monitor:", error);
      res.status(500).json({ message: "Failed to delete venue monitor" });
    }
  });

  // ==================== INSTAGRAM POSTS API ====================
  app.get('/api/instagram-posts', isAuthenticated, async (req: any, res) => {
    try {
      const filters = {
        venueHandle: req.query.venueHandle as string,
        isEventAnnouncement: req.query.isEventAnnouncement === 'true' ? true : undefined,
        isProcessed: req.query.isProcessed === 'true' ? true : req.query.isProcessed === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      };
      const posts = await storage.getInstagramPosts(filters);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching instagram posts:", error);
      res.status(500).json({ message: "Failed to fetch instagram posts" });
    }
  });

  app.patch('/api/instagram-posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const post = await storage.updateInstagramPost(req.params.id, req.body);
      if (!post) {
        return res.status(404).json({ message: "Instagram post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error updating instagram post:", error);
      res.status(500).json({ message: "Failed to update instagram post" });
    }
  });

  // ==================== AUTHORITY CONTENT API ====================
  app.get('/api/content', isAuthenticated, async (req: any, res) => {
    try {
      const filters = {
        contentType: req.query.contentType as string,
        city: req.query.city as string,
        category: req.query.category as string,
        status: req.query.status as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      };
      const content = await storage.getAuthorityContentList(filters);
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.get('/api/content/:id', isAuthenticated, async (req: any, res) => {
    try {
      const content = await storage.getAuthorityContent(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post('/api/content', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertAuthorityContentSchema.parse({ ...req.body, userId });
      const content = await storage.createAuthorityContent(validated);
      res.json(content);
    } catch (error) {
      console.error("Error creating content:", error);
      res.status(500).json({ message: "Failed to create content" });
    }
  });

  app.post('/api/content/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { contentType, city, category, businessIds, prompt: userPrompt } = req.body;
      
      // Get businesses if provided for context
      let businessContext = "";
      if (businessIds && businessIds.length > 0) {
        const businesses = await Promise.all(
          businessIds.slice(0, 5).map((id: string) => storage.getBusiness(id))
        );
        businessContext = businesses
          .filter(Boolean)
          .map((b: any) => `- ${b.name}: ${b.aiClassification || b.category}, Rating ${b.rating || 'N/A'}`)
          .join("\n");
      }

      const contentTypeInfo = CONTENT_TYPES.find(c => c.value === contentType) || { label: "Article" };
      
      const prompt = `Generate a ${contentTypeInfo.label} about ${category || "local experiences"} in ${city || "Cartagena"}, Colombia.

${userPrompt ? `USER REQUEST: ${userPrompt}\n` : ""}
${businessContext ? `FEATURED BUSINESSES:\n${businessContext}\n` : ""}

Create engaging, SEO-optimized content for a luxury travel/concierge platform. The content should:
1. Be authentic and informative (not generic tourist content)
2. Include insider tips and local knowledge
3. Naturally mention featured businesses if provided
4. Be appropriate for the content type (${contentTypeInfo.label})
5. Include a compelling title and meta description

OUTPUT JSON:
{
  "title": "Compelling title here",
  "content": "Full article content with markdown formatting",
  "metaDescription": "SEO meta description under 160 chars",
  "keywords": ["keyword1", "keyword2", ...]
}

OUTPUT ONLY VALID JSON.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      
      const content = await storage.createAuthorityContent({
        userId,
        contentType: contentType || "guide",
        title: result.title,
        content: result.content,
        city: city || "Cartagena",
        category,
        relatedBusinessIds: businessIds || [],
        keywords: result.keywords || [],
        metaDescription: result.metaDescription,
        status: "draft",
      });

      res.json(content);
    } catch (error) {
      console.error("Error generating content:", error);
      res.status(500).json({ message: "Failed to generate content" });
    }
  });

  app.patch('/api/content/:id', isAuthenticated, async (req: any, res) => {
    try {
      const content = await storage.updateAuthorityContent(req.params.id, req.body);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error updating content:", error);
      res.status(500).json({ message: "Failed to update content" });
    }
  });

  app.delete('/api/content/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteAuthorityContent(req.params.id);
      res.json({ message: "Content deleted" });
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
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

// Text search for categories with limited Places API coverage
async function textSearchGooglePlaces(cityData: typeof CITIES[number], query: string, maxResults: number = 10) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Google Places API key not configured");
  }

  const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
  
  const response = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.priceLevel,places.location,places.googleMapsUri,places.regularOpeningHours,places.photos',
    },
    body: JSON.stringify({
      textQuery: `${query} ${cityData.label}`,
      locationBias: {
        circle: {
          center: { latitude: cityData.coordinates.lat, longitude: cityData.coordinates.lng },
          radius: 15000,
        },
      },
      maxResultCount: Math.min(maxResults, 20),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Text search error for "${query}":`, error);
    return [];
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
    // Standard nearby search
    let places = await searchGooglePlaces(cityData, categoryData, maxResults);
    
    // For categories with limited Places API coverage, also do text searches
    const textSearchQueries = TEXT_SEARCH_SUPPLEMENTS[categoryData.value];
    if (textSearchQueries && textSearchQueries.length > 0) {
      console.log(`Running ${textSearchQueries.length} text searches for ${categoryData.value} in ${cityData.label}`);
      
      for (const query of textSearchQueries.slice(0, 3)) { // Limit to 3 queries to control costs
        const textResults = await textSearchGooglePlaces(cityData, query, 5);
        places = places.concat(textResults);
        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
      }
      
      // Deduplicate by place ID
      const seenIds = new Set<string>();
      places = places.filter((p: any) => {
        if (!p.id || seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
      });
      
      console.log(`Found ${places.length} unique places after text search for ${categoryData.value}`);
    }
    
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
  // Get vertical intelligence for this category
  const verticalIntel = VERTICAL_INTELLIGENCE[business.category] || {
    painPoints: ["Customer inquiries across multiple channels", "Manual booking and scheduling", "Follow-up and retention is inconsistent"],
    automations: ["AI-powered inquiry handling", "Automated booking system", "Customer follow-up sequences"],
    hookAngles: ["customer communication", "booking process", "online presence"],
  };

  const prompt = `Generate a personalized cold outreach email for an AI automation agency targeting this business.

BUSINESS:
- Name: ${business.name}
- Type: ${business.aiClassification || business.category}
- City: ${business.city}
- Website: ${business.website || "None"}
- Rating: ${business.rating || "N/A"} (${business.reviewCount || 0} reviews)
- Has Instagram: ${!!business.instagram}
- Has WhatsApp: ${!!business.whatsapp}
- AI Summary: ${business.aiSummary || "Local business"}
- Outreach Hook: ${business.aiOutreachHook || ""}

VERTICAL INTELLIGENCE FOR ${business.category.toUpperCase()}:
- Common Pain Points: ${JSON.stringify(verticalIntel.painPoints.slice(0, 3))}
- Relevant Automations: ${JSON.stringify(verticalIntel.automations.slice(0, 3))}
- Hook Angles: ${JSON.stringify(verticalIntel.hookAngles)}

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
{
    "subject": "Subject line here",
    "body": "Full email body here"
}

OUTPUT ONLY VALID JSON.`;

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
