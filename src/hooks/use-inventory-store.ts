
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, Bill, BillItem, Category, ProductVariant as ProductVariantType, ProductOption, Staff, Store, UserProfile, SubscriptionPlan, ProductSKU, BillMode, ChatMessage } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, startOfDay } from 'date-fns';
import { DEFAULT_CATEGORIES, SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS, DEFAULT_COMPANY_NAME } from '@/lib/constants';

const generateId = () => uuidv4();

interface ExpenseBillWithCoverage extends Bill {
  totalCost: number;
  potentialRevenue: number;
  coverageStatus: 'Covered' | 'Uncovered';
}

interface ExpenseSummary {
  totalCoveredExpenseValue: number;
  totalUncoveredExpenseValue: number;
  totalPotentialProfitOnCoveredExpenses: number;
  totalOutstandingCostOnUncoveredExpenses: number;
  coveredBillCount: number;
  uncoveredBillCount: number;
}

interface InventoryState {
  products: Product[];
  bills: Bill[];
  categories: Category[];
  staffs: Staff[];
  stores: Store[];
  userProfile: UserProfile;
  messagesByStore: Record<string, ChatMessage[]>;

  addProduct: (productData: Omit<Product, 'id' | 'imageUrl' | 'productSKUs'> & { initialStock?: number; costPrice?: number; sellPrice?: number; variants?: Array<{ name: string, options: Array<{ value: string}> }> }) => Product;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'imageUrl' | 'productSKUs'>> & { variants?: Array<{ name: string, options: Array<{ value: string}> }>, productSKUs?: ProductSKU[], initialStock?: number, costPrice?: number, sellPrice?: number }) => void;
  deleteProduct: (productId: string) => void;
  getProductById: (productId: string) => Product | undefined;
  getProductByName: (name: string) => Product | undefined;
  searchProducts: (searchTerm: string) => Product[];
  getLowStockProductCount: (threshold: number) => number;
  findOrCreateProductSKU: (productId: string, optionValues: Record<string, string>, costPrice: number, sellPrice: number, quantityChange: number, isPurchase: boolean) => ProductSKU | undefined;

  addBill: (
    billData: Omit<Bill, 'id' | 'date' | 'timestamp' | 'totalAmount' | 'items' | 'billedByStaffName' | 'storeName'> & { billedByStaffId?: string; storeId?: string; },
    items: Omit<BillItem, 'id'|'productName'>[]
  ) => Bill;
  deleteBill: (billId: string) => void;
  getBillById: (billId: string) => Bill | undefined;
  getRecentBills: (limit: number) => Bill[];

  addCategory: (categoryName: string) => Category;
  searchCategories: (searchTerm: string) => string[];

  addStaff: (staffData: Omit<Staff, 'id'>) => Staff | null;
  updateStaff: (staffId: string, staffData: Partial<Omit<Staff, 'id'>>) => void;
  deleteStaff: (staffId: string) => void;
  getStaffById: (staffId: string) => Staff | undefined;
  getAllStaff: () => Staff[];
  getStaffDetailsByIds: (staffIds: string[]) => Staff[];

  addStore: (storeData: Omit<Store, 'id'>) => Store | null;
  updateStore: (storeId: string, storeData: Partial<Omit<Store, 'id'>>) => void;
  deleteStore: (storeId: string) => void;
  getStoreById: (storeId: string) => Store | undefined;
  getAllStores: () => Store[];

  updateCompanyName: (name: string) => void;
  updateSubscription: (planId: string) => void;
  getActiveSubscriptionPlan: () => SubscriptionPlan | undefined;
  canAddStore: () => boolean;
  canAddStaff: () => boolean;

  getDailySalesAndExpenses: (days: number) => Array<{ date: string; sales: number; expenses: number }>;
  getTopSellingProductsByRevenue: (limit: number) => Array<{ name: string; revenue: number }>;
  getRecentExpenseBillsWithPotentialCoverage: (limit: number) => ExpenseBillWithCoverage[];
  getExpenseSummaryStats: () => ExpenseSummary;

  addChatMessage: (storeId: string, senderId: 'admin' | string, senderName: string, text: string) => void;
  getMessagesForStore: (storeId: string) => ChatMessage[];
  clearChatForStore: (storeId: string) => void;

  _hydrate: () => void;
}

const getSkuIdentifier = (productName: string, optionValues: Record<string, string>): string => {
  if (Object.keys(optionValues).length === 0) return productName; // Default SKU for non-variant products
  const sortedOptions = Object.entries(optionValues)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([, value]) => value)
    .join('-');
  return `${productName}-${sortedOptions}`;
};

const initialProducts: Product[] = [
  { id: generateId(), name: 'Organic Apples', category: 'Fruits', trackQuantity: true, description: "Fresh, crispy organic apples, sourced locally.", imageUrl: `https://placehold.co/100x100.png?text=Apples&font=roboto`, productSKUs: [{ id: generateId(), optionValues: {}, costPrice: 20, sellPrice: 40, quantityInStock: 50, skuIdentifier: 'Organic Apples' }] },
  { id: generateId(), name: 'Whole Wheat Bread', category: 'Bakery', trackQuantity: true, description: "Healthy whole wheat bread, freshly baked daily, no preservatives.", imageUrl: `https://placehold.co/100x100.png?text=Bread&font=roboto`, productSKUs: [{ id: generateId(), optionValues: {}, costPrice: 30, sellPrice: 50, quantityInStock: 30, skuIdentifier: 'Whole Wheat Bread' }] },
  { id: generateId(), name: 'Laptop Pro 15-inch', category: 'Electronics', trackQuantity: true, description: "High-performance laptop with 16GB RAM and 512GB SSD for professionals.", imageUrl: `https://placehold.co/100x100.png?text=Laptop&font=roboto`, productSKUs: [{ id: generateId(), optionValues: {}, costPrice: 80000, sellPrice: 120000, quantityInStock: 10, skuIdentifier: 'Laptop Pro 15-inch' }] },
  { id: generateId(), name: 'Chicken Breast 1kg', category: 'Meat', trackQuantity: true, description: "Fresh boneless, skinless chicken breast.", imageUrl: `https://placehold.co/100x100.png?text=Chicken&font=roboto`, productSKUs: [{ id: generateId(), optionValues: {}, costPrice: 300, sellPrice: 450, quantityInStock: 20, skuIdentifier: 'Chicken Breast 1kg' }]},
  {
    id: generateId(),
    name: 'T-Shirt',
    category: 'Apparel',
    trackQuantity: true,
    description: "Comfortable cotton t-shirt.",
    imageUrl: `https://placehold.co/100x100.png?text=T-Shirt&font=roboto`,
    variants: [
      { id: generateId(), name: 'Color', options: [{id: generateId(), value: 'Red'}, {id: generateId(), value: 'Blue'}] },
      { id: generateId(), name: 'Size', options: [{id: generateId(), value: 'M'}, {id: generateId(), value: 'L'}] },
    ],
    productSKUs: [
        { id: generateId(), optionValues: { Color: 'Red', Size: 'M' }, costPrice: 150, sellPrice: 300, quantityInStock: 10, skuIdentifier: 'T-Shirt-Red-M' },
        { id: generateId(), optionValues: { Color: 'Blue', Size: 'L' }, costPrice: 160, sellPrice: 320, quantityInStock: 5, skuIdentifier: 'T-Shirt-Blue-L' },
    ]
  },
  { id: generateId(), name: 'Service Charge', category: 'Services', trackQuantity: false, description: "Standard service charge for repairs.", productSKUs: [{id: generateId(), optionValues: {}, costPrice: 0, sellPrice: 100, quantityInStock: 0, skuIdentifier: 'Service Charge' }] },
];

const initialCategories: Category[] = DEFAULT_CATEGORIES.map(name => ({ id: generateId(), name }));

const defaultUserProfile: UserProfile = {
  companyName: DEFAULT_COMPANY_NAME,
  activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.BASIC_ADMIN,
};


export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      products: initialProducts,
      bills: [],
      categories: initialCategories,
      staffs: [],
      stores: [],
      userProfile: defaultUserProfile,
      messagesByStore: {},

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
        if (!productData.variants || productData.variants.length === 0) { // No variants defined
          initialSKUs.push({
            id: generateId(),
            optionValues: {}, // Empty for default SKU
            costPrice: productData.costPrice || 0,
            sellPrice: productData.sellPrice || 0,
            quantityInStock: productData.trackQuantity ? (productData.initialStock || 0) : 0,
            skuIdentifier: getSkuIdentifier(productData.name, {}),
          });
        }
        // If variants ARE defined, productSKUs will be empty initially. They get created upon first purchase.

        const newProduct: Product = {
          id: generateId(),
          name: productData.name,
          category: productData.category,
          trackQuantity: productData.trackQuantity,
          sku: productData.sku, // Base SKU if provided
          expiryDate: productData.expiryDate,
          imageUrl: `https://placehold.co/100x100.png?text=${encodeURIComponent(productData.name.substring(0,10))}&font=roboto`,
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
              const updatedProduct: Product = { ...p, ...productData };

              // Update variants if provided
              if (productData.variants) {
                updatedProduct.variants = productData.variants.map((variantData, variantIdx) => {
                  const existingVariant = p.variants?.find(v => v.name === variantData.name || v.id === (variantData as any).id); // Check by name or existing ID
                  return {
                    id: existingVariant?.id || `variant-${generateId()}-${variantIdx}`,
                    name: variantData.name,
                    options: variantData.options.map((optData, optIdx) => {
                      const existingOption = existingVariant?.options.find(o => o.value === optData.value || o.id === (optData as any).id);
                      return {
                        id: existingOption?.id || `option-${generateId()}-${variantIdx}-${optIdx}`,
                        value: optData.value,
                      };
                    }),
                  };
                });
              }

              // If it's a non-variant product and price/stock is updated
              if ((!updatedProduct.variants || updatedProduct.variants.length === 0) && 
                  (productData.costPrice !== undefined || productData.sellPrice !== undefined || productData.initialStock !== undefined)) {
                
                let defaultSku = updatedProduct.productSKUs.find(sku => Object.keys(sku.optionValues).length === 0);
                if (defaultSku) {
                  defaultSku.costPrice = productData.costPrice !== undefined ? productData.costPrice : defaultSku.costPrice;
                  defaultSku.sellPrice = productData.sellPrice !== undefined ? productData.sellPrice : defaultSku.sellPrice;
                  if (updatedProduct.trackQuantity) {
                    defaultSku.quantityInStock = productData.initialStock !== undefined ? productData.initialStock : defaultSku.quantityInStock;
                  } else {
                    defaultSku.quantityInStock = 0;
                  }
                } else { // Create default SKU if it doesn't exist (e.g., product was variant, now isn't)
                  const newDefaultSku: ProductSKU = {
                    id: generateId(),
                    optionValues: {},
                    costPrice: productData.costPrice || 0,
                    sellPrice: productData.sellPrice || 0,
                    quantityInStock: updatedProduct.trackQuantity ? (productData.initialStock || 0) : 0,
                    skuIdentifier: getSkuIdentifier(updatedProduct.name, {}),
                  };
                  updatedProduct.productSKUs = [newDefaultSku];
                }
              }
              // If the product becomes a variant product (variants added, but was non-variant)
              // and had a default SKU, we might want to remove that default SKU
              // or convert it if its optionValues become relevant. For now, we'll keep it simple:
              // if variants are added, the old default SKU remains unless explicitly managed or deleted.
              // A more robust system might clear productSKUs if variants structure changes significantly.
              
              // If productSKUs are directly provided (e.g., advanced edit), use them
              if (productData.productSKUs) {
                updatedProduct.productSKUs = productData.productSKUs;
              }


              return updatedProduct;
            }
            return p;
          }),
        }));
        if (productData.category && !get().categories.find(c => c.name.toLowerCase() === productData.category!.toLowerCase())) {
          get().addCategory(productData.category!);
        }
      },

      deleteProduct: (productId: string) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
          // Optional: Also remove bill items associated with this product
          bills: state.bills.map(bill => ({
            ...bill,
            items: bill.items.filter(item => item.productId !== productId)
          })).filter(bill => bill.items.length > 0) // Remove bills if they become empty
        }));
      },

      findOrCreateProductSKU: (productId, optionValues, costPrice, sellPrice, quantityChange, isPurchase) => {
        const products = get().products;
        const productIndex = products.findIndex(p => p.id === productId);
        if (productIndex === -1) return undefined;

        const product = products[productIndex];
        const actualTrackQuantity = product.trackQuantity;

        const stringifiedOptionValues = JSON.stringify(Object.fromEntries(Object.entries(optionValues).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))));
        let skuIndex = product.productSKUs.findIndex(sku => JSON.stringify(Object.fromEntries(Object.entries(sku.optionValues).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)))) === stringifiedOptionValues);
        
        let updatedSku: ProductSKU;

        if (skuIndex !== -1) { // SKU Exists
          updatedSku = { ...product.productSKUs[skuIndex] };
          if (isPurchase) {
            updatedSku.costPrice = costPrice; // Update cost price on purchase
            updatedSku.sellPrice = sellPrice; // Update sell price on purchase
            if (actualTrackQuantity) updatedSku.quantityInStock += quantityChange;
          } else { // Sell or Return
            if (actualTrackQuantity) updatedSku.quantityInStock += quantityChange;
          }
        } else { // SKU does not exist, create it (should primarily happen during purchase)
          if (!isPurchase && (!product.variants || product.variants.length > 0)) { 
            // This case should ideally not happen for sales/returns if SKUs are created on purchase.
            // If it does, it implies a data inconsistency or selling a variant that was never purchased.
            // For robustness, we might log an error or create it with fetched default prices if available.
            // For now, we'll allow creation but it might use the passed cost/sell which could be 0 if not from form.
          }
          updatedSku = {
            id: generateId(),
            optionValues,
            costPrice: costPrice, 
            sellPrice: sellPrice, 
            quantityInStock: actualTrackQuantity ? quantityChange : 0,
            skuIdentifier: getSkuIdentifier(product.name, optionValues),
          };
        }

        if (actualTrackQuantity) updatedSku.quantityInStock = Math.max(0, updatedSku.quantityInStock);


        const updatedProductSKUs = [...product.productSKUs];
        if (skuIndex !== -1) {
          updatedProductSKUs[skuIndex] = updatedSku;
        } else {
          updatedProductSKUs.push(updatedSku);
        }
        
        // Update the product in the store
        const updatedProducts = [...products];
        updatedProducts[productIndex] = { ...product, productSKUs: updatedProductSKUs };
        set({ products: updatedProducts });

        return updatedSku;
      },

      getProductById: (productId) => get().products.find((p) => p.id === productId),
      getProductByName: (name) => get().products.find((p) => p.name.toLowerCase() === name.toLowerCase()),
      searchProducts: (searchTerm: string) => {
        if (!searchTerm) return [];
        const lowerSearchTerm = searchTerm.toLowerCase();
        return get().products.filter((p) =>
          p.name.toLowerCase().includes(lowerSearchTerm) ||
          (p.category && p.category.toLowerCase().includes(lowerSearchTerm)) ||
          (p.sku && p.sku.toLowerCase().includes(lowerSearchTerm)) || // Base SKU
          (p.productSKUs.some(sku => sku.skuIdentifier?.toLowerCase().includes(lowerSearchTerm)))
        );
      },
      getLowStockProductCount: (threshold: number) => {
         return get().products.reduce((count, product) => {
          if (product.trackQuantity) {
            // Check if any SKU of this product is below threshold
            if (product.productSKUs.some(sku => sku.quantityInStock < threshold)) {
                return count + 1;
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
          
          if (!product && !itemData.productId.startsWith('SERVICE_ITEM_')) {
            // This should ideally not happen if products are selected/created correctly
            console.error(`Product not found for itemData.productId: ${itemData.productId} during bill creation.`);
            return; // Skip this item
          }

          let itemCostPrice = itemData.costPrice;
          let itemSellPrice = itemData.sellPrice;
          let quantityModifier = 0;

          if (product) { // Handle actual products
            if (product.trackQuantity) {
                if (billData.type === 'sell') quantityModifier = -itemData.quantity;
                else if (billData.type === 'buy') quantityModifier = itemData.quantity;
                else if (billData.type === 'return' && !itemData.isDefective) quantityModifier = itemData.quantity;
            }

            const targetSKU = get().findOrCreateProductSKU(
              itemData.productId,
              itemData.selectedVariantOptions || {}, // Pass selected options
              itemData.costPrice, // Cost price from form (relevant for 'buy')
              itemData.sellPrice, // Sell price from form (relevant for 'buy')
              quantityModifier,   // Quantity change for stock
              billData.type === 'buy' // isPurchase flag
            );

            if (!targetSKU) {
              console.error("Could not find or create SKU for bill item:", itemData.productId, itemData.selectedVariantOptions);
              return; // Skip this item if SKU cannot be resolved
            }

            // For sell/return, the item's price is taken from the SKU
            if (billData.type === 'sell' || billData.type === 'return') {
              itemCostPrice = targetSKU.costPrice;
              itemSellPrice = targetSKU.sellPrice;
            }
            // For 'buy', itemCostPrice and itemSellPrice from itemData (form input) are used,
            // and findOrCreateProductSKU would have updated the SKU's prices.
          } else if (itemData.productId.startsWith('SERVICE_ITEM_')) {
            // Service items don't affect inventory, prices are directly from itemData
            itemCostPrice = itemData.costPrice;
            itemSellPrice = itemData.sellPrice;
          }


          newBillItems.push({
            id: generateId(),
            productName: product?.name || (itemData.productId.startsWith('SERVICE_ITEM_') ? itemData.productName : 'Unknown Product'), // Use explicit productName for service
            productId: itemData.productId,
            quantity: itemData.quantity,
            costPrice: itemCostPrice,
            sellPrice: itemSellPrice,
            isDefective: itemData.isDefective,
            selectedVariantOptions: itemData.selectedVariantOptions,
          });
        });

        if (newBillItems.length === 0 && billItemsData.length > 0) {
          // This implies all items failed to process, which is an issue.
          console.error("No items were successfully added to the bill.");
          // Depending on desired behavior, you might throw an error or return null.
          // For now, let's proceed but the bill will be empty, which is not ideal.
        }
        
        let totalAmount = 0;
        newBillItems.forEach(item => {
          totalAmount += item.quantity * (billData.type === 'buy' ? item.costPrice : item.sellPrice);
        });

        const staffMember = billData.billedByStaffId ? get().getStaffById(billData.billedByStaffId) : undefined;
        const storeLocation = billData.storeId ? get().getStoreById(billData.storeId) : undefined;

        const newBill: Bill = {
          id: format(currentDate, 'ddMMyyHHmmss'),
          type: billData.type,
          date: currentDate.toISOString(),
          timestamp: currentDate.getTime(),
          vendorOrCustomerName: billData.vendorOrCustomerName,
          customerPhone: billData.customerPhone,
          items: newBillItems,
          totalAmount,
          notes: billData.notes,
          paymentStatus: billData.paymentStatus,
          billedByStaffId: staffMember?.id,
          billedByStaffName: staffMember?.name,
          storeId: storeLocation?.id,
          storeName: storeLocation?.name,
        };

        set((state) => ({ bills: [newBill, ...state.bills] }));
        return newBill;
      },
      deleteBill: (billId: string) => {
        // Note: This does not revert stock changes. A full "undo" is complex.
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== billId),
        }));
      },
      getBillById: (billId) => get().bills.find((b) => b.id === billId),
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

      addStaff: (staffData) => {
        const plan = get().getActiveSubscriptionPlan();
        if (!plan || get().staffs.length >= plan.maxEmployees) return null;
        const newStaff: Staff = { id: generateId(), ...staffData };
        set((state) => ({ staffs: [...state.staffs, newStaff] }));
        return newStaff;
      },
      updateStaff: (staffId, staffData) => {
        set((state) => ({
          staffs: state.staffs.map((s) => (s.id === staffId ? { ...s, ...staffData } : s)),
        }));
      },
      deleteStaff: (staffId: string) => {
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
      getStaffDetailsByIds: (staffIds: string[]) => {
        const allStaff = get().staffs;
        return staffIds.map(id => allStaff.find(s => s.id === id)).filter(s => s !== undefined) as Staff[];
      },

      addStore: (storeData) => {
        const plan = get().getActiveSubscriptionPlan();
        if (!plan || get().stores.length >= plan.maxStores) return null;
        const newStore: Store = {
          id: generateId(),
          ...storeData,
          allowedOperations: storeData.allowedOperations || ['sell', 'buy', 'return']
        };
        set((state) => ({ stores: [...state.stores, newStore] }));
        return newStore;
      },
      updateStore: (storeId, storeData) => {
        set((state) => ({
          stores: state.stores.map((s) => (s.id === storeId ? { ...s, ...storeData } : s)),
        }));
      },
      deleteStore: (storeId: string) => {
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

      updateCompanyName: (name: string) => {
        set((state) => ({ userProfile: { ...state.userProfile, companyName: name || DEFAULT_COMPANY_NAME }}));
      },
      updateSubscription: (planId: string) => {
        set((state) => ({ userProfile: { ...state.userProfile, activeSubscriptionId: planId }}));
      },
      getActiveSubscriptionPlan: () => {
        const { activeSubscriptionId } = get().userProfile;
        return SUBSCRIPTION_PLANS.find(plan => plan.id === activeSubscriptionId) || SUBSCRIPTION_PLANS.find(p => p.id === SUBSCRIPTION_PLAN_IDS.BASIC_ADMIN);
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
              if (item.productId.startsWith('SERVICE_ITEM_')) return; // Exclude service items
              
              // Product name for aggregation, handle potential undefined product if data is inconsistent
              const productNameForItem = item.productName || get().getProductById(item.productId)?.name || 'Unknown Product';

              if (!productRevenue[productNameForItem]) {
                productRevenue[productNameForItem] = { name: productNameForItem, revenue: 0 };
              }
              productRevenue[productNameForItem].revenue += item.sellPrice * item.quantity;
            });
          }
        });
        return Object.values(productRevenue)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);
      },
      getRecentExpenseBillsWithPotentialCoverage: (limit: number) => {
        const expenseBills = get().bills.filter(bill => bill.type === 'buy')
          .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp for most recent
        return expenseBills.slice(0, limit).map(bill => {
          const totalCost = bill.totalAmount;
          const potentialRevenue = bill.items.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
          const coverageStatus = potentialRevenue >= totalCost ? 'Covered' : 'Uncovered';
          return { ...bill, totalCost, potentialRevenue, coverageStatus };
        });
      },
      getExpenseSummaryStats: (): ExpenseSummary => {
        const expenseBills = get().bills.filter(bill => bill.type === 'buy');
        let totalCoveredExpenseValue = 0;
        let totalUncoveredExpenseValue = 0;
        let totalPotentialProfitOnCoveredExpenses = 0;
        let totalOutstandingCostOnUncoveredExpenses = 0;
        let coveredBillCount = 0;
        let uncoveredBillCount = 0;
        
        expenseBills.forEach(bill => {
          const totalCost = bill.totalAmount;
          const potentialRevenue = bill.items.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
          if (potentialRevenue >= totalCost) {
            totalCoveredExpenseValue += totalCost;
            totalPotentialProfitOnCoveredExpenses += (potentialRevenue - totalCost);
            coveredBillCount++;
          } else {
            totalUncoveredExpenseValue += totalCost;
            totalOutstandingCostOnUncoveredExpenses += (totalCost - potentialRevenue); // This is the amount 'short'
            uncoveredBillCount++;
          }
        });
        return {
          totalCoveredExpenseValue,
          totalUncoveredExpenseValue,
          totalPotentialProfitOnCoveredExpenses,
          totalOutstandingCostOnUncoveredExpenses,
          coveredBillCount,
          uncoveredBillCount,
        };
      },

      addChatMessage: (storeId, senderId, senderName, text) => {
        const newMessage: ChatMessage = {
          id: generateId(),
          storeId,
          senderId,
          senderName,
          text,
          timestamp: Date.now(),
        };
        set((state) => {
          const existingMessages = state.messagesByStore[storeId] || [];
          return {
            messagesByStore: {
              ...state.messagesByStore,
              [storeId]: [...existingMessages, newMessage],
            },
          };
        });
      },
      getMessagesForStore: (storeId) => {
        const messages = get().messagesByStore[storeId] || [];
        return [...messages].sort((a, b) => a.timestamp - b.timestamp);
      },
      clearChatForStore: (storeId: string) => {
        set((state) => {
          const newMessagesByStore = { ...state.messagesByStore };
          delete newMessagesByStore[storeId]; // Or set to [] if preferred
          return { messagesByStore: newMessagesByStore };
        });
      },

      _hydrate: () => {
        try {
          const state = get();
          let storeUpdated = false;
          
          const initialSafeState = {
            products: initialProducts.map(p => ({...p, variants: p.variants || [], productSKUs: p.productSKUs || []})),
            bills: [],
            categories: initialCategories.sort((a, b) => a.name.localeCompare(b.name)),
            staffs: [],
            stores: [],
            userProfile: {...defaultUserProfile},
            messagesByStore: {}
          };

          // Ensure top-level properties exist and are of the correct type
          if (!state.products || !Array.isArray(state.products)) { state.products = initialSafeState.products; storeUpdated = true; }
          if (!state.bills || !Array.isArray(state.bills)) { state.bills = initialSafeState.bills; storeUpdated = true; }
          if (!state.categories || !Array.isArray(state.categories)) { state.categories = initialSafeState.categories; storeUpdated = true; }
          if (!state.staffs || !Array.isArray(state.staffs)) { state.staffs = initialSafeState.staffs; storeUpdated = true; }
          if (!state.stores || !Array.isArray(state.stores)) { state.stores = initialSafeState.stores; storeUpdated = true; }
          if (!state.messagesByStore || typeof state.messagesByStore !== 'object' || Array.isArray(state.messagesByStore)) { state.messagesByStore = initialSafeState.messagesByStore; storeUpdated = true; }


          // Hydrate products carefully
          state.products = state.products.map(p => {
            if (!p || typeof p !== 'object' || !p.id || !p.name) return null; // Skip invalid product objects

            const migratedProduct: Partial<Product> = { ...p };
            migratedProduct.variants = Array.isArray(migratedProduct.variants) ? migratedProduct.variants : [];
            migratedProduct.productSKUs = Array.isArray(migratedProduct.productSKUs) ? migratedProduct.productSKUs : [];

            // Migrate old structure (top-level price/stock) to default SKU if productSKUs is empty AND it's not a variant product
            if (migratedProduct.productSKUs.length === 0 && (!migratedProduct.variants || migratedProduct.variants.length === 0)) {
              if (p.hasOwnProperty('costPrice') || p.hasOwnProperty('sellPrice') || p.hasOwnProperty('quantityInStock')) {
                migratedProduct.productSKUs = [{
                    id: generateId(),
                    optionValues: {},
                    costPrice: (p as any).costPrice ?? 0,
                    sellPrice: (p as any).sellPrice ?? 0,
                    quantityInStock: (p as any).quantityInStock ?? 0,
                    skuIdentifier: getSkuIdentifier(p.name, {})
                }];
                storeUpdated = true;
              }
            }
            // Clean up old top-level fields if they exist
            ['costPrice', 'sellPrice', 'quantityInStock'].forEach(key => {
                if (migratedProduct.hasOwnProperty(key)) delete (migratedProduct as any)[key];
            });
            return migratedProduct as Product;
          }).filter(p => p !== null) as Product[];


          // Hydrate userProfile carefully
          if (!state.userProfile || typeof state.userProfile !== 'object') {
            state.userProfile = {...defaultUserProfile};
            storeUpdated = true;
          } else {
            if (!state.userProfile.companyName || typeof state.userProfile.companyName !== 'string' || state.userProfile.companyName.trim() === '') {
              state.userProfile.companyName = DEFAULT_COMPANY_NAME;
              storeUpdated = true;
            }
            const currentSubId = state.userProfile.activeSubscriptionId;
            const isValidSubId = SUBSCRIPTION_PLANS.some(plan => plan.id === currentSubId);
            if (!currentSubId || !isValidSubId) {
              state.userProfile.activeSubscriptionId = SUBSCRIPTION_PLAN_IDS.BASIC_ADMIN; // Default to a valid plan
              storeUpdated = true;
            }
          }
          
          // Ensure default categories exist
          DEFAULT_CATEGORIES.forEach(catName => {
            if(!get().categories.find(c => c.name.toLowerCase() === catName.toLowerCase())) {
              get().addCategory(catName); storeUpdated = true;
            }
          });

          if (storeUpdated) {
            set({ ...state });
          }

        } catch (error) {
          console.error("Critical error during inventory store hydration, resetting to defaults:", error);
          // Reset to a known good state if hydration fails spectacularly
          set({
            products: initialProducts.map(p => ({...p, variants: p.variants || [], productSKUs: p.productSKUs || []})),
            bills: [],
            categories: initialCategories.sort((a, b) => a.name.localeCompare(b.name)),
            staffs: [],
            stores: [],
            userProfile: {...defaultUserProfile},
            messagesByStore: {}
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

    