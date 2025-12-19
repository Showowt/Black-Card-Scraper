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
  role: text("role").default("team_member"),
  authProvider: text("auth_provider").default("replit"),
  passwordHash: text("password_hash"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teamInvitations = pgTable("team_invitations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 32 }).unique().notNull(),
  email: text("email"),
  role: text("role").default("team_member"),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  usedBy: varchar("used_by", { length: 255 }).references(() => users.id),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token", { length: 64 }).unique().notNull(),
  email: text("email").notNull(),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLog = pgTable("activity_log", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: varchar("entity_id", { length: 255 }),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
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
  followUpDate: timestamp("follow_up_date"),
  lastDisposition: text("last_disposition"),
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
  whatsappScript: text("whatsapp_script"),
  whatsappLink: text("whatsapp_link"),
  instagramDm: text("instagram_dm"),
  followUpDay3: text("follow_up_day_3"),
  followUpDay7: text("follow_up_day_7"),
  followUpDay14: text("follow_up_day_14"),
  psychologyFramework: text("psychology_framework"),
  channel: text("channel").default("whatsapp"),
  status: text("status").default("draft"),
  sentAt: timestamp("sent_at"),
  respondedAt: timestamp("responded_at"),
  convertedAt: timestamp("converted_at"),
  notes: text("notes"),
  detectedProblem: text("detected_problem"),
  customOffer: text("custom_offer"),
  monthlyLoss: integer("monthly_loss"),
  lossExplanation: text("loss_explanation"),
  identityStatement: text("identity_statement"),
  fearTrigger: text("fear_trigger"),
  desireTrigger: text("desire_trigger"),
  urgencyAngle: text("urgency_angle"),
  detectedSignals: text("detected_signals").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).omit({
  id: true,
  usedAt: true,
  usedBy: true,
  createdAt: true,
});

export const insertMagicLinkTokenSchema = createInsertSchema(magicLinkTokens).omit({
  id: true,
  usedAt: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
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
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertMagicLinkToken = z.infer<typeof insertMagicLinkTokenSchema>;
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;
export type InsertOutreachCampaign = z.infer<typeof insertOutreachCampaignSchema>;
export type OutreachCampaign = typeof outreachCampaigns.$inferSelect;

export const USER_ROLES = ["admin", "team_member", "rep"] as const;
export type UserRole = typeof USER_ROLES[number];

// Role permissions matrix
export const ROLE_PERMISSIONS = {
  admin: {
    canScan: true,
    canDelete: true,
    canViewUsers: true,
    canManageUsers: true,
    canExport: true,
    canViewCostControls: true,
    canManageSettings: true,
  },
  team_member: {
    canScan: false,
    canDelete: false,
    canViewUsers: true,
    canManageUsers: false,
    canExport: true,
    canViewCostControls: false,
    canManageSettings: false,
  },
  rep: {
    canScan: false,
    canDelete: false,
    canViewUsers: false,
    canManageUsers: false,
    canExport: false,
    canViewCostControls: false,
    canManageSettings: false,
  },
} as const;

export const AUTH_PROVIDERS = ["replit", "email", "magic_link"] as const;
export type AuthProvider = typeof AUTH_PROVIDERS[number];

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
  { value: "concierge", label: "Concierge Services", googleType: "travel_agency" },
  { value: "villa_rental", label: "Villa Rentals", googleType: "lodging" },
  { value: "transportation", label: "Luxury Transportation", googleType: "car_rental" },
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
  concierge: [
    "concierge service",
    "luxury concierge",
    "villa concierge",
    "travel concierge",
    "personal assistant",
    "fixer service",
    "servicio concierge",
    "asistente personal",
    "lifestyle management",
  ],
  villa_rental: [
    "luxury villa rental",
    "vacation villa",
    "villa rental",
    "casa de lujo",
    "alquiler de villa",
    "beachfront villa",
    "private villa",
  ],
  transportation: [
    "private driver",
    "airport transfer",
    "luxury car service",
    "chauffeur service",
    "vip transport",
    "transporte privado",
    "servicio de chofer",
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
  concierge: {
    painPoints: [
      "Managing 10+ villa guests simultaneously",
      "Coordinating 15+ vendors for events",
      "3am WhatsApp from guests who need something now",
      "No client preference history across visits",
      "Vendor contact chaos - lost numbers and outdated prices",
      "Event coordination complexity with multiple moving parts",
      "Can't clone yourself - every client thinks they're your only client",
    ],
    automations: [
      "Client preference database (remember everything across visits)",
      "Vendor coordination automation with instant availability checks",
      "Guest communication templates for common requests",
      "Event timeline management with automated reminders",
      "Multi-property dashboard for villa management",
      "After-hours auto-response with smart escalation",
      "Vendor CRM with pricing and availability tracking",
    ],
    hookAngles: ["client preference tracking", "vendor coordination", "scaling operations", "after-hours coverage"],
  },
  villa_rental: {
    painPoints: [
      "Guest inquiries across Airbnb, VRBO, direct messages",
      "Check-in/out coordination with housekeeping",
      "Guest issues during stays (AC, water, wifi)",
      "No guest preference tracking for repeat visitors",
      "Revenue management across platforms",
      "Cleaning and maintenance scheduling chaos",
    ],
    automations: [
      "Multi-channel inquiry bot with instant availability",
      "Automated check-in instructions with smart timing",
      "Guest issue routing to right service providers",
      "Preference CRM for VIP repeat guests",
      "Cross-platform booking sync",
      "Housekeeping coordination automation",
    ],
    hookAngles: ["guest experience", "multi-platform management", "cleaning coordination", "repeat guest loyalty"],
  },
  transportation: {
    painPoints: [
      "Last-minute booking requests with no availability",
      "Driver scheduling and availability tracking",
      "Payment collection and tipping confusion",
      "Route changes and delays communication",
      "Fleet utilization and idle time",
      "Quality control across multiple drivers",
    ],
    automations: [
      "Instant booking bot with real-time availability",
      "Driver assignment automation",
      "Automated payment and receipt system",
      "Real-time trip updates to clients",
      "Fleet scheduling optimization",
      "Post-ride review collection",
    ],
    hookAngles: ["booking automation", "driver coordination", "client communication", "fleet management"],
  },
};

export const CATEGORY_SOLUTIONS: Record<string, {
  core_solutions: string[];
  quick_wins: string[];
  advanced_features: string[];
  metrics_improved: string[];
}> = {
  restaurant: {
    core_solutions: [
      "AI WhatsApp bot for reservations (24/7, multilingual)",
      "QR-code ordering system (reduce wait staff dependency)",
      "Automated review request & response system",
      "Dynamic pricing for off-peak hours",
      "No-show prediction + deposit automation",
      "Table turnover optimization",
      "Customer preference memory (allergies, favorites, occasions)",
    ],
    quick_wins: [
      "WhatsApp auto-reply in 24 hours",
      "Review response templates live in 48 hours",
      "QR menu setup in 1 week",
    ],
    advanced_features: [
      "Predictive inventory based on reservations",
      "Staff scheduling optimization",
      "Loyalty program with AI recommendations",
      "Competitor pricing monitoring",
    ],
    metrics_improved: [
      "No-show rate: -40%",
      "Review response time: -90%",
      "Off-peak revenue: +25%",
      "Repeat customer rate: +35%",
    ],
  },
  hotel: {
    core_solutions: [
      "Direct booking engine (bypass OTA commissions)",
      "24/7 AI concierge (multilingual guest support)",
      "Pre-arrival upsell automation (transfers, tours, dining)",
      "Review velocity system (automated review requests)",
      "Dynamic pricing engine",
      "Guest preference database",
      "Housekeeping coordination automation",
    ],
    quick_wins: [
      "OTA bypass booking link in 48 hours",
      "Pre-arrival email sequence in 1 week",
      "WhatsApp concierge live in 72 hours",
    ],
    advanced_features: [
      "Revenue management system",
      "Competitor rate monitoring",
      "Guest sentiment analysis",
      "Predictive maintenance alerts",
    ],
    metrics_improved: [
      "Direct bookings: +40%",
      "OTA commission savings: $3-8k/month",
      "Upsell revenue: +30%",
      "Guest satisfaction: +25%",
    ],
  },
  concierge: {
    core_solutions: [
      "Client preference database (remembers everything)",
      "Vendor booking automation (restaurants, boats, chefs)",
      "CRM for follow-ups and client lifecycle",
      "AI itinerary planning and suggestions",
      "Multi-client coordination dashboard",
      "Vendor performance tracking",
      "Automated billing and invoicing",
    ],
    quick_wins: [
      "Client database import in 48 hours",
      "Vendor contact system in 1 week",
      "Auto-response for after-hours in 24 hours",
    ],
    advanced_features: [
      "Predictive client needs (anniversary reminders, preferences)",
      "Dynamic pricing for services",
      "White-label booking platform",
      "Commission tracking automation",
    ],
    metrics_improved: [
      "Client capacity: +100%",
      "Repeat client rate: +40%",
      "Vendor coordination time: -60%",
      "After-hours response: 24/7",
    ],
  },
  tour_operator: {
    core_solutions: [
      "AI booking assistant (handles inquiries while on tours)",
      "Automated deposit collection",
      "Weather-based rescheduling automation",
      "Guest communication sequences (confirmations, reminders, reviews)",
      "Multi-tour calendar management",
      "Guide assignment optimization",
      "Review automation system",
    ],
    quick_wins: [
      "Booking bot live in 48 hours",
      "Deposit system in 1 week",
      "Reminder automation in 24 hours",
    ],
    advanced_features: [
      "Dynamic pricing based on demand",
      "Group coordination tools",
      "Partner commission tracking",
      "Seasonal forecasting",
    ],
    metrics_improved: [
      "Booking capture: +50%",
      "No-shows: -60%",
      "Review velocity: +200%",
      "Owner time saved: 15+ hrs/week",
    ],
  },
  boat_charter: {
    core_solutions: [
      "AI booking system (quotes + availability instantly)",
      "Captain/crew scheduling automation",
      "Weather monitoring + auto-rescheduling",
      "Guest preference tracking (music, drinks, routes)",
      "Maintenance scheduling",
      "Multi-vessel fleet management",
      "Deposit and payment automation",
    ],
    quick_wins: [
      "Instant quote bot in 48 hours",
      "Calendar sync in 24 hours",
      "Weather alerts in 1 week",
    ],
    advanced_features: [
      "Dynamic pricing by demand/season",
      "Fuel cost optimization",
      "Partner commission tracking",
      "Fleet utilization analytics",
    ],
    metrics_improved: [
      "Inquiry response: <5 minutes (vs 4+ hours)",
      "Booking conversion: +40%",
      "Fleet utilization: +30%",
      "No-shows: -50%",
    ],
  },
  villa_rental: {
    core_solutions: [
      "Direct booking engine (bypass Airbnb/VRBO fees)",
      "Calendar + payment integration",
      "Guest messaging automation (check-in, local guides, checkout)",
      "Turnover coordination system",
      "Upsell concierge services (chef, boat, tours)",
      "Revenue management (dynamic pricing)",
      "Maintenance request automation",
    ],
    quick_wins: [
      "Direct booking page in 1 week",
      "Check-in automation in 48 hours",
      "Turnover alerts in 24 hours",
    ],
    advanced_features: [
      "Multi-property dashboard",
      "Owner reporting automation",
      "Competitor rate monitoring",
      "Guest screening automation",
    ],
    metrics_improved: [
      "Direct bookings: +50%",
      "Platform fees saved: $500-2k/month/property",
      "Guest communication time: -80%",
      "Upsell revenue: +40%",
    ],
  },
  spa: {
    core_solutions: [
      "Online booking with automated reminders",
      "Staff scheduling optimization",
      "POS integration for seamless checkout",
      "Loyalty and membership management",
      "Upsell package recommendations",
      "Review automation",
      "Referral program automation",
    ],
    quick_wins: [
      "Online booking in 48 hours",
      "Reminder system in 24 hours",
      "Review requests in 1 week",
    ],
    advanced_features: [
      "Treatment recommendation AI",
      "Inventory management",
      "Staff performance analytics",
      "Seasonal promotion automation",
    ],
    metrics_improved: [
      "No-shows: -50%",
      "Rebooking rate: +40%",
      "Average ticket: +25% (upsells)",
      "Review velocity: +300%",
    ],
  },
  club: {
    core_solutions: [
      "Guest list management (digital, real-time)",
      "Table booking with dynamic minimums",
      "VIP loyalty program",
      "Event promotion and ticketing",
      "Bottle service automation",
      "Promoter commission tracking",
      "Social media integration",
    ],
    quick_wins: [
      "Digital guest list in 24 hours",
      "Table booking bot in 48 hours",
      "Event page automation in 1 week",
    ],
    advanced_features: [
      "Spend-based VIP tiers",
      "Predictive crowd management",
      "Dynamic pricing for tables",
      "Influencer tracking",
    ],
    metrics_improved: [
      "Table revenue: +35%",
      "No-shows: -40%",
      "VIP retention: +50%",
      "Event attendance: +30%",
    ],
  },
  transportation: {
    core_solutions: [
      "AI booking and dispatch bot",
      "Dynamic pricing engine",
      "Route optimization",
      "Fleet management dashboard",
      "24/7 multilingual reservation assistant",
      "Driver assignment automation",
      "Real-time tracking for clients",
    ],
    quick_wins: [
      "Booking bot in 48 hours",
      "Dispatch automation in 1 week",
      "Client tracking in 72 hours",
    ],
    advanced_features: [
      "Predictive demand modeling",
      "Fuel efficiency optimization",
      "Partner/affiliate tracking",
      "Airport flight monitoring",
    ],
    metrics_improved: [
      "Booking response: <2 minutes",
      "Fleet utilization: +40%",
      "Fuel costs: -15%",
      "Customer satisfaction: +35%",
    ],
  },
  photographer: {
    core_solutions: [
      "Booking and inquiry automation",
      "Contract and deposit collection",
      "Client communication sequences",
      "Gallery delivery automation",
      "Review request system",
      "Referral tracking",
      "Calendar management",
    ],
    quick_wins: [
      "Inquiry auto-response in 24 hours",
      "Contract automation in 1 week",
      "Review requests in 48 hours",
    ],
    advanced_features: [
      "AI-powered photo culling suggestions",
      "Client portal for selections",
      "Upsell package recommendations",
      "Seasonal pricing automation",
    ],
    metrics_improved: [
      "Inquiry response: <5 minutes",
      "Booking conversion: +30%",
      "Admin time: -50%",
      "Referral rate: +40%",
    ],
  },
  videographer: {
    core_solutions: [
      "Project inquiry automation",
      "Quote and contract system",
      "Milestone payment tracking",
      "Client communication portal",
      "Delivery and feedback automation",
      "Testimonial collection",
      "Calendar management",
    ],
    quick_wins: [
      "Inquiry bot in 48 hours",
      "Quote templates in 24 hours",
      "Milestone tracking in 1 week",
    ],
    advanced_features: [
      "Project timeline automation",
      "Revision request management",
      "Upsell service recommendations",
      "Multi-project dashboard",
    ],
    metrics_improved: [
      "Inquiry response: <10 minutes",
      "Project turnaround: -20%",
      "Client satisfaction: +35%",
      "Referral rate: +45%",
    ],
  },
  dj: {
    core_solutions: [
      "Booking and inquiry automation",
      "Contract and deposit collection",
      "Song request management",
      "Equipment logistics tracking",
      "Review and referral system",
      "Calendar management",
      "Event prep checklists",
    ],
    quick_wins: [
      "Booking bot in 24 hours",
      "Contract automation in 48 hours",
      "Song request system in 1 week",
    ],
    advanced_features: [
      "Dynamic pricing by date/venue",
      "Equipment inventory management",
      "Multi-event coordination",
      "Social proof automation",
    ],
    metrics_improved: [
      "Inquiry response: <5 minutes",
      "Booking conversion: +35%",
      "Admin time: -45%",
      "Repeat bookings: +40%",
    ],
  },
  chef: {
    core_solutions: [
      "Booking and inquiry automation",
      "Menu planning tools",
      "Client preference database",
      "Ingredient sourcing automation",
      "Contract and payment collection",
      "Review and referral system",
      "Calendar management",
    ],
    quick_wins: [
      "Inquiry bot in 24 hours",
      "Menu templates in 48 hours",
      "Booking calendar in 1 week",
    ],
    advanced_features: [
      "AI menu suggestions based on preferences",
      "Cost optimization",
      "Dietary restriction management",
      "Multi-event coordination",
    ],
    metrics_improved: [
      "Booking response: <10 minutes",
      "Conversion rate: +35%",
      "Repeat clients: +50%",
      "Admin time: -40%",
    ],
  },
  event_planner: {
    core_solutions: [
      "Client inquiry automation",
      "Vendor coordination system",
      "Timeline and task management",
      "Budget tracking automation",
      "Client communication portal",
      "Contract and payment automation",
      "Post-event review system",
    ],
    quick_wins: [
      "Inquiry bot in 48 hours",
      "Vendor database in 1 week",
      "Timeline templates in 72 hours",
    ],
    advanced_features: [
      "AI vendor recommendations",
      "Budget optimization suggestions",
      "Guest management integration",
      "Multi-event dashboard",
    ],
    metrics_improved: [
      "Vendor coordination: -60% time",
      "Client satisfaction: +40%",
      "Event capacity: +50%",
      "Referral rate: +35%",
    ],
  },
  real_estate: {
    core_solutions: [
      "Lead capture and qualification bots",
      "Appointment scheduling automation",
      "Property listing automation",
      "Targeted marketing (WhatsApp, email)",
      "CRM with follow-up sequences",
      "Virtual tour integration",
      "Document automation",
    ],
    quick_wins: [
      "Lead bot in 48 hours",
      "Scheduling automation in 24 hours",
      "WhatsApp campaigns in 1 week",
    ],
    advanced_features: [
      "AI property matching",
      "Market analysis automation",
      "Investor portal",
      "Commission tracking",
    ],
    metrics_improved: [
      "Lead response: <3 minutes",
      "Qualification rate: +50%",
      "Showing no-shows: -40%",
      "Close rate: +25%",
    ],
  },
};

export const COLOMBIA_STATS = {
  tourism: {
    visitors_2024: 6200000,
    target_2026: 7500000,
    growth_rate: "21%",
    cartagena_occupancy: "75%",
    top_cities: ["Bogota", "Cartagena", "Medellin", "Santa Marta"],
  },
  digital_behavior: {
    whatsapp_purchase_rate: 0.66,
    bogota_online_shopping: 0.73,
    abandon_without_fast_response: 0.50,
    no_web_presence_rate: 0.30,
  },
  ai_adoption: {
    fintech_ai_usage: 0.66,
    ai_cost_reduction: 0.44,
    ai_speed_improvement: 0.56,
    latam_ai_adoption_rank: 1,
  },
  conpes_4144: {
    approved_date: "February 14, 2025",
    investment_cop: 479273000000,
    investment_usd: 110000000,
    target_year: 2030,
    strategic_axes: 6,
    concrete_actions: 106,
  },
} as const;

export const VERTICAL_TICKET_RANGES: Record<string, {
  min_ticket: number;
  max_ticket: number;
  avg_ticket: number;
  monthly_loss_range: [number, number];
  implementation_days: number;
}> = {
  restaurant: { min_ticket: 500, max_ticket: 3000, avg_ticket: 1500, monthly_loss_range: [2000, 15000], implementation_days: 7 },
  hotel: { min_ticket: 1500, max_ticket: 5000, avg_ticket: 3000, monthly_loss_range: [5000, 30000], implementation_days: 14 },
  tour_operator: { min_ticket: 1000, max_ticket: 3000, avg_ticket: 1800, monthly_loss_range: [3000, 12000], implementation_days: 10 },
  club: { min_ticket: 1000, max_ticket: 4000, avg_ticket: 2000, monthly_loss_range: [4000, 20000], implementation_days: 10 },
  boat_charter: { min_ticket: 1500, max_ticket: 10000, avg_ticket: 4000, monthly_loss_range: [8000, 40000], implementation_days: 14 },
  spa: { min_ticket: 500, max_ticket: 2000, avg_ticket: 1000, monthly_loss_range: [1500, 8000], implementation_days: 7 },
  concierge: { min_ticket: 2000, max_ticket: 8000, avg_ticket: 4000, monthly_loss_range: [10000, 50000], implementation_days: 14 },
  villa_rental: { min_ticket: 2000, max_ticket: 8000, avg_ticket: 4000, monthly_loss_range: [8000, 35000], implementation_days: 14 },
  photographer: { min_ticket: 800, max_ticket: 2500, avg_ticket: 1500, monthly_loss_range: [2000, 8000], implementation_days: 7 },
  videographer: { min_ticket: 1000, max_ticket: 3000, avg_ticket: 1800, monthly_loss_range: [2500, 10000], implementation_days: 10 },
  dj: { min_ticket: 500, max_ticket: 2000, avg_ticket: 1000, monthly_loss_range: [1500, 6000], implementation_days: 5 },
  chef: { min_ticket: 800, max_ticket: 3000, avg_ticket: 1500, monthly_loss_range: [2000, 10000], implementation_days: 7 },
  event_planner: { min_ticket: 1500, max_ticket: 5000, avg_ticket: 2500, monthly_loss_range: [5000, 20000], implementation_days: 14 },
  transportation: { min_ticket: 500, max_ticket: 2000, avg_ticket: 1000, monthly_loss_range: [1500, 8000], implementation_days: 7 },
  real_estate: { min_ticket: 1000, max_ticket: 5000, avg_ticket: 2500, monthly_loss_range: [5000, 25000], implementation_days: 10 },
};

export const COLOMBIA_PSYCHOLOGY_TRIGGERS = {
  freedom_triggers: [
    "No abriste este negocio para contestar WhatsApps a las 10pm. — Phil McGill",
    "You didn't open this place to answer WhatsApps at 10pm. — Phil McGill",
    "¿Cuantas noches has perdido respondiendo mensajes que un bot podria manejar? — Phil",
    "Tu tiempo vale mas que responder '¿A que hora abren?' 50 veces al dia. — Phil McGill",
  ],
  urgency_triggers: [
    "Cada dia sin automatizacion es un dia de dinero perdido. — Phil McGill",
    "Every day without automation is a day of money lost. — Phil McGill",
    "Mientras lees esto, 3 clientes potenciales se fueron con tu competencia porque no respondiste a tiempo. — Phil",
    "El 50% de los colombianos abandonan si no reciben respuesta rapida. ¿Cuantos perdiste hoy? — Phil McGill",
  ],
  tourist_capture_triggers: [
    "La mayoria de turistas nunca regresan. ¿Los estas capturando la primera vez? — Phil McGill",
    "Most tourists never come back. Are you capturing them the first time? — Phil McGill",
    "6.2 millones de turistas visitaron Colombia el ano pasado. ¿Cuantos se fueron sin conocerte? — Phil",
    "Un turista que no reserva en 24 horas, reserva con otro. ¿Tu sistema responde en 24 segundos? — Phil McGill",
  ],
  competition_triggers: [
    "Tu competencia ya tiene esto. La pregunta es: ¿cuanto mas vas a esperar? — Phil McGill",
    "El 66% de los colombianos compran despues de chatear por WhatsApp. ¿Estas ahi cuando escriben? — Phil",
    "Los negocios con automatizacion cierran 3x mas ventas. Los demas se preguntan por que. — Phil McGill",
  ],
  vision_triggers: [
    "Imagina vender todas tus mesas cada noche — automaticamente. — Phil McGill",
    "Imagine selling out your tables every night — automatically. — Phil McGill",
    "¿Que diria tu huesped si le ofrecieras un concierge AI 24/7? — Phil",
    "What would your guest say if you offered 24/7 concierge AI? — Phil McGill",
    "En 6 meses, o tienes automatizacion o estas perdiendo contra los que si la tienen. — Phil",
  ],
  government_leverage_triggers: [
    "Colombia acaba de aprobar $110M USD para modernizacion AI (CONPES 4144). Los negocios que se muevan primero tendran ventaja de 2 anos. — Phil McGill",
    "El gobierno esta empujando AI en turismo. ¿Vas a esperar a que tu competencia reciba los incentivos primero? — Phil",
    "CONPES 4144 significa que la automatizacion no es opcional — es el nuevo estandar. — Phil McGill",
  ],
} as const;

export const CONPES_POSITIONING = {
  credibility_statements: [
    "Nuestras soluciones estan alineadas con la Politica Nacional de AI de Colombia (CONPES 4144) — cumplimiento total, escalable, a prueba de futuro. — Phil McGill",
    "Our solutions align with Colombia's National AI Policy (CONPES 4144); compliant, scalable, future-proof. — Phil McGill",
  ],
  urgency_statements: [
    "Colombia acaba de aprobar su Politica Nacional de AI y destino $110M USD para llevar automatizacion a negocios en todo el pais. Si no actuas ahora, tu competidor lo hara — y tendra un ano de ventaja. — Phil McGill",
    "Colombia just approved its National AI Policy and allocated $110M to bring automation to businesses nationwide. If you don't act now, your competitor will—and they'll have a year head-start. — Phil McGill",
  ],
  six_pillars: [
    "Etica y Gobernanza — regulacion, transparencia, estandares eticos",
    "Datos e Infraestructura — construccion de infraestructura de datos",
    "I+D+i — financiamiento para investigacion e innovacion AI",
    "Talento Digital — capacitacion y educacion en AI",
    "Mitigacion de Riesgos — marcos de uso responsable",
    "Adopcion y Difusion — implementacion en sector publico y privado",
  ],
  incentive_hook: [
    "Algunos negocios califican para apoyo gubernamental o co-financiamiento al integrar AI. Yo me encargo de la aplicacion y la implementacion. — Phil McGill",
    "Some businesses qualify for government-backed support when integrating AI. I handle the application AND implementation. — Phil McGill",
  ],
} as const;

export const DECISION_MAKER_TYPES = [
  "Visionary",
  "Operator", 
  "Skeptic",
  "Delegator",
] as const;

export const BUYING_STYLES = [
  "Impulsive",
  "Analytical",
  "Consensus",
  "Value-driven",
] as const;

export interface CategorySolution {
  core_solutions: string[];
  quick_wins: string[];
  advanced_features: string[];
  metrics_improved: string[];
}

export interface VerticalTicketRange {
  min_ticket: number;
  max_ticket: number;
  avg_ticket: number;
  monthly_loss_range: [number, number];
  implementation_days: number;
}

export interface DecisionMakerProfile {
  estimated_age_range: string;
  likely_role: string;
  personality_type: typeof DECISION_MAKER_TYPES[number];
  buying_style: typeof BUYING_STYLES[number];
  risk_tolerance: "High" | "Medium" | "Low" | "Medium-High";
  primary_motivation: "Growth" | "Freedom" | "Status" | "Security";
  fear_pattern: string;
  status_trigger: string;
  preferred_language_style: "Direct" | "Consultative" | "Data-driven" | "Story-driven";
  response_speed_preference: "Immediate" | "Same-day" | "Takes-time";
  opening_approach: string;
  proof_type_needed: string;
  objection_likely: string;
  closing_style: string;
}

export interface TechStackGaps {
  has_booking_system: boolean;
  has_whatsapp_business: boolean;
  has_online_payment: boolean;
  has_review_management: boolean;
  is_mobile_optimized: boolean;
  website_exists: boolean;
  gaps_detected: string[];
  gap_count: number;
  automation_readiness_score: number;
}

export interface ColombiaMarketIntel {
  category: string;
  city: string;
  min_ticket: number;
  max_ticket: number;
  recommended_ticket: number;
  missing_systems: string[];
  monthly_loss_estimate: number;
  annual_loss_estimate: number;
  tech_gaps: TechStackGaps | null;
  primary_triggers: string[];
  conpes_positioning: string[];
  local_competition_level: "low" | "medium" | "high";
  competitor_warnings: string[];
  implementation_days: number;
  roi_timeframe_days: number;
}

export interface BlackCardIntelligence {
  category_solutions: Record<string, CategorySolution>;
  colombia_stats: typeof COLOMBIA_STATS;
  vertical_ticket_ranges: Record<string, VerticalTicketRange>;
  colombia_psychology_triggers: typeof COLOMBIA_PSYCHOLOGY_TRIGGERS;
  conpes_positioning: typeof CONPES_POSITIONING;
  decision_maker_types: readonly string[];
  buying_styles: readonly string[];
  decision_maker_profile: DecisionMakerProfile | null;
  colombia_market_intel: ColombiaMarketIntel | null;
}

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

export const SIGNAL_OFFER_MATRIX: Record<string, {
  signals: { condition: string; priority: number }[];
  offer: string;
  monthlyLoss: { min: number; max: number; explanation: string };
}[]> = {
  restaurant: [
    {
      signals: [{ condition: "no_website", priority: 1 }, { condition: "low_reviews", priority: 2 }],
      offer: "AI Booking Bot + Review Management System",
      monthlyLoss: { min: 2000, max: 5000, explanation: "Lost reservations + missed review responses" },
    },
    {
      signals: [{ condition: "no_instagram", priority: 1 }],
      offer: "WhatsApp Booking System + Social Presence Setup",
      monthlyLoss: { min: 1500, max: 3000, explanation: "No social discovery = invisible to tourists" },
    },
    {
      signals: [{ condition: "slow_response", priority: 1 }],
      offer: "24/7 AI Receptionist for Reservations + FAQ",
      monthlyLoss: { min: 3000, max: 6000, explanation: "Delayed responses lose 60% of booking inquiries" },
    },
  ],
  hotel: [
    {
      signals: [{ condition: "ota_dependent", priority: 1 }],
      offer: "Direct Booking Chatbot to Cut OTA Commissions",
      monthlyLoss: { min: 5000, max: 15000, explanation: "15-25% OTA fees on every booking" },
    },
    {
      signals: [{ condition: "no_whatsapp", priority: 1 }],
      offer: "WhatsApp Concierge for 24/7 Guest Requests",
      monthlyLoss: { min: 2000, max: 4000, explanation: "Missed upsell opportunities + poor reviews" },
    },
    {
      signals: [{ condition: "low_rating", priority: 1 }],
      offer: "Automated Review Response + Guest Recovery System",
      monthlyLoss: { min: 3000, max: 8000, explanation: "Each 0.1 rating drop = 5-9% revenue loss" },
    },
  ],
  concierge: [
    {
      signals: [{ condition: "no_crm", priority: 1 }],
      offer: "Client Preference Database + Vendor Coordination System",
      monthlyLoss: { min: 4000, max: 10000, explanation: "Can't scale beyond current capacity" },
    },
    {
      signals: [{ condition: "manual_vendor", priority: 1 }],
      offer: "Vendor CRM with Instant Availability Checks",
      monthlyLoss: { min: 2000, max: 5000, explanation: "Hours wasted on vendor coordination" },
    },
    {
      signals: [{ condition: "no_after_hours", priority: 1 }],
      offer: "After-Hours Auto-Response with Smart Escalation",
      monthlyLoss: { min: 3000, max: 7000, explanation: "3am requests going unanswered" },
    },
  ],
  villa_rental: [
    {
      signals: [{ condition: "multi_platform", priority: 1 }],
      offer: "Multi-Channel Inquiry Bot + Cross-Platform Sync",
      monthlyLoss: { min: 3000, max: 8000, explanation: "Double bookings + slow response across platforms" },
    },
    {
      signals: [{ condition: "no_guest_tracking", priority: 1 }],
      offer: "VIP Guest Preference CRM for Repeat Visitors",
      monthlyLoss: { min: 2000, max: 5000, explanation: "No loyalty = guests go to competitors" },
    },
  ],
  transportation: [
    {
      signals: [{ condition: "manual_dispatch", priority: 1 }],
      offer: "Real-Time Booking Bot + Driver Assignment Automation",
      monthlyLoss: { min: 2000, max: 6000, explanation: "Idle fleet time + missed bookings" },
    },
    {
      signals: [{ condition: "no_tracking", priority: 1 }],
      offer: "Client Trip Updates + Automated Payment System",
      monthlyLoss: { min: 1500, max: 3000, explanation: "Poor client experience = no referrals" },
    },
  ],
  tour_operator: [
    {
      signals: [{ condition: "manual_booking", priority: 1 }],
      offer: "Instant Booking Bot + Automated Itinerary Delivery",
      monthlyLoss: { min: 2500, max: 6000, explanation: "Lost bookings during off-hours" },
    },
    {
      signals: [{ condition: "no_payment_system", priority: 1 }],
      offer: "Payment Integration with Reminders + No-Show Protection",
      monthlyLoss: { min: 2000, max: 4000, explanation: "No-shows costing 15-20% of bookings" },
    },
  ],
  spa: [
    {
      signals: [{ condition: "no_deposit", priority: 1 }],
      offer: "Booking System with Deposits + Automated Reminders",
      monthlyLoss: { min: 1500, max: 4000, explanation: "No-shows destroying appointment slots" },
    },
    {
      signals: [{ condition: "no_rebooking", priority: 1 }],
      offer: "Automated Rebooking Sequences + Review Collection",
      monthlyLoss: { min: 1000, max: 3000, explanation: "Missing repeat business opportunities" },
    },
  ],
  club: [
    {
      signals: [{ condition: "manual_reservations", priority: 1 }],
      offer: "Table Reservation Bot with VIP Deposits",
      monthlyLoss: { min: 3000, max: 10000, explanation: "Lost table revenue + VIP friction" },
    },
    {
      signals: [{ condition: "no_vip_crm", priority: 1 }],
      offer: "VIP Guest CRM with Automated Outreach",
      monthlyLoss: { min: 2000, max: 5000, explanation: "VIPs going to competitors" },
    },
  ],
  boat_charter: [
    {
      signals: [{ condition: "inquiry_overload", priority: 1 }],
      offer: "Instant Quote Bot with Availability Checker",
      monthlyLoss: { min: 3000, max: 8000, explanation: "Slow quotes = lost charters" },
    },
    {
      signals: [{ condition: "no_automation", priority: 1 }],
      offer: "Automated Booking + Weather Alert System",
      monthlyLoss: { min: 2000, max: 5000, explanation: "Rescheduling chaos + deposit issues" },
    },
  ],
};

export const PSYCHOLOGY_HOOKS: Record<string, {
  identity: string;
  fear: string;
  desire: string;
  urgency: string;
}> = {
  restaurant: {
    identity: "You're the restaurateur who delivers unforgettable dining experiences",
    fear: "Every unanswered reservation inquiry is a table going to your competitor tonight",
    desire: "Imagine every guest getting instant confirmation and showing up on time",
    urgency: "Peak season starts in 2 weeks - will you be ready?",
  },
  hotel: {
    identity: "You're the hotelier who creates legendary guest experiences",
    fear: "OTAs are taking 25% of every booking - that's YOUR profit walking out the door",
    desire: "Direct bookings flooding in while guests rave about your instant service",
    urgency: "High season pricing changes in 30 days - lock in direct bookings now",
  },
  concierge: {
    identity: "You're the fixer who makes impossible things happen",
    fear: "That 3am WhatsApp from a VIP guest - and you're asleep",
    desire: "Scale to 50 clients without hiring. Every guest thinks they're your only guest",
    urgency: "Wedding season is 6 weeks away - can you really handle 10 more events?",
  },
  villa_rental: {
    identity: "You're the villa host who creates vacation perfection",
    fear: "A double-booking disaster waiting to happen across Airbnb, VRBO, and direct",
    desire: "Premium guests finding you directly, paying full price, coming back yearly",
    urgency: "Your competitors just upgraded their booking systems",
  },
  transportation: {
    identity: "You're the transport pro who delivers flawless VIP experiences",
    fear: "A driver no-show with a client's airport pickup - reputation destroyed",
    desire: "Fleet fully utilized, clients tracked, tips automated, reviews flowing",
    urgency: "Conference season brings 3x booking volume - can your current system handle it?",
  },
  tour_operator: {
    identity: "You're the guide who creates transformative experiences",
    fear: "Tourists booking with competitors because you took 2 hours to respond",
    desire: "Instant booking confirmation while you're guiding - no missed opportunities",
    urgency: "Cruise ship season starts next month with 10,000 tourists arriving",
  },
  spa: {
    identity: "You're the wellness expert who transforms stressed guests into regulars",
    fear: "Empty appointment slots because no-shows didn't leave deposits",
    desire: "Fully booked calendar with clients who show up, tip well, and rebook",
    urgency: "Resort partnerships want committed vendors - show you're ready",
  },
  club: {
    identity: "You're the nightlife king who creates the experiences everyone talks about",
    fear: "VIPs going to the competition because your table booking is too slow",
    desire: "Bottle service flowing, VIP database growing, repeat guests automatic",
    urgency: "NYE is 8 weeks away - is your reservation system ready for the rush?",
  },
  boat_charter: {
    identity: "You're the captain who creates unforgettable ocean memories",
    fear: "Perfect weather day with the boat empty because quotes took too long",
    desire: "Every inquiry gets instant pricing, deposits flow, calendar fills itself",
    urgency: "Carnaval week demand will 5x - don't leave money on the table",
  },
};

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

// Outreach channels
export const OUTREACH_CHANNELS = [
  { value: "whatsapp", label: "WhatsApp", icon: "MessageCircle" },
  { value: "instagram", label: "Instagram DM", icon: "Instagram" },
  { value: "email", label: "Email", icon: "Mail" },
] as const;

// Psychology frameworks for sales messaging
export const PSYCHOLOGY_FRAMEWORKS = {
  loss_aversion: {
    name: "Loss Aversion",
    description: "People fear losing more than they desire gaining",
    triggers: ["mientras competidores", "perdiendo", "sin automatizar", "quedándose atrás"],
    spanish_templates: [
      "Mientras {competitor_hint} automatiza, ¿cuántos clientes potenciales se pierden en tu DM sin respuesta?",
      "Vi que tus competidores ya usan asistentes de IA. ¿Te preocupa quedarte atrás?",
      "Cada mensaje sin respuesta en las noches es un cliente que eligió otro lugar."
    ]
  },
  social_proof: {
    name: "Social Proof",
    description: "People follow the actions of others",
    triggers: ["otros restaurantes", "competidores usan", "en Cartagena ya"],
    spanish_templates: [
      "3 restaurantes de tu zona en {city} ya usan nuestro asistente de WhatsApp. ¿Quieres ver cómo les va?",
      "El mes pasado ayudamos a un {category} similar a reducir no-shows en 40%.",
      "Pregúntale a {reference_business} cómo cambió su operación con automatización."
    ]
  },
  reciprocity: {
    name: "Reciprocity",
    description: "People feel obligated to return favors",
    triggers: ["gratis", "sin compromiso", "análisis", "auditoría"],
    spanish_templates: [
      "Hice un análisis rápido de tu flujo de reservas. ¿Te mando los hallazgos gratis?",
      "Tengo 3 ideas específicas para {business_name}. ¿Te las comparto sin compromiso?",
      "Vi algo en tu Instagram que podría mejorar fácil. ¿Te cuento?"
    ]
  },
  scarcity: {
    name: "Scarcity",
    description: "Limited availability increases perceived value",
    triggers: ["cupos limitados", "solo este mes", "piloto", "pocos lugares"],
    spanish_templates: [
      "Solo trabajo con 2 negocios por ciudad para mantener resultados. Tengo 1 cupo en {city}.",
      "Estamos en fase piloto con precios especiales. Se cierra este viernes.",
      "Buscamos 1 {category} en {city} para caso de estudio con descuento del 50%."
    ]
  }
} as const;

// Objection responses for Claude Copilot
export const OBJECTION_PATTERNS = {
  price: {
    triggers: ["caro", "costoso", "no tengo presupuesto", "muy caro", "precio", "expensive"],
    framework: "loss_aversion",
    response_angles: [
      "Calculate lost revenue from unanswered messages",
      "Compare cost to hiring a human assistant",
      "Offer pilot/trial period to demonstrate ROI"
    ]
  },
  time: {
    triggers: ["no tengo tiempo", "muy ocupado", "después", "luego", "later", "busy"],
    framework: "scarcity",
    response_angles: [
      "Emphasize quick 15-minute setup",
      "Highlight time savings after implementation",
      "Offer to handle everything with minimal input"
    ]
  },
  skepticism: {
    triggers: ["no creo", "no funciona", "suena raro", "scam", "estafa"],
    framework: "social_proof",
    response_angles: [
      "Share specific case studies with numbers",
      "Offer reference call with similar business",
      "Propose no-commitment trial"
    ]
  },
  existing_solution: {
    triggers: ["ya tengo", "uso otra cosa", "ya tenemos", "already have"],
    framework: "reciprocity",
    response_angles: [
      "Ask about current pain points",
      "Offer free audit of current setup",
      "Position as complement, not replacement"
    ]
  },
  not_now: {
    triggers: ["ahora no", "más adelante", "después de temporada", "not now"],
    framework: "scarcity",
    response_angles: [
      "Highlight cost of waiting (lost bookings)",
      "Mention limited availability",
      "Offer to schedule future implementation"
    ]
  }
} as const;

// Enhanced Sales Psychology Engine
// Based on 47 years of combined sales psychology research

export const FRAMEWORK_CREDENTIALS = {
  authority_markers: {
    years_research: "47 years of combined sales psychology research",
    case_volume: "1,400+ successful client transformations",
    results: "$4.7 million in documented client results",
    methodology: "Proprietary system combining neuroscience, NLP, behavioral economics, and identity transformation",
  },
  frameworks_used: [
    "Neuroscience of Decision-Making",
    "Neuro-Linguistic Programming (NLP)",
    "Behavioral Economics (Kahneman, Thaler)",
    "Identity Transformation Architecture",
    "Compliance Psychology",
    "Loss Aversion Optimization",
    "Future Pacing & Temporal Manipulation",
  ],
  credibility_statements: [
    "This methodology has generated $4.7M in results across 1,400+ cases.",
    "Built on 47 years of combined research in sales psychology and behavioral science.",
    "Every script is engineered using neuroscience-backed persuasion principles.",
    "The same frameworks used by top-tier consultancies, adapted for local business.",
  ],
} as const;

export const NEUROSCIENCE_NLP = {
  brain_decision_hierarchy: {
    principle: "The emotional brain decides. The logical brain justifies.",
    application: [
      "ALWAYS trigger emotion BEFORE presenting logic",
      "Pain/fear activates faster than pleasure/gain",
      "Specificity creates believability (numbers, details)",
      "Stories bypass resistance; facts meet resistance",
    ],
    sequence: [
      "1. Activate reptilian brain: threat/opportunity to survival (business survival)",
      "2. Engage limbic system: emotional resonance (frustration, desire, fear)",
      "3. Satisfy neocortex: logical justification (ROI, numbers, proof)",
    ],
  },
  nlp_language_patterns: {
    presuppositions: {
      principle: "Language that assumes the sale already happened",
      patterns: [
        "When you implement this system...",
        "After we automate your bookings...",
        "Once you see the first month's results...",
        "As you start saving those 15 hours a week...",
        "The question isn't whether, it's when...",
      ],
    },
    embedded_commands: {
      principle: "Bypass conscious resistance by embedding directives",
      patterns: [
        "You might find yourself wondering why you waited so long",
        "Most owners discover they can finally relax once this is running",
        "You'll notice the difference immediately",
        "People often realize this was the missing piece",
        "It's easy to see why this works",
      ],
    },
    pattern_interrupts: {
      principle: "Disrupt autopilot rejection responses",
      patterns: [
        "I'm not going to pitch you anything today.",
        "You probably get 10 messages like this a week. This isn't one of them.",
        "I almost didn't reach out.",
        "This might not be for you.",
        "I'm actually not sure you need this.",
        "Stop me if you've heard this before - actually, you haven't.",
      ],
    },
    temporal_language: {
      principle: "Compress future benefits, expand current pain",
      patterns: [
        "In just 30 days...",
        "By this time next month...",
        "While you're reading this, you're losing...",
        "Every hour that passes...",
        "Right now, as we speak...",
      ],
    },
    sensory_language: {
      principle: "Make them FEEL the scenario, not just understand it",
      patterns: [
        "Picture this:",
        "Imagine the feeling when...",
        "You know that moment when...",
        "Feel what it's like to...",
        "See yourself...",
      ],
    },
  },
  anchoring_techniques: {
    principle: "Link positive states to your solution, negative states to status quo",
    applications: [
      "Describe their current pain vividly (anchor negative state)",
      "Transition: 'Now imagine...' (break state)",
      "Describe transformation vividly (anchor positive state)",
      "Connect positive anchor to your solution",
    ],
  },
  mirroring_rapport: {
    principle: "People trust those who are like them",
    applications: [
      "Use industry-specific language they use",
      "Reference local (Colombian) context",
      "Match formality level to their communication style",
      "Acknowledge their specific situation before offering solutions",
    ],
  },
} as const;

export const BEHAVIORAL_ECONOMICS = {
  loss_aversion: {
    principle: "Frame as preventing loss, not acquiring gain",
    research: "Kahneman & Tversky: Losses hurt 2.5x more than gains satisfy",
    applications: {
      bad: "You could earn an extra $3,000/month",
      good: "You're losing $3,000/month to no-shows and missed inquiries",
      better: "Every day you wait costs you approximately $100 in lost revenue",
      best: "That $100/day loss has already cost you $3,000 this month. How much more will you lose before you fix it?",
    },
    loss_language: [
      "You're losing...",
      "Every day without this costs you...",
      "While your competitors capture these customers, you're...",
      "The money walking out your door...",
      "What it's already cost you this month...",
    ],
  },
  anchoring_effect: {
    principle: "Set high anchor first, then reveal actual investment",
    research: "Tversky & Kahneman: Initial values bias subsequent estimates",
    applications: [
      "A full-time employee costs $24,000/year. This system costs a fraction and works 24/7.",
      "Most agencies charge $15-20k for this level of automation. My approach is different.",
      "The revenue you're losing annually is probably $30-50k. Fixing it costs less than one month of losses.",
      "Hiring a receptionist: $2,000/month. This system: less than half that, never calls in sick.",
    ],
  },
  social_proof: {
    principle: "Show similar businesses already winning",
    research: "Cialdini: People follow the lead of similar others",
    applications: {
      local: "Three restaurants in Getsemani implemented this last month.",
      competitor: "Your competitor down the street automated their bookings in January.",
      category: "The top-rated hotels in Cartagena all have AI concierges now.",
      aspirational: "This is what the Michelin-starred restaurants in Bogota use.",
    },
    specificity_matters: [
      "37 restaurants in Colombia are using this exact system.",
      "Average result: 47% reduction in no-shows within 30 days.",
      "Last client went from 3-hour response time to under 3 minutes.",
    ],
  },
  scarcity_effect: {
    principle: "Limited availability increases perceived value",
    research: "Cialdini: Scarcity increases perceived value and urgency",
    applications: {
      capacity: "I only take on 3 new clients per month. I have one spot left.",
      time: "This pricing is only available through December.",
      pilot: "I'm testing this with 5 restaurants before I raise the price.",
      attention: "After this week, I'm heads-down with existing clients until February.",
    },
    urgency_triggers: [
      "High season is 8 weeks away. We need 4 weeks to implement properly.",
      "The longer you wait, the more you lose - that's just math.",
      "Your competitors are implementing this now. The window is closing.",
    ],
  },
  reciprocity: {
    principle: "Provide value before asking for anything",
    research: "Cialdini: People feel obligated to return favors",
    applications: [
      "I did a quick audit of your Google reviews. Here's what I found...",
      "I noticed something in your booking flow. Mind if I share?",
      "I put together a 3-minute video showing exactly what I'd fix. No strings.",
      "Here's a framework you can implement yourself, even if we never work together.",
    ],
  },
  commitment_consistency: {
    principle: "Small yeses lead to big yeses",
    research: "Cialdini: People strive to be consistent with prior commitments",
    applications: {
      agreement_ladder: [
        "Would you agree that no-shows are a problem for most restaurants?",
        "And would you say it's costing you real money every week?",
        "If I could show you a way to fix that, would it be worth 15 minutes?",
        "Great - does Thursday or Friday work better?",
      ],
      micro_commitments: [
        "Reply 'yes' if you want to see how this works.",
        "Just say 'show me' and I'll send the video.",
        "Sound interesting? Just reply with your best number.",
      ],
    },
  },
  endowment_effect: {
    principle: "People value what they already have more",
    research: "Thaler: Ownership increases perceived value",
    applications: [
      "Let me show you YOUR system running...",
      "This is what YOUR dashboard would look like...",
      "Imagine this is YOUR booking flow...",
      "Picture YOUR staff using this every day...",
    ],
  },
  choice_architecture: {
    principle: "How options are presented affects decisions",
    applications: {
      decoy_effect: "Basic ($500), Pro ($1,500), Premium ($2,000) - Pro looks best",
      default_option: "Most clients start with the booking system. Want to do the same?",
      limited_options: "Two options: We do this now, or we do it in January. Which works?",
    },
  },
} as const;

export const IDENTITY_TRANSFORMATION = {
  core_principle: {
    statement: "People make decisions to protect or enhance their identity",
    implication: "Sell the IDENTITY they want to have, not the product features",
    key_insight: "The gap between who they ARE and who they want to BE creates purchase motivation",
  },
  identity_architecture: {
    current_identity: {
      description: "Overwhelmed operator, reactive, losing control",
      emotional_state: "Frustrated, exhausted, falling behind",
      self_talk: "'I can't keep up', 'There's not enough time', 'I'm doing everything myself'",
    },
    aspirational_identity: {
      description: "Strategic owner, proactive, in control",
      emotional_state: "Confident, relaxed, ahead of the game",
      self_talk: "'My business runs itself', 'I focus on what matters', 'I'm building something'",
    },
    transformation_bridge: {
      message: "One system changes everything",
      role_of_product: "The tool that transforms them into who they want to be",
      positioning: "Not buying software - becoming a different kind of business owner",
    },
  },
  identity_triggers_by_vertical: {
    restaurant: {
      current: "The owner who's always putting out fires, answering WhatsApp at midnight",
      aspirational: "The restaurateur who runs a tight operation, never misses a beat",
      gap_statement: "You didn't open a restaurant to be a full-time receptionist.",
      transformation: "From chaos to command. From reactive to proactive.",
    },
    hotel: {
      current: "The hotelier drowning in OTA commissions and guest complaints",
      aspirational: "The hotelier guests rave about, who anticipates every need",
      gap_statement: "You built a hotel to create experiences, not to answer the same question 50 times a day.",
      transformation: "From overwhelmed to effortless. From surviving to thriving.",
    },
    tour_operator: {
      current: "The operator buried in WhatsApp groups and booking chaos",
      aspirational: "The operator with the reputation for flawless experiences",
      gap_statement: "You started this to share adventures, not to be buried in logistics.",
      transformation: "From logistics nightmare to seamless operation.",
    },
    club: {
      current: "The owner scrambling for last-minute bookings and VIP no-shows",
      aspirational: "The nightlife king who runs the spot everyone talks about",
      gap_statement: "You didn't get into nightlife to be a table reservation hotline.",
      transformation: "From chasing bookings to turning people away.",
    },
    boat_charter: {
      current: "The captain chained to their phone, missing life on the water",
      aspirational: "The operator with boats fully booked, living the lifestyle they sold",
      gap_statement: "You bought boats to live the life, not to be a 24/7 sales rep.",
      transformation: "From phone slave to fleet commander.",
    },
    concierge: {
      current: "The fixer drowning in WhatsApp, juggling 10 clients, remembering nothing",
      aspirational: "The legendary concierge who anticipates needs before clients ask",
      gap_statement: "You built this to create magic, not to be a human switchboard at 3am.",
      transformation: "From reactive chaos to anticipatory excellence.",
    },
    villa_rental: {
      current: "The property manager buried in turnover chaos and guest complaints",
      aspirational: "The operator with seamless guest experiences and passive income",
      gap_statement: "You bought these properties for freedom, not another full-time job.",
      transformation: "From constant fires to automated excellence.",
    },
    spa: {
      current: "The owner juggling walk-ins, no-shows, and therapist scheduling",
      aspirational: "The wellness expert with fully booked chairs and loyal clients",
      gap_statement: "You opened a spa to heal people, not to chase down no-shows.",
      transformation: "From appointment chaos to zen operation.",
    },
  },
  identity_language_patterns: [
    "This is for the {category} owner who wants to...",
    "If you're the kind of owner who...",
    "The {category}s that dominate {city} all have one thing in common...",
    "Is this who you want to be known as?",
    "A year from now, you'll either be glad you made this move, or still stuck in the same place.",
    "The question isn't whether you need this. It's whether you're ready to become the owner you want to be.",
  ],
  transformation_timeline: {
    "30_days": "Systems running, chaos eliminated",
    "90_days": "Full automation, significant time savings",
    "1_year": "Completely different business, completely different life",
  },
} as const;

export const COMPLIANCE_PSYCHOLOGY = {
  authority_principle: {
    applications: [
      "Position as expert, not salesperson",
      "Reference frameworks, methodologies, research",
      "Use specific numbers and case results",
      "Speak with certainty, not tentativeness",
    ],
    language: [
      "Based on 47 years of combined research...",
      "The data from 1,400+ implementations shows...",
      "This methodology has recovered $4.7 million for businesses like yours...",
      "The behavioral science is clear on this...",
    ],
  },
  procedural_compliance: {
    applications: [
      "Present clear next steps",
      "Make the path forward obvious",
      "Remove ambiguity and friction",
      "Frame as 'standard process'",
    ],
    language: [
      "Here's how this typically works:",
      "Step one is a 15-minute call...",
      "The standard process is...",
      "What happens next is simple:",
    ],
  },
  legitimacy_markers: {
    applications: [
      "Specific numbers over round numbers (47 not 50)",
      "Named methodologies and frameworks",
      "Third-party validation and social proof",
      "Professional communication standards",
    ],
  },
} as const;

// City-specific targeting priorities
export const CITY_PRIORITIES: Record<string, {
  priority_verticals: string[];
  market_context: string;
  decision_maker: string;
}> = {
  cartagena: {
    priority_verticals: ["restaurant", "club", "bar", "spa", "hotel", "tour_operator", "boat_charter", "concierge", "villa_rental"],
    market_context: "Tourism-driven, high-spend visitors, WhatsApp-heavy communication, seasonal peaks",
    decision_maker: "Usually owner-operator, values relationships, skeptical of tech unless shown ROI",
  },
  medellin: {
    priority_verticals: ["restaurant", "gym", "spa", "coworking", "real_estate", "photographer", "event_planner"],
    market_context: "Digital nomad hub, lifestyle businesses, younger owners, more tech-savvy",
    decision_maker: "Often younger entrepreneurs, open to innovation, price-conscious but value quality",
  },
  bogota: {
    priority_verticals: ["real_estate", "restaurant", "hotel", "event_planner", "chef", "transportation"],
    market_context: "Corporate hub, larger businesses, formal sales cycles, higher budgets",
    decision_maker: "Professional managers, need ROI proof, longer decision cycles",
  },
  cali: {
    priority_verticals: ["restaurant", "club", "bar", "event_planner", "dj"],
    market_context: "Salsa culture, vibrant nightlife, music-focused events",
    decision_maker: "Entertainment-focused owners, value energy and experience",
  },
  barranquilla: {
    priority_verticals: ["restaurant", "hotel", "event_planner", "club"],
    market_context: "Carnival culture, seasonal events, family businesses",
    decision_maker: "Traditional business owners, relationship-driven",
  },
};

// Enhanced Vertical Deep Intelligence
export const VERTICAL_DEEP_INTEL: Record<string, {
  pain_points: string[];
  revenue_leakage: string[];
  ai_solutions: {
    starter: { name: string; desc: string; roi: string }[];
    core: { name: string; desc: string; roi: string }[];
    flagship: { name: string; desc: string; roi: string; price_range: string };
  };
  owner_psychology: {
    fears: string[];
    wants: string[];
    objections: string[];
    leverage: string;
  };
}> = {
  restaurant: {
    pain_points: [
      "WhatsApp reservation chaos - messages lost, double bookings, no confirmation system",
      "No-shows eating 15-20% of revenue with zero deposit collection",
      "Staff answering same questions 50x/day (hours, menu, location, parking)",
      "Google reviews piling up unanswered, killing SEO and trust",
      "Menu updates scattered across 5 platforms, always out of sync",
      "No customer database - regulars treated same as first-timers",
      "Peak hour phone overflow - missed reservations = missed revenue",
    ],
    revenue_leakage: [
      "No-shows: $500-2000/month in lost covers",
      "Missed calls during rush: 10-20 lost reservations/week",
      "No upsell system: wine pairings, private dining, events",
      "Zero rebooking automation: customers forget to return",
      "Bad review responses: each unanswered review costs future customers",
    ],
    ai_solutions: {
      starter: [
        { name: "WhatsApp Auto-Responder", desc: "Instant replies to inquiries 24/7", roi: "Capture 30% more inquiries" },
        { name: "Google Review Bot", desc: "Auto-respond to all reviews within 2 hours", roi: "Improve rating by 0.3 stars" },
        { name: "FAQ Chatbot", desc: "Answer hours/menu/location instantly", roi: "Save 2hrs staff time daily" },
      ],
      core: [
        { name: "Smart Reservation System", desc: "WhatsApp booking with confirmations + reminders", roi: "Cut no-shows by 60%" },
        { name: "Deposit Collection Bot", desc: "Automated payment links for large parties", roi: "Eliminate no-show losses" },
        { name: "Customer Memory System", desc: "Track preferences, anniversaries, VIP status", roi: "Increase repeat visits 25%" },
      ],
      flagship: {
        name: "AI Restaurant Command Center",
        desc: "Unified inbox (WhatsApp, Instagram, calls) + reservation management + review automation + customer CRM",
        roi: "Full operational automation - run front-of-house with 50% less staff overhead",
        price_range: "$3,000-8,000 setup + $500/month",
      },
    },
    owner_psychology: {
      fears: ["Technology breaking during service", "Losing personal touch with guests", "Staff not adopting new systems"],
      wants: ["More free time", "Consistent bookings", "Less phone chaos", "Higher revenue without more staff"],
      objections: ["We're too small for this", "Our customers prefer personal service", "We tried tech before and it failed"],
      leverage: "Show them their competitors are already automating. FOMO is real in hospitality.",
    },
  },
  hotel: {
    pain_points: [
      "Guest inquiries 24/7 across WhatsApp, email, OTAs - impossible to keep up",
      "OTA commissions eating 15-25% of every booking",
      "Upsell opportunities missed - tours, dining, spa, late checkout",
      "Check-in friction creates bad first impressions",
      "No pre-arrival communication = guests arrive confused",
      "Post-stay follow-up is manual or nonexistent",
      "Concierge requests pile up, response time kills satisfaction",
    ],
    revenue_leakage: [
      "OTA dependency: $2,000-10,000/month in commissions on bookings you could own",
      "Missed upsells: Average guest spends 40% more with proper prompting",
      "No direct rebooking: Guests return via OTA, you pay commission again",
      "Slow inquiry response: Every hour delay = 10% booking drop",
    ],
    ai_solutions: {
      starter: [
        { name: "WhatsApp Concierge Bot", desc: "Answer guest questions 24/7", roi: "90% faster response time" },
        { name: "Pre-Arrival Sequence", desc: "Automated welcome + upsell offers", roi: "15% upsell conversion" },
        { name: "Review Request Automation", desc: "Timed ask for reviews post-checkout", roi: "3x more reviews" },
      ],
      core: [
        { name: "Direct Booking Chatbot", desc: "Website + WhatsApp booking without OTAs", roi: "Save 15-25% per booking" },
        { name: "AI Upsell Engine", desc: "Personalized tour/dining/spa recommendations", roi: "Increase ancillary revenue 30%" },
        { name: "Guest Experience Automator", desc: "Check-in instructions, WiFi, recommendations on autopilot", roi: "Cut front desk load 40%" },
      ],
      flagship: {
        name: "AI Hotel Revenue System",
        desc: "Full guest lifecycle automation - from inquiry to rebooking. Direct booking capture, dynamic upsells, reputation management, loyalty program.",
        roi: "Shift 30% of bookings from OTA to direct. Increase RevPAR by 20%.",
        price_range: "$5,000-15,000 setup + $800/month",
      },
    },
    owner_psychology: {
      fears: ["Losing the 'boutique' personal feel", "Technology errors embarrassing them with guests", "OTAs retaliating if they push direct"],
      wants: ["Freedom from OTA dependency", "Higher margins", "Better reviews", "Less operational chaos"],
      objections: ["Our guests expect human service", "We're too small for enterprise software", "OTAs bring us most of our business"],
      leverage: "Calculate their exact OTA commission spend. Show them keeping even 20% of that = your fee paid 10x over.",
    },
  },
  tour_operator: {
    pain_points: [
      "Booking inquiries scattered across WhatsApp, Instagram, email - chaos",
      "Manual itinerary creation eating hours per booking",
      "No-shows and last-minute cancellations with no deposit system",
      "Availability management across multiple guides/boats is a nightmare",
      "Tourists asking same questions 100x (what to bring, pickup times, etc.)",
      "Payment collection fragmented - cash, transfer, card all separate",
      "No rebooking system - tourists do one tour and forget you exist",
    ],
    revenue_leakage: [
      "Inquiry response delay: Tourists book whoever responds first",
      "No deposits: 20-30% no-show rate on group tours",
      "Manual follow-up: Zero rebooking of multi-day visitors",
      "Referral neglect: Happy tourists could bring 5 friends but you never ask",
    ],
    ai_solutions: {
      starter: [
        { name: "Instant Quote Bot", desc: "WhatsApp bot with tour options + pricing + availability", roi: "Respond in 30 seconds vs 30 minutes" },
        { name: "Booking Confirmation System", desc: "Auto-confirm with details, what to bring, meeting point", roi: "Cut pre-tour support 70%" },
        { name: "Review Collector", desc: "Automated post-tour review request with photo sharing", roi: "5x review volume" },
      ],
      core: [
        { name: "Smart Booking + Deposit System", desc: "WhatsApp booking flow with instant payment links", roi: "Eliminate no-shows" },
        { name: "Availability Calendar Bot", desc: "Real-time availability across all tours/guides", roi: "No more double bookings" },
        { name: "Tourist Nurture Sequence", desc: "Multi-day visitors get daily tour recommendations", roi: "2x bookings per tourist" },
      ],
      flagship: {
        name: "AI Tour Operations Hub",
        desc: "Complete booking engine + guide management + customer journey automation + multi-tour upsell system",
        roi: "Scale from 10 to 50 bookings/day without adding staff",
        price_range: "$4,000-10,000 setup + $600/month",
      },
    },
    owner_psychology: {
      fears: ["Losing the personal adventure feel", "Technology failing during tours", "Guides not using the system"],
      wants: ["More bookings with less phone time", "Reliable income", "Ability to scale without burnout"],
      objections: ["Tourism is personal, can't automate", "We're seasonal, not worth investing", "Our customers are older, don't use apps"],
      leverage: "Show them their WhatsApp response time. If it's over 5 minutes, they're losing bookings to faster competitors.",
    },
  },
  boat_charter: {
    pain_points: [
      "Quote requests overwhelming - each one needs custom pricing based on boat, duration, extras",
      "Deposits and payment tracking is manual nightmare",
      "Weather cancellations create rebooking chaos",
      "Crew scheduling across multiple boats",
      "Tourists expect instant responses but you're on the water",
      "No system for upsells - catering, DJ, photographer, drone",
      "Seasonal demand spikes crush your capacity to respond",
    ],
    revenue_leakage: [
      "Slow quote response: Luxury clients book whoever responds first",
      "No deposit enforcement: Cancellations cost $500-2000 per incident",
      "Missed upsells: Average charter could be 40% higher with add-ons",
      "Zero rebooking: Bachelor parties have 5 more friends coming next month",
    ],
    ai_solutions: {
      starter: [
        { name: "Instant Quote Generator", desc: "WhatsApp bot with boat options, pricing, availability", roi: "Quote in 60 seconds vs 2 hours" },
        { name: "Deposit Automation", desc: "Payment link sent automatically with booking confirmation", roi: "Eliminate cancellation losses" },
        { name: "Weather Alert System", desc: "Automated rescheduling flow when conditions change", roi: "Save 5+ hours per weather event" },
      ],
      core: [
        { name: "Upsell Menu Bot", desc: "Present catering, DJ, photo packages during booking", roi: "Increase average charter 30%" },
        { name: "Fleet Availability System", desc: "Real-time boat + crew scheduling", roi: "No double bookings, maximize utilization" },
        { name: "VIP Client Nurture", desc: "Automated follow-up for rebooking, referrals, reviews", roi: "2x repeat bookings" },
      ],
      flagship: {
        name: "AI Charter Command Center",
        desc: "Complete booking engine + fleet management + client CRM + upsell automation + weather integration",
        roi: "Handle 3x volume with same team. Become the premium charter operation.",
        price_range: "$6,000-15,000 setup + $800/month",
      },
    },
    owner_psychology: {
      fears: ["Technology failing on the water", "Losing the luxury personal touch", "Crew resistance to new systems"],
      wants: ["Less phone time, more time on water", "Consistent high-season income", "Premium positioning"],
      objections: ["Our clients expect white-glove service", "We're not a tech company", "High season is too busy to implement"],
      leverage: "Position as 'what Four Seasons does for hotels, you'll do for charters.' Luxury = systems, not chaos.",
    },
  },
  spa: {
    pain_points: [
      "Appointment booking scattered across phone, WhatsApp, walk-ins",
      "No-shows with zero deposit system",
      "Therapist scheduling is manual puzzle",
      "No rebooking automation - clients forget to return",
      "Gift cards and packages tracked in spreadsheets",
      "No upsell flow - clients book basic when they'd pay for premium",
    ],
    revenue_leakage: [
      "No-shows: 15-25% of appointments, each worth $50-200",
      "No rebooking: Average client could visit 2x more with reminders",
      "Missed upsells: Facial client would add massage if prompted",
      "Gift card breakage: Cards sold but tracking is chaos",
    ],
    ai_solutions: {
      starter: [
        { name: "WhatsApp Booking Bot", desc: "24/7 appointment booking with therapist/time selection", roi: "Capture after-hours bookings" },
        { name: "Appointment Reminder System", desc: "48hr + 2hr reminders with easy reschedule option", roi: "Cut no-shows 50%" },
        { name: "Review Automation", desc: "Post-treatment review request", roi: "3x Google reviews" },
      ],
      core: [
        { name: "Deposit Collection System", desc: "Auto-charge card on file for premium services", roi: "Eliminate no-show losses" },
        { name: "Rebooking Engine", desc: "Automated follow-up based on treatment type", roi: "Increase visit frequency 30%" },
        { name: "Upsell Recommender", desc: "Personalized add-on suggestions during booking", roi: "15% higher ticket average" },
      ],
      flagship: {
        name: "AI Spa Management System",
        desc: "Full booking + staff scheduling + client CRM + membership management + retail tracking",
        roi: "Run spa operations with 50% less admin overhead",
        price_range: "$3,000-7,000 setup + $400/month",
      },
    },
    owner_psychology: {
      fears: ["Losing the relaxation/wellness vibe with tech", "Staff not adopting", "Impersonal client experience"],
      wants: ["Full appointment books", "Less phone interruptions", "Higher client retention"],
      objections: ["Spa is about human touch", "Our clients are older, prefer phone", "We're small, don't need systems"],
      leverage: "Every no-show is a therapist sitting idle getting paid. Math always wins.",
    },
  },
  club: {
    pain_points: [
      "Table reservation chaos - WhatsApp groups, Instagram DMs, phone calls",
      "VIP guest tracking is in someone's head, not a system",
      "Bottle service coordination between hosts and bar",
      "Guest list management for events is spreadsheet hell",
      "Promoter commission tracking is manual and disputed",
      "No system to reactivate past VIP guests",
    ],
    revenue_leakage: [
      "Lost reservations: VIPs book whoever responds fastest",
      "No reactivation: Big spenders from 3 months ago forgotten",
      "Promoter disputes: Commission tracking chaos",
      "Event underperformance: No data on what works",
    ],
    ai_solutions: {
      starter: [
        { name: "VIP Reservation Bot", desc: "WhatsApp table booking with menu + deposit", roi: "Instant response = more bookings" },
        { name: "Guest List Automation", desc: "Digital check-in system for events", roi: "Eliminate door chaos" },
        { name: "Post-Night Follow-up", desc: "Thank you + photos + next event invite", roi: "Build VIP loyalty" },
      ],
      core: [
        { name: "VIP CRM System", desc: "Track spending, preferences, birthdays, crew", roi: "Personalized service = higher spend" },
        { name: "Promoter Dashboard", desc: "Automated commission tracking + payouts", roi: "Eliminate disputes" },
        { name: "Event Hype Engine", desc: "Countdown sequences, early access, FOMO creation", roi: "Sell out events faster" },
      ],
      flagship: {
        name: "AI Nightlife Command Center",
        desc: "Complete VIP management + reservation system + promoter tracking + event marketing automation",
        roi: "Become the premium venue that runs like a machine",
        price_range: "$5,000-12,000 setup + $700/month",
      },
    },
    owner_psychology: {
      fears: ["Losing the exclusive vibe", "Staff/promoters gaming the system", "Technology looking cheap"],
      wants: ["Packed weekends", "VIP loyalty", "Less drama", "Premium reputation"],
      objections: ["Nightlife is relationships, not tech", "Our crowd doesn't want apps", "We're already successful"],
      leverage: "Every top club in Miami/Ibiza runs on systems. That's HOW they stay premium.",
    },
  },
  concierge: {
    pain_points: [
      "Managing 10+ villa guests simultaneously",
      "Coordinating 15+ vendors for events",
      "3am WhatsApp from guests who need something now",
      "No client preference history across visits",
      "Vendor contact chaos - lost numbers and outdated prices",
      "Event coordination complexity with multiple moving parts",
      "Can't clone yourself - every client thinks they're your only client",
    ],
    revenue_leakage: [
      "Client cap: Can't grow beyond personal bandwidth",
      "Vendor inefficiency: Hours wasted on coordination",
      "No upsell tracking: Missing high-value opportunities",
      "Repeat client neglect: No system for rebooking",
    ],
    ai_solutions: {
      starter: [
        { name: "Client Preference Database", desc: "Remember everything across visits", roi: "Personalized service at scale" },
        { name: "Vendor CRM", desc: "All vendor contacts, pricing, availability in one place", roi: "Cut coordination time 60%" },
        { name: "After-Hours Bot", desc: "Handle common requests automatically while you sleep", roi: "Never miss a 3am request" },
      ],
      core: [
        { name: "Event Coordination Hub", desc: "Manage multi-vendor events with automated reminders", roi: "Handle 3x more events" },
        { name: "Client Communication Templates", desc: "One-click responses for common requests", roi: "Respond 10x faster" },
        { name: "Multi-Property Dashboard", desc: "Track all villas, guests, requests in one view", roi: "Scale to 50 properties" },
      ],
      flagship: {
        name: "AI Concierge Command Center",
        desc: "Full client CRM + vendor management + event coordination + automated guest communication + preference tracking",
        roi: "Clone yourself. Handle 3x clients with same or less effort.",
        price_range: "$5,000-12,000 setup + $600/month",
      },
    },
    owner_psychology: {
      fears: ["Clients feeling like they're getting a bot", "Vendors not cooperating with new system", "Losing the magic touch"],
      wants: ["Scale without burning out", "Premium positioning", "More high-value clients", "Actually take a vacation"],
      objections: ["My service IS me - can't automate", "My clients expect me personally", "I'm already at capacity, don't need more"],
      leverage: "Being at capacity = leaving money on the table. The best concierges scale without compromising quality.",
    },
  },
  villa_rental: {
    pain_points: [
      "Guest inquiries across Airbnb, VRBO, direct messages",
      "Check-in/out coordination with housekeeping",
      "Guest issues during stays (AC, water, wifi)",
      "No guest preference tracking for repeat visitors",
      "Revenue management across platforms",
      "Cleaning and maintenance scheduling chaos",
    ],
    revenue_leakage: [
      "Multi-platform chaos: Double bookings or slow responses",
      "No direct bookings: Paying 15-20% to OTAs unnecessarily",
      "Guest issues unresolved: Bad reviews destroying future bookings",
      "No repeat guests: Zero loyalty program",
    ],
    ai_solutions: {
      starter: [
        { name: "Multi-Channel Bot", desc: "Unified inbox for all platforms", roi: "Never miss an inquiry" },
        { name: "Check-In Automation", desc: "Smart timing for instructions and access codes", roi: "Zero confusion arrivals" },
        { name: "Issue Routing", desc: "Guest problems auto-routed to right service provider", roi: "Faster resolution = better reviews" },
      ],
      core: [
        { name: "VIP Guest CRM", desc: "Track preferences for repeat visitors", roi: "Increase repeat bookings 40%" },
        { name: "Direct Booking Engine", desc: "Capture OTA traffic to direct", roi: "Save 15-20% per booking" },
        { name: "Housekeeping Coordination", desc: "Automated scheduling with turnover tracking", roi: "Never miss a clean" },
      ],
      flagship: {
        name: "AI Villa Operations Hub",
        desc: "Complete property management + guest CRM + multi-channel booking + housekeeping automation + maintenance tracking",
        roi: "Manage 10 properties like you manage 2. True passive income.",
        price_range: "$4,000-10,000 setup + $500/month",
      },
    },
    owner_psychology: {
      fears: ["Double bookings destroying reputation", "Guests feeling neglected", "Losing the boutique feel"],
      wants: ["Passive income", "Premium guests", "Fewer headaches", "Scale portfolio"],
      objections: ["Our properties are unique, need personal touch", "We tried property management software before", "Too busy to implement"],
      leverage: "Every hour you spend on operations is an hour not finding your next property. Systems = scale.",
    },
  },
};

// ========== GUEST INTELLIGENCE (GENOME PROTOCOL) ==========

export const guestProfiles = pgTable("guest_profiles", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id", { length: 255 }),
  propertyName: text("property_name"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  completeness: integer("completeness").default(0),
  isVip: boolean("is_vip").default(false),
  lifetimeValue: real("lifetime_value").default(0),
  communicationChannel: text("communication_channel"),
  responseStyle: text("response_style"),
  bestContactTime: text("best_contact_time"),
  decisionSpeed: text("decision_speed"),
  decisionDriver: text("decision_driver"),
  priceSensitivity: integer("price_sensitivity"),
  upgradePropensity: integer("upgrade_propensity"),
  environmentPref: text("environment_pref"),
  temperaturePref: text("temperature_pref"),
  chronotype: text("chronotype"),
  dietaryPref: text("dietary_pref"),
  travelStyle: text("travel_style"),
  typicalGroupSize: integer("typical_group_size"),
  specialOccasions: text("special_occasions"),
  decisionRole: text("decision_role"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const guestSignals = pgTable("guest_signals", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id", { length: 255 }).references(() => guestProfiles.id),
  signalType: text("signal_type").notNull(),
  collectionMechanism: text("collection_mechanism"),
  value: text("value"),
  confidence: integer("confidence"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const guestVipActivity = pgTable("guest_vip_activity", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id", { length: 255 }).references(() => guestProfiles.id),
  activityType: text("activity_type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGuestProfileSchema = createInsertSchema(guestProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGuestSignalSchema = createInsertSchema(guestSignals).omit({
  id: true,
  createdAt: true,
});

export const insertGuestVipActivitySchema = createInsertSchema(guestVipActivity).omit({
  id: true,
  createdAt: true,
});

export type InsertGuestProfile = z.infer<typeof insertGuestProfileSchema>;
export type GuestProfile = typeof guestProfiles.$inferSelect;
export type InsertGuestSignal = z.infer<typeof insertGuestSignalSchema>;
export type GuestSignal = typeof guestSignals.$inferSelect;
export type InsertGuestVipActivity = z.infer<typeof insertGuestVipActivitySchema>;
export type GuestVipActivity = typeof guestVipActivity.$inferSelect;

export const COLLECTION_MECHANISMS = [
  { id: "concierge_capture", name: "Concierge Capture", description: "Choice reveals preference" },
  { id: "preference_cascade", name: "Preference Cascade", description: "Binary micro-choices" },
  { id: "relief_reveal", name: "Relief Reveal", description: "Care context extraction" },
  { id: "anticipation_engine", name: "Anticipation Engine", description: "Predict & confirm" },
] as const;

// ========== CALL COMPANION ==========

export const callSessions = pgTable("call_sessions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id", { length: 255 }).references(() => businesses.id),
  businessName: text("business_name"),
  contactName: text("contact_name"),
  contactRole: text("contact_role"),
  phone: text("phone"),
  businessType: text("business_type"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  durationMinutes: integer("duration_minutes"),
  dealScore: integer("deal_score").default(50),
  buyerType: text("buyer_type"),
  urgency: text("urgency"),
  authority: text("authority"),
  budget: text("budget"),
  notes: text("notes"),
  nextAction: text("next_action"),
  followUpDate: timestamp("follow_up_date"),
  needsDemo: boolean("needs_demo").default(false),
  needsProposal: boolean("needs_proposal").default(false),
  needsCaseStudy: boolean("needs_case_study").default(false),
  needsTrial: boolean("needs_trial").default(false),
  disposition: text("disposition"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const callObjections = pgTable("call_objections", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id", { length: 255 }).references(() => callSessions.id),
  objectionType: text("objection_type").notNull(),
  addressed: boolean("addressed").default(false),
  addedAt: timestamp("added_at").defaultNow(),
});

export const callPainPoints = pgTable("call_pain_points", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id", { length: 255 }).references(() => callSessions.id),
  painText: text("pain_text").notNull(),
  severity: integer("severity").default(5),
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertCallSessionSchema = createInsertSchema(callSessions).omit({
  id: true,
  createdAt: true,
});

export const insertCallObjectionSchema = createInsertSchema(callObjections).omit({
  id: true,
  addedAt: true,
});

export const insertCallPainPointSchema = createInsertSchema(callPainPoints).omit({
  id: true,
  addedAt: true,
});

export type InsertCallSession = z.infer<typeof insertCallSessionSchema>;
export type CallSession = typeof callSessions.$inferSelect;
export type InsertCallObjection = z.infer<typeof insertCallObjectionSchema>;
export type CallObjection = typeof callObjections.$inferSelect;
export type InsertCallPainPoint = z.infer<typeof insertCallPainPointSchema>;
export type CallPainPoint = typeof callPainPoints.$inferSelect;

export const BUYER_TYPES = [
  { value: "analytical", label: "Analytical", icon: "data", description: "Needs data and proof" },
  { value: "driver", label: "Driver", icon: "results", description: "Focused on results" },
  { value: "expressive", label: "Expressive", icon: "vision", description: "Driven by vision" },
  { value: "amiable", label: "Amiable", icon: "trust", description: "Values relationships" },
] as const;

export const URGENCY_LEVELS = [
  { value: "bleeding", label: "Bleeding", icon: "fire", description: "Needs it NOW" },
  { value: "urgent", label: "Urgent", icon: "bolt", description: "Soon" },
  { value: "planning", label: "Planning", icon: "calendar", description: "Later" },
  { value: "browsing", label: "Browsing", icon: "eye", description: "Cold" },
] as const;

export const AUTHORITY_LEVELS = [
  { value: "sole", label: "Sole Decision", icon: "crown", description: "Can decide alone" },
  { value: "influencer", label: "Influencer", icon: "chat", description: "Needs approval" },
  { value: "gatekeeper", label: "Gatekeeper", icon: "door", description: "Blocker" },
] as const;

export const BUDGET_LEVELS = [
  { value: "flexible", label: "Flexible", icon: "gem", description: "Has budget" },
  { value: "price_first", label: "Price First", icon: "dollar", description: "Price focused" },
  { value: "constrained", label: "Constrained", icon: "tight", description: "Limited budget" },
] as const;

export const OBJECTION_TYPES = [
  { value: "price", label: "Price", icon: "money" },
  { value: "timing", label: "Timing", icon: "clock" },
  { value: "trust", label: "Trust", icon: "question" },
  { value: "authority", label: "Authority", icon: "user" },
  { value: "competitor", label: "Competitor", icon: "vs" },
  { value: "need", label: "No Need", icon: "question" },
] as const;

export const CALL_DISPOSITIONS = [
  { value: "interested", label: "Interested", color: "green", description: "Ready to move forward" },
  { value: "callback", label: "Callback Scheduled", color: "blue", description: "Follow-up scheduled" },
  { value: "send_info", label: "Send Info", color: "amber", description: "Requested more information" },
  { value: "not_interested", label: "Not Interested", color: "red", description: "Declined" },
  { value: "voicemail", label: "Voicemail", color: "gray", description: "Left message" },
  { value: "no_answer", label: "No Answer", color: "gray", description: "Did not pick up" },
  { value: "wrong_number", label: "Wrong Number", color: "red", description: "Bad contact info" },
  { value: "gatekeeper", label: "Gatekeeper", color: "amber", description: "Couldn't reach decision maker" },
] as const;

// ========== SALES SCRIPTS ==========

export const SCRIPT_CATEGORIES = [
  { value: "opener", label: "Openers", description: "Initial contact scripts" },
  { value: "discovery", label: "Discovery", description: "Qualification questions" },
  { value: "objection", label: "Objection Handling", description: "Overcome resistance" },
  { value: "closing", label: "Closing", description: "Close the deal" },
  { value: "followup", label: "Follow-up", description: "Post-call sequences" },
  { value: "whatsapp", label: "WhatsApp", description: "Messaging templates" },
  { value: "voicemail", label: "Voicemail", description: "VM drop scripts" },
] as const;

export const salesScripts = pgTable("sales_scripts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  businessType: text("business_type"),
  language: text("language").default("en"),
  tags: text("tags").array(),
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSalesScriptSchema = createInsertSchema(salesScripts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalesScript = z.infer<typeof insertSalesScriptSchema>;
export type SalesScript = typeof salesScripts.$inferSelect;

// ========== COST CONTROLS & USAGE TRACKING ==========

export const usageRecords = pgTable("usage_records", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  actionType: text("action_type").notNull(),
  resourceType: text("resource_type"),
  quantity: integer("quantity").default(1),
  cost: real("cost").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usageLimits = pgTable("usage_limits", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  limitType: text("limit_type").notNull(),
  dailyLimit: integer("daily_limit"),
  monthlyLimit: integer("monthly_limit"),
  currentDaily: integer("current_daily").default(0),
  currentMonthly: integer("current_monthly").default(0),
  lastResetDaily: timestamp("last_reset_daily").defaultNow(),
  lastResetMonthly: timestamp("last_reset_monthly").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ACTION_TYPES = [
  { value: "scan", label: "Business Scan", cost: 0.01 },
  { value: "enrich", label: "AI Enrichment", cost: 0.02 },
  { value: "outreach_generate", label: "Outreach Generation", cost: 0.03 },
  { value: "blackcard_intel", label: "Black Card Intel", cost: 0.05 },
  { value: "content_generate", label: "Content Generation", cost: 0.04 },
  { value: "scrape", label: "Website Scrape", cost: 0.005 },
] as const;

export const insertUsageRecordSchema = createInsertSchema(usageRecords).omit({
  id: true,
  createdAt: true,
});

export const insertUsageLimitSchema = createInsertSchema(usageLimits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUsageRecord = z.infer<typeof insertUsageRecordSchema>;
export type UsageRecord = typeof usageRecords.$inferSelect;
export type InsertUsageLimit = z.infer<typeof insertUsageLimitSchema>;
export type UsageLimit = typeof usageLimits.$inferSelect;
