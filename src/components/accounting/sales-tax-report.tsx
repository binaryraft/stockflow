
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { getCurrencySymbol } from '@/lib/utils';
import { format } from 'date-fns';
import type { Bill } from '@/types';
import { Separator } from '../ui/separator';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GstReportProps {
  startDate?: Date;
  endDate?: Date;
}

const TaxReportTable: React.FC<{
  title: string;
  description: string;
  bills: Bill[];
  currencySymbol: string;
  type: 'sales' | 'purchases';
}> = ({ title, description, bills, currencySymbol, type }) => {

  const totals = useMemo(() => {
    return bills.reduce((acc, bill) => {
      acc.subTotal += bill.subTotal || 0;
      acc.totalSGST += bill.totalSGST || 0;
      acc.totalCGST += bill.totalCGST || 0;
      acc.totalAmount += bill.totalAmount;
      return acc;
    }, { subTotal: 0, totalSGST: 0, totalCGST: 0, totalAmount: 0 });
  }, [bills]);

  const titleColor = type === 'sales' ? 'text-green-600' : 'text-destructive';
  const headerIcon = type === 'sales' ? <TrendingUp className={titleColor} /> : <TrendingDown className={titleColor} />;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2", titleColor)}>
            {headerIcon}
            {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bill ID</TableHead>
                <TableHead>{type === 'sales' ? 'Customer' : 'Vendor'}</TableHead>
                <TableHead className="text-right">Taxable Value</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">Total Tax</TableHead>
                <TableHead className="text-right">Invoice Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length > 0 ? bills.map(bill => {
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
                    <TableCell className={cn("text-right font-semibold", titleColor)}>{currencySymbol}{bill.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">No {type} data for the selected period.</TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted font-bold text-base">
                <TableCell colSpan={3}>Totals</TableCell>
                <TableCell className="text-right">{currencySymbol}{totals.subTotal.toFixed(2)}</TableCell>
                <TableCell className="text-right">{currencySymbol}{totals.totalSGST.toFixed(2)}</TableCell>
                <TableCell className="text-right">{currencySymbol}{totals.totalCGST.toFixed(2)}</TableCell>
                <TableCell className="text-right">{currencySymbol}{(totals.totalSGST + totals.totalCGST).toFixed(2)}</TableCell>
                <TableCell className={cn("text-right", titleColor)}>{currencySymbol}{totals.totalAmount.toFixed(2)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};


export function GstReport({ startDate, endDate }: GstReportProps) {
  const { getSalesBillsByDateRange, getExpenseBillsByDateRange, userProfile } = useInventoryStore(state => ({
    getSalesBillsByDateRange: state.getSalesBillsByDateRange,
    getExpenseBillsByDateRange: state.getExpenseBillsByDateRange,
    userProfile: state.userProfile
  }));
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;

  const salesBills = useMemo(() => {
    return getSalesBillsByDateRange(startDate, endDate, companyId);
  }, [startDate, endDate, companyId, getSalesBillsByDateRange]);

  const expenseBills = useMemo(() => {
    return getExpenseBillsByDateRange(startDate, endDate, companyId);
  }, [startDate, endDate, companyId, getExpenseBillsByDateRange]);

  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency);

  const outputTaxTotal = useMemo(() => {
    return salesBills.reduce((acc, bill) => acc + (bill.totalSGST || 0) + (bill.totalCGST || 0), 0);
  }, [salesBills]);

  const inputTaxTotal = useMemo(() => {
    return expenseBills.reduce((acc, bill) => acc + (bill.totalSGST || 0) + (bill.totalCGST || 0), 0);
  }, [expenseBills]);

  const netGstPayable = outputTaxTotal - inputTaxTotal;

  return (
    <div className="space-y-6">
      <TaxReportTable 
        title="Output Tax (on Sales)"
        description="Tax collected from customers on sales invoices."
        bills={salesBills}
        currencySymbol={currencySymbol}
        type="sales"
      />
      <TaxReportTable 
        title="Input Tax Credit (on Purchases)"
        description="Tax paid to suppliers on expense bills, available for credit."
        bills={expenseBills}
        currencySymbol={currencySymbol}
        type="purchases"
      />
       <Card className="shadow-lg border-t-2 border-t-primary">
          <CardHeader>
            <CardTitle>Net GST Liability Summary</CardTitle>
            <CardDescription>
              Calculation of your net tax obligation for the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-lg">
             <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Output Tax (A)</span>
                <span className="font-medium text-foreground">{currencySymbol}{outputTaxTotal.toFixed(2)}</span>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Less: Input Tax Credit (B)</span>
                <span className="font-medium text-foreground">({currencySymbol}{inputTaxTotal.toFixed(2)})</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-center font-bold text-xl p-4 rounded-md bg-tertiary">
                <span>Net GST Payable (A - B)</span>
                <span className={netGstPayable >= 0 ? "text-green-600" : "text-destructive"}>
                    {currencySymbol}{netGstPayable.toFixed(2)}
                </span>
            </div>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">
                This is a summary based on recorded bills. Please consult with a tax professional for final tax filing.
            </p>
           </CardFooter>
        </Card>
    </div>
  );
}
