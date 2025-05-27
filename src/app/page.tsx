
"use client";
import { PageTitle } from '@/components/common/page-title';
import { OverviewStats } from '@/components/dashboard/overview-stats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, PackageSearch, History, ShoppingBag, Send, RotateCcw, DollarSign } from 'lucide-react';
import { SalesExpensesOverviewChart } from '@/components/dashboard/sales-expenses-overview-chart';
import { TopProductsChart } from '@/components/dashboard/top-products-chart';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import type { Bill } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function getBillTypeIconAndColor(billType: Bill['type'], isDefectiveReturn?: boolean): { icon: JSX.Element; colorClass: string; name: string } {
    if (billType === 'buy') return { icon: <ShoppingBag className="h-4 w-4" />, colorClass: 'text-destructive', name: 'Expense' };
    if (billType === 'sell') return { icon: <Send className="h-4 w-4" />, colorClass: 'text-primary', name: 'Sales' };
    if (isDefectiveReturn) return { icon: <RotateCcw className="h-4 w-4" />, colorClass: 'text-amber-600 dark:text-amber-500', name: 'Return (Defective)' }; // Kept amber for returns, but distinct name
    return { icon: <RotateCcw className="h-4 w-4" />, colorClass: 'text-amber-600 dark:text-amber-500', name: 'Return' };
};

export default function DashboardPage() {
  const getRecentBills = useInventoryStore((state) => state.getRecentBills);
  const recentBills = getRecentBills(5); // Get last 5 bills

  return (
    <div className="flex flex-col gap-8">
      <PageTitle title="Dashboard" />
      
      <OverviewStats />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
          <CardHeader>
            <CardTitle>Sales & Expenses (Last 7 Days)</CardTitle>
            <CardDescription>Daily overview of sales and expenses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <SalesExpensesOverviewChart />
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
          <CardHeader>
            <CardTitle>Top 5 Selling Products (by Revenue)</CardTitle>
            <CardDescription>Products generating the most revenue.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <TopProductsChart />
          </CardContent>
        </Card>
      </div>

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
              <Link href="/billing?action=new&mode=sell">
                <Send className="mr-2 h-4 w-4" /> New Sales Bill
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/billing?action=new&mode=buy">
                <ShoppingBag className="mr-2 h-4 w-4" /> New Expense Bill
              </Link>
            </Button>
             <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/products?action=add"> {/* Assuming products page can handle ?action=add to open dialog */}
                <PackageSearch className="mr-2 h-4 w-4" /> Add New Product
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest bills processed.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {recentBills.length === 0 ? (
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
              <DollarSign className="h-5 w-5 text-primary" /> {/* Changed icon */}
              Quick Links
            </CardTitle>
             <CardDescription>Navigate to important sections.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-4">
            <Button asChild variant="link" className="w-full justify-start p-0 h-auto">
              <Link href="/products">View All Products</Link>
            </Button>
            <Button asChild variant="link" className="w-full justify-start p-0 h-auto">
              <Link href="/billing">View Bill History</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
