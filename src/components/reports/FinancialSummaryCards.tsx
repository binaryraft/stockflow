"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { DollarSign, TrendingUp, TrendingDown, Package, FileText, BarChart, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/utils';

interface FinancialSummaryCardsProps {
  startDate?: Date;
  endDate?: Date;
}

export function FinancialSummaryCards({ startDate, endDate }: FinancialSummaryCardsProps) {
  const { getReportSummaryByDateRange, userProfile } = useInventoryStore(state => ({
    getReportSummaryByDateRange: state.getReportSummaryByDateRange,
    userProfile: state.userProfile
  }));
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;

  const summary = getReportSummaryByDateRange(startDate, endDate, companyId);
  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency);

  const summaryItems = [
    { label: "Total Revenue", value: `${currencySymbol}${summary.totalRevenue.toFixed(2)}`, icon: <TrendingUp className="text-green-500" />, colorClass: "text-green-600 dark:text-green-500", description: `From ${summary.totalBills} total bills`},
    { label: "Cost of Goods Sold (COGS)", value: `${currencySymbol}${summary.totalCOGS.toFixed(2)}`, icon: <Package className="text-orange-500" />, colorClass: "text-orange-600 dark:text-orange-500", description: `${summary.totalItemsSold} items sold`},
    { label: "Gross Profit", value: `${currencySymbol}${summary.grossProfit.toFixed(2)}`, icon: <DollarSign className={cn(summary.grossProfit >=0 ? "text-primary" : "text-destructive")} />, colorClass: summary.grossProfit >=0 ? "text-primary" : "text-destructive", description: "Revenue - COGS"},
    { label: "Operating Expenses", value: `${currencySymbol}${summary.totalExpenses.toFixed(2)}`, icon: <TrendingDown className="text-red-500" />, colorClass: "text-destructive", description: "From purchase bills"},
    { label: "Net Profit / (Loss)", value: `${currencySymbol}${summary.netProfit.toFixed(2)}`, icon: <AlertTriangle className={cn(summary.netProfit >=0 ? "text-primary" : "text-destructive")} />, colorClass: summary.netProfit >=0 ? "text-primary" : "text-destructive", description: "Gross Profit - Expenses"},
  ];

  return (
    <Card className="shadow-lg border-t-2 border-t-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
           <BarChart className="h-5 w-5 text-primary" />
          Profit & Loss Summary
        </CardTitle>
        <CardDescription>
          Financial overview for the selected period.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaryItems.map(item => (
            <Card key={item.label} className="p-4 bg-tertiary rounded-lg shadow-sm border border-border/50">
              <div className="flex items-center gap-3 mb-1">
                {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                <h4 className="text-sm font-semibold text-muted-foreground">{item.label}</h4>
              </div>
              <p className={cn("text-2xl font-bold", item.colorClass)}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </Card>
          ))}
      </CardContent>
    </Card>
  );
}