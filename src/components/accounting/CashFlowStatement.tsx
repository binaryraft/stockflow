
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { getCurrencySymbol } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface CashFlowStatementProps {
  startDate?: Date;
  endDate?: Date;
  storeId?: string;
}

export function CashFlowStatement({ startDate, endDate, storeId }: CashFlowStatementProps) {
  const { getCashFlowSummaryByDateRange, userProfile, bills } = useInventoryStore(state => ({
    getCashFlowSummaryByDateRange: state.getCashFlowSummaryByDateRange,
    userProfile: state.userProfile,
    bills: state.bills
  }));
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Artificial delay to show AI experience and ensure data is synced
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [startDate, endDate, storeId]);

  const summary = useMemo(() => {
    return getCashFlowSummaryByDateRange(startDate, endDate, companyId || undefined, storeId);
  }, [startDate, endDate, companyId, storeId, getCashFlowSummaryByDateRange]);

  const showLoading = isLoading && bills.length === 0;

  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency);

  const formatValue = (value: number) => {
    return `${currencySymbol}${(value || 0).toFixed(2)}`;
  };

  return (
    <Card className="shadow-lg border-t-2 border-t-primary w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Cash Flow Statement</CardTitle>
        <CardDescription>
          Summary of cash inflows and outflows from paid invoices during the selected period.
        </CardDescription>
      </CardHeader>
      <CardContent className={cn(showLoading && "min-h-[300px] flex items-center justify-center")}>
        {showLoading ? (
          <LoadingSpinner context="billing" text="Analyzing cash movements..." />
        ) : (
          <div className="space-y-4 text-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Inflows Section */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">Cash Inflows from Sales</span>
              <span className="font-medium text-green-600 dark:text-green-500">{formatValue(summary.cashInflows)}</span>
            </div>
            <p className="text-xs text-muted-foreground pl-4 -mt-2">
              (From sales bills marked as 'paid' in the selected period)
            </p>

            {/* Outflows Section */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Less: Cash Outflows for Purchases</span>
              <span className="text-muted-foreground">({formatValue(summary.cashOutflows)})</span>
            </div>
            <p className="text-xs text-muted-foreground pl-4 -mt-2">
              (From expense bills marked as 'paid' in the selected period)
            </p>

            <Separator className="my-4" />

            {/* Net Cash Flow */}
            <div className={cn(
              "flex justify-between items-center font-bold text-xl p-4 rounded-md",
              summary.netCashFlow >= 0 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            )}>
              <span>Net Cash Flow</span>
              <span>{formatValue(summary.netCashFlow)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
