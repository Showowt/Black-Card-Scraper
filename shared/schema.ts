import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const businesses = pgTable("businesses", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  placeId: text("place_id").unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  rating: real("rating"),
  reviewCount: integer("review_count"),
  priceLevel: integer("price_level"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  photoUrl: text("photo_url"),
  googleMapsUrl: text("google_maps_url"),
  openingHours: jsonb("opening_hours"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  whatsapp: text("whatsapp"),
  aiScore: integer("ai_score"),
  aiReadiness: text("ai_readiness"),
  aiSummary: text("ai_summary"),
  aiOutreachHook: text("ai_outreach_hook"),
  aiClassification: text("ai_classification"),
  isEnriched: boolean("is_enriched").default(false),
  outreachStatus: text("outreach_status").default("pending"),
  outreachNotes: text("outreach_notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  scannedAt: timestamp("scanned_at").defaultNow(),
  enrichedAt: timestamp("enriched_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scans = pgTable("scans", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  city: text("city").notNull(),
  category: text("category").notNull(),
  status: text("status").default("pending"),
  totalFound: integer("total_found").default(0),
  totalEnriched: integer("total_enriched").default(0),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});

export const outreachCampaigns = pgTable("outreach_campaigns", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  businessId: varchar("business_id", { length: 255 }).references(() => businesses.id),
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  status: text("status").default("draft"),
  sentAt: timestamp("sent_at"),
  respondedAt: timestamp("responded_at"),
  convertedAt: timestamp("converted_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  scannedAt: true,
});

export const insertScanSchema = createInsertSchema(scans).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertOutreachCampaignSchema = createInsertSchema(outreachCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;
export type InsertOutreachCampaign = z.infer<typeof insertOutreachCampaignSchema>;
export type OutreachCampaign = typeof outreachCampaigns.$inferSelect;

export const CITIES = [
  { value: "cartagena", label: "Cartagena", coordinates: { lat: 10.3910, lng: -75.4794 } },
  { value: "medellin", label: "Medellín", coordinates: { lat: 6.2442, lng: -75.5812 } },
  { value: "bogota", label: "Bogotá", coordinates: { lat: 4.7110, lng: -74.0721 } },
  { value: "cali", label: "Cali", coordinates: { lat: 3.4516, lng: -76.5320 } },
  { value: "barranquilla", label: "Barranquilla", coordinates: { lat: 10.9639, lng: -74.7964 } },
  { value: "santa_marta", label: "Santa Marta", coordinates: { lat: 11.2404, lng: -74.1990 } },
  { value: "san_andres", label: "San Andrés", coordinates: { lat: 12.5567, lng: -81.7185 } },
  { value: "bucaramanga", label: "Bucaramanga", coordinates: { lat: 7.1254, lng: -73.1198 } },
  { value: "pereira", label: "Pereira", coordinates: { lat: 4.8087, lng: -75.6906 } },
] as const;

export const CATEGORIES = [
  { value: "restaurant", label: "Restaurants", googleType: "restaurant" },
  { value: "hotel", label: "Hotels", googleType: "lodging" },
  { value: "club", label: "Clubs & Nightlife", googleType: "night_club" },
  { value: "tour_operator", label: "Tour Operators", googleType: "travel_agency" },
  { value: "spa", label: "Spas & Wellness", googleType: "spa" },
  { value: "bar", label: "Bars & Lounges", googleType: "bar" },
  { value: "cafe", label: "Cafes & Coffee", googleType: "cafe" },
  { value: "museum", label: "Museums & Culture", googleType: "museum" },
  { value: "gym", label: "Gyms & Fitness", googleType: "gym" },
  { value: "shopping", label: "Shopping", googleType: "shopping_mall" },
  { value: "car_rental", label: "Car Rental", googleType: "car_rental" },
  { value: "beauty_salon", label: "Beauty Salons", googleType: "beauty_salon" },
] as const;

export const OUTREACH_STATUSES = [
  { value: "pending", label: "Pending", color: "gray" },
  { value: "contacted", label: "Contacted", color: "blue" },
  { value: "responded", label: "Responded", color: "amber" },
  { value: "converted", label: "Converted", color: "green" },
  { value: "not_interested", label: "Not Interested", color: "red" },
] as const;

export const AI_READINESS_LEVELS = [
  { value: "high", label: "High", color: "green", minScore: 70 },
  { value: "medium", label: "Medium", color: "amber", minScore: 40 },
  { value: "low", label: "Low", color: "red", minScore: 0 },
] as const;
