
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { getCurrencySymbol } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

import { ExportConfig } from './report-export-dialog';

interface ProfitLossStatementProps {
  startDate?: Date;
  endDate?: Date;
  storeId?: string;
  config?: ExportConfig;
}

import { AIInsightLoading } from '@/components/common/AIInsightLoading';

export function ProfitLossStatement({ startDate, endDate, storeId }: ProfitLossStatementProps) {
  const { fetchAccountingReport, accountingReport, accountingLoading, userProfile } = useInventoryStore(state => ({
    fetchAccountingReport: state.fetchAccountingReport,
    accountingReport: state.accountingReport,
    accountingLoading: state.accountingLoading,
    userProfile: state.userProfile
  }));

  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;

  React.useEffect(() => {
    if (companyId) {
      fetchAccountingReport({
        companyId,
        storeId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        reportType: 'pnl'
      });
    }
  }, [startDate, endDate, storeId, companyId, fetchAccountingReport]);

  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency);

  const formatValue = (value: number) => {
    return `${currencySymbol}${(value || 0).toFixed(2)}`;
  };

  const showLoading = accountingLoading && (!accountingReport || !Array.isArray(accountingReport));

  if (showLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
        <AIInsightLoading context="dashboard" />
        <p className="text-sm text-muted-foreground font-medium mt-2">Crunching financial data...</p>
      </div>
    );
  }

  if (!accountingReport || !Array.isArray(accountingReport)) {
    return (
      <div className="text-center p-12 bg-muted/30 rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">No financial data found for the selected period.</p>
      </div>
    );
  }

  const salesData = accountingReport.find((s: any) => s._id === 'sell') || { subTotal: 0, totalAmount: 0, totalCOGS: 0 };
  const expenseData = accountingReport.find((s: any) => s._id === 'buy') || { subTotal: 0, totalAmount: 0, totalCOGS: 0 };

  const totalRevenue = salesData.subTotal || 0;
  const totalCOGS = salesData.totalCOGS || 0;
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenseData.totalAmount || 0;
  const netProfit = grossProfit - totalExpenses;

  return (
    <Card className="shadow-lg w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Profit &amp; Loss Statement</CardTitle>
        <CardDescription>
          Summary of revenues, costs, and expenses during the selected period. Optimized for massive datasets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm">
          {/* Revenue Section */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-foreground">Total Revenue from Sales</span>
              <span className="text-foreground font-semibold">{formatValue(totalRevenue)}</span>
            </div>
          </div>

          {/* COGS Section */}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground pl-4">Less: Cost of Goods Sold (COGS)</span>
            <span className="text-muted-foreground">({formatValue(totalCOGS)})</span>
          </div>

          <Separator />

          {/* Gross Profit */}
          <div className="flex justify-between items-center font-bold text-lg">
            <span className="text-foreground">Gross Profit</span>
            <span className={cn(grossProfit >= 0 ? "text-green-600" : "text-destructive")}>{formatValue(grossProfit)}</span>
          </div>

          <Separator className="my-4" />

          {/* Expenses Section */}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground">Operating Expenses</span>
            <span></span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground pl-4">Purchases &amp; Other Expenses</span>
            <span className="text-muted-foreground">({formatValue(totalExpenses)})</span>
          </div>

          <Separator />

          {/* Net Profit */}
          <div className={cn(
            "flex justify-between items-center font-bold text-xl p-4 rounded-md",
            netProfit >= 0 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
          )}>
            <span>Net Profit / (Loss)</span>
            <span>{formatValue(netProfit)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
