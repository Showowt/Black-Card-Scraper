"""
Export service.
Exports business data to CSV, JSON, and other formats.
"""
import csv
import json
from datetime import datetime
from pathlib import Path
import pandas as pd
from models import Business


class Exporter:
    """Export business data to various formats."""
    
    @staticmethod
    def to_csv(
        businesses: list[Business],
        filepath: str | Path,
        columns: list[str] | None = None,
    ) -> Path:
        """
        Export businesses to CSV.
        Default columns optimized for outreach/CRM import.
        """
        default_columns = [
            "name",
            "category",
            "subcategory",
            "city",
            "address",
            "website",
            "email",
            "phone",
            "whatsapp",
            "instagram",
            "facebook",
            "rating",
            "review_count",
            "ai_readiness",
            "ai_opportunity_score",
            "ai_outreach_hook",
            "outreach_status",
        ]
        
        columns = columns or default_columns
        filepath = Path(filepath)
        
        rows = []
        for biz in businesses:
            row = {
                "name": biz.name,
                "category": biz.category.value,
                "subcategory": biz.subcategory,
                "city": biz.city,
                "address": biz.address,
                "website": biz.website,
                "email": biz.contact.email,
                "phone": biz.contact.phone,
                "whatsapp": biz.contact.whatsapp,
                "instagram": biz.socials.instagram,
                "facebook": biz.socials.facebook,
                "rating": biz.rating,
                "review_count": biz.review_count,
                "ai_readiness": biz.ai_readiness.value if hasattr(biz.ai_readiness, "value") else biz.ai_readiness,
                "ai_opportunity_score": biz.ai_opportunity_score,
                "ai_outreach_hook": biz.ai_outreach_hook,
                "ai_summary": biz.ai_summary,
                "outreach_status": biz.outreach_status,
                "tags": ",".join(biz.tags) if biz.tags else "",
                "source": biz.source.value,
                "external_id": biz.external_id,
            }
            rows.append({k: row.get(k) for k in columns})
        
        df = pd.DataFrame(rows)
        df.to_csv(filepath, index=False, quoting=csv.QUOTE_ALL)
        
        return filepath
    
    @staticmethod
    def to_json(
        businesses: list[Business],
        filepath: str | Path,
        pretty: bool = True,
    ) -> Path:
        """Export businesses to JSON."""
        filepath = Path(filepath)
        
        data = [biz.model_dump(mode="json") for biz in businesses]
        
        with open(filepath, "w", encoding="utf-8") as f:
            if pretty:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)
            else:
                json.dump(data, f, ensure_ascii=False, default=str)
        
        return filepath
    
    @staticmethod
    def to_outreach_csv(
        businesses: list[Business],
        filepath: str | Path,
    ) -> Path:
        """
        Export specifically for outreach campaigns.
        Filters to businesses with email OR phone.
        Includes personalized outreach hook.
        """
        # Filter to contactable businesses
        contactable = [
            biz for biz in businesses
            if biz.contact.email or biz.contact.phone or biz.contact.whatsapp
        ]
        
        # Sort by opportunity score
        contactable.sort(key=lambda x: x.ai_opportunity_score or 0, reverse=True)
        
        columns = [
            "name",
            "subcategory",
            "city",
            "email",
            "phone",
            "whatsapp",
            "ai_outreach_hook",
            "ai_opportunity_score",
            "website",
            "instagram",
        ]
        
        return Exporter.to_csv(contactable, filepath, columns)
    
    @staticmethod
    def to_movvia_vendors(
        businesses: list[Business],
        filepath: str | Path,
    ) -> Path:
        """
        Export format for Movvia vendor import.
        Tourism-focused businesses.
        """
        tourism_categories = ["hotel", "tour_operator", "restaurant", "spa", "club"]
        
        vendors = [
            biz for biz in businesses
            if biz.category.value in tourism_categories
        ]
        
        # Movvia-specific format
        rows = []
        for biz in vendors:
            rows.append({
                "vendor_name": biz.name,
                "vendor_type": biz.subcategory or biz.category.value,
                "location": biz.city,
                "address": biz.address,
                "website": biz.website,
                "contact_email": biz.contact.email,
                "contact_phone": biz.contact.phone,
                "whatsapp": biz.contact.whatsapp,
                "instagram": biz.socials.instagram,
                "rating": biz.rating,
                "price_tier": biz.price_level.value if biz.price_level else None,
                "description": biz.ai_summary or biz.description,
                "tags": ",".join(biz.tags) if biz.tags else "",
                "external_ref": f"{biz.source.value}:{biz.external_id}",
            })
        
        filepath = Path(filepath)
        df = pd.DataFrame(rows)
        df.to_csv(filepath, index=False, quoting=csv.QUOTE_ALL)
        
        return filepath
    
    @staticmethod
    def generate_report(
        businesses: list[Business],
        city: str,
    ) -> str:
        """Generate a markdown summary report."""
        total = len(businesses)
        
        # Category breakdown
        categories = {}
        for biz in businesses:
            cat = biz.category.value
            categories[cat] = categories.get(cat, 0) + 1
        
        # Readiness breakdown
        readiness = {"high": 0, "medium": 0, "low": 0, "unknown": 0}
        for biz in businesses:
            r = biz.ai_readiness.value if hasattr(biz.ai_readiness, "value") else str(biz.ai_readiness)
            readiness[r] = readiness.get(r, 0) + 1
        
        # Contact stats
        with_email = sum(1 for b in businesses if b.contact.email)
        with_phone = sum(1 for b in businesses if b.contact.phone)
        with_website = sum(1 for b in businesses if b.website)
        
        # Top opportunities
        top_opps = sorted(
            [b for b in businesses if b.ai_opportunity_score],
            key=lambda x: x.ai_opportunity_score or 0,
            reverse=True
        )[:10]
        
        report = f"""# Business Scanner Report: {city}
Generated: {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}

## Overview
- **Total Businesses**: {total}
- **With Email**: {with_email} ({100*with_email//total if total else 0}%)
- **With Phone**: {with_phone} ({100*with_phone//total if total else 0}%)
- **With Website**: {with_website} ({100*with_website//total if total else 0}%)

## By Category
| Category | Count |
|----------|-------|
"""
        for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
            report += f"| {cat} | {count} |\n"
        
        report += f"""
## AI Readiness
| Level | Count |
|-------|-------|
| High | {readiness['high']} |
| Medium | {readiness['medium']} |
| Low | {readiness['low']} |
| Unknown | {readiness['unknown']} |

## Top 10 Opportunities
| Business | Category | Score | Readiness |
|----------|----------|-------|-----------|
"""
        for biz in top_opps:
            report += f"| {biz.name} | {biz.subcategory or biz.category.value} | {biz.ai_opportunity_score} | {biz.ai_readiness} |\n"
        
        return report
