
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

import { ExportConfig } from './report-export-dialog';

interface GstReportProps {
  startDate?: Date;
  endDate?: Date;
  storeId?: string;
  config?: ExportConfig;
}

const TaxReportTable: React.FC<{
  title: string;
  description: string;
  bills: Bill[];
  currencySymbol: string;
  type: 'sales' | 'purchases';
  config?: ExportConfig;
}> = ({ title, description, bills, currencySymbol, type, config }) => {

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
                  <TableRow key={bill.id} className={cn(config?.compactMode ? "h-6" : "")}>
                    <TableCell className={cn("text-xs", config?.compactMode ? "py-1" : "")}>{format(new Date(bill.date), 'PP')}</TableCell>
                    <TableCell className={cn("font-mono text-xs", config?.compactMode ? "py-1" : "")}>{bill.id.substring(0, 8)}</TableCell>
                    <TableCell className={config?.compactMode ? "py-1" : ""}>{bill.vendorOrCustomerName || '-'}</TableCell>
                    <TableCell className={cn("text-right", config?.compactMode ? "py-1 font-mono" : "")}>{currencySymbol}{(bill.subTotal || 0).toFixed(2)}</TableCell>
                    <TableCell className={cn("text-right", config?.compactMode ? "py-1" : "")}>{currencySymbol}{(bill.totalSGST || 0).toFixed(2)}</TableCell>
                    <TableCell className={cn("text-right", config?.compactMode ? "py-1" : "")}>{currencySymbol}{(bill.totalCGST || 0).toFixed(2)}</TableCell>
                    <TableCell className={cn("text-right font-medium", config?.compactMode ? "py-1" : "")}>{currencySymbol}{(totalTaxOnBill || 0).toFixed(2)}</TableCell>
                    <TableCell className={cn("text-right font-semibold", titleColor, config?.compactMode ? "py-1" : "")}>{currencySymbol}{(bill.totalAmount || 0).toFixed(2)}</TableCell>
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
                <TableCell className="text-right">{currencySymbol}{(totals.subTotal || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">{currencySymbol}{(totals.totalSGST || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">{currencySymbol}{(totals.totalCGST || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">{currencySymbol}{((totals.totalSGST || 0) + (totals.totalCGST || 0)).toFixed(2)}</TableCell>
                <TableCell className={cn("text-right", titleColor)}>{currencySymbol}{(totals.totalAmount || 0).toFixed(2)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};


import { AIInsightLoading } from '@/components/common/AIInsightLoading';

export function GstReport({ startDate, endDate, storeId, config }: GstReportProps) {
  const { fetchAccountingReport, accountingReport, accountingLoading, userProfile } = useInventoryStore(state => ({
    fetchAccountingReport: state.fetchAccountingReport,
    accountingReport: state.accountingReport,
    accountingLoading: state.accountingLoading,
    userProfile: state.userProfile
  }));

  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;

  React.useEffect(() => {
    if (companyId) {
      fetchAccountingReport({
        companyId,
        storeId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        reportType: 'gst'
      });
    }
  }, [startDate, endDate, storeId, companyId, fetchAccountingReport]);

  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency);

  const showLoading = accountingLoading && (!accountingReport || !accountingReport.summary);

  if (showLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
        <AIInsightLoading context="dashboard" />
        <p className="text-sm text-muted-foreground font-medium mt-2">Generating standard GST report...</p>
      </div>
    );
  }

  if (!accountingReport || !accountingReport.summary) {
    return (
      <div className="text-center p-12 bg-muted/30 rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">No GST data found for the selected period.</p>
      </div>
    );
  }

  const { summary, detailed } = accountingReport;

  const salesSummary = summary.find((s: any) => s._id === 'sell') || { taxableValue: 0, sgst: 0, cgst: 0, totalAmount: 0 };
  const purchaseSummary = summary.find((s: any) => s._id === 'buy') || { taxableValue: 0, sgst: 0, cgst: 0, totalAmount: 0 };

  const outputTaxTotal = (salesSummary.sgst || 0) + (salesSummary.cgst || 0);
  const inputTaxTotal = (purchaseSummary.sgst || 0) + (purchaseSummary.cgst || 0);
  const netGstPayable = outputTaxTotal - inputTaxTotal;

  // Split detailed bills for the tables
  const salesBills = detailed?.filter((b: any) => b.type === 'sell') || [];
  const expenseBills = detailed?.filter((b: any) => b.type === 'buy') || [];

  return (
    <div className={cn("space-y-6", config?.compactMode ? "space-y-2" : "")}>
      <TaxReportTable
        title="Output Tax (on Sales)"
        description={`Summary of tax collected from customers. ${salesBills.length > 0 ? `Showing latest ${salesBills.length} records.` : ''}`}
        bills={salesBills}
        currencySymbol={currencySymbol}
        type="sales"
        config={config}
      />
      <TaxReportTable
        title="Input Tax Credit (on Purchases)"
        description={`Summary of tax paid to suppliers. ${expenseBills.length > 0 ? `Showing latest ${expenseBills.length} records.` : ''}`}
        bills={expenseBills}
        currencySymbol={currencySymbol}
        type="purchases"
        config={config}
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Net GST Liability Summary</CardTitle>
          <CardDescription>
            Calculation of your net tax obligation for the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-lg">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total Output Tax (A)</span>
            <span className="font-medium text-foreground">{currencySymbol}{(outputTaxTotal || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Less: Input Tax Credit (B)</span>
            <span className="font-medium text-foreground">({currencySymbol}{(inputTaxTotal || 0).toFixed(2)})</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between items-center font-bold text-xl p-4 rounded-md bg-tertiary">
            <span>Net GST Payable (A - B)</span>
            <span className={netGstPayable >= 0 ? "text-green-600" : "text-destructive"}>
              {currencySymbol}{(netGstPayable || 0).toFixed(2)}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            This report is optimized for large datasets and uses server-side aggregation.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
