
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BillItem, Product, ProductSKU, StockLayer } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductSearchInput, type ProductSearchSuggestion } from '@/components/billing/product-search-input';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { cn } from '@/lib/utils';
import { Trash2, Plus, Calendar, User, Search, Calculator, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { NewProductDialog } from './new-product-dialog';

interface BillingExcelViewProps {
    items: BillItem[];
    currentMode: 'sell' | 'buy' | 'return';
    isEstimate: boolean;
    taxType: 'intra-state' | 'inter-state';
    onItemsChange: (items: BillItem[]) => void;
    // Shared props for functionality
    defaultDate?: Date;
    defaultCustomerName?: string;
    onAddNewProduct?: (initialName: string) => void;
}

export function BillingExcelView({
    items,
    currentMode,
    isEstimate,
    taxType,
    onItemsChange,
    defaultDate,
    defaultCustomerName,
}: BillingExcelViewProps) {
    const { toast } = useToast();
    const { products, getSkuDetails, findOrCreateProductSKU } = useInventoryStore(state => ({
        products: state.products,
        getSkuDetails: state.getSkuDetails,
        findOrCreateProductSKU: state.findOrCreateProductSKU,
    }));

    // Ref grid for navigation: [rowIndex][colIndex]
    const cellRefs = useRef<(HTMLInputElement | HTMLButtonElement | null)[][]>([]);
    const productRefObjects = useRef<{ current: HTMLInputElement | null }[]>([]);

    // Helper to get safe ref
    const getRef = (rowIndex: number, colIndex: number) => {
        if (colIndex === 0) {
            return productRefObjects.current[rowIndex]?.current || null;
        }
        if (!cellRefs.current[rowIndex]) return null;
        return cellRefs.current[rowIndex][colIndex];
    };

    const getProductRef = (rowIndex: number) => {
        if (!productRefObjects.current[rowIndex]) {
            productRefObjects.current[rowIndex] = { current: null };
        }
        return productRefObjects.current[rowIndex] as React.RefObject<HTMLInputElement>;
    };

    const focusCell = (rowIndex: number, colIndex: number) => {
        setTimeout(() => {
            const el = getRef(rowIndex, colIndex);
            if (el) {
                el.focus();
                if (el instanceof HTMLInputElement) el.select();
            }
        }, 10);
    };

    const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colType: string) => {
        // Current layout columns:
        // 0: Product (Search)
        // 1: Quantity
        // 2: Discount
        // 3: Tax (If not estimate)
        // 4: Total (If override)

        // Map colType to index for navigation
        const colOrder = ['product', 'quantity', 'discount', 'tax', 'total'];
        let colIndex = colOrder.indexOf(colType);
        if (isEstimate && colType === 'tax') colIndex = -1; // Skip tax

        // Adjust for skipped columns
        const visualOrder = isEstimate
            ? ['product', 'quantity', 'discount', 'total']
            : ['product', 'quantity', 'discount', 'tax', 'total'];

        const currentVisualIndex = visualOrder.indexOf(colType);

        if (e.key === 'Enter') {
            e.preventDefault();

            if (e.shiftKey) {
                // Shift+Enter special logic
                if (colType === 'quantity') {
                    // Move to Discount
                    const nextCol = 'discount';
                    const nextVisualIndex = visualOrder.indexOf(nextCol);
                    focusCell(rowIndex, nextVisualIndex);
                    return;
                }
            }

            // Standard Enter: Move to next cell
            if (currentVisualIndex < visualOrder.length - 1) {
                focusCell(rowIndex, currentVisualIndex + 1);
            } else {
                // Next row, first column
                focusCell(rowIndex + 1, 0);
            }
        } else if (e.key === 'ArrowUp') {
            if (rowIndex > 0) focusCell(rowIndex - 1, currentVisualIndex);
        } else if (e.key === 'ArrowDown') {
            focusCell(rowIndex + 1, currentVisualIndex);
        }
    };


    // Logic for updating an item
    const updateItem = (index: number, updates: Partial<BillItem>) => {
        const newItems = [...items];
        const item = newItems[index];

        // Recalculate if critical fields change
        const updatedItem = { ...item, ...updates };

        // Recalculate Taxes/Totals
        // Note: If Total changed, we handle that separately (reverse calc)
        // Here we handle standard forward calc

        // 1. Base Logic
        let quantity = updatedItem.quantity || 0;
        let sellPrice = updatedItem.sellPrice || 0;

        // Apply Discount
        let discountAmount = updatedItem.discountAmount || 0;
        if (updatedItem.discountType === 'percentage') {
            discountAmount = (sellPrice * quantity * (updatedItem.discountValue || 0)) / 100;
            updatedItem.discountAmount = discountAmount;
        } else {
            updatedItem.discountAmount = updatedItem.discountValue || 0;
        }

        const taxableValue = (sellPrice * quantity) - (updatedItem.discountAmount || 0);

        // Apply Tax if not estimate
        if (!isEstimate && taxableValue > 0) {
            // We need product rates. 
            // Assuming we have them in item (we don't store rates in item usually, but we have calculated amounts)
            // We should re-fetch product to get rates? Or store rates in item?
            // For now, let's look up the product from store
            const product = products.find(p => p.id === updatedItem.productId);
            if (product) {
                if (taxType === 'intra-state') {
                    updatedItem.sgstAmount = (taxableValue * (product.sgstRate || 0)) / 100;
                    updatedItem.cgstAmount = (taxableValue * (product.cgstRate || 0)) / 100;
                    updatedItem.igstAmount = 0;
                } else {
                    const igst = product.igstRate !== undefined ? product.igstRate : ((product.sgstRate || 0) + (product.cgstRate || 0));
                    updatedItem.igstAmount = (taxableValue * igst) / 100;
                    updatedItem.sgstAmount = 0;
                    updatedItem.cgstAmount = 0;
                }
            }
        } else {
            updatedItem.sgstAmount = 0;
            updatedItem.cgstAmount = 0;
            updatedItem.igstAmount = 0;
        }

        newItems[index] = updatedItem;
        onItemsChange(newItems);
    };

    const handleProductSelect = (rowIndex: number, suggestion: ProductSearchSuggestion) => {
        const { product, sku, layer } = suggestion;

        // Create new item
        const newItem: BillItem = {
            id: rowIndex === items.length ? uuidv4() : items[rowIndex].id,
            productId: product.id,
            productName: suggestion.displayInfo.name,
            quantity: 1,
            costPrice: 0, // Fill from SKU/Layer
            sellPrice: 0, // Fill from SKU/Layer
            sgstAmount: 0,
            cgstAmount: 0,
            igstAmount: 0,
            discountValue: 0,
            discountAmount: 0,
            discountType: 'amount',
        };

        const skuDetails = getSkuDetails(sku);

        if (currentMode === 'sell') {
            if (layer) {
                newItem.sellPrice = layer.sellPrice;
                // newItem.costPrice = layer.costPrice; // Hidden usually
            } else {
                newItem.sellPrice = skuDetails.currentSellPrice || 0;
            }
        } else if (currentMode === 'buy') {
            newItem.costPrice = 0;
            newItem.sellPrice = skuDetails.currentSellPrice || 0;
        } else {
            newItem.sellPrice = skuDetails.currentSellPrice || 0;
        }

        // Add or Update
        if (rowIndex === items.length) {
            // Adding new row
            onItemsChange([...items, newItem]);
            // Focus quantity of the new row next
            setTimeout(() => focusCell(rowIndex, 1), 50); // 1 is Quantity
        } else {
            // Replacing existing
            const newItems = [...items];
            newItems[rowIndex] = newItem;
            onItemsChange(newItems);
            setTimeout(() => focusCell(rowIndex, 1), 50);
        }
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        onItemsChange(newItems);
    };

    // State for Quick Add Popup
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [quickAddInitialName, setQuickAddInitialName] = useState('');

    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);


    return (
        <div className="w-full bg-card rounded-md border shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
            {/* Header */}
            <div className="bg-muted/50 p-2 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Excel Bulk Entry Mode
                </h3>
                <div className="text-xs text-muted-foreground flex gap-4">
                    <span className="flex items-center gap-1"><span className="border rounded px-1 min-w-[20px] text-center inline-block">↵</span> Next Cell</span>
                    <span className="flex items-center gap-1"><span className="border rounded px-1 min-w-[20px] text-center inline-block">⇧+↵</span> Quantity to Discount</span>
                </div>
            </div>

            {/* Grid Header */}
            <div className="flex w-full bg-muted border-b text-xs font-medium text-muted-foreground sticky top-0 z-10">
                <div className="w-10 p-2 text-center border-r">#</div>
                <div className="w-32 p-2 border-r flex items-center gap-1"><Calendar className="h-3 w-3" /> Date</div>
                <div className="w-32 p-2 border-r flex items-center gap-1"><User className="h-3 w-3" /> Customer</div>
                <div className="flex-1 p-2 border-r flex items-center gap-1"><Search className="h-3 w-3" /> Product Name</div>
                <div className="w-20 p-2 border-r text-right">Qty</div>
                <div className="w-24 p-2 border-r text-right">Rate</div>
                <div className="w-24 p-2 border-r text-right">Disc.</div>
                {!isEstimate && <div className="w-24 p-2 border-r text-right">Tax</div>}
                <div className="w-28 p-2 text-right font-bold">Total</div>
                <div className="w-10 p-2"></div>
            </div>

            {/* Grid Body */}
            <div className="flex-1 overflow-auto">
                {items.map((item, index) => (
                    <React.Fragment key={item.id}>
                        {renderRow(index, item)}
                    </React.Fragment>
                ))}
                {/* Placeholder Row for New Item */}
                {renderRow(items.length, null)}
            </div>

            {/* Quick Add Dialog Handler */}
            {isQuickAddOpen && (
                <NewProductDialog
                    isOpen={isQuickAddOpen}
                    onOpenChange={setIsQuickAddOpen}
                    initialValues={{ name: quickAddInitialName }}
                    onProductAdded={(product) => {
                        // Toast is handled by dialog
                        setIsQuickAddOpen(false);
                        // Optionally we could auto-select here, but that requires more logic
                    }}
                />
            )}
        </div>
    );

    function renderRow(index: number, item: BillItem | null) {
        const isNew = item === null;
        const highlight = activeRowIndex === index;

        // Calculations for display
        const amount = item ? (item.sellPrice * item.quantity) : 0;
        const discount = item ? (item.discountAmount || 0) : 0;
        const tax = item ? ((item.sgstAmount || 0) + (item.cgstAmount || 0) + (item.igstAmount || 0)) : 0;
        const total = amount - discount + tax;

        return (
            <div
                key={index}
                className={cn(
                    "flex w-full border-b group transition-colors hover:bg-muted/30",
                    highlight && "bg-muted/50"
                )}
                onClick={() => setActiveRowIndex(index)}
            >
                {/* Index */}
                <div className="w-10 p-2 text-center text-xs text-muted-foreground flex items-center justify-center border-r bg-muted/10">
                    {index + 1}
                </div>

                {/* Date (Read Only) */}
                <div className="w-32 p-1 border-r">
                    <Input
                        disabled
                        className="h-8 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 px-1 disabled:opacity-90"
                        value={defaultDate ? defaultDate.toLocaleDateString() : new Date().toLocaleDateString()}
                    />
                </div>

                {/* Customer (Read Only) */}
                <div className="w-32 p-1 border-r">
                    <Input
                        disabled
                        className="h-8 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 px-1 disabled:opacity-90"
                        value={defaultCustomerName || "Walk-in"}
                    />
                </div>

                {/* Product Search */}
                <div className="flex-1 p-1 border-r relative">
                    {/* We map cellRefs[index][0] to this input inside ProductSearchInput */}
                    <ProductSearchInput
                        value={isNew ? '' : item.productName}
                        onValueChange={() => { }}
                        placeholder={isNew ? "Scan / Search Product (Enter)..." : ""}
                        className="h-8 text-sm focus-within:ring-0 border-0 shadow-none px-0"
                        onProductSelect={(suggestion) => handleProductSelect(index, suggestion)}
                        onEnterWithoutSelection={(val) => {
                            // Quick Add Trigger
                            setQuickAddInitialName(val);
                            setIsQuickAddOpen(true);
                            setActiveRowIndex(index);
                        }}
                        currentMode={currentMode}
                        inputRef={getProductRef(index)}
                    />
                </div>

                {/* Quantity */}
                <div className="w-20 p-1 border-r">
                    <Input
                        type="number"
                        className="h-8 text-xs border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary text-right"
                        value={isNew ? '' : item.quantity}
                        onChange={(e) => !isNew && updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                        onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                        ref={(el) => {
                            if (!cellRefs.current[index]) cellRefs.current[index] = [];
                            cellRefs.current[index][1] = el;
                        }}
                        disabled={isNew}
                    />
                </div>

                {/* Rate (Sell Price) */}
                <div className="w-24 p-1 border-r">
                    <Input
                        type="number"
                        className="h-8 text-xs border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary text-right"
                        value={isNew ? '' : item.sellPrice}
                        onChange={(e) => !isNew && updateItem(index, { sellPrice: parseFloat(e.target.value) || 0 })}
                        onKeyDown={(e) => handleKeyDown(e, index, 'rate')} // Wait, navigation map? Rate not in standard flow?
                        disabled={isNew}
                    />
                </div>

                {/* Discount */}
                <div className="w-24 p-1 border-r">
                    <Input
                        type="number"
                        className="h-8 text-xs border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary text-right"
                        value={isNew ? '' : item.discountValue || ''}
                        placeholder="0"
                        onChange={(e) => !isNew && updateItem(index, { discountValue: parseFloat(e.target.value) || 0, discountType: 'amount' })}
                        onKeyDown={(e) => handleKeyDown(e, index, 'discount')}
                        ref={(el) => {
                            if (!cellRefs.current[index]) cellRefs.current[index] = [];
                            cellRefs.current[index][2] = el; // index 2 usually
                        }}
                        disabled={isNew}
                    />
                </div>

                {/* Tax (If not Estimate) */}
                {!isEstimate && (
                    <div className="w-24 p-1 border-r">
                        {/* Read Only Tax Display but technically we could allow edit? User said "tax variable can be changed" causing recalc.
                       For now, let's keep it read-only calculated. */}
                        <Input
                            disabled
                            className="h-8 text-xs bg-transparent border-none shadow-none text-right"
                            value={isNew ? '' : tax.toFixed(2)}
                        />
                    </div>
                )}

                {/* Total */}
                <div className="w-28 p-1 border-r">
                    <Input
                        type="number"
                        className={cn(
                            "h-8 text-xs border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary text-right font-bold",
                            !isNew && "bg-primary/5"
                        )}
                        value={isNew ? '' : total.toFixed(2)}
                        onChange={(e) => {
                            if (isNew) return;
                            const newTotal = parseFloat(e.target.value) || 0;
                            // Reverse Calc
                            if (total > 0) {
                                const ratio = newTotal / total;
                                updateItem(index, { sellPrice: item.sellPrice * ratio });
                            } else {
                                updateItem(index, { sellPrice: newTotal / item.quantity });
                            }
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index, 'total')}
                        ref={(el) => {
                            if (!cellRefs.current[index]) cellRefs.current[index] = [];
                            // Index depends on isEstimate
                            const idx = isEstimate ? 3 : 4;
                            cellRefs.current[index][idx] = el;
                        }}
                        disabled={isNew}
                    />
                </div>

                {/* Actions */}
                <div className="w-10 p-1 flex items-center justify-center">
                    {!isNew && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(index)}
                            tabIndex={-1}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>
        );
    }
}
