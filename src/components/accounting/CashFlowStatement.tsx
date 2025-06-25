
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { getCurrencySymbol } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface CashFlowStatementProps {
  startDate?: Date;
  endDate?: Date;
}

export function CashFlowStatement({ startDate, endDate }: CashFlowStatementProps) {
  const { getCashFlowSummaryByDateRange, userProfile } = useInventoryStore(state => ({
    getCashFlowSummaryByDateRange: state.getCashFlowSummaryByDateRange,
    userProfile: state.userProfile
  }));
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;

  const summary = useMemo(() => {
    return getCashFlowSummaryByDateRange(startDate, endDate, companyId);
  }, [startDate, endDate, companyId, getCashFlowSummaryByDateRange]);

  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency);

  const formatValue = (value: number) => {
    return `${currencySymbol}${value.toFixed(2)}`;
  };

  return (
    <Card className="shadow-lg border-t-2 border-t-primary w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Cash Flow Statement</CardTitle>
        <CardDescription>
          Summary of cash inflows and outflows from paid invoices during the selected period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm">
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
      </CardContent>
    </Card>
  );
}
