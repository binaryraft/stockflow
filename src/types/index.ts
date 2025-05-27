
export interface ProductOption {
  id: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  name: string; 
  options: ProductOption[]; 
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  trackQuantity: boolean;
  sku?: string;
  expiryDate?: string; 
  quantityInStock: number;
  costPrice: number; 
  sellPrice: number; 
  imageUrl?: string; 
  description?: string; 
  variants?: ProductVariant[]; 
}

export interface BillItem {
  id: string; 
  productId: string;
  productName: string; 
  quantity: number;
  costPrice: number; 
  sellPrice: number; 
  isDefective?: boolean; 
  selectedVariantOptions?: Record<string, string>; 
}

export interface Bill {
  id:string;
  type: 'buy' | 'sell' | 'return'; 
  date: string; 
  timestamp: number; 
  vendorOrCustomerName?: string;
  customerPhone?: string;
  items: BillItem[];
  totalAmount: number; 
  notes?: string;
  billedByStaffId?: string;
  billedByStaffName?: string; // Denormalized for easier display
  storeId?: string;
  storeName?: string; // Denormalized for easier display
}

export interface Category {
  id: string;
  name: string;
}

export type BillMode = 'buy' | 'sell' | 'return';

// New Types for Staff and Store Management
export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  passkey: string; // For simplicity, plain text in this prototype
  accessibleStoreIds: string[];
}

export interface Store {
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  passkey: string; // For simplicity, plain text in this prototype
  allowedStaffIds: string[];
}

// Subscription and Profile Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number; // Monthly price
  priceSuffix: string; // e.g., "/ month"
  features: string[];
  maxStores: number; // Use Infinity for unlimited
  maxEmployees: number; // Use Infinity for unlimited
  isPopular?: boolean;
}

export interface UserProfile {
  companyName: string;
  activeSubscriptionId: string;
}
