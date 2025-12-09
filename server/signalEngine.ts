import { Business, SIGNAL_OFFER_MATRIX, PSYCHOLOGY_HOOKS, VERTICAL_INTELLIGENCE } from "@shared/schema";

export interface SignalAnalysis {
  detectedSignals: string[];
  detectedProblem: string;
  customOffer: string;
  monthlyLoss: number;
  lossExplanation: string;
  identityStatement: string;
  fearTrigger: string;
  desireTrigger: string;
  urgencyAngle: string;
  painPoints: string[];
  hookAngles: string[];
}

export interface MultiChannelScripts {
  whatsappScript: string;
  whatsappLink: string;
  instagramDm: string;
  emailSubject: string;
  emailBody: string;
  followUpDay3: string;
  followUpDay7: string;
  followUpDay14: string;
}

function detectSignals(business: Business): string[] {
  const signals: string[] = [];
  
  if (!business.website) signals.push("no_website");
  if (!business.email) signals.push("no_email");
  if (!business.instagram) signals.push("no_instagram");
  if (!business.whatsapp) signals.push("no_whatsapp");
  if (!business.phone) signals.push("no_phone");
  
  if (business.rating && business.rating < 4.0) signals.push("low_rating");
  if (business.reviewCount && business.reviewCount < 50) signals.push("low_reviews");
  if (business.reviewCount && business.reviewCount > 200) signals.push("high_volume");
  
  if (business.priceLevel && business.priceLevel >= 3) signals.push("high_price_point");
  if (business.priceLevel && business.priceLevel <= 1) signals.push("budget_tier");
  
  const category = business.category?.toLowerCase() || "";
  if (category.includes("hotel") || category.includes("hostel")) {
    signals.push("ota_dependent");
  }
  if (category.includes("concierge") || category.includes("villa")) {
    signals.push("multi_platform");
    signals.push("no_crm");
  }
  if (category.includes("transport") || category.includes("driver")) {
    signals.push("manual_dispatch");
  }
  if (category.includes("tour") || category.includes("guide")) {
    signals.push("manual_booking");
  }
  if (category.includes("spa") || category.includes("wellness")) {
    signals.push("no_deposit");
  }
  if (category.includes("club") || category.includes("nightlife")) {
    signals.push("manual_reservations");
  }
  if (category.includes("boat") || category.includes("yacht")) {
    signals.push("inquiry_overload");
  }
  
  if (!business.openingHours) signals.push("no_hours_info");
  if (business.aiScore && business.aiScore < 50) signals.push("low_ai_readiness");
  if (business.aiScore && business.aiScore >= 80) signals.push("high_ai_readiness");
  
  return signals;
}

function getCategoryKey(category: string): string {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("bar")) return "restaurant";
  if (cat.includes("hotel") || cat.includes("hostel") || cat.includes("lodging")) return "hotel";
  if (cat.includes("concierge")) return "concierge";
  if (cat.includes("villa") || cat.includes("rental")) return "villa_rental";
  if (cat.includes("transport") || cat.includes("driver") || cat.includes("chauffeur")) return "transportation";
  if (cat.includes("tour") || cat.includes("guide") || cat.includes("excursion")) return "tour_operator";
  if (cat.includes("spa") || cat.includes("wellness") || cat.includes("massage")) return "spa";
  if (cat.includes("club") || cat.includes("nightlife") || cat.includes("disco")) return "club";
  if (cat.includes("boat") || cat.includes("yacht") || cat.includes("charter")) return "boat_charter";
  return "restaurant";
}

function findBestOffer(signals: string[], categoryKey: string): { offer: string; monthlyLoss: { min: number; max: number; explanation: string } } | null {
  const offers = SIGNAL_OFFER_MATRIX[categoryKey];
  if (!offers) return null;
  
  for (const offerConfig of offers) {
    const matchingSignals = offerConfig.signals.filter(s => signals.includes(s.condition));
    if (matchingSignals.length > 0) {
      return { offer: offerConfig.offer, monthlyLoss: offerConfig.monthlyLoss };
    }
  }
  
  if (offers.length > 0) {
    return { offer: offers[0].offer, monthlyLoss: offers[0].monthlyLoss };
  }
  
  return null;
}

function identifyProblem(signals: string[], categoryKey: string, business: Business): string {
  const problemMap: Record<string, string> = {
    no_website: "No web presence - invisible to tourists searching online",
    no_email: "No direct contact channel - losing professional inquiries",
    no_instagram: "No social proof - tourists can't discover or verify you",
    no_whatsapp: "No WhatsApp - missing the #1 communication channel in LATAM",
    low_rating: `Rating of ${business.rating} is hurting bookings - each 0.1 drop = 5-9% revenue loss`,
    low_reviews: `Only ${business.reviewCount} reviews - need 100+ for tourist trust`,
    ota_dependent: "Paying 15-25% OTA commissions on every booking",
    multi_platform: "Managing inquiries across multiple platforms - response delays",
    manual_dispatch: "Manual driver scheduling - missing bookings and idle fleet",
    manual_booking: "Manual booking process - losing off-hours inquiries",
    no_deposit: "No deposit system - no-shows destroying revenue",
    manual_reservations: "Manual reservation handling - VIPs waiting for responses",
    inquiry_overload: "Inquiry response time too slow - clients booking elsewhere",
    no_crm: "No client database - can't scale or remember VIP preferences",
  };
  
  for (const signal of signals) {
    if (problemMap[signal]) {
      return problemMap[signal];
    }
  }
  
  return "Operating without automation - leaving money and time on the table";
}

export function analyzeBusinessSignals(business: Business): SignalAnalysis {
  const signals = detectSignals(business);
  const categoryKey = getCategoryKey(business.category || "");
  
  const offerMatch = findBestOffer(signals, categoryKey);
  const problem = identifyProblem(signals, categoryKey, business);
  
  const hooks = PSYCHOLOGY_HOOKS[categoryKey] || {
    identity: "You're the professional who delivers exceptional experiences",
    fear: "Every missed opportunity is a client going to your competitor",
    desire: "Imagine automated systems handling the work while you focus on service",
    urgency: "Peak season is coming - will you be ready?",
  };
  
  const vertical = VERTICAL_INTELLIGENCE[categoryKey] || {
    painPoints: ["Manual processes", "Missed inquiries", "No automation"],
    hookAngles: ["efficiency", "growth", "automation"],
  };
  
  const monthlyLoss = offerMatch 
    ? Math.round((offerMatch.monthlyLoss.min + offerMatch.monthlyLoss.max) / 2)
    : 3000;
  
  return {
    detectedSignals: signals,
    detectedProblem: problem,
    customOffer: offerMatch?.offer || "AI Automation System for " + (business.category || "your business"),
    monthlyLoss,
    lossExplanation: offerMatch?.monthlyLoss.explanation || "Inefficiency and missed opportunities",
    identityStatement: hooks.identity,
    fearTrigger: hooks.fear,
    desireTrigger: hooks.desire,
    urgencyAngle: hooks.urgency,
    painPoints: vertical.painPoints || [],
    hookAngles: vertical.hookAngles || [],
  };
}

export function generateMultiChannelScripts(
  business: Business,
  analysis: SignalAnalysis,
  senderName: string = "Phil McGill"
): MultiChannelScripts {
  const businessName = business.name || "your business";
  const category = business.category || "your business";
  const city = business.city || "Colombia";
  const shortName = senderName.split(" ")[0];
  
  const whatsappScript = `Hola! Soy ${senderName}. Vi ${businessName} y me encantó lo que hacen.

${analysis.detectedProblem}

Tengo una solución: ${analysis.customOffer}

Esto podría recuperar $${analysis.monthlyLoss.toLocaleString()} USD/mes.

¿Tienes 5 minutos esta semana para mostrarte cómo funciona? Sin compromiso.

— ${senderName}`;

  const phone = business.whatsapp || business.phone || "";
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const whatsappLink = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappScript)}`
    : "";

  const instagramDm = `Hey! ${analysis.identityStatement.replace("You're", "Eres")}

Vi que ${businessName} está haciendo cosas increíbles en ${city}. 

Trabajo con ${category}s para automatizar operaciones y he notado una oportunidad para ti.

${analysis.fearTrigger}

¿Puedo mandarte un voice note de 60 segundos explicando cómo ayudo?

— ${shortName}`;

  const emailSubject = `${businessName}: $${analysis.monthlyLoss.toLocaleString()}/mes en oportunidades perdidas`;
  
  const emailBody = `Hola,

${analysis.identityStatement}.

He estado investigando ${category}s en ${city} y ${businessName} me llamó la atención.

**El Problema que Detecté:**
${analysis.detectedProblem}

**La Solución:**
${analysis.customOffer}

**El Impacto:**
Esto podría recuperar aproximadamente $${analysis.monthlyLoss.toLocaleString()} USD/mes - ${analysis.lossExplanation}.

**Por qué ahora:**
${analysis.urgencyAngle}

¿Tienes 15 minutos esta semana para una llamada rápida? Puedo mostrarte exactamente cómo funcionaría para ${businessName}.

Saludos,
${senderName}
AI Systems for Colombian Hospitality
movvia.co

P.S. ${analysis.fearTrigger}`;

  const followUpDay3 = `Hola de nuevo! 

Solo quería hacer seguimiento sobre mi mensaje anterior.

${analysis.desireTrigger}

¿Vale la pena una conversación rápida de 5 minutos?

— ${shortName}`;

  const followUpDay7 = `Hola!

Sé que estás ocupado/a, pero quería intentar una vez más.

Otros ${category}s en ${city} ya están usando ${analysis.customOffer.toLowerCase().split(" ")[0]} automation y viendo resultados.

${analysis.urgencyAngle}

¿Cuándo sería un buen momento para ti?

— ${senderName}`;

  const followUpDay14 = `Último mensaje, lo prometo!

Si el timing no es el correcto ahora, lo entiendo.

Pero si ${analysis.detectedProblem.toLowerCase()} sigue siendo un problema, estaré aquí.

Solo responde "info" cuando estés listo/a y te cuento todo.

— ${senderName}
AI Systems for Colombian Hospitality`;

  return {
    whatsappScript,
    whatsappLink,
    instagramDm,
    emailSubject,
    emailBody,
    followUpDay3,
    followUpDay7,
    followUpDay14,
  };
}

export function generateUltimateOutreach(business: Business, senderName: string = "Phil McGill") {
  const analysis = analyzeBusinessSignals(business);
  const scripts = generateMultiChannelScripts(business, analysis, senderName);
  
  return {
    business,
    analysis,
    scripts,
  };
}
