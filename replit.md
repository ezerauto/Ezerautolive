# Vehicle Import Partnership Dashboard

## Overview

This is a professional web-based dashboard for tracking a vehicle import partnership between an investor and a dealer partner. The system manages the complete lifecycle of importing vehicles from the USA to Honduras, including shipments, inventory tracking, financial transactions, profit distribution, and contract management.

The application tracks a profit-sharing arrangement calculated at the shipment level. During the reinvestment phase (until $150K inventory), 60% of profit is reinvested for inventory, with the remaining 40% split equally (20% each to Dominick and Tony). After reaching $150K inventory, profits are split 50/50. This provides comprehensive visibility into vehicle costs, sale prices, payments, and profit distribution between partners.

## Recent Changes

### November 13, 2025
- **EZER Auto Operations Features** (6 feature set for US-based procurement and Honduras export workflow):
  1. **Honduras Market Valuations & Profitability Analysis**: POST /api/vehicles/:id/valuation endpoint for Honduras market estimates, GET /api/vehicles/:id/profitability for profit calculations with strict cost completeness validation, profitability badges (Profitable >$500, Break-even -$500 to $500, Negative <-$500). FX conversion fixed (USD to HNL multiply by rate, HNL to USD multiply by 1/rate).
  2. **Export Checklist Enforcement**: Blocks Acquired→In Transit status transitions unless vehicle has bill of sale doc, title doc, titleStatus clean/salvage (not rebuilt), and min 6 photos. Returns 422 EXPORT_CHECKLIST_INCOMPLETE with violations array.
  3. **Royal Shipping Integration**: Shipment transition guards (Planned→In Ground Transit requires vehicles, At Port→On Vessel requires BOL + trucker packets). ShipmentStatus expanded to 7 statuses. Returns 422 errors for missing requirements.
  4. **Customs Clearance Workflow**: POST /api/customs/:shipmentId/submit (documents_submitted status, FX snapshot), PATCH /api/customs/:id/assess (duties/fees in HNL), PATCH /api/customs/:id/clear (locks all shipment/vehicle costs). Ledger locking via costs.locked field and assertCostMutable guard prevents mutations after clearance. Returns 422 COST_LOCKED/SHIPMENT_CLEARED codes.
  5. **Leaderboards**: GET /api/leaderboards/sales (Omaha: totalUnitsSold, totalProfit, averageProfit, topBuyers top 5), GET /api/leaderboards/procurement (Denver: totalUnitsAcquired, averageSpread, profitabilityRate as profitable sold / all acquired), GET /api/leaderboards/logistics (Roatán: averageClearanceTimeDays, completionRate, documentCompletionRate).
  6. **Partners Management**: GET /api/partners with type/isActive filters, POST /api/partners/seed creates 5 partners (Royal Shipping shipping, Denver Hauling LLC + Rocky Mountain Transport trucking, Roatán Customs Solutions + Honduras Import Services customs_broker). Idempotent seeding via unique constraint handling.
- **Fixed Projected Sales & Profits Data Sync Issue**: Refactored `/api/analytics/projections` endpoint to use shared `calculateVehicleTotalCosts` utility from `costCalculation.ts`, eliminating 47 lines of duplicate cost calculation logic. This ensures projected sales/profits now sync with actual data and follow the ledger-only calculation principle system-wide.
- **Sales Contract Workflow**: Implemented complete sales contract requirement for marking vehicles as sold, including validation for sale date and sale price, auto-population of vehicle sale fields from contract, and automatic profit distribution generation.
- **Contract Signing System with DOB Identity Verification**: Implemented complete digital signature workflow for contracts with security features including:
  - DOB-based identity verification (date-only comparison to prevent timezone manipulation)
  - Rate limiting (3 attempts per 15 minutes to prevent guessing attacks)
  - Document integrity tracking via SHA-256 hashing
  - Audit trail with IP address, user agent, and signature timestamps
  - Contract required signers table to define who must sign
  - Automatic status tracking (pending → in_progress → completed)
  - Frontend UI for viewing contracts, signature status, and signing with DOB verification modal
- **Contract Document Management**: Implemented complete document preview and download system:
  - Added static file server for contract documents at `/public/contracts/`
  - Uploaded real legal documents: MIPA Master Consignment Agreement, Per-Vehicle Sale Closure, Personal Vehicle Custody Agreement, Vehicle Receipt & Inspection Certificate
  - Smart document preview: PDFs embedded in iframe, DOCX files show download interface, images displayed inline
  - All contract types (partnership, arrival inspection, sale closure, custody) now clickable and navigate to detail view with document preview
- **Vehicle Status Dropdown Component**: Implemented easy-to-use status management with smart workflow protection:
  - Created VehicleStatusDropdown component with icons for each status (In Transit, In Stock, Sold)
  - Integrated into inventory table and vehicle detail page
  - Easy transitions: in_transit ↔ in_stock work instantly with success toast notifications
  - Guarded "sold" status: requires completed sales contract with document, sale date, and sale price
  - Backend validation enforces contract requirement server-side (prevents API bypass)
  - Frontend validation provides immediate feedback with detailed error messages
  - Fixed updateVehicleSchema to use .partial() for all fields, enabling status-only PATCH updates
  - End-to-end tested and verified all workflows work correctly

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- React Query (TanStack Query) for server state management and caching

**UI Component System:**
- Shadcn/ui design system based on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Inter font for general UI, Roboto Mono for tabular/numeric data
- Custom CSS variables for theming (light/dark mode support)
- Design inspired by Linear, Stripe Dashboard, and Notion for data-heavy business applications

**State Management Strategy:**
- Server state: React Query with aggressive caching (staleTime: Infinity)
- UI state: React Context API for theme management
- Authentication state: Managed through React Query with session-based auth
- No global client state manager (Redux/Zustand) - relying on React Query's cache

**Key UI Patterns:**
- Sidebar navigation with collapsible menu
- Dashboard with metric cards and data visualizations (Recharts)
- Table-based views for shipments, vehicles, payments, and costs
- Detail pages for individual entities (shipments, vehicles)
- File upload functionality using Uppy with Google Cloud Storage

### Backend Architecture

**Framework:**
- Express.js server with TypeScript
- Node.js runtime environment
- ESM module system (type: "module")

**Authentication:**
- Replit Auth integration using OpenID Connect (OIDC)
- Passport.js strategy for authentication flow
- Express-session with PostgreSQL session store
- Session-based authentication (no JWTs)

**Database Layer:**
- Drizzle ORM for type-safe database queries
- Neon Serverless Postgres with WebSocket connection pooling
- Schema-first approach with Zod validation schemas
- Tables: users, sessions, shipments, vehicles, payments, contracts, costs

**API Design:**
- RESTful endpoints under `/api` namespace
- CRUD operations for all major entities
- Computed endpoints for dashboard metrics and financial calculations
- Protected routes requiring authentication via middleware

**Business Logic:**
- **Cost Accounting System**: Total vehicle cost = purchase price + vehicle-specific costs + proportionally allocated shipment costs
  - **Shared Cost Calculation Utility** (`server/services/costCalculation.ts`): Single source of truth for all cost calculations
  - **Ledger-Only Calculations**: All financial endpoints use ledger entries exclusively (shipment fields sync to ledger but are never summed directly)
  - Shipment costs (ground transport, customs, ocean freight, import fees) are allocated across vehicles based on purchase price weight
  - Prevents double-counting: Shipment operation costs sync to ledger via `costSync` service, calculations read from ledger only
  - Ensures accurate profit calculations across dashboard metrics, financials, profit distributions, and vehicle sales
- **Auto-Generated Cost Ledger**: Shipment operation costs automatically sync to ledger
  - When shipments are created or updated, operation costs (ground transport, customs broker fees, ocean freight, import fees) automatically generate ledger entries
  - Transactional atomicity: shipment changes and cost sync commit or roll back together
  - Source tracking: auto-generated costs marked with source='auto_shipment', distinct from manual entries
  - Unique constraint prevents duplicate auto costs: (shipmentId, category, source)
  - Users can add receipts and notes to auto-generated costs but must edit shipments to adjust amounts
  - Setting a cost to 0 automatically removes the corresponding ledger entry
  - ON DELETE CASCADE automatically cleans up auto costs when shipments are deleted
  - **Delete Protection**: Manual costs can be deleted via UI (`DELETE /api/costs/:id`), but auto-generated costs are protected from deletion (returns 400 error)
- **Profit Distribution**: Calculated based on progress toward $150K reinvestment goal
  - Progress starts at $0 and grows only from reinvested profits (60% of gross profit)
  - During reinvestment phase (< $150K progress): 60% reinvested, 20% each to Dominick and Tony
  - After $150K progress: 50/50 profit split
- Business day calculations for payment due dates
- Status tracking for vehicles (in_transit, in_stock, sold)
- Shipment status workflow (in_transit, arrived, customs_cleared, completed)
- Payment status management (paid, pending, overdue)

### Data Storage Solutions

**Primary Database:**
- PostgreSQL via Neon Serverless
- Connection pooling with WebSocket support for serverless compatibility
- Schema managed through Drizzle migrations

**Key Data Models:**
- Users: Profile and authentication data
- Shipments: Route, dates, costs, status, document URLs
- Vehicles: VIN, make/model, costs, sale price, status, shipment association
- Payments: Vehicle reference, amounts, due dates, payment status
- Contracts: Type (partnership, inspection, sale), parties, dates, document URLs
- Costs: Category, amounts, descriptions, source tracking (auto_shipment | manual), receipt URLs, notes
  - Auto-generated costs synced from shipment operations
  - Manual costs created directly by users
  - Unique constraint on (shipmentId, category, source) for auto_shipment entries

**Relationships:**
- Vehicles → Shipments (many-to-one)
- Payments → Vehicles (many-to-one)
- Contracts → Vehicles (one-to-many through vehicle reference)

### Authentication and Authorization

**Authentication Flow:**
- Replit OIDC provider for user authentication
- Login redirects to `/api/login`, callback at `/api/callback`
- Session token refresh handled automatically
- User profile data stored in PostgreSQL users table

**Authorization:**
- Session-based with HTTP-only secure cookies
- `isAuthenticated` middleware protects all API routes
- Object ACL system for file permissions (owner-based access)
- No role-based access control (single-user/partnership context)

**Session Management:**
- PostgreSQL-backed session store (connect-pg-simple)
- 7-day session TTL
- Session data includes user claims, access tokens, and refresh tokens

## External Dependencies

**Cloud Storage:**
- Google Cloud Storage for document and file uploads
- Replit Object Storage sidecar integration
- Public/private object access control with custom ACL policies
- Uppy file uploader with AWS S3 compatibility mode

**Database Service:**
- Neon Serverless PostgreSQL
- WebSocket-based connection for serverless environments
- Connection string via `DATABASE_URL` environment variable

**Third-Party Libraries:**
- Radix UI: Accessible component primitives
- Recharts: Data visualization charts
- Drizzle ORM: Database query builder
- Zod: Runtime type validation
- TanStack Query: Server state management
- Uppy: File upload interface

**Development Tools:**
- TypeScript for type safety across frontend and backend
- Vite plugins: React, runtime error overlay, Replit-specific tooling
- Drizzle Kit for database migrations
- ESBuild for production server bundling

**Environment Variables Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `ISSUER_URL`: OIDC provider URL (defaults to Replit)
- `REPL_ID`: Replit environment identifier
- `PUBLIC_OBJECT_SEARCH_PATHS`: Comma-separated paths for public file access