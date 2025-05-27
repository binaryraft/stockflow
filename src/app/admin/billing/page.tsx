
"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { BillMode } from '@/types';
import { PageTitle } from '@/components/common/page-title';
import { BillingForm } from '@/components/billing/billing-form';
import { BillHistoryTable } from '@/components/history/bill-history-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DollarSign, PlusCircle, History as HistoryIcon, ShoppingBag, Send, RotateCcw } from 'lucide-react';

function BillingContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const modeFromUrl = searchParams.get('mode') as BillMode | null;

  // Determine if we are in a "new bill" action based on URL
  // 'sell', 'buy', 'return' modes inherently mean a new bill form or that the form should be active.
  const isNewBillAction = action === 'new' || !!modeFromUrl;

  let effectiveModeForTitle: BillMode = 'sell'; // Default for title if no specific mode
  if (modeFromUrl && ['sell', 'buy', 'return'].includes(modeFromUrl)) {
    effectiveModeForTitle = modeFromUrl;
  }

  if (isNewBillAction) {
    let title = "New Bill";
    let icon = DollarSign;

    if (effectiveModeForTitle === 'buy') {
      title = "New Expense Bill";
      icon = ShoppingBag;
    } else if (effectiveModeForTitle === 'sell') {
      title = "New Sales Bill";
      icon = Send;
    } else if (effectiveModeForTitle === 'return') {
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
              <Link href="/admin/billing">
                <HistoryIcon className="mr-2 h-4 w-4" /> View Bill History
              </Link>
            </Button>
          }
        />
        {/* Pass modeFromUrl as a key to force remount and re-initialization of BillingForm if mode changes via URL */}
        {/* Also pass it as initialModeProp for explicit initialization logic within BillingForm */}
        <BillingForm key={modeFromUrl || 'default_history_view'} initialModeProp={modeFromUrl} />
      </>
    );
  }

  // Default view: Bill History
  return (
    <>
      <PageTitle
        title="Bill History"
        icon={HistoryIcon}
        actions={
          <Button asChild>
            {/* Default "Create New Bill" button goes to Sales mode */}
            <Link href="/admin/billing?mode=sell"> 
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
