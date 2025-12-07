# Black Card Business Scanner - Design Guidelines

## Design Approach

**Design System**: Material Design 3  
**Rationale**: Data-heavy business intelligence platform requiring clear information hierarchy, robust table components, and professional aesthetic for business users analyzing prospect data.

## Core Design Principles

1. **Data Clarity First** - Information hierarchy prioritizes scanability and quick decision-making
2. **Purposeful Density** - Maximize information display without overwhelming users
3. **Action-Oriented** - CTAs for scanning, exporting, and managing outreach clearly visible
4. **Professional Restraint** - Minimal decoration; let the business data be the focus

## Typography

**Font Stack**: Roboto (via Google Fonts CDN)
- **Headings**: Roboto Medium (500) - Page titles at text-2xl, section headers at text-xl
- **Body**: Roboto Regular (400) - Base size text-base for optimal reading
- **Data/Tables**: Roboto Regular - Slightly smaller text-sm for dense information
- **Metrics/Numbers**: Roboto Medium (500) - Emphasize key statistics and scores

## Layout System

**Spacing Units**: Tailwind units of 2, 4, 6, 8, 12, 16  
- Component padding: p-4 to p-6
- Section spacing: py-8 to py-12
- Card gaps: gap-4 to gap-6
- Table cell padding: p-3 to p-4

**Container Strategy**:
- Main content: max-w-7xl mx-auto px-4
- Dashboard cards: grid with consistent gaps
- Detail panels: max-w-4xl for focused content

## Component Library

### Navigation
- **Top App Bar**: Fixed header with logo, main navigation links (Dashboard, Scan, Export, Stats), and user profile
- **Breadcrumbs**: For detail views (Dashboard > Businesses > [Business Name])
- Minimal, functional design - no elaborate mega-menus

### Dashboard Layout
- **Filter Bar**: Horizontal layout with dropdowns for City, Category, Min Score, Search input
- **Action Buttons**: Primary "New Scan" button, secondary "Export" button
- **Stats Cards**: 4-column grid on desktop showing Total Businesses, Avg Score, With Email, With Website
- **Business Table**: Full-width data table below stats

### Data Tables
- **Structure**: Sticky header row, alternating subtle row backgrounds
- **Columns**: Business Name, Category, City, Score (sortable), Readiness badge, Contact icons, Actions
- **Interactions**: Click row to view details, sort by clicking headers, hover highlights row
- **Pagination**: Bottom controls showing "Showing 1-20 of 150"

### Cards
- **Business Cards** (alternative list view): Compact cards in 2-3 column grid
  - Header: Business name + category badge
  - Body: Rating stars, review count, address snippet
  - Footer: Contact icons, AI score indicator
- **Stat Cards**: Icon + metric + label in clean layout
- **Detail Card**: Expanded view with all business information in organized sections

### Business Detail View
- **Header Section**: Business name (text-3xl), category badge, city/address
- **Two-Column Layout**:
  - Left: Contact Info card, Social Links card, Business Details card
  - Right: AI Insights card (score, readiness level, summary), Outreach Hook card
- **Action Bar**: Fixed bottom with "Generate Email", "Mark Contacted", "Export" buttons

### Forms & Inputs
- **Scan Form**: Card-based layout with clearly labeled inputs
  - City dropdown (Material Design outlined select)
  - Category dropdown
  - Max results slider/input
  - Toggle switches for "Enable AI Enrichment", "Save to Database"
  - Primary action button "Start Scan"
- **Search**: Prominent search bar with icon, outlined style
- **Filters**: Chip-style filter tags that can be cleared

### Badges & Indicators
- **AI Readiness**: Pill badges (High=green, Medium=amber, Low=red with text labels)
- **Opportunity Score**: Circular progress indicator or score badge (0-100)
- **Category Tags**: Subtle outlined chips
- **Status Indicators**: Small colored dots for outreach status

### Data Visualization
- **Progress Bars**: During scanning operations, linear determinate progress
- **Score Indicators**: Visual bars or circular progress for opportunity scores
- **Stat Breakdown**: Simple bar charts or donut charts for category/readiness distribution (use Chart.js or Recharts)

### Feedback & States
- **Loading States**: Material skeleton screens for tables, spinner for quick actions
- **Empty States**: Centered icon + message + CTA (e.g., "No businesses found. Try a new scan")
- **Success Toasts**: Top-right notifications for "Scan complete", "Data exported"
- **Error Messages**: Inline validation below inputs, alert banners for critical errors

## Responsive Behavior

- **Desktop (lg+)**: Full multi-column layouts, expanded tables
- **Tablet (md)**: 2-column grids collapse to single, filters move to drawer
- **Mobile (base)**: Single column, horizontal scrolling tables, bottom sheet for filters

## Interaction Patterns

- **Minimal Animation**: Subtle hover states on rows/cards (slight background change), no elaborate transitions
- **Table Sorting**: Arrow indicators in headers, instant re-ordering
- **Modal Dialogs**: For confirmations ("Delete business?"), forms (Edit business)
- **Slide-out Panels**: For detailed filters or quick-view business info

## Information Architecture

**Primary Navigation**:
1. Dashboard (default view with stats + recent scans)
2. Scan New (dedicated scan form page)
3. Business Database (full searchable table)
4. Export Center (export options and history)
5. Statistics (analytics dashboard)

**Dashboard Sections**:
- Quick Stats (4-metric cards)
- Recent Scans (table of last 5 scan results)
- Top Opportunities (sorted by AI score)
- Quick Actions (buttons for common tasks)

## Critical Constraints

- No full-viewport sections (100vh) - use natural content height
- Tables must handle 50+ rows gracefully with virtual scrolling or pagination
- All contact methods (email, phone, WhatsApp, Instagram) represented with clear iconography
- Export formats clearly labeled (CSV for CRM, Movvia format, Outreach list)
- Scan progress shows current stage (Fetching, Enriching, Saving) with percentage

## Images

**No hero images needed** - This is a data application, not marketing.  
**Icons**: Use Material Icons CDN for consistent iconography (search, filter, download, person, business, location, phone, email, etc.)  
**Business Logos/Photos**: If available from API, show as small circular avatars in tables, larger in detail view

---

**Result**: A professional, Material Design-based business intelligence platform optimized for data exploration, filtering, and decision-making with clear visual hierarchy and efficient workflows.