
"use client";

import type { BillItem, BillMode } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillItemRowProps {
  item: BillItem;
  mode: BillMode;
  isEstimateMode?: boolean; 
  onQuantityChange: (itemId: string, newQuantity: number) => void;
  onPriceChange?: (itemId: string, newPrice: number, priceType: 'cost' | 'sell') => void;
  onRemoveItem: (itemId: string) => void;
  inputRefs?: {
    quantity: React.RefObject<HTMLInputElement>;
    costPrice?: React.RefObject<HTMLInputElement>;
    sellPrice?: React.RefObject<HTMLInputElement>;
  };
  onEnterPress?: (field: 'quantity' | 'costPrice' | 'sellPrice' | 'nextItem') => void;
}

export function BillItemRow({
  item,
  mode,
  isEstimateMode = false,
  onQuantityChange,
  onPriceChange,
  onRemoveItem,
  inputRefs,
  onEnterPress
}: BillItemRowProps) {

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'quantity' | 'costPrice' | 'sellPrice') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnterPress?.(field);
    }
  };

  const itemSubtotalPreTax = mode === 'buy' ? item.quantity * item.costPrice : item.quantity * item.sellPrice;
  const itemTotalWithTax = itemSubtotalPreTax + (item.sgstAmount || 0) + (item.cgstAmount || 0);

  const showTaxColumns = mode === 'sell' && !isEstimateMode && !item.isAdditionalCharge && !item.productId.startsWith('SERVICE_ITEM_');
  const isChargeOrService = item.isAdditionalCharge || item.productId.startsWith('SERVICE_ITEM_');


  return (
    <div className={cn(
      "grid items-center gap-2 py-2 border-b border-dashed",
      mode === 'buy' ? "grid-cols-[1fr_100px_100px_100px_100px_40px]" : 
      (showTaxColumns ? "grid-cols-[1fr_80px_80px_70px_70px_90px_40px]" : "grid-cols-[1fr_100px_100px_100px_40px]")
    )}>
      <div>
        <span className="truncate text-sm font-medium">{item.productName}</span>
        {item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0 && (
          <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
            {Object.entries(item.selectedVariantOptions)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ')}
          </div>
        )}
         {item.isAdditionalCharge && <span className="text-xs text-primary ml-1">(Additional Charge)</span>}
      </div>

      <Input
        ref={inputRefs?.quantity}
        type="number"
        value={item.quantity}
        onChange={(e) => onQuantityChange(item.id, parseFloat(e.target.value) || 0)}
        onKeyDown={(e) => handleKeyDown(e, 'quantity')}
        className="h-8 text-sm w-full"
        step="any" // Allow float
        min="0.01" // Allow small float
        disabled={item.isAdditionalCharge} // Quantity for charges is fixed at 1
      />

      {mode === 'buy' ? (
        <>
          <Input
            ref={inputRefs?.costPrice}
            type="number"
            value={item.costPrice}
            onChange={(e) => onPriceChange?.(item.id, parseFloat(e.target.value) || 0, 'cost')}
            onKeyDown={(e) => handleKeyDown(e, 'costPrice')}
            className="h-8 text-sm w-full"
            step="0.01"
            min="0"
            disabled={isChargeOrService}
          />
          <span className="text-sm text-foreground font-semibold text-right flex items-center justify-end h-8 pr-2">
            ₹{itemSubtotalPreTax.toFixed(2)}
          </span>
          <Input
            ref={inputRefs?.sellPrice}
            type="number"
            value={item.sellPrice} 
            onChange={(e) => onPriceChange?.(item.id, parseFloat(e.target.value) || 0, 'sell')}
            onKeyDown={(e) => handleKeyDown(e, 'sellPrice')}
            className="h-8 text-sm w-full"
            step="0.01"
            min="0"
             disabled={isChargeOrService}
          />
        </>
      ) : ( 
        <>
          <span className="text-sm text-muted-foreground text-right flex items-center justify-end h-8 pr-2">
            ₹{item.sellPrice.toFixed(2)}
          </span>
          {showTaxColumns && (
            <>
              <span className="text-xs text-muted-foreground text-right flex items-center justify-end h-8 pr-1">
                ₹{(item.sgstAmount || 0).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground text-right flex items-center justify-end h-8 pr-1">
                ₹{(item.cgstAmount || 0).toFixed(2)}
              </span>
            </>
          )}
          <span className="text-sm text-foreground font-semibold text-right flex items-center justify-end h-8 pr-2">
            ₹{(showTaxColumns ? itemTotalWithTax : itemSubtotalPreTax).toFixed(2)}
          </span>
        </>
      )}

      <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id)} className="h-8 w-8">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function BillItemHeader({ mode, isEstimateMode }: { mode: BillMode, isEstimateMode?: boolean }) {
  const showTaxColumns = mode === 'sell' && !isEstimateMode;
  return (
    <div className={cn(
      "grid items-center gap-2 pb-2 border-b",
       mode === 'buy' ? "grid-cols-[1fr_100px_100px_100px_100px_40px]" : 
      (showTaxColumns ? "grid-cols-[1fr_80px_80px_70px_70px_90px_40px]" : "grid-cols-[1fr_100px_100px_100px_40px]")
    )}>
      <span className="text-xs font-semibold text-muted-foreground">Product/Charge</span>
      <span className="text-xs font-semibold text-muted-foreground text-right">Qty</span>
      {mode === 'buy' ? (
        <>
          <span className="text-xs font-semibold text-muted-foreground text-right">Cost/Unit</span>
          <span className="text-xs font-semibold text-muted-foreground text-right pr-2">Subtotal</span>
          <span className="text-xs font-semibold text-muted-foreground text-right">Sell Price/Unit</span>
        </>
      ) : (
        <>
          <span className="text-xs font-semibold text-muted-foreground text-right pr-2">Price/Unit</span>
          {showTaxColumns && (
            <>
              <span className="text-xs font-semibold text-muted-foreground text-right pr-1">SGST</span>
              <span className="text-xs font-semibold text-muted-foreground text-right pr-1">CGST</span>
            </>
          )}
          <span className="text-xs font-semibold text-muted-foreground text-right pr-2">Total</span>
        </>
      )}
      <span className="text-xs font-semibold text-muted-foreground"></span> {}
    </div>
  );
}
