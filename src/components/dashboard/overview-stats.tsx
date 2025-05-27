"use client";

import { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { StatCard } from './stat-card';
import { Package, DollarSign, ShoppingCart, AlertTriangle, Users } from 'lucide-react';
import { format } from 'date-fns';

interface DailyStats {
  totalProducts: number;
  salesToday: number;
  purchasesToday: number;
  transactionsToday: number;
  defectivesToday: number;
}

export function OverviewStats() {
  const { products, bills } = useInventoryStore((state) => ({
    products: state.products,
    bills: state.bills,
  }));

  const [stats, setStats] = useState<DailyStats>({
    totalProducts: 0,
    salesToday: 0,
    purchasesToday: 0,
    transactionsToday: 0,
    defectivesToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    let sales = 0;
    let purchases = 0;
    let transactions = 0;
    let defectives = 0;

    bills.forEach(bill => {
      const billDateStr = format(new Date(bill.date), 'yyyy-MM-dd');
      if (billDateStr === todayStr) {
        transactions++;
        if (bill.type === 'sell') {
          sales += bill.totalAmount;
        } else if (bill.type === 'buy') {
          purchases += bill.totalAmount;
        } else if (bill.type === 'return') {
          bill.items.forEach(item => {
            if (item.isDefective) {
              defectives += item.quantity;
            }
          });
        }
      }
    });
    
    const totalTrackedProducts = products.filter(p => p.trackQuantity).length;

    setStats({
      totalProducts: totalTrackedProducts,
      salesToday: sales,
      purchasesToday: purchases,
      transactionsToday: transactions,
      defectivesToday: defectives,
    });
    setIsLoading(false);
  }, [products, bills]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <StatCard
        title="Total Products"
        value={stats.totalProducts}
        icon={Package}
        description="Number of distinct tracked products"
        isLoading={isLoading}
      />
      <StatCard
        title="Today's Sales"
        value={`$${stats.salesToday.toFixed(2)}`}
        icon={DollarSign}
        description="Total revenue from sales today"
        isLoading={isLoading}
      />
      <StatCard
        title="Today's Purchases"
        value={`$${stats.purchasesToday.toFixed(2)}`}
        icon={ShoppingCart}
        description="Total cost of purchases today"
        isLoading={isLoading}
      />
      <StatCard
        title="Today's Transactions"
        value={stats.transactionsToday}
        icon={Users} // Using Users icon for transactions/customers
        description="Total bills processed today"
        isLoading={isLoading}
      />
      <StatCard
        title="Defectives Today"
        value={stats.defectivesToday}
        icon={AlertTriangle}
        description="Items marked defective in returns today"
        isLoading={isLoading}
      />
    </div>
  );
}
