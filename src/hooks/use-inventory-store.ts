
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, Bill, BillItem, Category, ProductVariant as ProductVariantType, ProductOption, Staff, Store, UserProfile, SubscriptionPlan } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, startOfDay } from 'date-fns';
import { DEFAULT_CATEGORIES, SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS, DEFAULT_COMPANY_NAME } from '@/lib/constants';

const generateId = () => uuidv4();


interface InventoryState {
  products: Product[];
  bills: Bill[];
  categories: Category[];
  staffs: Staff[];
  stores: Store[];
  userProfile: UserProfile;

  // Product Methods
  addProduct: (productData: Omit<Product, 'id' | 'quantityInStock' | 'imageUrl' | 'variants'> & { initialStock?: number; variants?: Array<{ name: string, options: Array<{ value: string}> }> }) => Product;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'quantityInStock' | 'imageUrl' | 'variants'>> & { variants?: Array<{ name: string, options: Array<{ value: string}> }> }) => void;
  getProductById: (productId: string) => Product | undefined;
  getProductByName: (name: string) => Product | undefined;
  searchProducts: (searchTerm: string) => Product[];
  getLowStockProductCount: (threshold: number) => number;
  
  // Bill Methods
  addBill: (
    billData: Omit<Bill, 'id' | 'date' | 'timestamp' | 'totalAmount' | 'items' | 'billedByStaffName' | 'storeName'>, 
    items: Omit<BillItem, 'id'|'productName'>[],
    staffId?: string, 
    storeId?: string  
  ) => Bill;
  getBillById: (billId: string) => Bill | undefined;
  
  // Category Methods
  addCategory: (categoryName: string) => Category;
  searchCategories: (searchTerm: string) => string[];

  // Staff CRUD
  addStaff: (staffData: Omit<Staff, 'id'>) => Staff | null; // Return null if limit reached
  updateStaff: (staffId: string, staffData: Partial<Omit<Staff, 'id'>>) => void;
  deleteStaff: (staffId: string) => void;
  getStaffById: (staffId: string) => Staff | undefined;
  getAllStaff: () => Staff[];

  // Store CRUD
  addStore: (storeData: Omit<Store, 'id'>) => Store | null; // Return null if limit reached
  updateStore: (storeId: string, storeData: Partial<Omit<Store, 'id'>>) => void;
  deleteStore: (storeId: string) => void;
  getStoreById: (storeId: string) => Store | undefined;
  getAllStores: () => Store[];

  // User Profile & Subscription
  updateCompanyName: (name: string) => void;
  updateSubscription: (planId: string) => void;
  getActiveSubscriptionPlan: () => SubscriptionPlan | undefined;
  canAddStore: () => boolean;
  canAddStaff: () => boolean;
  
  // Selectors for dashboard charts
  getDailySalesAndExpenses: (days: number) => Array<{ date: string; sales: number; expenses: number }>;
  getTopSellingProductsByRevenue: (limit: number) => Array<{ name: string; revenue: number }>;
  
  _hydrate: () => void; 
}

const initialProducts: Product[] = [
  { id: generateId(), name: 'Organic Apples', category: 'Fruits', trackQuantity: true, quantityInStock: 3, costPrice: 20, sellPrice: 40, description: "Fresh, crispy organic apples, sourced locally.", imageUrl: `https://placehold.co/100x100.png`, variants: [] },
  { id: generateId(), name: 'Whole Wheat Bread', category: 'Bakery', trackQuantity: true, quantityInStock: 30, costPrice: 30, sellPrice: 50, description: "Healthy whole wheat bread, freshly baked daily, no preservatives.", imageUrl: `https://placehold.co/100x100.png`, variants: [] },
  { id: generateId(), name: 'Laptop Pro 15-inch', category: 'Electronics', trackQuantity: true, quantityInStock: 10, costPrice: 80000, sellPrice: 120000, description: "High-performance laptop with 16GB RAM and 512GB SSD for professionals.", imageUrl: `https://placehold.co/100x100.png`, variants: [] },
  { id: generateId(), name: 'Chicken Breast 1kg', category: 'Meat', trackQuantity: true, quantityInStock: 2, costPrice: 300, sellPrice: 450, description: "Fresh boneless, skinless chicken breast.", imageUrl: `https://placehold.co/100x100.png`, variants: []},
  { id: generateId(), name: 'Service Charge', category: 'Services', trackQuantity: false, quantityInStock: 0, costPrice: 0, sellPrice: 100, description: "Standard service charge for repairs.", variants: [] },
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
      staffs: [],
      stores: [],
      userProfile: {
        companyName: DEFAULT_COMPANY_NAME,
        activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY, // Default to basic plan
      },

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
              id: (get().products.find(p => p.id === productId)?.variants?.find(v => v.name === variantData.name)?.id) || `variant-${generateId()}-${variantIdx}`,
              name: variantData.name,
              options: variantData.options.map((optData, optIdx) => ({
                id: (get().products.find(p => p.id === productId)?.variants?.find(v => v.name === variantData.name)?.options.find(o => o.value === optData.value)?.id) || `option-${generateId()}-${variantIdx}-${optIdx}`,
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
                variants: productData.variants ? productVariants : p.variants,
                quantityInStock: productData.trackQuantity === false ? 0 : (productData.initialStock !== undefined ? productData.initialStock : p.quantityInStock)
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
          p.name.toLowerCase().includes(lowerSearchTerm) ||
          (p.category && p.category.toLowerCase().includes(lowerSearchTerm)) ||
          (p.sku && p.sku.toLowerCase().includes(lowerSearchTerm))
        );
      },

      getLowStockProductCount: (threshold: number) => {
        return get().products.filter(p => p.trackQuantity && p.quantityInStock < threshold).length;
      },

      addBill: (billData, billItemsData, staffId, storeId) => {
        const currentDate = new Date();
        const newBillItems: BillItem[] = billItemsData.map(itemData => {
          const product = get().getProductById(itemData.productId);
          return {
            id: generateId(),
            productName: product?.name || (itemData.productId.startsWith('SERVICE_ITEM_') ? itemData.productName : 'Unknown Product'),
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
        
        const staffMember = staffId ? get().getStaffById(staffId) : undefined;
        const storeLocation = storeId ? get().getStoreById(storeId) : undefined;

        const newBill: Bill = {
          id: format(currentDate, 'ddMMyyHHmmss'),
          ...billData,
          date: currentDate.toISOString(),
          timestamp: currentDate.getTime(),
          items: newBillItems,
          totalAmount,
          billedByStaffId: staffId,
          billedByStaffName: staffMember?.name,
          storeId: storeId,
          storeName: storeLocation?.name,
        };

        set((state) => ({ bills: [newBill, ...state.bills] }));

        if (billData.type === 'buy') {
          newBillItems.forEach(item => {
            if (item.productId.startsWith('SERVICE_ITEM_')) return; 
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
            if (item.productId.startsWith('SERVICE_ITEM_')) return; 
            const product = get().getProductById(item.productId);
            if (product && product.trackQuantity) {
              get().updateProduct(item.productId, { quantityInStock: Math.max(0, product.quantityInStock - item.quantity) });
            }
          });
        } else if (billData.type === 'return') {
           newBillItems.forEach(item => {
            if (item.productId.startsWith('SERVICE_ITEM_')) return; 
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
      
      // Staff CRUD
      addStaff: (staffData) => {
        if (!get().canAddStaff()) return null;
        const newStaff: Staff = { id: generateId(), ...staffData };
        set((state) => ({ staffs: [...state.staffs, newStaff] }));
        return newStaff;
      },
      updateStaff: (staffId, staffData) => {
        set((state) => ({
          staffs: state.staffs.map((s) => (s.id === staffId ? { ...s, ...staffData } : s)),
        }));
      },
      deleteStaff: (staffId) => {
        set((state) => ({
          staffs: state.staffs.filter((s) => s.id !== staffId),
          stores: state.stores.map(store => ({
            ...store,
            allowedStaffIds: store.allowedStaffIds.filter(id => id !== staffId)
          }))
        }));
      },
      getStaffById: (staffId) => get().staffs.find((s) => s.id === staffId),
      getAllStaff: () => get().staffs,

      // Store CRUD
      addStore: (storeData) => {
        if (!get().canAddStore()) return null;
        const newStore: Store = { id: generateId(), ...storeData };
        set((state) => ({ stores: [...state.stores, newStore] }));
        return newStore;
      },
      updateStore: (storeId, storeData) => {
        set((state) => ({
          stores: state.stores.map((s) => (s.id === storeId ? { ...s, ...storeData } : s)),
        }));
      },
      deleteStore: (storeId) => {
        set((state) => ({
          stores: state.stores.filter((s) => s.id !== storeId),
          staffs: state.staffs.map(staff => ({
            ...staff,
            accessibleStoreIds: staff.accessibleStoreIds.filter(id => id !== storeId)
          }))
        }));
      },
      getStoreById: (storeId) => get().stores.find((s) => s.id === storeId),
      getAllStores: () => get().stores,

      // User Profile & Subscription
      updateCompanyName: (name: string) => {
        set((state) => ({ userProfile: { ...state.userProfile, companyName: name }}));
      },
      updateSubscription: (planId: string) => {
        set((state) => ({ userProfile: { ...state.userProfile, activeSubscriptionId: planId }}));
      },
      getActiveSubscriptionPlan: () => {
        const { activeSubscriptionId } = get().userProfile;
        return SUBSCRIPTION_PLANS.find(plan => plan.id === activeSubscriptionId);
      },
      canAddStore: () => {
        const plan = get().getActiveSubscriptionPlan();
        if (!plan) return false;
        return get().stores.length < plan.maxStores;
      },
      canAddStaff: () => {
        const plan = get().getActiveSubscriptionPlan();
        if (!plan) return false;
        return get().staffs.length < plan.maxEmployees;
      },

      // Dashboard Selectors
      getDailySalesAndExpenses: (days) => {
        const bills = get().bills;
        const dailyData: Array<{ date: string; sales: number; expenses: number }> = [];
        for (let i = 0; i < days; i++) {
          const targetDate = startOfDay(subDays(new Date(), i));
          const dateStr = format(targetDate, 'MMM d');
          let sales = 0;
          let expenses = 0;

          bills.forEach(bill => {
            if (startOfDay(new Date(bill.date)).getTime() === targetDate.getTime()) {
              if (bill.type === 'sell') {
                sales += bill.totalAmount;
              } else if (bill.type === 'buy') {
                expenses += bill.totalAmount;
              }
            }
          });
          dailyData.unshift({ date: dateStr, sales, expenses }); 
        }
        return dailyData;
      },

      getTopSellingProductsByRevenue: (limit) => {
        const bills = get().bills;
        const productRevenue: Record<string, { name: string; revenue: number }> = {};

        bills.forEach(bill => {
          if (bill.type === 'sell') {
            bill.items.forEach(item => {
              if (item.productId.startsWith('SERVICE_ITEM_')) return; 
              if (!productRevenue[item.productId]) {
                productRevenue[item.productId] = { name: item.productName, revenue: 0 };
              }
              productRevenue[item.productId].revenue += item.sellPrice * item.quantity;
            });
          }
        });
        return Object.values(productRevenue)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);
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

        // Ensure userProfile exists and has a default plan if somehow missing
        if (!state.userProfile || !state.userProfile.activeSubscriptionId) {
          set({ 
            userProfile: { 
              companyName: state.userProfile?.companyName || DEFAULT_COMPANY_NAME, 
              activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY 
            }
          });
          updated = true;
        }


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
