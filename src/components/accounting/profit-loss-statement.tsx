
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { getCurrencySymbol } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface ProfitLossStatementProps {
  startDate?: Date;
  endDate?: Date;
}

export function ProfitLossStatement({ startDate, endDate }: ProfitLossStatementProps) {
  const { getReportSummaryByDateRange, userProfile } = useInventoryStore(state => ({
    getReportSummaryByDateRange: state.getReportSummaryByDateRange,
    userProfile: state.userProfile
  }));
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;

  const summary = useMemo(() => {
    return getReportSummaryByDateRange(startDate, endDate, companyId);
  }, [startDate, endDate, companyId, getReportSummaryByDateRange]);

  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency);

  const formatValue = (value: number) => {
    return `${currencySymbol}${value.toFixed(2)}`;
  };

  return (
    <Card className="shadow-lg border-t-2 border-t-primary w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Profit &amp; Loss Statement</CardTitle>
        <CardDescription>
          Summary of revenues, costs, and expenses during the selected period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm">
          {/* Revenue Section */}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground">Total Revenue from Sales</span>
            <span className="font-medium text-foreground">{formatValue(summary.totalRevenue)}</span>
          </div>

          {/* COGS Section */}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground pl-4">Less: Cost of Goods Sold (COGS)</span>
            <span className="text-muted-foreground">({formatValue(summary.totalCOGS)})</span>
          </div>
          
          <Separator />

          {/* Gross Profit */}
          <div className="flex justify-between items-center font-bold text-lg">
            <span className="text-foreground">Gross Profit</span>
            <span className={cn(summary.grossProfit >= 0 ? "text-green-600" : "text-destructive")}>{formatValue(summary.grossProfit)}</span>
          </div>

          <Separator className="my-4"/>

          {/* Expenses Section */}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground">Operating Expenses</span>
            <span></span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground pl-4">Purchases &amp; Other Expenses</span>
            <span className="text-muted-foreground">({formatValue(summary.totalExpenses)})</span>
          </div>

          <Separator />

          {/* Net Profit */}
          <div className={cn(
            "flex justify-between items-center font-bold text-xl p-4 rounded-md",
            summary.netProfit >= 0 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
          )}>
            <span>Net Profit / (Loss)</span>
            <span>{formatValue(summary.netProfit)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
