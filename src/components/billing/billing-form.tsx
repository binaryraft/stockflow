
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductSearchInput } from './product-search-input';
import { NewProductDialog } from './new-product-dialog';
import { BillItemRow, BillItemHeader } from './bill-item-row';
import type { Product, BillItem, BillMode } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, Eraser, ShoppingBag, Send, RotateCcw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import { Separator } from '../ui/separator';

export function BillingForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { getProductByName, getProductById, addBill, searchProducts } = useInventoryStore();

  const [mode, setMode] = useState<BillMode>((searchParams.get('mode') as BillMode) || 'sell');
  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([]);
  const [customerVendorName, setCustomerVendorName] = useState('');
  const [notes, setNotes] = useState('');
  
  // For new product entry
  const [productNameQuery, setProductNameQuery] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [costPrice, setCostPrice] = useState<number | string>('');
  const [sellPrice, setSellPrice] = useState<number | string>('');

  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [newProductInitialName, setNewProductInitialName] = useState('');
  const [returnItemIsDefective, setReturnItemIsDefective] = useState(false);


  // Input Refs for keyboard navigation
  const productNameInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const costPriceInputRef = useRef<HTMLInputElement>(null);
  const sellPriceInputRef = useRef<HTMLInputElement>(null);
  const customerVendorNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const queryMode = searchParams.get('mode') as BillMode;
    if (queryMode && ['buy', 'sell', 'return'].includes(queryMode)) {
      setMode(queryMode);
    }
    productNameInputRef.current?.focus();
  }, [searchParams]);

  const resetFormFields = useCallback(() => {
    setProductNameQuery('');
    setQuantity(1);
    setCostPrice('');
    setSellPrice('');
    setReturnItemIsDefective(false);
    productNameInputRef.current?.focus();
  }, []);

  const handleProductSelect = (product: Product) => {
    setProductNameQuery(product.name); // Keep name in input for confirmation
    if (mode === 'sell' || mode === 'return') {
      setCostPrice(product.costPrice); // For reference
      setSellPrice(product.sellPrice);
      quantityInputRef.current?.focus();
    } else if (mode === 'buy') {
      setCostPrice(product.costPrice);
      setSellPrice(product.sellPrice);
      quantityInputRef.current?.focus(); // Or costPriceInputRef if preferred
    }
  };

  const handleAddNewItem = () => {
    if (!productNameQuery || (typeof quantity === 'string' && parseInt(quantity) <=0) || (typeof quantity === 'number' && quantity <= 0)) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please enter product name and valid quantity." });
      return;
    }

    let product = getProductByName(productNameQuery);

    if (!product) {
      setNewProductInitialName(productNameQuery);
      setIsNewProductDialogOpen(true);
      return; // Wait for dialog
    }

    if (mode === 'sell' && product.trackQuantity && product.quantityInStock < (typeof quantity === 'string' ? parseInt(quantity) : quantity)) {
      toast({ variant: "destructive", title: "Insufficient Stock", description: `Only ${product.quantityInStock} of ${product.name} available.` });
      return;
    }
    
    const newItemCostPrice = mode === 'buy' ? (parseFloat(costPrice.toString()) || product.costPrice) : product.costPrice;
    const newItemSellPrice = (mode === 'buy' || mode === 'sell') ? (parseFloat(sellPrice.toString()) || product.sellPrice) : product.sellPrice;


    const newItem: BillItem = {
      id: uuidv4(), // Temporary ID for UI list
      productId: product.id,
      productName: product.name,
      quantity: typeof quantity === 'string' ? parseInt(quantity) : quantity,
      costPrice: newItemCostPrice,
      sellPrice: newItemSellPrice,
      isDefective: mode === 'return' ? returnItemIsDefective : undefined,
    };

    setCurrentBillItems(prevItems => [...prevItems, newItem]);
    resetFormFields();
  };
  
  const handleEnterNavigation = (currentField: 'productName' | 'quantity' | 'costPrice' | 'sellPrice') => {
    if (currentField === 'productName') {
       const productsFound = searchProducts(productNameQuery);
       if (productsFound.length === 1) { // Auto-select if only one match, or exact match
            handleProductSelect(productsFound[0]);
            // quantityInputRef.current?.focus(); // handleProductSelect already focuses quantity
       } else if (productsFound.length > 1) {
            // keep focus on product name, user needs to arrow down or click
       } else { // No product found
            quantityInputRef.current?.focus(); // or open new product dialog
       }
    } else if (currentField === 'quantity') {
      if (mode === 'buy') costPriceInputRef.current?.focus();
      else handleAddNewItem(); // For sell/return, add item after quantity
    } else if (currentField === 'costPrice') {
      if (mode === 'buy') sellPriceInputRef.current?.focus();
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
      quantity: item.quantity,
      costPrice: item.costPrice,
      sellPrice: item.sellPrice,
      isDefective: item.isDefective,
    }));

    addBill({
      type: mode,
      vendorOrCustomerName: customerVendorName,
      notes: notes,
    }, billItemsForStore);

    toast({ title: "Bill Saved", description: `Bill (${mode.toUpperCase()}) has been successfully saved.` });
    setCurrentBillItems([]);
    setCustomerVendorName('');
    setNotes('');
    resetFormFields();
    router.push('/billing'); // Navigate to history view on the same page
  };
  
  const onNewProductAddedFromDialog = (product: Product) => {
    setProductNameQuery(product.name);
    if (mode === 'buy') {
        setCostPrice(product.costPrice);
        setSellPrice(product.sellPrice);
    } else { // sell or return
        setSellPrice(product.sellPrice);
        setCostPrice(product.costPrice); // set cost for reference
    }
    quantityInputRef.current?.focus();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6"> {/* Removed h-full, parent flex context manages height */}
      <NewProductDialog
        isOpen={isNewProductDialogOpen}
        onOpenChange={setIsNewProductDialogOpen}
        initialProductName={newProductInitialName}
        onProductAdd={onNewProductAddedFromDialog}
      />

      {/* Left Panel: Item Entry */}
      <Card className="flex-1 lg:max-w-md xl:max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Add Item to Bill</CardTitle>
           <CardDescription>
            {mode === 'buy' ? 'Enter details for purchased items.' : 
             mode === 'sell' ? 'Enter items being sold.' : 
             'Enter items being returned.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="productName">Product Name</Label>
            <ProductSearchInput
              inputRef={productNameInputRef}
              value={productNameQuery}
              onValueChange={setProductNameQuery}
              onProductSelect={handleProductSelect}
              onEnterWithoutSelection={() => handleEnterNavigation('productName')}
              placeholder={mode === 'return' ? 'Search product being returned' : 'Scan or type product name'}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              ref={quantityInputRef}
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || '')}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('quantity'))}
              min="1"
            />
          </div>

          {mode === 'buy' && (
            <>
              <div className="space-y-1">
                <Label htmlFor="costPrice">Cost Price (per unit)</Label>
                <Input
                  id="costPrice"
                  ref={costPriceInputRef}
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || '')}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('costPrice'))}
                  step="0.01" min="0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sellPrice">Sell Price (per unit)</Label>
                <Input
                  id="sellPrice"
                  ref={sellPriceInputRef}
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(parseFloat(e.target.value) || '')}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('sellPrice'))}
                  step="0.01" min="0"
                />
              </div>
            </>
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


          <Button onClick={handleAddNewItem} className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> Add to Bill
          </Button>
        </CardContent>
      </Card>

      {/* Right Panel: Current Bill & Actions */}
      {/* Removed max-h-[calc(100vh-150px)], CardContent is now flex-1 to manage height */}
      <Card className="flex-[2] shadow-lg flex flex-col"> 
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-xl">Current Bill</CardTitle>
                    <CardDescription>Review items before saving the bill.</CardDescription>
                </div>
                <Tabs value={mode} onValueChange={(val) => setMode(val as BillMode)}>
                    <TabsList>
                    <TabsTrigger value="sell" className="flex items-center gap-1"><Send size={16}/>Sell</TabsTrigger>
                    <TabsTrigger value="buy" className="flex items-center gap-1"><ShoppingBag size={16}/>Buy</TabsTrigger>
                    <TabsTrigger value="return" className="flex items-center gap-1"><RotateCcw size={16}/>Return</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </CardHeader>
        {/* CardContent uses flex-1 to grow and ScrollArea within it handles overflow */}
        <CardContent className="flex-1 flex flex-col overflow-hidden space-y-3">
          <div className="space-y-1">
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
          
          {currentBillItems.length > 0 && <BillItemHeader mode={mode} />}
          {/* ScrollArea is flex-1 to use available space from its parent CardContent */}
          <ScrollArea className="flex-1 -mx-6 px-6"> 
            {currentBillItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No items in the bill yet.</p>
            ) : (
              <div className="space-y-0">
                {currentBillItems.map((item, index) => (
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
        </CardContent>
        <Separator/>
        <CardFooter className="flex-col items-stretch gap-3 pt-4">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
            {mode === 'buy' && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Potential Sell Value:</span>
                <span>${calculatePotentialSellTotalForBuy().toFixed(2)}</span>
              </div>
            )}
             <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Input 
                    id="notes" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Add any notes for this bill (optional)" 
                />
            </div>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => { setCurrentBillItems([]); resetFormFields(); setCustomerVendorName(''); setNotes('')}} className="flex-1">
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
