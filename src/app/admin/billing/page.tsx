
"use client";

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Added useRouter
import type { BillMode, Store } from '@/types';
import { PageTitle } from '@/components/common/page-title';
import { BillingForm } from '@/components/billing/billing-form';
import { BillHistoryTable } from '@/components/history/bill-history-table';
import { InventoryLedgerTable } from '@/components/billing/inventory-ledger-table'; // New import
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, History as HistoryIcon, ShoppingBag, Send, RotateCcw, Building, ListChecks, BarChart2 } from 'lucide-react'; // Added ListChecks, BarChart2
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import { cn } from '@/lib/utils';

type BillingView = 'history' | 'ledger' | 'new';

// Helper component for store selection in history view actions
const HistoryStoreSelector: React.FC<{
  stores: Store[];
  activePlanId?: string;
  currentStoreId?: string;
  onStoreChange: (storeId?: string) => void;
}> = ({ stores, activePlanId, currentStoreId, onStoreChange }) => {
  const isStarterPlan = activePlanId === SUBSCRIPTION_PLAN_IDS.STARTER;

  if (isStarterPlan && stores.length === 1) {
    return (
      <span className="text-sm font-semibold text-primary flex items-center gap-1 p-2 border border-input rounded-md h-9 bg-muted/50">
        <Building size={16} />
        {stores[0].name}
      </span>
    );
  }
  if (!isStarterPlan && stores.length === 1) {
     return (
      <span className="text-sm font-semibold text-primary flex items-center gap-1 p-2 border border-input rounded-md h-9 bg-muted/50">
        <Building size={16} />
        {stores[0].name}
      </span>
    );
  }
  if (!isStarterPlan && stores.length > 1) {
    return (
      <Select
        key={`store-context-select-history-${activePlanId}-${stores.length}`}
        value={currentStoreId || ""}
        onValueChange={(value) => onStoreChange(value || undefined)}
      >
        <SelectTrigger id="store-context-select-history-trigger" className="w-auto min-w-[180px] h-9">
          <SelectValue placeholder="Select Store..." />
        </SelectTrigger>
        <SelectContent position="popper">
          {stores.map(store => (
            <SelectItem key={store.id} value={store.id}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return null;
};


function BillingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const action = searchParams.get('action');
  const modeFromUrl = searchParams.get('mode') as BillMode | null;
  const storeIdFromUrl = searchParams.get('storeId');
  const currentViewFromUrl = searchParams.get('view') as BillingView | null;

  const getAllStores = useInventoryStore(state => state.getAllStores);
  const getActiveSubscriptionPlan = useInventoryStore(state => state.getActiveSubscriptionPlan);

  const [allStores, setAllStores] = useState<Store[]>([]);
  const [activePlan, setActivePlan] = useState<ReturnType<typeof getActiveSubscriptionPlan>>(undefined);
  
  const [currentContextStoreId, setCurrentContextStoreId] = useState<string | undefined>(undefined);
  const [selectedStoreForForm, setSelectedStoreForForm] = useState<string | undefined>(undefined);
  const [activeBillingView, setActiveBillingView] = useState<BillingView>(currentViewFromUrl || 'history');

  const [hasMounted, setHasMounted] = useState(false);
  const isAdminContext = true; 

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      setAllStores(getAllStores());
      setActivePlan(getActiveSubscriptionPlan());
      // Set active view based on URL or default to history
      setActiveBillingView(currentViewFromUrl || 'history');
    }
  }, [hasMounted, getAllStores, getActiveSubscriptionPlan, currentViewFromUrl]);

  useEffect(() => {
    if (hasMounted && activePlan && allStores.length > 0) {
      if (activePlan.id === SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 0) {
        setCurrentContextStoreId(allStores[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length === 1) {
        setCurrentContextStoreId(allStores[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 1) {
        setCurrentContextStoreId(allStores[0].id); 
      } else {
        setCurrentContextStoreId(undefined);
      }
    } else if (hasMounted && activePlan && allStores.length === 0) {
      setCurrentContextStoreId(undefined);
    }
  }, [hasMounted, allStores, activePlan]);

  useEffect(() => {
    if (hasMounted && activePlan && allStores.length > 0) {
      if (storeIdFromUrl && allStores.find(s => s.id === storeIdFromUrl)) {
        setSelectedStoreForForm(storeIdFromUrl);
      } else if (activePlan.id === SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 0) {
        setSelectedStoreForForm(allStores[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length === 1) {
        setSelectedStoreForForm(allStores[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 1) {
        setSelectedStoreForForm(allStores[0].id);
      } else {
        setSelectedStoreForForm(undefined);
      }
    } else if (hasMounted && activePlan && allStores.length === 0) {
       setSelectedStoreForForm(undefined);
    }
  }, [hasMounted, allStores, activePlan, storeIdFromUrl]);

  const handleViewToggle = (view: BillingView) => {
    setActiveBillingView(view);
    const newParams = new URLSearchParams(searchParams.toString());
    if (view === 'history' || view === 'ledger') {
      newParams.set('view', view);
      newParams.delete('action'); // Clear action when switching main views
      newParams.delete('mode');   // Clear mode when switching main views
      newParams.delete('storeId'); // Clear storeId when switching main views
    }
    router.push(`/admin/billing?${newParams.toString()}`);
  };

  const isNewBillAction = action === 'new' || !!modeFromUrl;
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
                <Link href="/admin/stores">Add Store</Link>
              </Button>
            }
          />
           <p className="text-center text-destructive">
            You need to add at least one store before creating bills. Please go to Store Management.
          </p>
        </>
      );
    }
    
    const newBillPageTitleActions = (
        <div className="flex items-center gap-3">
            {hasMounted && isAdminContext && !isStarterPlan && allStores.length > 1 && (
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">
                        Billing For Store:
                    </span>
                    <Select
                        key={`store-select-new-bill-${activePlan?.id}-${allStores.length}`}
                        value={selectedStoreForForm || ""}
                        onValueChange={(value) => setSelectedStoreForForm(value || undefined)}
                    >
                        <SelectTrigger id="store-select-new-bill-trigger" className="w-auto min-w-[180px] h-9">
                        <SelectValue placeholder="Select Store..." />
                        </SelectTrigger>
                        <SelectContent position="popper">
                        {allStores.map(store => (
                            <SelectItem key={store.id} value={store.id}>
                            {store.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                 </div>
            )}
            {hasMounted && isAdminContext && (isStarterPlan || allStores.length === 1) && allStores.length > 0 && (
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">
                        Billing For Store:
                    </span>
                    <span className="text-sm font-semibold text-primary flex items-center gap-1 p-2 border border-input rounded-md h-9 bg-muted/50">
                        <Building size={16} />
                        {allStores.find(s => s.id === selectedStoreForForm)?.name || allStores[0]?.name}
                    </span>
                </div>
            )}
            <Button variant="outline" onClick={() => handleViewToggle('history')}>
              <HistoryIcon className="mr-2 h-4 w-4" /> Bill History
            </Button>
            <Button variant="outline" onClick={() => handleViewToggle('ledger')}>
              <ListChecks className="mr-2 h-4 w-4" /> Inventory Ledger
            </Button>
        </div>
    );

    return (
      <>
        <PageTitle
          title={title}
          icon={icon}
          actions={newBillPageTitleActions}
        />
        <BillingForm
          key={`new-bill-form-${effectiveModeForTitle}-${selectedStoreForForm}`} 
          initialModeProp={modeFromUrl}
          isAdminContext={true}
          preselectedStoreId={selectedStoreForForm}
        />
      </>
    );
  }

  // Main view (History or Ledger)
  const newBillHrefPath = `/admin/billing?action=new&mode=sell${currentContextStoreId ? `&storeId=${currentContextStoreId}` : (allStores.length === 1 ? `&storeId=${allStores[0].id}` : '')}`;
  
  const mainPageActions = (
    <div className="flex items-center gap-3">
        {hasMounted && isAdminContext && allStores.length > 0 && activeBillingView === 'history' && (
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">
                    New Bill Context:
                </span>
                <HistoryStoreSelector
                    stores={allStores}
                    activePlanId={activePlan?.id}
                    currentStoreId={currentContextStoreId}
                    onStoreChange={setCurrentContextStoreId}
                />
            </div>
        )}
        <Button onClick={() => handleViewToggle(activeBillingView === 'history' ? 'ledger' : 'history')} variant="outline">
            {activeBillingView === 'history' ? <ListChecks className="mr-2 h-4 w-4" /> : <HistoryIcon className="mr-2 h-4 w-4" />}
            {activeBillingView === 'history' ? 'Inventory Ledger' : 'Bill History'}
        </Button>
        <Button asChild disabled={isAdminContext && allStores.length === 0 && activePlan && activePlan.maxStores > 0}>
            <Link href={newBillHrefPath}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Bill
            </Link>
        </Button>
        {isAdminContext && allStores.length === 0 && activePlan && activePlan.maxStores > 0 && (
            <p className="text-xs text-muted-foreground">Add a store first</p>
        )}
    </div>
  );

  const pageTitleText = activeBillingView === 'ledger' ? 'Inventory Ledger' : 'Bill History';
  const pageTitleIcon = activeBillingView === 'ledger' ? BarChart2 : HistoryIcon;

  return (
    <>
      <PageTitle
        title={pageTitleText}
        icon={pageTitleIcon}
        actions={mainPageActions}
      />
      {activeBillingView === 'ledger' ? <InventoryLedgerTable /> : <BillHistoryTable />}
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
