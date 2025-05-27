
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, Bill, BillItem, Category, ProductVariant as ProductVariantType, ProductOption, Staff, Store, UserProfile, SubscriptionPlan, ProductSKU, BillMode } from '@/types';
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
  addProduct: (productData: Omit<Product, 'id' | 'imageUrl' | 'productSKUs' | 'variants'> & { initialStock?: number; costPrice?: number; sellPrice?: number; variants?: Array<{ name: string, options: Array<{ value: string}> }> }) => Product;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'imageUrl' | 'productSKUs' | 'variants'>> & { variants?: Array<{ name: string, options: Array<{ value: string}> }>, productSKUs?: ProductSKU[] }) => void;
  getProductById: (productId: string) => Product | undefined;
  getProductByName: (name: string) => Product | undefined;
  searchProducts: (searchTerm: string) => Product[];
  getLowStockProductCount: (threshold: number) => number;
  findOrCreateProductSKU: (productId: string, optionValues: Record<string, string>, costPrice: number, sellPrice: number, quantityChange: number, isPurchase: boolean, trackProductQuantity: boolean) => ProductSKU | undefined;
  
  // Bill Methods
  addBill: (
    billData: Omit<Bill, 'id' | 'date' | 'timestamp' | 'totalAmount' | 'items' | 'billedByStaffName' | 'storeName'>, 
    items: Omit<BillItem, 'id'|'productName'>[],
    staffId?: string, 
    storeId?: string  
  ) => Bill;
  getBillById: (billId: string) => Bill | undefined;
  getRecentBills: (limit: number) => Bill[];
  
  // Category Methods
  addCategory: (categoryName: string) => Category;
  searchCategories: (searchTerm: string) => string[];

  // Staff CRUD
  addStaff: (staffData: Omit<Staff, 'id'>) => Staff | null; 
  updateStaff: (staffId: string, staffData: Partial<Omit<Staff, 'id'>>) => void;
  deleteStaff: (staffId: string) => void;
  getStaffById: (staffId: string) => Staff | undefined;
  getAllStaff: () => Staff[];

  // Store CRUD
  addStore: (storeData: Omit<Store, 'id'>) => Store | null; 
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

const getSkuIdentifier = (productName: string, optionValues: Record<string, string>): string => {
  if (Object.keys(optionValues).length === 0) return productName; // Use product name for non-variant/default SKU
  const sortedOptions = Object.entries(optionValues)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([, value]) => value)
    .join('-');
  return `${productName}-${sortedOptions}`;
};

const initialProducts: Product[] = [
  { id: generateId(), name: 'Organic Apples', category: 'Fruits', trackQuantity: true, description: "Fresh, crispy organic apples, sourced locally.", imageUrl: `https://placehold.co/100x100.png`, variants: [], productSKUs: [{ id: generateId(), optionValues: {}, costPrice: 20, sellPrice: 40, quantityInStock: 50, skuIdentifier: 'Organic Apples' }] },
  { id: generateId(), name: 'Whole Wheat Bread', category: 'Bakery', trackQuantity: true, description: "Healthy whole wheat bread, freshly baked daily, no preservatives.", imageUrl: `https://placehold.co/100x100.png`, variants: [], productSKUs: [{ id: generateId(), optionValues: {}, costPrice: 30, sellPrice: 50, quantityInStock: 30, skuIdentifier: 'Whole Wheat Bread' }] },
  { id: generateId(), name: 'Laptop Pro 15-inch', category: 'Electronics', trackQuantity: true, description: "High-performance laptop with 16GB RAM and 512GB SSD for professionals.", imageUrl: `https://placehold.co/100x100.png`, variants: [], productSKUs: [{ id: generateId(), optionValues: {}, costPrice: 80000, sellPrice: 120000, quantityInStock: 10, skuIdentifier: 'Laptop Pro 15-inch' }] },
  { id: generateId(), name: 'Chicken Breast 1kg', category: 'Meat', trackQuantity: true, description: "Fresh boneless, skinless chicken breast.", imageUrl: `https://placehold.co/100x100.png`, variants: [], productSKUs: [{ id: generateId(), optionValues: {}, costPrice: 300, sellPrice: 450, quantityInStock: 20, skuIdentifier: 'Chicken Breast 1kg' }]},
  { 
    id: generateId(), 
    name: 'T-Shirt', 
    category: 'Apparel', 
    trackQuantity: true, 
    description: "Comfortable cotton t-shirt.", 
    imageUrl: `https://placehold.co/100x100.png`,
    variants: [
      { id: generateId(), name: 'Color', options: [{id: generateId(), value: 'Red'}, {id: generateId(), value: 'Blue'}] },
      { id: generateId(), name: 'Size', options: [{id: generateId(), value: 'M'}, {id: generateId(), value: 'L'}] },
    ],
    productSKUs: [] // SKUs will be created on first purchase
  },
  { id: generateId(), name: 'Service Charge', category: 'Services', trackQuantity: false, description: "Standard service charge for repairs.", productSKUs: [{id: generateId(), optionValues: {}, costPrice: 0, sellPrice: 100, quantityInStock: 0, skuIdentifier: 'Service Charge' }] },
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
        activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY, 
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
        
        let initialSKUs: ProductSKU[] = [];
        // If no variants, create a default SKU with the provided prices and stock
        if (!productData.variants || productData.variants.length === 0) {
          initialSKUs.push({
            id: generateId(),
            optionValues: {}, // Empty optionValues for default SKU
            costPrice: productData.costPrice || 0,
            sellPrice: productData.sellPrice || 0,
            quantityInStock: productData.trackQuantity ? (productData.initialStock || 0) : 0,
            skuIdentifier: productData.name, // Use product name as SKU identifier for non-variant
          });
        }
        // For products with variants, SKUs are typically created/priced upon first purchase (expense bill).

        const newProduct: Product = {
          id: generateId(),
          name: productData.name,
          category: productData.category,
          trackQuantity: productData.trackQuantity,
          sku: productData.sku, 
          expiryDate: productData.expiryDate,
          imageUrl: `https://placehold.co/100x100.png`, // Always use placeholder
          description: productData.description,
          variants: productVariants,
          productSKUs: initialSKUs,
        };
        set((state) => ({ products: [...state.products, newProduct] }));
        if (productData.category && !get().categories.find(c => c.name.toLowerCase() === productData.category!.toLowerCase())) {
          get().addCategory(productData.category!);
        }
        return newProduct;
      },
      
      updateProduct: (productId, productData) => {
        set((state) => ({
          products: state.products.map((p) => {
            if (p.id === productId) {
              const updatedVariants: ProductVariantType[] | undefined = productData.variants
                ? productData.variants.map((variantData, variantIdx) => {
                    const existingVariant = p.variants?.find(v => v.name === variantData.name);
                    return {
                      id: existingVariant?.id || `variant-${generateId()}-${variantIdx}`,
                      name: variantData.name,
                      options: variantData.options.map((optData, optIdx) => {
                        const existingOption = existingVariant?.options.find(o => o.value === optData.value);
                        return {
                          id: existingOption?.id || `option-${generateId()}-${variantIdx}-${optIdx}`,
                          value: optData.value,
                        };
                      }),
                    };
                  })
                : p.variants;

              let updatedProductSKUs = p.productSKUs;
              // Handle ProductSKUs for non-variant products if prices/stock are updated from dialog
              if ((!updatedVariants || updatedVariants.length === 0) && (!productData.productSKUs)) {
                const defaultSku = p.productSKUs.find(sku => Object.keys(sku.optionValues).length === 0) || 
                                   { id: generateId(), optionValues: {}, skuIdentifier: p.name };
                updatedProductSKUs = [{
                  ...defaultSku,
                  costPrice: productData.costPrice !== undefined ? productData.costPrice : defaultSku.costPrice,
                  sellPrice: productData.sellPrice !== undefined ? productData.sellPrice : defaultSku.sellPrice,
                  quantityInStock: productData.trackQuantity === false ? 0 : (productData.initialStock !== undefined ? productData.initialStock : defaultSku.quantityInStock),
                }];
              } else if (productData.productSKUs) { // Explicitly provided productSKUs (e.g., from addBill)
                 updatedProductSKUs = productData.productSKUs;
              }


              return {
                ...p,
                ...productData,
                variants: updatedVariants,
                productSKUs: updatedProductSKUs,
                trackQuantity: productData.trackQuantity !== undefined ? productData.trackQuantity : p.trackQuantity, 
              };
            }
            return p;
          }),
        }));
        if (productData.category && !get().categories.find(c => c.name.toLowerCase() === productData.category!.toLowerCase())) {
          get().addCategory(productData.category!);
        }
      },
      
      findOrCreateProductSKU: (productId, optionValues, costPrice, sellPrice, quantityChange, isPurchase, trackProductQuantity) => {
        const products = get().products;
        const productIndex = products.findIndex(p => p.id === productId);
        if (productIndex === -1) return undefined;

        const product = products[productIndex];
        const stringifiedOptionValues = JSON.stringify(Object.entries(optionValues).sort().reduce((r, [k, v]) => (r[k] = v, r), {} as Record<string, string>));
        
        let skuIndex = product.productSKUs.findIndex(sku => 
          JSON.stringify(Object.entries(sku.optionValues).sort().reduce((r, [k, v]) => (r[k] = v, r), {} as Record<string, string>)) === stringifiedOptionValues
        );

        let updatedSku: ProductSKU;

        if (skuIndex !== -1) { // SKU exists
          updatedSku = { ...product.productSKUs[skuIndex] };
          if (isPurchase) { // Expense bill
            updatedSku.costPrice = costPrice; // Update cost price from this purchase
            updatedSku.sellPrice = sellPrice; // Update sell price from this purchase
            if(trackProductQuantity) updatedSku.quantityInStock += quantityChange;
          } else { // Sales or Return bill
            if(trackProductQuantity) updatedSku.quantityInStock += quantityChange; // quantityChange will be negative for sale, positive for restocked return
          }
        } else { // SKU does not exist, create it
          if (!isPurchase && (!trackProductQuantity || Object.keys(optionValues).length > 0)) { 
            // Cannot sell/return a non-existent SKU that needs tracking unless it's a non-tracked base product
            console.error("Attempted to sell/return non-existent tracked SKU for variant product:", productId, optionValues);
            return undefined; 
          }
          updatedSku = {
            id: generateId(),
            optionValues,
            costPrice: costPrice,
            sellPrice: sellPrice,
            quantityInStock: trackProductQuantity ? quantityChange : 0,
            skuIdentifier: getSkuIdentifier(product.name, optionValues),
          };
        }
        
        if(trackProductQuantity) updatedSku.quantityInStock = Math.max(0, updatedSku.quantityInStock);

        const updatedProductSKUs = [...product.productSKUs];
        if (skuIndex !== -1) {
          updatedProductSKUs[skuIndex] = updatedSku;
        } else {
          updatedProductSKUs.push(updatedSku);
        }
        
        get().updateProduct(productId, { productSKUs: updatedProductSKUs, trackQuantity: product.trackQuantity });
        return updatedSku;
      },


      getProductById: (productId) => {
        return get().products.find((p) => p.id === productId);
      },
      
      getProductByName: (name) => {
        // This might need adjustment if multiple products can have the same name but different variants
        // For now, assumes product names are unique at the base level.
        return get().products.find((p) => p.name.toLowerCase() === name.toLowerCase());
      },

      searchProducts: (searchTerm) => {
        if (!searchTerm) return [];
        const lowerSearchTerm = searchTerm.toLowerCase();
        return get().products.filter((p) =>
          p.name.toLowerCase().includes(lowerSearchTerm) ||
          (p.category && p.category.toLowerCase().includes(lowerSearchTerm)) ||
          (p.sku && p.sku.toLowerCase().includes(lowerSearchTerm)) || // Base SKU search
          (p.productSKUs.some(sku => sku.skuIdentifier?.toLowerCase().includes(lowerSearchTerm)))
        );
      },

      getLowStockProductCount: (threshold: number) => {
         return get().products.reduce((count, product) => {
          if (product.trackQuantity) {
            const isVariantProduct = product.variants && product.variants.length > 0;
            if (isVariantProduct) {
                // For variant products, count if *any* SKU is low
                if (product.productSKUs.some(sku => sku.quantityInStock < threshold)) {
                    return count + 1;
                }
            } else {
                // For non-variant products, check their single SKU
                if (product.productSKUs.length > 0 && product.productSKUs[0].quantityInStock < threshold) {
                    return count + 1;
                }
            }
          }
          return count;
        }, 0);
      },

      addBill: (billData, billItemsData) => {
        const currentDate = new Date();
        const newBillItems: BillItem[] = [];

        billItemsData.forEach(itemData => {
          const product = get().getProductById(itemData.productId);
          // For service items, product might be undefined, which is fine.
          if (!product && !itemData.productId.startsWith('SERVICE_ITEM_')) {
            console.error(`Product not found for itemData.productId: ${itemData.productId}`);
            return; // Skip this item
          }

          let itemCostPrice = itemData.costPrice;
          let itemSellPrice = itemData.sellPrice;
          
          if (!itemData.productId.startsWith('SERVICE_ITEM_') && product) {
            const isPurchase = billData.type === 'buy';
            let qtyModifier = 0;
            if (billData.type === 'sell') qtyModifier = -itemData.quantity;
            else if (billData.type === 'buy') qtyModifier = itemData.quantity;
            else if (billData.type === 'return' && !itemData.isDefective) qtyModifier = itemData.quantity;
            // Defective returns don't change stock of the specific SKU being returned in this model,
            // as it's assumed 'defective' means not going back to sellable stock.

            const targetSKU = get().findOrCreateProductSKU(
              itemData.productId,
              itemData.selectedVariantOptions || {},
              itemData.costPrice, // Pass form cost price for purchase/new SKU
              itemData.sellPrice, // Pass form sell price for purchase/new SKU
              qtyModifier,
              isPurchase,
              product.trackQuantity // Pass product's trackQuantity setting
            );

            if (!targetSKU) {
              console.error("Could not find or create SKU for bill item:", itemData.productId, itemData.selectedVariantOptions);
              return; // Skip item if SKU cannot be determined
            }
            
            // For Sales/Returns, BillItem should reflect the SKU's actual prices at time of transaction
            if (!isPurchase) {
              itemCostPrice = targetSKU.costPrice;
              itemSellPrice = targetSKU.sellPrice;
            }
          }


          newBillItems.push({
            id: generateId(),
            productName: product?.name || (itemData.productId.startsWith('SERVICE_ITEM_') ? itemData.productName : 'Unknown Product'),
            productId: itemData.productId,
            quantity: itemData.quantity,
            costPrice: itemCostPrice,
            sellPrice: itemSellPrice,
            isDefective: itemData.isDefective,
            selectedVariantOptions: itemData.selectedVariantOptions,
          });
        });


        let totalAmount = 0;
        newBillItems.forEach(item => {
          totalAmount += item.quantity * (billData.type === 'buy' ? item.costPrice : item.sellPrice);
        });
        
        const staffMember = billData.billedByStaffId ? get().getStaffById(billData.billedByStaffId) : undefined;
        const storeLocation = billData.storeId ? get().getStoreById(billData.storeId) : undefined;

        const newBill: Bill = {
          id: format(currentDate, 'ddMMyyHHmmss'),
          ...billData,
          date: currentDate.toISOString(),
          timestamp: currentDate.getTime(),
          items: newBillItems,
          totalAmount,
          billedByStaffName: staffMember?.name,
          storeName: storeLocation?.name,
        };

        set((state) => ({ bills: [newBill, ...state.bills] }));
        return newBill;
      },
      
      getBillById: (billId) => {
        return get().bills.find((b) => b.id === billId);
      },
      
      getRecentBills: (limit: number) => {
        return [...get().bills] 
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
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
        const newStore: Store = { id: generateId(), ...storeData, allowedOperations: storeData.allowedOperations || ['sell', 'buy', 'return'] };
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
              const product = get().getProductById(item.productId);
              if (!product) return;

              // Use SKU identifier for unique product-variant combination if available
              const skuIdentifier = getSkuIdentifier(product.name, item.selectedVariantOptions || {});
              
              if (!productRevenue[skuIdentifier]) {
                productRevenue[skuIdentifier] = { name: skuIdentifier, revenue: 0 };
              }
              productRevenue[skuIdentifier].revenue += item.sellPrice * item.quantity;
            });
          }
        });
        return Object.values(productRevenue)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);
      },

      _hydrate: () => {
        try {
          const state = get();
          let updated = false;
          
          if (Array.isArray(state.products)) {
            const hydratedProducts = state.products.map(p => {
              if (!p || typeof p !== 'object' || !p.id || !p.name) {
                console.warn("Skipping invalid product during hydration:", p);
                return null; // Mark for filtering
              }
              const newP = { ...p } as any; // Use 'any' for transitional migration
              
              // Ensure variants is always an array
              newP.variants = Array.isArray(newP.variants) ? newP.variants : [];
              
              // Ensure productSKUs is an array
              newP.productSKUs = Array.isArray(newP.productSKUs) ? newP.productSKUs : [];

              // Migration from old structure (top-level price/stock) to ProductSKU for non-variant products
              if (newP.productSKUs.length === 0 && (!newP.variants || newP.variants.length === 0)) {
                if (newP.hasOwnProperty('costPrice') && newP.hasOwnProperty('sellPrice') && newP.hasOwnProperty('quantityInStock')) {
                  newP.productSKUs.push({
                    id: generateId(),
                    optionValues: {},
                    costPrice: newP.costPrice,
                    sellPrice: newP.sellPrice,
                    quantityInStock: newP.quantityInStock,
                    skuIdentifier: newP.name
                  });
                  updated = true;
                }
              }
              // Remove old top-level fields after migration or if they exist erroneously
              delete newP.costPrice;
              delete newP.sellPrice;
              delete newP.quantityInStock;

              return newP as Product;
            }).filter(p => p !== null) as Product[]; // Filter out any nulls

            if (JSON.stringify(hydratedProducts) !== JSON.stringify(state.products)) {
                set({ products: hydratedProducts });
                updated = true;
            }
            if (state.products.length === 0 && initialProducts.length > 0) {
              set({ products: initialProducts.map(p => ({...p, variants: p.variants || [], productSKUs: p.productSKUs || []})) });
              updated = true;
            }
          } else {
            set({ products: initialProducts.map(p => ({...p, variants: p.variants || [], productSKUs: p.productSKUs || []})) });
            updated = true;
          }


          if (Array.isArray(state.categories)) {
            if (state.categories.length === 0 && initialCategories.length > 0) {
              set({ categories: initialCategories.sort((a, b) => a.name.localeCompare(b.name)) });
              updated = true;
            } else {
              const sortedCategories = [...state.categories].sort((a,b) => a.name.localeCompare(b.name));
              if (JSON.stringify(sortedCategories) !== JSON.stringify(state.categories)) {
                set({ categories: sortedCategories });
                updated = true;
              }
            }
          } else {
            set({ categories: initialCategories.sort((a, b) => a.name.localeCompare(b.name)) });
            updated = true;
          }

          DEFAULT_CATEGORIES.forEach(catName => {
            if(!get().categories.find(c => c.name.toLowerCase() === catName.toLowerCase())) { 
              get().addCategory(catName);
              updated = true; 
            }
          });

          if (!state.userProfile || typeof state.userProfile !== 'object') {
            set({ userProfile: { companyName: DEFAULT_COMPANY_NAME, activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY }});
            updated = true;
          } else {
            let profileChanged = false;
            if (!state.userProfile.activeSubscriptionId) {
              state.userProfile.activeSubscriptionId = SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY;
              profileChanged = true;
            }
            if (!state.userProfile.companyName) {
              state.userProfile.companyName = DEFAULT_COMPANY_NAME;
              profileChanged = true;
            }
            if (profileChanged) {
              set({ userProfile: { ...state.userProfile } });
              updated = true;
            }
          }
          
          if (!Array.isArray(state.staffs)) set({ staffs: [] });
          if (!Array.isArray(state.stores)) set({ stores: [] });


          if (updated) console.log("Inventory store hydrated/updated with new structure and defaults.");
        } catch (error) {
          console.error("Error during inventory store hydration:", error);
          // Optionally, clear the problematic storage or reset to initial state
          // For now, we'll log and proceed with potentially default state if create() initializes it.
          // This might mean user loses data, but app won't crash.
          set({
            products: initialProducts,
            bills: [],
            categories: initialCategories,
            staffs: [],
            stores: [],
            userProfile: { companyName: DEFAULT_COMPANY_NAME, activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY }
          });
        }
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

// Ensure hydration runs on client-side mount
if (typeof window !== 'undefined') {
  useInventoryStore.getState()._hydrate();
}
