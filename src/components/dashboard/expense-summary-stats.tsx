
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle, BarChartHorizontalBig } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/utils';


import { LoadingSpinner } from '@/components/ui/loading-spinner';


interface ExpenseSummary {
  totalCoveredExpenseValue: number;
  totalUncoveredExpenseValue: number;
  totalPotentialProfitOnCoveredExpenses: number;
  totalOutstandingCostOnUncoveredExpenses: number;
  coveredBillCount: number;
  uncoveredBillCount: number;
}

export function ExpenseSummaryStats() {
  const { getExpenseSummary, userProfile, bills } = useInventoryStore((state) => ({
    getExpenseSummary: state.getExpenseSummaryStats,
    userProfile: state.userProfile,
    bills: state.bills
  }));
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  useEffect(() => {
    setHasMounted(true);
    setCurrencySymbol(getCurrencySymbol(userProfile.companyCurrency));

    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [userProfile.companyCurrency]);

  useEffect(() => {
    if (hasMounted && !isLoading) {
      setSummary(getExpenseSummary());
    }
  }, [hasMounted, isLoading, getExpenseSummary]);

  const showLoading = isLoading && bills.length === 0;

  if (showLoading) {
    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChartHorizontalBig className="h-5 w-5 text-primary" />
            Expense Coverage Summary
          </CardTitle>
          <CardDescription>Aggregated statistics about expense coverage.</CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <LoadingSpinner context="billing" minimal text="Synthesizing coverage metrics..." />
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const totalBills = summary.coveredBillCount + summary.uncoveredBillCount;
  const overallPotentialNet = summary.totalPotentialProfitOnCoveredExpenses - summary.totalOutstandingCostOnUncoveredExpenses;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <BarChartHorizontalBig className="h-5 w-5" />
          Expense Coverage Summary
        </CardTitle>
        <CardDescription>Financial overview of your expense bills based on potential revenue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">

          <StatItem
            icon={<CheckCircle className="text-green-500" />}
            label="Covered Expense Cost"
            value={`${currencySymbol}${(summary.totalCoveredExpenseValue || 0).toFixed(2)}`}
            description={`${summary.coveredBillCount} bill(s)`}
          />
          <StatItem
            icon={<XCircle className="text-red-500" />}
            label="Uncovered Expense Cost"
            value={`${currencySymbol}${(summary.totalUncoveredExpenseValue || 0).toFixed(2)}`}
            description={`${summary.uncoveredBillCount} bill(s)`}
          />
          <StatItem
            icon={<TrendingUp className="text-green-500" />}
            label="Pot. Profit (Covered)"
            value={`${currencySymbol}${(summary.totalPotentialProfitOnCoveredExpenses || 0).toFixed(2)}`}
            description="From covered bills"
          />
          <StatItem
            icon={<TrendingDown className="text-red-500" />}
            label="Outstanding (Uncovered)"
            value={`${currencySymbol}${(summary.totalOutstandingCostOnUncoveredExpenses || 0).toFixed(2)}`}
            description="Cost yet to be covered"
          />
        </div>
        <div className="pt-3 border-t border-dashed text-center">
          <p className="text-sm text-muted-foreground">
            Overall Potential Net from All Processed Expenses:
            <span className={cn(
              "font-bold text-lg ml-1.5",
              overallPotentialNet >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
            )}>
              {currencySymbol}{(overallPotentialNet || 0).toFixed(2)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            (Based on sell prices set at the time of purchase for all items in expense bills)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  description?: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value, description }) => {
  return (
    <div className="p-3 bg-tertiary rounded-md shadow-sm border border-border/50">
      <div className="flex items-center gap-2 mb-1">
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</h4>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
};
