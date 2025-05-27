
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, Bill, BillItem, Category, BillMode } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate unique IDs (if not using a library like uuid)
// const generateId = () => Math.random().toString(36).substr(2, 9);
const generateId = () => uuidv4();


interface InventoryState {
  products: Product[];
  bills: Bill[];
  categories: Category[];
  addProduct: (productData: Omit<Product, 'id' | 'quantityInStock' | 'imageUrl'> & { initialStock?: number }) => Product;
  updateProduct: (productId: string, productData: Partial<Product>) => void;
  getProductById: (productId: string) => Product | undefined;
  getProductByName: (name: string) => Product | undefined;
  searchProducts: (searchTerm: string) => Product[];
  
  addBill: (billData: Omit<Bill, 'id' | 'date' | 'timestamp' | 'totalAmount'>, items: Omit<BillItem, 'id'|'productName'>[]) => Bill;
  getBillById: (billId: string) => Bill | undefined;
  
  addCategory: (categoryName: string) => Category;
  searchCategories: (searchTerm: string) => string[]; // Returns array of category names
  
  // Example data for initial state
  _hydrate: () => void; // for initial hydration if needed
}

const initialProducts: Product[] = [
  { id: generateId(), name: 'Organic Apples', category: 'Fruits', trackQuantity: true, quantityInStock: 50, costPrice: 0.5, sellPrice: 1, description: "Fresh, crispy organic apples, sourced locally.", imageUrl: `https://placehold.co/100x100.png` },
  { id: generateId(), name: 'Whole Wheat Bread', category: 'Bakery', trackQuantity: true, quantityInStock: 30, costPrice: 1.5, sellPrice: 3, description: "Healthy whole wheat bread, freshly baked daily, no preservatives.", imageUrl: `https://placehold.co/100x100.png` },
  { id: generateId(), name: 'Laptop Pro 15-inch', category: 'Electronics', trackQuantity: true, quantityInStock: 10, costPrice: 800, sellPrice: 1200, description: "High-performance laptop with 16GB RAM and 512GB SSD for professionals.", imageUrl: `https://placehold.co/100x100.png` },
  { id: generateId(), name: 'Chicken Breast 1kg', category: 'Meat', trackQuantity: true, quantityInStock: 20, costPrice: 5, sellPrice: 8.5, description: "Fresh boneless, skinless chicken breast.", imageUrl: `https://placehold.co/100x100.png`},
  { id: generateId(), name: 'Service Charge', category: 'Services', trackQuantity: false, quantityInStock: 0, costPrice: 0, sellPrice: 10, description: "Standard service charge for repairs." },
];

const initialCategories: Category[] = [
  { id: generateId(), name: 'Fruits' },
  { id: generateId(), name: 'Bakery' },
  { id: generateId(), name: 'Electronics' },
  { id: generateId(), name: 'Meat' },
  { id: generateId(), name: 'Services' },
  { id: generateId(), name: 'Beverages' },
  { id: generateId(), name: 'Apparel' },
  { id: generateId(), name: 'Kitchenware' },
];


export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      products: initialProducts,
      bills: [],
      categories: initialCategories,

      addProduct: (productData) => {
        const newProduct: Product = {
          id: generateId(),
          ...productData,
          quantityInStock: productData.trackQuantity ? (productData.initialStock || 0) : 0,
          imageUrl: productData.imageUrl || `https://placehold.co/100x100.png`,
        };
        set((state) => ({ products: [...state.products, newProduct] }));
        if (productData.category && !get().categories.find(c => c.name.toLowerCase() === productData.category!.toLowerCase())) {
          get().addCategory(productData.category!);
        }
        return newProduct;
      },

      updateProduct: (productId, productData) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId ? { ...p, ...productData } : p
          ),
        }));
      },

      getProductById: (productId) => {
        return get().products.find((p) => p.id === productId);
      },
      
      getProductByName: (name) => {
        return get().products.find((p) => p.name.toLowerCase() === name.toLowerCase());
      },

      searchProducts: (searchTerm) => {
        if (!searchTerm) return [];
        const lowerSearchTerm = searchTerm.toLowerCase();
        return get().products.filter((p) =>
          p.name.toLowerCase().includes(lowerSearchTerm)
        );
      },

      addBill: (billData, billItemsData) => {
        const newBillItems: BillItem[] = billItemsData.map(itemData => {
          const product = get().getProductById(itemData.productId);
          return {
            id: generateId(),
            ...itemData,
            productName: product?.name || 'Unknown Product',
          };
        });

        let totalAmount = 0;
        newBillItems.forEach(item => {
          totalAmount += item.quantity * (billData.type === 'buy' ? item.costPrice : item.sellPrice);
        });
        
        const newBill: Bill = {
          id: generateId(),
          ...billData,
          date: new Date().toISOString(),
          timestamp: Date.now(),
          items: newBillItems,
          totalAmount,
        };

        set((state) => ({ bills: [newBill, ...state.bills] }));

        // Update stock based on bill type
        if (billData.type === 'buy') {
          newBillItems.forEach(item => {
            const product = get().getProductById(item.productId);
            if (product && product.trackQuantity) {
              get().updateProduct(item.productId, { quantityInStock: product.quantityInStock + item.quantity });
            }
            // Also update product's cost and sell price if they were changed during purchase
            if (product && (product.costPrice !== item.costPrice || product.sellPrice !== item.sellPrice)) {
                get().updateProduct(item.productId, { costPrice: item.costPrice, sellPrice: item.sellPrice });
            }
          });
        } else if (billData.type === 'sell') {
          newBillItems.forEach(item => {
            const product = get().getProductById(item.productId);
            if (product && product.trackQuantity) {
              get().updateProduct(item.productId, { quantityInStock: Math.max(0, product.quantityInStock - item.quantity) });
            }
          });
        } else if (billData.type === 'return') {
           newBillItems.forEach(item => {
            const product = get().getProductById(item.productId);
            if (product && product.trackQuantity && !item.isDefective) {
              get().updateProduct(item.productId, { quantityInStock: product.quantityInStock + item.quantity });
            }
            // Defective items handling can be extended, e.g., adding to a separate defectives list
          });
        }
        return newBill;
      },
      
      getBillById: (billId) => {
        return get().bills.find((b) => b.id === billId);
      },

      addCategory: (categoryName) => {
        const existingCategory = get().categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (existingCategory) return existingCategory;

        const newCategory: Category = { id: generateId(), name: categoryName };
        set((state) => ({ categories: [...state.categories, newCategory].sort((a, b) => a.name.localeCompare(b.name)) }));
        return newCategory;
      },

      searchCategories: (searchTerm: string) => {
        if (!searchTerm) return get().categories.map(c => c.name).sort((a,b) => a.localeCompare(b));
        const lowerSearchTerm = searchTerm.toLowerCase();
        return get().categories
          .filter(c => c.name.toLowerCase().includes(lowerSearchTerm))
          .map(c => c.name)
          .sort((a,b) => a.localeCompare(b));
      },
      
      _hydrate: () => {
        // This can be used to set initial state if not using the default values above
        // For example, if you want to ensure some data exists on first load after clearing storage
        const state = get();
        let updated = false;
        if (state.products.length === 0) {
          set({ products: initialProducts });
          updated = true;
        }
        if (state.categories.length === 0) {
          set({ categories: initialCategories.sort((a, b) => a.name.localeCompare(b.name)) });
          updated = true;
        } else {
          // Ensure categories are sorted
          const sortedCategories = [...state.categories].sort((a,b) => a.name.localeCompare(b.name));
          if (JSON.stringify(sortedCategories) !== JSON.stringify(state.categories)) {
            set({ categories: sortedCategories });
            updated = true;
          }
        }
        // Ensure default categories exist
        DEFAULT_CATEGORIES.forEach(catName => {
          if(!state.categories.find(c => c.name.toLowerCase() === catName.toLowerCase())) {
            get().addCategory(catName);
            updated = true;
          }
        });
        if (updated) console.log("Inventory store hydrated/updated with initial/default data.");

      }
    }),
    {
      name: 'stockflow-inventory-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrate();
      }
    }
  )
);

// Ensure _hydrate is called once, perhaps on client mount in AppShell or a similar top-level client component.
// useInventoryStore.getState()._hydrate(); // This can cause issues if called prematurely.
// The onRehydrateStorage callback is a better place for this.


// Import DEFAULT_CATEGORIES here if needed for _hydrate logic, or pass it if required.
import { DEFAULT_CATEGORIES } from '@/lib/constants';
