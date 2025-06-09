
"use client";
import React, { useState, useEffect } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { OverviewStats } from '@/components/dashboard/overview-stats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, PackageSearch, DollarSign, ShoppingBag, Send, RotateCcw, Users, Building, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { SalesExpensesOverviewChart } from '@/components/dashboard/sales-expenses-overview-chart';
import { TopProductsChart } from '@/components/dashboard/top-products-chart';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import type { Bill } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ExpenseTrackerCard } from '@/components/dashboard/expense-tracker-card';
import { ExpenseSummaryStats } from '@/components/dashboard/expense-summary-stats';
import { OverallFinancialSummaryStats } from '@/components/dashboard/OverallFinancialSummaryStats'; 
import { TopProfitableProductsChart } from '@/components/dashboard/TopProfitableProductsChart'; 


function getBillTypeIconAndColor(billType: Bill['type'], isDefectiveReturn?: boolean): { icon: JSX.Element; colorClass: string; name: string } {
    if (billType === 'buy') return { icon: <ShoppingBag className="h-4 w-4" />, colorClass: 'text-destructive', name: 'Expense' };
    if (billType === 'sell') return { icon: <Send className="h-4 w-4" />, colorClass: 'text-primary', name: 'Sales' };
    if (isDefectiveReturn) return { icon: <RotateCcw className="h-4 w-4" />, colorClass: 'text-amber-600 dark:text-amber-500', name: 'Return (Defective)' };
    return { icon: <RotateCcw className="h-4 w-4" />, colorClass: 'text-amber-600 dark:text-amber-500', name: 'Return' };
};

export default function DashboardPage() {
  const getRecentBillsFromStore = useInventoryStore((state) => state.getRecentBills);
  
  const [hasMounted, setHasMounted] = useState(false);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      setRecentBills(getRecentBillsFromStore(5)); 
    }
  }, [hasMounted, getRecentBillsFromStore]);

  return (
    <div className="flex flex-col gap-8">
      <PageTitle title="Admin Dashboard" />
      
      <OverviewStats />

      <OverallFinancialSummaryStats /> 

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Sales & Expenses (Last 7 Days)
            </CardTitle>
            <CardDescription>Daily overview of sales and expenses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <SalesExpensesOverviewChart />
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
          <CardHeader>
             <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top 5 Selling Products/SKUs (by Revenue)
            </CardTitle>
            <CardDescription>Products/SKUs generating the most revenue.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <TopProductsChart />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" /> 
              Top Products: Revenue vs. Cost
          </CardTitle>
          <CardDescription>Comparison of total revenue and total cost for top profitable products/SKUs.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          <TopProfitableProductsChart />
        </CardContent>
      </Card>
      
      <ExpenseSummaryStats />
      <ExpenseTrackerCard />


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Start common tasks quickly.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-4">
            <Button asChild variant="default" className="w-full justify-start">
              <Link href="/admin/billing?mode=sell">
                <Send className="mr-2 h-4 w-4" /> New Sales Bill
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/billing?mode=buy">
                <ShoppingBag className="mr-2 h-4 w-4" /> New Expense Bill
              </Link>
            </Button>
             <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/products/add">
                <PackageSearch className="mr-2 h-4 w-4" /> Add New Product
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest bills processed.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {!hasMounted || recentBills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent bills to display.</p>
            ) : (
              recentBills.map(bill => {
                const displayInfo = getBillTypeIconAndColor(bill.type, bill.type === 'return' && bill.items.some(i => i.isDefective));
                return (
                  <div key={bill.id} className="flex items-center justify-between text-sm p-2.5 rounded-md bg-tertiary shadow-sm">
                    <div className="flex items-center gap-2">
                      {React.cloneElement(displayInfo.icon, { className: cn("h-5 w-5", displayInfo.colorClass) })}
                      <div>
                        <span className={cn("font-medium", displayInfo.colorClass)}>{displayInfo.name}</span>
                        <div className="text-xs text-muted-foreground">
                          {bill.vendorOrCustomerName || `Bill ID: ${bill.id.slice(-6)}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="font-semibold text-foreground">₹{bill.totalAmount.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(bill.date), 'PP p')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Quick Links
            </CardTitle>
             <CardDescription>Navigate to important sections.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-4">
            <Button asChild variant="link" className="w-full justify-start p-0 h-auto">
              <Link href="/admin/products">View All Products</Link>
            </Button>
            <Button asChild variant="link" className="w-full justify-start p-0 h-auto">
              <Link href="/admin/billing">View Bill History</Link>
            </Button>
            <Button asChild variant="link" className="w-full justify-start p-0 h-auto">
              <Link href="/admin/staff">Manage Staff</Link>
            </Button>
             <Button asChild variant="link" className="w-full justify-start p-0 h-auto">
              <Link href="/admin/stores">Manage Stores</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
