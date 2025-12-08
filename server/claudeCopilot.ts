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
