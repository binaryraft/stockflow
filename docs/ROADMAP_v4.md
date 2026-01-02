# StockFlow v4: Enterprise Retail Edition - Upgrade Master Plan

**Current Version:** 1.1.3
**Target Version:** 4.0.0
**Code Name:** Enterprise Prime

## 1. Executive Summary
The v4 upgrade focuses on transforming StockFlow into a highly scalable, secure, and feature-rich "Enterprise-Grade" Retail Operating System. This release prioritizes performance for large datasets, strict security standards, and advanced deterministic business logic (CRM, Loyalty) without relying on generative AI or experimental features.

## 2. Core Pillars

### A. Scalability & Performance (The "Pro" Foundation)
*   **Server-Side Pagination**: Move from client-side filtering to backend-driven pagination for Bills and Products. This is critical for supporting operations with 10,000+ SKUs/transactions.
*   **Virtualization**: Implement high-performance list rendering to ensure 60fps scrolling regardless of dataset size.
*   **Advanced Caching**: Optimize React Query strategies to minimize network requests and improve perceived speed.

### B. Professional CRM & Loyalty
*   **Deterministic Loyalty System**: Automated points calculation (e.g., ₹100 spend = 1 point).
*   **Customer Tiers**: configurable thresholds (Silver/Gold) that automatically trigger specific discount rates.
*   **Store Credit & Gift Cards**: Managing customer credit balances and issuance of gift cards as financial liabilities.

### C. Security & Compliance
*   **JWT Authentication**: Replace the legacy shared-token mechanism with industry-standard JSON Web Tokens (JWT) with refresh rotation.
*   **Role-Based Access Control (RBAC)**: Granular permissions matrix for Staff (e.g., "Can View Reports" vs "Can Edit Stock").
*   **Audit Logging**: Detailed immutable logs of *who* changed *what* and *when* for all critical inventory actions.

## 3. Implementation Phases

### Phase 1: Performance Core (v2.0) - *Immediate Priority*
1.  **API Refactor**: Update `/api/bills` and `/api/products` to support `?limit=50&page=1` query parameters.
2.  **Frontend Data Layer**: Fork `useInventoryStore` to support paginated states instead of flat arrays.
3.  **UI Updates**: Add pagination controls or infinite scroll to `BillHistoryTable` and `ProductTable`.

### Phase 2: Security Hardening (v3.0)
1.  **Auth System Upgrade**: Implement the JWT service middleware.
2.  **Permission Gates**: Wrap UI components with `<PermissionGate permission="manage_stock" />`.

### Phase 3: Advanced Features (v4.0)
1.  **Loyalty Module**: specific schema updates to `Customer` and `Bill` to track points.
2.  **Offline Sync**: "Queue & Retry" mechanism for ensuring sales can happen without internet.
3.  **Fiscal Reporting**: Exportable localized tax reports (GST layout compliant).

## 4. Technical Architecture Targets

**Current:**
*   Monolithic Fetch (`fetchBills` loads everything).
*   Shared String Auth.
*   Client-side heavy processing.

**Target (v4):**
*   **Paginated & Indexed**: Database queries are indexed and paginated.
*   **Stateless Auth**: Secure, verifiable tokens.
*   **Lean Client**: The browser only holds what the user is currently looking at.

---
*Professional Upgrade Plan - Optimized for Scale & Reliability*
