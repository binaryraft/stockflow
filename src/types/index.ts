
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
  description?: string; // For AI categorization and general info
}

export interface BillItem {
  id: string; // Unique ID for the bill item
  productId: string;
  productName: string; // Denormalized for display
  quantity: number;
  costPrice: number; // Price at which it was bought (for buy/return) or current cost (for sell)
  sellPrice: number; // Price at which it was sold/intended to be sold
  isDefective?: boolean; // For return items
}

export interface Bill {
  id:string;
  type: 'buy' | 'sell' | 'return';
  date: string; // Store as ISO string
  timestamp: number; // For sorting
  vendorOrCustomerName?: string;
  items: BillItem[];
  totalAmount: number; // Total cost for 'buy', total revenue for 'sell'
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
}

export type BillMode = 'buy' | 'sell' | 'return';

export const EXAMPLE_PRODUCTS_FOR_AI = [
  { name: "Organic Apples", description: "Fresh, crispy organic apples, sourced locally.", category: "Fruits" },
  { name: "Whole Wheat Bread", description: "Healthy whole wheat bread, freshly baked daily, no preservatives.", category: "Bakery" },
  { name: "Laptop Pro 15-inch", description: "High-performance laptop with 16GB RAM and 512GB SSD for professionals.", category: "Electronics" },
  { name: "Sparkling Mineral Water 1L", description: "Natural sparkling mineral water, bottled at source.", category: "Beverages" },
  { name: "Men's Cotton T-Shirt", description: "Comfortable and durable 100% cotton t-shirt for men, various colors.", category: "Apparel" },
  { name: "Stainless Steel Cooking Pot", description: "Durable 5-quart stainless steel cooking pot with lid, oven safe.", category: "Kitchenware" },
];
