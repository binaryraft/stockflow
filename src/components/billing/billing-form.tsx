
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductSearchInput } from './product-search-input';
import { NewProductDialog } from './new-product-dialog';
import { BillItemRow, BillItemHeader } from './bill-item-row';
import type { Product, BillItem, BillMode } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, Eraser, ShoppingBag, Send, RotateCcw, Edit3, CornerDownLeft, Info, CircleDollarSign } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BillSaveAnimation } from './bill-save-animation';


interface NewProductDialogInitialValues {
  name: string;
  quantity?: number;
  costPrice?: number;
  sellPrice?: number;
}

interface BillingFormProps {
  billedByStaffId?: string;
  storeId?: string;
}

export function BillingForm({ billedByStaffId, storeId }: BillingFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { getProductByName, addBill, searchProducts, getProductById } = useInventoryStore();

  const [mode, setMode] = useState<BillMode>((searchParams.get('mode') as BillMode) || 'sell');
  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([]);
  const [customerVendorName, setCustomerVendorName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  
  const [productNameQuery, setProductNameQuery] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [costPrice, setCostPrice] = useState<number | string>('');
  const [sellPrice, setSellPrice] = useState<number | string>('');

  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [newProductDialogInitialValues, setNewProductDialogInitialValues] = useState<NewProductDialogInitialValues>({ name: '' });
  const [returnItemIsDefective, setReturnItemIsDefective] = useState(false);
  const [editingProductFromBill, setEditingProductFromBill] = useState<Product | null>(null);
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


  useEffect(() => {
    const queryMode = searchParams.get('mode') as BillMode;
    if (queryMode && ['buy', 'sell', 'return'].includes(queryMode)) {
      setMode(queryMode);
    }
    productNameInputRef.current?.focus();
  }, [searchParams]);

  const resetFormFields = useCallback((focusProductName = true) => {
    setProductNameQuery('');
    setQuantity(1);
    setCostPrice('');
    setSellPrice('');
    setReturnItemIsDefective(false);
    setCurrentProductForSelection(null);
    setSelectedVariantOptions({});
    setVariantDropdownOpenState({});
    setProductNotFoundHint('');
    if (focusProductName) {
      productNameInputRef.current?.focus();
    }
  }, []);

  const resetFullForm = useCallback(() => {
    setCurrentBillItems([]);
    setCustomerVendorName('');
    setCustomerPhone('');
    setNotes('');
    setServiceDescription('');
    setServiceAmount('');
    resetFormFields(true);
  }, [resetFormFields]);
  

  const handleProductSelect = (product: Product) => {
    setProductNameQuery(product.name);
    setCurrentProductForSelection(product);
    setSelectedVariantOptions({});
    setVariantDropdownOpenState({}); 
    setProductNotFoundHint('');
  
    if (mode === 'sell' || mode === 'return') {
      setCostPrice(product.costPrice);
      setSellPrice(product.sellPrice);
    } else if (mode === 'buy') { 
      setCostPrice(product.costPrice);
      setSellPrice(product.sellPrice);
    }
  
    if (product.variants && product.variants.length > 0) {
      const firstVariantId = product.variants[0].id;
      setVariantDropdownOpenState({ [firstVariantId]: true });
    } else {
      quantityInputRef.current?.focus();
      quantityInputRef.current?.select();
    }
  };
  
   useEffect(() => {
    if (currentProductForSelection?.variants && currentProductForSelection.variants.length > 0) {
      const firstOpenVariantId = Object.keys(variantDropdownOpenState).find(id => variantDropdownOpenState[id]);
      if (firstOpenVariantId) {
        const firstVariantRef = variantSelectRefs.current[firstOpenVariantId];
        setTimeout(() => { 
            if (firstVariantRef?.current) {
                firstVariantRef.current.focus();
            } else { 
                const el = document.getElementById(`variant-select-${firstOpenVariantId}-trigger`);
                (el as HTMLElement)?.focus();
            }
        }, 50); // Small delay
      }
    }
  }, [currentProductForSelection, variantDropdownOpenState]);


  useEffect(() => {
    if (currentProductForSelection && currentProductForSelection.variants && currentProductForSelection.variants.length > 0) {
      const allVariantsSelected = currentProductForSelection.variants.every(
        (v) => selectedVariantOptions[v.name]
      );
      if (allVariantsSelected) {
        const anyDropdownOpen = Object.values(variantDropdownOpenState).some(isOpen => isOpen);
        const activeElement = document.activeElement;
        const isQuantityFocused = activeElement?.id === quantityInputRef.current?.id;

        const isVariantSelectFocused = currentProductForSelection.variants.some(variant => 
            activeElement?.id === `variant-select-${variant.id}-trigger`
        );

        if (!anyDropdownOpen && !isVariantSelectFocused && !isQuantityFocused) {
             quantityInputRef.current?.focus();
             quantityInputRef.current?.select();
        }
      }
    }
  }, [selectedVariantOptions, currentProductForSelection, variantDropdownOpenState]);


  const handleAddNewItem = () => {
    if (!productNameQuery || (typeof quantity === 'string' && parseInt(quantity) <=0) || (typeof quantity === 'number' && quantity <= 0)) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please enter product name and valid quantity." });
      return;
    }

    let product = currentProductForSelection || getProductByName(productNameQuery);

    if (!product) {
      setNewProductDialogInitialValues({
        name: productNameQuery,
        quantity: mode === 'buy' ? (typeof quantity === 'string' ? parseInt(quantity) || 0 : quantity || 0) : undefined,
        costPrice: mode === 'buy' ? (typeof costPrice === 'string' ? parseFloat(costPrice) || 0 : costPrice || 0) : undefined,
        sellPrice: mode === 'buy' ? (typeof sellPrice === 'string' ? parseFloat(sellPrice) || 0 : sellPrice || 0) : undefined,
      });
      setIsNewProductDialogOpen(true);
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


    if (mode === 'sell' && product.trackQuantity && product.quantityInStock < (typeof quantity === 'string' ? parseInt(quantity) : quantity)) {
      toast({ variant: "destructive", title: "Insufficient Stock", description: `Only ${product.quantityInStock} of ${product.name} available.` });
      return;
    }
    
    const newItemCostPrice = mode === 'buy' ? (parseFloat(costPrice.toString()) || product.costPrice) : product.costPrice;
    const newItemSellPrice = (mode === 'buy' || mode === 'sell') ? (parseFloat(sellPrice.toString()) || product.sellPrice) : product.sellPrice;

    const newItem: BillItem = {
      id: uuidv4(),
      productId: product.id,
      productName: product.name,
      quantity: typeof quantity === 'string' ? parseInt(quantity) : quantity,
      costPrice: newItemCostPrice,
      sellPrice: newItemSellPrice,
      isDefective: mode === 'return' ? returnItemIsDefective : undefined,
      selectedVariantOptions: (product.variants && product.variants.length > 0) ? { ...selectedVariantOptions } : undefined,
    };

    setCurrentBillItems(prevItems => [...prevItems, newItem]);
    resetFormFields(true); 
  };
  
  const handleEnterNavigation = (currentField: 'productName' | 'quantity' | 'costPrice' | 'sellPrice') => {
    if (currentField === 'productName') {
       const productsFound = searchProducts(productNameQuery);
       if (productsFound.length === 1 && !currentProductForSelection) { 
            handleProductSelect(productsFound[0]); 
       } else if (productsFound.length > 1 && !currentProductForSelection) {
            productNameInputRef.current?.focus(); 
       } else { 
            if (productNotFoundHint === productNameQuery && !currentProductForSelection) { 
                setNewProductDialogInitialValues({
                    name: productNameQuery,
                    quantity: mode === 'buy' ? (typeof quantity === 'string' ? parseInt(quantity) || 1 : quantity || 1) : undefined,
                    costPrice: mode === 'buy' ? (typeof costPrice === 'string' ? parseFloat(costPrice) || 0 : costPrice || 0) : undefined,
                    sellPrice: mode === 'buy' ? (typeof sellPrice === 'string' ? parseFloat(sellPrice) || 0 : sellPrice || 0) : undefined,
                  });
                setIsNewProductDialogOpen(true);
                setProductNotFoundHint(''); 
            } else if (!currentProductForSelection && productNameQuery.trim() !== '') {
                setProductNotFoundHint(productNameQuery); 
            } else if (currentProductForSelection) { 
                if (!currentProductForSelection.variants || currentProductForSelection.variants.length === 0) {
                     quantityInputRef.current?.focus();
                     quantityInputRef.current?.select();
                } else {
                    const firstUnselectedVariant = currentProductForSelection.variants.find(v => !selectedVariantOptions[v.name]);
                    if(firstUnselectedVariant){
                        setVariantDropdownOpenState(prev => ({ ...prev, [firstUnselectedVariant.id]: true }));
                    } else { 
                        quantityInputRef.current?.focus();
                        quantityInputRef.current?.select();
                    }
                }
            }
       }
    } else if (currentField === 'quantity') {
      if (mode === 'buy') { 
        costPriceInputRef.current?.focus();
        costPriceInputRef.current?.select();
      }
      else handleAddNewItem(); 
    } else if (currentField === 'costPrice') {
      if (mode === 'buy') { 
        sellPriceInputRef.current?.focus();
        sellPriceInputRef.current?.select();
      }
    } else if (currentField === 'sellPrice') {
      if (mode === 'buy') handleAddNewItem(); 
    }
  };

  const updateBillItem = (itemId: string, updates: Partial<BillItem>) => {
    setCurrentBillItems(prevItems =>
      prevItems.map(item => (item.id === itemId ? { ...item, ...updates } : item))
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

  const handleSaveBill = () => {
    if (currentBillItems.length === 0) {
      toast({ variant: "destructive", title: "Empty Bill", description: "Please add items to the bill." });
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

    addBill({
      type: mode,
      vendorOrCustomerName: customerVendorName,
      customerPhone: customerPhone,
      notes: notes,
      billedByStaffId: billedByStaffId, // Pass staffId if available
      storeId: storeId, // Pass storeId if available
    }, billItemsForStore);
    
    const modeDisplay = mode === 'sell' ? 'Sales' : mode === 'buy' ? 'Expense' : 'Return';
    toast({ title: "Bill Saved", description: `${modeDisplay} Bill has been successfully saved.` });
    
    setLastSavedBillMode(mode);
    setIsSavingAnimationVisible(true);
  };

  const handleAnimationClose = () => {
    setIsSavingAnimationVisible(false);
    setLastSavedBillMode(null);
    resetFullForm();
    // For general billing page, redirect to history. Store view might stay on the form.
    if (!storeId) {
      router.push('/billing'); 
    } else {
      // In store view, just reset form, focus product name for next entry
      productNameInputRef.current?.focus();
    }
  };
  
  const onNewProductAddedFromDialog = (product: Product) => {
    handleProductSelect(product); 
    productNameInputRef.current?.focus();
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as BillMode);
    // Preserve store context if in store view
    const basePath = storeId ? `/store/${storeId}/billing` : '/billing';
    router.push(`${basePath}?action=new&mode=${newMode}`, { scroll: false });
    resetFullForm();
  };

  const handleEditProductClick = () => {
    if (currentProductForSelection) {
      setEditingProductFromBill(currentProductForSelection);
      setIsNewProductDialogOpen(true);
    }
  };

  const handleAddServiceItem = () => {
    if (!serviceDescription || !serviceAmount || parseFloat(serviceAmount.toString()) <= 0) {
      toast({ variant: "destructive", title: "Missing Service Info", description: "Please enter service description and a valid amount." });
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
    serviceDescriptionInputRef.current?.focus();
  };


  return (
    <div className="flex flex-col gap-6">
        <BillSaveAnimation 
          show={isSavingAnimationVisible}
          billMode={lastSavedBillMode}
          onClose={handleAnimationClose}
        />
        <div className="flex justify-center">
            <Tabs value={mode} onValueChange={handleModeChange} className="w-auto">
            <TabsList className="grid w-full grid-cols-3 gap-1">
                <TabsTrigger 
                  value="sell" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
                >
                  <Send size={18}/>Sales
                </TabsTrigger>
                <TabsTrigger 
                  value="buy" 
                  className="flex items-center gap-2 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground dark:data-[state=active]:bg-destructive dark:data-[state=active]:text-destructive-foreground"
                >
                  <ShoppingBag size={18}/>Expense
                </TabsTrigger>
                <TabsTrigger 
                  value="return" 
                  className="flex items-center gap-2 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-900 dark:data-[state=active]:bg-amber-500 dark:data-[state=active]:text-amber-950"
                >
                  <RotateCcw size={18}/>Return
                </TabsTrigger>
            </TabsList>
            </Tabs>
        </div>
      <NewProductDialog
        isOpen={isNewProductDialogOpen}
        onOpenChange={(open) => {
          setIsNewProductDialogOpen(open);
          if (!open) {
            setNewProductDialogInitialValues({ name: '' });
            setEditingProductFromBill(null); 
            productNameInputRef.current?.focus(); 
          }
        }}
        editingProduct={editingProductFromBill}
        initialProductName={newProductDialogInitialValues.name}
        initialQuantityForDialog={newProductDialogInitialValues.quantity}
        initialCostPriceForDialog={newProductDialogInitialValues.costPrice}
        initialSellPriceForDialog={newProductDialogInitialValues.sellPrice}
        onProductAdd={onNewProductAddedFromDialog}
      />

      <Card className="w-full shadow-lg flex flex-col border-t-2 border-t-primary"> 
          <CardContent className="flex-1 flex flex-col overflow-hidden space-y-4 p-6">
            
            <div className="space-y-4 pb-4 border-b border-dashed mb-4">
              <h3 className="text-lg font-medium text-foreground">Add Item</h3>
              <div className={cn(
                "grid gap-4 items-baseline",
                "grid-cols-1", 
                mode === 'buy' ? "md:grid-cols-[1fr_auto_auto_auto]" : "md:grid-cols-[1fr_auto]" 
              )}>
                  <div className="space-y-1.5"> 
                    <Label htmlFor="productNameGlobal">Product Name</Label>
                    <div className="flex items-center gap-2">
                        <ProductSearchInput
                        inputRef={productNameInputRef}
                        value={productNameQuery}
                        onValueChange={(v) => { setProductNameQuery(v); if (!v) setCurrentProductForSelection(null); setProductNotFoundHint('');}}
                        onProductSelect={handleProductSelect}
                        onEnterWithoutSelection={() => handleEnterNavigation('productName')}
                        placeholder={mode === 'return' ? 'Search product being returned' : 'Scan or type product name'}
                        id="productNameGlobal"
                        className="flex-grow"
                        />
                        {currentProductForSelection && (
                        <Button variant="ghost" size="icon" onClick={handleEditProductClick} className="shrink-0" aria-label="Edit selected product">
                            <Edit3 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        )}
                    </div>
                     {currentProductForSelection && <span className="text-xs text-muted-foreground ml-1">Selected: {currentProductForSelection.name}</span>}
                     {productNotFoundHint && productNameQuery === productNotFoundHint && (
                        <div className="bg-accent/10 text-accent-foreground p-2 rounded-md flex items-center gap-2 my-2 text-sm shadow">
                            <Info size={16} className="text-accent" />
                            Product '{productNotFoundHint}' not found. Press <CornerDownLeft size={16} className="inline text-primary dark:text-primary mx-1" /> Enter to add it.
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
                    />
                  </div>
                  {mode === 'buy' && (
                    <>
                    <div className="space-y-1.5 w-full md:w-32">  
                        <Label htmlFor="costPrice">Cost Price</Label>
                        <Input
                        id="costPrice"
                        ref={costPriceInputRef}
                        type="number"
                        value={costPrice}
                        onChange={(e) => setCostPrice(parseFloat(e.target.value) || '')}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('costPrice'))}
                        onFocus={(e) => e.target.select()}
                        step="0.01" min="0"
                        />
                    </div>
                    <div className="space-y-1.5 w-full md:w-32">  
                        <Label htmlFor="sellPrice">Sell Price</Label>
                        <Input
                        id="sellPrice"
                        ref={sellPriceInputRef}
                        type="number"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(parseFloat(e.target.value) || '')}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('sellPrice'))}
                        onFocus={(e) => e.target.select()}
                        step="0.01" min="0"
                        />
                    </div>
                    </>
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

                            const currentIndex = currentProductForSelection!.variants!.findIndex(v => v.id === variant.id);
                            if (currentIndex < currentProductForSelection!.variants!.length - 1) {
                                const nextVariantId = currentProductForSelection!.variants![currentIndex + 1].id;
                                setVariantDropdownOpenState((prev) => ({ ...prev, [nextVariantId]: true }));
                            } else {
                                quantityInputRef.current?.focus();
                                quantityInputRef.current?.select();
                            }
                        }}
                      >
                        <SelectTrigger 
                            id={`variant-select-${variant.id}-trigger`}
                            ref={variantSelectRefs.current[variant.id]}
                            className="w-full select-trigger-class" 
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (!variantDropdownOpenState[variant.id]) { 
                                        setVariantDropdownOpenState(prev => ({ ...prev, [variant.id]: true }));
                                    } else { 
                                        const currentIndex = currentProductForSelection!.variants!.findIndex(v => v.id === variant.id);
                                        if (currentIndex < currentProductForSelection!.variants!.length - 1) {
                                            const nextVariantId = currentProductForSelection!.variants![currentIndex + 1].id;
                                            setVariantDropdownOpenState((prev) => ({ ...prev, [variant.id]: false, [nextVariantId]: true }));
                                        } else {
                                            setVariantDropdownOpenState((prev) => ({ ...prev, [variant.id]: false }));
                                            quantityInputRef.current?.focus();
                                            quantityInputRef.current?.select();
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

              <Button onClick={handleAddNewItem} className="w-full mt-3 bg-primary hover:bg-primary/90" variant="default">
                <PlusCircle className="mr-2 h-4 w-4" /> Add to Bill
              </Button>
            </div>
            

            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                <Label htmlFor="customerVendorName">
                    {mode === 'buy' ? 'Vendor Name' : 'Customer Name'}
                </Label>
                <Input
                    id="customerVendorName"
                    ref={customerVendorNameInputRef}
                    value={customerVendorName}
                    onChange={(e) => setCustomerVendorName(e.target.value)}
                    placeholder={mode === 'buy' ? 'Enter vendor name (optional)' : 'Enter customer name (optional)'}
                />
                </div>
                <div className="space-y-1.5">
                <Label htmlFor="customerPhone">
                    {mode === 'buy' ? 'Vendor Phone' : 'Customer Phone'}
                </Label>
                <Input
                    id="customerPhone"
                    ref={customerPhoneInputRef}
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={mode === 'buy' ? 'Enter vendor phone (optional)' : 'Enter customer phone (optional)'}
                />
                </div>
            </div>
            
            {currentBillItems.length > 0 && <BillItemHeader mode={mode} />}
            <ScrollArea className="flex-1 -mx-6 px-6"> 
              {currentBillItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No items in the bill yet.</p>
              ) : (
                <div className="space-y-0">
                  {currentBillItems.map((item) => (
                    <BillItemRow
                      key={item.id}
                      item={item}
                      mode={mode}
                      onQuantityChange={(itemId, newQty) => updateBillItem(itemId, { quantity: newQty })}
                      onPriceChange={mode === 'buy' ? (itemId, newPrice, type) => updateBillItem(itemId, type === 'cost' ? { costPrice: newPrice } : { sellPrice: newPrice }) : undefined}
                      onRemoveItem={removeBillItem}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {(mode === 'sell' || mode === 'buy') && (
                <div className="pt-4 border-t border-dashed mt-4 space-y-3">
                    <h3 className="text-md font-medium text-foreground">Add Ad-hoc Service / Charge</h3>
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-end">
                        <div className="space-y-1.5">
                            <Label htmlFor="serviceDescription">Description</Label>
                            <Input 
                                id="serviceDescription"
                                ref={serviceDescriptionInputRef}
                                value={serviceDescription}
                                onChange={(e) => setServiceDescription(e.target.value)}
                                placeholder="e.g., Delivery Fee, Repair Service"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), serviceAmountInputRef.current?.focus(), serviceAmountInputRef.current?.select())}
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
                                placeholder="Amount"
                                step="0.01" 
                                min="0"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddServiceItem())}
                                onFocus={(e) => e.target.select()}
                            />
                        </div>
                        <Button onClick={handleAddServiceItem} variant="outline" className="self-end h-10">
                           <CircleDollarSign className="mr-2 h-4 w-4" /> Add Service
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
              {mode === 'buy' && (
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
