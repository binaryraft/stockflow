
"use client";

import { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { StatCard } from './stat-card';
import { Package, DollarSign, ShoppingCart, AlertTriangle, Users, ReceiptText, Archive, TrendingUp } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TodaysFinancialSummary } from '@/types'; // Assuming FinancialSummary includes grossProfit

const LOW_STOCK_THRESHOLD = 5;

interface DailyStats {
  totalProducts: number;
  salesToday: number;
  purchasesToday: number;
  transactionsToday: number;
  defectivesToday: number;
  lowStockCount: number;
  grossProfitToday: number;
}

export function OverviewStats() {
  const { products, getLowStockProductCount, getTodaysFinancialSummary } = useInventoryStore((state) => ({
    products: state.products,
    getLowStockProductCount: state.getLowStockProductCount,
    getTodaysFinancialSummary: state.getTodaysFinancialSummary,
  }));

  const [stats, setStats] = useState<DailyStats>({
    totalProducts: 0,
    salesToday: 0,
    purchasesToday: 0,
    transactionsToday: 0,
    defectivesToday: 0,
    lowStockCount: 0,
    grossProfitToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    const todaysFinancials = getTodaysFinancialSummary();

    const totalTrackedProducts = Array.isArray(products) ? products.filter(p => p.trackQuantity).length : 0;
    
    let lowStock = 0;
    if (typeof getLowStockProductCount === 'function') {
      lowStock = getLowStockProductCount(LOW_STOCK_THRESHOLD);
    } else {
      console.error("getLowStockProductCount is not a function in OverviewStats");
    }

    setStats({
      totalProducts: totalTrackedProducts,
      salesToday: todaysFinancials.totalRevenue,
      purchasesToday: todaysFinancials.totalExpenses, // Assuming totalExpenses from summary is purchases for today
      transactionsToday: todaysFinancials.transactionsToday,
      defectivesToday: todaysFinancials.defectivesToday,
      lowStockCount: lowStock,
      grossProfitToday: todaysFinancials.grossProfit,
    });
    setIsLoading(false);
  }, [products, getLowStockProductCount, getTodaysFinancialSummary]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7"> {/* Adjusted for 7 cards */}
      <StatCard
        title="Total Products"
        value={stats.totalProducts}
        icon={Package}
        description="Number of distinct tracked products"
        isLoading={isLoading}
      />
      <StatCard
        title="Today's Sales"
        value={`₹${stats.salesToday.toFixed(2)}`}
        icon={DollarSign}
        description="Total revenue from sales today"
        isLoading={isLoading}
      />
      <StatCard
        title="Today's Purchases"
        value={`₹${stats.purchasesToday.toFixed(2)}`}
        icon={ShoppingCart}
        description="Total cost of purchases today"
        isLoading={isLoading}
      />
      <StatCard
        title="Today's Gross Profit"
        value={`₹${stats.grossProfitToday.toFixed(2)}`}
        icon={TrendingUp}
        description="Sales minus Cost of Goods Sold today"
        isLoading={isLoading}
        valueClassName={stats.grossProfitToday >= 0 ? "text-primary" : "text-destructive"}
      />
      <StatCard
        title="Today's Transactions"
        value={stats.transactionsToday}
        icon={ReceiptText}
        description="Total bills processed today"
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
      <StatCard
        title="Defectives Today"
        value={stats.defectivesToday}
        icon={AlertTriangle}
        description="Items marked defective in returns today"
        isLoading={isLoading}
        valueClassName={stats.defectivesToday > 0 ? "text-amber-600 dark:text-amber-500" : undefined}
      />
    </div>
  );
}
