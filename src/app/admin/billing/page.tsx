
"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { BillMode, Store } from '@/types';
import { PageTitle } from '@/components/common/page-title';
import { BillingForm } from '@/components/billing/billing-form';
import { BillHistoryTable } from '@/components/history/bill-history-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DollarSign, PlusCircle, History as HistoryIcon, ShoppingBag, Send, RotateCcw, Building } from 'lucide-react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';

function BillingContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const modeFromUrl = searchParams.get('mode') as BillMode | null;
  const storeIdFromUrl = searchParams.get('storeId');

  const getAllStores = useInventoryStore(state => state.getAllStores);
  const getActiveSubscriptionPlan = useInventoryStore(state => state.getActiveSubscriptionPlan);


  const [allStores, setAllStores] = useState<Store[]>([]);
  const [activePlan, setActivePlan] = useState<ReturnType<typeof getActiveSubscriptionPlan>>(undefined);
  const [currentContextStoreId, setCurrentContextStoreId] = useState<string | undefined>(undefined);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const stores = getAllStores();
    const plan = getActiveSubscriptionPlan();
    setAllStores(stores);
    setActivePlan(plan);

    if (plan?.id !== SUBSCRIPTION_PLAN_IDS.STARTER && stores.length === 1) { // Check against new Starter plan
      setCurrentContextStoreId(stores[0].id);
    } else if (plan?.id === SUBSCRIPTION_PLAN_IDS.STARTER && stores.length > 0) { // For Starter, if store exists, default to it
      setCurrentContextStoreId(stores[0].id);
    } else {
      setCurrentContextStoreId(undefined);
    }
  }, [getAllStores, getActiveSubscriptionPlan, hasMounted]);


  const isNewBillAction = action === 'new' || !!modeFromUrl;
  // Basic plan now allows 1 store, so this check needs to be if current plan is not Starter OR if they have 0 stores
  const isStarterPlan = activePlan?.id === SUBSCRIPTION_PLAN_IDS.STARTER;


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

    if (isAdminContext && allStores.length === 0 && activePlan && activePlan.maxStores > 0) {
      return (
        <>
          <PageTitle
            title="Cannot Create Bill"
            icon={Building}
            actions={
              <Button asChild variant="outline">
                <Link href="/admin/stores">
                   Add Store
                </Link>
              </Button>
            }
          />
           <p className="text-center text-destructive">
            You need to add at least one store before creating bills. Please go to Store Management.
          </p>
        </>
      );
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
        <BillingForm
          key={`${modeFromUrl || 'default_admin_bill_form'}-${storeIdFromUrl || 'no_store'}`}
          initialModeProp={modeFromUrl}
          isAdminContext={true}
          preselectedStoreId={storeIdFromUrl || (allStores.length === 1 ? allStores[0].id : undefined)}
        />
      </>
    );
  }

  const newBillHref = `/admin/billing?mode=sell${currentContextStoreId ? `&storeId=${currentContextStoreId}` : ''}`;
  const isAdminContext = true; // This page is always admin context

  return (
    <>
      <PageTitle
        title="Bill History"
        icon={HistoryIcon}
        actions={
          <div className="flex items-center gap-3">
            {hasMounted && allStores.length > 0 && ( // Show if any stores exist
              <div className="flex items-center gap-2">
                <Label htmlFor="store-context-select" className="text-sm font-medium whitespace-nowrap">
                  New Bill Context:
                </Label>
                {allStores.length === 1 ? (
                  <span className="text-sm font-semibold text-primary flex items-center gap-1 p-2 border border-input rounded-md h-9 bg-muted/50">
                    <Building size={16} />
                    {allStores[0].name}
                  </span>
                ) : (
                  <Select
                    value={currentContextStoreId || ""} // Ensure value is not undefined for Select
                    onValueChange={(value) => {
                      setCurrentContextStoreId(value); // Removed "all_stores" logic, value is store ID
                    }}
                  >
                    <SelectTrigger id="store-context-select" className="w-auto min-w-[180px] h-9 select-trigger-class">
                      <SelectValue placeholder="Select Store..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allStores.map(store => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <Button asChild disabled={allStores.length === 0 && activePlan && activePlan.maxStores > 0}>
              <Link href={newBillHref}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Bill
              </Link>
            </Button>
            {allStores.length === 0 && activePlan && activePlan.maxStores > 0 && (
                 <p className="text-xs text-muted-foreground">Add a store first</p>
            )}
          </div>
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
