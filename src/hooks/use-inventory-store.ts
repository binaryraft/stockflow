
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, Bill, BillItem, Category, ProductVariant as ProductVariantType, ProductOption, Staff, Store, UserProfile, SubscriptionPlan, ProductSKU, BillMode, ChatMessage } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, startOfDay } from 'date-fns';
import { DEFAULT_CATEGORIES, SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS, DEFAULT_COMPANY_NAME, COMPANY_ADDRESS, COMPANY_CONTACT } from '@/lib/constants';

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
  messagesByStore: Record<string, ChatMessage[]>; // storeId -> messages array

  // Product Methods
  addProduct: (productData: Omit<Product, 'id' | 'imageUrl' | 'productSKUs'> & { initialStock?: number; costPrice?: number; sellPrice?: number; variants?: Array<{ name: string, options: Array<{ value: string}> }> }) => Product;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'imageUrl' | 'productSKUs'>> & { variants?: Array<{ name: string, options: Array<{ value: string}> }>, productSKUs?: ProductSKU[], initialStock?: number, costPrice?: number, sellPrice?: number }) => void;
  getProductById: (productId: string) => Product | undefined;
  getProductByName: (name: string) => Product | undefined;
  searchProducts: (searchTerm: string) => Product[];
  getLowStockProductCount: (threshold: number) => number;
  findOrCreateProductSKU: (productId: string, optionValues: Record<string, string>, costPrice: number, sellPrice: number, quantityChange: number, isPurchase: boolean, trackProductQuantity: boolean) => ProductSKU | undefined;

  // Bill Methods
  addBill: (
    billData: Omit<Bill, 'id' | 'date' | 'timestamp' | 'totalAmount' | 'items' | 'billedByStaffName' | 'storeName'> & {paymentStatus?: 'paid' | 'unpaid'},
    items: Omit<BillItem, 'id'|'productName'>[]
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
  getStaffDetailsByIds: (staffIds: string[]) => Staff[];

  // Store CRUD
  addStore: (storeData: Omit<Store, 'id' | 'allowedOperations'> & { allowedOperations?: BillMode[] }) => Store | null;
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

  // Dashboard Selectors
  getDailySalesAndExpenses: (days: number) => Array<{ date: string; sales: number; expenses: number }>;
  getTopSellingProductsByRevenue: (limit: number) => Array<{ name: string; revenue: number }>;
  getRecentExpenseBillsWithPotentialCoverage: (limit: number) => ExpenseBillWithCoverage[];
  getExpenseSummaryStats: () => ExpenseSummary;

  // Chat Methods
  addChatMessage: (storeId: string, senderId: 'admin' | string, senderName: string, text: string) => void;
  getMessagesForStore: (storeId: string) => ChatMessage[];

  _hydrate: () => void;
}

const getSkuIdentifier = (productName: string, optionValues: Record<string, string>): string => {
  if (Object.keys(optionValues).length === 0) return productName; // Default SKU for simple products
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
        if (!productData.variants || productData.variants.length === 0) { // Simple product, no variants
          initialSKUs.push({
            id: generateId(),
            optionValues: {},
            costPrice: productData.costPrice || 0,
            sellPrice: productData.sellPrice || 0,
            quantityInStock: productData.trackQuantity ? (productData.initialStock || 0) : 0,
            skuIdentifier: getSkuIdentifier(productData.name, {}),
          });
        }

        const newProduct: Product = {
          id: generateId(),
          name: productData.name,
          category: productData.category,
          trackQuantity: productData.trackQuantity,
          sku: productData.sku,
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
              if ((!updatedVariants || updatedVariants.length === 0) && !productData.productSKUs) {
                const defaultSku = p.productSKUs.find(sku => Object.keys(sku.optionValues).length === 0) ||
                                   { id: generateId(), optionValues: {}, skuIdentifier: getSkuIdentifier(p.name, {}), costPrice: 0, sellPrice: 0, quantityInStock: 0 };
                updatedProductSKUs = [{
                  ...defaultSku,
                  costPrice: productData.costPrice !== undefined ? productData.costPrice : defaultSku.costPrice,
                  sellPrice: productData.sellPrice !== undefined ? productData.sellPrice : defaultSku.sellPrice,
                  quantityInStock: productData.trackQuantity === false ? 0 : (productData.initialStock !== undefined ? productData.initialStock : defaultSku.quantityInStock),
                }];
              } else if (productData.productSKUs) {
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
        const stringifiedOptionValues = JSON.stringify(Object.fromEntries(Object.entries(optionValues).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))));
        let skuIndex = product.productSKUs.findIndex(sku => JSON.stringify(Object.fromEntries(Object.entries(sku.optionValues).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)))) === stringifiedOptionValues);
        let updatedSku: ProductSKU;

        if (skuIndex !== -1) {
          updatedSku = { ...product.productSKUs[skuIndex] };
          if (isPurchase) { // Expense bill
            updatedSku.costPrice = costPrice;
            updatedSku.sellPrice = sellPrice; // Update sell price when purchasing
            if (trackProductQuantity) updatedSku.quantityInStock += quantityChange;
          } else { // Sales or Return bill
            if (trackProductQuantity) updatedSku.quantityInStock += quantityChange; // Adjust stock for sale/return
          }
        } else {
          if (!isPurchase && trackProductQuantity) {
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

      getProductById: (productId) => get().products.find((p) => p.id === productId),
      getProductByName: (name) => get().products.find((p) => p.name.toLowerCase() === name.toLowerCase()),
      searchProducts: (searchTerm) => {
        if (!searchTerm) return [];
        const lowerSearchTerm = searchTerm.toLowerCase();
        return get().products.filter((p) =>
          p.name.toLowerCase().includes(lowerSearchTerm) ||
          (p.category && p.category.toLowerCase().includes(lowerSearchTerm)) ||
          (p.sku && p.sku.toLowerCase().includes(lowerSearchTerm)) ||
          (p.productSKUs.some(sku => sku.skuIdentifier?.toLowerCase().includes(lowerSearchTerm)))
        );
      },
      getLowStockProductCount: (threshold: number) => {
         return get().products.reduce((count, product) => {
          if (product.trackQuantity) {
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
            console.error(`Product not found for itemData.productId: ${itemData.productId}`);
            return;
          }

          let itemCostPrice = itemData.costPrice;
          let itemSellPrice = itemData.sellPrice;

          if (!itemData.productId.startsWith('SERVICE_ITEM_') && product) {
            const isPurchase = billData.type === 'buy';
            let qtyModifier = 0;
            if (product.trackQuantity) {
              if (billData.type === 'sell') qtyModifier = -itemData.quantity;
              else if (billData.type === 'buy') qtyModifier = itemData.quantity;
              else if (billData.type === 'return' && !itemData.isDefective) qtyModifier = itemData.quantity;
            }

            const targetSKU = get().findOrCreateProductSKU(
              itemData.productId,
              itemData.selectedVariantOptions || {},
              itemData.costPrice, 
              itemData.sellPrice, 
              qtyModifier,
              isPurchase,
              product.trackQuantity
            );

            if (!targetSKU) {
              console.error("Could not find or create SKU for bill item:", itemData.productId, itemData.selectedVariantOptions);
              return;
            }

            if (!isPurchase) { // For Sales/Return, BillItem prices reflect the SKU's prices
              itemCostPrice = targetSKU.costPrice;
              itemSellPrice = targetSKU.sellPrice;
            }
          }

          newBillItems.push({
            id: generateId(),
            productName: product?.name || (itemData.productId.startsWith('SERVICE_ITEM_') ? (itemData as any).productName : 'Unknown Product'),
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
          paymentStatus: billData.paymentStatus || (billData.type === 'return' ? 'paid' : 'paid'),
          billedByStaffId: staffMember?.id,
          billedByStaffName: staffMember?.name,
          storeId: storeLocation?.id,
          storeName: storeLocation?.name,
        };

        set((state) => ({ bills: [newBill, ...state.bills] }));
        return newBill;
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

      updateCompanyName: (name: string) => {
        set((state) => ({ userProfile: { ...state.userProfile, companyName: name || DEFAULT_COMPANY_NAME }}));
      },
      updateSubscription: (planId: string) => {
        set((state) => ({ userProfile: { ...state.userProfile, activeSubscriptionId: planId }}));
      },
      getActiveSubscriptionPlan: () => {
        const { activeSubscriptionId } = get().userProfile;
        return SUBSCRIPTION_PLANS.find(plan => plan.id === activeSubscriptionId) || undefined;
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
              const baseProductName = product.name;
              if (!productRevenue[baseProductName]) {
                productRevenue[baseProductName] = { name: baseProductName, revenue: 0 };
              }
              productRevenue[baseProductName].revenue += item.sellPrice * item.quantity;
            });
          }
        });
        return Object.values(productRevenue)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);
      },
      getRecentExpenseBillsWithPotentialCoverage: (limit: number) => {
        const expenseBills = get().bills.filter(bill => bill.type === 'buy')
          .sort((a, b) => b.timestamp - a.timestamp);
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
            totalOutstandingCostOnUncoveredExpenses += (totalCost - potentialRevenue);
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

      _hydrate: () => {
        try {
          const state = get();
          let storeUpdated = false;

          if (Array.isArray(state.products)) {
            const hydratedProducts = state.products.map(p => {
              if (!p || typeof p !== 'object' || !p.id || !p.name) return null;
              const newP: Partial<Product> & { costPrice_old?: number, sellPrice_old?: number, quantityInStock_old?: number } = { ...p };
              newP.variants = Array.isArray(newP.variants) ? newP.variants : [];
              newP.productSKUs = Array.isArray(newP.productSKUs) ? newP.productSKUs : [];

              if (newP.productSKUs.length === 0 && (!newP.variants || newP.variants.length === 0)) {
                if (newP.hasOwnProperty('costPrice_old') || newP.hasOwnProperty('sellPrice_old') || newP.hasOwnProperty('quantityInStock_old') ||
                    newP.hasOwnProperty('costPrice') || newP.hasOwnProperty('sellPrice') || newP.hasOwnProperty('quantityInStock')) {
                  newP.productSKUs.push({
                    id: generateId(),
                    optionValues: {},
                    costPrice: (newP as any).costPrice ?? (newP as any).costPrice_old ?? 0,
                    sellPrice: (newP as any).sellPrice ?? (newP as any).sellPrice_old ?? 0,
                    quantityInStock: (newP as any).quantityInStock ?? (newP as any).quantityInStock_old ?? 0,
                    skuIdentifier: getSkuIdentifier(newP.name!, {})
                  });
                  storeUpdated = true;
                }
              }
              ['costPrice', 'sellPrice', 'quantityInStock', 'costPrice_old', 'sellPrice_old', 'quantityInStock_old'].forEach(key => {
                if (newP.hasOwnProperty(key)) delete (newP as any)[key];
              });
              return newP as Product;
            }).filter(p => p !== null) as Product[];
            if (storeUpdated || (state.products.length === 0 && initialProducts.length > 0)) {
               set({ products: storeUpdated ? hydratedProducts : initialProducts.map(p => ({...p, variants: p.variants || [], productSKUs: p.productSKUs || []})) });
            }
          } else {
            set({ products: initialProducts.map(p => ({...p, variants: p.variants || [], productSKUs: p.productSKUs || []})) });
            storeUpdated = true;
          }

          if (Array.isArray(state.categories)) {
            if (state.categories.length === 0 && initialCategories.length > 0) {
              set({ categories: initialCategories.sort((a, b) => a.name.localeCompare(b.name)) });
              storeUpdated = true;
            }
          } else {
            set({ categories: initialCategories.sort((a, b) => a.name.localeCompare(b.name)) });
            storeUpdated = true;
          }
          DEFAULT_CATEGORIES.forEach(catName => {
            if(!get().categories.find(c => c.name.toLowerCase() === catName.toLowerCase())) {
              get().addCategory(catName); storeUpdated = true;
            }
          });

          if (!state.userProfile || typeof state.userProfile !== 'object') {
            set({ userProfile: { companyName: DEFAULT_COMPANY_NAME, activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY }});
            storeUpdated = true;
          } else {
            let profileChanged = false;
            const currentSubId = state.userProfile.activeSubscriptionId;
            const isValidSubId = SUBSCRIPTION_PLANS.some(p => p.id === currentSubId);
            if (!currentSubId || !isValidSubId) {
              state.userProfile.activeSubscriptionId = SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY;
              profileChanged = true;
            }
            if (!state.userProfile.companyName || state.userProfile.companyName.trim() === '') {
              state.userProfile.companyName = DEFAULT_COMPANY_NAME;
              profileChanged = true;
            }
            if (profileChanged) {
              set({ userProfile: { ...state.userProfile } });
              storeUpdated = true;
            }
          }

          if (!Array.isArray(state.staffs)) { set({ staffs: [] }); storeUpdated = true; }
          if (!Array.isArray(state.stores)) { set({ stores: [] }); storeUpdated = true; }
          if (typeof state.messagesByStore !== 'object' || state.messagesByStore === null) {
            set({ messagesByStore: {} }); storeUpdated = true;
          }

          // Ensure existing bills have staff/store names if IDs are present
          if (Array.isArray(state.bills)) {
            const updatedBills = state.bills.map(bill => {
              let billChanged = false;
              if (bill.billedByStaffId && !bill.billedByStaffName) {
                const staff = get().getStaffById(bill.billedByStaffId);
                if (staff) { bill.billedByStaffName = staff.name; billChanged = true;}
              }
              if (bill.storeId && !bill.storeName) {
                const store = get().getStoreById(bill.storeId);
                if (store) { bill.storeName = store.name; billChanged = true; }
              }
              return billChanged ? { ...bill } : bill;
            });
            if (storeUpdated || updatedBills.some((b, i) => b !== state.bills[i])) {
               set({ bills: updatedBills });
            }
          }


        } catch (error) {
          console.error("Critical error during inventory store hydration:", error);
          set({
            products: initialProducts.map(p => ({...p, variants: p.variants || [], productSKUs: p.productSKUs || []})),
            bills: [],
            categories: initialCategories.sort((a, b) => a.name.localeCompare(b.name)),
            staffs: [],
            stores: [],
            userProfile: { companyName: DEFAULT_COMPANY_NAME, activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY },
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
