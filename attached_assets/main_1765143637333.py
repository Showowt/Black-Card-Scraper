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


if __name__ == "__main__":
    app()
