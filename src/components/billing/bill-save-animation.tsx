
"use client";

import React, { useEffect } from 'react';
import type { BillMode } from '@/types';
import { CheckCircle2, PackageCheck, PackageX, ShoppingBag, Send, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillSaveAnimationProps {
  show: boolean;
  billMode: BillMode | null;
  onClose: () => void;
}

export function BillSaveAnimation({ show, billMode, onClose }: BillSaveAnimationProps) {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (show) {
      timer = setTimeout(() => {
        onClose();
      }, 2500); // Animation duration
    }
    return () => clearTimeout(timer);
  }, [show, onClose]);

  if (!show || !billMode) {
    return null;
  }

  let IconComponent = CheckCircle2;
  let text = "Bill Saved!";
  let iconColor = "text-green-500"; // Default to green

  if (billMode === 'sell') {
    IconComponent = Send;
    text = "Sales Bill Saved!";
    iconColor = "text-primary"; // Use primary color (royal green)
  } else if (billMode === 'buy') {
    IconComponent = ShoppingBag;
    text = "Expense Bill Saved!";
    iconColor = "text-destructive"; // Red for expense
  } else if (billMode === 'return') {
    IconComponent = RotateCcw;
    text = "Return Entry Saved!";
    iconColor = "text-amber-500"; // Amber for return
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300",
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="transform scale-100 transition-transform duration-300 ease-out"> {/* Basic scale animation */}
        <IconComponent
          className={cn("h-32 w-32 mb-6", iconColor)}
          strokeWidth={1.5}
        />
        <p className={cn("text-3xl font-semibold", iconColor === "text-primary" ? "text-primary" : iconColor === "text-destructive" ? "text-destructive" : "text-amber-500")}>
          {text}
        </p>
      </div>
    </div>
  );
}
