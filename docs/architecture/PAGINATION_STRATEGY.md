
# Pagination & Performance Strategy

## The Problem
Currently, `useInventoryStore.fetchBills` loads **all** bills for a company into memory.
`const allBills = await db.collection('bills').find({ companyId }).toArray();`

This creates three critical issues:
1.  **Memory Bloat**: With 10,000 bills, the browser tab will consume excessive RAM.
2.  **Network Latency**: Initial load times grow linearly with business age.
3.  **Database Strain**: The server has to serialize massive JSON blobs.

## The Solution: Cursor-Based Pagination

### 1. API Changes (`/api/bills/route.ts`)

**Request:**
`GET /api/bills?companyId=123&limit=50&cursor=timestamp_desc_1704099200`

**Response:**
```json
{
  "data": [...50 bills...],
  "meta": {
    "nextCursor": "timestamp_desc_1704088000",
    "hasMore": true
  }
}
```

### 2. Frontend State Changes (`useInventoryStore`)

Transition from:
`bills: Bill[]`

To:
```typescript
bills: {
  results: Bill[];
  nextCursor?: string;
  isLoading: boolean;
  totalCount: number; // For "Page X of Y" if needed, though exact count is expensive
}
```

### 3. UI Implementation
*   **Virtual Scrolling**: We will keep the "Infinite Scroll" feel but only fetch data when the user nears the bottom of the list.
*   **TanStack Query**: We should migrate strict fetch logic to `useInfiniteQuery` from TanStack Query (already installed) which handles cursor state management perfectly, rather than reinventing it in Zustand.

## Implementation Steps

1.  **Backend**: meaningful update to `GET` route in `api/bills`.
2.  **Hook**: Create `useBillsQuery` using `useInfiniteQuery`.
3.  **Component**: Update `BillHistoryTable` to consume the query stream and render flattened pages.
