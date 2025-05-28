
"use client";

import type { BillItem, BillMode } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillItemRowProps {
  item: BillItem;
  mode: BillMode;
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

  const subtotal = mode === 'buy' ? item.quantity * item.costPrice : item.quantity * item.sellPrice;

  return (
    <div className={cn(
      "grid items-center gap-2 py-2 border-b border-dashed",
      mode === 'buy' ? "grid-cols-[1fr_80px_100px_100px_100px_40px]" : "grid-cols-[1fr_80px_100px_100px_40px]"
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
      </div>

      <Input
        ref={inputRefs?.quantity}
        type="number"
        value={item.quantity}
        onChange={(e) => onQuantityChange(item.id, parseInt(e.target.value) || 0)}
        onKeyDown={(e) => handleKeyDown(e, 'quantity')}
        className="h-8 text-sm w-full"
        min="1"
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
          />
          <span className="text-sm text-foreground font-semibold text-right flex items-center justify-end h-8 pr-2">
            ₹{subtotal.toFixed(2)}
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
          />
        </>
      ) : ( // Sell or Return mode
        <>
          <span className="text-sm text-muted-foreground text-right flex items-center justify-end h-8 pr-2">
            ₹{item.sellPrice.toFixed(2)}
          </span>
          <span className="text-sm text-foreground font-semibold text-right flex items-center justify-end h-8 pr-2">
            ₹{subtotal.toFixed(2)}
          </span>
        </>
      )}

      <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id)} className="h-8 w-8">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function BillItemHeader({ mode }: { mode: BillMode }) {
  return (
    <div className={cn(
      "grid items-center gap-2 pb-2 border-b",
      mode === 'buy' ? "grid-cols-[1fr_80px_100px_100px_100px_40px]" : "grid-cols-[1fr_80px_100px_100px_40px]"
    )}>
      <span className="text-xs font-semibold text-muted-foreground">Product</span>
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
          <span className="text-xs font-semibold text-muted-foreground text-right pr-2">Subtotal</span>
        </>
      )}
      <span className="text-xs font-semibold text-muted-foreground"></span> {/* For remove button */}
    </div>
  );
}
