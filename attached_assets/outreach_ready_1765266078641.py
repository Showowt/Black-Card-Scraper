"""
Outreach-Ready Export System.
Generates copy-paste ready outreach with direct links.
Optimized for Colombian market (WhatsApp-first).
"""
import csv
import json
from datetime import datetime
from pathlib import Path

from models import Business
from services.deep_scan import BusinessDeepScan


# ═══════════════════════════════════════════════════════════════════════════
# COLOMBIA CHANNEL STRATEGY
# ═══════════════════════════════════════════════════════════════════════════
# 
# REALITY CHECK:
# - WhatsApp = 90% of Colombian business communication
# - BUT cold WhatsApp feels invasive, high block rate
# - Instagram DM = warmer entry point, can reference content
# - Email = formal follow-up, proposals, documentation
#
# WINNING SEQUENCE:
# 1. Instagram DM (warm up, low friction)
# 2. WhatsApp (after IG response OR as follow-up)
# 3. Email (formal proposals, documentation)
#
# ═══════════════════════════════════════════════════════════════════════════

CHANNEL_STRATEGY = {
    "sequence": ["instagram", "whatsapp", "email"],
    "timing": {
        "instagram_to_whatsapp": "24-48 hours after IG DM (or immediately if they respond)",
        "whatsapp_to_email": "After WhatsApp conversation starts",
        "follow_up_spacing": "3 days, 7 days, 14 days",
    },
    "rules": {
        "instagram": [
            "Reference something SPECIFIC from their feed",
            "Ask a question, don't pitch",
            "Keep under 25 words",
            "Sound like a human, not a marketer",
        ],
        "whatsapp": [
            "Only after IG warm-up OR if you have legitimate reason",
            "Keep under 40 words",
            "Voice note can work better than text (shows effort)",
            "Send during business hours (9am-6pm Colombia time)",
        ],
        "email": [
            "For formal proposals after initial contact",
            "Include ROI numbers and specifics",
            "Attach case study or audit",
        ],
    },
}


def generate_wa_link(phone: str, message: str = "") -> str:
    """Generate WhatsApp click-to-chat link."""
    # Clean phone number
    clean = "".join(filter(str.isdigit, phone))
    if not clean.startswith("57"):
        clean = "57" + clean
    
    if message:
        from urllib.parse import quote
        return f"https://wa.me/{clean}?text={quote(message)}"
    return f"https://wa.me/{clean}"


def generate_ig_link(handle: str) -> str:
    """Generate Instagram profile link."""
    clean = handle.replace("@", "").strip()
    return f"https://instagram.com/{clean}"


def generate_maps_link(business_name: str, city: str) -> str:
    """Generate Google Maps search link."""
    from urllib.parse import quote
    query = f"{business_name} {city} Colombia"
    return f"https://www.google.com/maps/search/{quote(query)}"


class OutreachReadyExporter:
    """
    Export businesses with pre-filled, copy-paste ready outreach.
    Includes direct links to WhatsApp, Instagram, and Google Maps.
    """
    
    def __init__(self, output_dir: str = "outreach_ready"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def export_single(self, business: Business, scan: BusinessDeepScan) -> dict:
        """Create outreach-ready package for a single business."""
        
        # Build direct links
        wa_link = ""
        wa_link_with_msg = ""
        if business.contact.whatsapp:
            wa_link = generate_wa_link(business.contact.whatsapp)
            wa_link_with_msg = generate_wa_link(business.contact.whatsapp, scan.whatsapp_opener)
        elif business.contact.phone:
            wa_link = generate_wa_link(business.contact.phone)
            wa_link_with_msg = generate_wa_link(business.contact.phone, scan.whatsapp_opener)
        
        ig_link = ""
        if business.socials.instagram:
            ig_link = generate_ig_link(business.socials.instagram)
        
        maps_link = generate_maps_link(business.name, business.city)
        
        return {
            # Business Info
            "business_name": business.name,
            "category": business.category.value,
            "city": business.city,
            "rating": business.rating,
            "review_count": business.review_count,
            "opportunity_score": business.ai_opportunity_score,
            
            # Direct Links (click to open)
            "instagram_link": ig_link,
            "whatsapp_link": wa_link,
            "whatsapp_link_prefilled": wa_link_with_msg,
            "website": business.website or "",
            "google_maps": maps_link,
            
            # Contact Info
            "phone": business.contact.phone or "",
            "email": business.contact.email or "",
            "instagram_handle": business.socials.instagram or "",
            
            # Pre-Written Outreach (copy-paste ready)
            "ig_dm_script": scan.instagram_dm,
            "whatsapp_script": scan.whatsapp_opener,
            "email_script": scan.email_script,
            
            # Follow-ups
            "followup_1": scan.follow_up_sequence[0] if len(scan.follow_up_sequence) > 0 else "",
            "followup_2": scan.follow_up_sequence[1] if len(scan.follow_up_sequence) > 1 else "",
            "followup_3": scan.follow_up_sequence[2] if len(scan.follow_up_sequence) > 2 else "",
            
            # Psychology Hooks (for reference)
            "pain_trigger": scan.emotional_pain_trigger,
            "identity_gap": scan.identity_gap,
            "closing_trigger": scan.closing_trigger,
            
            # Metadata
            "generated_at": datetime.now().isoformat(),
        }
    
    def export_batch_csv(
        self,
        data: list[dict],
        filename: str = "outreach_ready.csv",
    ) -> str:
        """Export batch to CSV with all fields."""
        filepath = self.output_dir / filename
        
        if not data:
            return str(filepath)
        
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        
        return str(filepath)
    
    def export_batch_json(
        self,
        data: list[dict],
        filename: str = "outreach_ready.json",
    ) -> str:
        """Export batch to JSON."""
        filepath = self.output_dir / filename
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        return str(filepath)
    
    def export_quick_action_csv(
        self,
        data: list[dict],
        filename: str = "quick_actions.csv",
    ) -> str:
        """
        Export minimal CSV optimized for rapid outreach.
        Just the essentials: name, links, scripts.
        """
        filepath = self.output_dir / filename
        
        # Minimal columns for speed
        minimal_data = []
        for d in data:
            minimal_data.append({
                "business": d["business_name"],
                "category": d["category"],
                "score": d["opportunity_score"],
                "IG_LINK": d["instagram_link"],
                "IG_DM": d["ig_dm_script"],
                "WA_LINK": d["whatsapp_link_prefilled"],
                "WA_MSG": d["whatsapp_script"],
                "phone": d["phone"],
                "email": d["email"],
            })
        
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=minimal_data[0].keys())
            writer.writeheader()
            writer.writerows(minimal_data)
        
        return str(filepath)
    
    def export_html_dashboard(
        self,
        data: list[dict],
        filename: str = "outreach_dashboard.html",
    ) -> str:
        """
        Generate interactive HTML dashboard with click-to-copy.
        This is the EFFICIENCY weapon.
        """
        filepath = self.output_dir / filename
        
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phil McGill Outreach Dashboard</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a; 
            color: #fff;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 30px;
            border-bottom: 1px solid #333;
            margin-bottom: 30px;
        }
        .header h1 { font-size: 2rem; margin-bottom: 10px; }
        .header p { color: #888; }
        .stats {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-top: 20px;
        }
        .stat { text-align: center; }
        .stat-number { font-size: 2rem; font-weight: bold; color: #00ff88; }
        .stat-label { color: #888; font-size: 0.9rem; }
        
        .filters {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .filters select, .filters input {
            background: #1a1a1a;
            border: 1px solid #333;
            color: #fff;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 0.9rem;
        }
        
        .business-card {
            background: #111;
            border: 1px solid #222;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .business-card.high-priority {
            border-color: #00ff88;
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .business-name {
            font-size: 1.3rem;
            font-weight: 600;
        }
        .score {
            background: #00ff88;
            color: #000;
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: bold;
        }
        .score.medium { background: #ffaa00; }
        .score.low { background: #666; color: #fff; }
        
        .meta {
            display: flex;
            gap: 15px;
            color: #888;
            font-size: 0.9rem;
            margin-bottom: 15px;
        }
        
        .quick-links {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .quick-link {
            background: #222;
            color: #fff;
            padding: 8px 16px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 0.85rem;
            transition: all 0.2s;
        }
        .quick-link:hover { background: #333; }
        .quick-link.instagram { background: #e1306c; }
        .quick-link.whatsapp { background: #25d366; color: #000; }
        .quick-link.maps { background: #4285f4; }
        
        .outreach-section {
            margin-top: 15px;
        }
        .outreach-label {
            font-size: 0.8rem;
            color: #888;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .copy-btn {
            background: #333;
            border: none;
            color: #fff;
            padding: 4px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.75rem;
        }
        .copy-btn:hover { background: #444; }
        .copy-btn.copied { background: #00ff88; color: #000; }
        
        .outreach-text {
            background: #1a1a1a;
            padding: 12px;
            border-radius: 6px;
            font-size: 0.9rem;
            line-height: 1.5;
            white-space: pre-wrap;
            border: 1px solid #333;
        }
        
        .tabs {
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
        }
        .tab {
            background: #222;
            border: none;
            color: #888;
            padding: 8px 16px;
            border-radius: 6px 6px 0 0;
            cursor: pointer;
            font-size: 0.85rem;
        }
        .tab.active { background: #1a1a1a; color: #fff; }
        
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        .psychology-hints {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #222;
        }
        .hint {
            background: #1a1a1a;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 0.8rem;
            color: #888;
            margin-bottom: 5px;
        }
        .hint strong { color: #00ff88; }
        
        .status-select {
            background: #222;
            border: 1px solid #333;
            color: #fff;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 0.8rem;
        }
        
        @media (max-width: 600px) {
            .quick-links { flex-wrap: wrap; }
            .meta { flex-wrap: wrap; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Phil McGill Outreach Dashboard</h1>
        <p>Psychology-Engineered Outreach • Copy-Paste Ready</p>
        <div class="stats">
            <div class="stat">
                <div class="stat-number" id="total-count">0</div>
                <div class="stat-label">Total Leads</div>
            </div>
            <div class="stat">
                <div class="stat-number" id="high-score-count">0</div>
                <div class="stat-label">Score 80+</div>
            </div>
            <div class="stat">
                <div class="stat-number" id="with-ig-count">0</div>
                <div class="stat-label">Have Instagram</div>
            </div>
        </div>
    </div>
    
    <div class="filters">
        <select id="filter-category">
            <option value="">All Categories</option>
        </select>
        <select id="filter-score">
            <option value="0">All Scores</option>
            <option value="80">80+ Score</option>
            <option value="70">70+ Score</option>
            <option value="60">60+ Score</option>
        </select>
        <select id="filter-channel">
            <option value="">All Channels</option>
            <option value="instagram">Has Instagram</option>
            <option value="whatsapp">Has WhatsApp</option>
            <option value="email">Has Email</option>
        </select>
    </div>
    
    <div id="business-list"></div>
    
    <script>
        const DATA = PLACEHOLDER_DATA;
        
        function copyToClipboard(text, btn) {
            navigator.clipboard.writeText(text).then(() => {
                btn.textContent = '✓ Copied';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = 'Copy';
                    btn.classList.remove('copied');
                }, 2000);
            });
        }
        
        function renderBusinesses(filter = {}) {
            const list = document.getElementById('business-list');
            list.innerHTML = '';
            
            let filtered = DATA;
            
            if (filter.category) {
                filtered = filtered.filter(d => d.category === filter.category);
            }
            if (filter.minScore) {
                filtered = filtered.filter(d => (d.opportunity_score || 0) >= filter.minScore);
            }
            if (filter.channel === 'instagram') {
                filtered = filtered.filter(d => d.instagram_link);
            } else if (filter.channel === 'whatsapp') {
                filtered = filtered.filter(d => d.whatsapp_link);
            } else if (filter.channel === 'email') {
                filtered = filtered.filter(d => d.email);
            }
            
            filtered.forEach((b, idx) => {
                const score = b.opportunity_score || 0;
                const scoreClass = score >= 80 ? '' : score >= 60 ? 'medium' : 'low';
                const priorityClass = score >= 80 ? 'high-priority' : '';
                
                const card = document.createElement('div');
                card.className = `business-card ${priorityClass}`;
                card.innerHTML = `
                    <div class="card-header">
                        <div class="business-name">${b.business_name}</div>
                        <div class="score ${scoreClass}">${score}</div>
                    </div>
                    <div class="meta">
                        <span>📍 ${b.city}</span>
                        <span>🏷️ ${b.category}</span>
                        ${b.rating ? `<span>⭐ ${b.rating} (${b.review_count} reviews)</span>` : ''}
                    </div>
                    <div class="quick-links">
                        ${b.instagram_link ? `<a href="${b.instagram_link}" target="_blank" class="quick-link instagram">📸 Instagram</a>` : ''}
                        ${b.whatsapp_link_prefilled ? `<a href="${b.whatsapp_link_prefilled}" target="_blank" class="quick-link whatsapp">💬 WhatsApp (Pre-filled)</a>` : ''}
                        ${b.website ? `<a href="${b.website}" target="_blank" class="quick-link">🌐 Website</a>` : ''}
                        <a href="${b.google_maps}" target="_blank" class="quick-link maps">📍 Maps</a>
                    </div>
                    
                    <div class="tabs">
                        <button class="tab active" onclick="showTab(${idx}, 'ig')">Instagram DM</button>
                        <button class="tab" onclick="showTab(${idx}, 'wa')">WhatsApp</button>
                        <button class="tab" onclick="showTab(${idx}, 'email')">Email</button>
                        <button class="tab" onclick="showTab(${idx}, 'followup')">Follow-ups</button>
                    </div>
                    
                    <div id="tab-ig-${idx}" class="tab-content active">
                        <div class="outreach-section">
                            <div class="outreach-label">
                                <span>Instagram DM (send first)</span>
                                <button class="copy-btn" onclick="copyToClipboard(\`${b.ig_dm_script?.replace(/`/g, "'") || ''}\`, this)">Copy</button>
                            </div>
                            <div class="outreach-text">${b.ig_dm_script || 'No Instagram handle'}</div>
                        </div>
                    </div>
                    
                    <div id="tab-wa-${idx}" class="tab-content">
                        <div class="outreach-section">
                            <div class="outreach-label">
                                <span>WhatsApp Message</span>
                                <button class="copy-btn" onclick="copyToClipboard(\`${b.whatsapp_script?.replace(/`/g, "'") || ''}\`, this)">Copy</button>
                            </div>
                            <div class="outreach-text">${b.whatsapp_script || 'No phone number'}</div>
                        </div>
                    </div>
                    
                    <div id="tab-email-${idx}" class="tab-content">
                        <div class="outreach-section">
                            <div class="outreach-label">
                                <span>Email Script</span>
                                <button class="copy-btn" onclick="copyToClipboard(\`${b.email_script?.replace(/`/g, "'") || ''}\`, this)">Copy</button>
                            </div>
                            <div class="outreach-text">${b.email_script || 'No email'}</div>
                        </div>
                    </div>
                    
                    <div id="tab-followup-${idx}" class="tab-content">
                        <div class="outreach-section">
                            <div class="outreach-label">
                                <span>Follow-up 1 (Day 3)</span>
                                <button class="copy-btn" onclick="copyToClipboard(\`${b.followup_1?.replace(/`/g, "'") || ''}\`, this)">Copy</button>
                            </div>
                            <div class="outreach-text">${b.followup_1 || ''}</div>
                        </div>
                        <div class="outreach-section">
                            <div class="outreach-label">
                                <span>Follow-up 2 (Day 7)</span>
                                <button class="copy-btn" onclick="copyToClipboard(\`${b.followup_2?.replace(/`/g, "'") || ''}\`, this)">Copy</button>
                            </div>
                            <div class="outreach-text">${b.followup_2 || ''}</div>
                        </div>
                        <div class="outreach-section">
                            <div class="outreach-label">
                                <span>Follow-up 3 (Day 14)</span>
                                <button class="copy-btn" onclick="copyToClipboard(\`${b.followup_3?.replace(/`/g, "'") || ''}\`, this)">Copy</button>
                            </div>
                            <div class="outreach-text">${b.followup_3 || ''}</div>
                        </div>
                    </div>
                    
                    <div class="psychology-hints">
                        <div class="hint"><strong>Pain Trigger:</strong> ${b.pain_trigger || 'N/A'}</div>
                        <div class="hint"><strong>Identity Gap:</strong> ${b.identity_gap || 'N/A'}</div>
                        <div class="hint"><strong>Closing Lever:</strong> ${b.closing_trigger || 'N/A'}</div>
                    </div>
                `;
                list.appendChild(card);
            });
            
            // Update stats
            document.getElementById('total-count').textContent = filtered.length;
            document.getElementById('high-score-count').textContent = 
                filtered.filter(d => (d.opportunity_score || 0) >= 80).length;
            document.getElementById('with-ig-count').textContent = 
                filtered.filter(d => d.instagram_link).length;
        }
        
        function showTab(idx, tab) {
            // Hide all tabs for this card
            document.querySelectorAll(`[id^="tab-"][id$="-${idx}"]`).forEach(el => {
                el.classList.remove('active');
            });
            // Show selected tab
            document.getElementById(`tab-${tab}-${idx}`).classList.add('active');
            
            // Update tab buttons
            const card = document.querySelectorAll('.business-card')[idx];
            card.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
        }
        
        // Initialize filters
        const categories = [...new Set(DATA.map(d => d.category))];
        const catSelect = document.getElementById('filter-category');
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            catSelect.appendChild(opt);
        });
        
        // Filter handlers
        document.getElementById('filter-category').addEventListener('change', applyFilters);
        document.getElementById('filter-score').addEventListener('change', applyFilters);
        document.getElementById('filter-channel').addEventListener('change', applyFilters);
        
        function applyFilters() {
            renderBusinesses({
                category: document.getElementById('filter-category').value,
                minScore: parseInt(document.getElementById('filter-score').value),
                channel: document.getElementById('filter-channel').value,
            });
        }
        
        // Initial render
        renderBusinesses();
    </script>
</body>
</html>"""
        
        # Inject data
        json_data = json.dumps(data, ensure_ascii=False)
        html = html.replace("PLACEHOLDER_DATA", json_data)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html)
        
        return str(filepath)


def export_outreach_ready(
    businesses: list[Business],
    scans: list[BusinessDeepScan],
    output_dir: str = "outreach_ready",
) -> dict:
    """
    Generate all outreach-ready exports.
    Returns paths to all generated files.
    """
    exporter = OutreachReadyExporter(output_dir)
    
    # Build data
    data = []
    for biz, scan in zip(businesses, scans):
        data.append(exporter.export_single(biz, scan))
    
    # Sort by opportunity score
    data.sort(key=lambda x: x.get("opportunity_score", 0) or 0, reverse=True)
    
    # Generate all formats
    return {
        "csv_full": exporter.export_batch_csv(data, "outreach_full.csv"),
        "csv_quick": exporter.export_quick_action_csv(data, "quick_actions.csv"),
        "json": exporter.export_batch_json(data, "outreach_data.json"),
        "html_dashboard": exporter.export_html_dashboard(data, "dashboard.html"),
        "total_leads": len(data),
        "high_score": len([d for d in data if (d.get("opportunity_score") or 0) >= 80]),
        "with_instagram": len([d for d in data if d.get("instagram_link")]),
        "with_whatsapp": len([d for d in data if d.get("whatsapp_link")]),
    }
