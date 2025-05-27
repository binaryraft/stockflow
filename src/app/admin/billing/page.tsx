
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

  const isNewBillAction = action === 'new' || !!modeFromUrl;

  let effectiveModeForTitle: BillMode = 'sell'; 
  if (modeFromUrl && ['sell', 'buy', 'return'].includes(modeFromUrl)) {
    effectiveModeForTitle = modeFromUrl;
  }

  if (isNewBillAction) {
    let title = "New Sales Bill"; 
    let icon = Send;

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
        <BillingForm key={modeFromUrl || 'default_admin_bill_form'} initialModeProp={modeFromUrl} isAdminContext={true}/>
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

export default function AdminBillingPage() {
  return (
    <div className="flex flex-col gap-6"> 
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Bill Information...</div>}>
        <BillingContent />
      </Suspense>
    </div>
  );
}

    