
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import type { Customer } from '@/types';
import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { User, Phone, Mail, MapPin, ShoppingCart, RotateCcw, DollarSign, CalendarDays, ChevronLeft, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

// Placeholder for analytics data - to be implemented later
interface CustomerAnalytics {
  totalVisits: number;
  totalSpend: number;
  totalReturns: number;
  // preferredProducts: Array<{ productId: string, productName: string, count: number }>;
}

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;
  const { getCustomerById } = useInventoryStore();

  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      setIsLoading(true);
      const fetchedCustomer = getCustomerById(customerId);
      setCustomer(fetchedCustomer || null);
      // TODO: Fetch and compute customer analytics here once implemented
      setAnalytics({ totalVisits: 0, totalSpend: 0, totalReturns: 0 }); // Placeholder
      setIsLoading(false);
    }
  }, [customerId, getCustomerById]);

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center">Loading customer details...</div>;
  }

  if (!customer) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center py-10">
        <PageTitle title="Customer Not Found" icon={User} />
        <p className="text-destructive">The customer you are trying to view could not be found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/customers">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Customers List
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageTitle 
        title={customer.name || `Customer ID: ${customer.id}`} 
        icon={User}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/customers">
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to List
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {customer.name && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">{customer.name}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-foreground">{customer.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Activity Overview</CardTitle>
            <CardDescription>Summary of this customer's interactions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 bg-tertiary rounded-md">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">First Seen:</span>
                </div>
                <span className="font-medium text-foreground">{format(new Date(customer.firstSeen), 'PP')}</span>
            </div>
             <div className="flex items-center justify-between p-3 bg-tertiary rounded-md">
                 <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last Seen:</span>
                </div>
                <span className="font-medium text-foreground">{format(new Date(customer.lastSeen), 'PP')}</span>
            </div>
            <div className="pt-2 text-center">
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    Detailed analytics (visits, spend, returns, top products) coming soon!
                </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Purchase History (Coming Soon)</CardTitle>
             <CardDescription>A detailed list of all purchases made by this customer will be shown here.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm italic text-center py-8">
                Purchase history and product preferences will be displayed in a future update.
            </p>
          </CardContent>
        </Card>

    </div>
  );
}
