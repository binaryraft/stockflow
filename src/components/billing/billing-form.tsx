
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductSearchInput, type ProductSearchSuggestion } from './product-search-input';
import { BillItemRow, BillItemHeader } from './bill-item-row';
import type { Product, BillItem, BillMode, ProductSKU, Store, Staff, Bill, ProductVariant as ProductVariantType, AdditionalChargeDefinition, PendingBillPayload, PaymentMode } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, Eraser, ShoppingBag, Send, RotateCcw, Edit3, CornerDownLeft, Info, CircleDollarSign, Settings2, Building, LogInIcon, Percent, Printer, Barcode as BarcodeIconLucide, Loader2, MapPin, ReceiptText } from 'lucide-react';
import { BillingProductSelector } from './billing-product-selector';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BillSaveAnimation } from './bill-save-animation';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { EmployeePasskeyDialog } from './employee-passkey-dialog';
import { NewProductDialog } from './new-product-dialog';
import { SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { generateBillPrintContent, triggerPrint } from '@/lib/print-utils';
import { HardwareBarcodeScanModal } from '@/components/common/HardwareBarcodeScanModal';
import { DatePicker } from '@/components/ui/date-picker';



interface BillingFormProps {
  storeId?: string;
  allowedModes?: BillMode[];
  initialModeProp?: BillMode | null;
  isAdminContext?: boolean;
  preselectedStoreId?: string | null;
  companyId?: string | null;
}

export function BillingForm({
  storeId: storeIdFromProp,
  allowedModes,
  initialModeProp,
  isAdminContext = false,
  preselectedStoreId,
  companyId: companyIdFromProp,
  redirectBasePath,
}: BillingFormProps & { redirectBasePath?: string }) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();

  const {
    addBill, searchProducts, getProductById, getAllStores,
    findOrCreateProductSKU, getSkuDetails, getSkuIdentifier,
    getActiveSubscriptionPlan, userProfile, products: allProductsStoreHook,
    updateProduct: updateProductInStore,
    fetchProducts,
    draftBill,
    setDraftBill,
    clearDraftBill,
    getAllCustomers,
    fetchCustomers,
  } = useInventoryStore(state => ({
    addBill: state.addBill,
    searchProducts: state.searchProducts,
    getProductById: state.getProductById,
    getAllStores: state.getAllStores,
    findOrCreateProductSKU: state.findOrCreateProductSKU,
    getSkuDetails: state.getSkuDetails,
    getSkuIdentifier: state.getSkuIdentifier,
    getActiveSubscriptionPlan: state.getActiveSubscriptionPlan,
    userProfile: state.userProfile,
    products: state.products,
    updateProduct: state.updateProduct,
    fetchProducts: state.fetchProducts,
    draftBill: state.draftBill,
    setDraftBill: state.setDraftBill,
    clearDraftBill: state.clearDraftBill,
    getAllCustomers: state.getAllCustomers,
    fetchCustomers: state.fetchCustomers,
  }));
  const companyId = useInventoryStore(state => companyIdFromProp || localStorage.getItem('companyId') || "comp_default_001");

  const [allStores, setAllStores] = useState<Store[]>([]);
  const [activePlan, setActivePlan] = useState<ReturnType<typeof getActiveSubscriptionPlan>>(undefined);
  const [hasMounted, setHasMounted] = useState(false);

  const [mode, setMode] = useState<BillMode>('sell');
  const [isEstimateMode, setIsEstimateMode] = useState(false);

  useEffect(() => {
    if (searchParamsHook) {
      // Excel mode handled by History page now
    }
  }, [searchParamsHook]);

  const [selectedStoreIdForAdmin, setSelectedStoreIdForAdmin] = useState<string | undefined>(undefined);

  const [productNameQuery, setProductNameQuery] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [costPrice, setCostPrice] = useState<number | string>('');
  const [sellPrice, setSellPrice] = useState<number | string>('');

  const [currentSkuStock, setCurrentSkuStock] = useState<number | null>(null);
  const [currentSkuSellPrice, setCurrentSkuSellPrice] = useState<number | null>(null);
  const [isDisplayingLayerStock, setIsDisplayingLayerStock] = useState(false);

  const [currentProductForSelection, setCurrentProductForSelection] = useState<Product | null>(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const [variantDropdownOpenState, setVariantDropdownOpenState] = useState<Record<string, boolean>>({});

  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([]);
  const [customerVendorName, setCustomerVendorName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [returnItemIsDefective, setReturnItemIsDefective] = useState(false);
  const [taxType, setTaxType] = useState<'intra-state' | 'inter-state'>('intra-state');
  const [customerGstin, setCustomerGstin] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  const [productNotFoundHint, setProductNotFoundHint] = useState('');
  const [isSavingAnimationVisible, setIsSavingAnimationVisible] = useState(false);
  const [lastSavedBillMode, setLastSavedBillMode] = useState<BillMode | null>(null);
  const [lastSavedBillIsEstimate, setLastSavedBillIsEstimate] = useState<boolean>(false);
  const [isVerifyEmployeeDialogOpen, setIsVerifyEmployeeDialogOpen] = useState(false);
  const [pendingBillPayload, setPendingBillPayload] = useState<PendingBillPayload | null>(null);
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [newProductDialogInitialValues, setNewProductDialogInitialValues] = useState<{ name: string; quantity?: string; costPrice?: string; sellPrice?: string; } | null>(null);

  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceAmount, setServiceAmount] = useState<number | string>('');

  const [billToPotentiallyPrint, setBillToPotentiallyPrint] = useState<Bill | null>(null);
  const [isPrintConfirmDialogOpen, setIsPrintConfirmDialogOpen] = useState(false);

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeScanPurpose, setBarcodeScanPurpose] = useState<'addItem' | 'updateProductSku' | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [productToUpdateSkuFor, setProductToUpdateSkuFor] = useState<Product | null>(null);
  const [isLoadingProductSearch, setIsLoadingProductSearch] = useState(false);
  const [billDate, setBillDate] = useState<Date | undefined>(new Date());
  const [isVerifyingGst, setIsVerifyingGst] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const productNameInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const costPriceInputRef = useRef<HTMLInputElement>(null);
  const sellPriceBatchInputRef = useRef<HTMLInputElement>(null);
  const customerVendorNameInputRef = useRef<HTMLInputElement>(null);
  const customerPhoneInputRef = useRef<HTMLInputElement>(null);
  const serviceDescriptionInputRef = useRef<HTMLInputElement>(null);
  const serviceAmountInputRef = useRef<HTMLInputElement>(null);
  const variantSelectRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  const itemsEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of list when items are added
  useEffect(() => {
    if (itemsEndRef.current) {
      itemsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentBillItems.length]);

  // Load Draft Bill on Mount
  useEffect(() => {
    if (!hasMounted) return;
    if (draftBill && !hasLoadedDraft && currentBillItems.length === 0) {
      // Restore state from draft
      if (draftBill.items.length > 0 || draftBill.vendorOrCustomerName || draftBill.notes) {
        setMode(draftBill.billType);
        setCurrentBillItems(draftBill.items);
        setCustomerVendorName(draftBill.vendorOrCustomerName || '');
        setCustomerPhone(draftBill.customerPhone || '');
        setNotes(draftBill.notes || '');
        setIsEstimateMode(draftBill.isEstimate || false);
        setTaxType(draftBill.taxType || 'intra-state');
        toast({ title: "Draft Restored", description: "Your unsaved bill has been restored." });
      }
      setHasLoadedDraft(true);
    }
  }, [hasMounted, draftBill, hasLoadedDraft, currentBillItems.length, toast]);

  // Save Draft Bill on Change
  useEffect(() => {
    if (!hasMounted) return;
    // Don't save if empty and no specific data, to avoid overwriting with empty
    // But if we explicitly cleared, we should clear draft. 
    // We handle implicit save here. Explicit clear is handled in resetFullForm.

    // We debounce to avoid frequent updates
    const timer = setTimeout(() => {
      if (currentBillItems.length > 0 || customerVendorName || notes) {
        setDraftBill({
          billType: mode,
          items: currentBillItems,
          vendorOrCustomerName: customerVendorName,
          customerPhone,
          notes,
          isEstimate: isEstimateMode,
          taxType,
          paymentMode,
          gstin: customerGstin,
          placeOfSupply,
          billingAddress,
          shippingAddress
        });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentBillItems, customerVendorName, customerPhone, notes, mode, isEstimateMode, taxType, setDraftBill, hasMounted]);

  useEffect(() => {
    setHasMounted(true);
    if (companyId) {
      fetchProducts(companyId);
      fetchCustomers(companyId);
    }
    setAllStores(getAllStores());
    setActivePlan(getActiveSubscriptionPlan());
  }, [getAllStores, getActiveSubscriptionPlan, fetchProducts, fetchCustomers, companyId]);

  useEffect(() => {
    if (customerGstin && customerGstin.length >= 2 && userProfile?.companyGstNo && userProfile.companyGstNo.length >= 2) {
      const companyStateCode = userProfile.companyGstNo.substring(0, 2);
      const customerStateCode = customerGstin.substring(0, 2);

      if (companyStateCode !== customerStateCode) {
        setTaxType('inter-state');
      } else {
        setTaxType('intra-state');
      }
    }
  }, [customerGstin, userProfile?.companyGstNo]);

  // Auto-populate customer from phone number
  useEffect(() => {
    if (customerPhone.length === 10 && hasMounted) {
      const customers = getAllCustomers(companyId);
      const matched = customers.find(c => c.phone === customerPhone);
      if (matched) {
        if (!customerVendorName || customerVendorName.trim() === '') {
          setCustomerVendorName(matched.name || '');
        }
        if (!customerGstin || customerGstin.trim() === '') {
          setCustomerGstin(matched.gstin || '');
        }
        if (!billingAddress || billingAddress.trim() === '') {
          setBillingAddress(matched.billingAddress || matched.address || '');
        }
        if (!shippingAddress || shippingAddress.trim() === '') {
          setShippingAddress(matched.shippingAddress || '');
        }
        if (!placeOfSupply || placeOfSupply.trim() === '') {
          setPlaceOfSupply(matched.placeOfSupply || '');
        }

        toast({
          title: "Customer Recognized",
          description: `Welcome back, ${matched.name || 'valued customer'}. Details auto-populated.`
        });
      }
    }
  }, [customerPhone, getAllCustomers, companyId, hasMounted, toast]);

  const determineMode = useCallback((): BillMode => {
    const urlMode = initialModeProp || searchParamsHook.get('mode') as BillMode | null;
    if (urlMode && ['sell', 'buy', 'return'].includes(urlMode)) {
      if (!allowedModes || (allowedModes && allowedModes.includes(urlMode))) {
        return urlMode;
      }
    }
    if (allowedModes && allowedModes.length > 0) return allowedModes[0];
    return 'sell';
  }, [initialModeProp, allowedModes, searchParamsHook]);

  useEffect(() => {
    const newDeterminedMode = determineMode();
    if (newDeterminedMode !== mode) {
      setMode(newDeterminedMode);
    }
  }, [determineMode, mode]);

  useEffect(() => {
    if (isAdminContext && hasMounted && activePlan) {
      if (preselectedStoreId && allStores.find(s => s.id === preselectedStoreId)) {
        setSelectedStoreIdForAdmin(preselectedStoreId);
      } else if (activePlan.id === SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 0) {
        setSelectedStoreIdForAdmin(allStores[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length === 1) {
        setSelectedStoreIdForAdmin(allStores[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 1 && !preselectedStoreId) {
        setSelectedStoreIdForAdmin(allStores[0].id);
      } else {
        setSelectedStoreIdForAdmin(undefined);
      }
    }
  }, [isAdminContext, allStores, preselectedStoreId, hasMounted, activePlan]);

  const resetFormFields = useCallback((focusProductName = true) => {
    setProductNameQuery('');
    setQuantity(1);
    setCostPrice('');
    setSellPrice('');
    setCurrentSkuStock(null);
    setCurrentSkuSellPrice(null);
    setIsDisplayingLayerStock(false);
    setReturnItemIsDefective(false);
    setCurrentProductForSelection(null);
    setSelectedVariantOptions({});
    setVariantDropdownOpenState({});
    setProductNotFoundHint('');
    if (focusProductName && productNameInputRef.current) {
      setTimeout(() => productNameInputRef.current?.focus(), 0);
    }
  }, []);

  const resetFullForm = useCallback(() => {
    setCurrentBillItems([]);
    setCustomerVendorName('');
    setCustomerPhone('');
    setCustomerGstin('');
    setPlaceOfSupply('');
    setBillingAddress('');
    setShippingAddress('');

    setNotes(userProfile.defaultBillNotes || '');
    if (mode === 'sell') {
      setIsPaid(userProfile.defaultSalesPaymentStatus === 'paid');
    } else if (mode === 'buy') {
      setIsPaid(userProfile.defaultPurchasePaymentStatus === 'paid');
    } else {
      setIsPaid(true);
    }

    setIsEstimateMode(false);
    setServiceDescription('');
    setServiceAmount('');
    resetFormFields(true);
    setPendingBillPayload(null);
    setBillToPotentiallyPrint(null);
    setTaxType('intra-state');
    clearDraftBill();
  }, [resetFormFields, userProfile, mode, clearDraftBill]);


  useEffect(() => {
    setTimeout(() => productNameInputRef.current?.focus(), 50);
    setNotes(userProfile.defaultBillNotes || '');
    if (mode === 'sell') {
      setIsPaid(userProfile.defaultSalesPaymentStatus === 'paid');
    } else if (mode === 'buy') {
      setIsPaid(userProfile.defaultPurchasePaymentStatus === 'paid');
    } else {
      setIsPaid(true);
    }
  }, [mode, userProfile]);

  const finalStoreIdForSkuDetails = useMemo(() => {
    return isAdminContext ? selectedStoreIdForAdmin : storeIdFromProp;
  }, [isAdminContext, selectedStoreIdForAdmin, storeIdFromProp]);

  const updateSkuDisplayInfo = useCallback((skuToUse?: ProductSKU) => {
    if (skuToUse && currentProductForSelection) {
      const details = getSkuDetails(skuToUse, finalStoreIdForSkuDetails);
      setCurrentSkuStock(currentProductForSelection.trackQuantity ? details.totalStock : null);
      setIsDisplayingLayerStock(false);
      setCurrentSkuSellPrice(details.currentSellPrice);
      if (mode === 'sell' || mode === 'return') {
        setSellPrice(details.currentSellPrice !== null ? details.currentSellPrice.toString() : '');
      } else if (mode === 'buy') {
        setCostPrice('');
        setSellPrice(details.currentSellPrice !== null ? details.currentSellPrice.toString() : '');
      }
    } else if (currentProductForSelection && !skuToUse) {
      setCurrentSkuStock(currentProductForSelection.trackQuantity ? 0 : null);
      setIsDisplayingLayerStock(false);
      setCurrentSkuSellPrice(null);
      setSellPrice('');
      if (mode === 'buy') setCostPrice('');
    } else {
      setCurrentSkuStock(null);
      setIsDisplayingLayerStock(false);
      setCurrentSkuSellPrice(null);
      setSellPrice('');
      if (mode === 'buy') setCostPrice('');
    }
  }, [getSkuDetails, mode, currentProductForSelection, finalStoreIdForSkuDetails]);


  const handleProductSelectFromSearch = useCallback((suggestion: ProductSearchSuggestion) => {
    const { product, sku, layer } = suggestion;
    setCurrentProductForSelection(product);

    const optionsToUse = sku ? (sku.optionValues || {}) : {};
    setSelectedVariantOptions(optionsToUse);

    if (sku) {
      const skuDetailsToUse = getSkuDetails(sku, finalStoreIdForSkuDetails);
      setProductNameQuery(skuDetailsToUse.skuIdentifier || product.name);

      if (mode === 'sell' && product.trackQuantity && layer && typeof layer.quantity === 'number') {
        setCurrentSkuStock(layer.quantity);
        setIsDisplayingLayerStock(true);
        setCurrentSkuSellPrice(layer.sellPrice);
        setSellPrice(layer.sellPrice.toString());
      } else {
        setCurrentSkuStock(product.trackQuantity ? skuDetailsToUse.totalStock : null);
        setIsDisplayingLayerStock(false);
        setCurrentSkuSellPrice(skuDetailsToUse.currentSellPrice);
        setSellPrice(skuDetailsToUse.currentSellPrice !== null ? skuDetailsToUse.currentSellPrice.toString() : '');
      }
      if (mode === 'buy') {
        setCostPrice('');
      }
    } else {
      setProductNameQuery(product.name);
      updateSkuDisplayInfo(undefined);
    }

    setProductNotFoundHint('');

    if (product.variants && product.variants.length > 0 && (!sku || Object.keys(sku.optionValues || {}).length < product.variants.length)) {
      const firstUnselectedVariant = product.variants.find(v => !(optionsToUse[v.name]));
      if (firstUnselectedVariant) {
        setTimeout(() => {
          setVariantDropdownOpenState({ [firstUnselectedVariant.id]: true });
          variantSelectRefs.current[firstUnselectedVariant.id]?.current?.focus();
        }, 100);
      } else {
        setTimeout(() => {
          quantityInputRef.current?.focus();
          quantityInputRef.current?.select();
        }, 100);
      }
    } else {
      setTimeout(() => {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }, 100);
    }
  }, [getSkuDetails, mode, updateSkuDisplayInfo, finalStoreIdForSkuDetails, selectedVariantOptions]);


  useEffect(() => {
    if (!hasMounted) return;
    const newlyAddedProductId = searchParamsHook.get('newlyAddedProductId');
    if (newlyAddedProductId) {
      const product = getProductById(newlyAddedProductId);
      if (product) {
        const skuToSelect = product.productSKUs.length > 0 ? product.productSKUs[0] : undefined;
        const skuDetails = getSkuDetails(skuToSelect, finalStoreIdForSkuDetails);
        const suggestionForNewProduct: ProductSearchSuggestion = {
          product,
          sku: skuToSelect || { id: product.id + '_default_new_bill', optionValues: {}, stockLayers: [], skuIdentifier: product.name },
          displayInfo: {
            name: skuDetails.skuIdentifier || product.name,
            stock: product.trackQuantity ? (skuDetails.totalStock ?? 0) : 'N/A',
            price: skuDetails.currentSellPrice !== null ? `₹${(skuDetails.currentSellPrice || 0).toFixed(2)}` : 'N/A',
          }
        };
        handleProductSelectFromSearch(suggestionForNewProduct);
      }
      const newParams = new URLSearchParams(searchParamsHook.toString());
      newParams.delete('newlyAddedProductId');
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    }
  }, [searchParamsHook, getProductById, router, pathname, handleProductSelectFromSearch, finalStoreIdForSkuDetails, hasMounted]);

  useEffect(() => {
    if (currentProductForSelection?.variants && currentProductForSelection.variants.length > 0) {
      const firstOpenVariantId = Object.keys(variantDropdownOpenState).find(id => variantDropdownOpenState[id]);
      if (firstOpenVariantId) {
        const firstVariantRef = variantSelectRefs.current[firstOpenVariantId];
        setTimeout(() => {
          const elToFocus = firstVariantRef?.current || document.getElementById(`variant-select-${firstOpenVariantId}-trigger`);
          (elToFocus as HTMLElement)?.focus();
        }, 100);
      }
    }
  }, [currentProductForSelection?.variants, variantDropdownOpenState]);

  useEffect(() => {
    if (currentProductForSelection?.variants && currentProductForSelection.variants.length > 0) {
      const allVariantsSelected = currentProductForSelection.variants.every(
        (v) => selectedVariantOptions[v.name]
      );

      if (allVariantsSelected) {
        const lastVariantId = currentProductForSelection.variants[currentProductForSelection.variants.length - 1].id;
        if (!variantDropdownOpenState[lastVariantId] && document.activeElement?.id !== quantityInputRef.current?.id) {
          const currentSku = currentProductForSelection.productSKUs.find(sku =>
            JSON.stringify(Object.entries(sku.optionValues || {}).sort()) === JSON.stringify(Object.entries(selectedVariantOptions).sort())
          );
          updateSkuDisplayInfo(currentSku);
          setTimeout(() => {
            quantityInputRef.current?.focus();
            quantityInputRef.current?.select();
          }, 50);
        }
      }
    }
  }, [selectedVariantOptions, currentProductForSelection, updateSkuDisplayInfo, variantDropdownOpenState]);


  const handleAddNewItem = () => {
    const currentQuantity = typeof quantity === 'string' ? parseFloat(quantity) || 1 : quantity || 1;
    if (!currentProductForSelection) {
      toast({ variant: "destructive", title: "Product Not Selected", description: "Please select a product/SKU from suggestions or add a new one." });
      productNameInputRef.current?.focus();
      return;
    }
    if (currentQuantity <= 0) {
      toast({ variant: "destructive", title: "Invalid Quantity", description: "Please enter a valid quantity." });
      quantityInputRef.current?.focus();
      return;
    }

    const product = currentProductForSelection;

    if (product.variants && product.variants.length > 0) {
      const allVariantsSelected = product.variants.every((v) => selectedVariantOptions[v.name]);
      if (!allVariantsSelected) {
        toast({ variant: "destructive", title: "Variant Selection Required", description: "Please select options for all product variants." });
        const firstUnselectedVariant = product.variants.find(v => !selectedVariantOptions[v.name]);
        if (firstUnselectedVariant) {
          setTimeout(() => setVariantDropdownOpenState(prev => ({ ...prev, [firstUnselectedVariant.id]: true })), 50);
        }
        return;
      }
    }

    const selectedOpts = (product.variants && product.variants.length > 0) ? selectedVariantOptions : {};
    const targetSkuFromStore = findOrCreateProductSKU(product.id, selectedOpts);

    if (!targetSkuFromStore) {
      toast({ variant: "destructive", title: "SKU Error", description: "Could not identify or create the product variant. Please re-select." });
      return;
    }
    const skuDetails = getSkuDetails(targetSkuFromStore, finalStoreIdForSkuDetails);
    const itemProductNameForBill = skuDetails?.skuIdentifier || getSkuIdentifier(product.name, selectedOpts) || product.name;

    if (mode === 'buy' && product.trackQuantity === false) {
      toast({ variant: "destructive", title: "Invalid Action", description: "Non-tracked items/services cannot be added to Expense bills." });
      resetFormFields(true);
      return;
    }

    if ((mode === 'sell' || (mode === 'return' && !returnItemIsDefective)) && product.trackQuantity) {
      const stockToCheck = isDisplayingLayerStock && currentSkuStock !== null && mode === 'sell'
        ? currentSkuStock
        : (skuDetails.totalStock ?? 0);

      // Check existing quantity of this SKU in the current bill (only for same SKU)
      const existingQuantityInBill = currentBillItems
        .filter(item => {
          if (item.productId !== product.id) return false;

          const itemOpts = item.selectedVariantOptions || {};
          const currentOpts = selectedOpts || {};

          const itemKeys = Object.keys(itemOpts).sort();
          const currentKeys = Object.keys(currentOpts).sort();

          if (itemKeys.length !== currentKeys.length) return false;
          return itemKeys.every(k => itemOpts[k] === currentOpts[k]);
        })
        .reduce((sum, item) => sum + item.quantity, 0);

      if (stockToCheck < (currentQuantity + existingQuantityInBill)) {
        toast({ variant: "destructive", title: "Insufficient Stock", description: `Only ${(stockToCheck || 0).toFixed(2)} of ${itemProductNameForBill} available at this store. You already have ${existingQuantityInBill} in bill.` });
        return;
      }
    }

    let itemCostPrice: number;
    let itemSellPriceForBill: number;
    let itemSgstAmount: number | undefined = 0;
    let itemCgstAmount: number | undefined = 0;
    let itemIgstAmount: number | undefined = 0;

    if (mode === 'buy') {
      itemCostPrice = parseFloat(costPrice.toString()) || 0;
      itemSellPriceForBill = parseFloat(sellPrice.toString()) || 0;
      if (itemCostPrice <= 0 && currentQuantity > 0 && product.trackQuantity) {
        toast({ variant: "destructive", title: "Invalid Cost Price", description: "Cost Price must be greater than 0 for tracked purchases." });
        costPriceInputRef.current?.focus();
        return;
      }
      if (itemSellPriceForBill <= 0 && currentQuantity > 0 && product.trackQuantity && itemCostPrice > 0) {
        toast({ variant: "destructive", title: "Invalid Sell Price", description: "Sell price for purchased batch must be greater than 0." });
        sellPriceBatchInputRef.current?.focus();
        return;
      }
    } else if (mode === 'sell') {
      itemSellPriceForBill = parseFloat(sellPrice.toString()) || currentSkuSellPrice || 0;

      if (product.trackQuantity === false) {
        itemCostPrice = skuDetails.averageCostPrice ?? 0;
      } else {
        itemCostPrice = 0;
      }
      if (itemSellPriceForBill <= 0 && currentQuantity > 0 && !product.id?.startsWith('SERVICE_ITEM_')) {
        toast({ variant: "destructive", title: "Invalid Sell Price", description: "Sell price for products must be greater than 0." });
        return;
      }
      if (!isEstimateMode && !product.id?.startsWith('SERVICE_ITEM_')) {
        const itemSubTotal = itemSellPriceForBill * currentQuantity;
        if (taxType === 'intra-state') {
          itemSgstAmount = (itemSubTotal * (product.sgstRate || 0)) / 100;
          itemCgstAmount = (itemSubTotal * (product.cgstRate || 0)) / 100;
        } else {
          const rate = product.igstRate !== undefined ? product.igstRate : ((product.sgstRate || 0) + (product.cgstRate || 0));
          itemIgstAmount = (itemSubTotal * rate) / 100;
        }
      }

    } else {
      itemSellPriceForBill = parseFloat(sellPrice.toString()) || currentSkuSellPrice || 0;
      itemCostPrice = skuDetails.averageCostPrice ?? 0;
      if (itemSellPriceForBill <= 0 && currentQuantity > 0 && !product.id?.startsWith('SERVICE_ITEM_')) {
        toast({ variant: "destructive", title: "Invalid Return Price", description: "Return price must be greater than 0." });
        return;
      }
      if (!product.id?.startsWith('SERVICE_ITEM_')) {
        const itemSubTotal = itemSellPriceForBill * currentQuantity;
        if (taxType === 'intra-state') {
          itemSgstAmount = (itemSubTotal * (product.sgstRate || 0)) / 100;
          itemCgstAmount = (itemSubTotal * (product.cgstRate || 0)) / 100;
        } else {
          const rate = product.igstRate !== undefined ? product.igstRate : ((product.sgstRate || 0) + (product.cgstRate || 0));
          itemIgstAmount = (itemSubTotal * rate) / 100;
        }
      }
    }

    const newItem: BillItem = {
      id: uuidv4(), productId: product.id, productName: itemProductNameForBill,
      quantity: currentQuantity, costPrice: itemCostPrice, sellPrice: itemSellPriceForBill,
      isDefective: mode === 'return' ? returnItemIsDefective : undefined,
      selectedVariantOptions: (product.variants && product.variants.length > 0) ? { ...selectedVariantOptions } : undefined,
      sgstAmount: itemSgstAmount,
      cgstAmount: itemCgstAmount,
      igstAmount: itemIgstAmount,
      isAdditionalCharge: false,
    };
    const itemsToAdd = [newItem];

    if (product.additionalChargeDefinitions && product.additionalChargeDefinitions.length > 0 && (mode === 'sell' || mode === 'return')) {
      product.additionalChargeDefinitions.forEach(charge => {
        let chargeValue = 0;
        if (charge.type === 'fixed') {
          chargeValue = charge.value;
        } else if (charge.type === 'percentage') {
          chargeValue = ((itemSellPriceForBill * currentQuantity) * charge.value) / 100;
        }

        itemsToAdd.push({
          id: uuidv4(),
          productId: `CHARGE_ITEM_${charge.id}`,
          productName: charge.name,
          quantity: 1,
          costPrice: 0,
          sellPrice: chargeValue,
          isAdditionalCharge: true,
          sourceChargeDefinitionId: charge.id,
          sgstAmount: 0,
          cgstAmount: 0,
          igstAmount: 0,
        });
      });
    }


    setCurrentBillItems(prevItems => [...prevItems, ...itemsToAdd]);
    resetFormFields(true);
  };

  const findAndPopulateProductByBarcode = async (barcodeValue: string, showErrorToast = true) => {
    if (!barcodeValue.trim()) return false;
    setIsLoadingProductSearch(true);
    setProductNotFoundHint('');

    let foundProduct: Product | undefined = undefined;
    let foundSkuForProduct: ProductSKU | undefined = undefined;

    for (const p of allProductsStoreHook) {
      if (p.sku && p.sku.toLowerCase() === barcodeValue.toLowerCase()) {
        foundProduct = p;
        foundSkuForProduct = p.productSKUs.find(s => Object.keys(s.optionValues || {}).length === 0) || p.productSKUs[0];
        break;
      }
      for (const s of p.productSKUs) {
        if (s.skuIdentifier && s.skuIdentifier.toLowerCase() === barcodeValue.toLowerCase()) {
          foundProduct = p;
          foundSkuForProduct = s;
          break;
        }
      }
      if (foundProduct) break;
    }

    // If not found by SKU/Barcode, try exact name match
    if (!foundProduct) {
      for (const p of allProductsStoreHook) {
        if (p.name && p.name.toLowerCase() === barcodeValue.trim().toLowerCase()) {
          foundProduct = p;
          // If it has variants, we don't pick a specific SKU yet to force variant selection
          if (p.variants && p.variants.length > 0) {
            foundSkuForProduct = undefined;
          } else {
            foundSkuForProduct = p.productSKUs[0];
          }
          break;
        }
      }
    }

    setIsLoadingProductSearch(false);

    if (foundProduct) {
      const skuToUse = foundSkuForProduct || (foundProduct.productSKUs.length > 0 ? foundProduct.productSKUs[0] : { id: foundProduct.id + '_default_barcode_scan', optionValues: {}, stockLayers: [], skuIdentifier: foundProduct.name });

      // If we found it by name and it has variants, we want to trigger variant selection helper
      const isGenericProductSelection = !foundSkuForProduct && foundProduct.variants && foundProduct.variants.length > 0;

      const skuDetails = getSkuDetails(skuToUse, finalStoreIdForSkuDetails);
      const suggestion: ProductSearchSuggestion = {
        product: foundProduct,
        sku: isGenericProductSelection ? undefined as any : skuToUse,
        displayInfo: {
          name: isGenericProductSelection ? `${foundProduct.name} (Select Variants)` : (skuDetails.skuIdentifier || foundProduct.name),
          stock: foundProduct.trackQuantity ? (skuDetails.totalStock ?? 0) : 'N/A',
          price: skuDetails.currentSellPrice !== null ? `₹${(skuDetails.currentSellPrice || 0).toFixed(2)}` : 'N/A',
        }
      };
      handleProductSelectFromSearch(suggestion);
      toast({ title: "Product Found", description: `${foundProduct.name} selected.` });
      return true;
    } else {
      if (showErrorToast) {
        toast({ variant: "destructive", title: "Product Not Found", description: `Product with code '${barcodeValue}' not found.` });
      }
      setProductNameQuery(barcodeValue);
      setProductNotFoundHint(barcodeValue);
      productNameInputRef.current?.focus();
      return false;
    }
  };

  const handleProductNameSubmit = async (inputValue: string) => {
    // First, try to find it (as SKU or Barcode)
    const found = await findAndPopulateProductByBarcode(inputValue, false);

    if (!found && inputValue.trim() !== '') {
      // Directly open the add product dialog
      // For sell mode, we still want to pre-fill sell price and potentially quantity as initial stock
      const billingFormPreFill = {
        name: inputValue,
        quantity: typeof quantity === 'string' ? quantity : quantity.toString(),
        costPrice: typeof costPrice === 'string' ? costPrice : costPrice.toString(),
        sellPrice: typeof sellPrice === 'string' ? sellPrice : sellPrice.toString(),
      };
      setNewProductDialogInitialValues(billingFormPreFill);
      setIsNewProductDialogOpen(true);
      setProductNotFoundHint('');
      resetFormFields(true);
    }
  };

  const handleBarcodeIconClick = () => {
    if (currentProductForSelection) {
      setProductToUpdateSkuFor(currentProductForSelection);
      setBarcodeScanPurpose('updateProductSku');
    } else {
      setProductToUpdateSkuFor(null);
      setBarcodeScanPurpose('addItem');
    }
    setIsBarcodeModalOpen(true);
  };

  const handleBarcodeScannedFromModal = async (barcodeValue: string) => {
    setIsBarcodeModalOpen(false);

    if (barcodeScanPurpose === 'addItem') {
      await findAndPopulateProductByBarcode(barcodeValue);
    } else if (barcodeScanPurpose === 'updateProductSku' && productToUpdateSkuFor) {
      const productToUpdate = productToUpdateSkuFor;
      try {
        const updatedProduct = await updateProductInStore(
          productToUpdate.id,
          { sku: barcodeValue },
          companyId
        );
        if (updatedProduct) {
          toast({ title: "Product SKU Updated", description: `Base SKU for ${updatedProduct.name} set to ${barcodeValue}.` });
          if (currentProductForSelection && currentProductForSelection.id === updatedProduct.id) {
            setCurrentProductForSelection(updatedProduct);
            setProductNameQuery(updatedProduct.name);
            const skuToUse = updatedProduct.productSKUs.find(s => Object.keys(s.optionValues).length === 0) || updatedProduct.productSKUs[0] || { id: updatedProduct.id + '_temp', optionValues: {}, stockLayers: [], skuIdentifier: updatedProduct.name };
            updateSkuDisplayInfo(skuToUse);
          }
        } else {
          toast({ variant: "destructive", title: "Update Failed", description: "Could not update product SKU." });
        }
      } catch (error) {
        console.error("Error updating product SKU:", error);
        toast({ variant: "destructive", title: "Error", description: "An error occurred while updating SKU." });
      }
    }
    setBarcodeScanPurpose(null);
    setProductToUpdateSkuFor(null);
    productNameInputRef.current?.focus();
  };


  const handleEnterNavigation = (currentField: 'quantity' | 'costPrice' | 'sellPrice' | 'serviceDescription' | 'serviceAmount') => {
    if (currentField === 'quantity') {
      if (mode === 'buy') {
        costPriceInputRef.current?.focus();
        costPriceInputRef.current?.select();
      } else if (mode === 'sell' || mode === 'return') {
        handleAddNewItem();
      }
    } else if (currentField === 'costPrice') {
      if (mode === 'buy') {
        sellPriceBatchInputRef.current?.focus();
        sellPriceBatchInputRef.current?.select();
      }
    } else if (currentField === 'sellPrice') {
      if (mode === 'buy') handleAddNewItem();
    } else if (currentField === 'serviceDescription') {
      serviceAmountInputRef.current?.focus();
      serviceAmountInputRef.current?.select();
    } else if (currentField === 'serviceAmount') {
      handleAddServiceItem();
    }
  };

  const calculateItemTax = (item: BillItem, currentQuantity: number, currentSellPrice: number, currentDiscountValue: number = 0, currentDiscountType: 'amount' | 'percentage' = 'amount') => {
    const product = getProductById(item.productId);
    const subTotal = currentSellPrice * currentQuantity;
    let discountAmount = 0;
    if (currentDiscountValue > 0) {
      if (currentDiscountType === 'percentage') {
        discountAmount = (subTotal * currentDiscountValue) / 100;
      } else {
        // Treat fixed amount as per-unit discount
        discountAmount = currentDiscountValue * currentQuantity;
      }
    }
    const taxableValue = Math.max(0, subTotal - discountAmount);

    let sgst = 0, cgst = 0, igst = 0;
    if (product) {
      if (taxType === 'intra-state') {
        sgst = (taxableValue * (product.sgstRate || 0)) / 100;
        cgst = (taxableValue * (product.cgstRate || 0)) / 100;
      } else {
        // Use igstRate if available, otherwise sum of sgst+cgst
        const rate = product.igstRate !== undefined ? product.igstRate : ((product.sgstRate || 0) + (product.cgstRate || 0));
        igst = (taxableValue * rate) / 100;
      }
    }
    return { sgst, cgst, igst, discountAmount };
  };

  const updateBillItemQuantity = (itemId: string, newQuantity: number) => {
    setCurrentBillItems(prevItems => {
      const itemToUpdate = prevItems.find(i => i.id === itemId);
      if (!itemToUpdate) return prevItems;

      const qty = Math.max(0, newQuantity);

      // Stock Validation for Sell/Return Mode
      if ((mode === 'sell' || (mode === 'return' && !itemToUpdate.isDefective)) && !isEstimateMode && !itemToUpdate.isAdditionalCharge && !itemToUpdate.productId.startsWith('SERVICE_ITEM_')) {
        const product = getProductById(itemToUpdate.productId);
        if (product && product.trackQuantity) {
          const targetSku = findOrCreateProductSKU(product.id, itemToUpdate.selectedVariantOptions || {});
          if (targetSku) {
            const skuDetails = getSkuDetails(targetSku, finalStoreIdForSkuDetails);
            const stockAvailable = skuDetails.totalStock ?? 0;

            // Calculate total quantity of this SKU in the bill excluding current item
            const otherItemsQuantity = prevItems.reduce((sum, i) => {
              if (i.id === itemId) return sum;
              if (i.productId !== itemToUpdate.productId) return sum;

              const itemOpts = i.selectedVariantOptions || {};
              const currentOpts = itemToUpdate.selectedVariantOptions || {};
              const itemKeys = Object.keys(itemOpts).sort();
              const currentKeys = Object.keys(currentOpts).sort();

              if (itemKeys.length === currentKeys.length && itemKeys.every(k => itemOpts[k] === currentOpts[k])) {
                return sum + i.quantity;
              }
              return sum;
            }, 0);

            if (stockAvailable < (qty + otherItemsQuantity)) {
              toast({
                variant: "destructive",
                title: "Insufficient Stock",
                description: `Only ${(stockAvailable || 0).toFixed(2)} available. You have ${otherItemsQuantity} already in bill + ${qty} requested.`
              });
              return prevItems;
            }
          }
        }
      }

      return prevItems.map(item => {
        if (item.id === itemId) {
          let updatedItem = { ...item, quantity: qty };

          if ((mode === 'sell' || mode === 'return') && !isEstimateMode && !item.isAdditionalCharge && !item.productId.startsWith('SERVICE_ITEM_')) {
            const { sgst, cgst, igst, discountAmount } = calculateItemTax(updatedItem, qty, updatedItem.sellPrice, updatedItem.discountValue, updatedItem.discountType);
            updatedItem.sgstAmount = sgst;
            updatedItem.cgstAmount = cgst;
            updatedItem.igstAmount = igst;
            updatedItem.discountAmount = discountAmount;
          }
          return updatedItem;
        }
        return item;
      }).filter(item => item.quantity > 0 || item.isAdditionalCharge);
    });
  };

  const updateBillItemDiscount = (itemId: string, value: number, type: 'amount' | 'percentage') => {
    setCurrentBillItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          let updatedItem = { ...item, discountValue: value, discountType: type };
          if ((mode === 'sell' || mode === 'return') && !isEstimateMode && !item.isAdditionalCharge && !item.productId.startsWith('SERVICE_ITEM_')) {
            const { sgst, cgst, igst, discountAmount } = calculateItemTax(updatedItem, updatedItem.quantity, updatedItem.sellPrice, value, type);
            updatedItem.sgstAmount = sgst;
            updatedItem.cgstAmount = cgst;
            updatedItem.igstAmount = igst;
            updatedItem.discountAmount = discountAmount;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Recalculate taxes when taxMode changes
  useEffect(() => {
    setCurrentBillItems(prevItems => prevItems.map(item => {
      if ((mode === 'sell' || mode === 'return') && !isEstimateMode && !item.isAdditionalCharge && !item.productId.startsWith('SERVICE_ITEM_')) {
        const product = getProductById(item.productId);
        if (!product) return item;

        const subTotal = item.sellPrice * item.quantity;
        let discountAmount = 0; // Usage of saved discount amount is unsafe if logic changes, recalculate
        if (item.discountValue && item.discountValue > 0) {
          if (item.discountType === 'percentage') discountAmount = (subTotal * item.discountValue) / 100;
          else discountAmount = item.discountValue * item.quantity;
        }

        const taxableValue = Math.max(0, subTotal - discountAmount);
        let sgst = 0, cgst = 0, igst = 0;

        if (taxType === 'intra-state') {
          sgst = (taxableValue * (product.sgstRate || 0)) / 100;
          cgst = (taxableValue * (product.cgstRate || 0)) / 100;
          igst = 0;
        } else {
          const rate = product.igstRate !== undefined ? product.igstRate : ((product.sgstRate || 0) + (product.cgstRate || 0));
          igst = (taxableValue * rate) / 100;
          sgst = 0; cgst = 0;
        }
        return { ...item, sgstAmount: sgst, cgstAmount: cgst, igstAmount: igst, discountAmount };
      }
      return item;
    }));
  }, [taxType, mode, isEstimateMode, getProductById]);

  const updateBillItemPrice = (itemId: string, newPrice: number, priceType: 'cost' | 'sell') => {
    setCurrentBillItems(prevItems =>
      prevItems.map(item => {
        if (item.id !== itemId) return item;

        let updatedItem = { ...item, [priceType === 'cost' ? 'costPrice' : 'sellPrice']: Math.max(0, newPrice) };

        // Recalculate taxes and discounts if in sell/return mode
        if ((mode === 'sell' || mode === 'return') && !isEstimateMode && !item.isAdditionalCharge && !item.productId.startsWith('SERVICE_ITEM_')) {
          const { sgst, cgst, igst, discountAmount } = calculateItemTax(
            updatedItem,
            updatedItem.quantity,
            updatedItem.sellPrice,
            updatedItem.discountValue,
            updatedItem.discountType
          );
          updatedItem.sgstAmount = sgst;
          updatedItem.cgstAmount = cgst;
          updatedItem.igstAmount = igst;
          updatedItem.discountAmount = discountAmount;
        }

        return updatedItem;
      })
    );
  };

  const removeBillItem = (itemId: string) => {
    setCurrentBillItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const calculateBillTotals = () => {
    let subTotal = 0;
    let totalSGST = 0;
    let totalCGST = 0;

    currentBillItems.forEach(item => {
      const itemSubTotal = item.sellPrice * item.quantity;
      subTotal += itemSubTotal;

      if ((mode === 'sell' || mode === 'return') && !isEstimateMode && !item.isAdditionalCharge && !item.productId.startsWith('SERVICE_ITEM_')) {
        totalSGST += item.sgstAmount || 0;
        totalCGST += item.cgstAmount || 0;
        // IGST is not in original code, adding it
      }
    });

    let grandTotal;
    let totalIGST = 0;
    let totalDiscount = 0;

    if (mode === 'buy') {
      subTotal = currentBillItems.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
      grandTotal = subTotal;
      totalSGST = 0; totalCGST = 0; totalIGST = 0;
    } else if ((mode === 'sell' || mode === 'return')) {
      // Subtotal in Sell mode should usually be Pre-Tax, Pre-Discount?
      // Usually Subtotal = Sum of (Qty * Price).
      // Discount is subtracted. Tax is added.
      subTotal = currentBillItems.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
      totalDiscount = currentBillItems.reduce((acc, item) => acc + (item.discountAmount || 0), 0);
      totalSGST = currentBillItems.reduce((acc, item) => acc + (item.sgstAmount || 0), 0);
      totalCGST = currentBillItems.reduce((acc, item) => acc + (item.cgstAmount || 0), 0);
      totalIGST = currentBillItems.reduce((acc, item) => acc + (item.igstAmount || 0), 0);

      if (isEstimateMode) {
        grandTotal = subTotal - totalDiscount; // Estimates might show discount but no tax
        totalSGST = 0; totalCGST = 0; totalIGST = 0;
      } else {
        grandTotal = (subTotal - totalDiscount) + totalSGST + totalCGST + totalIGST;
      }
    } else {
      grandTotal = subTotal;
    }
    return { subTotal, totalSGST, totalCGST, totalIGST, totalDiscount, grandTotal };
  };

  const billTotals = useMemo(calculateBillTotals, [currentBillItems, mode, isEstimateMode, taxType]);

  const startSaveProcess = async (staffId: string, billPayloadToSave: PendingBillPayload) => {
    if (!billPayloadToSave) {
      toast({ variant: "destructive", title: "Internal Error", description: "No bill data to save." });
      return;
    }
    try {
      const savedBill = await addBill(
        {
          type: billPayloadToSave.billType,
          billedByStaffId: staffId,
          storeId: billPayloadToSave.storeIdForBill,
          companyId: companyId,
          isEstimate: billPayloadToSave.isEstimate,
          taxType: billPayloadToSave.taxType,
          date: billPayloadToSave.date,
          ... (({ billType, items, storeIdForBill, isEstimate, taxType, date, ...otherData }) => otherData)(billPayloadToSave)
        },
        billPayloadToSave.items
      );

      if (savedBill) {
        clearDraftBill(); // Clear draft on successful save
        setBillToPotentiallyPrint(savedBill);
        setIsPrintConfirmDialogOpen(true);
      } else {
      }
    } catch (error) {
      console.error("Error during bill save process:", error);
      toast({ variant: "destructive", title: "Save Failed", description: error instanceof Error ? error.message : "Could not save the bill. Please check stock or product details." });
    }
  };

  const handleConfirmPrint = (print: boolean) => {
    setIsPrintConfirmDialogOpen(false);
    if (print && billToPotentiallyPrint) {
      const printContent = generateBillPrintContent(billToPotentiallyPrint, userProfile, allProductsStoreHook);
      triggerPrint(printContent);
    }
    if (billToPotentiallyPrint) {
      setLastSavedBillMode(billToPotentiallyPrint.type);
      setLastSavedBillIsEstimate(billToPotentiallyPrint.isEstimate || false);
      setIsSavingAnimationVisible(true);
    }
    setBillToPotentiallyPrint(null);
  };

  const handleVerifyGst = async () => {
    if (customerGstin.length !== 15) {
      toast({ variant: "destructive", title: "Invalid GSTIN", description: "GSTIN must be 15 characters long." });
      return;
    }

    setIsVerifyingGst(true);
    try {
      const response = await fetch(`/api/gst/verify?gstin=${customerGstin}`);
      const result = await response.json();

      if (result.success) {
        const { data } = result;
        // Auto populate fields if they are empty
        if (data.tradeName && (!customerVendorName || customerVendorName.trim() === '')) {
          setCustomerVendorName(data.tradeName);
        }
        if (data.address && (!billingAddress || billingAddress.trim() === '')) {
          setBillingAddress(data.address);
        }
        if (data.state) {
          setPlaceOfSupply(`${data.state} (${data.stateCode})`);
        }

        toast({
          title: data.isPartial ? "State Identified" : "GST Verified",
          description: data.isPartial
            ? `Identified state as ${data.state} from GSTIN code.`
            : `Verified: ${data.tradeName}. Details auto-populated.`
        });
      } else {
        toast({ variant: "destructive", title: "Verification Failed", description: result.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to connect to GST verification service." });
    } finally {
      setIsVerifyingGst(false);
    }
  };

  const handleSaveBill = () => {
    if (currentBillItems.length === 0) {
      toast({ variant: "destructive", title: "Empty Bill", description: "Please add items to the bill." });
      return;
    }

    let finalStoreId: string | undefined = undefined;
    if (isAdminContext) {
      const planId = activePlan?.id;
      if (planId === SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY) {
        finalStoreId = undefined; // No store needed for this plan
      } else if (planId === SUBSCRIPTION_PLAN_IDS.STARTER) {
        if (allStores.length === 1) finalStoreId = allStores[0].id;
        else {
          toast({ variant: "destructive", title: "Store Required", description: "Please add your store in Store Management before creating bills on the Starter plan." });
          return;
        }
      } else {
        if (allStores.length === 0) {
          toast({ variant: "destructive", title: "No Stores Configured", description: "Please add stores in Store Management before creating bills." });
          return;
        }
        if (!selectedStoreIdForAdmin) {
          toast({ variant: "destructive", title: "Store Not Selected", description: "Please select a store for this bill." });
          return;
        }
        finalStoreId = selectedStoreIdForAdmin;
      }
    } else {
      finalStoreId = storeIdFromProp;
    }

    const billPaymentStatus = (mode === 'sell' || mode === 'buy') ? (isPaid ? 'paid' : 'unpaid') : undefined;

    const currentBillPayload: PendingBillPayload = {
      billType: mode, vendorOrCustomerName: customerVendorName || undefined,
      customerPhone: customerPhone || undefined, notes: notes || undefined,
      paymentStatus: billPaymentStatus, items: currentBillItems,
      storeIdForBill: finalStoreId,
      isEstimate: mode === 'sell' ? isEstimateMode : undefined,
      taxType: taxType,
      date: billDate ? billDate.toISOString() : new Date().toISOString(),
      gstin: customerGstin || undefined,
      placeOfSupply: placeOfSupply || undefined,
      billingAddress: billingAddress || undefined,
      shippingAddress: shippingAddress || undefined,
    };

    if (!isAdminContext && storeIdFromProp) {
      setPendingBillPayload(currentBillPayload);
      setIsVerifyEmployeeDialogOpen(true);
    } else if (isAdminContext) {
      if (activePlan?.id !== SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY && !finalStoreId && activePlan && activePlan.maxStores > 0) {
        toast({ variant: "destructive", title: "Store Required", description: "A store context is required to save this bill for your plan." });
        return;
      }
      startSaveProcess('admin_self_billed', currentBillPayload);
    }
  };

  const handleEmployeeVerifiedForBill = (staff: Staff) => {
    setIsVerifyEmployeeDialogOpen(false);
    if (pendingBillPayload) {
      startSaveProcess(staff.id, pendingBillPayload);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Billing data was unexpectedly cleared. Please try saving again." });
    }
    setPendingBillPayload(null);
  };

  const handleAnimationClose = () => {
    setIsSavingAnimationVisible(false);
    setLastSavedBillMode(null);
    setLastSavedBillIsEstimate(false);
    resetFullForm();

    if (isAdminContext) {
      const currentQueryModeInUrl = searchParamsHook.get('mode');
      const finalRedirectBasePath = redirectBasePath || (pathname.startsWith('/local') ? '/local/billing' : '/admin/billing');
      if (currentQueryModeInUrl && ['sell', 'buy', 'return'].includes(currentQueryModeInUrl)) {
      } else {
        router.push(finalRedirectBasePath);
      }
    }
  };

  const handleModeChange = (newModeString: string) => {
    const newMode = newModeString as BillMode;
    if (allowedModes && allowedModes.length > 0 && !allowedModes.includes(newMode)) {
      toast({ variant: "destructive", title: "Mode Not Allowed", description: `This terminal is not configured for ${newMode} operations.` });
      return;
    }

    if (newMode !== mode) {
      resetFullForm();
      setMode(newMode);

      // Update URL silently without triggering Next.js router refresh
      const url = new URL(window.location.href);
      url.searchParams.set('mode', newMode);
      window.history.pushState({}, '', url);
    }
  };

  const handleEditProductClick = () => {
    if (currentProductForSelection) {
      const params = new URLSearchParams();
      const currentBillingUrl = `${pathname}?${searchParamsHook.toString()}`;
      params.set('returnTo', encodeURIComponent(currentBillingUrl));

      const isLocal = pathname.startsWith('/local');
      const baseProductPath = isLocal ? '/local/products' : '/admin/products';

      router.push(`${baseProductPath}/${currentProductForSelection.id}?${params.toString()}`);
    }
  };

  const handleNewProductAddedFromDialog = (newProduct: Product) => {
    setIsNewProductDialogOpen(false);
    const skuToSelect = newProduct.productSKUs.length > 0 ? newProduct.productSKUs[0] : undefined;
    const skuDetails = getSkuDetails(skuToSelect, finalStoreIdForSkuDetails);
    const suggestion: ProductSearchSuggestion = {
      product: newProduct,
      sku: skuToSelect || { id: newProduct.id + '_default_dialog_add', optionValues: {}, stockLayers: [], skuIdentifier: newProduct.name },
      displayInfo: {
        name: skuDetails.skuIdentifier || newProduct.name,
        stock: newProduct.trackQuantity ? (skuDetails.totalStock ?? 0) : 'N/A',
        price: skuDetails.currentSellPrice !== null ? `₹${(skuDetails.currentSellPrice || 0).toFixed(2)}` : 'N/A',
      },
    };
    handleProductSelectFromSearch(suggestion);
  };

  const handleAddServiceItem = () => {
    if (!serviceDescription || !serviceAmount || parseFloat(serviceAmount.toString()) <= 0) {
      toast({ variant: "destructive", title: "Missing Service Info", description: "Please enter service description and a valid amount." });
      serviceDescriptionInputRef.current?.focus();
      return;
    }

    const amount = parseFloat(serviceAmount.toString());
    let sgstAmount: number | undefined = 0;
    let cgstAmount: number | undefined = 0;
    let igstAmount: number | undefined = 0;

    const serviceItem: BillItem = {
      id: uuidv4(),
      productId: `SERVICE_ITEM_${uuidv4()}`,
      productName: serviceDescription,
      quantity: 1,
      costPrice: mode === 'buy' ? amount : 0,
      sellPrice: amount,
      isDefective: undefined,
      selectedVariantOptions: undefined,
      sgstAmount,
      cgstAmount,
      igstAmount,
      isAdditionalCharge: false,
    };

    setCurrentBillItems(prevItems => [...prevItems, serviceItem]);
    setServiceDescription('');
    setServiceAmount('');
    setTimeout(() => serviceDescriptionInputRef.current?.focus(), 0);
  };

  const displayModes = allowedModes || ['sell', 'buy', 'return'];
  const activeModeConfig = {
    sell: { icon: Send, color: "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground", label: "Sales" },
    buy: { icon: ShoppingBag, color: "data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground", label: "Expense" },
    return: { icon: RotateCcw, color: "data-[state=active]:bg-amber-400 data-[state=active]:text-amber-900 dark:data-[state=active]:bg-amber-500 dark:data-[state=active]:text-amber-950", label: "Return" },
  };

  const showAdminStoreSelector = isAdminContext &&
    activePlan &&
    activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER &&
    activePlan.id !== SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY &&
    allStores.length > 1;

  const currentUrlMode = searchParamsHook.get('mode') as BillMode | null;


  return (
    <div className="flex flex-col gap-6">
      {/* Passkey and Scanner Modals */}
      {(!isAdminContext && storeIdFromProp) && (
        <EmployeePasskeyDialog
          isOpen={isVerifyEmployeeDialogOpen}
          onOpenChange={(open) => {
            if (!open && isVerifyEmployeeDialogOpen) {
              setPendingBillPayload(null);
            }
            setIsVerifyEmployeeDialogOpen(open);
          }}
          storeId={storeIdFromProp}
          companyId={companyId}
          onAuthenticated={handleEmployeeVerifiedForBill}
        />
      )}
      <HardwareBarcodeScanModal
        isOpen={isBarcodeModalOpen}
        onOpenChange={setIsBarcodeModalOpen}
        onScan={handleBarcodeScannedFromModal}
        purpose={barcodeScanPurpose || 'addItem'}
        productNameForUpdate={productToUpdateSkuFor?.name}
      />


      <div className="flex justify-center">
        <Tabs value={mode} onValueChange={handleModeChange} className="w-auto">
          <TabsList className="grid w-full grid-cols-3 gap-1 h-11">
            {displayModes.includes('sell') && (
              <TabsTrigger value="sell" className={cn("flex items-center gap-2 text-sm px-4 py-2.5", activeModeConfig.sell.color)}>
                <activeModeConfig.sell.icon size={18} />{activeModeConfig.sell.label}
              </TabsTrigger>
            )}
            {displayModes.includes('buy') && (
              <TabsTrigger value="buy" className={cn("flex items-center gap-2 text-sm px-4 py-2.5", activeModeConfig.buy.color)}>
                <activeModeConfig.buy.icon size={18} />{activeModeConfig.buy.label}
              </TabsTrigger>
            )}
            {displayModes.includes('return') && (
              <TabsTrigger value="return" className={cn("flex items-center gap-2 text-sm px-4 py-2.5", activeModeConfig.return.color)}>
                <activeModeConfig.return.icon size={18} />{activeModeConfig.return.label}
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      <Card className="w-full shadow-lg flex flex-col border-t-2 border-t-primary overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <CardContent className="flex-1 flex flex-col overflow-hidden space-y-4 p-6">
              {showAdminStoreSelector && (
                <div className="space-y-1.5 pb-4 border-b border-dashed mb-4">
                  <Label htmlFor="adminStoreSelect" className="flex items-center gap-1.5 text-base font-medium text-primary">
                    <Building size={18} /> Store for this Bill
                  </Label>
                  <Select value={selectedStoreIdForAdmin || ""} onValueChange={setSelectedStoreIdForAdmin}>
                    <SelectTrigger id="adminStoreSelect" className="w-full md:w-1/2 select-trigger-class">
                      <SelectValue placeholder="Select a store..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allStores.map(store => (
                        <SelectItem key={store.id} value={store.id}>{store.name} ({store.location})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isAdminContext && activePlan && activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 1 && !selectedStoreIdForAdmin && (
                    <p className="text-xs text-destructive mt-1">Please select a store before saving the bill.</p>
                  )}
                </div>
              )}
              {isAdminContext && activePlan?.id === SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length === 0 && (
                <p className="text-sm text-destructive text-center p-4 border border-dashed rounded-md bg-destructive/10">
                  No store configured for your Starter plan. Please <Link href={pathname.startsWith('/local') ? "/local/settings" : "/admin/stores"} className="font-semibold underline hover:text-destructive/80">add your store</Link> in Store Management.
                </p>
              )}
              {isAdminContext && activePlan && activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length === 0 && (
                <p className="text-sm text-destructive text-center p-4 border border-dashed rounded-md bg-destructive/10">
                  No stores configured. Please <Link href={pathname.startsWith('/local') ? "/local/settings" : "/admin/stores"} className="font-semibold underline hover:text-destructive/80">add stores</Link> in Store Management.
                </p>
              )}

              {mode === 'sell' && (
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center space-x-2 justify-end">
                    {/* Tax Type Switch */}
                    {mode === 'sell' && !isEstimateMode && (
                      <div className="flex items-center space-x-2 bg-secondary/20 p-2 rounded-md border text-sm">
                        <Switch
                          id="tax-mode"
                          checked={taxType === 'inter-state'}
                          onCheckedChange={(c) => setTaxType(c ? 'inter-state' : 'intra-state')}
                        />
                        <Label htmlFor="tax-mode">Inter-state (IGST)</Label>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="paymentStatus"
                        checked={isPaid}
                        onCheckedChange={(checked) => setIsPaid(!!checked)}
                      />
                      <Label htmlFor="paymentStatus" className="font-semibold cursor-pointer select-none">Mark as Paid</Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isPaid && (
                      <div className="space-y-1.5">
                        <Label>Payment Mode</Label>
                        <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="netbanking">Net Banking</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 justify-end">
                    <Switch id="estimate-mode" checked={isEstimateMode} onCheckedChange={setIsEstimateMode} />
                    <Label htmlFor="estimate-mode">Estimate/Quotation</Label>
                  </div>
                </div>
              )}

              <div className="space-y-4 pb-4 border-b border-dashed">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Settings2 size={20} className="text-muted-foreground" /> Add Item / Product
                  </h3>
                </div>

                <BillingProductSelector
                  mode={mode}
                  productNameQuery={productNameQuery}
                  setProductNameQuery={setProductNameQuery}
                  isLoadingProductSearch={isLoadingProductSearch}
                  currentProductForSelection={currentProductForSelection}
                  setCurrentProductForSelection={setCurrentProductForSelection}
                  selectedVariantOptions={selectedVariantOptions}
                  setSelectedVariantOptions={setSelectedVariantOptions}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  costPrice={costPrice}
                  setCostPrice={setCostPrice}
                  sellPrice={sellPrice}
                  setSellPrice={setSellPrice}
                  currentSkuStock={currentSkuStock}
                  currentSkuSellPrice={currentSkuSellPrice}
                  isDisplayingLayerStock={isDisplayingLayerStock}
                  onAddProduct={handleAddNewItem}
                  onScannerClick={handleBarcodeIconClick}
                  onEditProductClick={handleEditProductClick}
                  productNotFoundHint={productNotFoundHint}
                  handleProductSelectFromSearch={handleProductSelectFromSearch}
                  handleProductNameSubmit={handleProductNameSubmit}
                  finalStoreIdForSkuDetails={finalStoreIdForSkuDetails}
                  returnItemIsDefective={returnItemIsDefective}
                  setReturnItemIsDefective={setReturnItemIsDefective}
                  productNameInputRef={productNameInputRef}
                  quantityInputRef={quantityInputRef}
                  costPriceInputRef={costPriceInputRef}
                  sellPriceBatchInputRef={sellPriceBatchInputRef}
                  variantSelectRefs={variantSelectRefs}
                  variantDropdownOpenState={variantDropdownOpenState}
                  setVariantDropdownOpenState={setVariantDropdownOpenState}
                />
              </div>

              <div className="flex-grow overflow-hidden flex flex-col min-h-0">
                <BillItemHeader mode={mode} isEstimateMode={isEstimateMode} taxType={taxType} />
                <ScrollArea className="flex-1 h-0 min-h-[200px]" ref={scrollAreaRef as any}>
                  <div className="flex flex-col gap-1 pb-2">
                    {currentBillItems.map((item) => (
                      <BillItemRow
                        key={item.id}
                        item={item}
                        mode={mode}
                        isEstimateMode={isEstimateMode}
                        onQuantityChange={updateBillItemQuantity}
                        onPriceChange={updateBillItemPrice}
                        onDiscountChange={updateBillItemDiscount}
                        onRemoveItem={removeBillItem}
                        onEnterPress={() => productNameInputRef.current?.focus()}
                        taxType={taxType}
                      />
                    ))}
                    <div ref={itemsEndRef} className="h-1" />
                  </div>
                </ScrollArea>
              </div>

              {
                (mode === 'sell' || mode === 'buy') && (
                  <div className="pt-4 border-t border-dashed mt-auto space-y-3">
                    <h3 className="text-md font-medium text-foreground flex items-center gap-2">
                      <CircleDollarSign size={18} className="text-muted-foreground" /> Add Ad-hoc Service / Charge
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-end">
                      <div className="space-y-1.5">
                        <Label htmlFor="serviceDescription">Description</Label>
                        <Input
                          id="serviceDescription"
                          ref={serviceDescriptionInputRef}
                          value={serviceDescription}
                          onChange={(e) => setServiceDescription(e.target.value)}
                          placeholder="e.g., Delivery Fee, Repair Service"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('serviceDescription'))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="serviceAmount">Amount</Label>
                        <Input
                          id="serviceAmount"
                          ref={serviceAmountInputRef}
                          type="number"
                          value={serviceAmount}
                          onChange={(e) => setServiceAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('serviceAmount'))}
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                      <Button onClick={handleAddServiceItem} variant="outline" className="self-end h-10">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Service
                      </Button>
                    </div>
                  </div>
                )
              }
            </CardContent >
          </motion.div>
        </AnimatePresence>

        <Separator className="my-0" />
        <CardFooter className="flex-col items-stretch gap-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="customerVendorName">{mode === 'buy' ? 'Vendor Name' : (mode === 'sell' ? 'Customer Name' : 'Party Name')}</Label>
              <Input
                id="customerVendorName"
                ref={customerVendorNameInputRef}
                value={customerVendorName}
                onChange={(e) => setCustomerVendorName(e.target.value)}
                placeholder={`Enter ${mode === 'buy' ? 'vendor' : (mode === 'sell' ? 'customer' : 'party')} name (optional)`}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerPhone">{mode === 'buy' ? 'Vendor' : 'Customer'} Phone</Label>
              <Input
                id="customerPhone"
                ref={customerPhoneInputRef}
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder={`Enter ${mode === 'buy' ? 'vendor' : 'customer'} phone (optional)`}
              />
            </div>

            {(mode === 'sell' || mode === 'return') && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="customerGstin" className="flex items-center gap-1.5">
                    <ReceiptText size={14} className="text-muted-foreground" /> Party GSTIN
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="customerGstin"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                      placeholder="Enter Party GSTIN (optional)"
                      className="uppercase flex-grow"
                      maxLength={15}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleVerifyGst}
                      disabled={isVerifyingGst || customerGstin.length !== 15}
                      className="shrink-0"
                    >
                      {isVerifyingGst ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="placeOfSupply" className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-muted-foreground" /> Place of Supply
                  </Label>
                  <Input
                    id="placeOfSupply"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    placeholder="e.g. Maharashtra (27)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="billingAddress">Billing Address</Label>
                  <Textarea
                    id="billingAddress"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    placeholder="Enter complete billing address"
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shippingAddress">Shipping Address</Label>
                  <Textarea
                    id="shippingAddress"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Enter shipping address (if different)"
                    rows={2}
                  />
                </div>
              </>
            )}

            <div className={cn("space-y-1.5", (mode === 'buy' || mode === 'return') ? "md:col-span-2" : "md:col-span-2")}>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this bill (optional)"
              />
            </div>
          </div>

          <div className="flex justify-end w-full mt-2">
            <div className="w-full md:w-1/3 space-y-1.5 px-1">
              <Label>Bill Date</Label>
              <DatePicker date={billDate} setDate={setBillDate} />
            </div>
          </div>

          <Separator className="my-2" />

          <div className="flex flex-col items-end gap-0.5 text-sm">
            {(mode === 'sell' || mode === 'return') && !isEstimateMode && ((billTotals.totalSGST ?? 0) > 0 || (billTotals.totalCGST ?? 0) > 0 || currentBillItems.some(i => !i.isAdditionalCharge && !i.productId.startsWith('SERVICE_ITEM_'))) && (
              <>
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-muted-foreground">Subtotal (Before Tax):</span>
                  <span className="font-medium text-foreground">₹{(billTotals.subTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-muted-foreground">Total SGST:</span>
                  <span className="font-medium text-foreground">₹{(billTotals.totalSGST || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-muted-foreground">Total CGST:</span>
                  <span className="font-medium text-foreground">₹{(billTotals.totalCGST || 0).toFixed(2)}</span>
                </div>
                <Separator className="my-1.5 w-full max-w-xs" />
              </>
            )}
            {mode === 'buy' && (
              <div className="flex justify-between w-full max-w-xs">
                <span className="text-muted-foreground">Total Cost:</span>
                <span className="font-semibold text-destructive">₹{(billTotals.grandTotal || 0).toFixed(2)}</span>
              </div>
            )}
            {(mode === 'sell' || mode === 'return') && (
              <div className="flex justify-between w-full max-w-xs text-lg font-semibold text-primary">
                <span>{isEstimateMode && mode === 'sell' ? 'Estimate Total:' : 'Grand Total:'}</span>
                <span>₹{(billTotals.grandTotal || 0).toFixed(2)}</span>
              </div>
            )}
          </div>

          {(mode === 'sell' || mode === 'buy') && (
            <div className="flex items-center space-x-2 self-start pt-2">
              <Switch
                id="paymentStatus"
                checked={isPaid}
                onCheckedChange={setIsPaid}
                className={cn(isPaid ? "data-[state=checked]:bg-green-500" : "data-[state=unchecked]:bg-destructive")}
              />
              <Label htmlFor="paymentStatus" className={cn("font-medium", isPaid ? "text-green-600 dark:text-green-500" : "text-destructive")}>
                {isPaid ? 'Paid' : 'Unpaid'}
              </Label>
            </div>
          )}

          {isEstimateMode && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <Info size={14} className="text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Estimate: GST Excluded (Base Price Only)</span>
            </div>
          )}


          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={resetFullForm} className="flex-1">
              <Eraser className="mr-2 h-4 w-4" /> Clear Bill
            </Button>
            <Button
              onClick={handleSaveBill}
              className="flex-1"
              disabled={currentBillItems.length === 0 || isVerifyEmployeeDialogOpen || (isAdminContext && activePlan?.id !== SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY && allStores.length === 0 && activePlan && activePlan.maxStores > 0)}
            >
              <Save className="mr-2 h-4 w-4" /> Save Bill
            </Button>
          </div>
        </CardFooter>
      </Card >

      <EmployeePasskeyDialog
        isOpen={isVerifyEmployeeDialogOpen}
        onOpenChange={setIsVerifyEmployeeDialogOpen}
        storeId={pendingBillPayload?.storeIdForBill || finalStoreIdForSkuDetails || ""}
        companyId={companyId}
        onAuthenticated={handleEmployeeVerifiedForBill}
      />

      <NewProductDialog
        isOpen={isNewProductDialogOpen}
        onOpenChange={setIsNewProductDialogOpen}
        initialValues={newProductDialogInitialValues}
        onProductAdded={handleNewProductAddedFromDialog}
      />

      <BillSaveAnimation show={isSavingAnimationVisible} billMode={lastSavedBillMode || 'sell'} isEstimate={lastSavedBillIsEstimate} onClose={handleAnimationClose} />

      <HardwareBarcodeScanModal
        isOpen={isBarcodeModalOpen}
        onOpenChange={setIsBarcodeModalOpen}
        onScan={handleBarcodeScannedFromModal}
      />

      <AlertDialog open={isPrintConfirmDialogOpen} onOpenChange={setIsPrintConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bill Saved Successfully!</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to print the receipt now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (billToPotentiallyPrint) {
                triggerPrint(generateBillPrintContent(billToPotentiallyPrint, userProfile, allProductsStoreHook, allStores));
              }
            }}>Print Receipt</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
