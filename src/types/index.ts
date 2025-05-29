
export interface ProductOption {
  id: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  options: ProductOption[];
}

export interface StockLayer {
  id: string; 
  purchaseBillId: string; 
  purchaseDate: string; 
  initialQuantity: number; 
  quantity: number; 
  costPrice: number; 
  sellPrice: number; 
}

export interface ProductSKU {
  id: string;
  optionValues: Record<string, string>; 
  skuIdentifier?: string; 
  stockLayers: StockLayer[];
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  trackQuantity: boolean;
  sku?: string; 
  expiryDate?: string;
  imageUrl?: string;
  description?: string;
  variants?: ProductVariant[];
  productSKUs: ProductSKU[]; 
}

export type BillMode = 'buy' | 'sell' | 'return';

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
  type: BillMode;
  date: string;
  timestamp: number;
  vendorOrCustomerName?: string;
  customerPhone?: string;
  items: BillItem[];
  totalAmount: number;
  notes?: string;
  paymentStatus?: 'paid' | 'unpaid';
  billedByStaffId?: string;
  billedByStaffName?: string; 
  storeId?: string;
  storeName?: string; 
}

export interface Category {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  passkey: string;
  accessibleStoreIds: string[];
}

export interface Store {
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  passkey: string;
  allowedStaffIds: string[];
  allowedOperations: BillMode[]; 
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  priceSuffix: string;
  features: string[];
  maxStores: number;
  maxEmployees: number;
  isPopular?: boolean;
}

export interface UserProfile {
  companyName: string;
  activeSubscriptionId: string;
  dataMode: 'local' | 'global';
}

export interface ChatMessage {
  id: string;
  storeId: string;
  senderId: 'admin' | string; 
  senderName: string; 
  text: string;
  timestamp: number;
}

// Added for new dashboard stats
export interface FinancialSummary {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

export interface TodaysFinancialSummary extends FinancialSummary {
  transactionsToday: number;
  defectivesToday: number;
}
