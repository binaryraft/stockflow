
"use client";

import { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { StatCard } from './stat-card';
import { Package, DollarSign, ShoppingCart, AlertTriangle, Users, ReceiptText, Archive, TrendingUp, Contact } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TodaysFinancialSummary, TimePeriod } from '@/types'; 
import { getCurrencySymbol } from '@/lib/utils';

const LOW_STOCK_THRESHOLD = 5;

interface DailyStats {
  totalProducts: number;
  totalCustomers: number;
  salesToday: string; 
  purchasesToday: string; 
  transactionsToday: number;
  defectivesToday: number;
  lowStockCount: number;
  grossProfitToday: string; 
}

export function OverviewStats({ period }: { period: TimePeriod }) {
  const { 
    products, 
    getLowStockProductCount, 
    getPeriodFinancialSummary,
    userProfile,
    getAllCustomers
  } = useInventoryStore((state) => ({
    products: state.products,
    getLowStockProductCount: state.getLowStockProductCount,
    getPeriodFinancialSummary: state.getPeriodFinancialSummary,
    userProfile: state.userProfile,
    getAllCustomers: state.getAllCustomers,
  }));

  const [stats, setStats] = useState<DailyStats>({
    totalProducts: 0,
    totalCustomers: 0,
    salesToday: '₹0.00',
    purchasesToday: '₹0.00',
    transactionsToday: 0,
    defectivesToday: 0,
    lowStockCount: 0,
    grossProfitToday: '₹0.00',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  const periodTextMap: Record<TimePeriod, string> = {
    daily: "Today's",
    weekly: "This Week's",
    monthly: "This Month's",
  };
  const periodDescriptionMap: Record<TimePeriod, string> = {
    daily: `transactions today`,
    weekly: `transactions this week`,
    monthly: `transactions this month`,
  };


  useEffect(() => {
    setCurrencySymbol(getCurrencySymbol(userProfile.companyCurrency));
  }, [userProfile.companyCurrency]);

  useEffect(() => {
    setIsLoading(true);
    
    const periodFinancials = getPeriodFinancialSummary(period);
    const totalTrackedProducts = Array.isArray(products) ? products.filter(p => p.trackQuantity).length : 0;
    const totalCustomers = getAllCustomers().length;

    let lowStock = 0;
    if (typeof getLowStockProductCount === 'function') {
      lowStock = getLowStockProductCount(LOW_STOCK_THRESHOLD);
    }

    setStats({
      totalProducts: totalTrackedProducts,
      totalCustomers: totalCustomers,
      salesToday: `${currencySymbol}${periodFinancials.totalRevenue.toFixed(2)}`,
      purchasesToday: `${currencySymbol}${periodFinancials.totalExpenses.toFixed(2)}`,
      transactionsToday: periodFinancials.transactionsToday,
      defectivesToday: periodFinancials.defectivesToday,
      lowStockCount: lowStock,
      grossProfitToday: `${currencySymbol}${periodFinancials.grossProfit.toFixed(2)}`,
    });
    setIsLoading(false);
  }, [products, getLowStockProductCount, getPeriodFinancialSummary, currencySymbol, getAllCustomers, period]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={`${periodTextMap[period]} Sales`}
        value={stats.salesToday}
        icon={DollarSign}
        description={`${stats.transactionsToday} ${periodDescriptionMap[period]}`}
        isLoading={isLoading}
      />
       <StatCard
        title={`${periodTextMap[period]} Gross Profit`}
        value={stats.grossProfitToday}
        icon={TrendingUp}
        description="Sales minus Cost of Goods Sold"
        isLoading={isLoading}
        valueClassName={parseFloat(stats.grossProfitToday.replace(currencySymbol, '')) >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive"}
      />
      <StatCard
        title={`${periodTextMap[period]} Purchases`}
        value={stats.purchasesToday}
        icon={ShoppingCart}
        description={`Total cost of purchases`}
        isLoading={isLoading}
      />
      <StatCard
        title="Low Stock Products"
        value={stats.lowStockCount}
        icon={Archive}
        description={`Products below ${LOW_STOCK_THRESHOLD} units`}
        isLoading={isLoading}
        valueClassName={stats.lowStockCount > 0 ? "text-destructive" : undefined}
      />
    </div>
  );
}
