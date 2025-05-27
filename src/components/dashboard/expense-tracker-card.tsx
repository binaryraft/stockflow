
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import type { Bill } from '@/types'; // Assuming Bill type is sufficient
import { format } from 'date-fns';
import { CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpenseBillWithCoverage extends Bill {
  totalCost: number;
  potentialRevenue: number;
  coverageStatus: 'Covered' | 'Uncovered';
}

export function ExpenseTrackerCard() {
  const getRecentExpenseBills = useInventoryStore((state) => state.getRecentExpenseBillsWithPotentialCoverage);
  const [expenseBills, setExpenseBills] = useState<ExpenseBillWithCoverage[]>([]);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      setExpenseBills(getRecentExpenseBills(7)); // Get last 7 expense bills for the tracker
    }
  }, [hasMounted, getRecentExpenseBills]);

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow border-t-2 border-t-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <FileText className="h-5 w-5" />
          Recent Expense Bills Tracker
        </CardTitle>
        <CardDescription>Overview of recent expenses and their potential revenue coverage.</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[300px] pr-3"> {/* Added pr-3 for scrollbar spacing */}
          { !hasMounted || expenseBills.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No recent expense bills to display.</p>
          ) : (
            <div className="space-y-3">
              {expenseBills.map((bill) => (
                <div key={bill.id} className="p-3 rounded-md bg-tertiary shadow-sm border border-border/50">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">ID: {bill.id}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(bill.date), 'MMM dd, yyyy - p')}</p>
                    </div>
                    <div className={cn(
                        "flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-semibold",
                        bill.coverageStatus === 'Covered' 
                          ? "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300 border border-green-300 dark:border-green-600" 
                          : "bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-300 border border-red-300 dark:border-red-600"
                      )}
                    >
                      {bill.coverageStatus === 'Covered' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      {bill.coverageStatus}
                    </div>
                  </div>
                  {bill.vendorOrCustomerName && <p className="text-sm font-medium text-foreground truncate">Vendor: {bill.vendorOrCustomerName}</p>}
                  <div className="mt-1.5 pt-1.5 border-t border-dashed grid grid-cols-2 gap-x-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Cost: </span>
                      <span className="font-semibold text-destructive">₹{bill.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground">Pot. Revenue: </span>
                      <span className="font-semibold text-primary">₹{bill.potentialRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

    