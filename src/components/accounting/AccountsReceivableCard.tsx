
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { getCurrencySymbol } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';

export function AccountsReceivableCard() {
  const { getAccountsReceivableSummary, userProfile } = useInventoryStore(state => ({
    getAccountsReceivableSummary: state.getAccountsReceivableSummary,
    userProfile: state.userProfile,
  }));
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;

  const { totalReceivable, unpaidInvoices } = useMemo(() => {
    return getAccountsReceivableSummary(companyId);
  }, [companyId, getAccountsReceivableSummary]);

  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency);
  const topUnpaidInvoices = unpaidInvoices.slice(0, 5);

  return (
    <Card className="shadow-lg border-t-2 border-t-green-600">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingUp size={20} />
                    Accounts Receivable
                </CardTitle>
                <CardDescription>Money owed to you by customers.</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-green-600">{currencySymbol}{totalReceivable.toFixed(2)}</p>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Recent Outstanding Invoices</h4>
        {topUnpaidInvoices.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Amount Due</TableHead>
                  <TableHead className="text-xs text-right">Bill Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUnpaidInvoices.map(bill => (
                  <TableRow key={bill.id}>
                    <TableCell className="text-sm py-1.5">{bill.vendorOrCustomerName || 'N/A'}</TableCell>
                    <TableCell className="text-sm py-1.5 text-right font-semibold">{currencySymbol}{bill.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-sm py-1.5 text-right">{format(new Date(bill.date), 'PP')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-center text-muted-foreground py-4 border rounded-md border-dashed">No outstanding receivables. Great job!</p>
        )}
      </CardContent>
      {unpaidInvoices.length > 5 && (
        <CardFooter>
          <Button asChild variant="link" className="text-sm text-primary w-full">
            <Link href="/admin/billing?paymentStatus=unpaid&type=sell">
              View All {unpaidInvoices.length} Outstanding Invoices <ArrowRight size={16} className="ml-1" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
