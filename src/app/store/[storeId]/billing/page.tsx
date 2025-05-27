
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { BillingForm } from '@/components/billing/billing-form';
import { EmployeePasskeyDialog } from '@/components/billing/employee-passkey-dialog';
import type { Staff, Store } from '@/types';
import { PageTitle } from '@/components/common/page-title';
import { Button } from '@/components/ui/button';
import { LogOut, ShoppingCart } from 'lucide-react'; // Assuming BillingForm uses ShoppingCart
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';

export default function StoreBillingPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;

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
      router.replace('/'); // Or a dedicated error page
      return;
    }
    setCurrentStore(store);

    const authenticated = sessionStorage.getItem(`authenticatedStore_${storeId}`) === 'true';
    if (authenticated) {
      setIsStoreAuthenticated(true);
      // If store is authenticated, immediately prompt for employee passkey
      // unless an employee is already authenticated for this session
      const sessionStaff = sessionStorage.getItem(`currentStaff_${storeId}`);
      if (sessionStaff) {
        try {
            const parsedStaff = JSON.parse(sessionStaff);
            // Quick re-validation might be needed here in a real app
            setCurrentStaff(parsedStaff);
        } catch (error) {
            sessionStorage.removeItem(`currentStaff_${storeId}`); // Clear corrupted data
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

  const handleEmployeeAuthenticated = (staff: Staff) => {
    setCurrentStaff(staff);
    sessionStorage.setItem(`currentStaff_${storeId}`, JSON.stringify(staff)); // Store staff for session
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
        <Image src="/_next/static/media/gyByhwUxId8gMEwcGFWNOITd-s.p.da1ebef7.woff2" alt={`${APP_NAME} Logo`} width={48} height={48} className="mb-2" data-ai-hint="logo company"/>
        <p className="text-lg text-muted-foreground">Loading Store Terminal...</p>
      </div>
    );
  }

  if (!currentStaff) {
    return (
      <>
        <EmployeePasskeyDialog
          isOpen={isEmployeeAuthDialogOpen}
          onOpenChange={setIsEmployeeAuthDialogOpen}
          storeId={storeId}
          onAuthenticated={handleEmployeeAuthenticated}
        />
         <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <Image src="/_next/static/media/gyByhwUxId8gMEwcGFWNOITd-s.p.da1ebef7.woff2" alt={`${APP_NAME} Logo`} width={48} height={48} className="mb-2" data-ai-hint="logo company"/>
          <p className="text-lg text-muted-foreground mb-4">Awaiting Employee Authentication for {currentStore.name}...</p>
          <Button onClick={() => setIsEmployeeAuthDialogOpen(true)}>Enter Employee Passkey</Button>
          <Button variant="link" onClick={handleStoreLogout} className="mt-6 text-sm">
             Logout from {currentStore.name}
          </Button>
        </div>
      </>
    );
  }
  
  // Default to 'sell' mode if no mode is specified in URL for store billing
  const searchParams = new URLSearchParams(window.location.search);
  const modeFromUrl = searchParams.get('mode');
  if (!modeFromUrl && typeof window !== "undefined") {
    router.replace(`/store/${storeId}/billing?mode=sell`);
  }


  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageTitle 
        title={`${currentStore.name} - Billing Terminal`}
        icon={ShoppingCart} 
        actions={
            <div className="flex items-center gap-2">
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
