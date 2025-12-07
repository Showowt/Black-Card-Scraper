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
  { value: "boat_charter", label: "Boat Charters", googleType: "boat_rental" },
  { value: "event_planner", label: "Event Planners", googleType: "event_planner" },
  { value: "photographer", label: "Photographers", googleType: "photographer" },
  { value: "videographer", label: "Videographers", googleType: "video_production" },
  { value: "dj", label: "DJs & Entertainment", googleType: "entertainment_agency" },
  { value: "chef", label: "Private Chefs", googleType: "caterer" },
  { value: "real_estate", label: "Real Estate", googleType: "real_estate_agency" },
  { value: "coworking", label: "Coworking Spaces", googleType: "coworking_space" },
] as const;

export const TEXT_SEARCH_SUPPLEMENTS: Record<string, string[]> = {
  boat_charter: [
    "yacht charter",
    "boat rental",
    "party boat",
    "catamaran tour",
    "sailing charter",
    "island boat tour",
    "fishing charter",
  ],
  chef: [
    "private chef",
    "personal chef",
    "catering service",
    "chef privado",
    "chef a domicilio",
  ],
  dj: [
    "dj services",
    "wedding dj",
    "event dj",
    "party dj",
  ],
  photographer: [
    "wedding photographer",
    "event photographer",
    "portrait photographer",
    "fotografo bodas",
  ],
  videographer: [
    "wedding videographer",
    "event videographer",
    "video production",
    "videografo",
  ],
  event_planner: [
    "wedding planner",
    "event planner",
    "party planner",
    "destination wedding",
    "organizador de eventos",
  ],
};

export const VERTICAL_INTELLIGENCE: Record<string, {
  painPoints: string[];
  automations: string[];
  hookAngles: string[];
}> = {
  restaurant: {
    painPoints: [
      "Reservation chaos across phone, WhatsApp, Instagram DMs",
      "No-shows costing 15-20% of bookings",
      "Staff overwhelmed answering the same questions",
      "Menu updates scattered across platforms",
      "Review management is manual and slow",
    ],
    automations: [
      "WhatsApp booking bot with confirmation + reminders",
      "AI receptionist for calls (reservation + FAQ)",
      "Automated review response system",
      "Digital menu with real-time updates",
      "No-show prediction + deposit system",
    ],
    hookAngles: ["reservation system", "WhatsApp inquiries", "Google reviews", "no-show problem"],
  },
  hotel: {
    painPoints: [
      "Guest inquiries 24/7 across multiple channels",
      "Upsell opportunities missed (tours, dining, spa)",
      "Check-in/out friction",
      "OTA dependency eating margins",
      "Slow response to booking requests",
    ],
    automations: [
      "AI concierge (WhatsApp) for guest requests",
      "Automated pre-arrival upsell sequences",
      "Direct booking chatbot to reduce OTA fees",
      "Review solicitation automation",
      "Staff task automation (housekeeping, maintenance)",
    ],
    hookAngles: ["guest experience", "direct bookings", "OTA commissions", "concierge automation"],
  },
  tour_operator: {
    painPoints: [
      "Manual booking and itinerary creation",
      "WhatsApp groups with tourists are chaos",
      "No-shows and last-minute cancellations",
      "Difficulty scaling without more staff",
      "Payment collection is fragmented",
    ],
    automations: [
      "Booking bot with availability + instant confirmation",
      "Automated itinerary delivery",
      "Payment integration with reminders",
      "AI FAQ handler for common questions",
      "Post-tour review automation",
    ],
    hookAngles: ["booking process", "WhatsApp management", "scaling operations", "customer communication"],
  },
  boat_charter: {
    painPoints: [
      "Inquiry overload via WhatsApp/Instagram",
      "Complex availability and pricing communication",
      "Deposits and payment tracking",
      "Weather-related rescheduling chaos",
      "Crew coordination",
    ],
    automations: [
      "Instant quote bot with availability checker",
      "Automated booking + deposit collection",
      "Weather alert + rescheduling system",
      "Post-trip review + rebooking automation",
      "Crew scheduling automation",
    ],
    hookAngles: ["booking inquiries", "quote requests", "availability management", "customer experience"],
  },
  spa: {
    painPoints: [
      "Appointment scheduling across channels",
      "No-shows without deposits",
      "Staff scheduling complexity",
      "Upsell and rebooking missed",
      "Review management",
    ],
    automations: [
      "WhatsApp booking with reminders",
      "Deposit collection automation",
      "Automated rebooking sequences",
      "Review request automation",
      "Staff schedule optimization",
    ],
    hookAngles: ["appointment bookings", "no-show rate", "client retention", "online presence"],
  },
  club: {
    painPoints: [
      "Table reservation chaos",
      "VIP guest management",
      "Event promotion fragmented",
      "Guest list management",
      "Bottle service coordination",
    ],
    automations: [
      "Table reservation bot with deposits",
      "VIP CRM with automated outreach",
      "Event promotion automation",
      "Guest list + check-in system",
      "Post-event rebooking sequences",
    ],
    hookAngles: ["table reservations", "VIP experience", "event promotion", "guest management"],
  },
  chef: {
    painPoints: [
      "Inquiry management across platforms",
      "Menu customization discussions are lengthy",
      "Deposit and payment collection",
      "Calendar and availability management",
      "Client follow-up for rebooking",
    ],
    automations: [
      "Inquiry bot with menu options + pricing",
      "Automated booking with deposits",
      "Client preference tracking",
      "Post-event feedback + rebooking",
      "Social proof automation",
    ],
    hookAngles: ["booking process", "client inquiries", "menu consultations", "client management"],
  },
  photographer: {
    painPoints: [
      "Inquiry response time",
      "Portfolio sharing is manual",
      "Contract and payment collection",
      "Scheduling across multiple shoots",
      "Delivery timeline communication",
    ],
    automations: [
      "Inquiry bot with portfolio + pricing",
      "Automated contract + deposit flow",
      "Scheduling automation",
      "Delivery notification system",
      "Review + referral automation",
    ],
    hookAngles: ["inquiry management", "booking process", "client communication", "portfolio showcase"],
  },
  videographer: {
    painPoints: [
      "Project scoping takes multiple calls",
      "Delivery timeline management",
      "Revision request handling",
      "Payment milestones",
      "Client communication during production",
    ],
    automations: [
      "Project scoping bot with packages",
      "Automated milestone updates",
      "Revision request system",
      "Payment automation",
      "Review + referral sequences",
    ],
    hookAngles: ["project inquiries", "client communication", "booking workflow", "delivery process"],
  },
  event_planner: {
    painPoints: [
      "Lead qualification takes forever",
      "Vendor coordination is manual",
      "Budget tracking across vendors",
      "Client update communication",
      "Post-event follow-up",
    ],
    automations: [
      "Lead qualification bot with budget + vision",
      "Vendor CRM with automated outreach",
      "Budget tracking dashboard",
      "Client update automation",
      "Testimonial + referral system",
    ],
    hookAngles: ["lead qualification", "client management", "vendor coordination", "event workflow"],
  },
  dj: {
    painPoints: [
      "Booking inquiries scattered",
      "Song request management",
      "Contract and deposit collection",
      "Equipment logistics",
      "Building consistent bookings",
    ],
    automations: [
      "Booking bot with availability + pricing",
      "Song request collection system",
      "Contract + deposit automation",
      "Event prep checklist automation",
      "Review + rebooking sequences",
    ],
    hookAngles: ["booking process", "client inquiries", "event coordination", "online presence"],
  },
};

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

// Event Discovery Schema
export const events = pgTable("events", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(), // eventbrite, resident_advisor, instagram, manual
  externalId: text("external_id").notNull(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  city: text("city").notNull().default("Cartagena"),
  venue: jsonb("venue"), // { name, address, tier, instagram }
  category: text("category"), // nightclub, concert, festival, boat_party, pool_party, rooftop, private_dinner
  tags: text("tags").array(),
  artists: jsonb("artists"), // [{ name, headliner, genre, spotify_monthly }]
  headliners: text("headliners").array(),
  ticketTiers: jsonb("ticket_tiers"), // [{ name, price, currency, available }]
  minPrice: real("min_price"),
  maxPrice: real("max_price"),
  currency: text("currency").default("COP"),
  isSoldOut: boolean("is_sold_out").default(false),
  eventTier: text("event_tier").default("unknown"), // ultra_premium, premium, mid_tier, budget, free
  tierSignals: text("tier_signals").array(),
  capacity: integer("capacity"),
  imageUrl: text("image_url"),
  isFlagged: boolean("is_flagged").default(false),
  discoveredAt: timestamp("discovered_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Intent Signals Schema (Reddit, Travel Forums)
export const intentSignals = pgTable("intent_signals", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(), // reddit, tripadvisor, twitter
  externalId: text("external_id"),
  url: text("url").notNull(),
  title: text("title"),
  content: text("content").notNull(),
  author: text("author"),
  authorUrl: text("author_url"),
  intentLevel: text("intent_level").notNull(), // high, medium, low
  intentTypes: text("intent_types").array(), // recommendation_seeking, luxury_signals, etc.
  isComplaint: boolean("is_complaint").default(false),
  travelDates: text("travel_dates"),
  partySize: text("party_size"),
  interests: text("interests").array(),
  budgetSignals: text("budget_signals").array(),
  score: integer("score"), // upvotes, likes
  commentCount: integer("comment_count"),
  postedAt: timestamp("posted_at"),
  scrapedAt: timestamp("scraped_at").defaultNow(),
  isProcessed: boolean("is_processed").default(false),
  notes: text("notes"),
});

// Instagram Venue Monitoring Schema
export const venueMonitors = pgTable("venue_monitors", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  instagramHandle: text("instagram_handle").notNull().unique(),
  instagramUrl: text("instagram_url"),
  category: text("category"), // nightclub, hotel, restaurant, boat, beach_club
  tier: text("tier"), // luxury, upscale, standard
  city: text("city").default("Cartagena"),
  priority: integer("priority").default(1), // 1 = highest priority
  keywords: text("keywords").array(),
  rssFeedUrl: text("rss_feed_url"),
  isActive: boolean("is_active").default(true),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Instagram Post Alerts
export const instagramPosts = pgTable("instagram_posts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  postId: text("post_id").unique(),
  venueHandle: text("venue_handle").notNull(),
  venueName: text("venue_name"),
  caption: text("caption"),
  imageUrl: text("image_url"),
  postUrl: text("post_url"),
  isEventAnnouncement: boolean("is_event_announcement").default(false),
  detectedEventName: text("detected_event_name"),
  detectedKeywords: text("detected_keywords").array(),
  postedAt: timestamp("posted_at"),
  discoveredAt: timestamp("discovered_at").defaultNow(),
  isProcessed: boolean("is_processed").default(false),
  notes: text("notes"),
});

// Authority Content Schema
export const authorityContent = pgTable("authority_content", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  contentType: text("content_type").notNull(), // listicle, guide, comparison, insider_tip
  title: text("title").notNull(),
  content: text("content").notNull(),
  city: text("city"),
  category: text("category"),
  relatedBusinessIds: text("related_business_ids").array(),
  relatedEventIds: text("related_event_ids").array(),
  keywords: text("keywords").array(),
  metaDescription: text("meta_description"),
  status: text("status").default("draft"), // draft, published, archived
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for new tables
export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  discoveredAt: true,
  lastUpdated: true,
});

export const insertIntentSignalSchema = createInsertSchema(intentSignals).omit({
  id: true,
  scrapedAt: true,
});

export const insertVenueMonitorSchema = createInsertSchema(venueMonitors).omit({
  id: true,
  createdAt: true,
});

export const insertInstagramPostSchema = createInsertSchema(instagramPosts).omit({
  id: true,
  discoveredAt: true,
});

export const insertAuthorityContentSchema = createInsertSchema(authorityContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertIntentSignal = z.infer<typeof insertIntentSignalSchema>;
export type IntentSignal = typeof intentSignals.$inferSelect;
export type InsertVenueMonitor = z.infer<typeof insertVenueMonitorSchema>;
export type VenueMonitor = typeof venueMonitors.$inferSelect;
export type InsertInstagramPost = z.infer<typeof insertInstagramPostSchema>;
export type InstagramPost = typeof instagramPosts.$inferSelect;
export type InsertAuthorityContent = z.infer<typeof insertAuthorityContentSchema>;
export type AuthorityContent = typeof authorityContent.$inferSelect;

// Event Tier Classification
export const EVENT_TIERS = [
  { value: "ultra_premium", label: "Ultra Premium", color: "purple", minPrice: 200 }, // $200+ USD
  { value: "premium", label: "Premium", color: "amber", minPrice: 80 }, // $80-200 USD
  { value: "mid_tier", label: "Mid Tier", color: "blue", minPrice: 30 }, // $30-80 USD
  { value: "budget", label: "Budget", color: "gray", minPrice: 1 }, // Under $30 USD
  { value: "free", label: "Free", color: "green", minPrice: 0 },
  { value: "unknown", label: "Unknown", color: "slate", minPrice: null },
] as const;

export const EVENT_CATEGORIES = [
  { value: "nightclub", label: "Nightclub" },
  { value: "concert", label: "Concert" },
  { value: "festival", label: "Festival" },
  { value: "boat_party", label: "Boat Party" },
  { value: "pool_party", label: "Pool Party" },
  { value: "rooftop", label: "Rooftop" },
  { value: "private_dinner", label: "Private Dinner" },
  { value: "wellness", label: "Wellness" },
  { value: "cultural", label: "Cultural" },
  { value: "networking", label: "Networking" },
  { value: "other", label: "Other" },
] as const;

export const EVENT_SOURCES = [
  { value: "eventbrite", label: "Eventbrite" },
  { value: "resident_advisor", label: "Resident Advisor" },
  { value: "instagram", label: "Instagram" },
  { value: "manual", label: "Manual" },
] as const;

export const INTENT_LEVELS = [
  { value: "high", label: "High Intent", color: "green" },
  { value: "medium", label: "Medium Intent", color: "amber" },
  { value: "low", label: "Low Intent", color: "gray" },
] as const;

// Luxury Venues in Cartagena for monitoring
export const LUXURY_VENUES = {
  alquimico: { tier: "luxury", category: "rooftop" },
  la_movida: { tier: "luxury", category: "nightclub" },
  cafe_del_mar: { tier: "upscale", category: "rooftop" },
  el_arsenal: { tier: "luxury", category: "nightclub" },
  bagatelle: { tier: "luxury", category: "beach_club" },
  la_passion: { tier: "luxury", category: "boat" },
  sofitel_legend: { tier: "luxury", category: "hotel" },
  casa_san_agustin: { tier: "luxury", category: "hotel" },
  tcherassi: { tier: "luxury", category: "hotel" },
} as const;

// Default Cartagena venues to monitor
export const CARTAGENA_VENUES_TO_MONITOR = [
  { name: "Alquimico", handle: "alquimico", category: "rooftop_bar", tier: "luxury", priority: 1, keywords: ["event", "party", "dj", "live", "show", "fiesta", "especial"] },
  { name: "La Movida", handle: "lamovida", category: "nightclub", tier: "luxury", priority: 1, keywords: ["fiesta", "party", "dj", "presenta", "evento"] },
  { name: "El Arsenal", handle: "elarsenalctg", category: "nightclub", tier: "luxury", priority: 1, keywords: ["party", "night", "evento", "presenta"] },
  { name: "Cafe del Mar", handle: "cafedelmarcartagena", category: "rooftop_bar", tier: "upscale", priority: 2, keywords: ["sunset", "party", "dj", "live", "music"] },
  { name: "Bagatelle", handle: "bagatellecolombia", category: "beach_club", tier: "luxury", priority: 1, keywords: ["party", "brunch", "dj", "pool", "event"] },
  { name: "La Passion Cartagena", handle: "lapassioncartagena", category: "boat_party", tier: "luxury", priority: 1, keywords: ["party", "boat", "sunset", "tour", "privado"] },
  { name: "Sofitel Legend Santa Clara", handle: "sofitelcartagena", category: "hotel", tier: "luxury", priority: 2, keywords: ["event", "new year", "christmas", "gala", "dinner"] },
  { name: "Casa San Agustin", handle: "casasanagustin", category: "hotel", tier: "luxury", priority: 2, keywords: ["event", "dinner", "experience"] },
  { name: "Tcherassi Hotel", handle: "tcherassihotel", category: "hotel", tier: "luxury", priority: 2, keywords: ["event", "experience", "exclusive"] },
  { name: "Carmen Cartagena", handle: "carmencartagena", category: "restaurant", tier: "luxury", priority: 3, keywords: ["chef", "dinner", "event", "special", "tasting"] },
  { name: "La Vitrola", handle: "lavitrolacartagena", category: "restaurant", tier: "luxury", priority: 3, keywords: ["live", "music", "jazz", "evento"] },
] as const;

// Reddit targets for intent signal monitoring
export const REDDIT_TARGETS = [
  "travel", "solotravel", "TravelHacks", "churning", "awardtravel",
  "luxury", "Shoestring", "Colombia", "expats", "digitalnomad",
  "honeymoonplanning", "weddingplanning",
] as const;

// Intent patterns for classification
export const INTENT_PATTERNS = {
  high_intent: [
    "planning trip to cartagena", "visiting cartagena", "booked flight to cartagena",
    "booked hotel in cartagena", "honeymoon in cartagena", "bachelor party cartagena",
    "cartagena itinerary", "heading to cartagena",
  ],
  medium_intent: [
    "thinking about cartagena", "cartagena or", "should i go to cartagena",
    "cartagena worth visiting", "considering cartagena",
  ],
  recommendation_seeking: [
    "recommendations for cartagena", "best restaurants cartagena", "best hotels cartagena",
    "where to stay cartagena", "cartagena tips", "cartagena must see", "hidden gems cartagena",
  ],
  luxury_signals: [
    "luxury hotel cartagena", "high end cartagena", "private tour cartagena",
    "private chef cartagena", "vip cartagena", "splurge cartagena",
  ],
} as const;

// Content types for authority content
export const CONTENT_TYPES = [
  { value: "listicle", label: "Listicle (Top 10, Best Of)" },
  { value: "guide", label: "Complete Guide" },
  { value: "comparison", label: "Comparison" },
  { value: "insider_tip", label: "Insider Tips" },
  { value: "itinerary", label: "Itinerary" },
  { value: "review", label: "Review Roundup" },
] as const;
