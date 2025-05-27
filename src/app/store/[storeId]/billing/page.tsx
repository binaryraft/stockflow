
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation'; // useSearchParams from next/navigation
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { BillingForm } from '@/components/billing/billing-form';
import { EmployeePasskeyDialog } from '@/components/billing/employee-passkey-dialog';
import type { Staff, Store } from '@/types';
import { PageTitle } from '@/components/common/page-title';
import { Button } from '@/components/ui/button';
import { LogOut, ShoppingCart } from 'lucide-react'; 
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';

export default function StoreBillingPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;
  const nextSearchParams = useNextSearchParams(); // Use the one from next/navigation

  const { getStoreById } = useInventoryStore();
  
  const [isStoreAuthenticated, setIsStoreAuthenticated] = useState(false);
  const [isEmployeeAuthDialogOpen, setIsEmployeeAuthDialogOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    setIsLoading(true);
    const store = getStoreById(storeId);
    if (!store) {
      router.replace('/'); 
      return;
    }
    setCurrentStore(store);

    const authenticated = sessionStorage.getItem(`authenticatedStore_${storeId}`) === 'true';
    if (authenticated) {
      setIsStoreAuthenticated(true);
      const sessionStaff = sessionStorage.getItem(`currentStaff_${storeId}`);
      if (sessionStaff) {
        try {
            const parsedStaff = JSON.parse(sessionStaff);
            setCurrentStaff(parsedStaff);
        } catch (error) {
            sessionStorage.removeItem(`currentStaff_${storeId}`); 
            setIsEmployeeAuthDialogOpen(true);
        }
      } else {
        setIsEmployeeAuthDialogOpen(true);
      }
    } else {
      router.replace(`/store/${storeId}/login`);
    }
    setIsLoading(false);
  }, [storeId, router, getStoreById]);

  useEffect(() => {
    // This effect runs on the client after hydration
    if (typeof window !== "undefined" && storeId && isStoreAuthenticated) {
      const currentMode = nextSearchParams.get('mode');
      if (!currentMode && (isStoreAuthenticated || currentStaff)) { // Ensure we only redirect if we are supposed to show the form
        router.replace(`/store/${storeId}/billing?mode=sell`);
      }
    }
  }, [storeId, isStoreAuthenticated, currentStaff, nextSearchParams, router]);


  const handleEmployeeAuthenticated = (staff: Staff) => {
    setCurrentStaff(staff);
    sessionStorage.setItem(`currentStaff_${storeId}`, JSON.stringify(staff)); 
    setIsEmployeeAuthDialogOpen(false);
  };

  const handleStoreLogout = () => {
    sessionStorage.removeItem(`authenticatedStore_${storeId}`);
    sessionStorage.removeItem(`currentStaff_${storeId}`);
    setCurrentStaff(null);
    setIsStoreAuthenticated(false);
    router.push(`/store/${storeId}/login`);
  };
  
  const handleEmployeeSwitch = () => {
    sessionStorage.removeItem(`currentStaff_${storeId}`);
    setCurrentStaff(null);
    setIsEmployeeAuthDialogOpen(true);
  };

  if (isLoading || !isStoreAuthenticated || !currentStore) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Image src="https://placehold.co/64x64.png" alt={`${APP_NAME} Logo`} width={48} height={48} className="mb-2 rounded-lg" data-ai-hint="logo company"/>
        <p className="text-lg text-muted-foreground">Loading Store Terminal...</p>
      </div>
    );
  }

  if (!currentStaff) {
    return (
      <>
        <EmployeePasskeyDialog
          isOpen={isEmployeeAuthDialogOpen}
          onOpenChange={(open) => {
            if(!open && !currentStaff) { /* Don't allow closing if no staff is authed yet */ }
            else { setIsEmployeeAuthDialogOpen(open); }
          }}
          storeId={storeId}
          onAuthenticated={handleEmployeeAuthenticated}
        />
         <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <Image src="https://placehold.co/64x64.png" alt={`${APP_NAME} Logo`} width={48} height={48} className="mb-2 rounded-lg" data-ai-hint="logo company"/>
          <p className="text-lg text-muted-foreground mb-4">Awaiting Employee Authentication for {currentStore.name}...</p>
          <Button onClick={() => setIsEmployeeAuthDialogOpen(true)}>Enter Employee Passkey</Button>
          <Button variant="link" onClick={handleStoreLogout} className="mt-6 text-sm">
             Logout from {currentStore.name}
          </Button>
        </div>
      </>
    );
  }
  
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageTitle 
        title={`${currentStore.name} - Billing Terminal`}
        icon={ShoppingCart} 
        actions={
            <div className="flex items-center gap-3">
                 <span className="text-sm text-muted-foreground">
                    Operator: <span className="font-semibold text-primary">{currentStaff.name}</span>
                </span>
                <Button variant="outline" size="sm" onClick={handleEmployeeSwitch}>Switch Employee</Button>
                <Button variant="destructive" size="sm" onClick={handleStoreLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout Store
                </Button>
            </div>
        }
      />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Billing Interface...</div>}>
        <BillingForm 
            billedByStaffId={currentStaff.id}
            storeId={currentStore.id}
        />
      </Suspense>
    </div>
  );
}

