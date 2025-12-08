import Anthropic from "@anthropic-ai/sdk";
import {
  PSYCHOLOGY_FRAMEWORKS,
  OBJECTION_PATTERNS,
  VERTICAL_INTELLIGENCE,
  type Business,
} from "@shared/schema";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
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

function getVerticalIntelligence(category: string) {
  return VERTICAL_INTELLIGENCE[category] || VERTICAL_INTELLIGENCE.restaurant;
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
