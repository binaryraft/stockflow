"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { getCurrencySymbol } from '@/lib/utils';
import { format } from 'date-fns';
import type { Bill } from '@/types';

interface SalesTaxReportProps {
  startDate?: Date;
  endDate?: Date;
}

export function SalesTaxReport({ startDate, endDate }: SalesTaxReportProps) {
  const { getSalesBillsByDateRange, userProfile } = useInventoryStore(state => ({
    getSalesBillsByDateRange: state.getSalesBillsByDateRange,
    userProfile: state.userProfile
  }));
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;

  const salesBills = useMemo(() => {
    return getSalesBillsByDateRange(startDate, endDate, companyId);
  }, [startDate, endDate, companyId, getSalesBillsByDateRange]);

  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency);

  const totals = useMemo(() => {
    return salesBills.reduce((acc, bill) => {
      acc.subTotal += bill.subTotal || 0;
      acc.totalSGST += bill.totalSGST || 0;
      acc.totalCGST += bill.totalCGST || 0;
      acc.totalAmount += bill.totalAmount;
      return acc;
    }, { subTotal: 0, totalSGST: 0, totalCGST: 0, totalAmount: 0 });
  }, [salesBills]);

  return (
    <Card className="shadow-lg border-t-2 border-t-primary w-full">
      <CardHeader>
        <CardTitle>Sales Tax (GST) Report</CardTitle>
        <CardDescription>
          Summary of collected SGST and CGST from sales invoices in the selected period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bill ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Taxable Value</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">Total Tax</TableHead>
                <TableHead className="text-right">Invoice Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesBills.length > 0 ? salesBills.map(bill => {
                const totalTaxOnBill = (bill.totalSGST || 0) + (bill.totalCGST || 0);
                return (
                  <TableRow key={bill.id}>
                    <TableCell className="text-xs">{format(new Date(bill.date), 'PP')}</TableCell>
                    <TableCell className="font-mono text-xs">{bill.id}</TableCell>
                    <TableCell>{bill.vendorOrCustomerName || '-'}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{(bill.subTotal || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{(bill.totalSGST || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{(bill.totalCGST || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">{currencySymbol}{totalTaxOnBill.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{currencySymbol}{bill.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">No sales data for the selected period.</TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted font-bold text-base">
                <TableCell colSpan={3}>Totals for Period</TableCell>
                <TableCell className="text-right">{currencySymbol}{totals.subTotal.toFixed(2)}</TableCell>
                <TableCell className="text-right">{currencySymbol}{totals.totalSGST.toFixed(2)}</TableCell>
                <TableCell className="text-right">{currencySymbol}{totals.totalCGST.toFixed(2)}</TableCell>
                <TableCell className="text-right">{currencySymbol}{(totals.totalSGST + totals.totalCGST).toFixed(2)}</TableCell>
                <TableCell className="text-right text-primary">{currencySymbol}{totals.totalAmount.toFixed(2)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
