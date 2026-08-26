
"use client";

import React, { useEffect } from 'react';
import type { BillMode } from '@/types';
import { CheckCircle2, PackageCheck, PackageX, ShoppingBag, Send, RotateCcw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillSaveAnimationProps {
  show: boolean;
  billMode: BillMode | null;
  isEstimate?: boolean;
  onClose: () => void;
}

export function BillSaveAnimation({ show, billMode, isEstimate, onClose }: BillSaveAnimationProps) {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (show) {
      timer = setTimeout(() => {
        onClose();
      }, 1200); // Animation duration (Faster)
    }
    return () => clearTimeout(timer);
  }, [show, onClose]);

  if (!show || !billMode) {
    return null;
  }

  let IconComponent = CheckCircle2;
  let text = "Saved!";
  let iconColor = "text-green-600";

  if (billMode === 'sell') {
    if (isEstimate) {
      IconComponent = FileText;
      text = "Estimate Saved!";
      iconColor = "text-blue-500";
    } else {
      IconComponent = Send;
      text = "Sales Bill Saved!";
      iconColor = "text-green-600";
    }
  } else if (billMode === 'buy') {
    IconComponent = ShoppingBag;
    text = "Purchase Bill Saved!";
    iconColor = "text-red-600";
  } else if (billMode === 'return') {
    IconComponent = RotateCcw;
    text = "Return Entry Saved!";
    iconColor = "text-amber-500";
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md transition-opacity duration-300",
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="transform scale-100 transition-transform duration-300 ease-out">
        <IconComponent
          className={cn("h-32 w-32 mb-6", iconColor)}
          strokeWidth={1.5}
        />
        <p className={cn("text-3xl font-semibold", iconColor)}>
          {text}
        </p>
      </div>
    </div>
  );
}
