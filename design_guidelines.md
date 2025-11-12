# Vehicle Import Partnership Dashboard - Design Guidelines

## Design Approach

**Selected Approach:** Design System-Based (Hybrid: Linear + Stripe Dashboard + Notion)

**Rationale:** This is a data-heavy, utility-focused business application requiring maximum efficiency, clarity, and trust. Drawing from Linear's clean data visualization, Stripe's financial dashboard clarity, and Notion's document management patterns to create a professional tracking interface.

**Core Principles:**
- Information density with clarity: Pack data intelligently without overwhelming
- Trustworthy professionalism: This tracks significant financial partnerships
- Scannable hierarchy: Users need to find critical data instantly
- Action-oriented: Every view should lead to clear next steps

---

## Typography System

**Font Family:** Inter (primary) with SF Mono for tabular data

**Hierarchy:**
- **Page Headers:** 32px Bold (Dashboard titles)
- **Section Headers:** 24px Semibold (Module sections)
- **Card Headers:** 18px Semibold (Metric cards, table headers)
- **Body Text:** 15px Regular (Form labels, descriptions)
- **Small Text:** 13px Regular (Helper text, metadata)
- **Tabular Data:** SF Mono 14px Medium (Numbers, currencies, VINs)

**Special Typography Rules:**
- All currency values: SF Mono with consistent decimal alignment
- VINs and IDs: Uppercase, SF Mono for scannability
- Status text: 13px Semibold, always uppercase
- Metric numbers: 28px Bold for dashboard KPIs

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24

**Grid System:**
- Container: max-w-7xl with px-6 horizontal padding
- Sidebar: Fixed 16rem width (w-64)
- Main content: flex-1 with py-8 vertical padding
- Card spacing: gap-6 between cards
- Section spacing: mb-12 between major sections

**Sidebar Navigation:**
- Fixed left sidebar, full height
- Logo/company name at top (h-16)
- Navigation items: py-3 px-4 per item
- Active state: Border-left accent (border-l-4)
- Icons: 20px, mr-3 spacing from labels

**Top Bar:**
- Fixed height: h-16
- Horizontal padding: px-6
- Search bar: max-w-md centered
- Right-aligned utilities: gap-4 spacing

**Content Area Layout:**
- All content wrapped in max-w-7xl container
- Page header: mb-8 with breadcrumbs
- Metric cards grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- Data tables: Full width with horizontal scroll on mobile

---

## Component Library

### Dashboard Metric Cards
**Structure:**
- Card container: p-6, rounded-lg border
- Icon circle: w-12 h-12, rounded-full at top
- Label: text-sm, mb-2
- Value: text-3xl font-bold (SF Mono for numbers)
- Change indicator: text-sm with arrow icon

### Progress Indicators
**$150K Goal Progress Bar:**
- Container: h-3, rounded-full, w-full
- Fill: h-3, rounded-full, transition-all
- Label above: flex justify-between, text-sm
- Percentage display: text-lg font-semibold below

**Status Timeline (Shipment Journey):**
- Horizontal stepper layout
- Each step: Relative container with connecting line
- Completed steps: Filled circle (w-10 h-10)
- Current step: Animated pulse
- Future steps: Border-only circle

### Status Badges
**Design Pattern:** Inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase
- Icon: w-4 h-4 mr-1.5 (truck, warehouse, checkmark, clock, dollar, warning)
- Label: Letter-spacing: tracking-wide

### Data Tables
**Structure:**
- Table wrapper: overflow-x-auto, shadow border rounded-lg
- Header row: Sticky top, backdrop-blur
- Header cells: px-6 py-4, text-xs font-semibold uppercase tracking-wider
- Body cells: px-6 py-4, text-sm
- Row hover: Subtle background transition
- Actions column: Right-aligned, gap-2 buttons

**Special Columns:**
- Photo thumbnails: w-16 h-16 rounded-lg object-cover
- Currency: Right-aligned, tabular-nums (SF Mono)
- Dates: Consistent format, text-sm opacity-75
- VINs: Monospace, last 6 digits emphasized

### Detail Pages
**Layout Pattern:**
- Two-column layout on lg+: grid-cols-1 lg:grid-cols-3 gap-8
- Main content: lg:col-span-2
- Sidebar: lg:col-span-1 (sticky top-8)
- Section cards: mb-6 spacing

**Vehicle Detail Card:**
- Photo gallery: Aspect-square grid-cols-2 gap-2, main image spans 2 rows
- Specs grid: grid-cols-2 gap-x-8 gap-y-4
- Cost breakdown: Divide-y layout with py-4 spacing
- Total row: pt-4 mt-4 border-t-2, text-lg font-bold

### Forms & Inputs
**Input Fields:**
- Container: mb-6
- Label: block mb-2 text-sm font-medium
- Input: w-full px-4 py-2.5 rounded-lg border
- Helper text: mt-1.5 text-xs
- Validation: Border state changes, error text below

**File Upload:**
- Dropzone: Border-2 border-dashed rounded-lg p-12 text-center
- Icon: w-12 h-12 mx-auto mb-4
- Text: "Drag & drop or click to upload"
- Accepted formats: text-xs mt-2

**Select Dropdowns:**
- Styled consistently with text inputs
- Chevron icon: Absolute right, pointer-events-none
- Options: py-2 px-4 hover states

### Action Buttons
**Primary:** px-6 py-3 rounded-lg font-medium shadow-sm
**Secondary:** px-6 py-3 rounded-lg font-medium border-2
**Icon Buttons:** p-2 rounded-lg (for table actions)
**Button Groups:** flex gap-3 justify-end

### Document Preview
**Embedded PDF View:**
- Container: aspect-[8.5/11] rounded-lg border overflow-hidden
- Full-screen button: Absolute top-4 right-4
- Download button: Absolute top-4 right-16

### Charts & Visualizations
**Line Chart (Inventory Growth):**
- Container: h-80 w-full p-6
- Clean grid lines, minimal decoration
- Data points emphasized with dots
- Tooltip on hover with exact values

**Pie Chart (Portfolio Composition):**
- Size: w-64 h-64 mx-auto
- Legend: Below chart, flex flex-wrap gap-4
- Interactive segments on hover

**Bar Chart (Price Comparison):**
- Horizontal bars for better label readability
- Target vs Actual: Grouped bars pattern
- Gap between groups: mb-3

---

## Responsive Strategy

**Breakpoints:**
- Mobile: < 768px - Stack all layouts, simplified tables
- Tablet: 768px - 1024px - Two-column grids, visible sidebar toggle
- Desktop: > 1024px - Full layout with persistent sidebar

**Mobile Adaptations:**
- Sidebar: Overlay drawer, toggle with hamburger menu
- Metric cards: Single column stack
- Tables: Horizontal scroll with sticky first column OR card-based view for key tables
- Forms: Full-width, larger touch targets (min-h-12)

---

## Navigation & Information Architecture

**Sidebar Menu Structure:**
1. Dashboard (home icon)
2. Shipments (truck icon)
3. Inventory (grid icon)
4. Contracts (document icon)
5. Financials (chart-bar icon)
6. Payments (currency icon)
7. Costs (receipt icon)
8. Reports (folder icon)
9. Settings (cog icon)

**Breadcrumbs:**
- Below top bar: text-sm, flex items-center gap-2
- Chevron separators: opacity-50
- Last item: font-semibold (current page)

---

## Animations

**Use Sparingly:**
- Metric card numbers: Count-up animation on load (2 seconds)
- Progress bars: Width transition (300ms ease)
- Table row hover: Background transition (150ms)
- Status badge changes: Subtle scale pulse
- NO scroll-triggered animations
- NO parallax effects

---

## Images

**Vehicle Photos:**
- Required for all vehicle inventory entries
- Primary placement: Vehicle detail pages (hero gallery)
- Secondary: Thumbnail in inventory table (64x64px rounded)
- Aspect ratio: 4:3 for main photos
- Fallback: Vehicle icon placeholder for missing photos

**Document Thumbnails:**
- Receipt/contract preview icons (file-type based)
- PDF preview: First page thumbnail (aspect-[8.5/11])

**No marketing imagery** - This is a utility dashboard focused on data and functionality.