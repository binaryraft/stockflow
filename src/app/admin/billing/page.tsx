
"use client";

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { BillMode, Store, SubscriptionPlan } from '@/types';
import { PageTitle } from '@/components/common/page-title';
import { BillingForm } from '@/components/billing/billing-form';
import { BillHistoryTable } from '@/components/history/bill-history-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { History as HistoryIcon, PlusCircle, Building } from 'lucide-react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import { cn } from '@/lib/utils';

// Helper component for store selection in history view actions
interface HistoryStoreSelectorProps {
  stores: Store[];
  activePlan?: SubscriptionPlan;
  currentStoreId?: string;
  onStoreChange: (storeId?: string) => void;
  triggerIdSuffix: string;
  isLoading?: boolean; 
}

function HistoryStoreSelector({ stores, activePlan, currentStoreId, onStoreChange, triggerIdSuffix, isLoading }: HistoryStoreSelectorProps) {
  const isStarterPlan = activePlan?.id === SUBSCRIPTION_PLAN_IDS.STARTER;
  const shouldShowDropdown = !isLoading && activePlan && !isStarterPlan && stores.length > 1;

  if (isLoading) {
    return <span className="text-sm text-muted-foreground">Loading context...</span>;
  }

  if (shouldShowDropdown) {
    return (
      <Select
        key={`store-context-select-${triggerIdSuffix}-${activePlan?.id}-${stores.length}`}
        value={currentStoreId || ""}
        onValueChange={(value) => {
          onStoreChange(value === "" ? undefined : value); // Handle placeholder if it had value ""
        }}
      >
        <SelectTrigger id={`store-context-select-${triggerIdSuffix}-trigger`} className="w-auto h-9">
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
  } else if (activePlan && stores.length > 0) {
    // Show single store name (Starter plan or only one store available on any plan)
    return (
      <span className="text-sm font-semibold text-primary flex items-center gap-1 p-2 border border-input rounded-md h-9 bg-muted/50">
        <Building size={16} />
        {stores[0].name}
      </span>
    );
  }
  return null; // No stores to select or display (or still loading activePlan if isLoading wasn't passed)
}


function BillingContent() {
  const isAdminContext = true; 

  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const modeFromUrl = searchParams.get('mode') as BillMode | null;
  const storeIdFromUrl = searchParams.get('storeId');

  const getAllStores = useInventoryStore(state => state.getAllStores);
  const getActiveSubscriptionPlan = useInventoryStore(state => state.getActiveSubscriptionPlan);

  const [allStores, setAllStores] = useState<Store[]>([]);
  const [activePlan, setActivePlan] = useState<SubscriptionPlan | undefined>(undefined);
  
  const [currentContextStoreId, setCurrentContextStoreId] = useState<string | undefined>(undefined); 
  const [selectedStoreForForm, setSelectedStoreForForm] = useState<string | undefined>(undefined); 

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      setAllStores(getAllStores());
      console.log('All stores', allStores)
      setActivePlan(getActiveSubscriptionPlan());
    }
  }, [hasMounted, getAllStores, getActiveSubscriptionPlan]);

  useEffect(() => { 
    if (hasMounted && activePlan && allStores.length > 0) {
      if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 1) {
        setCurrentContextStoreId(undefined); 
      } else {
        setCurrentContextStoreId(allStores[0].id); 
      }
    } else if (hasMounted && activePlan && allStores.length === 0) {
      setCurrentContextStoreId(undefined);
    }
  }, [hasMounted, allStores, activePlan]);

  useEffect(() => {
    if (hasMounted && activePlan && allStores.length >= 0) { // Check >= 0 to handle empty stores case too
      if (storeIdFromUrl && allStores.find(s => s.id === storeIdFromUrl)) {
        setSelectedStoreForForm(storeIdFromUrl);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 1) {
        setSelectedStoreForForm(undefined); 
      } else if (allStores.length > 0) { // Starter plan or single store available
        setSelectedStoreForForm(allStores[0].id);
      } else { // No stores, or invalid preselection
         setSelectedStoreForForm(undefined);
      }
    }
  }, [hasMounted, allStores, activePlan, storeIdFromUrl]);


  const isNewBillAction = action === 'new' || !!modeFromUrl;
  const isStarterPlan = activePlan?.id === SUBSCRIPTION_PLAN_IDS.STARTER;

  let effectiveModeForTitle: BillMode = 'sell'; 
  if (modeFromUrl && ['sell', 'buy', 'return'].includes(modeFromUrl)) {
    effectiveModeForTitle = modeFromUrl;
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
         <p className="text-center text-destructive p-4 border border-dashed rounded-md bg-destructive/10">
          You need to add at least one store before creating bills. Please go to Store Management.
        </p>
      </>
    );
  }

  const historyPageActions = () => {
    let newBillHrefPath = `/admin/billing?action=new&mode=sell`;
    if (currentContextStoreId) {
      newBillHrefPath += `&storeId=${currentContextStoreId}`;
    } else if (allStores.length === 1) { // If no context store selected but only one store exists
      newBillHrefPath += `&storeId=${allStores[0].id}`;
    }

    return (
      <div className="flex items-center gap-3">
        {hasMounted && activePlan && allStores.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">
              New Bill Context:
            </span>
            <HistoryStoreSelector
              stores={allStores}
              activePlan={activePlan}
              currentStoreId={currentContextStoreId}
              onStoreChange={setCurrentContextStoreId}
              triggerIdSuffix="history"
              isLoading={!hasMounted || !activePlan} 
            />
          </div>
        )}
         <Button 
          asChild 
          disabled={allStores.length === 0 && activePlan && activePlan.maxStores > 0}
          className={cn((allStores.length === 0 && activePlan && activePlan.maxStores > 0) && "cursor-not-allowed opacity-50")}
        >
          <Link href={newBillHrefPath}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Bill
          </Link>
        </Button>
        {allStores.length === 0 && activePlan && activePlan.maxStores > 0 && (
             <p className="text-xs text-muted-foreground">Add a store first</p>
        )}
      </div>
    );
  };

  const newBillPageTitleActions = () => (
    <div className="flex items-center gap-3">
      {hasMounted && isAdminContext && activePlan && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">
            Billing For Store:
          </span>
           <HistoryStoreSelector
            stores={allStores}
            activePlan={activePlan}
            currentStoreId={selectedStoreForForm}
            onStoreChange={setSelectedStoreForForm}
            triggerIdSuffix="new-bill"
            isLoading={!hasMounted || !activePlan}
          />
        </div>
      )}
      <Button asChild variant="outline">
        <Link href="/admin/billing">
          <HistoryIcon className="mr-2 h-4 w-4" /> View Bill History
        </Link>
      </Button>
    </div>
  );


  if (isNewBillAction) {
    let title = "New Sales Bill";
    let icon = PlusCircle; 

    if (effectiveModeForTitle === 'buy') {
      title = "New Expense Bill";
    } else if (effectiveModeForTitle === 'sell') {
      title = "New Sales Bill";
    } else if (effectiveModeForTitle === 'return') {
      title = "New Return Entry";
    }
    
    return (
      <>
        <PageTitle
          title={title}
          icon={icon}
          actions={newBillPageTitleActions()}
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

  return (
    <>
      <PageTitle
        title="Bill History"
        icon={HistoryIcon}
        actions={historyPageActions()}
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

