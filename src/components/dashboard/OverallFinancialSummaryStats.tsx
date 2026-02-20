
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
  const { dashboardAnalytics, userProfile } = useInventoryStore((state) => ({
    dashboardAnalytics: state.dashboardAnalytics,
    userProfile: state.userProfile,
  }));

  const [currencySymbol, setCurrencySymbol] = useState('₹');

  const periodTextMap: Record<TimePeriod, string> = {
    daily: "Today's",
    weekly: "This Week's",
    monthly: "This Month's",
    yearly: "This Year's",
  };

  useEffect(() => {
    setCurrencySymbol(getCurrencySymbol(userProfile.companyCurrency));
  }, [userProfile.companyCurrency]);

  const summary = dashboardAnalytics ? {
    totalRevenue: dashboardAnalytics.summary.totalRevenue,
    totalCOGS: dashboardAnalytics.summary.totalRevenue - dashboardAnalytics.summary.grossProfit,
    grossProfit: dashboardAnalytics.summary.grossProfit,
    totalExpenses: dashboardAnalytics.summary.totalExpenses,
    netProfit: dashboardAnalytics.summary.grossProfit - dashboardAnalytics.summary.totalExpenses,
  } : null;

  const hasMounted = !!dashboardAnalytics;

  const cardTitle = `Financial Summary (${periodTextMap[period]})`;
  const cardDescription = `Financial performance metrics for the selected period.`;


  if (!hasMounted || !summary) {
    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow">
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
    {
      label: "Total Sales",
      value: summary.totalRevenue,
      icon: <TrendingUp />,
      gradient: "from-green-500/10 to-green-500/5",
      iconColor: "text-green-600 dark:text-green-400",
      description: "Total gross revenue generated"
    },
    {
      label: "COGS",
      value: summary.totalCOGS,
      icon: <TrendingDown />,
      gradient: "from-orange-500/10 to-orange-500/5",
      iconColor: "text-orange-600 dark:text-orange-400",
      description: "Cost of Goods Sold"
    },
    {
      label: "Gross Profit",
      value: summary.grossProfit,
      icon: <DollarSign />,
      gradient: "from-primary/15 to-primary/5",
      iconColor: "text-primary",
      description: "Sales minus COGS"
    },
    {
      label: "Operating Expenses",
      value: summary.totalExpenses,
      icon: <TrendingDown />,
      gradient: "from-destructive/10 to-destructive/5",
      iconColor: "text-destructive",
      description: "Direct business overheads"
    },
  ];

  const netProfit = summary.netProfit;
  const isProfitable = netProfit >= 0;

  return (
    <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-card to-muted/30">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {cardTitle}
            </CardTitle>
            <CardDescription className="text-sm font-medium opacity-80 mt-1">{cardDescription}</CardDescription>
          </div>
          <div className={cn(
            "px-4 py-2 rounded-2xl flex flex-col items-end transition-all-fast hover:scale-105 border",
            isProfitable
              ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          )}>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Net {isProfitable ? 'Profit' : 'Loss'}</span>
            <span className="text-2xl font-black tabular-nums">{currencySymbol}{Math.abs(netProfit).toFixed(2)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryItems.map((item, idx) => (
            <div
              key={item.label}
              className={cn(
                "group relative p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 border border-border/50 bg-gradient-to-b overflow-hidden",
                item.gradient
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={cn("p-2.5 rounded-xl bg-background/80 shadow-sm transition-transform group-hover:scale-110", item.iconColor)}>
                  {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-foreground">{currencySymbol}{item.value.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/80 font-medium leading-none">{item.description}</p>
              </div>

              {/* Decorative accent */}
              <div className={cn(
                "absolute -bottom-6 -right-6 w-16 h-16 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40",
                item.iconColor.includes('green') ? 'bg-green-500' :
                  item.iconColor.includes('primary') ? 'bg-primary' :
                    item.iconColor.includes('orange') ? 'bg-orange-500' : 'bg-destructive'
              )} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
