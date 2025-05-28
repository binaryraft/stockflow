
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductSearchInput } from './product-search-input';
import { BillItemRow, BillItemHeader } from './bill-item-row';
import type { Product, BillItem, BillMode, ProductSKU, Store, Staff, Bill } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, Eraser, ShoppingBag, Send, RotateCcw, Edit3, CornerDownLeft, Info, CircleDollarSign, Settings2, Building, LogInIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BillSaveAnimation } from './bill-save-animation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmployeePasskeyDialog } from './employee-passkey-dialog';

// Interface for values pre-filled from billing flow to new product page
interface NewProductPrefillParams {
  name?: string;
  quantity?: string;
  costPrice?: string;
  sellPrice?: string;
}

type PendingBillPayload = {
  billType: BillMode;
  vendorOrCustomerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentStatus?: 'paid' | 'unpaid';
  items: Omit<BillItem, 'id'|'productName'>[];
  storeIdForBill?: string;
};


interface BillingFormProps {
  storeId?: string; // storeIdFromProp
  allowedModes?: BillMode[];
  initialModeProp?: BillMode | null;
  isAdminContext?: boolean;
  // identifiedStaffProp?: Staff | null; // Removed as per new flow
  // onEmployeeIdentifiedForBill?: (staff: Staff) => void; // Removed as per new flow
}

export function BillingForm({
  storeId: storeIdFromProp,
  allowedModes,
  initialModeProp,
  isAdminContext = false,
}: BillingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { getProductByName, addBill, searchProducts, getProductById, getAllStores } = useInventoryStore();
  const allStores = getAllStores();

  const determineMode = useCallback((): BillMode => {
    const urlMode = initialModeProp || searchParams.get('mode') as BillMode | null;

    if (urlMode && ['sell', 'buy', 'return'].includes(urlMode)) {
        if (!allowedModes || (allowedModes && allowedModes.includes(urlMode))) {
            return urlMode;
        }
    }
    if (allowedModes && allowedModes.length > 0) {
      return allowedModes[0];
    }
    return 'sell'; 
  }, [initialModeProp, allowedModes, searchParams]);
  
  const [mode, setMode] = useState<BillMode>(determineMode());
  const [selectedStoreIdForAdmin, setSelectedStoreIdForAdmin] = useState<string | undefined>(
    isAdminContext && allStores.length === 1 ? allStores[0].id : undefined
  );

  const resetFormFields = useCallback((focusProductName = true) => {
    setProductNameQuery('');
    setQuantity(1);
    setCostPrice('');
    setSellPrice('');
    setCurrentSkuStock(null);
    setReturnItemIsDefective(false);
    setCurrentProductForSelection(null);
    setSelectedVariantOptions({});
    setVariantDropdownOpenState({});
    setProductNotFoundHint('');
    if (focusProductName) {
      setTimeout(() => productNameInputRef.current?.focus(), 0);
    }
  }, []);

  const resetFullForm = useCallback(() => {
    setCurrentBillItems([]);
    setCustomerVendorName('');
    setCustomerPhone('');
    setNotes('');
    setIsPaid(true);
    setServiceDescription('');
    setServiceAmount('');
    resetFormFields(true); 
  }, [resetFormFields]);


  useEffect(() => {
    const newDeterminedMode = determineMode();
    if (newDeterminedMode !== mode) {
      setMode(newDeterminedMode);
      resetFullForm();
    }
  }, [determineMode, mode, resetFullForm]);


  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([]);
  const [customerVendorName, setCustomerVendorName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isPaid, setIsPaid] = useState(true);

  const [productNameQuery, setProductNameQuery] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [costPrice, setCostPrice] = useState<number | string>('');
  const [sellPrice, setSellPrice] = useState<number | string>('');
  const [currentSkuStock, setCurrentSkuStock] = useState<number | null>(null);

  const [returnItemIsDefective, setReturnItemIsDefective] = useState(false);
  const [productNotFoundHint, setProductNotFoundHint] = useState('');

  const [currentProductForSelection, setCurrentProductForSelection] = useState<Product | null>(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const variantSelectRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});
  const [variantDropdownOpenState, setVariantDropdownOpenState] = useState<Record<string, boolean>>({});

  const [isSavingAnimationVisible, setIsSavingAnimationVisible] = useState(false);
  const [lastSavedBillMode, setLastSavedBillMode] = useState<BillMode | null>(null);

  const productNameInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const costPriceInputRef = useRef<HTMLInputElement>(null);
  const sellPriceInputRef = useRef<HTMLInputElement>(null);
  const customerVendorNameInputRef = useRef<HTMLInputElement>(null);
  const customerPhoneInputRef = useRef<HTMLInputElement>(null);

  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceAmount, setServiceAmount] = useState<number | string>('');
  const serviceDescriptionInputRef = useRef<HTMLInputElement>(null);
  const serviceAmountInputRef = useRef<HTMLInputElement>(null);

  const [isVerifyEmployeeDialogOpen, setIsVerifyEmployeeDialogOpen] = useState(false); 
  const [pendingBillPayload, setPendingBillPayload] = useState<PendingBillPayload | null>(null);

  useEffect(() => {
    setTimeout(() => productNameInputRef.current?.focus(), 0);
  }, [mode]); 

  const handleProductSelect = (product: Product) => {
    setProductNameQuery(product.name);
    setCurrentProductForSelection(product);
    setSelectedVariantOptions({});
    setProductNotFoundHint('');
    setCurrentSkuStock(null); 

    if (!product.variants || product.variants.length === 0) { 
        const defaultSku = product.productSKUs.find(sku => Object.keys(sku.optionValues).length === 0);
        if (defaultSku) {
            setCostPrice(mode === 'buy' ? (defaultSku.costPrice ?? '') : defaultSku.costPrice);
            setSellPrice(mode === 'buy' ? (defaultSku.sellPrice ?? '') : defaultSku.sellPrice);
            if(product.trackQuantity) setCurrentSkuStock(defaultSku.quantityInStock);
        } else { 
            setCostPrice(mode === 'buy' ? '' : 0);
            setSellPrice(mode === 'buy' ? '' : 0);
            if(product.trackQuantity) setCurrentSkuStock(0);
        }
        
        setTimeout(() => {
            quantityInputRef.current?.focus();
            quantityInputRef.current?.select();
        }, 50);

    } else { 
        setCostPrice(''); 
        setSellPrice('');
        const firstVariantId = product.variants[0].id;
        if (firstVariantId) {
            setVariantDropdownOpenState({ [firstVariantId]: true });
             setTimeout(() => {
                const elToFocus = variantSelectRefs.current[firstVariantId]?.current || document.getElementById(`variant-select-${firstVariantId}-trigger`);
                (elToFocus as HTMLElement)?.focus();
            }, 100);
        }
    }
  };

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
  }, [currentProductForSelection, variantDropdownOpenState]);

  useEffect(() => {
    if (currentProductForSelection?.variants && currentProductForSelection.variants.length > 0) {
      const allVariantsSelected = currentProductForSelection.variants.every(
        (v) => selectedVariantOptions[v.name]
      );

      if (allVariantsSelected) {
        const targetSku = currentProductForSelection.productSKUs.find(
          sku => JSON.stringify(Object.entries(sku.optionValues).sort().reduce((r, [k, v]) => (r[k] = v, r), {} as Record<string,string>)) ===
                 JSON.stringify(Object.entries(selectedVariantOptions).sort().reduce((r, [k, v]) => (r[k] = v, r), {} as Record<string,string>))
        );

        if (targetSku) {
          setCostPrice(mode === 'buy' ? (targetSku.costPrice ?? '') : targetSku.costPrice);
          setSellPrice(mode === 'buy' ? (targetSku.sellPrice ?? '') : targetSku.sellPrice);
          if(currentProductForSelection.trackQuantity) setCurrentSkuStock(targetSku.quantityInStock);
        } else {
          setCostPrice(mode === 'buy' ? '' : 0);
          setSellPrice(mode === 'buy' ? '' : 0);
          setCurrentSkuStock(currentProductForSelection.trackQuantity ? 0 : null);
        }
        
        const lastVariantId = currentProductForSelection.variants[currentProductForSelection.variants.length - 1].id;
        if (!variantDropdownOpenState[lastVariantId] && document.activeElement?.id !== quantityInputRef.current?.id) {
             setTimeout(() => {
                quantityInputRef.current?.focus();
                quantityInputRef.current?.select();
            }, 100); 
        }
      }
    }
  }, [selectedVariantOptions, currentProductForSelection, mode, variantDropdownOpenState]);


  const handleAddNewItem = () => {
    const currentQuantity = typeof quantity === 'string' ? parseInt(quantity) || 1 : quantity || 1;
    if (!productNameQuery || currentQuantity <= 0) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please enter product name and valid quantity." });
      productNameInputRef.current?.focus();
      return;
    }

    let product = currentProductForSelection || getProductByName(productNameQuery);

    if (!product) {
      const params: NewProductPrefillParams = { name: productNameQuery };
      if (mode === 'buy') {
        params.quantity = currentQuantity.toString();
        params.costPrice = (typeof costPrice === 'string' ? parseFloat(costPrice) : costPrice || 0).toString();
        params.sellPrice = (typeof sellPrice === 'string' ? parseFloat(sellPrice) : sellPrice || 0).toString();
      }
      const query = new URLSearchParams(params as Record<string, string>).toString();
      router.push(`/admin/products/add?${query}`);
      setProductNotFoundHint(''); 
      return;
    }

    if (product.variants && product.variants.length > 0) {
      const allVariantsSelected = product.variants.every(
        (v) => selectedVariantOptions[v.name]
      );
      if (!allVariantsSelected) {
        toast({ variant: "destructive", title: "Variant Selection Required", description: "Please select options for all product variants." });
        const firstUnselectedVariant = product.variants.find(v => !selectedVariantOptions[v.name]);
        if (firstUnselectedVariant) {
            setVariantDropdownOpenState(prev => ({ ...prev, [firstUnselectedVariant.id]: true }));
        }
        return;
      }
    }

    const targetOptionValues = (product.variants && product.variants.length > 0) ? selectedVariantOptions : {};
    let targetSku = product.productSKUs.find(
      sku => JSON.stringify(Object.entries(sku.optionValues).sort().reduce((r, [k, v]) => (r[k] = v, r), {} as Record<string,string>)) ===
             JSON.stringify(Object.entries(targetOptionValues).sort().reduce((r, [k, v]) => (r[k] = v, r), {} as Record<string,string>))
    );

    if ((mode === 'sell' || (mode === 'return' && !returnItemIsDefective)) && product.trackQuantity) {
      const stockToCheck = targetSku ? targetSku.quantityInStock : 0; 
      if (stockToCheck < currentQuantity) {
        toast({ variant: "destructive", title: "Insufficient Stock", description: `Only ${stockToCheck} of ${product.name} (selected variant) available.` });
        return;
      }
    }

    let itemCostPrice: number;
    let itemSellPrice: number;

    if (mode === 'buy') {
      itemCostPrice = parseFloat(costPrice.toString()) || 0;
      itemSellPrice = parseFloat(sellPrice.toString()) || 0;
       if (itemCostPrice <= 0 && itemSellPrice <= 0 && currentQuantity > 0) {
        toast({ variant: "destructive", title: "Invalid Prices", description: "Cost and/or Sell Price must be greater than 0 for purchases."});
        costPriceInputRef.current?.focus();
        return;
      }
    } else { 
      itemCostPrice = targetSku?.costPrice ?? 0; 
      itemSellPrice = targetSku?.sellPrice ?? 0;
      if (itemSellPrice <= 0 && mode === 'sell' && currentQuantity > 0 && !product.id?.startsWith('SERVICE_ITEM_')) { 
        toast({ variant: "destructive", title: "Invalid Sell Price", description: "Sell price for products must be greater than 0."});
        return;
      }
    }

    const newItem: BillItem = {
      id: uuidv4(),
      productId: product.id,
      productName: product.name,
      quantity: currentQuantity,
      costPrice: itemCostPrice,
      sellPrice: itemSellPrice,
      isDefective: mode === 'return' ? returnItemIsDefective : undefined,
      selectedVariantOptions: (product.variants && product.variants.length > 0) ? { ...selectedVariantOptions } : undefined,
    };

    setCurrentBillItems(prevItems => [...prevItems, newItem]);
    resetFormFields(true); 
  };

  const handleEnterNavigation = (currentField: 'productName' | 'quantity' | 'costPrice' | 'sellPrice' | 'serviceDescription' | 'serviceAmount') => {
    if (currentField === 'productName') {
       const productsFound = searchProducts(productNameQuery);
       if (productsFound.length === 1 && !currentProductForSelection && productNameQuery.toLowerCase() === productsFound[0].name.toLowerCase()) {
            handleProductSelect(productsFound[0]); 
       } else {
            if (currentProductForSelection) { 
                if (!currentProductForSelection.variants || currentProductForSelection.variants.length === 0) {
                     quantityInputRef.current?.focus();
                     quantityInputRef.current?.select();
                } else { 
                    const firstUnselectedVariant = currentProductForSelection.variants.find(v => !selectedVariantOptions[v.name]);
                    const firstVariantId = currentProductForSelection.variants[0]?.id;
                    if(firstUnselectedVariant && firstVariantId){
                        setVariantDropdownOpenState(prev => ({ ...prev, [firstVariantId]: true }));
                        setTimeout(() => {
                           const elToFocus = variantSelectRefs.current[firstVariantId]?.current || document.getElementById(`variant-select-${firstVariantId}-trigger`);
                           (elToFocus as HTMLElement)?.focus();
                        }, 100);
                    } else { 
                        quantityInputRef.current?.focus();
                        quantityInputRef.current?.select();
                    }
                }
            } else if (productNotFoundHint === productNameQuery && productNameQuery.trim() !== '') {
                const params: NewProductPrefillParams = { name: productNameQuery };
                if (mode === 'buy') {
                  const currentQty = typeof quantity === 'string' ? parseInt(quantity) || 1 : quantity || 1;
                  params.quantity = currentQty.toString();
                  params.costPrice = (typeof costPrice === 'string' ? parseFloat(costPrice) : costPrice || 0).toString();
                  params.sellPrice = (typeof sellPrice === 'string' ? parseFloat(sellPrice) : sellPrice || 0).toString();
                }
                const query = new URLSearchParams(params as Record<string, string>).toString();
                router.push(`/admin/products/add?${query}`);
                setProductNotFoundHint('');
            } else if (productNameQuery.trim() !== '') {
                setProductNotFoundHint(productNameQuery); 
            }
       }
    } else if (currentField === 'quantity') {
      if (mode === 'buy') {
        costPriceInputRef.current?.focus();
        costPriceInputRef.current?.select();
      } else if (mode === 'sell' || mode === 'return') {
        handleAddNewItem();
      }
    } else if (currentField === 'costPrice') {
      if (mode === 'buy') {
        sellPriceInputRef.current?.focus();
        sellPriceInputRef.current?.select();
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

  const updateBillItemQuantity = (itemId: string, newQuantity: number) => {
    setCurrentBillItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: Math.max(0, newQuantity) };
        }
        return item;
      })
    );
  };

  const updateBillItemPrice = (itemId: string, newPrice: number, priceType: 'cost' | 'sell') => {
    if (mode !== 'buy') return;
    setCurrentBillItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, [priceType === 'cost' ? 'costPrice' : 'sellPrice']: Math.max(0, newPrice) } : item
      )
    );
  };

  const removeBillItem = (itemId: string) => {
    setCurrentBillItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => {
    return currentBillItems.reduce((acc, item) => {
      const price = mode === 'buy' ? item.costPrice : item.sellPrice;
      return acc + (price * item.quantity);
    }, 0);
  };

  const calculatePotentialSellTotalForBuy = () => {
    if (mode !== 'buy') return 0;
    return currentBillItems.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
  };

  const proceedWithSave = (staffId: string) => {
    if (!pendingBillPayload) {
      toast({ variant: "destructive", title: "Error", description: "No bill data to save." });
      return;
    }

    const { billType, vendorOrCustomerName, customerPhone, notes, paymentStatus, items, storeIdForBill } = pendingBillPayload;

    addBill({
      type: billType,
      vendorOrCustomerName: vendorOrCustomerName,
      customerPhone: customerPhone,
      notes: notes,
      paymentStatus: paymentStatus,
      billedByStaffId: staffId,
      storeId: storeIdForBill,
    }, items);

    setLastSavedBillMode(billType);
    setIsSavingAnimationVisible(true);
    setPendingBillPayload(null); 
  };


  const handleSaveBill = () => {
    if (currentBillItems.length === 0) {
      toast({ variant: "destructive", title: "Empty Bill", description: "Please add items to the bill." });
      return;
    }

    const finalStoreId = isAdminContext ? selectedStoreIdForAdmin : storeIdFromProp;

    if (isAdminContext && allStores.length > 1 && !finalStoreId) {
      toast({ variant: "destructive", title: "Store Not Selected", description: "Please select a store for this bill." });
      return;
    }
     if (isAdminContext && allStores.length === 0 && !finalStoreId && !storeIdFromProp) {
        toast({ variant: "destructive", title: "No Stores Configured", description: "Please add stores in Store Management before creating bills." });
        return;
    }

    const billItemsForStore = currentBillItems.map(item => ({
      productId: item.productId,
      productName: item.productName, 
      quantity: item.quantity,
      costPrice: item.costPrice,
      sellPrice: item.sellPrice,
      isDefective: item.isDefective,
      selectedVariantOptions: item.selectedVariantOptions,
    }));

    const billPaymentStatus = (mode === 'sell' || mode === 'buy') ? (isPaid ? 'paid' : 'unpaid') : undefined;

    const currentBillPayload: PendingBillPayload = {
      billType: mode,
      vendorOrCustomerName: customerVendorName,
      customerPhone: customerPhone,
      notes: notes,
      paymentStatus: billPaymentStatus,
      items: billItemsForStore,
      storeIdForBill: finalStoreId,
    };
    
    if (!isAdminContext && storeIdFromProp) { 
        setPendingBillPayload(currentBillPayload);
        setIsVerifyEmployeeDialogOpen(true); 
    } else { 
      setPendingBillPayload(currentBillPayload); 
      proceedWithSave('admin_self_billed'); 
    }
  };

  const handleEmployeeVerifiedForBill = (staff: Staff) => {
    setIsVerifyEmployeeDialogOpen(false);
    if (pendingBillPayload) { 
      proceedWithSave(staff.id);
    } else {
        toast({ variant: "destructive", title: "Error", description: "Could not proceed with saving the bill after verification." });
    }
  };


  const handleAnimationClose = () => {
    setIsSavingAnimationVisible(false);
    setLastSavedBillMode(null);
    resetFullForm(); 

    if (isAdminContext) {
      const currentQueryModeInUrl = searchParams.get('mode');
      const basePath = '/admin/billing';
       if (currentQueryModeInUrl && ['sell', 'buy', 'return'].includes(currentQueryModeInUrl)) {
         router.push(`${basePath}?mode=${currentQueryModeInUrl}`); 
       } else {
         router.push(basePath); 
       }
    }
  };

  const handleModeChange = (newModeString: string) => {
    const newMode = newModeString as BillMode;
    if (allowedModes && allowedModes.length > 0 && !allowedModes.includes(newMode)) {
        toast({variant: "destructive", title: "Mode Not Allowed", description: `This terminal is not configured for ${newMode} operations.`});
        return;
    }

    if (newMode !== mode) {
        setMode(newMode);
        const basePath = isAdminContext ? '/admin/billing' : (storeIdFromProp ? `/storeportal/${storeIdFromProp}/billing` : '/admin/billing'); 
        router.push(`${basePath}?mode=${newMode}`, { scroll: false });
        resetFullForm(); 
    }
  };


  const handleEditProductClick = () => {
    if (currentProductForSelection) {
      router.push(`/admin/products/${currentProductForSelection.id}`);
    }
  };

  const handleAddServiceItem = () => {
    if (!serviceDescription || !serviceAmount || parseFloat(serviceAmount.toString()) <= 0) {
      toast({ variant: "destructive", title: "Missing Service Info", description: "Please enter service description and a valid amount." });
      serviceDescriptionInputRef.current?.focus();
      return;
    }
    const amount = parseFloat(serviceAmount.toString());
    const serviceItem: BillItem = {
      id: uuidv4(),
      productId: `SERVICE_ITEM_${uuidv4()}`, 
      productName: serviceDescription,
      quantity: 1,
      costPrice: mode === 'buy' ? amount : 0, 
      sellPrice: amount, 
      isDefective: undefined,
      selectedVariantOptions: undefined,
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
  
  return (
    <div className="flex flex-col gap-6">
      <BillSaveAnimation
        show={isSavingAnimationVisible}
        billMode={lastSavedBillMode}
        onClose={handleAnimationClose}
      />
      {(!isAdminContext && storeIdFromProp) && (
        <EmployeePasskeyDialog
          isOpen={isVerifyEmployeeDialogOpen}
          onOpenChange={(open) => {
              if(!open && isVerifyEmployeeDialogOpen) { 
                  setPendingBillPayload(null); 
              }
              setIsVerifyEmployeeDialogOpen(open);
          }}
          storeId={storeIdFromProp}
          onAuthenticated={handleEmployeeVerifiedForBill}
        />
      )}

      <div className="flex justify-center">
        <Tabs value={mode} onValueChange={handleModeChange} className="w-auto">
          <TabsList className="grid w-full grid-cols-3 gap-1">
            {displayModes.includes('sell') && (
              <TabsTrigger
                value="sell"
                className={cn("flex items-center gap-2 text-sm px-4 py-2", activeModeConfig.sell.color)}
              >
                <activeModeConfig.sell.icon size={18}/>{activeModeConfig.sell.label}
              </TabsTrigger>
            )}
            {displayModes.includes('buy') && (
              <TabsTrigger
                value="buy"
                className={cn("flex items-center gap-2 text-sm px-4 py-2", activeModeConfig.buy.color)}
              >
                <activeModeConfig.buy.icon size={18}/>{activeModeConfig.buy.label}
              </TabsTrigger>
            )}
            {displayModes.includes('return') && (
              <TabsTrigger
                value="return"
                className={cn("flex items-center gap-2 text-sm px-4 py-2", activeModeConfig.return.color)}
              >
                <activeModeConfig.return.icon size={18}/>{activeModeConfig.return.label}
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      <Card className="w-full shadow-lg flex flex-col border-t-2 border-t-primary">
        <CardContent className="flex-1 flex flex-col overflow-hidden space-y-4 p-6">
          {isAdminContext && allStores.length > 1 && (
              <div className="space-y-1.5 pb-4 border-b border-dashed mb-4">
                <Label htmlFor="adminStoreSelect" className="flex items-center gap-1.5 text-base font-medium">
                    <Building size={18} className="text-muted-foreground"/> Select Store for this Bill
                </Label>
                <Select value={selectedStoreIdForAdmin} onValueChange={setSelectedStoreIdForAdmin}>
                    <SelectTrigger id="adminStoreSelect" className="w-full md:w-1/2 select-trigger-class">
                        <SelectValue placeholder="Select a store..." />
                    </SelectTrigger>
                    <SelectContent>
                        {allStores.map(store => (
                            <SelectItem key={store.id} value={store.id}>{store.name} ({store.location})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 {isAdminContext && allStores.length > 1 && !selectedStoreIdForAdmin && <p className="text-xs text-destructive mt-1">Please select a store before saving the bill.</p>}
              </div>
          )}

          <div className="space-y-4 pb-4 border-b border-dashed">
            <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                <Settings2 size={20} className="text-muted-foreground"/> Add Item / Product
            </h3>
            <div className={cn(
              "grid gap-4 items-baseline", 
              "grid-cols-1",
              mode === 'buy' ? "md:grid-cols-[1fr_auto_auto_auto_auto]" : "md:grid-cols-[1fr_auto_auto]"
            )}>
              <div className="space-y-1.5 flex-grow">
                <Label htmlFor="productNameGlobal">Product Name</Label>
                <div className="flex items-center gap-2">
                  <ProductSearchInput
                    inputRef={productNameInputRef}
                    value={productNameQuery}
                    onValueChange={(v) => { setProductNameQuery(v); if (!v) {setCurrentProductForSelection(null); setProductNotFoundHint(''); setCurrentSkuStock(null);}}}
                    onProductSelect={handleProductSelect}
                    onEnterWithoutSelection={() => handleEnterNavigation('productName')}
                    placeholder={mode === 'return' ? 'Search product to return' : 'Scan or type product name'}
                    id="productNameGlobal"
                    className="flex-grow"
                  />
                  {currentProductForSelection && isAdminContext && ( 
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleEditProductClick} className="shrink-0" aria-label="Edit selected product">
                          <Edit3 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Edit {currentProductForSelection.name}</p></TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {currentProductForSelection && <span className="text-xs text-muted-foreground ml-1">Selected: {currentProductForSelection.name} {currentProductForSelection.trackQuantity && currentSkuStock !== null ? `(Stock: ${currentSkuStock})` : ''}</span>}
                {productNotFoundHint && productNameQuery === productNotFoundHint && (
                    <div className="bg-accent/10 text-accent-foreground p-2 rounded-md flex items-center gap-2 my-2 text-sm shadow">
                        <Info size={16} className="text-accent shrink-0" />
                        Product '{productNotFoundHint}' not found. Press <CornerDownLeft size={16} strokeWidth={2.5} className="inline text-primary dark:text-primary mx-0.5 shrink-0" /> Enter to add it.
                    </div>
                )}
              </div>

              <div className="space-y-1.5 w-full md:w-24">
                <Label htmlFor="quantityGlobal">Quantity</Label>
                <Input
                  id="quantityGlobal"
                  ref={quantityInputRef}
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || '')}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('quantity'))}
                  onFocus={(e) => e.target.select()}
                  min="1"
                  placeholder="1"
                />
              </div>
              {mode === 'buy' ? (
                <>
                  <div className="space-y-1.5 w-full md:w-32">
                    <Label htmlFor="costPrice">Cost Price/Unit</Label>
                    <Input
                      id="costPrice"
                      ref={costPriceInputRef}
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(parseFloat(e.target.value) || '')}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('costPrice'))}
                      onFocus={(e) => e.target.select()}
                      step="0.01" min="0" placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5 w-full md:w-32">
                    <Label htmlFor="sellPrice">Sell Price/Unit</Label>
                    <Input
                      id="sellPrice"
                      ref={sellPriceInputRef}
                      type="number"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(parseFloat(e.target.value) || '')}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('sellPrice'))}
                      onFocus={(e) => e.target.select()}
                      step="0.01" min="0" placeholder="0.00"
                    />
                  </div>
                  <Button onClick={handleAddNewItem} className="w-full md:w-auto self-end bg-primary hover:bg-primary/90" variant="default">
                     <PlusCircle className="mr-2 h-4 w-4" /> Add
                  </Button>
                </>
              ) : ( 
                 <Button onClick={handleAddNewItem} className="w-full md:w-auto self-end bg-primary hover:bg-primary/90" variant="default">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                 </Button>
              )}
            </div>

            {currentProductForSelection && currentProductForSelection.variants && currentProductForSelection.variants.length > 0 && (
              <div className={cn(`grid md:grid-cols-${Math.min(currentProductForSelection.variants.length, 3)} gap-4 mt-3 items-end`)}>
                {currentProductForSelection.variants.map((variant, index) => {
                   if (!variantSelectRefs.current[variant.id]) {
                      variantSelectRefs.current[variant.id] = React.createRef<HTMLButtonElement>();
                    }
                  return (
                    <div key={variant.id} className="space-y-1.5">
                      <Label htmlFor={`variant-select-${variant.id}-trigger`}>{variant.name}</Label>
                      <Select
                        open={variantDropdownOpenState[variant.id] || false}
                        onOpenChange={(isOpen) => {
                          setVariantDropdownOpenState((prev) => ({ ...prev, [variant.id]: isOpen }));
                        }}
                        value={selectedVariantOptions[variant.name] || ""}
                        onValueChange={(value) => {
                            setSelectedVariantOptions((prev) => ({ ...prev, [variant.name]: value }));
                            setVariantDropdownOpenState((prev) => ({ ...prev, [variant.id]: false })); 

                            const currentIndex = currentProductForSelection!.variants!.findIndex(v_ => v_.id === variant.id);
                            if (currentIndex < currentProductForSelection!.variants!.length - 1) {
                                const nextVariantId = currentProductForSelection!.variants![currentIndex + 1].id;
                                setTimeout(() => { 
                                  setVariantDropdownOpenState((prev) => ({ ...prev, [nextVariantId]: true }));
                                   const elToFocus = variantSelectRefs.current[nextVariantId]?.current || document.getElementById(`variant-select-${nextVariantId}-trigger`);
                                   (elToFocus as HTMLElement)?.focus();
                                }, 50); 
                            } else { 
                                setTimeout(() => {
                                   quantityInputRef.current?.focus();
                                   quantityInputRef.current?.select();
                                }, 50);
                            }
                        }}
                      >
                        <SelectTrigger
                          id={`variant-select-${variant.id}-trigger`}
                          ref={variantSelectRefs.current[variant.id]}
                          className="w-full select-trigger-class"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !variantDropdownOpenState[variant.id]) {
                                e.preventDefault();
                                setVariantDropdownOpenState(prev => ({ ...prev, [variant.id]: true }));
                            } else if (e.key === 'Enter' && variantDropdownOpenState[variant.id]) {
                               // Radix will handle selection
                            } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
                                if(!variantDropdownOpenState[variant.id]) { // only navigate if dropdown is closed
                                    e.preventDefault();
                                    const currentIndex = currentProductForSelection!.variants!.findIndex(v_ => v_.id === variant.id);
                                    if (currentIndex < currentProductForSelection!.variants!.length - 1) {
                                        const nextVariantId = currentProductForSelection!.variants![currentIndex + 1].id;
                                        const elToFocus = variantSelectRefs.current[nextVariantId]?.current || document.getElementById(`variant-select-${nextVariantId}-trigger`);
                                        (elToFocus as HTMLElement)?.focus();
                                    } else {
                                        quantityInputRef.current?.focus();
                                        quantityInputRef.current?.select();
                                    }
                                }
                            } else if (e.key === 'ArrowLeft') {
                                if(!variantDropdownOpenState[variant.id]) {
                                    e.preventDefault();
                                    const currentIndex = currentProductForSelection!.variants!.findIndex(v_ => v_.id === variant.id);
                                    if (currentIndex > 0) {
                                        const prevVariantId = currentProductForSelection!.variants![currentIndex - 1].id;
                                        const elToFocus = variantSelectRefs.current[prevVariantId]?.current || document.getElementById(`variant-select-${prevVariantId}-trigger`);
                                        (elToFocus as HTMLElement)?.focus();
                                    } else {
                                        productNameInputRef.current?.focus();
                                    }
                                }
                            }
                          }}
                        >
                          <SelectValue placeholder={`Select ${variant.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {variant.options.map((option) => (
                            <SelectItem key={option.id} value={option.value}>
                              {option.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )})}
              </div>
            )}

            {mode === 'return' && (
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="isDefective"
                  checked={returnItemIsDefective}
                  onCheckedChange={setReturnItemIsDefective}
                />
                <Label htmlFor="isDefective">Item is defective</Label>
              </div>
            )}
          </div>

          {/* Bill Items List */}
          <div className="flex-grow overflow-hidden">
            {currentBillItems.length > 0 && <BillItemHeader mode={mode} />}
            <ScrollArea className="flex-1 -mx-6 px-6 h-[200px] md:h-auto md:max-h-[300px]"> 
              {currentBillItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No items in the bill yet.</p>
              ) : (
                <div className="space-y-0">
                  {currentBillItems.map((item) => (
                    <BillItemRow
                      key={item.id}
                      item={item}
                      mode={mode}
                      onQuantityChange={updateBillItemQuantity}
                      onPriceChange={updateBillItemPrice}
                      onRemoveItem={removeBillItem}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Ad-hoc Service/Charge Section */}
          {(mode === 'sell' || mode === 'buy') && (
            <div className="pt-4 border-t border-dashed mt-auto space-y-3"> 
              <h3 className="text-md font-medium text-foreground flex items-center gap-2">
                <CircleDollarSign size={18} className="text-muted-foreground"/> Add Ad-hoc Service / Charge
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
                    onChange={(e) => setServiceAmount(parseFloat(e.target.value) || '')}
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
          )}
        </CardContent>
        <Separator className="my-0"/>
        <CardFooter className="flex-col items-stretch gap-4 pt-6">
          <div className="flex justify-between text-lg font-semibold text-foreground">
            <span>Total:</span>
            <span>₹{calculateTotal().toFixed(2)}</span>
          </div>
          {mode === 'buy' && currentBillItems.length > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Potential Sell Value:</span>
              <span>₹{calculatePotentialSellTotalForBuy().toFixed(2)}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this bill (optional)"
            />
          </div>
           {(mode === 'sell' || mode === 'buy') && (
            <div className="flex items-center space-x-2 pt-2">
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
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={resetFullForm} className="flex-1">
              <Eraser className="mr-2 h-4 w-4" /> Clear Bill
            </Button>
            <Button onClick={handleSaveBill} className="flex-1" disabled={currentBillItems.length === 0}>
              <Save className="mr-2 h-4 w-4" /> Save Bill
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

    