
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
  quantity: number; // Can be float
  costPrice: number;
  sellPrice: number;
  storeId?: string;
}

export interface ProductSKU {
  id: string;
  optionValues: Record<string, string>;
  skuIdentifier?: string;
  stockLayers: StockLayer[];
}

export interface AdditionalChargeDefinition {
  id: string;
  name: string;
  price: number;
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
  companyId: string;
  sgstRate?: number; 
  cgstRate?: number; 
  additionalChargeDefinitions?: AdditionalChargeDefinition[];
}

export type BillMode = 'buy' | 'sell' | 'return';

export interface BillItem {
  id: string;
  productId: string; // Can be real product ID or special ID for charges like 'CHARGE_ITEM_...'
  productName: string;
  quantity: number; // Can be float
  costPrice: number; 
  sellPrice: number; 
  isDefective?: boolean;
  selectedVariantOptions?: Record<string, string>;
  sgstAmount?: number; 
  cgstAmount?: number; 
  isAdditionalCharge?: boolean; // Flag to identify auto-added charges
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
  subTotal?: number; 
  totalSGST?: number; 
  totalCGST?: number; 
  isEstimate?: boolean; 
  notes?: string;
  paymentStatus?: 'paid' | 'unpaid';
  billedByStaffId?: string; 
  billedByStaffName?: string; 
  storeId?: string;
  storeName?: string;
  companyId: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
  token: string; 
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email?: string; 
  employeeId?: string; 
  password?: string; 
  role: 'admin' | 'employee';
  assignedStoreIds?: string[]; 
}

export interface Store {
  id: string;
  companyId: string;
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

export interface ProductLedgerEntry {
  productId: string;
  productName: string;
  category?: string;
  totalPurchased: number;
  totalSold: number;
  totalRestockedReturns: number;
  totalDefectiveReturns: number;
  currentStock: number | 'N/A';
}
