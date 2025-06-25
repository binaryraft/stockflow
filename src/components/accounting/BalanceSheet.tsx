
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { getCurrencySymbol } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Coins, HandCoins, Landmark, AlertTriangle } from 'lucide-react';

export function BalanceSheet() {
  const { getBalanceSheetSummary, userProfile } = useInventoryStore(state => ({
    getBalanceSheetSummary: state.getBalanceSheetSummary,
    userProfile: state.userProfile
  }));
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;

  const summary = useMemo(() => {
    return getBalanceSheetSummary(companyId);
  }, [companyId, getBalanceSheetSummary]);

  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency);

  const formatValue = (value: number) => {
    return `${currencySymbol}${value.toFixed(2)}`;
  };
  
  const totalAssets = summary.accountsReceivable + summary.inventoryValue;
  const totalLiabilitiesAndEquity = summary.accountsPayable + summary.retainedEarnings;
  const balanceDifference = totalAssets - totalLiabilitiesAndEquity;

  return (
    <Card className="shadow-lg border-t-2 border-t-primary w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle>Simplified Financial Position (Balance Sheet)</CardTitle>
        <CardDescription>
          A snapshot of your company's financial health based on available operational data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Assets Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-green-600 border-b pb-2 flex items-center gap-2">
                <Coins size={20} /> Assets
            </h3>
            <div className="space-y-3 pl-2">
              <div className="flex justify-between items-center">
                <span className="text-foreground">Accounts Receivable</span>
                <span className="font-medium">{formatValue(summary.accountsReceivable)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground">Inventory Value (at cost)</span>
                <span className="font-medium">{formatValue(summary.inventoryValue)}</span>
              </div>
              <Separator className="my-2"/>
              <div className="flex justify-between items-center font-bold text-base">
                <span>Total Assets</span>
                <span>{formatValue(totalAssets)}</span>
              </div>
            </div>
          </div>
          
          {/* Liabilities & Equity Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-red-600 border-b pb-2 flex items-center gap-2">
                <HandCoins size={20} /> Liabilities & Equity
            </h3>
             <div className="space-y-3 pl-2">
              <div className="flex justify-between items-center">
                <span className="text-foreground">Accounts Payable</span>
                <span className="font-medium">{formatValue(summary.accountsPayable)}</span>
              </div>
              <Separator className="my-2"/>
               <div className="flex justify-between items-center">
                <h4 className="text-md font-semibold text-blue-600 flex items-center gap-2">
                    <Landmark size={16} /> Equity
                </h4>
              </div>
              <div className="flex justify-between items-center pl-4">
                <span className="text-foreground">Retained Earnings (All-Time Net Profit)</span>
                <span className="font-medium">{formatValue(summary.retainedEarnings)}</span>
              </div>
               <Separator className="my-2"/>
              <div className="flex justify-between items-center font-bold text-base">
                <span>Total Liabilities & Equity</span>
                <span>{formatValue(totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start p-6 mt-4 border-t bg-muted/50 rounded-b-lg">
          <div className={cn(
              "w-full flex justify-between items-center font-bold text-lg p-3 rounded-md",
              Math.abs(balanceDifference) < 0.01 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500"
          )}>
            <span>Balance Check (Assets - L&E)</span>
            <span>{formatValue(balanceDifference)}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5"/>
              <div>
                <strong>Disclaimer:</strong> This is a simplified report based on operational data (inventory, sales, purchases) and does not represent a full, GAAP-compliant balance sheet. It omits items like cash, fixed assets, loans, and owner's capital contributions. The "Balance Check" will likely not be zero. Consult a professional accountant for official financial statements.
              </div>
          </div>
      </CardFooter>
    </Card>
  );
}
