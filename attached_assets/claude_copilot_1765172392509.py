"""
Claude API Integration Layer.
Real-time intelligence that 10x's outreach effectiveness.

USE CASES:
1. Response Drafting - They reply, Claude crafts perfect follow-up
2. Review Intelligence - Deep analysis of Google reviews for hooks
3. Real-Time Personalization - Analyze their latest IG/content, generate perfect DM
4. Objection Handling - Real-time reframes when they push back
5. Proposal Generation - Custom proposals from conversation context
6. Voice Note Response - Transcribe their voice note, draft reply
"""
import os
import json
import httpx
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"  # Fast + smart for real-time use
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"

# Psychology context injected into every call
PSYCHOLOGY_CONTEXT = """You are Phil McGill's AI co-pilot for sales outreach in Colombian hospitality.

METHODOLOGY: 47 years combined sales psychology research. 1,400+ client transformations. $4.7M results.

CORE FRAMEWORKS TO APPLY:
1. NEUROSCIENCE: Emotional brain decides, logical brain justifies. Always trigger emotion FIRST.
2. NLP: Use presuppositions ("When you implement..."), embedded commands, pattern interrupts.
3. BEHAVIORAL ECONOMICS: Loss aversion (2.5x), anchoring, social proof, scarcity, reciprocity.
4. IDENTITY TRANSFORMATION: They're not buying AI, they're becoming who they want to be.

VOICE: Confident, sharp, early-30s energy. No fluff. Direct but warm. Consultant, not salesman.
LANGUAGE: Spanish for WhatsApp (Colombian casual). English for formal/LinkedIn.

RULES:
- Frame everything as LOSS prevention, not gain acquisition
- Use specific numbers, never vague claims
- Reference their specific business/situation
- Keep WhatsApp under 40 words
- Sound human, never robotic"""


class ClaudeClient:
    """Async Claude API client for real-time intelligence."""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or CLAUDE_API_KEY
        self.headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
    
    async def complete(
        self,
        prompt: str,
        system: str = PSYCHOLOGY_CONTEXT,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        """Send completion request to Claude."""
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                CLAUDE_API_URL,
                headers=self.headers,
                json={
                    "model": CLAUDE_MODEL,
                    "max_tokens": max_tokens,
                    "system": system,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temperature,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]


# ═══════════════════════════════════════════════════════════════════════════
# 1. RESPONSE DRAFTING
# ═══════════════════════════════════════════════════════════════════════════
# They reply to your outreach. Claude crafts the perfect follow-up.

async def draft_response(
    their_message: str,
    conversation_history: list[dict],
    business_context: dict,
    channel: str = "whatsapp",  # whatsapp, instagram, email
) -> dict:
    """
    Draft the perfect response to their reply.
    
    Args:
        their_message: What they just said
        conversation_history: Previous messages [{"role": "me/them", "text": "..."}]
        business_context: {name, category, city, pain_points, score}
        channel: whatsapp, instagram, email
    
    Returns:
        {response: str, tone: str, next_action: str, psychology_used: list}
    """
    client = ClaudeClient()
    
    history_text = "\n".join([
        f"{'Phil' if m['role'] == 'me' else 'Them'}: {m['text']}"
        for m in conversation_history[-5:]  # Last 5 messages
    ])
    
    prompt = f"""CONTEXT:
Business: {business_context.get('name')} ({business_context.get('category')}) in {business_context.get('city')}
Known pain points: {business_context.get('pain_points', 'Unknown')}
Opportunity score: {business_context.get('score', 'Unknown')}/100
Channel: {channel}

CONVERSATION HISTORY:
{history_text}

THEIR LATEST MESSAGE:
"{their_message}"

TASK:
Draft the perfect response that moves this conversation toward a meeting/call.

Consider:
- What's their emotional state? (interested, skeptical, busy, curious)
- What objection might be forming?
- What's the right psychology lever for this moment?
- What's the natural next step?

OUTPUT FORMAT (JSON):
{{
    "response": "The exact message to send (respect channel length limits)",
    "tone": "How this should feel",
    "psychology_used": ["list of frameworks/techniques used"],
    "next_action": "What to do if they respond / don't respond",
    "objection_detected": "Any objection forming? How to handle it"
}}"""

    result = await client.complete(prompt, temperature=0.6)
    
    # Parse JSON response
    try:
        # Find JSON in response
        start = result.find("{")
        end = result.rfind("}") + 1
        return json.loads(result[start:end])
    except:
        return {"response": result, "tone": "unknown", "psychology_used": [], "next_action": "review manually"}


# ═══════════════════════════════════════════════════════════════════════════
# 2. REVIEW INTELLIGENCE
# ═══════════════════════════════════════════════════════════════════════════
# Analyze their Google reviews to find specific hooks and pain points.

async def analyze_reviews(
    reviews: list[dict],  # [{text, rating, date, response}]
    business_name: str,
    category: str,
) -> dict:
    """
    Deep analysis of Google reviews to find outreach hooks.
    
    Returns specific pain points, unanswered complaints, and 
    personalized outreach angles based on THEIR actual reviews.
    """
    client = ClaudeClient()
    
    reviews_text = "\n\n".join([
        f"⭐ {r.get('rating', '?')}/5 ({r.get('date', 'unknown date')})\n"
        f"Review: {r.get('text', '')}\n"
        f"Owner Response: {r.get('response', 'NO RESPONSE')}"
        for r in reviews[:20]  # Analyze up to 20 reviews
    ])
    
    prompt = f"""BUSINESS: {business_name} ({category})

THEIR GOOGLE REVIEWS:
{reviews_text}

ANALYZE FOR OUTREACH INTELLIGENCE:

1. PAIN POINTS MENTIONED
   - What do customers complain about?
   - What operational issues are visible?
   - What's the pattern in negative reviews?

2. RESPONSE BEHAVIOR
   - Do they respond to reviews?
   - How fast? What tone?
   - Are negative reviews left unanswered?

3. SERVICE GAPS
   - What do customers wish was better?
   - What do they praise competitors for?
   - What's the #1 fixable issue?

4. OUTREACH HOOKS
   - Specific quotes I can reference
   - Specific incidents I can mention
   - The ONE thing that would get their attention

5. PSYCHOLOGY ANGLE
   - What's this owner's biggest fear?
   - What identity are they protecting?
   - What loss can I quantify?

OUTPUT FORMAT (JSON):
{{
    "overall_rating": "X.X",
    "review_count": N,
    "response_rate": "X%",
    "top_complaints": ["list"],
    "unanswered_negative_reviews": N,
    "biggest_pain_point": "...",
    "quotable_review": "Exact quote I can reference in outreach",
    "outreach_hook": "The specific angle to use",
    "whatsapp_opener": "Ready-to-send opener based on this analysis",
    "loss_quantification": "Estimated revenue impact of issues",
    "psychology_angle": "Which framework to emphasize"
}}"""

    result = await client.complete(prompt, max_tokens=1500, temperature=0.5)
    
    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        return json.loads(result[start:end])
    except:
        return {"error": "Could not parse", "raw": result}


# ═══════════════════════════════════════════════════════════════════════════
# 3. REAL-TIME PERSONALIZATION
# ═══════════════════════════════════════════════════════════════════════════
# Look at their latest IG content, generate perfect DM.

async def personalize_from_content(
    recent_posts: list[dict],  # [{caption, type, date, engagement}]
    stories: list[str],  # Story descriptions
    bio: str,
    business_context: dict,
) -> dict:
    """
    Generate hyper-personalized DM based on their current content.
    
    This is what makes outreach feel like you actually care.
    """
    client = ClaudeClient()
    
    posts_text = "\n".join([
        f"- {p.get('type', 'post')}: \"{p.get('caption', '')[:200]}\" "
        f"({p.get('engagement', 'unknown')} engagement)"
        for p in recent_posts[:5]
    ])
    
    stories_text = "\n".join([f"- {s}" for s in stories[:3]])
    
    prompt = f"""INSTAGRAM INTELLIGENCE:

Bio: {bio}

Recent Posts:
{posts_text}

Recent Stories:
{stories_text if stories_text else "None visible"}

BUSINESS CONTEXT:
{json.dumps(business_context, indent=2)}

TASK:
Generate a hyper-personalized Instagram DM that:
1. References something SPECIFIC from their content (not generic)
2. Feels like a genuine human observation
3. Asks a question that opens conversation
4. Does NOT pitch anything
5. Is under 25 words

Also provide:
- Why this approach will work for THIS business
- What to say if they respond
- Follow-up WhatsApp message if they don't respond in 48h

OUTPUT FORMAT (JSON):
{{
    "instagram_dm": "The exact DM to send",
    "reference_point": "What specific content you're referencing",
    "why_this_works": "Psychology behind this approach",
    "if_they_respond": "What to say next",
    "whatsapp_followup": "48h later if no IG response",
    "personalization_score": "1-10 how personalized this feels"
}}"""

    result = await client.complete(prompt, temperature=0.7)
    
    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        return json.loads(result[start:end])
    except:
        return {"instagram_dm": result, "error": "Could not parse full response"}


# ═══════════════════════════════════════════════════════════════════════════
# 4. OBJECTION HANDLING
# ═══════════════════════════════════════════════════════════════════════════
# Real-time reframes when they push back.

COMMON_OBJECTIONS = {
    "too_expensive": "Price/cost objection",
    "no_time": "Too busy to implement",
    "need_to_think": "Stalling/delaying",
    "tried_before": "Past bad experience with tech",
    "too_small": "Business too small for AI",
    "not_interested": "General rejection",
    "already_have": "Claims existing solution",
    "send_info": "Request to send materials (often a blow-off)",
}

async def handle_objection(
    objection_text: str,
    business_context: dict,
    conversation_stage: str = "initial",  # initial, follow_up, closing
) -> dict:
    """
    Generate psychology-driven reframe for any objection.
    """
    client = ClaudeClient()
    
    prompt = f"""OBJECTION RECEIVED:
"{objection_text}"

CONTEXT:
Business: {business_context.get('name')} ({business_context.get('category')})
Conversation stage: {conversation_stage}
Their known pain points: {business_context.get('pain_points', 'Unknown')}

TASK:
1. Classify this objection
2. Identify the REAL concern behind it
3. Generate a reframe using our psychology frameworks
4. Provide the exact response

PSYCHOLOGY TOOLS AVAILABLE:
- Feel-Felt-Found: "I understand how you feel. Others felt the same. What they found..."
- Isolate: "Is that the only thing, or is there something else?"
- Reverse: "What would need to be true for this to be a yes?"
- Loss calculation: "What's it costing you NOT to have this?"
- Identity: "Is this who you want to be / the business you want to run?"
- Social proof: "The businesses winning in {business_context.get('city', 'your city')} already..."

OUTPUT FORMAT (JSON):
{{
    "objection_type": "category",
    "real_concern": "What they're actually worried about",
    "psychology_approach": "Which framework to use",
    "response": "Exact message to send",
    "tone": "How to deliver this",
    "if_they_still_resist": "Next move if this doesn't work",
    "when_to_walk_away": "Signs this isn't worth pursuing"
}}"""

    result = await client.complete(prompt, temperature=0.6)
    
    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        return json.loads(result[start:end])
    except:
        return {"response": result}


# ═══════════════════════════════════════════════════════════════════════════
# 5. PROPOSAL GENERATION
# ═══════════════════════════════════════════════════════════════════════════
# Custom proposal from conversation context.

async def generate_proposal(
    business_context: dict,
    conversation_summary: str,
    agreed_pain_points: list[str],
    budget_signals: str = "unknown",
    timeline: str = "unknown",
) -> dict:
    """
    Generate custom proposal based on actual conversation.
    """
    client = ClaudeClient()
    
    prompt = f"""PROPOSAL GENERATION

BUSINESS:
{json.dumps(business_context, indent=2)}

CONVERSATION SUMMARY:
{conversation_summary}

AGREED PAIN POINTS:
{chr(10).join([f'- {p}' for p in agreed_pain_points])}

BUDGET SIGNALS: {budget_signals}
TIMELINE: {timeline}

TASK:
Generate a custom proposal that:
1. Opens with THEIR words (mirror their language)
2. Quantifies THEIR specific losses
3. Presents solution as identity transformation
4. Uses anchoring (high reference, then actual price)
5. Creates urgency without being pushy
6. Has clear next step

OUTPUT FORMAT (JSON):
{{
    "subject_line": "For email",
    "opening_hook": "First paragraph - emotional connection",
    "pain_recap": "Their problems in their words",
    "loss_quantification": "$ impact of their current situation",
    "solution_overview": "What we'll implement (high level)",
    "transformation_promise": "Who they become",
    "investment": {{
        "anchor": "What this would normally cost",
        "actual": "What you're offering",
        "roi_timeline": "When they see returns"
    }},
    "social_proof": "Relevant case study reference",
    "urgency": "Why now",
    "next_step": "Specific CTA",
    "ps": "Closing hook"
}}"""

    result = await client.complete(prompt, max_tokens=2000, temperature=0.6)
    
    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        return json.loads(result[start:end])
    except:
        return {"raw_proposal": result}


# ═══════════════════════════════════════════════════════════════════════════
# 6. VOICE NOTE RESPONSE
# ═══════════════════════════════════════════════════════════════════════════
# They send voice note, you send perfect text response.

async def respond_to_voice_note(
    transcription: str,  # From Whisper or manual
    business_context: dict,
    conversation_history: list[dict] = None,
) -> dict:
    """
    Analyze voice note content and generate response.
    
    Voice notes often contain more emotional honesty than text.
    This is where you find the REAL objections.
    """
    client = ClaudeClient()
    
    history_text = ""
    if conversation_history:
        history_text = "\n".join([
            f"{'Phil' if m['role'] == 'me' else 'Them'}: {m['text']}"
            for m in conversation_history[-3:]
        ])
    
    prompt = f"""VOICE NOTE TRANSCRIPTION:
"{transcription}"

BUSINESS: {business_context.get('name')} ({business_context.get('category')})

PREVIOUS CONTEXT:
{history_text if history_text else "This is first contact"}

TASK:
Voice notes reveal more than text. Analyze:
1. Emotional state (frustrated? curious? skeptical? interested?)
2. Hidden objections or concerns
3. What they're REALLY asking
4. Level of interest (1-10)

Then generate response that:
- Acknowledges what they said (shows you listened)
- Addresses the underlying concern
- Moves toward next step
- Matches their energy level

OUTPUT FORMAT (JSON):
{{
    "emotional_state": "What they're feeling",
    "hidden_concerns": ["Things they didn't say directly but implied"],
    "interest_level": "1-10",
    "what_they_really_want": "The real question/need",
    "response": "Your message (text, not voice)",
    "should_send_voice_note_back": true/false,
    "voice_note_script": "If yes, what to say",
    "psychology_approach": "Framework used",
    "next_step": "What happens after this"
}}"""

    result = await client.complete(prompt, temperature=0.6)
    
    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        return json.loads(result[start:end])
    except:
        return {"response": result}


# ═══════════════════════════════════════════════════════════════════════════
# 7. CONVERSATION INTELLIGENCE
# ═══════════════════════════════════════════════════════════════════════════
# Analyze full conversation, suggest next move.

async def analyze_conversation(
    messages: list[dict],  # [{role, text, timestamp}]
    business_context: dict,
) -> dict:
    """
    Analyze full conversation and recommend next action.
    """
    client = ClaudeClient()
    
    convo_text = "\n".join([
        f"[{m.get('timestamp', '')}] {'PHIL' if m['role'] == 'me' else 'THEM'}: {m['text']}"
        for m in messages
    ])
    
    prompt = f"""FULL CONVERSATION:
{convo_text}

BUSINESS: {business_context.get('name')} ({business_context.get('category')})

ANALYZE:
1. Where is this conversation? (cold, warming, hot, closing, dead)
2. What's their buying temperature? (1-10)
3. What objections have surfaced?
4. What's been agreed/established?
5. What's the blocker to moving forward?
6. What's the optimal next message?
7. Should Phil call instead of message?

OUTPUT FORMAT (JSON):
{{
    "conversation_stage": "stage name",
    "buying_temperature": "1-10",
    "established_rapport": true/false,
    "objections_surfaced": ["list"],
    "pain_points_acknowledged": ["list"],
    "blocker": "What's stopping the deal",
    "recommended_action": "What to do next",
    "next_message": "If messaging, exact message",
    "should_call": true/false,
    "call_script_opening": "If calling, what to say",
    "probability_to_close": "X%",
    "timeline_to_decision": "Estimated"
}}"""

    result = await client.complete(prompt, max_tokens=1500, temperature=0.5)
    
    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        return json.loads(result[start:end])
    except:
        return {"analysis": result}


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

async def interactive_mode():
    """Run interactive Claude co-pilot in terminal."""
    import sys
    
    print("\n" + "="*60)
    print("🧠 PHIL McGILL AI CO-PILOT")
    print("="*60)
    print("\nCommands:")
    print("  /respond <message>     - Draft response to their message")
    print("  /objection <text>      - Handle objection")
    print("  /analyze               - Analyze current conversation")
    print("  /proposal              - Generate proposal")
    print("  /quit                  - Exit")
    print("\nPaste their message and I'll help you respond.\n")
    
    conversation = []
    business = {"name": "Unknown", "category": "restaurant", "city": "Cartagena"}
    
    while True:
        try:
            user_input = input("\n> ").strip()
            
            if user_input.lower() == "/quit":
                break
            
            if user_input.startswith("/respond "):
                their_msg = user_input[9:]
                conversation.append({"role": "them", "text": their_msg})
                result = await draft_response(their_msg, conversation, business)
                print(f"\n📝 SUGGESTED RESPONSE:\n{result.get('response', result)}")
                print(f"\n🧠 Psychology: {result.get('psychology_used', [])}")
                print(f"➡️  Next: {result.get('next_action', 'N/A')}")
                
            elif user_input.startswith("/objection "):
                objection = user_input[11:]
                result = await handle_objection(objection, business)
                print(f"\n🔄 REFRAME:\n{result.get('response', result)}")
                print(f"\n💡 Approach: {result.get('psychology_approach', 'N/A')}")
                
            elif user_input.startswith("/set "):
                # /set name=Restaurant XYZ
                parts = user_input[5:].split("=")
                if len(parts) == 2:
                    business[parts[0].strip()] = parts[1].strip()
                    print(f"✓ Set {parts[0].strip()} = {parts[1].strip()}")
                    
            else:
                # Treat as their message, draft response
                conversation.append({"role": "them", "text": user_input})
                result = await draft_response(user_input, conversation, business)
                print(f"\n📝 SUGGESTED RESPONSE:\n{result.get('response', result)}")
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")
    
    print("\n👋 Co-pilot signing off.\n")


if __name__ == "__main__":
    import asyncio
    asyncio.run(interactive_mode())
