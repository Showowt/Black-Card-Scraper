import { 
  type User, type InsertUser, 
  type Business, type InsertBusiness,
  type Scan, type InsertScan,
  type OutreachCampaign, type InsertOutreachCampaign,
  users, businesses, scans, outreachCampaigns
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, like, and, or, gte, lte, sql, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;
  
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
  createOutreachCampaign(campaign: InsertOutreachCampaign): Promise<OutreachCampaign>;
  updateOutreachCampaign(id: string, campaign: Partial<InsertOutreachCampaign>): Promise<OutreachCampaign | undefined>;
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
}

export const storage = new DatabaseStorage();
