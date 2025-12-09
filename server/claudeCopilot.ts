import Anthropic from "@anthropic-ai/sdk";
import {
  PSYCHOLOGY_FRAMEWORKS,
  OBJECTION_PATTERNS,
  VERTICAL_INTELLIGENCE,
  VERTICAL_DEEP_INTEL,
  IDENTITY_TRANSFORMATION,
  BEHAVIORAL_ECONOMICS,
  NEUROSCIENCE_NLP,
  FRAMEWORK_CREDENTIALS,
  type Business,
} from "@shared/schema";

// Use user's Claude API key from secrets, fallback to Replit AI Integrations
const anthropic = new Anthropic({
  apiKey: process.env.Claude_API_ || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.Claude_API_ ? "https://api.anthropic.com" : process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

type PsychologyFramework = keyof typeof PSYCHOLOGY_FRAMEWORKS;
type ObjectionType = keyof typeof OBJECTION_PATTERNS;

interface MultiChannelScripts {
  whatsappScript: string;
  whatsappLink: string;
  instagramDm: string;
  emailSubject: string;
  emailBody: string;
  followUpDay3: string;
  followUpDay7: string;
  followUpDay14: string;
  psychologyFramework: string;
}

interface ObjectionHandlerResult {
  detectedObjection: string;
  framework: string;
  suggestedResponse: string;
  alternativeResponses: string[];
  toneGuidance: string;
}

interface ResponseDraftResult {
  draftResponse: string;
  psychologyUsed: string;
  nextSteps: string[];
  warnings: string[];
}

// NEW: Review Intelligence Result
export interface ReviewIntelligenceResult {
  hooks: string[];
  painPointsDetected: string[];
  positiveThemes: string[];
  negativeThemes: string[];
  competitorMentions: string[];
  ownerResponsiveness: string;
  outreachAngle: string;
  suggestedOpener: string;
}

// NEW: Personalization from IG Content Result
export interface PersonalizationResult {
  contentThemes: string[];
  brandVoice: string;
  targetAudience: string;
  recentActivity: string[];
  hooks: string[];
  personalizedOpener: string;
  doNotMention: string[];
}

// NEW: Proposal Generation Result
export interface ProposalResult {
  executiveSummary: string;
  problemStatement: string;
  solution: {
    name: string;
    description: string;
    features: string[];
  };
  investment: {
    setup: string;
    monthly: string;
    roi: string;
  };
  timeline: string;
  nextSteps: string[];
  guarantees: string[];
}

// NEW: Voice Note Analysis Result
export interface VoiceNoteAnalysisResult {
  transcriptSummary: string;
  sentiment: string;
  keyPoints: string[];
  questionsAsked: string[];
  objections: string[];
  interestLevel: number;
  suggestedResponse: string;
  urgency: string;
}

// NEW: Deep Scan Result with enhanced intelligence
export interface DeepScanResult {
  vertical: string;
  painPoints: string[];
  revenueLeakage: string[];
  recommendedSolutions: {
    starter: { name: string; desc: string; roi: string }[];
    core: { name: string; desc: string; roi: string }[];
    flagship: { name: string; desc: string; roi: string; price_range: string };
  };
  ownerPsychology: {
    fears: string[];
    wants: string[];
    objections: string[];
    leverage: string;
  };
  identityTransformation: {
    current: string;
    aspirational: string;
    gapStatement: string;
    transformation: string;
  };
  urgencyFactors: string[];
  competitorIntel: string[];
}

function getVerticalIntelligence(category: string) {
  return VERTICAL_INTELLIGENCE[category] || VERTICAL_INTELLIGENCE.restaurant;
}

function getVerticalDeepIntel(category: string) {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("bar")) return VERTICAL_DEEP_INTEL.restaurant;
  if (cat.includes("hotel") || cat.includes("hostel") || cat.includes("lodging")) return VERTICAL_DEEP_INTEL.hotel;
  if (cat.includes("concierge")) return VERTICAL_DEEP_INTEL.concierge;
  if (cat.includes("villa") || cat.includes("rental")) return VERTICAL_DEEP_INTEL.villa_rental;
  if (cat.includes("tour") || cat.includes("guide") || cat.includes("excursion")) return VERTICAL_DEEP_INTEL.tour_operator;
  if (cat.includes("spa") || cat.includes("wellness") || cat.includes("massage")) return VERTICAL_DEEP_INTEL.spa;
  if (cat.includes("club") || cat.includes("nightlife") || cat.includes("disco")) return VERTICAL_DEEP_INTEL.club;
  if (cat.includes("boat") || cat.includes("yacht") || cat.includes("charter")) return VERTICAL_DEEP_INTEL.boat_charter;
  return VERTICAL_DEEP_INTEL.restaurant;
}

function getIdentityTransformation(category: string) {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("bar")) return IDENTITY_TRANSFORMATION.identity_triggers_by_vertical.restaurant;
  if (cat.includes("hotel") || cat.includes("hostel") || cat.includes("lodging")) return IDENTITY_TRANSFORMATION.identity_triggers_by_vertical.hotel;
  if (cat.includes("concierge")) return IDENTITY_TRANSFORMATION.identity_triggers_by_vertical.concierge;
  if (cat.includes("villa") || cat.includes("rental")) return IDENTITY_TRANSFORMATION.identity_triggers_by_vertical.villa_rental;
  if (cat.includes("tour") || cat.includes("guide") || cat.includes("excursion")) return IDENTITY_TRANSFORMATION.identity_triggers_by_vertical.tour_operator;
  if (cat.includes("spa") || cat.includes("wellness") || cat.includes("massage")) return IDENTITY_TRANSFORMATION.identity_triggers_by_vertical.spa;
  if (cat.includes("club") || cat.includes("nightlife") || cat.includes("disco")) return IDENTITY_TRANSFORMATION.identity_triggers_by_vertical.club;
  if (cat.includes("boat") || cat.includes("yacht") || cat.includes("charter")) return IDENTITY_TRANSFORMATION.identity_triggers_by_vertical.boat_charter;
  return IDENTITY_TRANSFORMATION.identity_triggers_by_vertical.restaurant;
}

function selectPsychologyFramework(business: Business): PsychologyFramework {
  const score = business.aiScore || 50;
  const hasWebsite = !!business.website;
  const hasInstagram = !!business.instagram;
  
  if (score >= 70 && hasWebsite) {
    return "loss_aversion";
  } else if (score >= 50 || hasInstagram) {
    return "social_proof";
  } else if (score < 40) {
    return "reciprocity";
  }
  return "scarcity";
}

function formatWhatsAppLink(phone: string | null, message: string): string {
  if (!phone) return "";
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export async function generateMultiChannelScripts(
  business: Business,
  framework?: PsychologyFramework
): Promise<MultiChannelScripts> {
  const selectedFramework = framework || selectPsychologyFramework(business);
  const psychologyData = PSYCHOLOGY_FRAMEWORKS[selectedFramework];
  const verticalData = getVerticalIntelligence(business.category);

  const systemPrompt = `You are a sales copywriter specializing in B2B outreach to Colombian hospitality businesses.
Your messages MUST be in Spanish (Colombia dialect).
You use the "${psychologyData.name}" psychology framework: ${psychologyData.description}

Business Context:
- Name: ${business.name}
- Category: ${business.category}
- City: ${business.city}
- AI Score: ${business.aiScore || "unknown"}/100
- Has Website: ${business.website ? "Yes" : "No"}
- Has Instagram: ${business.instagram ? "Yes" : "No"}

Industry Pain Points:
${verticalData.painPoints.map((p) => `- ${p}`).join("\n")}

Possible Automations:
${verticalData.automations.map((a) => `- ${a}`).join("\n")}

Hook Angles to Use:
${verticalData.hookAngles.map((h) => `- ${h}`).join("\n")}

Example Templates (adapt these):
${psychologyData.spanish_templates.map((t) => `- ${t}`).join("\n")}`;

  const userPrompt = `Generate multi-channel outreach scripts for ${business.name}. 
Return a JSON object with these exact keys:
{
  "whatsapp": "25-40 word WhatsApp message, casual but professional, loss-framed opener, NO emojis",
  "instagram": "15-25 word Instagram DM, very casual, curiosity-driven, NO emojis", 
  "email_subject": "Short email subject line, 5-8 words",
  "email_body": "150-200 word email body, professional but friendly",
  "followup_day3": "Short follow-up WhatsApp message for day 3 if no response",
  "followup_day7": "Value-add follow-up for day 7, share insight or case study",
  "followup_day14": "Final attempt for day 14, different angle or offer"
}

IMPORTANT:
- All text in Spanish (Colombian)
- NO emojis anywhere
- Use business name naturally
- Reference their specific pain points
- Keep WhatsApp under 40 words (people read on phones)`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const scripts = JSON.parse(jsonMatch[0]);

    return {
      whatsappScript: scripts.whatsapp,
      whatsappLink: formatWhatsAppLink(business.phone || business.whatsapp, scripts.whatsapp),
      instagramDm: scripts.instagram,
      emailSubject: scripts.email_subject,
      emailBody: scripts.email_body,
      followUpDay3: scripts.followup_day3,
      followUpDay7: scripts.followup_day7,
      followUpDay14: scripts.followup_day14,
      psychologyFramework: selectedFramework,
    };
  } catch (error) {
    console.error("Error generating multi-channel scripts:", error);
    throw error;
  }
}

export async function handleObjection(
  theirMessage: string,
  business: Business,
  conversationHistory?: string
): Promise<ObjectionHandlerResult> {
  let detectedObjection: ObjectionType | null = null;
  const lowerMessage = theirMessage.toLowerCase();

  for (const [objType, data] of Object.entries(OBJECTION_PATTERNS)) {
    if (data.triggers.some((trigger) => lowerMessage.includes(trigger))) {
      detectedObjection = objType as ObjectionType;
      break;
    }
  }

  const objectionData = detectedObjection 
    ? OBJECTION_PATTERNS[detectedObjection]
    : OBJECTION_PATTERNS.not_now;
  
  const frameworkData = PSYCHOLOGY_FRAMEWORKS[objectionData.framework as PsychologyFramework];
  const verticalData = getVerticalIntelligence(business.category);

  const systemPrompt = `You are a sales psychology expert helping handle objections from Colombian business owners.
You must respond in Spanish (Colombia).
You use the "${frameworkData.name}" framework: ${frameworkData.description}

Business Context:
- Name: ${business.name}
- Category: ${business.category}
- City: ${business.city}

Objection Type Detected: ${detectedObjection || "general_hesitation"}
Response Angles to Consider:
${objectionData.response_angles.map((a) => `- ${a}`).join("\n")}

Industry Pain Points to Reference:
${verticalData.painPoints.slice(0, 3).map((p) => `- ${p}`).join("\n")}`;

  const userPrompt = `The prospect said: "${theirMessage}"
${conversationHistory ? `\nConversation history:\n${conversationHistory}` : ""}

Generate objection handling response. Return JSON:
{
  "main_response": "Your suggested response in Spanish, 20-40 words, empathetic but persistent",
  "alternative_1": "Alternative response option 1",
  "alternative_2": "Alternative response option 2", 
  "tone_guidance": "Brief guidance on tone and delivery"
}

Keep responses conversational for WhatsApp. No emojis.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      detectedObjection: detectedObjection || "general_hesitation",
      framework: objectionData.framework,
      suggestedResponse: result.main_response,
      alternativeResponses: [result.alternative_1, result.alternative_2],
      toneGuidance: result.tone_guidance,
    };
  } catch (error) {
    console.error("Error handling objection:", error);
    throw error;
  }
}

export async function draftResponse(
  theirMessage: string,
  business: Business,
  conversationHistory?: string,
  intent?: string
): Promise<ResponseDraftResult> {
  const verticalData = getVerticalIntelligence(business.category);
  const framework = selectPsychologyFramework(business);
  const frameworkData = PSYCHOLOGY_FRAMEWORKS[framework];

  const systemPrompt = `You are a sales assistant helping respond to Colombian business owners via WhatsApp/Instagram.
Respond in Spanish (Colombia). Keep responses conversational and brief (WhatsApp format).

Business Context:
- Name: ${business.name}
- Category: ${business.category}
- City: ${business.city}
- AI Score: ${business.aiScore || "unknown"}/100

Psychology Framework: ${frameworkData.name} - ${frameworkData.description}

Industry Pain Points:
${verticalData.painPoints.map((p) => `- ${p}`).join("\n")}

Key Automations We Offer:
${verticalData.automations.slice(0, 3).map((a) => `- ${a}`).join("\n")}`;

  const userPrompt = `They said: "${theirMessage}"
${conversationHistory ? `\nPrevious conversation:\n${conversationHistory}` : ""}
${intent ? `\nYour goal for this response: ${intent}` : ""}

Draft a response and provide guidance. Return JSON:
{
  "response": "Your drafted response in Spanish, 15-40 words for WhatsApp/DM",
  "psychology_used": "Brief explanation of the psychology principle applied",
  "next_steps": ["Step 1 after sending this", "Step 2"],
  "warnings": ["Any risks or things to watch for"]
}

No emojis. Keep it natural and human.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      draftResponse: result.response,
      psychologyUsed: result.psychology_used,
      nextSteps: result.next_steps || [],
      warnings: result.warnings || [],
    };
  } catch (error) {
    console.error("Error drafting response:", error);
    throw error;
  }
}

export async function analyzeConversation(
  conversationHistory: string,
  business: Business
): Promise<{
  sentiment: string;
  buyingSignals: string[];
  objections: string[];
  nextAction: string;
  closingOpportunity: number;
}> {
  const systemPrompt = `You are a sales analyst reviewing WhatsApp/Instagram conversations with Colombian business owners.
Analyze the conversation and provide actionable insights.`;

  const userPrompt = `Analyze this conversation with ${business.name} (${business.category} in ${business.city}):

${conversationHistory}

Return JSON:
{
  "sentiment": "positive/neutral/negative/interested/skeptical",
  "buying_signals": ["List of positive buying indicators"],
  "objections": ["List of objections or concerns raised"],
  "next_action": "Recommended next step",
  "closing_opportunity": 0-100 score for likelihood of closing
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      sentiment: result.sentiment,
      buyingSignals: result.buying_signals || [],
      objections: result.objections || [],
      nextAction: result.next_action,
      closingOpportunity: result.closing_opportunity || 50,
    };
  } catch (error) {
    console.error("Error analyzing conversation:", error);
    throw error;
  }
}

// NEW: Review Intelligence - Analyze Google reviews for outreach hooks
export async function analyzeReviews(
  business: Business,
  reviews: string[]
): Promise<ReviewIntelligenceResult> {
  const verticalData = getVerticalDeepIntel(business.category);
  
  const systemPrompt = `You are a sales intelligence analyst specializing in mining Google reviews for outreach opportunities.
Your goal is to find HOOKS - specific things mentioned in reviews that can be used to personalize outreach.

Business Context:
- Name: ${business.name}
- Category: ${business.category}
- City: ${business.city}
- Rating: ${business.rating || "unknown"}

Common pain points for this vertical:
${verticalData.pain_points.slice(0, 5).map((p) => `- ${p}`).join("\n")}

Owner psychology insights:
- Fears: ${verticalData.owner_psychology.fears.slice(0, 2).join(", ")}
- Wants: ${verticalData.owner_psychology.wants.slice(0, 2).join(", ")}`;

  const userPrompt = `Analyze these Google reviews for ${business.name} and extract outreach intelligence:

${reviews.map((r, i) => `Review ${i + 1}: ${r}`).join("\n\n")}

Return JSON:
{
  "hooks": ["Specific details from reviews that can be used as conversation starters"],
  "pain_points_detected": ["Pain points visible in reviews (service delays, booking issues, etc.)"],
  "positive_themes": ["What customers love that we should acknowledge"],
  "negative_themes": ["Recurring complaints that suggest automation opportunities"],
  "competitor_mentions": ["Any competitors mentioned in reviews"],
  "owner_responsiveness": "Analysis of how owner responds to reviews (fast/slow, defensive/professional)",
  "outreach_angle": "Best angle for outreach based on review analysis",
  "suggested_opener": "A personalized Spanish opener that references something specific from reviews"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      hooks: result.hooks || [],
      painPointsDetected: result.pain_points_detected || [],
      positiveThemes: result.positive_themes || [],
      negativeThemes: result.negative_themes || [],
      competitorMentions: result.competitor_mentions || [],
      ownerResponsiveness: result.owner_responsiveness || "unknown",
      outreachAngle: result.outreach_angle || "",
      suggestedOpener: result.suggested_opener || "",
    };
  } catch (error) {
    console.error("Error analyzing reviews:", error);
    throw error;
  }
}

// NEW: Personalization from Instagram Content
export async function personalizeFromInstagram(
  business: Business,
  instagramContent: {
    bio?: string;
    recentPosts?: string[];
    followerCount?: number;
    postFrequency?: string;
  }
): Promise<PersonalizationResult> {
  const verticalData = getVerticalDeepIntel(business.category);
  const identityData = getIdentityTransformation(business.category);
  
  const systemPrompt = `You are a social media analyst extracting personalization hooks from Instagram content.
Your goal is to understand their brand voice and find specific details for personalized outreach.

Business Context:
- Name: ${business.name}
- Category: ${business.category}
- City: ${business.city}

Identity Transformation Insights:
- Current State: ${identityData.current}
- Aspirational State: ${identityData.aspirational}
- Gap Statement: ${identityData.gap_statement}`;

  const userPrompt = `Analyze this Instagram content for ${business.name}:

Bio: ${instagramContent.bio || "Not available"}
Followers: ${instagramContent.followerCount || "Unknown"}
Post Frequency: ${instagramContent.postFrequency || "Unknown"}

Recent Posts:
${(instagramContent.recentPosts || []).map((p, i) => `Post ${i + 1}: ${p}`).join("\n")}

Return JSON:
{
  "content_themes": ["Main themes/topics they post about"],
  "brand_voice": "Description of their brand voice (casual, professional, luxury, etc.)",
  "target_audience": "Who they seem to be targeting",
  "recent_activity": ["Notable recent activities, events, promotions"],
  "hooks": ["Specific details from IG that can be used in outreach"],
  "personalized_opener": "A Spanish opener that references something specific from their IG",
  "do_not_mention": ["Topics to avoid based on their content"]
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1536,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      contentThemes: result.content_themes || [],
      brandVoice: result.brand_voice || "",
      targetAudience: result.target_audience || "",
      recentActivity: result.recent_activity || [],
      hooks: result.hooks || [],
      personalizedOpener: result.personalized_opener || "",
      doNotMention: result.do_not_mention || [],
    };
  } catch (error) {
    console.error("Error personalizing from Instagram:", error);
    throw error;
  }
}

// NEW: Proposal Generation
export async function generateProposal(
  business: Business,
  selectedTier: "starter" | "core" | "flagship" = "core"
): Promise<ProposalResult> {
  const verticalData = getVerticalDeepIntel(business.category);
  const identityData = getIdentityTransformation(business.category);
  const solutions = verticalData.ai_solutions;
  
  const selectedSolution = selectedTier === "flagship" 
    ? solutions.flagship
    : selectedTier === "starter"
    ? solutions.starter[0]
    : solutions.core[0];

  const systemPrompt = `You are a sales proposal writer creating compelling proposals for Colombian hospitality businesses.
Your proposals combine psychology, ROI calculation, and clear next steps.

Business Context:
- Name: ${business.name}
- Category: ${business.category}
- City: ${business.city}
- Rating: ${business.rating || "unknown"}
- Review Count: ${business.reviewCount || "unknown"}

${FRAMEWORK_CREDENTIALS.credibility_statements[0]}

Identity Transformation:
- Current: ${identityData.current}
- Aspirational: ${identityData.aspirational}
- Transformation: ${identityData.transformation}

Psychology Principles to Apply:
- Loss Aversion: ${BEHAVIORAL_ECONOMICS.loss_aversion.principle}
- Social Proof: ${BEHAVIORAL_ECONOMICS.social_proof.principle}
- Scarcity: ${BEHAVIORAL_ECONOMICS.scarcity_effect.principle}`;

  const userPrompt = `Generate a proposal for ${business.name} for this solution:
Solution: ${JSON.stringify(selectedSolution)}

Revenue Leakage Points:
${verticalData.revenue_leakage.map((r) => `- ${r}`).join("\n")}

Return JSON:
{
  "executive_summary": "2-3 sentence summary of the problem and solution, using loss aversion framing",
  "problem_statement": "Detailed problem statement with specific numbers and pain points",
  "solution": {
    "name": "Solution name",
    "description": "What it does and how",
    "features": ["Feature 1", "Feature 2", "Feature 3"]
  },
  "investment": {
    "setup": "One-time setup cost",
    "monthly": "Monthly cost",
    "roi": "Expected ROI or savings"
  },
  "timeline": "Implementation timeline",
  "next_steps": ["Step 1", "Step 2", "Step 3"],
  "guarantees": ["Guarantee 1", "Guarantee 2"]
}

Write in professional Spanish.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      executiveSummary: result.executive_summary || "",
      problemStatement: result.problem_statement || "",
      solution: result.solution || { name: "", description: "", features: [] },
      investment: result.investment || { setup: "", monthly: "", roi: "" },
      timeline: result.timeline || "",
      nextSteps: result.next_steps || [],
      guarantees: result.guarantees || [],
    };
  } catch (error) {
    console.error("Error generating proposal:", error);
    throw error;
  }
}

// NEW: Voice Note Analysis
export async function analyzeVoiceNote(
  business: Business,
  transcript: string
): Promise<VoiceNoteAnalysisResult> {
  const verticalData = getVerticalDeepIntel(business.category);
  
  const systemPrompt = `You are a sales analyst reviewing voice note transcripts from prospects.
Your goal is to identify sentiment, key points, objections, and craft the perfect response.

Business Context:
- Name: ${business.name}
- Category: ${business.category}
- City: ${business.city}

Owner Psychology Insights:
- Common Fears: ${verticalData.owner_psychology.fears.join(", ")}
- Common Objections: ${verticalData.owner_psychology.objections.join(", ")}
- Leverage Point: ${verticalData.owner_psychology.leverage}`;

  const userPrompt = `Analyze this voice note transcript from ${business.name}:

"${transcript}"

Return JSON:
{
  "transcript_summary": "Brief summary of what they said",
  "sentiment": "positive/neutral/negative/interested/skeptical/frustrated",
  "key_points": ["Main points they made"],
  "questions_asked": ["Questions they asked that need answers"],
  "objections": ["Objections or concerns raised"],
  "interest_level": 0-100,
  "suggested_response": "Draft response in Spanish addressing their points (for WhatsApp voice note or text)",
  "urgency": "high/medium/low - how quickly should we respond"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1536,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      transcriptSummary: result.transcript_summary || "",
      sentiment: result.sentiment || "neutral",
      keyPoints: result.key_points || [],
      questionsAsked: result.questions_asked || [],
      objections: result.objections || [],
      interestLevel: result.interest_level || 50,
      suggestedResponse: result.suggested_response || "",
      urgency: result.urgency || "medium",
    };
  } catch (error) {
    console.error("Error analyzing voice note:", error);
    throw error;
  }
}

// NEW: Deep Scan - Enhanced vertical intelligence
export function deepScan(business: Business): DeepScanResult {
  const verticalData = getVerticalDeepIntel(business.category);
  const identityData = getIdentityTransformation(business.category);
  
  // Generate urgency factors based on current date and business context
  const now = new Date();
  const month = now.getMonth();
  const urgencyFactors: string[] = [];
  
  // Seasonal urgency
  if (month >= 10 || month <= 1) {
    urgencyFactors.push("High season is here - every day without automation costs real money");
  } else if (month >= 8 && month <= 10) {
    urgencyFactors.push("High season starts in weeks - implementation takes time");
  }
  
  // Review-based urgency
  if (business.rating && business.rating < 4.0) {
    urgencyFactors.push("Low rating is actively hurting bookings right now");
  }
  if (business.reviewCount && business.reviewCount < 50) {
    urgencyFactors.push("Not enough reviews for tourist trust - need review automation");
  }
  
  // Digital presence urgency
  if (!business.website) {
    urgencyFactors.push("No website means invisible to online searches");
  }
  if (!business.instagram) {
    urgencyFactors.push("No Instagram means no social proof for tourists");
  }
  
  // Competitor intel based on city
  const competitorIntel: string[] = [];
  if (business.city?.toLowerCase().includes("cartagena")) {
    competitorIntel.push("Top Cartagena venues are rapidly adopting AI automation");
    competitorIntel.push("Walled City competition is fierce - differentiation is key");
  } else if (business.city?.toLowerCase().includes("medellin")) {
    competitorIntel.push("Medellin's digital nomad scene expects instant responses");
    competitorIntel.push("Younger operators are tech-savvy and adopting automation");
  }
  
  return {
    vertical: business.category || "restaurant",
    painPoints: verticalData.pain_points,
    revenueLeakage: verticalData.revenue_leakage,
    recommendedSolutions: verticalData.ai_solutions,
    ownerPsychology: verticalData.owner_psychology,
    identityTransformation: {
      current: identityData.current,
      aspirational: identityData.aspirational,
      gapStatement: identityData.gap_statement,
      transformation: identityData.transformation,
    },
    urgencyFactors,
    competitorIntel,
  };
}

// ==========================================
// ADVANCED PYTHON CLI FEATURES - PORTED
// ==========================================

// Decision Maker Profiler Result
export interface DecisionMakerProfileResult {
  ownerArchetype: string;
  communicationStyle: string;
  decisionDrivers: string[];
  riskTolerance: "conservative" | "moderate" | "aggressive";
  buyingTimeline: string;
  influencers: string[];
  negotiationStyle: string;
  hotButtons: string[];
  turnoffs: string[];
  bestApproach: string;
  openingLine: string;
}

// Financial Leak Calculator Result
export interface FinancialLeakResult {
  totalMonthlyLeak: number;
  leakBreakdown: {
    category: string;
    amount: number;
    explanation: string;
    fixPriority: "critical" | "high" | "medium" | "low";
  }[];
  annualImpact: number;
  competitorAdvantage: string;
  quickWins: string[];
  roiIfFixed: string;
}

// ROI Timeline Result
export interface ROITimelineResult {
  implementationWeeks: number;
  milestones: {
    week: number;
    milestone: string;
    expectedOutcome: string;
    roiContribution: number;
  }[];
  breakEvenPoint: string;
  monthlyROI: {
    month: number;
    cumulativeInvestment: number;
    cumulativeSavings: number;
    netPosition: number;
  }[];
  yearOneProjection: number;
  yearThreeProjection: number;
}

// Competitor Ghost Mirror Result
export interface CompetitorGhostMirrorResult {
  competitorActions: {
    action: string;
    impact: string;
    adoptionRate: string;
  }[];
  marketGaps: string[];
  differentiationOpportunities: string[];
  urgentThreats: string[];
  catchUpActions: string[];
  leapfrogStrategies: string[];
}

// Greed Trigger Engine Result
export interface GreedTriggerResult {
  primaryTrigger: string;
  monetaryHook: string;
  statusHook: string;
  freedomHook: string;
  exclusivityHook: string;
  fomoPitch: string;
  successStoryAngle: string;
  numbersToMention: string[];
  closingGreedStatement: string;
}

// Offer Mutation Engine Result
export interface OfferMutationResult {
  baseOffer: string;
  mutations: {
    variant: string;
    description: string;
    priceAnchor: string;
    urgencyElement: string;
    targetProfile: string;
  }[];
  recommendedMutation: string;
  pricingStrategy: string;
  bonusStack: string[];
  guaranteeFraming: string;
  scarcityElement: string;
}

// Decision Maker Profiler - Profile the business owner based on signals
export function profileDecisionMaker(business: Business): DecisionMakerProfileResult {
  const category = business.category?.toLowerCase() || "";
  const hasWebsite = !!business.website;
  const hasInstagram = !!business.instagram;
  const rating = business.rating || 4.0;
  const reviewCount = business.reviewCount || 0;
  const priceLevel = business.priceLevel || 2;

  // Determine owner archetype based on business signals
  let ownerArchetype = "The Pragmatic Operator";
  let communicationStyle = "Direct and business-focused";
  let riskTolerance: "conservative" | "moderate" | "aggressive" = "moderate";
  let negotiationStyle = "Value-focused";

  if (priceLevel >= 3 && rating >= 4.5) {
    ownerArchetype = "The Premium Brand Builder";
    communicationStyle = "Sophisticated, quality-focused";
    riskTolerance = "moderate";
    negotiationStyle = "Quality over price";
  } else if (!hasWebsite && !hasInstagram) {
    ownerArchetype = "The Traditional Operator";
    communicationStyle = "Conservative, proof-heavy";
    riskTolerance = "conservative";
    negotiationStyle = "Risk-averse, needs guarantees";
  } else if (hasInstagram && reviewCount > 100) {
    ownerArchetype = "The Growth-Focused Entrepreneur";
    communicationStyle = "Fast-paced, results-oriented";
    riskTolerance = "aggressive";
    negotiationStyle = "Speed over perfection";
  } else if (category.includes("hotel") || category.includes("villa")) {
    ownerArchetype = "The Hospitality Professional";
    communicationStyle = "Guest experience focused";
    riskTolerance = "moderate";
    negotiationStyle = "ROI and guest satisfaction";
  }

  // Decision drivers based on profile
  const decisionDrivers: string[] = [];
  if (riskTolerance === "conservative") {
    decisionDrivers.push("Proven track record", "Risk mitigation", "Step-by-step approach");
  } else if (riskTolerance === "aggressive") {
    decisionDrivers.push("Speed to market", "Competitive advantage", "Growth potential");
  } else {
    decisionDrivers.push("Clear ROI", "Peer validation", "Balanced approach");
  }

  // Determine buying timeline
  let buyingTimeline = "30-60 days";
  if (riskTolerance === "aggressive") buyingTimeline = "1-2 weeks";
  if (riskTolerance === "conservative") buyingTimeline = "60-90 days";

  // Hot buttons based on vertical
  const hotButtons: string[] = [];
  const turnoffs: string[] = [];
  
  if (category.includes("restaurant")) {
    hotButtons.push("Staff efficiency", "Peak hour coverage", "Review management");
    turnoffs.push("Complicated tech", "Long implementation", "Hidden fees");
  } else if (category.includes("hotel")) {
    hotButtons.push("Guest experience", "OTA commission reduction", "Direct bookings");
    turnoffs.push("Guest data concerns", "Integration complexity", "Brand inconsistency");
  } else if (category.includes("tour")) {
    hotButtons.push("Off-hours bookings", "Multi-language support", "No-show reduction");
    turnoffs.push("Loss of personal touch", "Generic responses", "Upfront costs");
  } else {
    hotButtons.push("Time savings", "Revenue increase", "Customer satisfaction");
    turnoffs.push("Overpromising", "Hidden complexity", "Lack of support");
  }

  // Best approach based on archetype
  const approachMap: Record<string, string> = {
    "The Premium Brand Builder": "Lead with quality and brand elevation, emphasize exclusivity",
    "The Traditional Operator": "Start with small win, show proof from similar businesses, offer guarantee",
    "The Growth-Focused Entrepreneur": "Lead with speed and competitive advantage, show quick results",
    "The Hospitality Professional": "Focus on guest experience improvement and operational efficiency",
    "The Pragmatic Operator": "Lead with clear ROI and practical benefits, be direct",
  };

  const openingLineMap: Record<string, string> = {
    "The Premium Brand Builder": "Vi que manejas una operacion premium - te cuento como otros en tu nivel estan automatizando sin perder el toque personal",
    "The Traditional Operator": "Entiendo que tienes un negocio establecido - te muestro una forma simple de capturar clientes que hoy se te escapan",
    "The Growth-Focused Entrepreneur": "Estas creciendo rapido - te muestro como escalar sin triplicar tu equipo",
    "The Hospitality Professional": "Tus huespedes merecen respuestas inmediatas 24/7 - te cuento como lograrlo",
    "The Pragmatic Operator": "Tengo una solucion que te ahorra X horas a la semana - te muestro los numeros",
  };

  return {
    ownerArchetype,
    communicationStyle,
    decisionDrivers,
    riskTolerance,
    buyingTimeline,
    influencers: ["Business partner", "Key staff members", "Family (for family businesses)"],
    negotiationStyle,
    hotButtons,
    turnoffs,
    bestApproach: approachMap[ownerArchetype] || approachMap["The Pragmatic Operator"],
    openingLine: openingLineMap[ownerArchetype] || openingLineMap["The Pragmatic Operator"],
  };
}

// Financial Leak Calculator - Detailed breakdown of revenue leakage
export function calculateFinancialLeaks(business: Business): FinancialLeakResult {
  const category = business.category?.toLowerCase() || "";
  const hasWebsite = !!business.website;
  const hasInstagram = !!business.instagram;
  const hasWhatsapp = !!business.whatsapp;
  const rating = business.rating || 4.0;
  const reviewCount = business.reviewCount || 0;
  const priceLevel = business.priceLevel || 2;

  const leakBreakdown: FinancialLeakResult["leakBreakdown"] = [];
  
  // Base monthly revenue estimation by vertical and price level
  const baseRevenueMap: Record<string, number> = {
    restaurant: 15000 + (priceLevel * 10000),
    hotel: 30000 + (priceLevel * 20000),
    tour_operator: 12000 + (priceLevel * 8000),
    spa: 10000 + (priceLevel * 5000),
    club: 25000 + (priceLevel * 15000),
    boat_charter: 20000 + (priceLevel * 25000),
    concierge: 15000 + (priceLevel * 10000),
    villa_rental: 25000 + (priceLevel * 30000),
  };

  const verticalKey = category.includes("restaurant") ? "restaurant" :
    category.includes("hotel") ? "hotel" :
    category.includes("tour") ? "tour_operator" :
    category.includes("spa") ? "spa" :
    category.includes("club") ? "club" :
    category.includes("boat") || category.includes("yacht") ? "boat_charter" :
    category.includes("concierge") ? "concierge" :
    category.includes("villa") ? "villa_rental" : "restaurant";

  const baseRevenue = baseRevenueMap[verticalKey] || 15000;

  // Calculate leaks based on signals
  if (!hasWebsite) {
    leakBreakdown.push({
      category: "No Web Presence",
      amount: Math.round(baseRevenue * 0.15),
      explanation: "15% of potential customers search online before visiting - invisible to these searches",
      fixPriority: "critical",
    });
  }

  if (!hasInstagram) {
    leakBreakdown.push({
      category: "No Social Proof",
      amount: Math.round(baseRevenue * 0.10),
      explanation: "Tourists check Instagram before booking - no profile means lost trust and bookings",
      fixPriority: "high",
    });
  }

  if (!hasWhatsapp) {
    leakBreakdown.push({
      category: "No WhatsApp Channel",
      amount: Math.round(baseRevenue * 0.08),
      explanation: "WhatsApp is the #1 communication channel in LATAM - missing direct inquiries",
      fixPriority: "critical",
    });
  }

  if (rating < 4.0) {
    const ratingLoss = (4.0 - rating) * 0.08;
    leakBreakdown.push({
      category: "Low Rating Impact",
      amount: Math.round(baseRevenue * ratingLoss),
      explanation: `Each 0.1 star below 4.0 costs 5-8% of potential bookings - current ${rating} rating is hurting`,
      fixPriority: "critical",
    });
  }

  if (reviewCount < 50) {
    leakBreakdown.push({
      category: "Insufficient Reviews",
      amount: Math.round(baseRevenue * 0.07),
      explanation: "Tourists trust businesses with 100+ reviews - below 50 signals uncertainty",
      fixPriority: "medium",
    });
  }

  // Vertical-specific leaks
  if (verticalKey === "hotel") {
    leakBreakdown.push({
      category: "OTA Commission Bleed",
      amount: Math.round(baseRevenue * 0.20),
      explanation: "Paying 15-25% to Booking.com/Expedia for bookings you could get direct",
      fixPriority: "critical",
    });
  }

  if (verticalKey === "restaurant" || verticalKey === "spa") {
    leakBreakdown.push({
      category: "Off-Hours Inquiry Loss",
      amount: Math.round(baseRevenue * 0.12),
      explanation: "No way to capture reservations when staff isn't available",
      fixPriority: "high",
    });
  }

  if (verticalKey === "tour_operator" || verticalKey === "boat_charter") {
    leakBreakdown.push({
      category: "Slow Response Loss",
      amount: Math.round(baseRevenue * 0.18),
      explanation: "Tourists book the first operator to respond - every hour delay = lost booking",
      fixPriority: "critical",
    });
  }

  if (verticalKey === "spa" || verticalKey === "restaurant") {
    leakBreakdown.push({
      category: "No-Show Revenue Loss",
      amount: Math.round(baseRevenue * 0.05),
      explanation: "No deposit or reminder system means 5-10% no-show rate",
      fixPriority: "medium",
    });
  }

  const totalMonthlyLeak = leakBreakdown.reduce((sum, leak) => sum + leak.amount, 0);
  const annualImpact = totalMonthlyLeak * 12;

  // Quick wins
  const quickWins: string[] = [];
  const criticalLeaks = leakBreakdown.filter(l => l.fixPriority === "critical");
  if (criticalLeaks.length > 0) {
    quickWins.push(`Fix ${criticalLeaks[0].category} first - biggest immediate impact`);
  }
  if (!hasWhatsapp) {
    quickWins.push("Add WhatsApp Business - 1 day setup, immediate results");
  }
  if (reviewCount < 50) {
    quickWins.push("Implement review request automation - compound growth");
  }

  return {
    totalMonthlyLeak,
    leakBreakdown,
    annualImpact,
    competitorAdvantage: `Competitors fixing these leaks are capturing $${totalMonthlyLeak.toLocaleString()}/month that should be yours`,
    quickWins,
    roiIfFixed: `$${Math.round(totalMonthlyLeak * 0.6).toLocaleString()}-$${Math.round(totalMonthlyLeak * 0.8).toLocaleString()}/month recoverable with automation`,
  };
}

// ROI Timeline Generator - Week-by-week projection
export function generateROITimeline(business: Business, investmentAmount: number = 2000): ROITimelineResult {
  const category = business.category?.toLowerCase() || "";
  const leaks = calculateFinancialLeaks(business);
  
  // Implementation timeline by complexity
  let implementationWeeks = 4;
  if (category.includes("hotel") || category.includes("villa")) {
    implementationWeeks = 6;
  } else if (category.includes("restaurant") || category.includes("cafe")) {
    implementationWeeks = 3;
  }

  const monthlySavings = Math.round(leaks.totalMonthlyLeak * 0.7);
  const weeklyBenefit = Math.round(monthlySavings / 4);

  const milestones = [
    {
      week: 1,
      milestone: "System setup and integration",
      expectedOutcome: "Infrastructure ready, team trained",
      roiContribution: 0,
    },
    {
      week: 2,
      milestone: "Soft launch with test inquiries",
      expectedOutcome: "First automated responses going out",
      roiContribution: Math.round(weeklyBenefit * 0.3),
    },
    {
      week: 3,
      milestone: "Full automation live",
      expectedOutcome: "24/7 response capability active",
      roiContribution: Math.round(weeklyBenefit * 0.6),
    },
    {
      week: 4,
      milestone: "Optimization based on data",
      expectedOutcome: "Refined messaging, improved conversion",
      roiContribution: Math.round(weeklyBenefit * 0.8),
    },
    {
      week: 6,
      milestone: "Full velocity reached",
      expectedOutcome: "Maximum efficiency, team focus on high-value tasks",
      roiContribution: weeklyBenefit,
    },
    {
      week: 8,
      milestone: "Expansion phase",
      expectedOutcome: "Adding new channels, scaling successful strategies",
      roiContribution: Math.round(weeklyBenefit * 1.2),
    },
  ];

  // Monthly ROI projection
  const monthlyROI = [];
  let cumulativeInvestment = investmentAmount;
  let cumulativeSavings = 0;
  const monthlyFee = investmentAmount * 0.15; // 15% monthly maintenance

  for (let month = 1; month <= 12; month++) {
    cumulativeInvestment += monthlyFee;
    const monthSavings = month === 1 ? monthlySavings * 0.5 : monthlySavings * (month < 3 ? 0.8 : 1);
    cumulativeSavings += monthSavings;
    
    monthlyROI.push({
      month,
      cumulativeInvestment: Math.round(cumulativeInvestment),
      cumulativeSavings: Math.round(cumulativeSavings),
      netPosition: Math.round(cumulativeSavings - cumulativeInvestment),
    });
  }

  const breakEvenMonth = monthlyROI.findIndex(m => m.netPosition > 0) + 1;

  return {
    implementationWeeks,
    milestones: milestones.filter(m => m.week <= implementationWeeks + 4),
    breakEvenPoint: `Month ${breakEvenMonth || 3}`,
    monthlyROI,
    yearOneProjection: monthlyROI[11]?.netPosition || 0,
    yearThreeProjection: Math.round((monthlySavings * 36) - (investmentAmount + monthlyFee * 36)),
  };
}

// Competitor Ghost Mirror - What competitors are doing that you're not
export function mirrorCompetitors(business: Business): CompetitorGhostMirrorResult {
  const category = business.category?.toLowerCase() || "";
  const city = business.city?.toLowerCase() || "";
  const hasWebsite = !!business.website;
  const hasInstagram = !!business.instagram;
  const hasWhatsapp = !!business.whatsapp;

  const competitorActions: CompetitorGhostMirrorResult["competitorActions"] = [];
  const marketGaps: string[] = [];
  const differentiationOpportunities: string[] = [];
  const urgentThreats: string[] = [];
  const catchUpActions: string[] = [];
  const leapfrogStrategies: string[] = [];

  // City-specific competitor intelligence
  if (city.includes("cartagena")) {
    competitorActions.push({
      action: "WhatsApp Business API with chatbot",
      impact: "Instant response to tourist inquiries 24/7",
      adoptionRate: "40% of top-rated venues",
    });
    competitorActions.push({
      action: "Instagram booking integration",
      impact: "Direct bookings from profile",
      adoptionRate: "60% of premium venues",
    });
    if (!hasInstagram) {
      urgentThreats.push("Walled City venues are dominating Instagram discovery - you're invisible");
    }
  }

  if (city.includes("medellin")) {
    competitorActions.push({
      action: "Multi-language chatbot (EN/ES)",
      impact: "Capturing digital nomad market",
      adoptionRate: "35% of tourist-facing businesses",
    });
    competitorActions.push({
      action: "Google Business optimization",
      impact: "Higher visibility in local searches",
      adoptionRate: "70% of successful businesses",
    });
    urgentThreats.push("Medellin's tech-savvy operators are moving fast on AI adoption");
  }

  // Category-specific competitor actions
  if (category.includes("restaurant")) {
    competitorActions.push({
      action: "Automated reservation system",
      impact: "Zero missed bookings, reduced staff load",
      adoptionRate: "50% of high-end restaurants",
    });
    if (!hasWhatsapp) {
      catchUpActions.push("Implement WhatsApp ordering - your competitors offer this");
    }
    leapfrogStrategies.push("AI-powered menu recommendations based on dietary preferences");
  }

  if (category.includes("hotel")) {
    competitorActions.push({
      action: "Direct booking engine with best-rate guarantee",
      impact: "20-25% OTA commission savings",
      adoptionRate: "45% of boutique hotels",
    });
    competitorActions.push({
      action: "Pre-arrival concierge via WhatsApp",
      impact: "Upsell opportunities, better reviews",
      adoptionRate: "30% of premium properties",
    });
    leapfrogStrategies.push("AI concierge that knows guest preferences before arrival");
  }

  if (category.includes("tour")) {
    competitorActions.push({
      action: "Instant booking confirmation",
      impact: "First to respond wins the booking",
      adoptionRate: "55% of successful operators",
    });
    catchUpActions.push("Automate availability checking and instant confirmation");
    leapfrogStrategies.push("Dynamic pricing based on demand - charge more for peak dates");
  }

  // General market gaps
  if (!hasWebsite) {
    marketGaps.push("Online presence gap - competitors are capturing your potential searches");
  }
  if (!hasInstagram) {
    marketGaps.push("Social proof gap - tourists verify businesses on Instagram before booking");
  }
  marketGaps.push("After-hours service gap - 40% of inquiries come outside business hours");

  // Differentiation opportunities based on what's NOT being done
  differentiationOpportunities.push("Personalized follow-up sequences - most competitors do one message and forget");
  differentiationOpportunities.push("VIP recognition system - remember returning customers automatically");
  differentiationOpportunities.push("Proactive review management - turn satisfied customers into advocates");

  return {
    competitorActions,
    marketGaps,
    differentiationOpportunities,
    urgentThreats,
    catchUpActions,
    leapfrogStrategies,
  };
}

// Greed Trigger Engine - Psychological triggers based on potential gains
export function generateGreedTriggers(business: Business): GreedTriggerResult {
  const leaks = calculateFinancialLeaks(business);
  const category = business.category?.toLowerCase() || "";
  const priceLevel = business.priceLevel || 2;

  const monthlyRecovery = leaks.totalMonthlyLeak;
  const yearlyRecovery = monthlyRecovery * 12;

  // Primary trigger based on biggest leak
  const biggestLeak = leaks.leakBreakdown.sort((a, b) => b.amount - a.amount)[0];
  const primaryTrigger = `You're leaving $${biggestLeak?.amount.toLocaleString() || "3,000"}/month on the table from ${biggestLeak?.category || "missed opportunities"} alone`;

  // Monetary hook
  const monetaryHook = `$${monthlyRecovery.toLocaleString()}/month = $${yearlyRecovery.toLocaleString()}/year. That's a ${priceLevel >= 3 ? "luxury vacation property" : "new vehicle"} every year from money that's already there.`;

  // Status hook based on vertical
  const statusHooks: Record<string, string> = {
    restaurant: "Los restaurantes top de la ciudad ya tienen esto. La pregunta es: quieres ser el que se queda atras?",
    hotel: "Los hoteles boutique mas exitosos operan con automation. Es lo que separa los premium de los promedio.",
    tour_operator: "Los operadores de tours mas exitosos responden en segundos. Por eso tienen 5 estrellas.",
    spa: "Los spas de clase mundial tienen sistemas que hacen que cada cliente se sienta VIP desde el primer contacto.",
  };
  const statusHook = statusHooks[category.includes("restaurant") ? "restaurant" : 
    category.includes("hotel") ? "hotel" : 
    category.includes("tour") ? "tour_operator" : "spa"] || 
    "Los negocios lideres en tu categoria ya usan esto. Tu decides si compites o te quedas atras.";

  // Freedom hook
  const freedomHook = "Imagina poder irte de vacaciones sabiendo que cada consulta se atiende perfectamente. Tus clientes felices, tu tranquilo.";

  // Exclusivity hook
  const exclusivityHook = priceLevel >= 3 
    ? "Solo trabajamos con negocios selectos que entienden el valor de la excelencia operativa. No es para todos."
    : "Estamos expandiendo a solo 5 negocios en tu zona este trimestre. Quien entre primero tiene ventaja.";

  // FOMO pitch
  const fomoPitch = `Cada dia que pasa sin esto, tus competidores capturan los clientes que deberian ser tuyos. $${Math.round(monthlyRecovery / 30).toLocaleString()}/dia literalmente.`;

  // Numbers to mention
  const numbersToMention = [
    `$${monthlyRecovery.toLocaleString()}/mes en recuperacion`,
    `${Math.round(monthlyRecovery * 12 / 1000)}K al ano`,
    "24/7 cobertura vs tus 8-10 horas actuales",
    "Respuesta en segundos vs minutos u horas",
    `${leaks.leakBreakdown.length} areas de fuga identificadas`,
  ];

  // Closing greed statement
  const closingGreedStatement = `En 12 meses, esto puede significar $${yearlyRecovery.toLocaleString()} adicionales en tu bolsillo. La unica pregunta es: prefieres empezar a capturar ese dinero ahora, o seguir dejandolo para la competencia?`;

  return {
    primaryTrigger,
    monetaryHook,
    statusHook,
    freedomHook,
    exclusivityHook,
    fomoPitch,
    successStoryAngle: `Un ${category} similar en tu ciudad recupero $${Math.round(monthlyRecovery * 0.8).toLocaleString()}/mes en los primeros 60 dias`,
    numbersToMention,
    closingGreedStatement,
  };
}

// Offer Mutation Engine - Dynamic offer generation based on signals
export function mutateOffer(business: Business): OfferMutationResult {
  const leaks = calculateFinancialLeaks(business);
  const profile = profileDecisionMaker(business);
  const category = business.category?.toLowerCase() || "";
  const priceLevel = business.priceLevel || 2;
  const hasWebsite = !!business.website;
  const hasInstagram = !!business.instagram;

  // Base offer based on vertical
  const baseOfferMap: Record<string, string> = {
    restaurant: "AI Reservation & Customer Engagement System",
    hotel: "Direct Booking & Guest Experience Automation",
    tour_operator: "Instant Booking & Multi-Language Response System",
    spa: "Appointment Automation & VIP Client Management",
    club: "VIP Table Management & Guest List Automation",
    boat_charter: "Inquiry Response & Booking Automation System",
    concierge: "Multi-Platform Client Management & Response System",
    villa_rental: "Direct Booking & Guest Communication Automation",
  };

  const verticalKey = category.includes("restaurant") ? "restaurant" :
    category.includes("hotel") ? "hotel" :
    category.includes("tour") ? "tour_operator" :
    category.includes("spa") ? "spa" :
    category.includes("club") ? "club" :
    category.includes("boat") || category.includes("yacht") ? "boat_charter" :
    category.includes("concierge") ? "concierge" :
    category.includes("villa") ? "villa_rental" : "restaurant";

  const baseOffer = baseOfferMap[verticalKey] || "AI Business Automation System";

  // Generate mutations based on profile and signals
  const mutations: OfferMutationResult["mutations"] = [];

  // Starter mutation for conservative profiles
  if (profile.riskTolerance === "conservative" || !hasWebsite) {
    mutations.push({
      variant: "Quick Start Package",
      description: "WhatsApp automation only - simple, proven, low commitment",
      priceAnchor: "$500 setup + $150/month",
      urgencyElement: "30-day money-back guarantee",
      targetProfile: "Conservative decision makers, first-time tech adopters",
    });
  }

  // Core mutation for moderate profiles
  mutations.push({
    variant: "Core Automation Package",
    description: "WhatsApp + Instagram + basic website integration",
    priceAnchor: "$1,500 setup + $350/month",
    urgencyElement: "Implementation starts within 48 hours",
    targetProfile: "Growth-focused operators ready to scale",
  });

  // Premium mutation for aggressive profiles
  if (profile.riskTolerance !== "conservative" && priceLevel >= 2) {
    mutations.push({
      variant: "Full Stack Premium",
      description: "Complete automation suite with AI learning and optimization",
      priceAnchor: "$3,000 setup + $750/month",
      urgencyElement: "Priority support + quarterly strategy calls",
      targetProfile: "Premium brand builders, rapid scalers",
    });
  }

  // Pay-for-performance mutation
  mutations.push({
    variant: "Performance Partnership",
    description: "Lower upfront, share in the additional revenue generated",
    priceAnchor: "$750 setup + 10% of recovered revenue",
    urgencyElement: "Aligned incentives - we only win when you win",
    targetProfile: "Results-focused, cash-conscious operators",
  });

  // Determine recommended mutation based on profile
  let recommendedMutation = "Core Automation Package";
  if (profile.riskTolerance === "conservative") {
    recommendedMutation = "Quick Start Package";
  } else if (profile.riskTolerance === "aggressive" && priceLevel >= 3) {
    recommendedMutation = "Full Stack Premium";
  }

  // Pricing strategy based on vertical and price level
  const pricingStrategy = priceLevel >= 3
    ? "Premium positioning - emphasize exclusivity and white-glove service"
    : priceLevel === 2
    ? "Value positioning - emphasize ROI and payback period"
    : "Accessibility positioning - emphasize low barrier to entry and quick wins";

  // Bonus stack to increase perceived value
  const bonusStack = [
    "Free 30-day trial of advanced analytics",
    "Priority response time guarantee",
    "Monthly optimization review",
    "Competitor response time audit",
  ];

  if (!hasInstagram) {
    bonusStack.push("Free Instagram Business profile setup assistance");
  }
  if (!hasWebsite) {
    bonusStack.push("Free landing page for direct bookings");
  }

  // Guarantee framing based on profile
  const guaranteeFraming = profile.riskTolerance === "conservative"
    ? "100% money-back guarantee for 30 days. No questions asked. If it doesn't work for you, we refund everything."
    : profile.riskTolerance === "aggressive"
    ? "Performance guarantee: if we don't improve your response time by 80%, next month is free."
    : "Satisfaction guarantee: we work until you're happy, or you don't pay.";

  // Scarcity element
  const scarcityElement = priceLevel >= 3
    ? "We only take on 3 premium clients per quarter to ensure white-glove service"
    : "Implementation slots are limited - we can only onboard 5 new clients this month";

  return {
    baseOffer,
    mutations,
    recommendedMutation,
    pricingStrategy,
    bonusStack,
    guaranteeFraming,
    scarcityElement,
  };
}
