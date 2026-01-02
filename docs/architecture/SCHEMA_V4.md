
# v4 Schema Updates for Loyalty & Advanced Inventory

## 1. CRM / Loyalty
**Customer Schema Update:**
```typescript
interface Customer {
  id: string;
  name: string;
  phone: string;
  
  // New Fields
  tier: 'Standard' | 'Silver' | 'Gold' | 'Platinum';
  loyaltyPoints: number; // Current redeemable balance
  lifetimeSpend: number; // For tier calculation
  totalVisits: number;
  lastVisit: number; // timestamp
  
  storeCredit: number; // Financial liability
}
```

**Loyalty Settings (Company Level):**
```typescript
interface LoyaltySettings {
  enabled: boolean;
  pointsPerUnitCurrency: number; // e.g., 1 point per 100 spent
  redemptionValuePerPoint: number; // e.g., 1 point = 1 currency unit
  tiers: {
    Silver: { minSpend: 10000, discountPercent: 2 },
    Gold: { minSpend: 50000, discountPercent: 5 }
  }
}
```

## 2. Advanced Inventory
**Product Schema Update:**
```typescript
interface Product {
  // ... existing fields
  
  // New Fields for Professional Tracking
  hasBatchTracking: boolean; // Enables batch/expiry UI
  hasSerialTracking: boolean; // Enforce serial scan on sale
  
  lowStockThreshold: number; // Per-product override of global setting
  
  // Tax details
  hsnCode?: string;
  taxCategory?: 'standard' | 'exempt' | 'luxury';
}
```

**Batches Collection (New):**
```typescript
interface StockBatch {
  id: string;
  productId: string;
  skuHash: string; // Link to specific variant
  batchNumber: string;
  expiryDate?: number;
  initialQty: number;
  currentQty: number;
  costPrice: number;
}
```

## 3. Operations
**Audit Log (New Collection):**
```typescript
interface AuditLog {
  id: string;
  entityType: 'bill' | 'product' | 'settings';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'archive';
  performedBy: string; // User ID
  timestamp: number;
  diff?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}
```
