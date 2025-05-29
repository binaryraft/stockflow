
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
  id: string; // Unique ID for this layer/batch
  purchaseBillId: string; // ID of the expense bill this layer came from
  purchaseDate: string; // ISO date string
  initialQuantity: number; // Quantity originally purchased in this layer
  quantity: number; // Quantity remaining in this layer
  costPrice: number; // Cost price for items in this layer
  sellPrice: number; // Sell price set for items from this layer (at time of purchase)
}

export interface ProductSKU {
  id: string;
  optionValues: Record<string, string>; // e.g., {"Color": "Red", "Size": "M"}
  skuIdentifier?: string; // e.g., PNAME-RED-M
  stockLayers: StockLayer[];
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  trackQuantity: boolean;
  sku?: string; // Base SKU for non-variant products, or general product code
  expiryDate?: string;
  imageUrl?: string;
  description?: string;
  variants?: ProductVariant[];
  productSKUs: ProductSKU[]; // Holds all stock keeping units for this product
}

export type BillMode = 'buy' | 'sell' | 'return';

export interface BillItem {
  id: string;
  productId: string; // Refers to the main Product ID
  productName: string; // Denormalized for easy display
  quantity: number;
  costPrice: number; // For sales/returns, this is COGS from FIFO. For purchases, it's the purchase cost.
  sellPrice: number; // Price at the time of this transaction
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
  billedByStaffName?: string; // Denormalized for easier display
  storeId?: string;
  storeName?: string; // Denormalized for easier display
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
  allowedOperations: BillMode[]; // e.g., ['sell', 'return']
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
}

export interface ChatMessage {
  id: string;
  storeId: string;
  senderId: 'admin' | string; // 'admin' or staffId
  senderName: string; // "Admin" or staff's name
  text: string;
  timestamp: number;
}
