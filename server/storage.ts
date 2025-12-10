import { 
  type User, type InsertUser, 
  type Business, type InsertBusiness,
  type Scan, type InsertScan,
  type OutreachCampaign, type InsertOutreachCampaign,
  type Event, type InsertEvent,
  type IntentSignal, type InsertIntentSignal,
  type VenueMonitor, type InsertVenueMonitor,
  type InstagramPost, type InsertInstagramPost,
  type AuthorityContent, type InsertAuthorityContent,
  type TeamInvitation, type InsertTeamInvitation,
  type MagicLinkToken, type InsertMagicLinkToken,
  type ActivityLog, type InsertActivityLog,
  users, businesses, scans, outreachCampaigns,
  events, intentSignals, venueMonitors, instagramPosts, authorityContent,
  teamInvitations, magicLinkTokens, activityLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, like, and, or, gte, lte, sql, count, isNull, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  upsertUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  
  // Team Invitations
  getTeamInvitation(id: string): Promise<TeamInvitation | undefined>;
  getTeamInvitationByCode(code: string): Promise<TeamInvitation | undefined>;
  getTeamInvitations(createdBy?: string): Promise<TeamInvitation[]>;
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  updateTeamInvitation(id: string, invitation: Partial<TeamInvitation>): Promise<TeamInvitation | undefined>;
  deleteTeamInvitation(id: string): Promise<void>;
  
  // Magic Link Tokens
  getMagicLinkToken(token: string): Promise<MagicLinkToken | undefined>;
  createMagicLinkToken(magicLink: InsertMagicLinkToken): Promise<MagicLinkToken>;
  markMagicLinkUsed(token: string): Promise<void>;
  
  // Activity Log
  getActivityLogs(filters?: ActivityLogFilters): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Businesses
  getBusiness(id: string): Promise<Business | undefined>;
  getBusinessByPlaceId(placeId: string): Promise<Business | undefined>;
  getBusinesses(filters?: BusinessFilters): Promise<Business[]>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, business: Partial<InsertBusiness>): Promise<Business | undefined>;
  deleteBusiness(id: string): Promise<void>;
  getBusinessStats(): Promise<BusinessStats>;
  
  // Scans
  getScan(id: string): Promise<Scan | undefined>;
  getScans(userId?: string): Promise<Scan[]>;
  createScan(scan: InsertScan): Promise<Scan>;
  updateScan(id: string, scan: Partial<Scan>): Promise<Scan | undefined>;
  
  // Outreach
  getOutreachCampaign(id: string): Promise<OutreachCampaign | undefined>;
  getOutreachCampaigns(businessId?: string): Promise<OutreachCampaign[]>;
  getAllOutreachCampaigns(status?: string): Promise<(OutreachCampaign & { business?: Business })[]>;
  createOutreachCampaign(campaign: InsertOutreachCampaign): Promise<OutreachCampaign>;
  updateOutreachCampaign(id: string, campaign: Partial<InsertOutreachCampaign>): Promise<OutreachCampaign | undefined>;
  deleteOutreachCampaign(id: string): Promise<void>;
  
  // Events
  getEvent(id: string): Promise<Event | undefined>;
  getEvents(filters?: EventFilters): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;
  getEventStats(): Promise<EventStats>;
  
  // Intent Signals
  getIntentSignal(id: string): Promise<IntentSignal | undefined>;
  getIntentSignals(filters?: IntentSignalFilters): Promise<IntentSignal[]>;
  getIntentSignalStats(): Promise<IntentSignalStats>;
  createIntentSignal(signal: InsertIntentSignal): Promise<IntentSignal>;
  updateIntentSignal(id: string, signal: Partial<InsertIntentSignal>): Promise<IntentSignal | undefined>;
  deleteIntentSignal(id: string): Promise<void>;
  
  // Venue Monitors
  getVenueMonitor(id: string): Promise<VenueMonitor | undefined>;
  getVenueMonitors(filters?: VenueMonitorFilters): Promise<VenueMonitor[]>;
  createVenueMonitor(venue: InsertVenueMonitor): Promise<VenueMonitor>;
  updateVenueMonitor(id: string, venue: Partial<InsertVenueMonitor>): Promise<VenueMonitor | undefined>;
  deleteVenueMonitor(id: string): Promise<void>;
  
  // Instagram Posts
  getInstagramPost(id: string): Promise<InstagramPost | undefined>;
  getInstagramPosts(filters?: InstagramPostFilters): Promise<InstagramPost[]>;
  createInstagramPost(post: InsertInstagramPost): Promise<InstagramPost>;
  updateInstagramPost(id: string, post: Partial<InsertInstagramPost>): Promise<InstagramPost | undefined>;
  
  // Authority Content
  getAuthorityContent(id: string): Promise<AuthorityContent | undefined>;
  getAuthorityContentList(filters?: ContentFilters): Promise<AuthorityContent[]>;
  createAuthorityContent(content: InsertAuthorityContent): Promise<AuthorityContent>;
  updateAuthorityContent(id: string, content: Partial<InsertAuthorityContent>): Promise<AuthorityContent | undefined>;
  deleteAuthorityContent(id: string): Promise<void>;
}

export interface BusinessFilters {
  city?: string;
  category?: string;
  search?: string;
  minScore?: number;
  maxScore?: number;
  aiReadiness?: string;
  outreachStatus?: string;
  hasEmail?: boolean;
  hasWebsite?: boolean;
  isEnriched?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BusinessStats {
  total: number;
  byCategory: Record<string, number>;
  byCity: Record<string, number>;
  byReadiness: Record<string, number>;
  byOutreachStatus: Record<string, number>;
  withEmail: number;
  withWebsite: number;
  withPhone: number;
  avgScore: number;
  enriched: number;
}

export interface EventFilters {
  city?: string;
  category?: string;
  eventTier?: string;
  source?: string;
  isFlagged?: boolean;
  startDateFrom?: Date;
  startDateTo?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface EventStats {
  total: number;
  byCity: Record<string, number>;
  byCategory: Record<string, number>;
  byTier: Record<string, number>;
  bySource: Record<string, number>;
  upcoming: number;
  flagged: number;
}

export interface IntentSignalFilters {
  intentLevel?: string;
  source?: string;
  isProcessed?: boolean;
  isComplaint?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface IntentSignalStats {
  total: number;
  byIntentLevel: Record<string, number>;
  bySource: Record<string, number>;
  processed: number;
  unprocessed: number;
  complaints: number;
}

export interface VenueMonitorFilters {
  city?: string;
  tier?: string;
  category?: string;
  isActive?: boolean;
  priority?: number;
  limit?: number;
}

export interface InstagramPostFilters {
  venueHandle?: string;
  isEventAnnouncement?: boolean;
  isProcessed?: boolean;
  limit?: number;
}

export interface ContentFilters {
  contentType?: string;
  city?: string;
  category?: string;
  status?: string;
  limit?: number;
}

export interface ActivityLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Team Invitations
  async getTeamInvitation(id: string): Promise<TeamInvitation | undefined> {
    const [invitation] = await db.select().from(teamInvitations).where(eq(teamInvitations.id, id));
    return invitation;
  }

  async getTeamInvitationByCode(code: string): Promise<TeamInvitation | undefined> {
    const [invitation] = await db.select().from(teamInvitations).where(eq(teamInvitations.code, code));
    return invitation;
  }

  async getTeamInvitations(createdBy?: string): Promise<TeamInvitation[]> {
    if (createdBy) {
      return await db.select().from(teamInvitations)
        .where(eq(teamInvitations.createdBy, createdBy))
        .orderBy(desc(teamInvitations.createdAt));
    }
    return await db.select().from(teamInvitations).orderBy(desc(teamInvitations.createdAt));
  }

  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    const [result] = await db.insert(teamInvitations).values(invitation).returning();
    return result;
  }

  async updateTeamInvitation(id: string, invitation: Partial<TeamInvitation>): Promise<TeamInvitation | undefined> {
    const [result] = await db
      .update(teamInvitations)
      .set(invitation)
      .where(eq(teamInvitations.id, id))
      .returning();
    return result;
  }

  async deleteTeamInvitation(id: string): Promise<void> {
    await db.delete(teamInvitations).where(eq(teamInvitations.id, id));
  }

  // Magic Link Tokens
  async getMagicLinkToken(token: string): Promise<MagicLinkToken | undefined> {
    const [result] = await db.select().from(magicLinkTokens).where(eq(magicLinkTokens.token, token));
    return result;
  }

  async createMagicLinkToken(magicLink: InsertMagicLinkToken): Promise<MagicLinkToken> {
    const [result] = await db.insert(magicLinkTokens).values(magicLink).returning();
    return result;
  }

  async markMagicLinkUsed(token: string): Promise<void> {
    await db.update(magicLinkTokens).set({ usedAt: new Date() }).where(eq(magicLinkTokens.token, token));
  }

  // Activity Log
  async getActivityLogs(filters?: ActivityLogFilters): Promise<ActivityLog[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(activityLog.userId, filters.userId));
    }
    if (filters?.action) {
      conditions.push(eq(activityLog.action, filters.action));
    }
    if (filters?.entityType) {
      conditions.push(eq(activityLog.entityType, filters.entityType));
    }
    if (filters?.entityId) {
      conditions.push(eq(activityLog.entityId, filters.entityId));
    }

    let query = db.select().from(activityLog);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    query = query.orderBy(desc(activityLog.createdAt)) as any;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLog).values(log).returning();
    return result;
  }

  // Businesses
  async getBusiness(id: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business;
  }

  async getBusinessByPlaceId(placeId: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.placeId, placeId));
    return business;
  }

  async getBusinesses(filters?: BusinessFilters): Promise<Business[]> {
    const conditions = [];
    
    if (filters?.city) {
      conditions.push(eq(businesses.city, filters.city));
    }
    if (filters?.category) {
      conditions.push(eq(businesses.category, filters.category));
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(businesses.name, `%${filters.search}%`),
          like(businesses.address, `%${filters.search}%`)
        )
      );
    }
    if (filters?.minScore !== undefined) {
      conditions.push(gte(businesses.aiScore, filters.minScore));
    }
    if (filters?.maxScore !== undefined) {
      conditions.push(lte(businesses.aiScore, filters.maxScore));
    }
    if (filters?.aiReadiness) {
      conditions.push(eq(businesses.aiReadiness, filters.aiReadiness));
    }
    if (filters?.outreachStatus) {
      conditions.push(eq(businesses.outreachStatus, filters.outreachStatus));
    }
    if (filters?.hasEmail) {
      conditions.push(sql`${businesses.email} IS NOT NULL AND ${businesses.email} != ''`);
    }
    if (filters?.hasWebsite) {
      conditions.push(sql`${businesses.website} IS NOT NULL AND ${businesses.website} != ''`);
    }
    if (filters?.isEnriched !== undefined) {
      conditions.push(eq(businesses.isEnriched, filters.isEnriched));
    }

    let query = db.select().from(businesses);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const sortColumn = filters?.sortBy === 'score' ? businesses.aiScore 
                     : filters?.sortBy === 'rating' ? businesses.rating
                     : filters?.sortBy === 'name' ? businesses.name
                     : businesses.createdAt;
    
    const sortOrder = filters?.sortOrder === 'asc' ? asc : desc;
    query = query.orderBy(sortOrder(sortColumn)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [created] = await db.insert(businesses).values(business).returning();
    return created;
  }

  async updateBusiness(id: string, business: Partial<InsertBusiness>): Promise<Business | undefined> {
    const [updated] = await db
      .update(businesses)
      .set({ ...business, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return updated;
  }

  async deleteBusiness(id: string): Promise<void> {
    await db.delete(businesses).where(eq(businesses.id, id));
  }

  async getBusinessStats(): Promise<BusinessStats> {
    const allBusinesses = await db.select().from(businesses);
    
    const stats: BusinessStats = {
      total: allBusinesses.length,
      byCategory: {},
      byCity: {},
      byReadiness: {},
      byOutreachStatus: {},
      withEmail: 0,
      withWebsite: 0,
      withPhone: 0,
      avgScore: 0,
      enriched: 0,
    };

    let totalScore = 0;
    let scoredCount = 0;

    for (const b of allBusinesses) {
      stats.byCategory[b.category] = (stats.byCategory[b.category] || 0) + 1;
      stats.byCity[b.city] = (stats.byCity[b.city] || 0) + 1;
      
      if (b.aiReadiness) {
        stats.byReadiness[b.aiReadiness] = (stats.byReadiness[b.aiReadiness] || 0) + 1;
      }
      if (b.outreachStatus) {
        stats.byOutreachStatus[b.outreachStatus] = (stats.byOutreachStatus[b.outreachStatus] || 0) + 1;
      }
      
      if (b.email) stats.withEmail++;
      if (b.website) stats.withWebsite++;
      if (b.phone) stats.withPhone++;
      if (b.isEnriched) stats.enriched++;
      
      if (b.aiScore !== null) {
        totalScore += b.aiScore;
        scoredCount++;
      }
    }

    stats.avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;
    
    return stats;
  }

  // Scans
  async getScan(id: string): Promise<Scan | undefined> {
    const [scan] = await db.select().from(scans).where(eq(scans.id, id));
    return scan;
  }

  async getScans(userId?: string): Promise<Scan[]> {
    if (userId) {
      return await db.select().from(scans).where(eq(scans.userId, userId)).orderBy(desc(scans.startedAt));
    }
    return await db.select().from(scans).orderBy(desc(scans.startedAt));
  }

  async createScan(scan: InsertScan): Promise<Scan> {
    const [created] = await db.insert(scans).values(scan).returning();
    return created;
  }

  async updateScan(id: string, scan: Partial<Scan>): Promise<Scan | undefined> {
    const [updated] = await db.update(scans).set(scan).where(eq(scans.id, id)).returning();
    return updated;
  }

  // Outreach
  async getOutreachCampaign(id: string): Promise<OutreachCampaign | undefined> {
    const [campaign] = await db.select().from(outreachCampaigns).where(eq(outreachCampaigns.id, id));
    return campaign;
  }

  async getOutreachCampaigns(businessId?: string): Promise<OutreachCampaign[]> {
    if (businessId) {
      return await db.select().from(outreachCampaigns).where(eq(outreachCampaigns.businessId, businessId)).orderBy(desc(outreachCampaigns.createdAt));
    }
    return await db.select().from(outreachCampaigns).orderBy(desc(outreachCampaigns.createdAt));
  }

  async createOutreachCampaign(campaign: InsertOutreachCampaign): Promise<OutreachCampaign> {
    const [created] = await db.insert(outreachCampaigns).values(campaign).returning();
    return created;
  }

  async updateOutreachCampaign(id: string, campaign: Partial<InsertOutreachCampaign>): Promise<OutreachCampaign | undefined> {
    const [updated] = await db
      .update(outreachCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(outreachCampaigns.id, id))
      .returning();
    return updated;
  }

  async getAllOutreachCampaigns(status?: string): Promise<(OutreachCampaign & { business?: Business })[]> {
    const conditions = [];
    if (status) {
      conditions.push(eq(outreachCampaigns.status, status));
    }
    
    const campaigns = conditions.length > 0
      ? await db.select().from(outreachCampaigns).where(and(...conditions)).orderBy(desc(outreachCampaigns.createdAt))
      : await db.select().from(outreachCampaigns).orderBy(desc(outreachCampaigns.createdAt));
    
    // Join with business data
    const enrichedCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        if (campaign.businessId) {
          const business = await this.getBusiness(campaign.businessId);
          return { ...campaign, business };
        }
        return campaign;
      })
    );
    
    return enrichedCampaigns;
  }

  async deleteOutreachCampaign(id: string): Promise<void> {
    await db.delete(outreachCampaigns).where(eq(outreachCampaigns.id, id));
  }

  // Events
  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEvents(filters?: EventFilters): Promise<Event[]> {
    const conditions = [];
    
    if (filters?.city) conditions.push(eq(events.city, filters.city));
    if (filters?.category) conditions.push(eq(events.category, filters.category));
    if (filters?.eventTier) conditions.push(eq(events.eventTier, filters.eventTier));
    if (filters?.source) conditions.push(eq(events.source, filters.source));
    if (filters?.isFlagged !== undefined) conditions.push(eq(events.isFlagged, filters.isFlagged));
    if (filters?.startDateFrom) conditions.push(gte(events.startDate, filters.startDateFrom));
    if (filters?.startDateTo) conditions.push(lte(events.startDate, filters.startDateTo));
    if (filters?.search) {
      conditions.push(or(
        like(events.name, `%${filters.search}%`),
        like(events.description, `%${filters.search}%`)
      ));
    }

    let query = db.select().from(events);
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    query = query.orderBy(asc(events.startDate)) as any;
    if (filters?.limit) query = query.limit(filters.limit) as any;
    if (filters?.offset) query = query.offset(filters.offset) as any;

    return await query;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updated] = await db.update(events).set({ ...event, lastUpdated: new Date() }).where(eq(events.id, id)).returning();
    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async getEventStats(): Promise<EventStats> {
    const allEvents = await db.select().from(events);
    const now = new Date();
    
    const stats: EventStats = {
      total: allEvents.length,
      byCity: {},
      byCategory: {},
      byTier: {},
      bySource: {},
      upcoming: 0,
      flagged: 0,
    };

    for (const e of allEvents) {
      stats.byCity[e.city] = (stats.byCity[e.city] || 0) + 1;
      if (e.category) stats.byCategory[e.category] = (stats.byCategory[e.category] || 0) + 1;
      if (e.eventTier) stats.byTier[e.eventTier] = (stats.byTier[e.eventTier] || 0) + 1;
      stats.bySource[e.source] = (stats.bySource[e.source] || 0) + 1;
      if (e.startDate > now) stats.upcoming++;
      if (e.isFlagged) stats.flagged++;
    }

    return stats;
  }

  // Intent Signals
  async getIntentSignal(id: string): Promise<IntentSignal | undefined> {
    const [signal] = await db.select().from(intentSignals).where(eq(intentSignals.id, id));
    return signal;
  }

  async getIntentSignals(filters?: IntentSignalFilters): Promise<IntentSignal[]> {
    const conditions = [];
    
    if (filters?.intentLevel) conditions.push(eq(intentSignals.intentLevel, filters.intentLevel));
    if (filters?.source) conditions.push(eq(intentSignals.source, filters.source));
    if (filters?.isProcessed !== undefined) conditions.push(eq(intentSignals.isProcessed, filters.isProcessed));
    if (filters?.isComplaint !== undefined) conditions.push(eq(intentSignals.isComplaint, filters.isComplaint));
    if (filters?.search) {
      conditions.push(or(
        like(intentSignals.title, `%${filters.search}%`),
        like(intentSignals.content, `%${filters.search}%`)
      ));
    }

    let query = db.select().from(intentSignals);
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    query = query.orderBy(desc(intentSignals.scrapedAt)) as any;
    if (filters?.limit) query = query.limit(filters.limit) as any;
    if (filters?.offset) query = query.offset(filters.offset) as any;

    return await query;
  }

  async createIntentSignal(signal: InsertIntentSignal): Promise<IntentSignal> {
    const [created] = await db.insert(intentSignals).values(signal).returning();
    return created;
  }

  async updateIntentSignal(id: string, signal: Partial<InsertIntentSignal>): Promise<IntentSignal | undefined> {
    const [updated] = await db.update(intentSignals).set(signal).where(eq(intentSignals.id, id)).returning();
    return updated;
  }

  async deleteIntentSignal(id: string): Promise<void> {
    await db.delete(intentSignals).where(eq(intentSignals.id, id));
  }

  async getIntentSignalStats(): Promise<IntentSignalStats> {
    const allSignals = await db.select().from(intentSignals);
    
    const stats: IntentSignalStats = {
      total: allSignals.length,
      byIntentLevel: {},
      bySource: {},
      processed: 0,
      unprocessed: 0,
      complaints: 0,
    };

    for (const signal of allSignals) {
      stats.byIntentLevel[signal.intentLevel] = (stats.byIntentLevel[signal.intentLevel] || 0) + 1;
      stats.bySource[signal.source] = (stats.bySource[signal.source] || 0) + 1;
      if (signal.isProcessed) stats.processed++;
      else stats.unprocessed++;
      if (signal.isComplaint) stats.complaints++;
    }

    return stats;
  }

  // Venue Monitors
  async getVenueMonitor(id: string): Promise<VenueMonitor | undefined> {
    const [venue] = await db.select().from(venueMonitors).where(eq(venueMonitors.id, id));
    return venue;
  }

  async getVenueMonitors(filters?: VenueMonitorFilters): Promise<VenueMonitor[]> {
    const conditions = [];
    
    if (filters?.city) conditions.push(eq(venueMonitors.city, filters.city));
    if (filters?.tier) conditions.push(eq(venueMonitors.tier, filters.tier));
    if (filters?.category) conditions.push(eq(venueMonitors.category, filters.category));
    if (filters?.isActive !== undefined) conditions.push(eq(venueMonitors.isActive, filters.isActive));
    if (filters?.priority) conditions.push(lte(venueMonitors.priority, filters.priority));

    let query = db.select().from(venueMonitors);
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    query = query.orderBy(asc(venueMonitors.priority)) as any;
    if (filters?.limit) query = query.limit(filters.limit) as any;

    return await query;
  }

  async createVenueMonitor(venue: InsertVenueMonitor): Promise<VenueMonitor> {
    const [created] = await db.insert(venueMonitors).values(venue).returning();
    return created;
  }

  async updateVenueMonitor(id: string, venue: Partial<InsertVenueMonitor>): Promise<VenueMonitor | undefined> {
    const [updated] = await db.update(venueMonitors).set(venue).where(eq(venueMonitors.id, id)).returning();
    return updated;
  }

  async deleteVenueMonitor(id: string): Promise<void> {
    await db.delete(venueMonitors).where(eq(venueMonitors.id, id));
  }

  // Instagram Posts
  async getInstagramPost(id: string): Promise<InstagramPost | undefined> {
    const [post] = await db.select().from(instagramPosts).where(eq(instagramPosts.id, id));
    return post;
  }

  async getInstagramPosts(filters?: InstagramPostFilters): Promise<InstagramPost[]> {
    const conditions = [];
    
    if (filters?.venueHandle) conditions.push(eq(instagramPosts.venueHandle, filters.venueHandle));
    if (filters?.isEventAnnouncement !== undefined) conditions.push(eq(instagramPosts.isEventAnnouncement, filters.isEventAnnouncement));
    if (filters?.isProcessed !== undefined) conditions.push(eq(instagramPosts.isProcessed, filters.isProcessed));

    let query = db.select().from(instagramPosts);
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    query = query.orderBy(desc(instagramPosts.discoveredAt)) as any;
    if (filters?.limit) query = query.limit(filters.limit) as any;

    return await query;
  }

  async createInstagramPost(post: InsertInstagramPost): Promise<InstagramPost> {
    const [created] = await db.insert(instagramPosts).values(post).returning();
    return created;
  }

  async updateInstagramPost(id: string, post: Partial<InsertInstagramPost>): Promise<InstagramPost | undefined> {
    const [updated] = await db.update(instagramPosts).set(post).where(eq(instagramPosts.id, id)).returning();
    return updated;
  }

  // Authority Content
  async getAuthorityContent(id: string): Promise<AuthorityContent | undefined> {
    const [content] = await db.select().from(authorityContent).where(eq(authorityContent.id, id));
    return content;
  }

  async getAuthorityContentList(filters?: ContentFilters): Promise<AuthorityContent[]> {
    const conditions = [];
    
    if (filters?.contentType) conditions.push(eq(authorityContent.contentType, filters.contentType));
    if (filters?.city) conditions.push(eq(authorityContent.city, filters.city));
    if (filters?.category) conditions.push(eq(authorityContent.category, filters.category));
    if (filters?.status) conditions.push(eq(authorityContent.status, filters.status));

    let query = db.select().from(authorityContent);
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    query = query.orderBy(desc(authorityContent.createdAt)) as any;
    if (filters?.limit) query = query.limit(filters.limit) as any;

    return await query;
  }

  async createAuthorityContent(content: InsertAuthorityContent): Promise<AuthorityContent> {
    const [created] = await db.insert(authorityContent).values(content).returning();
    return created;
  }

  async updateAuthorityContent(id: string, content: Partial<InsertAuthorityContent>): Promise<AuthorityContent | undefined> {
    const [updated] = await db.update(authorityContent).set({ ...content, updatedAt: new Date() }).where(eq(authorityContent.id, id)).returning();
    return updated;
  }

  async deleteAuthorityContent(id: string): Promise<void> {
    await db.delete(authorityContent).where(eq(authorityContent.id, id));
  }
}

export const storage = new DatabaseStorage();
