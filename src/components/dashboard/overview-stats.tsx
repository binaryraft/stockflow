
"use client";

import { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { StatCard } from './stat-card';
import { Package, DollarSign, ShoppingCart, AlertTriangle, Users, ReceiptText, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DailyStats {
  totalProducts: number;
  salesToday: number;
  purchasesToday: number;
  transactionsToday: number;
  defectivesToday: number;
  lowStockCount: number;
}

const LOW_STOCK_THRESHOLD = 5;

export function OverviewStats() {
  const { products, bills, getLowStockProductCount } = useInventoryStore((state) => ({
    products: state.products,
    bills: state.bills,
    getLowStockProductCount: state.getLowStockProductCount,
  }));

  const [stats, setStats] = useState<DailyStats>({
    totalProducts: 0,
    salesToday: 0,
    purchasesToday: 0,
    transactionsToday: 0,
    defectivesToday: 0,
    lowStockCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    let sales = 0;
    let purchases = 0;
    let transactions = 0;
    let defectives = 0;

    if (Array.isArray(bills)) {
      bills.forEach(bill => {
        const billDateStr = format(new Date(bill.date), 'yyyy-MM-dd');
        if (billDateStr === todayStr) {
          transactions++;
          if (bill.type === 'sell') {
            sales += bill.totalAmount;
          } else if (bill.type === 'buy') {
            purchases += bill.totalAmount;
          } else if (bill.type === 'return') {
            if (Array.isArray(bill.items)) {
              bill.items.forEach(item => {
                if (item.isDefective) {
                  defectives += item.quantity;
                }
              });
            }
          }
        }
      });
    }
    
    const totalTrackedProducts = Array.isArray(products) ? products.filter(p => p.trackQuantity).length : 0;
    
    let lowStock = 0;
    if (typeof getLowStockProductCount === 'function') {
      lowStock = getLowStockProductCount(LOW_STOCK_THRESHOLD);
    } else {
      console.error("getLowStockProductCount is not a function in OverviewStats");
    }

    setStats({
      totalProducts: totalTrackedProducts,
      salesToday: sales,
      purchasesToday: purchases,
      transactionsToday: transactions,
      defectivesToday: defectives,
      lowStockCount: lowStock,
    });
    setIsLoading(false);
  }, [products, bills, getLowStockProductCount]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
