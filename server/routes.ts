import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { z } from "zod";
import bcrypt from "bcrypt";
import cryptoRandomString from "crypto-random-string";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getSession } from "./replitAuth";
import { 
  CITIES, CATEGORIES, TEXT_SEARCH_SUPPLEMENTS, VERTICAL_INTELLIGENCE, CATEGORY_SOLUTIONS, OBJECTION_PATTERNS,
  EVENT_TIERS, EVENT_CATEGORIES, EVENT_SOURCES, INTENT_LEVELS, CARTAGENA_VENUES_TO_MONITOR, CONTENT_TYPES,
  COLOMBIA_STATS, VERTICAL_TICKET_RANGES, COLOMBIA_PSYCHOLOGY_TRIGGERS, CONPES_POSITIONING,
  DECISION_MAKER_TYPES, BUYING_STYLES, PSYCHOLOGY_HOOKS, SIGNAL_OFFER_MATRIX,
  type Business, type InsertBusiness, type OutreachCampaign,
  type Event, type InsertEvent, type IntentSignal, type InsertIntentSignal,
  type VenueMonitor, type InsertVenueMonitor, type InstagramPost, type InsertInstagramPost,
  type AuthorityContent, type InsertAuthorityContent,
  type BlackCardIntelligence, type DecisionMakerProfile, type ColombiaMarketIntel,
  insertEventSchema, insertIntentSignalSchema, insertVenueMonitorSchema, insertAuthorityContentSchema
} from "@shared/schema";
import OpenAI from "openai";
import {
  generateMultiChannelScripts,
  handleObjection,
  draftResponse,
  analyzeConversation,
  analyzeReviews,
  personalizeFromInstagram,
  generateProposal,
  analyzeVoiceNote,
  deepScan,
  profileDecisionMaker,
  calculateFinancialLeaks,
  generateROITimeline,
  mirrorCompetitors,
  generateGreedTriggers,
  mutateOffer,
} from "./claudeCopilot";
import {
  analyzeBusinessSignals,
  generateMultiChannelScripts as generateSignalScripts,
  generateUltimateOutreach,
} from "./signalEngine";
import {
  ELITE_SEARCH_TERMS,
  TEXT_SEARCH_ONLY_CATEGORIES,
  CITY_COORDINATES,
  ELITE_SEARCH_CONFIG,
} from "./eliteSearchConfig";

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

  // Team Authentication Routes
  
  // Team member login (email + password)
  app.post('/api/team/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash || user.authProvider !== 'email') {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Account is disabled" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Update last login
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      // Log activity
      await storage.createActivityLog({
        userId: user.id,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        details: { method: 'email' },
        ipAddress: req.ip,
      });

      // Set session
      req.login({ claims: { sub: user.id, email: user.email } }, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ user, message: "Login successful" });
      });
    } catch (error) {
      console.error("Team login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Team member registration (with invite code)
  app.post('/api/team/register', async (req: any, res) => {
    try {
      const { inviteCode, email, password, firstName, lastName } = req.body;

      if (!inviteCode || !email || !password) {
        return res.status(400).json({ message: "Invite code, email, and password are required" });
      }

      // Validate invite code
      const invitation = await storage.getTeamInvitationByCode(inviteCode);
      if (!invitation) {
        return res.status(400).json({ message: "Invalid invite code" });
      }
      if (!invitation.isActive) {
        return res.status(400).json({ message: "This invite has been deactivated" });
      }
      if (invitation.usedAt) {
        return res.status(400).json({ message: "This invite has already been used" });
      }
      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ message: "This invite has expired" });
      }
      if (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ message: "This invite is for a different email address" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const userId = cryptoRandomString({ length: 24 });
      const user = await storage.upsertUser({
        id: userId,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        role: invitation.role || 'team_member',
        authProvider: 'email',
        passwordHash,
        isActive: true,
      });

      // Mark invitation as used
      await storage.updateTeamInvitation(invitation.id, {
        usedBy: user.id,
        usedAt: new Date(),
        isActive: false,
      });

      // Log activity
      await storage.createActivityLog({
        userId: user.id,
        action: 'register',
        entityType: 'user',
        entityId: user.id,
        details: { inviteCode },
        ipAddress: req.ip,
      });

      // Set session
      req.login({ claims: { sub: user.id, email: user.email } }, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        res.json({ user, message: "Registration successful" });
      });
    } catch (error) {
      console.error("Team registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Request magic link
  app.post('/api/team/magic-link', async (req: any, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return res.json({ message: "If an account exists with this email, a login link will be sent" });
      }

      if (!user.isActive) {
        return res.json({ message: "If an account exists with this email, a login link will be sent" });
      }

      // Generate magic link token
      const token = cryptoRandomString({ length: 64 });
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await storage.createMagicLinkToken({
        token,
        email,
        userId: user.id,
        expiresAt,
      });

      // In production, this would send an email. For now, return the token.
      const magicLink = `${req.protocol}://${req.get('host')}/team-login?token=${token}`;
      
      console.log(`Magic link for ${email}: ${magicLink}`);

      // Log activity
      await storage.createActivityLog({
        userId: user.id,
        action: 'magic_link_requested',
        entityType: 'user',
        entityId: user.id,
        ipAddress: req.ip,
      });

      res.json({ 
        message: "If an account exists with this email, a login link will be sent",
        // For development, include the link
        ...(process.env.NODE_ENV !== 'production' && { magicLink, token })
      });
    } catch (error) {
      console.error("Magic link error:", error);
      res.status(500).json({ message: "Failed to send magic link" });
    }
  });

  // Verify magic link
  app.get('/api/team/verify-magic-link', async (req: any, res) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const magicLink = await storage.getMagicLinkToken(token);
      if (!magicLink) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      if (magicLink.usedAt) {
        return res.status(400).json({ message: "This link has already been used" });
      }

      if (new Date() > magicLink.expiresAt) {
        return res.status(400).json({ message: "This link has expired" });
      }

      // Get user
      const user = await storage.getUser(magicLink.userId!);
      if (!user || !user.isActive) {
        return res.status(400).json({ message: "Account not found or disabled" });
      }

      // Mark token as used
      await storage.markMagicLinkUsed(token);

      // Update last login and auth provider
      await storage.updateUser(user.id, { 
        lastLoginAt: new Date(),
        authProvider: 'magic_link',
      });

      // Log activity
      await storage.createActivityLog({
        userId: user.id,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        details: { method: 'magic_link' },
        ipAddress: req.ip,
      });

      // Set session
      req.login({ claims: { sub: user.id, email: user.email } }, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ user, message: "Login successful" });
      });
    } catch (error) {
      console.error("Magic link verify error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Admin: Create invite
  app.post('/api/team/invites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, role = 'team_member', expiresInDays = 7 } = req.body;

      const code = cryptoRandomString({ length: 12, type: 'alphanumeric' }).toUpperCase();
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

      const invitation = await storage.createTeamInvitation({
        code,
        email: email || null,
        role,
        createdBy: userId,
        expiresAt,
        isActive: true,
      });

      // Log activity
      await storage.createActivityLog({
        userId,
        action: 'create_invite',
        entityType: 'team_invitation',
        entityId: invitation.id,
        details: { email, role },
        ipAddress: req.ip,
      });

      res.json(invitation);
    } catch (error) {
      console.error("Create invite error:", error);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  // Admin: List invites
  app.get('/api/team/invites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const invitations = await storage.getTeamInvitations();
      res.json(invitations);
    } catch (error) {
      console.error("List invites error:", error);
      res.status(500).json({ message: "Failed to list invites" });
    }
  });

  // Admin: Delete invite
  app.delete('/api/team/invites/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteTeamInvitation(req.params.id);
      res.json({ message: "Invite deleted" });
    } catch (error) {
      console.error("Delete invite error:", error);
      res.status(500).json({ message: "Failed to delete invite" });
    }
  });

  // Admin: List team members
  app.get('/api/team/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getUsers();
      // Don't include password hashes
      const safeUsers = users.map(u => ({
        ...u,
        passwordHash: undefined,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("List members error:", error);
      res.status(500).json({ message: "Failed to list team members" });
    }
  });

  // Admin: Update team member
  app.patch('/api/team/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role, isActive } = req.body;
      const updates: any = {};
      if (role !== undefined) updates.role = role;
      if (isActive !== undefined) updates.isActive = isActive;

      const updatedUser = await storage.updateUser(req.params.id, updates);

      // Log activity
      await storage.createActivityLog({
        userId,
        action: 'update_member',
        entityType: 'user',
        entityId: req.params.id,
        details: updates,
        ipAddress: req.ip,
      });

      res.json({ ...updatedUser, passwordHash: undefined });
    } catch (error) {
      console.error("Update member error:", error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  // Activity log
  app.get('/api/team/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const filters = {
        userId: req.query.userId as string,
        action: req.query.action as string,
        entityType: req.query.entityType as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const logs = await storage.getActivityLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error("Activity log error:", error);
      res.status(500).json({ message: "Failed to fetch activity log" });
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

  // Elite Scan - exhaustive search for hard-to-find categories
  app.post('/api/elite-scan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { city, category, enableAI = false, maxTerms } = req.body;
      
      // Validate city
      const cityKey = city?.toLowerCase();
      const eliteCityData = CITY_COORDINATES[cityKey];
      if (!eliteCityData) {
        return res.status(400).json({ 
          message: `Unknown city: ${city}. Available: ${Object.keys(CITY_COORDINATES).join(', ')}` 
        });
      }
      
      // Validate category has elite search terms
      const searchTerms = ELITE_SEARCH_TERMS[category];
      if (!searchTerms || searchTerms.length === 0) {
        return res.status(400).json({ 
          message: `No elite search terms for category: ${category}. Available: ${Object.keys(ELITE_SEARCH_TERMS).join(', ')}` 
        });
      }
      
      // Find city data for display
      const cityData = CITIES.find(c => c.value === city);
      
      // Create scan record
      const scan = await storage.createScan({
        userId,
        city,
        category,
        status: "scanning",
      });
      
      // Run elite scan in background
      processEliteScan(scan.id, city, cityKey, eliteCityData, category, searchTerms, enableAI, maxTerms).catch(err => {
        console.error("Elite scan error:", err);
        storage.updateScan(scan.id, { status: "failed", errorMessage: err.message });
      });
      
      res.json({ 
        scanId: scan.id, 
        message: `Started elite scan for ${category} in ${city} with ${searchTerms.length} search terms`,
        searchTermCount: searchTerms.length,
      });
    } catch (error) {
      console.error("Error starting elite scan:", error);
      res.status(500).json({ message: "Failed to start elite scan" });
    }
  });

  // Get elite scan categories with term counts
  app.get('/api/elite-scan/categories', isAuthenticated, async (req: any, res) => {
    try {
      const categories = Object.entries(ELITE_SEARCH_TERMS).map(([key, terms]) => ({
        value: key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        searchTermCount: terms.length,
        isTextSearchOnly: TEXT_SEARCH_ONLY_CATEGORIES.includes(key),
      }));
      res.json(categories);
    } catch (error) {
      console.error("Error fetching elite categories:", error);
      res.status(500).json({ message: "Failed to fetch elite categories" });
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

  // Ultimate Outreach - Signal-based analysis for a single business
  app.get('/api/ultimate-outreach/:businessId', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = generateUltimateOutreach(business);
      res.json(result);
    } catch (error) {
      console.error("Error getting ultimate outreach:", error);
      res.status(500).json({ message: "Failed to get ultimate outreach analysis" });
    }
  });

  // Ultimate Outreach - Analyze endpoint (returns signal analysis only)
  app.get('/api/ultimate-outreach/analyze/:businessId', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      // Return only the signal analysis, not the full scripts
      const signalAnalysis = analyzeBusinessSignals(business);
      res.json({
        detectedSignals: signalAnalysis.detectedSignals || [],
        detectedProblem: signalAnalysis.detectedProblem || "No specific problem detected",
        customOffer: signalAnalysis.customOffer || "General consultation available",
        monthlyLoss: signalAnalysis.monthlyLoss || 0,
        lossExplanation: signalAnalysis.lossExplanation || "",
        identityStatement: signalAnalysis.identityStatement || "",
        fearTrigger: signalAnalysis.fearTrigger || "",
        desireTrigger: signalAnalysis.desireTrigger || "",
        urgencyAngle: signalAnalysis.urgencyAngle || "",
      });
    } catch (error) {
      console.error("Error analyzing business signals:", error);
      res.status(500).json({ message: "Failed to analyze business signals" });
    }
  });

  // Ultimate Outreach - Get outreach-ready businesses with signal analysis
  app.get('/api/ultimate-outreach', isAuthenticated, async (req: any, res) => {
    try {
      const filters = {
        city: req.query.city as string,
        category: req.query.category as string,
        limit: parseInt(req.query.limit as string) || 50,
      };
      
      // Get enriched businesses with contact info
      const businesses = await storage.getBusinesses({
        ...filters,
        isEnriched: true,
      });
      
      // Filter to those with WhatsApp, phone, or Instagram
      const outreachReady = businesses.filter(b => 
        b.whatsapp || b.phone || b.instagram
      );
      
      // Analyze each business with signal engine
      const analyzed = outreachReady.map(business => {
        const analysis = analyzeBusinessSignals(business);
        return {
          business,
          analysis,
        };
      });
      
      // Sort by monthly loss (highest first)
      analyzed.sort((a, b) => (b.analysis.monthlyLoss || 0) - (a.analysis.monthlyLoss || 0));
      
      res.json({
        total: analyzed.length,
        businesses: analyzed,
      });
    } catch (error) {
      console.error("Error getting ultimate outreach list:", error);
      res.status(500).json({ message: "Failed to get ultimate outreach list" });
    }
  });

  // Ultimate Outreach - Generate and save campaign with signal intelligence
  app.post('/api/ultimate-outreach/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { businessId, senderName } = req.body;
      
      if (!businessId) {
        return res.status(400).json({ message: "businessId is required" });
      }
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const { analysis, scripts } = generateUltimateOutreach(business, senderName || "Phil McGill");
      
      // Check for existing campaign
      const existingCampaigns = await storage.getOutreachCampaigns(businessId);
      let campaign;
      
      if (existingCampaigns.length > 0) {
        campaign = await storage.updateOutreachCampaign(existingCampaigns[0].id, {
          ...scripts,
          detectedProblem: analysis.detectedProblem,
          customOffer: analysis.customOffer,
          monthlyLoss: analysis.monthlyLoss,
          lossExplanation: analysis.lossExplanation,
          identityStatement: analysis.identityStatement,
          fearTrigger: analysis.fearTrigger,
          desireTrigger: analysis.desireTrigger,
          urgencyAngle: analysis.urgencyAngle,
          detectedSignals: analysis.detectedSignals,
          status: "draft",
        });
      } else {
        campaign = await storage.createOutreachCampaign({
          userId,
          businessId,
          ...scripts,
          detectedProblem: analysis.detectedProblem,
          customOffer: analysis.customOffer,
          monthlyLoss: analysis.monthlyLoss,
          lossExplanation: analysis.lossExplanation,
          identityStatement: analysis.identityStatement,
          fearTrigger: analysis.fearTrigger,
          desireTrigger: analysis.desireTrigger,
          urgencyAngle: analysis.urgencyAngle,
          detectedSignals: analysis.detectedSignals,
          status: "draft",
        });
      }
      
      res.json({ campaign, analysis, scripts });
    } catch (error) {
      console.error("Error generating ultimate outreach:", error);
      res.status(500).json({ message: "Failed to generate ultimate outreach" });
    }
  });

  // Ultimate Outreach - Batch generate campaigns with signal intelligence
  app.post('/api/ultimate-outreach/batch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { businessIds, filters, limit = 20, senderName } = req.body;
      
      let targetBusinesses: Business[] = [];
      
      if (businessIds && businessIds.length > 0) {
        for (const id of businessIds) {
          const business = await storage.getBusiness(id);
          if (business) targetBusinesses.push(business);
        }
      } else if (filters) {
        targetBusinesses = await storage.getBusinesses({
          ...filters,
          isEnriched: true,
          limit: limit,
        });
      } else {
        targetBusinesses = await storage.getBusinesses({
          isEnriched: true,
          limit: limit,
        });
      }
      
      // Filter to those with contact info
      const prospects = targetBusinesses.filter(b => 
        b.whatsapp || b.phone || b.instagram
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
          const { analysis, scripts } = generateUltimateOutreach(business, senderName || "Phil McGill");
          
          const existingCampaigns = await storage.getOutreachCampaigns(business.id);
          let campaign;
          
          if (existingCampaigns.length > 0) {
            campaign = await storage.updateOutreachCampaign(existingCampaigns[0].id, {
              ...scripts,
              detectedProblem: analysis.detectedProblem,
              customOffer: analysis.customOffer,
              monthlyLoss: analysis.monthlyLoss,
              lossExplanation: analysis.lossExplanation,
              identityStatement: analysis.identityStatement,
              fearTrigger: analysis.fearTrigger,
              desireTrigger: analysis.desireTrigger,
              urgencyAngle: analysis.urgencyAngle,
              detectedSignals: analysis.detectedSignals,
            });
          } else {
            campaign = await storage.createOutreachCampaign({
              userId,
              businessId: business.id,
              ...scripts,
              detectedProblem: analysis.detectedProblem,
              customOffer: analysis.customOffer,
              monthlyLoss: analysis.monthlyLoss,
              lossExplanation: analysis.lossExplanation,
              identityStatement: analysis.identityStatement,
              fearTrigger: analysis.fearTrigger,
              desireTrigger: analysis.desireTrigger,
              urgencyAngle: analysis.urgencyAngle,
              detectedSignals: analysis.detectedSignals,
              status: "draft",
            });
          }
          
          results.success.push({ 
            business: business.name, 
            monthlyLoss: analysis.monthlyLoss,
            customOffer: analysis.customOffer,
            campaign 
          });
        } catch (error: any) {
          results.errors.push({
            businessId: business.id,
            error: error.message || "Failed to generate",
          });
        }
      }
      
      res.json({
        totalProcessed: prospects.length,
        generated: results.success.length,
        errors: results.errors.length,
        totalMonthlyLoss: results.success.reduce((sum, r) => sum + (r.monthlyLoss || 0), 0),
        results: results.success,
        errorDetails: results.errors,
      });
    } catch (error) {
      console.error("Error in batch ultimate outreach:", error);
      res.status(500).json({ message: "Failed to generate batch ultimate outreach" });
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

  // Claude Copilot - Review Intelligence
  app.post('/api/copilot/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const { businessId, reviews } = req.body;
      
      if (!businessId || !reviews || !Array.isArray(reviews) || reviews.length === 0) {
        return res.status(400).json({ message: "businessId and reviews array are required" });
      }
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = await analyzeReviews(business, reviews);
      res.json(result);
    } catch (error) {
      console.error("Error analyzing reviews:", error);
      res.status(500).json({ message: "Failed to analyze reviews" });
    }
  });

  // Claude Copilot - Instagram Personalization
  app.post('/api/copilot/personalize', isAuthenticated, async (req: any, res) => {
    try {
      const { businessId, instagramContent } = req.body;
      
      if (!businessId) {
        return res.status(400).json({ message: "businessId is required" });
      }
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = await personalizeFromInstagram(business, instagramContent || {});
      res.json(result);
    } catch (error) {
      console.error("Error personalizing from Instagram:", error);
      res.status(500).json({ message: "Failed to personalize from Instagram" });
    }
  });

  // Claude Copilot - Generate Proposal
  app.post('/api/copilot/proposal', isAuthenticated, async (req: any, res) => {
    try {
      const { businessId, tier } = req.body;
      
      if (!businessId) {
        return res.status(400).json({ message: "businessId is required" });
      }
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const selectedTier = tier || "core";
      if (!["starter", "core", "flagship"].includes(selectedTier)) {
        return res.status(400).json({ message: "tier must be starter, core, or flagship" });
      }
      
      const result = await generateProposal(business, selectedTier as "starter" | "core" | "flagship");
      res.json(result);
    } catch (error) {
      console.error("Error generating proposal:", error);
      res.status(500).json({ message: "Failed to generate proposal" });
    }
  });

  // Claude Copilot - Voice Note Analysis
  app.post('/api/copilot/voice', isAuthenticated, async (req: any, res) => {
    try {
      const { businessId, transcript } = req.body;
      
      if (!businessId || !transcript) {
        return res.status(400).json({ message: "businessId and transcript are required" });
      }
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = await analyzeVoiceNote(business, transcript);
      res.json(result);
    } catch (error) {
      console.error("Error analyzing voice note:", error);
      res.status(500).json({ message: "Failed to analyze voice note" });
    }
  });

  // Claude Copilot - Deep Scan
  app.get('/api/copilot/deep-scan/:id', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = deepScan(business);
      res.json(result);
    } catch (error) {
      console.error("Error performing deep scan:", error);
      res.status(500).json({ message: "Failed to perform deep scan" });
    }
  });

  // Advanced Copilot Features - Decision Maker Profiler
  app.get('/api/copilot/decision-maker/:id', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = profileDecisionMaker(business);
      res.json(result);
    } catch (error) {
      console.error("Error profiling decision maker:", error);
      res.status(500).json({ message: "Failed to profile decision maker" });
    }
  });

  // Advanced Copilot Features - Financial Leak Calculator
  app.get('/api/copilot/financial-leaks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = calculateFinancialLeaks(business);
      res.json(result);
    } catch (error) {
      console.error("Error calculating financial leaks:", error);
      res.status(500).json({ message: "Failed to calculate financial leaks" });
    }
  });

  // Advanced Copilot Features - ROI Timeline Generator
  app.get('/api/copilot/roi-timeline/:id', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const investment = parseInt(req.query.investment as string) || 2000;
      const result = generateROITimeline(business, investment);
      res.json(result);
    } catch (error) {
      console.error("Error generating ROI timeline:", error);
      res.status(500).json({ message: "Failed to generate ROI timeline" });
    }
  });

  // Advanced Copilot Features - Competitor Ghost Mirror
  app.get('/api/copilot/competitor-mirror/:id', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = mirrorCompetitors(business);
      res.json(result);
    } catch (error) {
      console.error("Error mirroring competitors:", error);
      res.status(500).json({ message: "Failed to mirror competitors" });
    }
  });

  // Advanced Copilot Features - Greed Trigger Engine
  app.get('/api/copilot/greed-triggers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = generateGreedTriggers(business);
      res.json(result);
    } catch (error) {
      console.error("Error generating greed triggers:", error);
      res.status(500).json({ message: "Failed to generate greed triggers" });
    }
  });

  // Advanced Copilot Features - Offer Mutation Engine
  app.get('/api/copilot/offer-mutation/:id', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const result = mutateOffer(business);
      res.json(result);
    } catch (error) {
      console.error("Error mutating offer:", error);
      res.status(500).json({ message: "Failed to mutate offer" });
    }
  });

  // Advanced Copilot Features - Complete Intelligence Package (all features in one)
  app.get('/api/copilot/intelligence-package/:id', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const deepScanResult = deepScan(business);
      const decisionMaker = profileDecisionMaker(business);
      const financialLeaks = calculateFinancialLeaks(business);
      const roiTimeline = generateROITimeline(business);
      const competitorMirror = mirrorCompetitors(business);
      const greedTriggers = generateGreedTriggers(business);
      const offerMutation = mutateOffer(business);
      
      res.json({
        business: {
          id: business.id,
          name: business.name,
          category: business.category,
          city: business.city,
          rating: business.rating,
          reviewCount: business.reviewCount,
        },
        deepScan: deepScanResult,
        decisionMaker,
        financialLeaks,
        roiTimeline,
        competitorMirror,
        greedTriggers,
        offerMutation,
      });
    } catch (error) {
      console.error("Error generating intelligence package:", error);
      res.status(500).json({ message: "Failed to generate intelligence package" });
    }
  });

  // ==================== BLACK CARD INTELLIGENCE API ====================
  
  // Get Black Card intelligence for a business
  app.get('/api/blackcard/:businessId', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const deepScanResult = deepScan(business);
      const decisionMaker = profileDecisionMaker(business);
      const financialLeaks = calculateFinancialLeaks(business);
      const roiTimeline = generateROITimeline(business);
      const competitorMirror = mirrorCompetitors(business);
      const greedTriggers = generateGreedTriggers(business);
      const offerMutation = mutateOffer(business);
      
      // Get category solutions from schema
      const categorySolutions = CATEGORY_SOLUTIONS[business.category] || CATEGORY_SOLUTIONS.restaurant || {
        core_solutions: [],
        quick_wins: [],
        advanced_features: [],
        metrics_improved: [],
      };
      
      // Get pre-emptive objections from schema
      const preEmptiveObjections = Object.entries(OBJECTION_PATTERNS).map(([key, pattern]) => ({
        type: key,
        triggers: pattern.triggers,
        framework: pattern.framework,
        responseAngles: pattern.response_angles,
      }));
      
      // Generate post-close blueprint based on category
      const postCloseBlueprint = {
        week1: ["Onboarding call and system setup", "Team training session", "Initial configuration"],
        week2: ["Soft launch with select customers", "Performance monitoring", "Quick adjustments"],
        month1: ["Full deployment", "First results review", "Optimization based on data"],
        month2: ["Advanced features activation", "Upsell opportunities identification", "Client check-in"],
        month3: ["Performance review meeting", "Strategy refinement", "Expansion planning"],
        retentionTriggers: [
          "Monthly performance report with ROI metrics",
          "Quarterly strategy call",
          "New feature announcements",
          "Referral incentive program",
        ],
        upsellOpportunities: deepScanResult.recommendedSolutions.core.map(s => s.name),
      };
      
      res.json({
        business: {
          id: business.id,
          name: business.name,
          category: business.category,
          city: business.city,
          rating: business.rating,
          reviewCount: business.reviewCount,
          website: business.website,
          instagram: business.instagram,
          phone: business.phone,
        },
        decisionMaker,
        categorySolutions,
        financialLeaks,
        roiTimeline,
        competitorMirror,
        greedTriggers,
        preEmptiveObjections,
        customOffer: offerMutation,
        postCloseBlueprint,
        deepScan: deepScanResult,
      });
    } catch (error) {
      console.error("Error fetching black card intelligence:", error);
      res.status(500).json({ message: "Failed to fetch black card intelligence" });
    }
  });
  
  // Generate Black Card intelligence for a business (same as GET but POST for semantic clarity)
  app.post('/api/blackcard/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { businessId } = req.body;
      
      if (!businessId) {
        return res.status(400).json({ message: "businessId is required" });
      }
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const deepScanResult = deepScan(business);
      const decisionMaker = profileDecisionMaker(business);
      const financialLeaks = calculateFinancialLeaks(business);
      const roiTimeline = generateROITimeline(business);
      const competitorMirror = mirrorCompetitors(business);
      const greedTriggers = generateGreedTriggers(business);
      const offerMutation = mutateOffer(business);
      
      // Get category solutions from schema
      const categorySolutions = CATEGORY_SOLUTIONS[business.category] || CATEGORY_SOLUTIONS.restaurant || {
        core_solutions: [],
        quick_wins: [],
        advanced_features: [],
        metrics_improved: [],
      };
      
      // Get pre-emptive objections from schema
      const preEmptiveObjections = Object.entries(OBJECTION_PATTERNS).map(([key, pattern]) => ({
        type: key,
        triggers: pattern.triggers,
        framework: pattern.framework,
        responseAngles: pattern.response_angles,
      }));
      
      // Generate post-close blueprint based on category
      const postCloseBlueprint = {
        week1: ["Onboarding call and system setup", "Team training session", "Initial configuration"],
        week2: ["Soft launch with select customers", "Performance monitoring", "Quick adjustments"],
        month1: ["Full deployment", "First results review", "Optimization based on data"],
        month2: ["Advanced features activation", "Upsell opportunities identification", "Client check-in"],
        month3: ["Performance review meeting", "Strategy refinement", "Expansion planning"],
        retentionTriggers: [
          "Monthly performance report with ROI metrics",
          "Quarterly strategy call",
          "New feature announcements",
          "Referral incentive program",
        ],
        upsellOpportunities: deepScanResult.recommendedSolutions.core.map(s => s.name),
      };
      
      res.json({
        business: {
          id: business.id,
          name: business.name,
          category: business.category,
          city: business.city,
          rating: business.rating,
          reviewCount: business.reviewCount,
          website: business.website,
          instagram: business.instagram,
          phone: business.phone,
        },
        decisionMaker,
        categorySolutions,
        financialLeaks,
        roiTimeline,
        competitorMirror,
        greedTriggers,
        preEmptiveObjections,
        customOffer: offerMutation,
        postCloseBlueprint,
        deepScan: deepScanResult,
      });
    } catch (error) {
      console.error("Error generating black card intelligence:", error);
      res.status(500).json({ message: "Failed to generate black card intelligence" });
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
            keywords: [...venue.keywords],
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

  // ═══════════════════════════════════════════════════════════════════════════
  // BLACK CARD INTELLIGENCE API ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // GET /api/blackcard/colombia-intel - Returns Colombia market statistics and triggers
  app.get('/api/blackcard/colombia-intel', isAuthenticated, async (req: any, res) => {
    try {
      res.json({
        colombia_stats: COLOMBIA_STATS,
        conpes_positioning: CONPES_POSITIONING,
        colombia_psychology_triggers: COLOMBIA_PSYCHOLOGY_TRIGGERS,
        vertical_ticket_ranges: VERTICAL_TICKET_RANGES,
        category_solutions: CATEGORY_SOLUTIONS,
        objection_patterns: OBJECTION_PATTERNS,
        psychology_hooks: PSYCHOLOGY_HOOKS,
      });
    } catch (error) {
      console.error("Error fetching Colombia intel:", error);
      res.status(500).json({ message: "Failed to fetch Colombia intel" });
    }
  });

  // GET /api/blackcard/:businessId - Returns full Black Card intelligence for a business
  app.get('/api/blackcard/:businessId', isAuthenticated, async (req: any, res) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const category = business.category || 'restaurant';
      const ticketRange = VERTICAL_TICKET_RANGES[category] || VERTICAL_TICKET_RANGES.restaurant;
      const solutions = CATEGORY_SOLUTIONS[category] || CATEGORY_SOLUTIONS.restaurant;
      const psychologyHook = PSYCHOLOGY_HOOKS[category] || PSYCHOLOGY_HOOKS.restaurant;

      // Calculate decision maker profile based on business type
      const decisionMakerProfile: DecisionMakerProfile = calculateDecisionMakerProfile(business, category);

      // Calculate financial leaks based on business signals
      const financialLeaks = calculateBusinessFinancialLeaks(business, category, ticketRange);

      // Generate ROI timeline
      const roiTimeline = generateBusinessROITimeline(business, category, ticketRange, financialLeaks);

      // Get competitor signals
      const competitorMirror = generateCompetitorMirror(business, category);

      // Generate greed triggers
      const greedTriggers = generateBusinessGreedTriggers(business, category, financialLeaks);

      // Get objection handling
      const objectionHandling = getRelevantObjections(business, category);

      // Generate offer mutation
      const offerMutation = generateBusinessOfferMutation(business, category, financialLeaks);

      // Build Colombia market intel
      const colombiaMarketIntel: ColombiaMarketIntel = {
        category,
        city: business.city || 'Cartagena',
        min_ticket: ticketRange.min_ticket,
        max_ticket: ticketRange.max_ticket,
        recommended_ticket: ticketRange.avg_ticket,
        missing_systems: financialLeaks.gaps_detected,
        monthly_loss_estimate: financialLeaks.monthly_loss,
        annual_loss_estimate: financialLeaks.monthly_loss * 12,
        tech_gaps: financialLeaks.tech_gaps,
        primary_triggers: getRandomTriggers(category),
        conpes_positioning: CONPES_POSITIONING.credibility_statements,
        local_competition_level: financialLeaks.competition_level,
        competitor_warnings: competitorMirror.warnings,
        implementation_days: ticketRange.implementation_days,
        roi_timeframe_days: roiTimeline.break_even_days,
      };

      const blackCardIntelligence: BlackCardIntelligence = {
        category_solutions: { [category]: solutions },
        colombia_stats: COLOMBIA_STATS,
        vertical_ticket_ranges: { [category]: ticketRange },
        colombia_psychology_triggers: COLOMBIA_PSYCHOLOGY_TRIGGERS,
        conpes_positioning: CONPES_POSITIONING,
        decision_maker_types: DECISION_MAKER_TYPES,
        buying_styles: BUYING_STYLES,
        decision_maker_profile: decisionMakerProfile,
        colombia_market_intel: colombiaMarketIntel,
      };

      res.json({
        business_id: business.id,
        business_name: business.name,
        intelligence: blackCardIntelligence,
        financial_leaks: financialLeaks,
        roi_timeline: roiTimeline,
        competitor_mirror: competitorMirror,
        greed_triggers: greedTriggers,
        objection_handling: objectionHandling,
        offer_mutation: offerMutation,
        psychology_hook: psychologyHook,
      });
    } catch (error) {
      console.error("Error generating Black Card intelligence:", error);
      res.status(500).json({ message: "Failed to generate Black Card intelligence" });
    }
  });

  // POST /api/blackcard/generate - Generates new Black Card intelligence using OpenAI
  app.post('/api/blackcard/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { businessId } = req.body;
      
      if (!businessId) {
        return res.status(400).json({ message: "businessId is required" });
      }

      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const category = business.category || 'restaurant';
      const ticketRange = VERTICAL_TICKET_RANGES[category] || VERTICAL_TICKET_RANGES.restaurant;
      const solutions = CATEGORY_SOLUTIONS[category] || CATEGORY_SOLUTIONS.restaurant;

      // Calculate base intelligence
      const financialLeaks = calculateBusinessFinancialLeaks(business, category, ticketRange);

      // Use OpenAI to enhance and personalize the intelligence
      const prompt = `You are an elite sales psychology expert analyzing a ${category} business in Colombia for AI automation opportunities.

Business Details:
- Name: ${business.name}
- Category: ${category}
- City: ${business.city || 'Unknown'}
- Rating: ${business.rating || 'Unknown'} (${business.reviewCount || 0} reviews)
- Has Website: ${business.website ? 'Yes' : 'No'}
- Has Email: ${business.email ? 'Yes' : 'No'}
- Has WhatsApp: ${business.whatsapp ? 'Yes' : 'No'}
- Has Instagram: ${business.instagram ? 'Yes' : 'No'}

Calculated Monthly Loss: $${financialLeaks.monthly_loss} USD
Detected Gaps: ${financialLeaks.gaps_detected.join(', ')}

Core Solutions Available:
${solutions.core_solutions.slice(0, 4).join('\n')}

Generate a personalized Black Card Intelligence report with:
1. A compelling opening hook (1-2 sentences that grab attention based on their specific situation)
2. Three specific pain points this business likely experiences
3. The most relevant solution to pitch first and why
4. A custom urgency angle based on Colombia market dynamics
5. The ideal first message for WhatsApp outreach (in Spanish, conversational)
6. Predicted objections and counter-responses
7. A greed trigger that will make them act now

Respond in JSON format with these exact keys:
{
  "opening_hook": "",
  "pain_points": [],
  "lead_solution": { "solution": "", "why": "" },
  "urgency_angle": "",
  "whatsapp_opener": "",
  "objections": [{ "objection": "", "counter": "" }],
  "greed_trigger": ""
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const aiEnhancement = JSON.parse(completion.choices[0].message.content || '{}');

      // Build the complete intelligence package
      const decisionMakerProfile = calculateDecisionMakerProfile(business, category);
      const roiTimeline = generateBusinessROITimeline(business, category, ticketRange, financialLeaks);
      const competitorMirror = generateCompetitorMirror(business, category);
      const greedTriggers = generateBusinessGreedTriggers(business, category, financialLeaks);

      const colombiaMarketIntel: ColombiaMarketIntel = {
        category,
        city: business.city || 'Cartagena',
        min_ticket: ticketRange.min_ticket,
        max_ticket: ticketRange.max_ticket,
        recommended_ticket: ticketRange.avg_ticket,
        missing_systems: financialLeaks.gaps_detected,
        monthly_loss_estimate: financialLeaks.monthly_loss,
        annual_loss_estimate: financialLeaks.monthly_loss * 12,
        tech_gaps: financialLeaks.tech_gaps,
        primary_triggers: getRandomTriggers(category),
        conpes_positioning: CONPES_POSITIONING.credibility_statements,
        local_competition_level: financialLeaks.competition_level,
        competitor_warnings: competitorMirror.warnings,
        implementation_days: ticketRange.implementation_days,
        roi_timeframe_days: roiTimeline.break_even_days,
      };

      const blackCardIntelligence: BlackCardIntelligence = {
        category_solutions: { [category]: solutions },
        colombia_stats: COLOMBIA_STATS,
        vertical_ticket_ranges: { [category]: ticketRange },
        colombia_psychology_triggers: COLOMBIA_PSYCHOLOGY_TRIGGERS,
        conpes_positioning: CONPES_POSITIONING,
        decision_maker_types: DECISION_MAKER_TYPES,
        buying_styles: BUYING_STYLES,
        decision_maker_profile: decisionMakerProfile,
        colombia_market_intel: colombiaMarketIntel,
      };

      res.json({
        business_id: business.id,
        business_name: business.name,
        intelligence: blackCardIntelligence,
        ai_enhancement: aiEnhancement,
        financial_leaks: financialLeaks,
        roi_timeline: roiTimeline,
        competitor_mirror: competitorMirror,
        greed_triggers: greedTriggers,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error generating Black Card intelligence with AI:", error);
      res.status(500).json({ message: "Failed to generate Black Card intelligence" });
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

// Elite Scan processor - exhaustive text search with all terms
async function processEliteScan(
  scanId: string,
  city: string,
  cityKey: string,
  eliteCityData: { lat: number; lng: number; radius: number; neighborhoods?: Array<{ name: string; lat: number; lng: number; radius: number }> },
  category: string,
  searchTerms: string[],
  enableAI: boolean,
  maxTerms?: number
) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Google Places API key not configured");
  }

  try {
    const termsToUse = maxTerms ? searchTerms.slice(0, maxTerms) : searchTerms;
    const seenPlaceIds = new Set<string>();
    const allPlaces: any[] = [];
    
    console.log(`[Elite Scan] Starting ${category} in ${city} with ${termsToUse.length} search terms`);
    
    // Build search locations (city center + neighborhoods if available)
    const searchLocations = [
      { name: city, lat: eliteCityData.lat, lng: eliteCityData.lng, radius: eliteCityData.radius }
    ];
    
    if (ELITE_SEARCH_CONFIG.includeNeighborhoods && eliteCityData.neighborhoods) {
      for (const n of eliteCityData.neighborhoods) {
        searchLocations.push({ name: n.name, lat: n.lat, lng: n.lng, radius: n.radius });
      }
    }
    
    // Run text search for each term in each location
    for (const location of searchLocations) {
      for (const term of termsToUse) {
        try {
          const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
          const query = `${term} ${city} Colombia`;
          
          const response = await fetch(searchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.priceLevel,places.location,places.googleMapsUri,places.regularOpeningHours,places.photos,places.types',
            },
            body: JSON.stringify({
              textQuery: query,
              locationBias: {
                circle: {
                  center: { latitude: location.lat, longitude: location.lng },
                  radius: location.radius,
                },
              },
              maxResultCount: ELITE_SEARCH_CONFIG.maxResultsPerTerm,
              languageCode: "es",
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            const places = data.places || [];
            
            let newCount = 0;
            for (const place of places) {
              if (place.id && !seenPlaceIds.has(place.id)) {
                seenPlaceIds.add(place.id);
                place._searchTerm = term;
                allPlaces.push(place);
                newCount++;
              }
            }
            
            if (newCount > 0) {
              console.log(`[Elite Scan] '${term}' in ${location.name} → ${newCount} new (${allPlaces.length} total)`);
            }
          } else {
            const errorText = await response.text();
            console.warn(`[Elite Scan] Error for "${term}": ${errorText.substring(0, 100)}`);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, ELITE_SEARCH_CONFIG.delayBetweenCalls));
          
        } catch (err: any) {
          console.warn(`[Elite Scan] Failed search "${term}": ${err.message}`);
        }
      }
    }
    
    console.log(`[Elite Scan] Found ${allPlaces.length} unique businesses for ${category} in ${city}`);
    await storage.updateScan(scanId, { totalFound: allPlaces.length });
    
    // Save all businesses
    let enrichedCount = 0;
    let savedCount = 0;
    
    for (const place of allPlaces) {
      const existing = place.id ? await storage.getBusinessByPlaceId(place.id) : null;
      
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
        category: category,
        city: city,
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
        photoUrl: place.photos?.[0]?.name ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&key=${apiKey}` : null,
      };
      
      try {
        let business: Business;
        if (existing) {
          business = (await storage.updateBusiness(existing.id, businessData))!;
        } else {
          business = await storage.createBusiness(businessData);
        }
        savedCount++;
        
        if (enableAI && !business.isEnriched) {
          try {
            const enriched = await enrichBusiness(business);
            await storage.updateBusiness(business.id, enriched);
            enrichedCount++;
            await storage.updateScan(scanId, { totalEnriched: enrichedCount });
          } catch (err) {
            console.error(`[Elite Scan] Failed to enrich ${business.name}:`, err);
          }
        }
      } catch (err: any) {
        console.error(`[Elite Scan] Failed to save ${businessData.name}:`, err.message);
      }
    }
    
    console.log(`[Elite Scan] Saved ${savedCount} businesses, enriched ${enrichedCount}`);
    
    await storage.updateScan(scanId, { 
      status: "completed", 
      completedAt: new Date(),
      totalEnriched: enrichedCount,
    });
    
  } catch (error: any) {
    console.error(`[Elite Scan] Error:`, error);
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

// ═══════════════════════════════════════════════════════════════════════════
// BLACK CARD INTELLIGENCE HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function calculateDecisionMakerProfile(business: Business, category: string): DecisionMakerProfile {
  const rating = business.rating || 4.0;
  const reviewCount = business.reviewCount || 0;
  const hasWebsite = !!business.website;
  const hasEmail = !!business.email;
  
  // Determine personality type based on business signals
  let personalityType: "Visionary" | "Operator" | "Skeptic" | "Delegator" = "Operator";
  let buyingStyle: "Impulsive" | "Analytical" | "Consensus" | "Value-driven" = "Value-driven";
  let riskTolerance: "High" | "Medium" | "Low" | "Medium-High" = "Medium";
  
  if (rating >= 4.5 && reviewCount > 100) {
    personalityType = "Visionary";
    riskTolerance = "Medium-High";
  } else if (rating < 4.0) {
    personalityType = "Skeptic";
    buyingStyle = "Analytical";
    riskTolerance = "Low";
  } else if (!hasWebsite && !hasEmail) {
    personalityType = "Operator";
    buyingStyle = "Impulsive";
  }
  
  // Category-specific adjustments
  const highTouchCategories = ['concierge', 'villa_rental', 'boat_charter', 'hotel'];
  const operationalCategories = ['restaurant', 'spa', 'club', 'bar'];
  
  if (highTouchCategories.includes(category)) {
    buyingStyle = "Analytical";
  } else if (operationalCategories.includes(category)) {
    buyingStyle = reviewCount > 50 ? "Value-driven" : "Impulsive";
  }

  return {
    estimated_age_range: category === 'club' || category === 'dj' ? "28-40" : "35-55",
    likely_role: highTouchCategories.includes(category) ? "Owner/GM" : "Owner-Operator",
    personality_type: personalityType,
    buying_style: buyingStyle,
    risk_tolerance: riskTolerance,
    primary_motivation: rating >= 4.5 ? "Growth" : rating < 4.0 ? "Security" : "Freedom",
    fear_pattern: !hasWebsite ? "Being invisible to tourists" : rating < 4.0 ? "Losing to better-reviewed competition" : "Missing growth opportunities",
    status_trigger: `Being seen as the most ${category === 'restaurant' ? 'booked restaurant' : category === 'hotel' ? 'sought-after hotel' : 'premium service'} in ${business.city || 'the city'}`,
    preferred_language_style: personalityType === "Analytical" ? "Data-driven" : personalityType === "Visionary" ? "Story-driven" : "Direct",
    response_speed_preference: buyingStyle === "Impulsive" ? "Immediate" : buyingStyle === "Analytical" ? "Takes-time" : "Same-day",
    opening_approach: personalityType === "Skeptic" ? "Lead with proof and case studies" : "Lead with pain point recognition",
    proof_type_needed: personalityType === "Analytical" ? "ROI calculations and competitor data" : "Social proof from similar businesses",
    objection_likely: riskTolerance === "Low" ? "price" : "time",
    closing_style: buyingStyle === "Impulsive" ? "Direct close with urgency" : "Consultative close with trial offer",
  };
}

interface FinancialLeaksResult {
  monthly_loss: number;
  annual_loss: number;
  gaps_detected: string[];
  loss_breakdown: { gap: string; loss: number; explanation: string }[];
  tech_gaps: {
    has_booking_system: boolean;
    has_whatsapp_business: boolean;
    has_online_payment: boolean;
    has_review_management: boolean;
    is_mobile_optimized: boolean;
    website_exists: boolean;
    gaps_detected: string[];
    gap_count: number;
    automation_readiness_score: number;
  };
  competition_level: "low" | "medium" | "high";
}

function calculateBusinessFinancialLeaks(
  business: Business, 
  category: string, 
  ticketRange: { min_ticket: number; max_ticket: number; avg_ticket: number; monthly_loss_range: [number, number] }
): FinancialLeaksResult {
  const rating = business.rating || 4.0;
  const reviewCount = business.reviewCount || 0;
  const hasWebsite = !!business.website;
  const hasEmail = !!business.email;
  const hasWhatsapp = !!business.whatsapp;
  const hasInstagram = !!business.instagram;
  
  const gaps: string[] = [];
  const lossBreakdown: { gap: string; loss: number; explanation: string }[] = [];
  let totalLoss = 0;
  
  const [minLoss, maxLoss] = ticketRange.monthly_loss_range;
  const baseLoss = (minLoss + maxLoss) / 2;
  
  // Rating-based loss calculation
  if (rating < 4.0) {
    const ratingLoss = Math.round(baseLoss * 0.3);
    gaps.push("Low rating affecting bookings");
    lossBreakdown.push({ gap: "Low rating", loss: ratingLoss, explanation: "Each 0.1 star drop = 5-9% revenue loss" });
    totalLoss += ratingLoss;
  } else if (rating < 4.3) {
    const ratingLoss = Math.round(baseLoss * 0.15);
    gaps.push("Rating below premium threshold");
    lossBreakdown.push({ gap: "Below premium rating", loss: ratingLoss, explanation: "Premium guests filter for 4.5+ ratings" });
    totalLoss += ratingLoss;
  }
  
  // Review count analysis
  if (reviewCount < 20) {
    const reviewLoss = Math.round(baseLoss * 0.25);
    gaps.push("Low review count hurting visibility");
    lossBreakdown.push({ gap: "Low review velocity", loss: reviewLoss, explanation: "Fewer reviews = lower search ranking + trust" });
    totalLoss += reviewLoss;
  } else if (reviewCount < 50) {
    const reviewLoss = Math.round(baseLoss * 0.1);
    gaps.push("Review count below competitors");
    lossBreakdown.push({ gap: "Moderate review count", loss: reviewLoss, explanation: "Competitors with 100+ reviews outrank you" });
    totalLoss += reviewLoss;
  }
  
  // Website presence
  if (!hasWebsite) {
    const websiteLoss = Math.round(baseLoss * 0.35);
    gaps.push("No website - invisible to search");
    lossBreakdown.push({ gap: "No website", loss: websiteLoss, explanation: "30% of tourists find businesses via website search" });
    totalLoss += websiteLoss;
  }
  
  // Email presence
  if (!hasEmail) {
    const emailLoss = Math.round(baseLoss * 0.15);
    gaps.push("No email - losing B2B leads");
    lossBreakdown.push({ gap: "No email contact", loss: emailLoss, explanation: "Corporate/group bookings require email communication" });
    totalLoss += emailLoss;
  }
  
  // WhatsApp presence
  if (!hasWhatsapp) {
    const whatsappLoss = Math.round(baseLoss * 0.25);
    gaps.push("No WhatsApp - 66% of Colombians buy via chat");
    lossBreakdown.push({ gap: "No WhatsApp automation", loss: whatsappLoss, explanation: "66% purchase rate via WhatsApp in Colombia" });
    totalLoss += whatsappLoss;
  }
  
  // Instagram presence
  if (!hasInstagram) {
    const igLoss = Math.round(baseLoss * 0.2);
    gaps.push("No Instagram - missing tourist discovery");
    lossBreakdown.push({ gap: "No Instagram presence", loss: igLoss, explanation: "Tourists discover experiences via Instagram" });
    totalLoss += igLoss;
  }
  
  // Ensure minimum loss is within range
  if (totalLoss < minLoss) totalLoss = minLoss;
  if (totalLoss > maxLoss * 1.5) totalLoss = Math.round(maxLoss * 1.5);
  
  // Calculate tech gaps
  const techGaps = {
    has_booking_system: hasWebsite,
    has_whatsapp_business: hasWhatsapp,
    has_online_payment: hasWebsite,
    has_review_management: reviewCount > 50,
    is_mobile_optimized: hasWebsite,
    website_exists: hasWebsite,
    gaps_detected: gaps,
    gap_count: gaps.length,
    automation_readiness_score: Math.max(0, 100 - (gaps.length * 15)),
  };
  
  // Competition level based on review count in category
  const competitionLevel: "low" | "medium" | "high" = 
    reviewCount > 200 ? "high" : reviewCount > 50 ? "medium" : "low";
  
  return {
    monthly_loss: totalLoss,
    annual_loss: totalLoss * 12,
    gaps_detected: gaps,
    loss_breakdown: lossBreakdown,
    tech_gaps: techGaps,
    competition_level: competitionLevel,
  };
}

interface ROITimelineResult {
  break_even_days: number;
  monthly_savings: number;
  year_one_roi: number;
  payback_period_months: number;
  milestones: { day: number; milestone: string }[];
}

function generateBusinessROITimeline(
  business: Business,
  category: string,
  ticketRange: { implementation_days: number; avg_ticket: number },
  financialLeaks: FinancialLeaksResult
): ROITimelineResult {
  const implementationDays = ticketRange.implementation_days;
  const avgTicket = ticketRange.avg_ticket;
  const monthlyRecapture = Math.round(financialLeaks.monthly_loss * 0.6); // Assume 60% recapture
  
  const estimatedCost = avgTicket;
  const breakEvenDays = Math.round((estimatedCost / (monthlyRecapture / 30)) + implementationDays);
  const yearOneROI = Math.round(((monthlyRecapture * 12 - estimatedCost) / estimatedCost) * 100);
  
  return {
    break_even_days: breakEvenDays,
    monthly_savings: monthlyRecapture,
    year_one_roi: yearOneROI,
    payback_period_months: Math.round((estimatedCost / monthlyRecapture) * 10) / 10,
    milestones: [
      { day: 1, milestone: "System setup and integration begins" },
      { day: Math.round(implementationDays / 2), milestone: "Core automation live (WhatsApp, booking)" },
      { day: implementationDays, milestone: "Full system deployment complete" },
      { day: implementationDays + 7, milestone: "First automated bookings/responses" },
      { day: breakEvenDays, milestone: "Break-even point reached" },
      { day: 90, milestone: "ROI optimization phase begins" },
    ],
  };
}

interface CompetitorMirrorResult {
  competitors_likely_have: string[];
  your_gaps: string[];
  warnings: string[];
  advantage_opportunities: string[];
}

function generateCompetitorMirror(business: Business, category: string): CompetitorMirrorResult {
  const hasWebsite = !!business.website;
  const hasInstagram = !!business.instagram;
  const reviewCount = business.reviewCount || 0;
  
  const competitorsHave: string[] = [];
  const yourGaps: string[] = [];
  const warnings: string[] = [];
  const opportunities: string[] = [];
  
  if (!hasWebsite) {
    competitorsHave.push("Professional website with online booking");
    yourGaps.push("No web presence");
    warnings.push("Top competitors in your category have 24/7 online booking");
  }
  
  if (!hasInstagram) {
    competitorsHave.push("Active Instagram with 1000+ followers");
    yourGaps.push("No Instagram presence");
    warnings.push("Tourists discover competitors on Instagram - you're invisible");
  }
  
  if (reviewCount < 50) {
    competitorsHave.push("100+ Google reviews with active response");
    yourGaps.push("Low review count");
    warnings.push("Competitors with more reviews appear higher in search");
  }
  
  // Category-specific competitor analysis
  const categoryCompetitorFeatures: Record<string, string[]> = {
    restaurant: ["WhatsApp reservation bot", "QR code menus", "Review response automation"],
    hotel: ["Direct booking chatbot", "Pre-arrival upsell sequences", "OTA bypass strategies"],
    concierge: ["Client preference CRM", "Vendor coordination automation", "24/7 response coverage"],
    boat_charter: ["Instant quote system", "Weather-based rescheduling", "Automated deposits"],
    tour_operator: ["Booking bot", "Automated itineraries", "Post-tour review collection"],
  };
  
  const features = categoryCompetitorFeatures[category] || categoryCompetitorFeatures.restaurant;
  competitorsHave.push(...features.slice(0, 2));
  opportunities.push(`Be first in your area with ${features[0]}`);
  opportunities.push(`Gain 6-month head start on automation`);
  
  return {
    competitors_likely_have: competitorsHave,
    your_gaps: yourGaps,
    warnings: warnings,
    advantage_opportunities: opportunities,
  };
}

interface GreedTriggersResult {
  primary_greed_trigger: string;
  supporting_triggers: string[];
  fomo_statement: string;
  gain_quantification: string;
}

function generateBusinessGreedTriggers(
  business: Business,
  category: string,
  financialLeaks: FinancialLeaksResult
): GreedTriggersResult {
  const monthlyLoss = financialLeaks.monthly_loss;
  const annualLoss = financialLeaks.annual_loss;
  
  const primaryTrigger = `You're leaving $${monthlyLoss.toLocaleString()}/month on the table. That's $${annualLoss.toLocaleString()}/year walking to your competitors.`;
  
  const supportingTriggers = [
    `With automation, similar ${category}s see 30-50% more bookings in 90 days`,
    `Your competitors are already doing this - the question is how long until they get ALL your leads`,
    `Every day without this system is another day of lost revenue`,
  ];
  
  const fomoStatement = `The first ${category} in ${business.city || 'your area'} to automate will own the market for the next 2 years`;
  
  const gainQuantification = `Recapture just 60% of your leaks = $${Math.round(monthlyLoss * 0.6).toLocaleString()}/month = $${Math.round(annualLoss * 0.6).toLocaleString()}/year`;
  
  return {
    primary_greed_trigger: primaryTrigger,
    supporting_triggers: supportingTriggers,
    fomo_statement: fomoStatement,
    gain_quantification: gainQuantification,
  };
}

interface ObjectionHandlingResult {
  likely_objections: string[];
  responses: { objection: string; counter: string; framework: string }[];
  preemptive_statements: string[];
}

function getRelevantObjections(business: Business, category: string): ObjectionHandlingResult {
  const rating = business.rating || 4.0;
  const hasWebsite = !!business.website;
  
  const likelyObjections: string[] = [];
  const responses: { objection: string; counter: string; framework: string }[] = [];
  const preemptive: string[] = [];
  
  // Price objection is always likely
  likelyObjections.push("Es muy caro / It's too expensive");
  responses.push({
    objection: "Es muy caro",
    counter: "I understand price is important. But consider: you're currently losing $X/month from missed bookings. This system pays for itself in 30-45 days. What's the cost of NOT having it?",
    framework: "loss_aversion",
  });
  
  // Time objection
  likelyObjections.push("No tengo tiempo / I'm too busy");
  responses.push({
    objection: "No tengo tiempo",
    counter: "That's exactly why you need this - you're too busy answering messages manually. Setup takes 15 minutes of your time, then you get hours back every week.",
    framework: "scarcity",
  });
  
  // Skepticism if low rating
  if (rating < 4.2) {
    likelyObjections.push("No creo que funcione / I don't think it works");
    responses.push({
      objection: "No creo que funcione",
      counter: "I have 3 similar businesses in your city using this right now. Want me to connect you with one for a reference?",
      framework: "social_proof",
    });
  }
  
  // Tech resistance if no website
  if (!hasWebsite) {
    likelyObjections.push("No soy bueno con tecnología / I'm not tech-savvy");
    responses.push({
      objection: "No soy bueno con tecnología",
      counter: "Perfect - that's why I handle everything. You just need WhatsApp, which you already use. I set up, train, and support you completely.",
      framework: "reciprocity",
    });
  }
  
  preemptive.push("I know what you're thinking - 'this sounds complicated.' It's not. 15 minutes of your time, and I handle the rest.");
  preemptive.push("Before you say you're too busy - that's exactly why you need this. To get your time back.");
  
  return {
    likely_objections: likelyObjections,
    responses: responses,
    preemptive_statements: preemptive,
  };
}

interface OfferMutationResult {
  base_offer: string;
  customized_offer: string;
  urgency_element: string;
  guarantee: string;
  bonuses: string[];
}

function generateBusinessOfferMutation(
  business: Business,
  category: string,
  financialLeaks: FinancialLeaksResult
): OfferMutationResult {
  const primaryGap = financialLeaks.gaps_detected[0] || "No automation";
  const solutions = CATEGORY_SOLUTIONS[category] || CATEGORY_SOLUTIONS.restaurant;
  const leadSolution = solutions.core_solutions[0];
  
  const baseOffer = `${category.charAt(0).toUpperCase() + category.slice(1)} AI Automation Package`;
  
  let customizedOffer = `${leadSolution}`;
  if (financialLeaks.gaps_detected.length > 2) {
    customizedOffer += ` + ${solutions.core_solutions[1]}`;
  }
  
  const urgency = `Lock in founding member pricing before we reach capacity in ${business.city || 'your city'}`;
  
  const guarantee = "30-day money-back guarantee if you don't see measurable improvement";
  
  const bonuses = [
    "Free 30-minute strategy call ($200 value)",
    "Priority WhatsApp support for 90 days",
    "Competitor analysis report for your area",
  ];
  
  return {
    base_offer: baseOffer,
    customized_offer: customizedOffer,
    urgency_element: urgency,
    guarantee: guarantee,
    bonuses: bonuses,
  };
}

function getRandomTriggers(category: string): string[] {
  const allTriggers = [
    ...COLOMBIA_PSYCHOLOGY_TRIGGERS.freedom_triggers,
    ...COLOMBIA_PSYCHOLOGY_TRIGGERS.urgency_triggers,
    ...COLOMBIA_PSYCHOLOGY_TRIGGERS.tourist_capture_triggers,
    ...COLOMBIA_PSYCHOLOGY_TRIGGERS.competition_triggers,
  ];
  
  // Shuffle and pick 3
  const shuffled = allTriggers.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}
