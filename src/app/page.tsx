
import { PageTitle } from '@/components/common/page-title';
import { OverviewStats } from '@/components/dashboard/overview-stats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, PackageSearch, History, ShoppingBag, Send } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageTitle title="Dashboard" />
      
      <OverviewStats />

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
              <PackageSearch className="h-5 w-5 text-primary" />
              Recent Activity (Placeholder)
            </CardTitle>
            <CardDescription>Latest inventory movements and sales.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Recent activities will be shown here. This could include latest bills, low stock alerts, etc.
            </p>
            {/* Placeholder for recent activity list or chart */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs p-2 rounded-md bg-tertiary"><span>Sold 5x Apples</span><span>₹5.00</span></div>
              <div className="flex justify-between text-xs p-2 rounded-md bg-tertiary"><span>Purchased 10x Bread</span><span>₹15.00</span></div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
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
