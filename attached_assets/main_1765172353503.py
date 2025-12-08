#!/usr/bin/env python3
"""
Black Card Business Scanner
CLI for scraping, enriching, and managing business data.
"""
import asyncio
from pathlib import Path
from datetime import datetime
import typer
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich import print as rprint

from config import get_settings, CATEGORY_MAPPING, CITY_COORDINATES, TEXT_SEARCH_SUPPLEMENTS

app = typer.Typer(
    name="scanner",
    help="Black Card Business Scanner - Own the map of monetizable businesses",
)
console = Console()


@app.command()
def scan(
    city: str = typer.Option("Cartagena", "--city", "-c", help="City to scan"),
    category: str = typer.Option("restaurant", "--category", "-cat", help="Business category"),
    max_results: int = typer.Option(60, "--max", "-m", help="Max results"),
    enrich: bool = typer.Option(True, "--enrich/--no-enrich", help="Run AI enrichment"),
    save: bool = typer.Option(True, "--save/--no-save", help="Save to Supabase"),
    export_csv: str = typer.Option(None, "--export", "-e", help="Export to CSV path"),
):
    """
    Scan for businesses in a city/category.
    
    Example:
        python main.py scan --city Cartagena --category restaurant --max 50
    """
    # Validate inputs
    if city not in CITY_COORDINATES:
        console.print(f"[red]Unknown city: {city}[/red]")
        console.print(f"Available: {', '.join(CITY_COORDINATES.keys())}")
        raise typer.Exit(1)
    
    if category not in CATEGORY_MAPPING:
        console.print(f"[red]Unknown category: {category}[/red]")
        console.print(f"Available: {', '.join(CATEGORY_MAPPING.keys())}")
        raise typer.Exit(1)
    
    asyncio.run(_scan(city, category, max_results, enrich, save, export_csv))


async def _scan(city, category, max_results, enrich, save, export_csv):
    from scrapers.google_places import fetch_businesses
    from scrapers.website import enrich_with_website
    from services.enricher import AIEnricher
    from services.storage import SupabaseStorage
    from services.exporter import Exporter
    
    console.print(f"\n[bold blue]🔍 Scanning {city} for {category} businesses...[/bold blue]\n")
    
    # Step 1: Fetch from Google Places
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Fetching from Google Places...", total=None)
        businesses = await fetch_businesses(city, category, max_results)
        progress.update(task, completed=True)
    
    console.print(f"[green]✓ Found {len(businesses)} businesses[/green]")
    
    if not businesses:
        console.print("[yellow]No businesses found. Try a different category or city.[/yellow]")
        return
    
    # Step 2: Enrich with website metadata
    with_websites = [b for b in businesses if b.website]
    if with_websites:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task(f"Scraping {len(with_websites)} websites...", total=None)
            await enrich_with_website(with_websites, rate_limit=0.5)
            progress.update(task, completed=True)
        console.print(f"[green]✓ Enriched {len(with_websites)} with website data[/green]")
    
    # Step 3: AI enrichment
    if enrich:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Running AI enrichment...", total=None)
            enricher = AIEnricher()
            businesses = await enricher.enrich_batch(businesses, concurrency=5)
            progress.update(task, completed=True)
        console.print(f"[green]✓ AI enrichment complete[/green]")
    
    # Step 4: Save to Supabase
    if save:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Saving to database...", total=None)
            storage = SupabaseStorage()
            await storage.upsert_batch(businesses)
            progress.update(task, completed=True)
        console.print(f"[green]✓ Saved to Supabase[/green]")
    
    # Step 5: Export
    if export_csv:
        filepath = Exporter.to_csv(businesses, export_csv)
        console.print(f"[green]✓ Exported to {filepath}[/green]")
    
    # Summary table
    _print_summary_table(businesses)


def _print_summary_table(businesses):
    """Print a summary table of top opportunities."""
    table = Table(title="\n🎯 Top Opportunities")
    table.add_column("Business", style="cyan")
    table.add_column("Type", style="magenta")
    table.add_column("Score", justify="right", style="green")
    table.add_column("Readiness")
    table.add_column("Contact")
    
    # Sort by opportunity score
    sorted_biz = sorted(
        businesses,
        key=lambda x: x.ai_opportunity_score or 0,
        reverse=True
    )[:10]
    
    for biz in sorted_biz:
        contact = "📧" if biz.contact.email else ""
        contact += "📱" if biz.contact.phone else ""
        contact += "💬" if biz.contact.whatsapp else ""
        
        readiness = biz.ai_readiness
        if hasattr(readiness, "value"):
            readiness = readiness.value
        
        readiness_style = {
            "high": "[green]HIGH[/green]",
            "medium": "[yellow]MEDIUM[/yellow]",
            "low": "[red]LOW[/red]",
        }.get(readiness, readiness)
        
        table.add_row(
            biz.name[:30],
            (biz.subcategory or biz.category.value)[:20],
            str(biz.ai_opportunity_score or "-"),
            readiness_style,
            contact or "-",
        )
    
    console.print(table)


@app.command()
def stats(
    city: str = typer.Option(None, "--city", "-c", help="Filter by city"),
):
    """Show database statistics."""
    asyncio.run(_stats(city))


async def _stats(city):
    from services.storage import SupabaseStorage
    
    storage = SupabaseStorage()
    stats = await storage.get_stats(city)
    
    console.print(f"\n[bold blue]📊 Database Statistics{f' - {city}' if city else ''}[/bold blue]\n")
    
    table = Table(show_header=False)
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    
    table.add_row("Total Businesses", str(stats["total"]))
    table.add_row("With Email", str(stats["with_email"]))
    table.add_row("With Website", str(stats["with_website"]))
    table.add_row("Avg Opportunity Score", str(stats["average_opportunity_score"]))
    
    console.print(table)
    
    # Category breakdown
    console.print("\n[bold]By Category:[/bold]")
    for cat, count in sorted(stats["by_category"].items(), key=lambda x: -x[1]):
        console.print(f"  {cat}: {count}")
    
    # Readiness breakdown
    console.print("\n[bold]By AI Readiness:[/bold]")
    for level, count in stats["by_readiness"].items():
        console.print(f"  {level}: {count}")


@app.command()
def export(
    city: str = typer.Option(None, "--city", "-c", help="Filter by city"),
    category: str = typer.Option(None, "--category", "-cat", help="Filter by category"),
    min_score: int = typer.Option(None, "--min-score", "-s", help="Minimum opportunity score"),
    format: str = typer.Option("csv", "--format", "-f", help="Export format: csv, json, outreach, movvia"),
    output: str = typer.Option(None, "--output", "-o", help="Output file path"),
):
    """Export business data."""
    asyncio.run(_export(city, category, min_score, format, output))


async def _export(city, category, min_score, format, output):
    from services.storage import SupabaseStorage
    from services.exporter import Exporter
    from models import BusinessCategory
    
    storage = SupabaseStorage()
    
    cat_enum = None
    if category:
        try:
            cat_enum = BusinessCategory(category)
        except ValueError:
            console.print(f"[red]Invalid category: {category}[/red]")
            raise typer.Exit(1)
    
    businesses = await storage.search(
        city=city,
        category=cat_enum,
        min_score=min_score,
        limit=1000,
    )
    
    if not businesses:
        console.print("[yellow]No businesses found matching filters[/yellow]")
        return
    
    console.print(f"[green]Found {len(businesses)} businesses[/green]")
    
    # Generate filename if not provided
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    if not output:
        prefix = f"{city or 'all'}_{category or 'all'}_{timestamp}"
        if format == "json":
            output = f"export_{prefix}.json"
        else:
            output = f"export_{prefix}.csv"
    
    # Export
    if format == "json":
        filepath = Exporter.to_json(businesses, output)
    elif format == "outreach":
        filepath = Exporter.to_outreach_csv(businesses, output)
    elif format == "movvia":
        filepath = Exporter.to_movvia_vendors(businesses, output)
    else:
        filepath = Exporter.to_csv(businesses, output)
    
    console.print(f"[green]✓ Exported to {filepath}[/green]")


@app.command()
def search(
    query: str = typer.Argument(..., help="Search query"),
    city: str = typer.Option("Cartagena", "--city", "-c", help="City to search"),
    max_results: int = typer.Option(20, "--max", "-m", help="Max results"),
):
    """
    Text search for specific businesses.
    
    Example:
        python main.py search "rooftop bar" --city Cartagena
    """
    asyncio.run(_search(query, city, max_results))


async def _search(query, city, max_results):
    from scrapers.google_places import GooglePlacesClient
    
    console.print(f"\n[bold blue]🔍 Searching: {query} in {city}[/bold blue]\n")
    
    client = GooglePlacesClient()
    try:
        results = await client.text_search(query, city, max_results)
        
        if not results:
            console.print("[yellow]No results found[/yellow]")
            return
        
        businesses = [client.normalize(r, city) for r in results]
        
        table = Table(title=f"Results for '{query}'")
        table.add_column("Name", style="cyan")
        table.add_column("Type")
        table.add_column("Rating")
        table.add_column("Website")
        
        for biz in businesses:
            table.add_row(
                biz.name[:35],
                biz.category.value,
                f"{biz.rating:.1f}" if biz.rating else "-",
                "✓" if biz.website else "-",
            )
        
        console.print(table)
    finally:
        await client.close()


@app.command()
def setup():
    """Print Supabase schema setup instructions."""
    from services.storage import SCHEMA_SQL
    
    console.print("\n[bold blue]📋 Supabase Setup Instructions[/bold blue]\n")
    console.print("1. Go to your Supabase project's SQL Editor")
    console.print("2. Run the following SQL:\n")
    console.print(f"[dim]{SCHEMA_SQL}[/dim]")
    console.print("\n3. Copy your project URL and anon key to .env")


@app.command()
def categories():
    """List available categories."""
    console.print("\n[bold blue]📂 Available Categories[/bold blue]\n")
    for cat, types in CATEGORY_MAPPING.items():
        console.print(f"  [cyan]{cat}[/cyan]: {', '.join(types)}")


@app.command()
def cities():
    """List available cities."""
    console.print("\n[bold blue]🌎 Available Cities[/bold blue]\n")
    for city, coords in CITY_COORDINATES.items():
        console.print(f"  [cyan]{city}[/cyan]: {coords['lat']}, {coords['lng']} (radius: {coords['radius']}m)")


@app.command()
def outreach(
    business_id: str = typer.Argument(..., help="Business ID from database"),
    type: str = typer.Option("email", "--type", "-t", help="email, whatsapp, or audit"),
    sender: str = typer.Option("Your Name", "--sender", "-s", help="Your name"),
    agency: str = typer.Option("Your Agency", "--agency", "-a", help="Agency name"),
):
    """Generate outreach content for a specific business."""
    asyncio.run(_outreach(business_id, type, sender, agency))


async def _outreach(business_id, type, sender, agency):
    from services.storage import SupabaseStorage
    from services.outreach import OutreachGenerator, format_audit_markdown
    
    storage = SupabaseStorage()
    business = await storage.get_by_id(business_id)
    
    if not business:
        console.print(f"[red]Business not found: {business_id}[/red]")
        raise typer.Exit(1)
    
    console.print(f"\n[bold blue]📧 Generating {type} for {business.name}[/bold blue]\n")
    
    generator = OutreachGenerator()
    
    if type == "email":
        result = await generator.generate_email(business, sender, agency)
        console.print(f"[bold]Subject:[/bold] {result['subject']}\n")
        console.print(f"[bold]Body:[/bold]\n{result['body']}\n")
        console.print(f"[bold]Follow-up:[/bold]\n{result['follow_up']}")
    
    elif type == "whatsapp":
        result = await generator.generate_whatsapp(business, sender)
        console.print(f"[bold]Message:[/bold]\n{result}")
    
    elif type == "audit":
        result = await generator.generate_audit_report(business)
        console.print(format_audit_markdown(business, result))
    
    else:
        console.print(f"[red]Unknown type: {type}. Use email, whatsapp, or audit.[/red]")


@app.command()
def batch_outreach(
    city: str = typer.Option(None, "--city", "-c", help="Filter by city"),
    category: str = typer.Option(None, "--category", "-cat", help="Filter by category"),
    min_score: int = typer.Option(70, "--min-score", "-s", help="Minimum opportunity score"),
    limit: int = typer.Option(20, "--limit", "-l", help="Max businesses"),
    sender: str = typer.Option("Your Name", "--sender", help="Your name"),
    agency: str = typer.Option("Your Agency", "--agency", help="Agency name"),
    output: str = typer.Option("outreach_batch.json", "--output", "-o", help="Output file"),
):
    """Generate outreach emails for multiple businesses."""
    asyncio.run(_batch_outreach(city, category, min_score, limit, sender, agency, output))


async def _batch_outreach(city, category, min_score, limit, sender, agency, output):
    from services.storage import SupabaseStorage
    from services.outreach import OutreachGenerator
    from models import BusinessCategory
    import json
    
    storage = SupabaseStorage()
    
    cat_enum = None
    if category:
        try:
            cat_enum = BusinessCategory(category)
        except ValueError:
            console.print(f"[red]Invalid category: {category}[/red]")
            raise typer.Exit(1)
    
    businesses = await storage.search(
        city=city,
        category=cat_enum,
        min_score=min_score,
        has_email=True,
        limit=limit,
    )
    
    if not businesses:
        console.print("[yellow]No businesses found matching filters[/yellow]")
        return
    
    console.print(f"[green]Generating outreach for {len(businesses)} businesses...[/green]")
    
    generator = OutreachGenerator()
    results = await generator.generate_batch_emails(businesses, sender, agency)
    
    # Save to file
    with open(output, "w") as f:
        json.dump(results, f, indent=2)
    
    console.print(f"[green]✓ Saved to {output}[/green]")
    
    # Show preview
    table = Table(title="Outreach Preview")
    table.add_column("Business")
    table.add_column("Subject")
    table.add_column("Email")
    
    for r in results[:5]:
        table.add_row(
            r["business_name"][:25],
            r["subject"][:40],
            r.get("email", "-")[:30] if r.get("email") else "-",
        )
    
    console.print(table)


@app.command()
def deep_scan(
    city: str = typer.Option("Cartagena", "--city", "-c", help="City to scan"),
    category: str = typer.Option(..., "--category", "-cat", help="Business category"),
    save: bool = typer.Option(True, "--save/--no-save", help="Save to database"),
):
    """
    Deep scan a category using both API + text searches.
    Use for categories with limited Places API coverage (chef, dj, photographer, etc.)
    """
    if category not in TEXT_SEARCH_SUPPLEMENTS and category not in CATEGORY_MAPPING:
        console.print(f"[red]Unknown category: {category}[/red]")
        raise typer.Exit(1)
    
    asyncio.run(_deep_scan(city, category, save))


async def _deep_scan(city, category, save):
    from scrapers.google_places import GooglePlacesClient, fetch_businesses
    from scrapers.website import enrich_with_website
    from services.enricher import AIEnricher
    from services.storage import SupabaseStorage
    
    console.print(f"\n[bold blue]🔍 Deep scanning {category} in {city}...[/bold blue]\n")
    
    all_businesses = []
    client = GooglePlacesClient()
    
    try:
        # Standard category scan if available
        if category in CATEGORY_MAPPING:
            with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
                task = progress.add_task(f"Scanning {category} via API...", total=None)
                businesses = await fetch_businesses(city, category, max_results=40)
                all_businesses.extend(businesses)
                progress.update(task, completed=True)
            console.print(f"[green]✓ Found {len(businesses)} via API[/green]")
        
        # Text search supplements
        if category in TEXT_SEARCH_SUPPLEMENTS:
            queries = TEXT_SEARCH_SUPPLEMENTS[category]
            for query in queries:
                with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
                    task = progress.add_task(f"Searching: {query}...", total=None)
                    results = await client.text_search(query, city, max_results=20)
                    for raw in results:
                        biz = client.normalize(raw, city)
                        all_businesses.append(biz)
                    progress.update(task, completed=True)
                console.print(f"[dim]  {query}: {len(results)} results[/dim]")
        
        # Dedupe by external_id
        seen = set()
        unique = []
        for biz in all_businesses:
            if biz.external_id not in seen:
                seen.add(biz.external_id)
                unique.append(biz)
        
        console.print(f"\n[green]✓ {len(unique)} unique businesses after dedup[/green]")
        
        # Website enrichment
        with_websites = [b for b in unique if b.website]
        if with_websites:
            with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
                task = progress.add_task(f"Enriching {len(with_websites)} websites...", total=None)
                await enrich_with_website(with_websites, rate_limit=0.5)
                progress.update(task, completed=True)
        
        # AI enrichment
        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
            task = progress.add_task("Running AI enrichment...", total=None)
            enricher = AIEnricher()
            unique = await enricher.enrich_batch(unique, concurrency=5)
            progress.update(task, completed=True)
        
        # Save
        if save:
            with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
                task = progress.add_task("Saving to database...", total=None)
                storage = SupabaseStorage()
                await storage.upsert_batch(unique)
                progress.update(task, completed=True)
            console.print(f"[green]✓ Saved to Supabase[/green]")
        
        _print_summary_table(unique)
        
    finally:
        await client.close()


@app.command()
def intent_scan(
    time_filter: str = typer.Option("week", "--time", "-t", help="Time filter: day, week, month"),
    output: str = typer.Option("intent_signals.json", "--output", "-o", help="Output file"),
    min_intent: str = typer.Option("medium", "--min-intent", "-m", help="Minimum intent level: high, medium, low"),
):
    """
    Scan Reddit for Cartagena travel intent signals.
    Finds people actively planning trips.
    """
    asyncio.run(_intent_scan(time_filter, output, min_intent))


async def _intent_scan(time_filter, output, min_intent):
    from scrapers.intent_signals import run_intent_scan
    
    console.print(f"\n[bold blue]🎯 Scanning for travel intent signals...[/bold blue]\n")
    console.print(f"[dim]Time filter: {time_filter} | Min intent: {min_intent}[/dim]\n")
    
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task("Scanning Reddit...", total=None)
        signals = await run_intent_scan(
            sources=["reddit"],
            time_filter=time_filter,
            output_file=output,
        )
        progress.update(task, completed=True)
    
    # Filter by intent level
    intent_order = {"high": 0, "medium": 1, "low": 2}
    min_level = intent_order.get(min_intent, 1)
    filtered = [s for s in signals if intent_order.get(s.intent_level, 2) <= min_level]
    
    console.print(f"[green]✓ Found {len(filtered)} intent signals[/green]")
    
    if not filtered:
        console.print("[yellow]No signals found. Try expanding time filter to 'month'.[/yellow]")
        return
    
    # Summary table
    table = Table(title="\n🎯 Top Intent Signals")
    table.add_column("Intent", style="cyan")
    table.add_column("Title", max_width=40)
    table.add_column("Interests")
    table.add_column("Budget")
    table.add_column("Score")
    
    for signal in filtered[:15]:
        intent_style = {
            "high": "[green]HIGH[/green]",
            "medium": "[yellow]MED[/yellow]",
            "low": "[dim]LOW[/dim]",
        }.get(signal.intent_level, signal.intent_level)
        
        table.add_row(
            intent_style,
            (signal.title or "")[:40],
            ", ".join(signal.interests[:2]) if signal.interests else "-",
            ", ".join(signal.budget_signals) if signal.budget_signals else "-",
            str(signal.score or 0),
        )
    
    console.print(table)
    console.print(f"\n[dim]Full results saved to {output}[/dim]")
    
    # High-intent summary
    high_intent = [s for s in filtered if s.intent_level == "high"]
    luxury = [s for s in filtered if "luxury" in s.budget_signals]
    complaints = [s for s in signals if s.is_complaint]
    
    console.print(f"\n[bold]Summary:[/bold]")
    console.print(f"  🔥 High intent: {len(high_intent)}")
    console.print(f"  💎 Luxury signals: {len(luxury)}")
    console.print(f"  ⚠️  Competitor complaints: {len(complaints)}")


@app.command()
def events(
    city: str = typer.Option("cartagena", "--city", "-c", help="City to scan"),
    sources: str = typer.Option("eventbrite,resident_advisor", "--sources", "-s", help="Comma-separated sources"),
    min_tier: str = typer.Option(None, "--min-tier", "-t", help="Minimum tier: premium, mid_tier, budget"),
    output: str = typer.Option("events.json", "--output", "-o", help="Output file"),
    format: str = typer.Option("json", "--format", "-f", help="Output format: json, csv"),
):
    """
    Discover events from Eventbrite, Resident Advisor, etc.
    Flags high-end events automatically.
    """
    asyncio.run(_events(city, sources.split(","), min_tier, output, format))


async def _events(city, sources, min_tier, output, format):
    from scrapers.events import (
        discover_all_events,
        export_events_json,
        export_events_csv,
        get_flagged_events,
        generate_event_alert,
    )
    
    console.print(f"\n[bold blue]🎉 Discovering events in {city.title()}...[/bold blue]\n")
    console.print(f"[dim]Sources: {', '.join(sources)}[/dim]\n")
    
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task("Scanning event sources...", total=None)
        events = await discover_all_events(city=city, sources=sources, min_tier=min_tier)
        progress.update(task, completed=True)
    
    console.print(f"\n[green]✓ Found {len(events)} events[/green]")
    
    if not events:
        console.print("[yellow]No events found. Try different sources or city.[/yellow]")
        return
    
    # Export
    if format == "csv":
        export_events_csv(events, output)
    else:
        export_events_json(events, output)
    
    console.print(f"[green]✓ Exported to {output}[/green]")
    
    # Flagged events summary
    flagged = get_flagged_events(events)
    
    if flagged:
        console.print(f"\n[bold red]🔥 {len(flagged)} HIGH-PRIORITY EVENTS:[/bold red]\n")
        
        table = Table(title="Flagged Events")
        table.add_column("Date", style="cyan")
        table.add_column("Event", max_width=30)
        table.add_column("Venue", max_width=20)
        table.add_column("Tier", style="green")
        table.add_column("Price")
        
        for event in flagged[:10]:
            table.add_row(
                event.start_date.strftime("%b %d"),
                event.name[:30],
                (event.venue.name if event.venue else "TBA")[:20],
                event.event_tier.value.upper(),
                f"{event.min_price or '?'}-{event.max_price or '?'} {event.currency}",
            )
        
        console.print(table)
    
    # Tier breakdown
    from scrapers.events.models import EventTier
    console.print("\n[bold]By Tier:[/bold]")
    for tier in [EventTier.ULTRA_PREMIUM, EventTier.PREMIUM, EventTier.MID_TIER]:
        count = len([e for e in events if e.event_tier == tier])
        if count:
            console.print(f"  {tier.value}: {count}")


@app.command()
def venues_monitor():
    """
    Generate venue monitoring list for Instagram tracking.
    Outputs CSV of venues to check manually or via RSS.
    """
    from scrapers.events.instagram_monitor import (
        generate_monitoring_csv,
        CARTAGENA_VENUES,
        RSS_SETUP_GUIDE,
    )
    
    output = "venues_to_monitor.csv"
    generate_monitoring_csv(output)
    
    console.print(f"\n[bold blue]📍 Venue Monitoring List[/bold blue]\n")
    console.print(f"[green]✓ Generated {output}[/green]")
    console.print(f"[dim]Total venues: {len(CARTAGENA_VENUES)}[/dim]\n")
    
    # Priority breakdown
    table = Table(title="Priority Venues")
    table.add_column("Priority")
    table.add_column("Name")
    table.add_column("Handle")
    table.add_column("Category")
    table.add_column("Tier")
    
    for venue in sorted(CARTAGENA_VENUES, key=lambda x: x.priority)[:10]:
        table.add_row(
            str(venue.priority),
            venue.name,
            f"@{venue.instagram_handle}",
            venue.category,
            venue.tier,
        )
    
    console.print(table)
    
    console.print("\n[bold]Instagram Monitoring Options:[/bold]")
    console.print("  1. Manual: Check priority 1 venues daily (15 min)")
    console.print("  2. RSS.app: Set up feeds for automated alerts (~$10/mo)")
    console.print("  3. IFTTT: Create applets for push notifications")
    console.print("\n[dim]Run 'python main.py events-setup' for detailed instructions[/dim]")


@app.command()
def events_setup():
    """Show setup instructions for event monitoring."""
    from scrapers.events.instagram_monitor import RSS_SETUP_GUIDE
    from scrapers.events import EVENTS_SCHEMA_SQL
    
    console.print("\n[bold blue]🛠️ Event Discovery Setup[/bold blue]\n")
    
    console.print("[bold]1. Database Schema[/bold]")
    console.print("Run this SQL in Supabase:")
    console.print(f"[dim]{EVENTS_SCHEMA_SQL[:500]}...[/dim]\n")
    
    console.print("[bold]2. Instagram Monitoring[/bold]")
    console.print(RSS_SETUP_GUIDE)


@app.command()
def events(
    days: int = typer.Option(90, "--days", "-d", help="Days ahead to scan"),
    output: str = typer.Option("events.json", "--output", "-o", help="Output file"),
    priority_only: bool = typer.Option(False, "--priority", "-p", help="Show only high-priority events"),
):
    """
    Discover upcoming events in Cartagena.
    Flags luxury/high-end events for Movvia.
    """
    asyncio.run(_events(days, output, priority_only))


async def _events(days, output, priority_only):
    from scrapers.events import run_event_discovery, EventTier
    
    console.print(f"\n[bold blue]🎉 Discovering events ({days} days ahead)...[/bold blue]\n")
    
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task("Scanning event sources...", total=None)
        events = await run_event_discovery(days_ahead=days, output_file=output)
        progress.update(task, completed=True)
    
    if priority_only:
        events = [e for e in events if e.is_high_priority]
    
    console.print(f"[green]✓ Found {len(events)} events[/green]")
    
    if not events:
        console.print("[yellow]No events found. Try expanding date range.[/yellow]")
        return
    
    # Summary table
    table = Table(title="\n🎉 Upcoming Events")
    table.add_column("Date", style="cyan")
    table.add_column("Event", max_width=35)
    table.add_column("Venue")
    table.add_column("Tier")
    table.add_column("Priority")
    
    for event in events[:20]:
        tier_style = {
            "luxury": "[bold magenta]LUXURY[/bold magenta]",
            "premium": "[yellow]PREMIUM[/yellow]",
            "standard": "[dim]STANDARD[/dim]",
            "budget": "[dim]BUDGET[/dim]",
            "free": "[green]FREE[/green]",
        }.get(event.tier.value, event.tier.value)
        
        priority = "🔥" if event.is_high_priority else ""
        
        table.add_row(
            event.start_date.strftime("%b %d") if event.start_date else "-",
            event.name[:35],
            (event.venue_name or "-")[:20],
            tier_style,
            priority,
        )
    
    console.print(table)
    
    # Stats
    luxury_count = sum(1 for e in events if e.tier == EventTier.LUXURY)
    premium_count = sum(1 for e in events if e.tier == EventTier.PREMIUM)
    priority_count = sum(1 for e in events if e.is_high_priority)
    
    console.print(f"\n[bold]Summary:[/bold]")
    console.print(f"  💎 Luxury events: {luxury_count}")
    console.print(f"  ⭐ Premium events: {premium_count}")
    console.print(f"  🔥 High priority: {priority_count}")
    console.print(f"\n[dim]Full results saved to {output}[/dim]")


@app.command()
def add_event(
    name: str = typer.Argument(..., help="Event name"),
    venue: str = typer.Argument(..., help="Venue name"),
    date: str = typer.Argument(..., help="Date (YYYY-MM-DD)"),
    price: float = typer.Option(None, "--price", "-p", help="Price in COP"),
    lineup: str = typer.Option(None, "--lineup", "-l", help="Comma-separated artist names"),
    ticket_url: str = typer.Option(None, "--url", "-u", help="Ticket URL"),
    notes: str = typer.Option(None, "--notes", "-n", help="Notes"),
):
    """
    Manually add an event (for Instagram finds, word of mouth).
    """
    from scrapers.events import create_manual_event
    from datetime import datetime
    import json
    
    try:
        event_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        console.print("[red]Invalid date format. Use YYYY-MM-DD[/red]")
        raise typer.Exit(1)
    
    lineup_list = [a.strip() for a in lineup.split(",")] if lineup else None
    
    event = create_manual_event(
        name=name,
        venue=venue,
        date=event_date,
        price_cop=price,
        lineup=lineup_list,
        ticket_url=ticket_url,
        notes=notes,
    )
    
    # Append to events file
    events_file = "events.json"
    try:
        with open(events_file, "r") as f:
            existing = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        existing = []
    
    existing.append(event.model_dump(mode="json"))
    
    with open(events_file, "w") as f:
        json.dump(existing, f, indent=2, default=str)
    
    console.print(f"[green]✓ Added event: {name}[/green]")
    console.print(f"  Venue: {venue}")
    console.print(f"  Date: {date}")
    console.print(f"  Tier: {event.tier.value}")
    console.print(f"  Priority: {'🔥 Yes' if event.is_high_priority else 'No'}")


@app.command()
def phil_scan(
    business_id: str = typer.Argument(..., help="Business ID from database"),
    output: str = typer.Option(None, "--output", "-o", help="Output file path"),
    proposal: bool = typer.Option(False, "--proposal", "-p", help="Also generate transformation proposal"),
):
    """
    Generate full Phil McGill outreach package for a business.
    Includes: Deep Scan, Offer Stack, Outreach Scripts, Psychology.
    """
    asyncio.run(_phil_scan(business_id, output, proposal))


async def _phil_scan(business_id, output, proposal):
    from services.storage import SupabaseStorage
    from services.deep_scan import run_deep_scan
    from services.transformation import generate_transformation_plan, format_plan_markdown
    
    storage = SupabaseStorage()
    business = await storage.get_by_id(business_id)
    
    if not business:
        console.print(f"[red]Business not found: {business_id}[/red]")
        raise typer.Exit(1)
    
    console.print(f"\n[bold blue]🎯 Generating Phil McGill Outreach Package[/bold blue]")
    console.print(f"[dim]Business: {business.name} | {business.category.value} | {business.city}[/dim]\n")
    
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task("Running Business Deep Scan™...", total=None)
        scan = await run_deep_scan(business)
        progress.update(task, completed=True)
    
    # Output
    if output:
        # Format the scan as markdown
        outreach_md = f"""# OUTREACH PACKAGE: {scan.business_name}
## {scan.category.upper()} | {scan.city}

---

## BUSINESS DEEP SCAN™

### Pain Points
"""
        for point in scan.pain_points:
            outreach_md += f"- {point}\n"
        
        outreach_md += "\n### Revenue Leakage\n"
        for leak in scan.revenue_leakage:
            outreach_md += f"- {leak}\n"
        
        outreach_md += "\n### AI Opportunities\n"
        for opp in scan.ai_opportunities:
            outreach_md += f"- {opp}\n"
        
        outreach_md += f"""
---

## OUTREACH SCRIPTS

### WhatsApp Opener
```
{scan.whatsapp_opener}
```

### Email Script
```
{scan.email_script}
```

### Instagram DM
```
{scan.instagram_dm}
```

### Follow-Up Sequence
"""
        for i, followup in enumerate(scan.follow_up_sequence, 1):
            outreach_md += f"**Follow-up {i}:**\n{followup}\n\n"
        
        outreach_md += f"""
---

## TARGETING & PSYCHOLOGY

### Owner Mindset
{scan.owner_mindset}

### Owner Fears
"""
        for fear in scan.owner_fears:
            outreach_md += f"- {fear}\n"
        
        outreach_md += "\n### Owner Desires\n"
        for desire in scan.owner_desires:
            outreach_md += f"- {desire}\n"
        
        outreach_md += "\n### Objection Handling\n"
        for obj in scan.objections:
            outreach_md += f"**Objection:** \"{obj.get('objection', '')}\"\n"
            outreach_md += f"**Response:** {obj.get('response', '')}\n\n"
        
        outreach_md += f"""
### Opening Strategy
{scan.opening_strategy}
"""
        
        with open(output, "w") as f:
            f.write(outreach_md)
        console.print(f"[green]✓ Saved to {output}[/green]")
        
        if proposal:
            prop_file = output.replace(".md", "_proposal.md")
            plan = await generate_transformation_plan(business, scan)
            plan_md = format_plan_markdown(plan)
            with open(prop_file, "w") as f:
                f.write(plan_md)
            console.print(f"[green]✓ Proposal saved to {prop_file}[/green]")
    else:
        # Print to console
        console.print(f"\n[bold]WhatsApp Opener:[/bold]")
        console.print(f"[cyan]{scan.whatsapp_opener}[/cyan]")
        
        console.print(f"\n[bold]Pain Points:[/bold]")
        for p in scan.pain_points:
            console.print(f"  • {p}")
    
    # Quick summary
    console.print(f"\n[bold]📋 Quick Summary[/bold]")
    console.print(f"Pain Points: {len(scan.pain_points)}")
    console.print(f"Revenue Leaks: {len(scan.revenue_leakage)}")
    console.print(f"AI Opportunities: {len(scan.ai_opportunities)}")
    console.print(f"Objection Handlers: {len(scan.objections)}")


@app.command()
def phil_batch(
    city: str = typer.Option("Cartagena", "--city", "-c", help="City to target"),
    category: str = typer.Option(None, "--category", "-cat", help="Category filter"),
    min_score: int = typer.Option(70, "--min-score", "-s", help="Minimum opportunity score"),
    limit: int = typer.Option(10, "--limit", "-l", help="Number of businesses"),
    output_dir: str = typer.Option("outreach_packages", "--output", "-o", help="Output directory"),
):
    """
    Generate outreach packages for multiple high-value businesses.
    """
    asyncio.run(_phil_batch(city, category, min_score, limit, output_dir))


async def _phil_batch(city, category, min_score, limit, output_dir):
    from services.storage import SupabaseStorage
    from services.deep_scan import run_batch_deep_scan
    from models import BusinessCategory
    import os
    
    storage = SupabaseStorage()
    
    cat_enum = None
    if category:
        try:
            cat_enum = BusinessCategory(category)
        except ValueError:
            console.print(f"[red]Invalid category: {category}[/red]")
            raise typer.Exit(1)
    
    businesses = await storage.search(
        city=city,
        category=cat_enum,
        min_score=min_score,
        limit=limit,
    )
    
    if not businesses:
        console.print("[yellow]No businesses found matching filters[/yellow]")
        return
    
    console.print(f"\n[bold blue]🎯 Generating {len(businesses)} Outreach Packages[/bold blue]\n")
    
    os.makedirs(output_dir, exist_ok=True)
    
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task(f"Processing {len(businesses)} businesses...", total=None)
        results = await run_batch_deep_scan(businesses, output_dir)
        progress.update(task, completed=True)
    
    console.print(f"[green]✓ Generated {len(results)} packages in {output_dir}/[/green]")
    
    # Summary table
    table = Table(title="Generated Packages")
    table.add_column("Business")
    table.add_column("Category")
    table.add_column("Pain Points")
    table.add_column("File")
    
    for scan in results[:10]:
        filename = f"{scan.business_name.replace(' ', '_')[:30]}.md"
        table.add_row(
            scan.business_name[:25],
            scan.category,
            str(len(scan.pain_points)),
            filename,
        )
    
    console.print(table)


@app.command()
def content(
    type: str = typer.Option("insight", "--type", "-t", help="Content type: insight, case_study, tactical, market_insight, personal_journey"),
    topic: str = typer.Option("AI automation for local businesses", "--topic", help="Topic to write about"),
    city: str = typer.Option("Cartagena", "--city", "-c", help="City context"),
    output: str = typer.Option(None, "--output", "-o", help="Save to file"),
):
    """
    Generate LinkedIn content in Phil's voice.
    """
    asyncio.run(_content(type, topic, city, output))


async def _content(type, topic, city, output):
    from services.authority_content import AuthorityContentGenerator
    
    console.print(f"\n[bold blue]✍️ Generating {type} content[/bold blue]\n")
    
    generator = AuthorityContentGenerator()
    
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task("Writing...", total=None)
        post = await generator.generate_linkedin_post(type, topic, city)
        progress.update(task, completed=True)
    
    console.print("[bold]FULL POST:[/bold]\n")
    console.print(post.full_post)
    console.print(f"\n[dim]Best time to post: {post.best_time_to_post}[/dim]")
    console.print(f"[dim]Hashtags: {' '.join(post.hashtags)}[/dim]")
    
    if output:
        with open(output, "w") as f:
            f.write(post.full_post)
        console.print(f"\n[green]✓ Saved to {output}[/green]")


@app.command()
def content_calendar(
    city: str = typer.Option("Cartagena", "--city", "-c", help="Focus city"),
    category: str = typer.Option("restaurant", "--category", "-cat", help="Focus category"),
    output: str = typer.Option("content_calendar.json", "--output", "-o", help="Output file"),
):
    """
    Generate a week of content ideas.
    """
    asyncio.run(_content_calendar(city, category, output))


async def _content_calendar(city, category, output):
    from services.authority_content import AuthorityContentGenerator
    import json
    
    console.print(f"\n[bold blue]📅 Generating Content Calendar[/bold blue]\n")
    
    generator = AuthorityContentGenerator()
    
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task("Planning week...", total=None)
        calendar = await generator.generate_weekly_content_calendar(city, category)
        progress.update(task, completed=True)
    
    # Display
    table = Table(title="Weekly Content Calendar")
    table.add_column("Day", style="cyan")
    table.add_column("Type")
    table.add_column("Topic", max_width=30)
    table.add_column("Hook", max_width=40)
    
    for day in calendar:
        table.add_row(
            day.get("day", ""),
            day.get("content_type", ""),
            day.get("topic", "")[:30],
            day.get("hook", "")[:40],
        )
    
    console.print(table)
    
    # Save
    with open(output, "w") as f:
        json.dump(calendar, f, indent=2)
    console.print(f"\n[green]✓ Saved to {output}[/green]")


@app.command()
def brand_assets():
    """
    Generate Phil's authority brand assets (taglines, headlines, pitch).
    """
    asyncio.run(_brand_assets())


async def _brand_assets():
    from services.authority_content import AuthorityContentGenerator
    
    console.print(f"\n[bold blue]🏆 Generating Brand Assets[/bold blue]\n")
    
    generator = AuthorityContentGenerator()
    
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task("Creating assets...", total=None)
        assets = await generator.generate_authority_assets()
        progress.update(task, completed=True)
    
    console.print("[bold]Elevator Pitch:[/bold]")
    console.print(f"  {assets.get('elevator_pitch', '')}\n")
    
    console.print("[bold]Tagline Options:[/bold]")
    for i, tagline in enumerate(assets.get("taglines", []), 1):
        console.print(f"  {i}. {tagline}")
    
    console.print("\n[bold]LinkedIn Headlines:[/bold]")
    for i, headline in enumerate(assets.get("linkedin_headlines", []), 1):
        console.print(f"  {i}. {headline}")


@app.command()
def outreach_ready(
    city: str = typer.Option("Cartagena", "--city", "-c", help="City to target"),
    category: str = typer.Option(None, "--category", "-cat", help="Category filter"),
    min_score: int = typer.Option(60, "--min-score", "-s", help="Minimum opportunity score"),
    limit: int = typer.Option(30, "--limit", "-l", help="Max businesses to process"),
    output_dir: str = typer.Option("outreach_ready", "--output", "-o", help="Output directory"),
):
    """
    Generate copy-paste ready outreach with clickable links.
    Creates: HTML dashboard, CSV exports, WhatsApp links.
    
    THIS IS YOUR EFFICIENCY WEAPON.
    """
    asyncio.run(_outreach_ready(city, category, min_score, limit, output_dir))


@app.command()
def copilot():
    """
    Launch interactive Claude AI co-pilot.
    Real-time response drafting, objection handling, conversation analysis.
    
    Requires: ANTHROPIC_API_KEY environment variable.
    """
    asyncio.run(_copilot())


async def _copilot():
    from services.claude_copilot import interactive_mode
    await interactive_mode()


@app.command()
def respond(
    message: str = typer.Argument(..., help="Their message to respond to"),
    business: str = typer.Option(None, "--business", "-b", help="Business name"),
    category: str = typer.Option("restaurant", "--category", "-cat", help="Business category"),
    channel: str = typer.Option("whatsapp", "--channel", "-ch", help="Channel: whatsapp, instagram, email"),
):
    """
    Generate response to a prospect's message using Claude.
    
    Example: python main.py respond "Interesante, pero ahora no tengo tiempo" -b "Café Luna"
    """
    asyncio.run(_respond(message, business, category, channel))


async def _respond(message, business, category, channel):
    from services.claude_copilot import draft_response
    
    console.print(f"\n[bold blue]🧠 Generating Response...[/bold blue]\n")
    
    context = {
        "name": business or "Unknown Business",
        "category": category,
        "city": "Cartagena",
    }
    
    result = await draft_response(
        their_message=message,
        conversation_history=[],
        business_context=context,
        channel=channel,
    )
    
    console.print("[bold green]📝 SUGGESTED RESPONSE:[/bold green]")
    console.print(Panel(result.get("response", str(result)), border_style="green"))
    
    if result.get("psychology_used"):
        console.print(f"\n[dim]Psychology: {', '.join(result['psychology_used'])}[/dim]")
    if result.get("next_action"):
        console.print(f"[dim]Next: {result['next_action']}[/dim]")


@app.command()
def handle_objection(
    objection: str = typer.Argument(..., help="The objection they raised"),
    business: str = typer.Option(None, "--business", "-b", help="Business name"),
    category: str = typer.Option("restaurant", "--category", "-cat", help="Business category"),
):
    """
    Generate psychology-driven reframe for objection.
    
    Example: python main.py handle-objection "Es muy caro para nosotros"
    """
    asyncio.run(_handle_objection(objection, business, category))


async def _handle_objection(objection, business, category):
    from services.claude_copilot import handle_objection as handle_obj
    
    console.print(f"\n[bold blue]🔄 Generating Reframe...[/bold blue]\n")
    
    context = {
        "name": business or "Unknown Business",
        "category": category,
        "city": "Cartagena",
    }
    
    result = await handle_obj(objection, context)
    
    console.print(f"[bold yellow]Objection Type:[/bold yellow] {result.get('objection_type', 'Unknown')}")
    console.print(f"[bold yellow]Real Concern:[/bold yellow] {result.get('real_concern', 'Unknown')}\n")
    
    console.print("[bold green]🔄 REFRAME:[/bold green]")
    console.print(Panel(result.get("response", str(result)), border_style="green"))
    
    if result.get("psychology_approach"):
        console.print(f"\n[dim]Approach: {result['psychology_approach']}[/dim]")


@app.command()
def analyze_reviews(
    business_id: str = typer.Argument(..., help="Business ID to analyze"),
):
    """
    Deep analysis of business reviews for outreach hooks.
    
    Requires reviews to be scraped first.
    """
    asyncio.run(_analyze_reviews(business_id))


async def _analyze_reviews(business_id):
    from services.storage import SupabaseStorage
    from services.claude_copilot import analyze_reviews
    
    storage = SupabaseStorage()
    
    # This would need a review scraper - placeholder for now
    console.print("[yellow]Review analysis requires scraped reviews.[/yellow]")
    console.print("[dim]Coming soon: Integration with Google Places reviews API[/dim]")


async def _outreach_ready(city, category, min_score, limit, output_dir):
    from services.storage import SupabaseStorage
    from services.deep_scan import run_deep_scan
    from services.outreach_ready import export_outreach_ready
    from models import BusinessCategory
    
    storage = SupabaseStorage()
    
    cat_enum = None
    if category:
        try:
            cat_enum = BusinessCategory(category)
        except ValueError:
            console.print(f"[red]Invalid category: {category}[/red]")
            raise typer.Exit(1)
    
    console.print(f"\n[bold blue]🎯 Generating Outreach-Ready Package[/bold blue]")
    console.print(f"[dim]City: {city} | Min Score: {min_score} | Limit: {limit}[/dim]\n")
    
    # Fetch businesses
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task("Fetching businesses...", total=None)
        businesses = await storage.search(
            city=city,
            category=cat_enum,
            min_score=min_score,
            limit=limit,
        )
        progress.update(task, completed=True)
    
    if not businesses:
        console.print("[yellow]No businesses found matching filters[/yellow]")
        return
    
    console.print(f"[green]✓ Found {len(businesses)} businesses[/green]\n")
    
    # Generate deep scans
    scans = []
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task(f"Generating psychology-driven outreach for {len(businesses)} businesses...", total=len(businesses))
        for i, biz in enumerate(businesses):
            try:
                scan = await run_deep_scan(biz)
                scans.append(scan)
            except Exception as e:
                console.print(f"[yellow]Skipped {biz.name}: {e}[/yellow]")
                # Create placeholder scan
                from services.deep_scan import BusinessDeepScan
                scans.append(BusinessDeepScan(
                    business_name=biz.name,
                    category=biz.category.value,
                    city=biz.city,
                    pain_points=[],
                    revenue_leakage=[],
                    operational_weaknesses=[],
                    starter_automations=[],
                    core_automations=[],
                    flagship_system={},
                    owner_fears=[],
                    owner_wants=[],
                    likely_objections=[],
                    leverage_angles=[],
                    whatsapp_opener="",
                    email_script="",
                    instagram_dm="",
                    follow_up_sequence=[],
                    thirty_day_roadmap=[],
                    roi_justification="",
                    quick_wins=[],
                ))
            progress.update(task, advance=1)
    
    # Export
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task("Generating exports...", total=None)
        results = export_outreach_ready(businesses, scans, output_dir)
        progress.update(task, completed=True)
    
    # Summary
    console.print(f"\n[bold green]✓ Outreach Package Ready![/bold green]\n")
    
    table = Table(title="Generated Files")
    table.add_column("File", style="cyan")
    table.add_column("Description")
    
    table.add_row("dashboard.html", "🎯 Interactive dashboard with click-to-copy")
    table.add_row("quick_actions.csv", "📋 Minimal CSV for rapid outreach")
    table.add_row("outreach_full.csv", "📊 Full data export")
    table.add_row("outreach_data.json", "🔧 JSON for integrations")
    
    console.print(table)
    
    console.print(f"\n[bold]Stats:[/bold]")
    console.print(f"  Total Leads: {results['total_leads']}")
    console.print(f"  Score 80+: {results['high_score']} 🔥")
    console.print(f"  With Instagram: {results['with_instagram']}")
    console.print(f"  With WhatsApp: {results['with_whatsapp']}")
    
    console.print(f"\n[bold cyan]→ Open {output_dir}/dashboard.html in your browser[/bold cyan]")
    console.print(f"[dim]Click-to-copy scripts, pre-filled WhatsApp links, everything ready to go.[/dim]")


@app.command()
def deep_analyze(
    business_id: str = typer.Argument(..., help="Business ID from database"),
    output: str = typer.Option(None, "--output", "-o", help="Save to file"),
):
    """
    Run Business Deep Scan™ on a specific business.
    Generates full analysis, outreach scripts, and transformation plan.
    """
    asyncio.run(_deep_analyze(business_id, output))


async def _deep_analyze(business_id, output):
    from services.storage import SupabaseStorage
    from services.deep_scan import run_deep_scan
    
    storage = SupabaseStorage()
    business = await storage.get_by_id(business_id)
    
    if not business:
        console.print(f"[red]Business not found: {business_id}[/red]")
        raise typer.Exit(1)
    
    console.print(f"\n[bold blue]🔍 Running Business Deep Scan™ on {business.name}...[/bold blue]\n")
    
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task("Analyzing business...", total=None)
        scan = await run_deep_scan(business)
        progress.update(task, completed=True)
    
    # Display results
    console.print(f"\n[bold cyan]═══ BUSINESS DEEP SCAN™: {scan.business_name} ═══[/bold cyan]\n")
    
    console.print("[bold]💢 PAIN POINTS[/bold]")
    for p in scan.pain_points:
        console.print(f"  • {p}")
    
    console.print("\n[bold]💸 REVENUE LEAKAGE[/bold]")
    for r in scan.revenue_leakage:
        console.print(f"  • {r}")
    
    console.print("\n[bold]🚀 STARTER AUTOMATIONS[/bold]")
    for s in scan.starter_automations:
        console.print(f"  • {s.get('name', '')}: {s.get('roi', '')}")
    
    console.print("\n[bold]⚡ CORE AUTOMATIONS[/bold]")
    for c in scan.core_automations:
        console.print(f"  • {c.get('name', '')}: {c.get('roi', '')}")
    
    console.print("\n[bold]👑 FLAGSHIP SYSTEM[/bold]")
    flagship = scan.flagship_system
    console.print(f"  {flagship.get('name', '')}")
    console.print(f"  {flagship.get('desc', '')}")
    console.print(f"  ROI: {flagship.get('roi', '')}")
    console.print(f"  Investment: {flagship.get('price_range', '')}")
    
    console.print("\n[bold green]📱 WHATSAPP OPENER[/bold green]")
    console.print(f"  {scan.whatsapp_opener}")
    
    console.print("\n[bold magenta]📸 INSTAGRAM DM[/bold magenta]")
    console.print(f"  {scan.instagram_dm}")
    
    console.print("\n[bold]📧 EMAIL SCRIPT[/bold]")
    console.print(scan.email_script)
    
    console.print("\n[bold]🔄 FOLLOW-UP SEQUENCE[/bold]")
    for i, fu in enumerate(scan.follow_up_sequence, 1):
        console.print(f"  Day {i*3}: {fu[:80]}...")
    
    console.print("\n[bold]🧠 OWNER PSYCHOLOGY[/bold]")
    console.print("  Fears:", ", ".join(scan.owner_fears[:2]))
    console.print("  Wants:", ", ".join(scan.owner_wants[:2]))
    console.print("  Likely Objection:", scan.likely_objections[0] if scan.likely_objections else "N/A")
    console.print("  Leverage:", scan.leverage_angles[0] if scan.leverage_angles else "N/A")
    
    if output:
        import json
        with open(output, "w") as f:
            json.dump(scan.model_dump(), f, indent=2, default=str)
        console.print(f"\n[green]✓ Saved to {output}[/green]")


@app.command()
def generate_targets(
    city: str = typer.Option("Cartagena", "--city", "-c", help="City to target"),
    limit: int = typer.Option(10, "--limit", "-l", help="Number of targets"),
    min_score: int = typer.Option(70, "--min-score", "-s", help="Minimum opportunity score"),
    output: str = typer.Option("targets.json", "--output", "-o", help="Output file"),
):
    """
    Generate prioritized target list with full outreach packages.
    Phil's prospecting command.
    """
    asyncio.run(_generate_targets(city, limit, min_score, output))


async def _generate_targets(city, limit, min_score, output):
    from services.storage import SupabaseStorage
    from services.deep_scan import run_batch_deep_scan, CITY_PRIORITIES
    
    storage = SupabaseStorage()
    
    # Get city priorities
    city_config = CITY_PRIORITIES.get(city, CITY_PRIORITIES.get("Cartagena"))
    priority_verticals = city_config.get("priority_verticals", [])
    
    console.print(f"\n[bold blue]🎯 Generating targets for {city}[/bold blue]")
    console.print(f"[dim]Priority verticals: {', '.join(priority_verticals)}[/dim]\n")
    
    all_businesses = []
    
    # Pull from each priority vertical
    for vertical in priority_verticals[:5]:
        try:
            from models import BusinessCategory
            cat = BusinessCategory(vertical)
            businesses = await storage.search(
                city=city,
                category=cat,
                min_score=min_score,
                limit=limit,
            )
            all_businesses.extend(businesses)
        except (ValueError, Exception):
            continue
    
    # Sort by opportunity score
    all_businesses.sort(key=lambda x: x.ai_opportunity_score or 0, reverse=True)
    top_targets = all_businesses[:limit]
    
    if not top_targets:
        console.print("[yellow]No businesses found. Run 'scan' first to populate database.[/yellow]")
        return
    
    console.print(f"[green]Found {len(top_targets)} high-priority targets[/green]\n")
    
    # Run deep scan on top targets
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task(f"Deep scanning {len(top_targets)} businesses...", total=None)
        scans = await run_batch_deep_scan(top_targets, limit=limit)
        progress.update(task, completed=True)
    
    # Display summary
    table = Table(title=f"🎯 Top {city} Targets")
    table.add_column("Business", style="cyan")
    table.add_column("Category")
    table.add_column("Score")
    table.add_column("Quick Win")
    table.add_column("Flagship")
    
    for scan in scans:
        table.add_row(
            scan.business_name[:25],
            scan.category,
            str(next((b.ai_opportunity_score for b in top_targets if b.name == scan.business_name), "-")),
            scan.quick_wins[0] if scan.quick_wins else "-",
            scan.flagship_system.get("name", "-")[:30],
        )
    
    console.print(table)
    
    # Save full data
    import json
    with open(output, "w") as f:
        json.dump([s.model_dump() for s in scans], f, indent=2, default=str)
    
    console.print(f"\n[green]✓ Full outreach packages saved to {output}[/green]")
    console.print(f"[dim]Each target includes: pain points, AI solutions, WhatsApp/Email/IG scripts, follow-ups[/dim]")


@app.command()
def proposal(
    business_id: str = typer.Argument(..., help="Business ID from database"),
    format: str = typer.Option("markdown", "--format", "-f", help="Output format: markdown, html"),
    output: str = typer.Option(None, "--output", "-o", help="Output file"),
):
    """
    Generate AI Transformation Plan (mini-proposal) for a business.
    The one-page proposal they can't ignore.
    """
    asyncio.run(_proposal(business_id, format, output))


async def _proposal(business_id, format, output):
    from services.storage import SupabaseStorage
    from services.transformation import generate_transformation_plan, format_plan_markdown, format_plan_html
    
    storage = SupabaseStorage()
    business = await storage.get_by_id(business_id)
    
    if not business:
        console.print(f"[red]Business not found: {business_id}[/red]")
        raise typer.Exit(1)
    
    console.print(f"\n[bold blue]📋 Generating AI Transformation Plan for {business.name}...[/bold blue]\n")
    
    plan = generate_transformation_plan(business)
    
    if format == "html":
        content = format_plan_html(plan)
        ext = "html"
    else:
        content = format_plan_markdown(plan)
        ext = "md"
    
    if output:
        with open(output, "w") as f:
            f.write(content)
        console.print(f"[green]✓ Saved to {output}[/green]")
    else:
        # Auto-generate filename
        filename = f"proposal_{business.name.lower().replace(' ', '_')[:20]}.{ext}"
        with open(filename, "w") as f:
            f.write(content)
        console.print(f"[green]✓ Saved to {filename}[/green]")
    
    # Show preview
    console.print(f"\n[bold]Proposal Preview:[/bold]")
    console.print(f"  Headline: {plan.headline}")
    console.print(f"  Investment: {plan.investment}")
    console.print(f"  Expected Return: {plan.expected_return}")
    console.print(f"  Payback: {plan.payback_period}")
    console.print(f"\n[dim]Quick Wins:[/dim]")
    for qw in plan.phase_1_quick_wins:
        console.print(f"    • {qw['name']}")


if __name__ == "__main__":
    app()
