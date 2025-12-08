"""
AI Transformation Plan Generator.
Creates Phil's one-page proposals that businesses can't ignore.
"""
from datetime import datetime
from pydantic import BaseModel, Field
from models import Business
from services.deep_scan import VERTICAL_DEEP_INTEL, CITY_PRIORITIES


class TransformationPlan(BaseModel):
    """Phil's AI Transformation Plan - the proposal that closes deals."""
    business_name: str
    generated_date: str
    
    # Header
    headline: str
    subheadline: str
    
    # Problem section
    current_state: list[str]
    cost_of_inaction: str
    
    # Solution section
    phase_1_quick_wins: list[dict]
    phase_2_core_systems: list[dict]
    phase_3_optimization: list[dict]
    
    # ROI section
    investment: str
    expected_return: str
    payback_period: str
    
    # Timeline
    thirty_day_roadmap: list[dict]
    
    # CTA
    next_step: str
    urgency_hook: str


def generate_transformation_plan(business: Business) -> TransformationPlan:
    """Generate a complete transformation plan for a business."""
    category = business.category.value
    intel = VERTICAL_DEEP_INTEL.get(category, VERTICAL_DEEP_INTEL.get("restaurant"))
    solutions = intel.get("ai_solutions", {})
    
    # Build the plan
    return TransformationPlan(
        business_name=business.name,
        generated_date=datetime.now().strftime("%B %d, %Y"),
        
        headline=f"AI Transformation Plan: {business.name}",
        subheadline=f"How to automate 80% of your operations in 30 days",
        
        current_state=[
            f"❌ {intel.get('pain_points', ['Manual operations'])[0]}",
            f"❌ {intel.get('pain_points', ['Slow response times'])[1] if len(intel.get('pain_points', [])) > 1 else 'Inconsistent customer experience'}",
            f"❌ {intel.get('revenue_leakage', ['Revenue leakage'])[0]}",
        ],
        
        cost_of_inaction=f"Every month without these systems costs an estimated $2,000-5,000 in missed revenue and wasted staff time.",
        
        phase_1_quick_wins=[
            {
                "name": s.get("name", "Quick Win"),
                "description": s.get("desc", ""),
                "timeline": "Week 1",
                "impact": s.get("roi", "Immediate improvement"),
            }
            for s in solutions.get("starter", [])[:2]
        ],
        
        phase_2_core_systems=[
            {
                "name": s.get("name", "Core System"),
                "description": s.get("desc", ""),
                "timeline": "Week 2-3",
                "impact": s.get("roi", "Significant improvement"),
            }
            for s in solutions.get("core", [])[:2]
        ],
        
        phase_3_optimization=[
            {
                "name": "Integration & Training",
                "description": "Connect all systems, train staff, optimize workflows",
                "timeline": "Week 4",
                "impact": "Full operational automation",
            },
        ],
        
        investment=solutions.get("flagship", {}).get("price_range", "$3,000-8,000 setup + $400/month"),
        expected_return="$2,000-5,000/month in recovered revenue + saved labor",
        payback_period="60-90 days",
        
        thirty_day_roadmap=[
            {"week": 1, "focus": "Quick Wins", "deliverables": [s.get("name", "") for s in solutions.get("starter", [])[:2]], "outcome": "Immediate improvements visible"},
            {"week": 2, "focus": "Core Build", "deliverables": [solutions.get("core", [{}])[0].get("name", "Core automation")], "outcome": "Main automation live"},
            {"week": 3, "focus": "Integration", "deliverables": ["System connections", "Staff training"], "outcome": "Everything working together"},
            {"week": 4, "focus": "Optimize", "deliverables": ["Performance review", "Refinements"], "outcome": "Handoff complete"},
        ],
        
        next_step="15-minute call to walk through this plan and answer questions",
        urgency_hook=f"I'm taking on 3 new {category} clients this month. First come, first served.",
    )


def format_plan_markdown(plan: TransformationPlan) -> str:
    """Format transformation plan as markdown document."""
    md = f"""# {plan.headline}

**Prepared for:** {plan.business_name}  
**Date:** {plan.generated_date}  
**Prepared by:** Phil McGill | AI Systems for Colombian Hospitality

---

## {plan.subheadline}

### Current State

Your business is likely experiencing:

"""
    for state in plan.current_state:
        md += f"{state}\n"
    
    md += f"""
**{plan.cost_of_inaction}**

---

## The Solution: Your AI System Stack

### Phase 1: Quick Wins (Week 1)

"""
    for qw in plan.phase_1_quick_wins:
        md += f"""**{qw['name']}**
- {qw['description']}
- Timeline: {qw['timeline']}
- Impact: {qw['impact']}

"""
    
    md += """### Phase 2: Core Systems (Week 2-3)

"""
    for cs in plan.phase_2_core_systems:
        md += f"""**{cs['name']}**
- {cs['description']}
- Timeline: {cs['timeline']}
- Impact: {cs['impact']}

"""
    
    md += """### Phase 3: Optimization (Week 4)

"""
    for opt in plan.phase_3_optimization:
        md += f"""**{opt['name']}**
- {opt['description']}
- Timeline: {opt['timeline']}
- Impact: {opt['impact']}

"""
    
    md += f"""---

## Investment & ROI

| | |
|---|---|
| **Investment** | {plan.investment} |
| **Expected Return** | {plan.expected_return} |
| **Payback Period** | {plan.payback_period} |

---

## 30-Day Roadmap

| Week | Focus | Deliverables | Outcome |
|------|-------|--------------|---------|
"""
    for week in plan.thirty_day_roadmap:
        deliverables = ", ".join(week['deliverables'])
        md += f"| {week['week']} | {week['focus']} | {deliverables} | {week['outcome']} |\n"
    
    md += f"""
---

## Next Step

**{plan.next_step}**

{plan.urgency_hook}

---

**Phil McGill**  
AI Systems for Colombian Hospitality  
movvia.co  
"""
    
    return md


def format_plan_html(plan: TransformationPlan) -> str:
    """Format transformation plan as HTML for email."""
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; }}
        h1 {{ color: #0a0a0a; border-bottom: 3px solid #0a0a0a; padding-bottom: 10px; }}
        h2 {{ color: #333; margin-top: 30px; }}
        h3 {{ color: #555; }}
        .highlight {{ background: #f8f8f8; padding: 20px; border-left: 4px solid #0a0a0a; margin: 20px 0; }}
        .roi-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        .roi-table td {{ padding: 12px; border-bottom: 1px solid #eee; }}
        .roi-table td:first-child {{ font-weight: bold; width: 40%; }}
        .cta {{ background: #0a0a0a; color: white; padding: 20px; text-align: center; margin-top: 30px; }}
        .cta a {{ color: white; text-decoration: none; font-weight: bold; }}
        .urgency {{ color: #c00; font-style: italic; margin-top: 10px; }}
    </style>
</head>
<body>
    <h1>{plan.headline}</h1>
    <p><strong>Prepared for:</strong> {plan.business_name}<br>
    <strong>Date:</strong> {plan.generated_date}</p>
    
    <h2>{plan.subheadline}</h2>
    
    <div class="highlight">
        <h3>Current State</h3>
        <ul>
"""
    for state in plan.current_state:
        html += f"            <li>{state}</li>\n"
    
    html += f"""        </ul>
        <p><strong>{plan.cost_of_inaction}</strong></p>
    </div>
    
    <h2>The Solution: Your AI System Stack</h2>
    
    <h3>Phase 1: Quick Wins (Week 1)</h3>
"""
    for qw in plan.phase_1_quick_wins:
        html += f"""    <p><strong>{qw['name']}</strong><br>
    {qw['description']}<br>
    <em>Impact: {qw['impact']}</em></p>
"""
    
    html += """    <h3>Phase 2: Core Systems (Week 2-3)</h3>
"""
    for cs in plan.phase_2_core_systems:
        html += f"""    <p><strong>{cs['name']}</strong><br>
    {cs['description']}<br>
    <em>Impact: {cs['impact']}</em></p>
"""
    
    html += f"""    
    <h2>Investment & ROI</h2>
    <table class="roi-table">
        <tr><td>Investment</td><td>{plan.investment}</td></tr>
        <tr><td>Expected Return</td><td>{plan.expected_return}</td></tr>
        <tr><td>Payback Period</td><td>{plan.payback_period}</td></tr>
    </table>
    
    <div class="cta">
        <h3>Next Step</h3>
        <p>{plan.next_step}</p>
        <p class="urgency">{plan.urgency_hook}</p>
    </div>
    
    <p style="margin-top: 30px; color: #666;">
        <strong>Phil McGill</strong><br>
        AI Systems for Colombian Hospitality<br>
        movvia.co
    </p>
</body>
</html>
"""
    return html
