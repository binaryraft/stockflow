
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import type { Product, ProductSKU } from '@/types';
import { Loader2, Barcode as BarcodeIcon, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface HardwareBarcodeScanModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (product: Product, sku: ProductSKU) => void;
  storeId?: string; // For store-specific stock/price lookups if needed
}

export function HardwareBarcodeScanModal({
  isOpen,
  onOpenChange,
  onScanSuccess,
  storeId,
}: HardwareBarcodeScanModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { products: allProducts, getSkuDetails, getSkuIdentifier } = useInventoryStore(state => ({
    products: state.products,
    getSkuDetails: state.getSkuDetails,
    getSkuIdentifier: state.getSkuIdentifier,
  }));

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setErrorMessage(null);
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100); // Delay focus slightly to ensure modal is fully rendered
    }
  }, [isOpen]);

  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) {
      setErrorMessage("Please enter or scan a barcode.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    const barcodeToSearch = inputValue.trim();

    let foundProduct: Product | undefined = undefined;
    let foundSku: ProductSKU | undefined = undefined;

    for (const p of allProducts) {
        if (p.sku === barcodeToSearch) { // Check base product SKU first
            foundProduct = p;
            foundSku = p.productSKUs.find(s => Object.keys(s.optionValues || {}).length === 0) || p.productSKUs[0];
            break;
        }
        for (const s of p.productSKUs) { // Then check individual SKU identifiers
            if (s.skuIdentifier === barcodeToSearch) {
                foundProduct = p;
                foundSku = s;
                break;
            }
        }
        if (foundProduct) break;
    }
    
    // Add a small delay to simulate processing if needed, or remove for instant feedback
    await new Promise(resolve => setTimeout(resolve, 300));


    if (foundProduct && foundSku) {
      onScanSuccess(foundProduct, foundSku);
      toast({
        title: "Barcode Scanned",
        description: `${foundSku.skuIdentifier || foundProduct.name} found and added.`,
      });
      onOpenChange(false);
    } else {
      setErrorMessage(`Product not found for barcode: ${barcodeToSearch}. Try again or add manually.`);
      toast({
        variant: "destructive",
        title: "Barcode Not Found",
        description: `No product matched the scanned barcode: ${barcodeToSearch}`,
      });
    }
    setIsLoading(false);
    setInputValue(''); // Clear input for next scan
    inputRef.current?.focus();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-t-4 border-t-primary shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarcodeIcon className="h-6 w-6 text-primary" />
            Scan Hardware Barcode
          </DialogTitle>
          <DialogDescription>
            Ensure your hardware barcode scanner is connected. The scanned barcode will appear below. Press Enter or submit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleBarcodeSubmit} className="space-y-4 pt-2">
          <div className="relative h-20 w-full flex items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-primary/50 bg-muted/30">
            {/* Simple scanning line animation */}
            <div className="absolute top-0 left-0 h-full w-1 bg-primary animate-scan-line"></div>
            <BarcodeIcon className={cn("h-10 w-10 text-primary transition-opacity duration-300", isLoading ? "opacity-30" : "opacity-70")} />
            {isLoading && <Loader2 className="absolute h-8 w-8 text-primary animate-spin" />}
          </div>

          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Waiting for barcode scan..."
            className="text-center text-lg h-12"
            disabled={isLoading}
          />
          {errorMessage && (
            <p className="text-sm text-destructive text-center flex items-center justify-center gap-1.5">
              <AlertCircle size={16} /> {errorMessage}
            </p>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !inputValue.trim()}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Processing...' : 'Submit Barcode'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {/* Basic CSS animation for the scanning line */}
      <style jsx global>{`
        @keyframes scan-line-animation {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
        .animate-scan-line {
          animation: scan-line-animation 2s linear infinite;
        }
      `}</style>
    </Dialog>
  );
}
