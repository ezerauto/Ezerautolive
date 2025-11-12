# Vehicle Import Partnership Dashboard

## Overview

This is a professional web-based dashboard for tracking a vehicle import partnership between an investor and a dealer partner. The system manages the complete lifecycle of importing vehicles from the USA to Honduras, including shipments, inventory tracking, financial transactions, profit distribution, and contract management.

The application tracks a profit-sharing arrangement calculated at the shipment level. During the reinvestment phase (until $150K inventory), 60% of profit is reinvested for inventory, with the remaining 40% split equally (20% each to Dominick and Tony). After reaching $150K inventory, profits are split 50/50. This provides comprehensive visibility into vehicle costs, sale prices, payments, and profit distribution between partners.

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