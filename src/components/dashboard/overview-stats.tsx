
"use client";

import { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { StatCard } from './stat-card';
import { Package, DollarSign, ShoppingCart, AlertTriangle, Users, ReceiptText, Archive, TrendingUp, Contact } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TodaysFinancialSummary, TimePeriod } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';
import { AIInsightLoading } from '@/components/common/AIInsightLoading';

const LOW_STOCK_THRESHOLD = 5;

export function OverviewStats({ period }: { period: TimePeriod }) {
  const {
    dashboardAnalytics,
    fetchDashboardAnalytics,
    userProfile,
  } = useInventoryStore((state) => ({
    dashboardAnalytics: state.dashboardAnalytics,
    fetchDashboardAnalytics: state.fetchDashboardAnalytics,
    userProfile: state.userProfile,
  }));

  const [isLoading, setIsLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  const periodTextMap: Record<TimePeriod, string> = {
    daily: "Today's",
    weekly: "This Week's",
    monthly: "This Month's",
    yearly: "This Year's",
  };
  const periodDescriptionMap: Record<TimePeriod, string> = {
    daily: `transactions today`,
    weekly: `transactions this week`,
    monthly: `transactions this month`,
    yearly: `transactions this year`,
  };

  useEffect(() => {
    setCurrencySymbol(getCurrencySymbol(userProfile.companyCurrency));
  }, [userProfile.companyCurrency]);

  useEffect(() => {
    const companyId = localStorage.getItem('companyId');
    if (companyId) {
      const hasData = !!dashboardAnalytics;
      if (!hasData) setIsLoading(true);
      fetchDashboardAnalytics(companyId, period).finally(() => setIsLoading(false));
    }
  }, [fetchDashboardAnalytics, period, dashboardAnalytics]);

  const stats = {
    sales: `${currencySymbol}${(dashboardAnalytics?.summary.totalRevenue || 0).toFixed(2)}`,
    purchases: `${currencySymbol}${(dashboardAnalytics?.summary.totalExpenses || 0).toFixed(2)}`,
    transactions: dashboardAnalytics?.summary.transactionsToday || 0,
    lowStock: dashboardAnalytics?.summary.lowStockCount || 0,
    grossProfit: `${currencySymbol}${(dashboardAnalytics?.summary.grossProfit || 0).toFixed(2)}`,
    grossProfitValue: dashboardAnalytics?.summary.grossProfit || 0,
  };

  const showLoading = isLoading && !dashboardAnalytics;

  if (showLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 col-span-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 border border-primary/10 rounded-xl flex items-center justify-center bg-card/50 overflow-hidden">
            <AIInsightLoading context="dashboard" minimal className="scale-90" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={`${periodTextMap[period]} Sales`}
        value={stats.sales}
        icon={DollarSign}
        description={`${stats.transactions} ${periodDescriptionMap[period]}`}
        isLoading={showLoading}
      />
      <StatCard
        title={`${periodTextMap[period]} Gross Profit`}
        value={stats.grossProfit}
        icon={TrendingUp}
        description="Sales minus Cost of Goods Sold"
        isLoading={showLoading}
        valueClassName={stats.grossProfitValue >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive"}
      />
      <StatCard
        title={`${periodTextMap[period]} Purchases`}
        value={stats.purchases}
        icon={ShoppingCart}
        description={`Total cost of purchases`}
        isLoading={showLoading}
      />
      <StatCard
        title="Low Stock Products"
        value={stats.lowStock}
        icon={Archive}
        description={`Products below ${LOW_STOCK_THRESHOLD} units`}
        isLoading={showLoading}
        valueClassName={stats.lowStock > 0 ? "text-destructive" : undefined}
      />
    </div>
  );
}
