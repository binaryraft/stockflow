
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BillItem, Product, ProductSKU, StockLayer } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductSearchInput, type ProductSearchSuggestion } from '@/components/billing/product-search-input';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { cn } from '@/lib/utils';
import { Trash2, Search, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { NewProductDialog } from './new-product-dialog';
import { format } from 'date-fns';

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

    const cellRefs = useRef<(HTMLInputElement | HTMLButtonElement | null)[][]>([]);
    const productRefObjects = useRef<{ current: HTMLInputElement | null }[]>([]);

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
        const visualOrder = isEstimate
            ? ['product', 'quantity', 'discount', 'total']
            : ['product', 'quantity', 'discount', 'tax', 'total'];

        const currentVisualIndex = visualOrder.indexOf(colType);

        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey && colType === 'quantity') {
                focusCell(rowIndex, visualOrder.indexOf('discount'));
                return;
            }
            if (currentVisualIndex < visualOrder.length - 1) {
                focusCell(rowIndex, currentVisualIndex + 1);
            } else {
                focusCell(rowIndex + 1, 0);
            }
        } else if (e.key === 'ArrowUp') {
            if (rowIndex > 0) focusCell(rowIndex - 1, currentVisualIndex);
        } else if (e.key === 'ArrowDown') {
            focusCell(rowIndex + 1, currentVisualIndex);
        }
    };

    const [rowSearchTexts, setRowSearchTexts] = useState<Record<number, string>>({});

    const updateItem = (index: number, updates: Partial<BillItem>) => {
        const newItems = [...items];
        const item = newItems[index];
        if (!item) return;

        const updatedItem = { ...item, ...updates };
        const product = products.find(p => p.id === updatedItem.productId);

        if (product && currentMode === 'sell' && product.trackQuantity) {
            const otherItemsQuantity = newItems.reduce((sum, i, idx) => {
                if (idx === index) return sum;
                if (i.productId !== product.id) return sum;
                const itemOpts = i.selectedVariantOptions || {};
                const currentOpts = updatedItem.selectedVariantOptions || {};
                const itemKeys = Object.keys(itemOpts).sort();
                const currentKeys = Object.keys(currentOpts).sort();
                if (itemKeys.length === currentKeys.length && itemKeys.every(k => itemOpts[k] === currentOpts[k])) {
                    return sum + i.quantity;
                }
                return sum;
            }, 0);

            const totalRequested = (updatedItem.quantity || 0) + otherItemsQuantity;
            const targetSku = findOrCreateProductSKU(product.id, updatedItem.selectedVariantOptions || {});
            let stockAvailable = 0;
            if (targetSku) {
                stockAvailable = getSkuDetails(targetSku).totalStock ?? 0;
            }

            if (totalRequested > stockAvailable) {
                toast({ variant: "destructive", title: "Insufficient Stock", description: `Only ${(stockAvailable || 0).toFixed(2)} available.` });
                if (updates.quantity !== undefined) return;
            }
        }

        let quantity = updatedItem.quantity || 0;
        let sellPrice = updatedItem.sellPrice || 0;
        let discountAmount = updatedItem.discountAmount || 0;

        if (updatedItem.discountType === 'percentage') {
            discountAmount = (sellPrice * quantity * (updatedItem.discountValue || 0)) / 100;
            updatedItem.discountAmount = discountAmount;
        } else {
            updatedItem.discountAmount = updatedItem.discountValue || 0;
        }

        const taxableValue = (sellPrice * quantity) - (updatedItem.discountAmount || 0);

        if (!isEstimate && taxableValue > 0 && product) {
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
        const skuDetails = getSkuDetails(sku);

        const newItem: BillItem = {
            id: rowIndex === items.length ? uuidv4() : items[rowIndex].id,
            productId: product.id,
            productName: suggestion.displayInfo.name,
            quantity: 1,
            selectedVariantOptions: sku.optionValues,
            costPrice: 0,
            sellPrice: layer ? layer.sellPrice : (skuDetails.currentSellPrice || 0),
            sgstAmount: 0,
            cgstAmount: 0,
            igstAmount: 0,
            discountValue: 0,
            discountAmount: 0,
            discountType: 'amount',
        };

        if (currentMode === 'sell' && product.trackQuantity) {
            const existingQuantity = items.reduce((sum, item, idx) => {
                if (idx === rowIndex || item.productId !== product.id) return sum;
                const itemOpts = item.selectedVariantOptions || {};
                const currentOpts = sku.optionValues || {};
                const itemKeys = Object.keys(itemOpts).sort();
                const currentKeys = Object.keys(currentOpts).sort();
                return (itemKeys.length === currentKeys.length && itemKeys.every(k => itemOpts[k] === currentOpts[k])) ? sum + item.quantity : sum;
            }, 0);

            if (1 + existingQuantity > (skuDetails.totalStock ?? 0)) {
                toast({ variant: "destructive", title: "Insufficient Stock", description: "Not enough stock for this variant." });
                return;
            }
        }

        setRowSearchTexts(prev => {
            const next = { ...prev };
            delete next[rowIndex];
            return next;
        });

        if (rowIndex === items.length) {
            onItemsChange([...items, newItem]);
        } else {
            const newItems = [...items];
            newItems[rowIndex] = newItem;
            onItemsChange(newItems);
        }
        setTimeout(() => focusCell(rowIndex, 1), 50);
    };

    const removeItem = (index: number) => {
        onItemsChange(items.filter((_, i) => i !== index));
        setRowSearchTexts(prev => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [quickAddInitialName, setQuickAddInitialName] = useState('');
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

    return (
        <div className="w-full bg-card rounded-md border shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="bg-muted/50 p-2 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-emerald-600" />
                    Continuous Excel Entry Mode
                </h3>
            </div>

            <div className="flex w-full bg-muted border-b text-[10px] font-medium text-muted-foreground sticky top-0 z-10 uppercase tracking-wider">
                <div className="w-10 p-2 text-center border-r">#</div>
                <div className="w-24 p-2 border-r">Date</div>
                <div className="w-32 p-2 border-r">Party</div>
                <div className="flex-1 p-2 border-r"><Search className="h-3 w-3 inline mr-1" /> Product</div>
                <div className="w-20 p-2 border-r text-right">Qty</div>
                <div className="w-24 p-2 border-r text-right">Rate</div>
                <div className="w-20 p-2 border-r text-right">Disc</div>
                {!isEstimate && <div className="w-20 p-2 border-r text-right">Tax</div>}
                <div className="w-28 p-2 text-right font-bold border-r">Total</div>
                <div className="w-10 p-2"></div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/20">
                {items.map((item, index) => renderRow(index, item))}
                {renderRow(items.length, null)}
            </div>

            {isQuickAddOpen && (
                <NewProductDialog
                    isOpen={isQuickAddOpen}
                    onOpenChange={setIsQuickAddOpen}
                    initialValues={{ name: quickAddInitialName }}
                    onProductAdded={() => setIsQuickAddOpen(false)}
                />
            )}
        </div>
    );

    function renderRow(index: number, item: BillItem | null) {
        const isNew = item === null;
        const highlight = activeRowIndex === index;

        const amount = item ? (item.sellPrice * item.quantity) : 0;
        const discount = item ? (item.discountAmount || 0) : 0;
        const tax = item ? ((item.sgstAmount || 0) + (item.cgstAmount || 0) + (item.igstAmount || 0)) : 0;
        const total = amount - discount + tax;

        const currentText = rowSearchTexts[index] !== undefined ? rowSearchTexts[index] : (item?.productName || '');

        return (
            <div
                key={isNew ? 'new-row' : item.id}
                className={cn(
                    "flex w-full border-b group transition-colors hover:bg-emerald-50/20",
                    highlight && "bg-emerald-50/40"
                )}
                onClick={() => setActiveRowIndex(index)}
            >
                <div className="w-10 p-2 text-center text-[10px] text-muted-foreground flex items-center justify-center border-r bg-muted/5 font-mono">
                    {(index + 1).toString().padStart(2, '0')}
                </div>

                <div className="w-24 p-1 border-r bg-muted/5 flex items-center text-[10px] text-muted-foreground justify-center">
                    {format(defaultDate || new Date(), 'dd/MM/yy')}
                </div>

                <div className="w-32 p-1 border-r bg-muted/5 flex items-center text-[10px] text-muted-foreground px-2 truncate">
                    {defaultCustomerName || "Walk-in"}
                </div>

                <div className="flex-1 p-0 border-r relative h-9">
                    <ProductSearchInput
                        value={currentText}
                        onValueChange={(val) => setRowSearchTexts(prev => ({ ...prev, [index]: val }))}
                        onProductSelect={(s) => handleProductSelect(index, s)}
                        onEnterWithoutSelection={(val) => {
                            setQuickAddInitialName(val);
                            setIsQuickAddOpen(true);
                        }}
                        placeholder={isNew ? "Search product..." : ""}
                        className="h-full border-none shadow-none focus-within:ring-0 text-sm"
                        inputRef={getProductRef(index)}
                        currentMode={currentMode}
                    />
                </div>

                <div className="w-20 p-0 border-r">
                    <Input
                        type="number"
                        className="h-9 text-xs border-none shadow-none text-right focus-visible:ring-1 focus-visible:ring-primary"
                        value={isNew ? '' : item.quantity}
                        onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                        onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                        disabled={isNew}
                        ref={(el) => { if (!cellRefs.current[index]) cellRefs.current[index] = []; cellRefs.current[index][1] = el; }}
                    />
                </div>

                <div className="w-24 p-0 border-r">
                    <Input
                        type="number"
                        className="h-9 text-xs border-none shadow-none text-right"
                        value={isNew ? '' : item.sellPrice}
                        onChange={(e) => updateItem(index, { sellPrice: parseFloat(e.target.value) || 0 })}
                        onKeyDown={(e) => handleKeyDown(e, index, 'rate')}
                        disabled={isNew}
                    />
                </div>

                <div className="w-20 p-0 border-r">
                    <Input
                        type="number"
                        className="h-9 text-xs border-none shadow-none text-right"
                        value={isNew ? '' : item.discountValue || ''}
                        onChange={(e) => updateItem(index, { discountValue: parseFloat(e.target.value) || 0, discountType: 'amount' })}
                        onKeyDown={(e) => handleKeyDown(e, index, 'discount')}
                        disabled={isNew}
                        ref={(el) => { if (!cellRefs.current[index]) cellRefs.current[index] = []; cellRefs.current[index][2] = el; }}
                    />
                </div>

                {!isEstimate && (
                    <div className="w-20 p-1 border-r bg-muted/5 flex items-center justify-end text-[10px] text-muted-foreground px-2">
                        {isNew ? '' : (tax || 0).toFixed(2)}
                    </div>
                )}

                <div className="w-28 p-0 border-r">
                    <Input
                        type="number"
                        className="h-9 text-xs border-none shadow-none text-right font-bold bg-emerald-50/10"
                        value={isNew ? '' : (total || 0).toFixed(2)}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (total > 0) updateItem(index, { sellPrice: item!.sellPrice * (val / total) });
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index, 'total')}
                        disabled={isNew}
                        ref={(el) => { if (!cellRefs.current[index]) cellRefs.current[index] = []; cellRefs.current[index][isEstimate ? 3 : 4] = el; }}
                    />
                </div>

                <div className="w-10 p-0 flex items-center justify-center">
                    {!isNew && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(index)}>
                            <Trash2 size={14} />
                        </Button>
                    )}
                </div>
            </div>
        );
    }
}
