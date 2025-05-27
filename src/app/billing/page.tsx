
"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageTitle } from '@/components/common/page-title';
import { BillingForm } from '@/components/billing/billing-form';
import { BillHistoryTable } from '@/components/history/bill-history-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DollarSign, PlusCircle, History as HistoryIcon, ShoppingBag, Send, RotateCcw } from 'lucide-react'; // Renamed History to avoid conflict

function BillingContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const mode = searchParams.get('mode');

  const isNewBillAction = action === 'new' || mode === 'sell' || mode === 'buy' || mode === 'return';

  if (isNewBillAction) {
    let title = "New Bill";
    let icon = DollarSign;
    if (mode === 'buy') {
      title = "New Expense Bill";
      icon = ShoppingBag; // Corresponds to Expense (formerly Buy)
    } else if (mode === 'sell') {
      title = "New Sales Bill";
      icon = Send; // Corresponds to Sales (formerly Sell)
    } else if (mode === 'return') {
      title = "New Return Entry";
      icon = RotateCcw;
    }
    
    return (
      <>
        <PageTitle
          title={title}
          icon={icon}
          actions={
            <Button asChild variant="outline">
              <Link href="/billing">
                <HistoryIcon className="mr-2 h-4 w-4" /> View Bill History
              </Link>
            </Button>
          }
        />
        <BillingForm />
      </>
    );
  }

  return (
    <>
      <PageTitle
        title="Bill History"
        icon={HistoryIcon}
        actions={
          <Button asChild>
            <Link href="/billing?action=new&mode=sell"> {/* Default to new sales bill */}
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Bill
            </Link>
          </Button>
        }
      />
      <BillHistoryTable />
    </>
  );
}

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6"> 
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Bill Information...</div>}>
        <BillingContent />
      </Suspense>
    </div>
  );
}

