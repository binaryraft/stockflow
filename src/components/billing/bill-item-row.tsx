
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
  onPriceChange?: (itemId: string, newPrice: number, priceType: 'cost' | 'sell') => void; // For buy mode
  onRemoveItem: (itemId: string) => void;
  isFirstItem?: boolean; // To manage focus for first item on new add
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
  
  return (
    <div className="grid grid-cols-[1fr_80px_100px_100px_40px] items-center gap-2 py-2 border-b border-dashed">
      <span className="truncate text-sm font-medium">{item.productName}</span>
      
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
          <span className="text-sm text-muted-foreground text-right">₹{item.costPrice.toFixed(2)}</span>
          <span className="text-sm text-foreground font-semibold text-right">₹{item.sellPrice.toFixed(2)}</span>
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
    <div className="grid grid-cols-[1fr_80px_100px_100px_40px] items-center gap-2 pb-2 border-b">
      <span className="text-xs font-semibold text-muted-foreground">Product</span>
      <span className="text-xs font-semibold text-muted-foreground text-right">Qty</span>
      <span className={cn("text-xs font-semibold text-muted-foreground text-right", mode !== 'buy' && "pr-2")}>
        {mode === 'buy' ? 'Cost/Unit' : 'Cost/Unit'}
      </span>
      <span className="text-xs font-semibold text-muted-foreground text-right">
        {mode === 'buy' ? 'Sell/Unit' : 'Price/Unit'}
      </span>
      <span className="text-xs font-semibold text-muted-foreground"></span> {/* For remove button */}
    </div>
  );
}
