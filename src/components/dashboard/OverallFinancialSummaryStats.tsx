
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { DollarSign, TrendingUp, TrendingDown, BarChart, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinancialSummary, TimePeriod } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';

interface OverallFinancialSummaryStatsProps {
  period: TimePeriod;
}

export function OverallFinancialSummaryStats({ period }: OverallFinancialSummaryStatsProps) {
  const getSummary = useInventoryStore((state) => state.getOverallFinancialSummary);
  const userProfile = useInventoryStore((state) => state.userProfile);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  useEffect(() => {
    setHasMounted(true);
    setCurrencySymbol(getCurrencySymbol(userProfile.companyCurrency));
  }, [userProfile.companyCurrency]);

  useEffect(() => {
    if (hasMounted) {
      setSummary(getSummary(period));
    }
  }, [hasMounted, getSummary, period]);

  const periodTextMap: Record<TimePeriod, string> = {
    daily: "Last 7 Days",
    weekly: "Last 4 Weeks",
    monthly: "Last 12 Months",
  };

  const cardTitle = `Financial Summary (${periodTextMap[period]})`;
  const cardDescription = `Financial performance metrics for the ${periodTextMap[period].toLowerCase()}.`;


  if (!hasMounted || !summary) {
    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <BarChart className="h-5 w-5" />
            {cardTitle}
          </CardTitle>
          <CardDescription>{cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading financial summary...</p>
        </CardContent>
      </Card>
    );
  }

  const summaryItems = [
    { label: "Total Sales Revenue", value: summary.totalRevenue, icon: <TrendingUp className="text-green-500" />, colorClass: "text-green-600 dark:text-green-500" },
    { label: "Total Cost of Goods Sold (COGS)", value: summary.totalCOGS, icon: <TrendingDown className="text-orange-500" />, colorClass: "text-orange-600 dark:text-orange-500" },
    { label: "Gross Profit", value: summary.grossProfit, icon: <DollarSign className={cn(summary.grossProfit >=0 ? "text-green-600" : "text-destructive")} />, colorClass: summary.grossProfit >=0 ? "text-green-600 dark:text-green-500" : "text-destructive" },
    { label: "Total Operating Expenses", value: summary.totalExpenses, icon: <TrendingDown className="text-red-500" />, colorClass: "text-destructive" },
    { label: "Net Profit / (Loss)", value: summary.netProfit, icon: <AlertTriangle className={cn(summary.netProfit >=0 ? "text-green-600" : "text-destructive")} />, colorClass: summary.netProfit >=0 ? "text-green-600 dark:text-green-500" : "text-destructive" },
  ];

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
           <BarChart className="h-5 w-5" />
           {cardTitle}
        </CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 text-sm">
          {summaryItems.map(item => (
            <div key={item.label} className="p-3 bg-tertiary rounded-md shadow-sm border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                {React.cloneElement(item.icon, { size: 18 })}
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</h4>
              </div>
              <p className={cn("text-xl font-bold", item.colorClass)}>{currencySymbol}{item.value.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
