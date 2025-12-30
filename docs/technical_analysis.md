# StockFlow - Technical Analysis & Documentation

## 1. Project Overview
StockFlow is a web-based Inventory Management and Point of Sale (POS) system designed for multi-store businesses. It features rapid billing, inventory tracking (including variants and expiration), financial reporting, and AI-powered insights. The application is built as a SaaS platform where companies can subscribe to manage multiple stores and employees.

## 2. Technology Stack

### Core Framework
- **Frontend/Backend**: Next.js 15.2.3 (App Router)
- **Language**: TypeScript
- **Runtime**: Node.js

### UI & Styling
- **Styling Engine**: Tailwind CSS
- **Component Library**: Shadcn/UI (based on Radix UI primitives)
- **Icons**: Lucide React
- **Charting**: Recharts
- **Utilities**: `clsx`, `cva`, `tailwind-merge`, `tailwindcss-animate`

### State Management & Data Fetching
- **Client State**: Zustand
- **Server State / Caching**: React Query (`@tanstack/react-query`)

### Database & Backend
- **Database**: MongoDB (Primary data store)
- **ODM/Driver**: Native MongoDB Driver (`mongodb` package)
- **Authentication**: Custom implementation (JWT/Session based with local storage).
  - Uses `bcryptjs` for password hashing.
  - Distinct auth flows for Admin (Company Owner) and Store Staff.

### AI & Intelligence
- **Platform**: Google Generative AI (Gemini)
- **Framework**: Genkit (`@genkit-ai/googleai`)
- **Use Cases**: AI-assisted categorization, insights (suggested by blueprint).

### Tooling & Utilities
- **Forms**: React Hook Form + Zod (Validation)
- **Dates**: date-fns
- **Barcode/Scanning**: `@zxing/browser`, `@zxing/library`
- **Printing**: Custom print utilities (`src/lib/print-utils.ts`)

## 3. Architecture

### Directory Structure (`src/`)
- **`app/`**: Next.js App Router.
  - **`(public)`**: Landing page components (Hero, Features, Pricing).
  - **`admin/`**: Dashboard for Company Admins (manage stores, staff, subscription, global reports).
  - **`storeportal/`**: POS interface for Store Staff (billing, local inventory).
  - **`api/`**: Backend API routes (RESTful endpoints).
- **`components/`**: Reusable UI components.
  - **`ui/`**: Shadcn/UI primitives (buttons, inputs, dialogs).
  - **`landing/`**: Components specific to the marketing site.
  - **`auth/`**: Login/Signup forms.
- **`lib/`**: Core utilities.
  - **`mongodb.ts`**: Database connection singleton.
  - **`print-utils.ts`**: Logic for generating printable receipts/labels.
- **`types/`**: TypeScript type definitions ensuring type safety across the full stack.

### Key Data Models (`src/types/index.ts`)

- **Company**: Top-level tenant. Holds subscription info, settings (currency, GST), and aggregation data.
- **Store**: Physical location. Linked to a Company. Has its own inventory context and staff access.
- **User**: System users.
  - **Role 'admin'**: Full access to Company settings.
  - **Role 'employee'**: Restricted access, assigned to specific Stores.
- **Product**:
  - Global catalog defined by Company.
  - **Variants**: Support for size/color (ProductVariant, ProductOption).
  - **SKUs**: Specific stock keeping units.
  - **StockLayers**: FIFO/LIFO tracking of inventory batches (cost price, purchase date).
- **Bill (Transaction)**:
  - Modes: `buy` (Purchase), `sell` (Sales), `return`.
  - Links to `Customer`, `Store`, and `Staff`.
  - Contains `BillItems` with tax calculations (SGST/CGST).

## 4. Key Workflows

### Authentication
- Dual entry system:
  1. **Admin Login**: For business owners to manage the company.
  2. **Store Login**: For staff to access the POS terminal (`/storeportal`).
- Session management handled via `sessionStorage`/`localStorage` tokens.

### Billing & POS
- "Rapid Billing" interface optimized for speed.
- Supports barcode scanning (`zxing`).
- Handles complex tax calculations (GST) and additional charges.
- Real-time stock decrementation.

### Inventory Management
- Supports "Product Variants" (e.g., Shirt -> Red/M, Blue/L).
- Tracks "Defective" vs "Good" returns.
- Auditing via `ProductLedgerEntry`.

### Financial Reporting
- **Profit & Loss (P&L)**:
  - **Revenue Breakdown**: Distinguishes between "Product Sales" and "Additional Charges".
  - **Additional Charges**: Treated as pure profit (Service Revenue), distinct from COGS-related revenue.
  - **Live Estimates**: Reports support filtering by Store contexts.

## 5. Deployment
- Configuration suggests Firebase App Hosting (`apphosting.yaml`).
- Environment variables required: `MONGODB_URI`, `MONGODB_DB_NAME`.
