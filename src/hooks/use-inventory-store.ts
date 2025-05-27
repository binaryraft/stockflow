
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, Bill, BillItem, Category, ProductVariant as ProductVariantType, ProductOption } from '@/types'; // Renamed ProductVariant to ProductVariantType
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const generateId = () => uuidv4();


interface InventoryState {
  products: Product[];
  bills: Bill[];
  categories: Category[];
  addProduct: (productData: Omit<Product, 'id' | 'quantityInStock' | 'imageUrl' | 'variants'> & { initialStock?: number; variants?: Array<{ name: string, options: Array<{ value: string}> }> }) => Product;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'quantityInStock' | 'imageUrl' | 'variants'>> & { variants?: Array<{ name: string, options: Array<{ value: string}> }> }) => void;
  getProductById: (productId: string) => Product | undefined;
  getProductByName: (name: string) => Product | undefined;
  searchProducts: (searchTerm: string) => Product[];
  
  addBill: (billData: Omit<Bill, 'id' | 'date' | 'timestamp' | 'totalAmount'>, items: Omit<BillItem, 'id'|'productName'>[]) => Bill;
  getBillById: (billId: string) => Bill | undefined;
  
  addCategory: (categoryName: string) => Category;
  searchCategories: (searchTerm: string) => string[];
  
  _hydrate: () => void; 
}

const initialProducts: Product[] = [
  { id: generateId(), name: 'Organic Apples', category: 'Fruits', trackQuantity: true, quantityInStock: 50, costPrice: 0.5, sellPrice: 1, description: "Fresh, crispy organic apples, sourced locally.", imageUrl: `https://placehold.co/100x100.png`, variants: [] },
  { id: generateId(), name: 'Whole Wheat Bread', category: 'Bakery', trackQuantity: true, quantityInStock: 30, costPrice: 1.5, sellPrice: 3, description: "Healthy whole wheat bread, freshly baked daily, no preservatives.", imageUrl: `https://placehold.co/100x100.png`, variants: [] },
  { id: generateId(), name: 'Laptop Pro 15-inch', category: 'Electronics', trackQuantity: true, quantityInStock: 10, costPrice: 800, sellPrice: 1200, description: "High-performance laptop with 16GB RAM and 512GB SSD for professionals.", imageUrl: `https://placehold.co/100x100.png`, variants: [] },
  { id: generateId(), name: 'Chicken Breast 1kg', category: 'Meat', trackQuantity: true, quantityInStock: 20, costPrice: 5, sellPrice: 8.5, description: "Fresh boneless, skinless chicken breast.", imageUrl: `https://placehold.co/100x100.png`, variants: []},
  { id: generateId(), name: 'Service Charge', category: 'Services', trackQuantity: false, quantityInStock: 0, costPrice: 0, sellPrice: 10, description: "Standard service charge for repairs.", variants: [] },
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
        const productVariants: ProductVariantType[] = (productData.variants || []).map((variantData, variantIdx) => ({
          id: `variant-${generateId()}-${variantIdx}`,
          name: variantData.name,
          options: variantData.options.map((optData, optIdx) => ({
            id: `option-${generateId()}-${variantIdx}-${optIdx}`,
            value: optData.value,
          })),
        }));

        const newProduct: Product = {
          id: generateId(),
          name: productData.name,
          category: productData.category,
          trackQuantity: productData.trackQuantity,
          sku: productData.sku,
          expiryDate: productData.expiryDate,
          quantityInStock: productData.trackQuantity ? (productData.initialStock || 0) : 0,
          costPrice: productData.costPrice || 0,
          sellPrice: productData.sellPrice || 0,
          imageUrl: productData.imageUrl || `https://placehold.co/100x100.png`,
          description: productData.description,
          variants: productVariants,
        };
        set((state) => ({ products: [...state.products, newProduct] }));
        if (productData.category && !get().categories.find(c => c.name.toLowerCase() === productData.category!.toLowerCase())) {
          get().addCategory(productData.category!);
        }
        return newProduct;
      },

      updateProduct: (productId, productData) => {
        const productVariants: ProductVariantType[] | undefined = productData.variants 
          ? productData.variants.map((variantData, variantIdx) => ({
              id: `variant-${generateId()}-${variantIdx}`, // Consider keeping old IDs if possible for complex updates
              name: variantData.name,
              options: variantData.options.map((optData, optIdx) => ({
                id: `option-${generateId()}-${variantIdx}-${optIdx}`, // Same ID consideration
                value: optData.value,
              })),
            }))
          : undefined;

        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId 
            ? { 
                ...p, 
                ...productData, 
                variants: productVariants || p.variants // If productData.variants is undefined, keep existing p.variants
              } 
            : p
          ),
        }));
        if (productData.category && !get().categories.find(c => c.name.toLowerCase() === productData.category!.toLowerCase())) {
          get().addCategory(productData.category!);
        }
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
        const currentDate = new Date();
        const newBillItems: BillItem[] = billItemsData.map(itemData => {
          const product = get().getProductById(itemData.productId);
          return {
            id: generateId(),
            productName: product?.name || 'Unknown Product',
            productId: itemData.productId,
            quantity: itemData.quantity,
            costPrice: itemData.costPrice,
            sellPrice: itemData.sellPrice,
            isDefective: itemData.isDefective,
            selectedVariantOptions: itemData.selectedVariantOptions,
          };
        });

        let totalAmount = 0;
        newBillItems.forEach(item => {
          totalAmount += item.quantity * (billData.type === 'buy' ? item.costPrice : item.sellPrice);
        });
        
        const newBill: Bill = {
          id: format(currentDate, 'ddMMyyHHmmss'),
          ...billData,
          date: currentDate.toISOString(),
          timestamp: currentDate.getTime(),
          items: newBillItems,
          totalAmount,
        };

        set((state) => ({ bills: [newBill, ...state.bills] }));

        if (billData.type === 'buy') {
          newBillItems.forEach(item => {
            const product = get().getProductById(item.productId);
            if (product && product.trackQuantity) {
              get().updateProduct(item.productId, { quantityInStock: product.quantityInStock + item.quantity });
            }
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
        const state = get();
        let updated = false;
        
        const hydratedProducts = state.products.map(p => ({ ...p, variants: p.variants || [] }));
        if (JSON.stringify(hydratedProducts) !== JSON.stringify(state.products)) {
            set({ products: hydratedProducts });
            updated = true;
        }

        if (state.products.length === 0) {
          set({ products: initialProducts.map(p => ({...p, variants: p.variants || []})) });
          updated = true;
        }
        if (state.categories.length === 0) {
          set({ categories: initialCategories.sort((a, b) => a.name.localeCompare(b.name)) });
          updated = true;
        } else {
          const sortedCategories = [...state.categories].sort((a,b) => a.name.localeCompare(b.name));
          if (JSON.stringify(sortedCategories) !== JSON.stringify(state.categories)) {
            set({ categories: sortedCategories });
            updated = true;
          }
        }
        DEFAULT_CATEGORIES.forEach(catName => {
          if(!get().categories.find(c => c.name.toLowerCase() === catName.toLowerCase())) { 
            get().addCategory(catName);
            updated = true; 
          }
        });
        if (updated) console.log("Inventory store hydrated/updated.");
      }
    }),
    {
      name: 'stockflow-inventory-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrate();
      }
    }
  )
);

import { DEFAULT_CATEGORIES } from '@/lib/constants';
