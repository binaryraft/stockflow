
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

  const { getStoreById, getStaffById } = useInventoryStore(); // Added getStaffById
  
  const [isStoreAuthenticated, setIsStoreAuthenticated] = useState(false);
  const [isEmployeeAuthDialogOpen, setIsEmployeeAuthDialogOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || !storeId) return;
    setIsLoading(true);
    const store = getStoreById(storeId);
    if (!store) {
      router.replace('/'); 
      return;
    }
    setCurrentStore(store);

    const authenticatedStore = sessionStorage.getItem(`authenticatedStore_${storeId}`) === 'true';
    if (authenticatedStore) {
      setIsStoreAuthenticated(true);
      const sessionStaffData = sessionStorage.getItem(`currentStaff_${storeId}`);
      if (sessionStaffData) {
        try {
            const parsedStaff: Staff = JSON.parse(sessionStaffData);
            // Verify staff exists and has access, in case data is stale
            const verifiedStaff = getStaffById(parsedStaff.id);
            if (verifiedStaff && (verifiedStaff.accessibleStoreIds.length === 0 || verifiedStaff.accessibleStoreIds.includes(storeId))) {
                 if(store.allowedStaffIds.length === 0 || store.allowedStaffIds.includes(verifiedStaff.id)) {
                    setCurrentStaff(verifiedStaff);
                 } else {
                    console.warn("Staff member from session no longer has access to this store's operations.");
                    sessionStorage.removeItem(`currentStaff_${storeId}`); 
                    setIsEmployeeAuthDialogOpen(true);
                 }
            } else {
                console.warn("Staff member from session no longer exists or has access to this store.");
                sessionStorage.removeItem(`currentStaff_${storeId}`); 
                setIsEmployeeAuthDialogOpen(true);
            }
        } catch (error) {
            console.error("Error parsing staff data from session storage:", error);
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
  }, [storeId, router, getStoreById, getStaffById, hasMounted]);

  useEffect(() => {
    if (hasMounted && storeId && isStoreAuthenticated) {
      const currentMode = nextSearchParams.get('mode');
      const allowedOps = currentStore?.allowedOperations || [];
      
      if (!currentMode && currentStaff) { // Only redirect if staff is authenticated
        if (allowedOps.length > 0) {
          router.replace(`/store/${storeId}/billing?mode=${allowedOps[0]}`);
        } else {
          // No operations allowed for this store, though this case should ideally be prevented by admin settings
          console.warn(`Store ${storeId} has no allowed operations configured.`);
           // Fallback, perhaps show a message or default to sell if that's a universal fallback.
           // For now, let's default to sell or do nothing if allowedOps is empty.
           if(!currentMode){ router.replace(`/store/${storeId}/billing?mode=sell`);}
        }
      } else if (currentMode && allowedOps.length > 0 && !allowedOps.includes(currentMode as any) && currentStaff) {
        // If current mode is not allowed, redirect to the first allowed mode
        router.replace(`/store/${storeId}/billing?mode=${allowedOps[0]}`);
      }
    }
  }, [storeId, isStoreAuthenticated, currentStaff, nextSearchParams, router, currentStore, hasMounted]);


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

  if (!hasMounted || isLoading || !currentStore) { // Added !currentStore to initial loading check
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Image src="https://placehold.co/64x64.png" alt={`${APP_NAME} Logo`} width={48} height={48} className="mb-2 rounded-lg" data-ai-hint="logo company"/>
        <p className="text-lg text-muted-foreground">Loading Store Terminal...</p>
      </div>
    );
  }
  
  if (!isStoreAuthenticated) { // Handles case where store auth is lost but component tries to render
    return (
         <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <Image src="https://placehold.co/64x64.png" alt={`${APP_NAME} Logo`} width={48} height={48} className="mb-2 rounded-lg" data-ai-hint="logo company"/>
            <p className="text-lg text-muted-foreground mb-4">Redirecting to store login...</p>
         </div>
    );
  }


  if (!currentStaff) {
    return (
      <>
        <EmployeePasskeyDialog
          isOpen={isEmployeeAuthDialogOpen}
          onOpenChange={(open) => {
            // Prevent closing dialog by clicking outside if no staff is authenticated yet
            if(!open && !currentStaff) { /* Do nothing or setIsEmployeeAuthDialogOpen(true) to force it open */ }
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
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <Image src="https://placehold.co/64x64.png" alt={`${APP_NAME} Logo`} width={48} height={48} className="mb-2 rounded-lg" data-ai-hint="logo company"/>
            <p className="text-lg text-muted-foreground">Loading Billing Interface...</p>
          </div>
        </div>
      }>
        <BillingForm 
            billedByStaffId={currentStaff.id}
            storeId={currentStore.id}
            allowedModes={currentStore.allowedOperations}
        />
      </Suspense>
    </div>
  );
}
