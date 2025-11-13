# Vehicle Import Partnership Dashboard

## Overview

This web-based dashboard tracks a vehicle import partnership, managing the complete lifecycle of importing vehicles from the USA to Honduras. It covers shipments, inventory, financial transactions, profit distribution, and contract management. The system supports a profit-sharing model tied to a $150K inventory reinvestment goal, providing comprehensive visibility into costs, sales, and partner profit distribution. Key capabilities include automatic shipping cost calculation, document export for customs, and robust financial tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:** React 18 with TypeScript, Vite, Wouter for routing, and React Query for server state management.

**UI Component System:** Shadcn/ui (Radix UI primitives), Tailwind CSS for styling, Inter and Roboto Mono fonts. Design inspired by Linear, Stripe Dashboard, and Notion.

**State Management Strategy:** React Query for server state, React Context API for UI state (e.g., theme), session-based authentication.

**Key UI Patterns:** Sidebar navigation, dashboard with metric cards and Recharts visualizations, table-based views, detail pages, and Uppy-based file uploads to Google Cloud Storage.

### Backend Architecture

**Framework:** Express.js server with Node.js and TypeScript (ESM).

**Authentication:** Replit Auth (OpenID Connect) with Passport.js and Express-session using a PostgreSQL session store.

**Database Layer:** Drizzle ORM for type-safe queries, Neon Serverless Postgres with WebSocket pooling, schema-first approach with Zod validation.

**API Design:** RESTful endpoints under `/api` for CRUD operations, computed metrics, and protected routes requiring authentication.

**Business Logic:**
- **Cost Accounting System:** Total vehicle cost is derived from purchase price plus vehicle-specific and proportionally allocated shipment costs. A shared utility (`server/services/costCalculation.ts`) ensures ledger-only calculations, preventing double-counting. Shipment operation costs automatically sync to the ledger and are marked with their source.
- **Auto-Generated Cost Ledger:** Shipment operation costs (ground transport, customs, ocean freight, import fees) automatically generate ledger entries, maintaining transactional atomicity with shipment updates. Manual costs are distinct, and auto-generated costs are protected from direct deletion.
- **Profit Distribution:** Calculated based on a $150K reinvestment goal. Until this goal is met, 60% of profit is reinvested, and the remaining 40% is split (20% each). After reaching $150K, profits split 50/50.
- **EZER Auto Operations:** Includes Honduras market valuations, export checklist enforcement (blocking status transitions without required documents), Royal Shipping integration (shipment transition guards), and a customs clearance workflow with ledger locking.
- **Sales Contract Workflow:** Enforces contract completion for marking vehicles as sold, including DOB identity verification, SHA-256 hashing for document integrity, and an audit trail. Features document preview and download.
- **Vehicle Status Management:** `VehicleStatusDropdown` component with smart workflow protection, guarding "sold" status transitions until a contract is completed.

### Data Storage Solutions

**Primary Database:** PostgreSQL via Neon Serverless, managed with Drizzle migrations.

**Key Data Models:** Users, Shipments, Vehicles, Payments, Contracts, and Costs. Costs include auto-generated entries from shipment operations and manual entries.

**Relationships:** Vehicles (many-to-one) Shipments, Payments (many-to-one) Vehicles, Contracts (one-to-many) Vehicles.

### Authentication and Authorization

**Authentication Flow:** Replit OIDC provider for user authentication, login via `/api/login`, callback at `/api/callback`. Session token refresh is automatic.

**Authorization:** Session-based with HTTP-only cookies. `isAuthenticated` middleware protects all API routes. Object ACL for file permissions. No role-based access control.

**Session Management:** PostgreSQL-backed session store (connect-pg-simple) with a 7-day TTL.

## External Dependencies

**Cloud Storage:** Google Cloud Storage for documents and files, integrated via Replit Object Storage sidecar. Uppy file uploader configured for S3 compatibility.

**Database Service:** Neon Serverless PostgreSQL.

**Third-Party Libraries:** Radix UI, Recharts, Drizzle ORM, Zod, TanStack Query, Uppy.

**Development Tools:** TypeScript, Vite plugins, Drizzle Kit, ESBuild.

**Environment Variables Required:** `DATABASE_URL`, `SESSION_SECRET`, `ISSUER_URL`, `REPL_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`.