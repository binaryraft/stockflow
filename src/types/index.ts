
export interface ProductOption {
  id: string;
  value: string;
  // Future: quantityInStock?: number; // For variant-level stock
  // Future: costPrice?: number;      // For variant-level pricing
  // Future: sellPrice?: number;      // For variant-level pricing
  // Future: sku?: string;            // For variant-level SKU
  // Future: imageUrl?: string;       // For variant-level image
}

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Color", "Size"
  options: ProductOption[]; // e.g., [{id: '1', value: "Red"}, {id: '2', value: "Blue"}]
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  trackQuantity: boolean;
  sku?: string;
  expiryDate?: string; // Store as ISO string
  quantityInStock: number;
  costPrice: number; // Default/Average cost price
  sellPrice: number; // Default sell price
  imageUrl?: string; // Optional image URL
  description?: string; // For general info
  variants?: ProductVariant[]; // Max 2 variants
}

export interface BillItem {
  id: string; // Unique ID for the bill item
  productId: string;
  productName: string; // Denormalized for display
  quantity: number;
  costPrice: number; // Price at which it was bought (for buy/return) or current cost (for sell)
  sellPrice: number; // Price at which it was sold/intended to be sold
  isDefective?: boolean; // For return items
  selectedVariantOptions?: Record<string, string>; // e.g. { "Color": "Red", "Size": "M" }
}

export interface Bill {
  id:string;
  type: 'buy' | 'sell' | 'return'; // 'buy' is now 'Expense', 'sell' is now 'Sales'
  date: string; // Store as ISO string
  timestamp: number; // For sorting
  vendorOrCustomerName?: string;
  customerPhone?: string;
  items: BillItem[];
  totalAmount: number; // Total cost for 'buy', total revenue for 'sell'
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
}

export type BillMode = 'buy' | 'sell' | 'return';
