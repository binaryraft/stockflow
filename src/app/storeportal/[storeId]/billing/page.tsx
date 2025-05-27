
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { BillingForm } from '@/components/billing/billing-form';
import { EmployeePasskeyDialog } from '@/components/billing/employee-passkey-dialog';
import type { Staff, Store, BillMode } from '@/types';
import { PageTitle } from '@/components/common/page-title';
import { Button } from '@/components/ui/button';
import { LogOut, ShoppingCart, MessageSquare } from 'lucide-react'; 
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function StoreBillingPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;
  const nextSearchParams = useNextSearchParams();

  const { getStoreById, getStaffById } = useInventoryStore(); 
  
  const [isStoreAuthenticated, setIsStoreAuthenticated] = useState(false);
  const [isEmployeeAuthDialogOpen, setIsEmployeeAuthDialogOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Master loading state for the page
  const [hasMounted, setHasMounted] = useState(false);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || !storeId) {
      if (storeId) setIsLoading(true); // Set loading if storeId is present but not mounted
      return;
    }

    setIsLoading(true); // Start loading
    const store = getStoreById(storeId);

    if (!store) {
      router.replace('/storeportal');
      setIsLoading(false); // Stop loading as we are redirecting
      return;
    }
    setCurrentStore(store);

    const authenticatedStoreSession = sessionStorage.getItem(`authenticatedStore_${storeId}`) === 'true';
    if (authenticatedStoreSession) {
      setIsStoreAuthenticated(true);
      const sessionStaffData = sessionStorage.getItem(`currentStaff_${storeId}`);
      if (sessionStaffData) {
        try {
          const parsedStaff: Staff = JSON.parse(sessionStaffData);
          const verifiedStaff = getStaffById(parsedStaff.id);
          // Check if staff exists and has access to *this specific store* or all stores.
          // Also, check if the store itself explicitly allows this staff member or allows all staff.
          if (verifiedStaff && 
              (verifiedStaff.accessibleStoreIds.length === 0 || verifiedStaff.accessibleStoreIds.includes(storeId)) &&
              (store.allowedStaffIds.length === 0 || store.allowedStaffIds.includes(verifiedStaff.id))
          ) {
            setCurrentStaff(verifiedStaff);
            setIsEmployeeAuthDialogOpen(false); // Ensure dialog is closed if staff is found
          } else {
            console.warn("Staff member from session no longer exists or has access to this store's operations.");
            sessionStorage.removeItem(`currentStaff_${storeId}`);
            setCurrentStaff(null);
            setIsEmployeeAuthDialogOpen(true);
          }
        } catch (error) {
          console.error("Error parsing staff data from session storage:", error);
          sessionStorage.removeItem(`currentStaff_${storeId}`);
          setCurrentStaff(null);
          setIsEmployeeAuthDialogOpen(true);
        }
      } else {
        // Store authenticated, but no employee in session, prompt for employee passkey
        setCurrentStaff(null);
        setIsEmployeeAuthDialogOpen(true);
      }
    } else {
      // Store not authenticated, redirect to store login
      router.replace(`/storeportal/${storeId}/login`);
    }
    setIsLoading(false); // Stop loading after all checks
  }, [storeId, router, getStoreById, getStaffById, hasMounted]);

  // This effect handles redirection based on allowed operations *after* authentication is confirmed.
  useEffect(() => {
    if (!hasMounted || isLoading || !isStoreAuthenticated || !currentStaff || !currentStore) {
      return; // Don't run if still loading or not fully authenticated
    }

    const currentMode = nextSearchParams.get('mode') as BillMode | null;
    const allowedOps = currentStore.allowedOperations || [];
    
    if (allowedOps.length === 0) {
      // This case should ideally be prevented by validation in StoreFormDialog (must select at least one op)
      // Fallback: if no operations allowed, maybe show a message or default to 'sell' but form will restrict.
      console.warn(`Store ${storeId} has no allowed operations configured. Defaulting to sell for URL.`);
      if (currentMode !== 'sell') {
        router.replace(`/storeportal/${storeId}/billing?mode=sell`);
      }
      return;
    }

    if (!currentMode) { // If no mode in URL, redirect to the first allowed operation
      router.replace(`/storeportal/${storeId}/billing?mode=${allowedOps[0]}`);
    } else if (!allowedOps.includes(currentMode)) { // If current URL mode is not allowed
      console.warn(`Mode ${currentMode} not allowed for store ${storeId}. Redirecting to ${allowedOps[0]}.`);
      router.replace(`/storeportal/${storeId}/billing?mode=${allowedOps[0]}`);
    }
    // If currentMode is present and allowed, no redirection is needed from this effect.
  }, [storeId, isStoreAuthenticated, currentStaff, currentStore, nextSearchParams, router, hasMounted, isLoading]);


  const handleEmployeeAuthenticated = (staff: Staff) => {
    setCurrentStaff(staff);
    if (hasMounted && storeId) {
      sessionStorage.setItem(`currentStaff_${storeId}`, JSON.stringify(staff));
    }
    setIsEmployeeAuthDialogOpen(false);
  };

  const handleStoreLogout = () => {
    if (hasMounted && storeId) {
      sessionStorage.removeItem(`authenticatedStore_${storeId}`);
      sessionStorage.removeItem(`currentStaff_${storeId}`);
    }
    setCurrentStaff(null);
    setIsStoreAuthenticated(false);
    if (storeId) router.push(`/storeportal/${storeId}/login`);
    else router.push('/storeportal');
  };
  
  const handleEmployeeSwitch = () => {
    if (hasMounted && storeId) {
      sessionStorage.removeItem(`currentStaff_${storeId}`);
    }
    setCurrentStaff(null);
    setIsEmployeeAuthDialogOpen(true);
  };

  if (!hasMounted || isLoading) { 
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Image 
          src="https://placehold.co/64x64.png" 
          alt={`${APP_NAME} Logo`} 
          width={48} 
          height={48} 
          className="mb-2 rounded-lg animate-pulse" 
          data-ai-hint="logo company"
        />
        <p className="text-lg text-muted-foreground">Loading Store Terminal...</p>
      </div>
    );
  }
  
  // This covers the case where store isn't authenticated yet or doesn't exist after loading
  if (!isStoreAuthenticated || !currentStore) { 
    return (
         <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <Image 
              src="https://placehold.co/64x64.png" 
              alt={`${APP_NAME} Logo`} 
              width={48} 
              height={48} 
              className="mb-2 rounded-lg" 
              data-ai-hint="logo company"
            />
            <p className="text-lg text-muted-foreground mb-4">Redirecting to store login...</p>
         </div>
    );
  }

  // This covers the case where employee isn't authenticated yet
  if (!currentStaff) {
    return (
      <>
        <EmployeePasskeyDialog
          isOpen={isEmployeeAuthDialogOpen}
          onOpenChange={(open) => {
            // Prevent closing if no staff and dialog is supposed to be open
            if(!open && !currentStaff && isEmployeeAuthDialogOpen) { 
                setIsEmployeeAuthDialogOpen(true); 
            } else { 
                setIsEmployeeAuthDialogOpen(open); 
            }
          }}
          storeId={storeId}
          onAuthenticated={handleEmployeeAuthenticated}
        />
         <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <Image 
            src="https://placehold.co/64x64.png" 
            alt={`${APP_NAME} Logo`} 
            width={48} 
            height={48} 
            className="mb-2 rounded-lg" 
            data-ai-hint="logo company"
          />
          <p className="text-lg text-muted-foreground mb-4">Awaiting Employee Authentication for {currentStore.name}...</p>
          <Button onClick={() => setIsEmployeeAuthDialogOpen(true)}>Enter Employee Passkey</Button>
          <Button variant="link" onClick={handleStoreLogout} className="mt-6 text-sm">
             Logout from {currentStore.name}
          </Button>
        </div>
      </>
    );
  }
  
  const modeFromUrl = nextSearchParams.get('mode') as BillMode | null;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 h-screen">
      <PageTitle 
        title={`${currentStore.name} - Billing Terminal`}
        icon={ShoppingCart} 
        actions={
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setIsChatDialogOpen(true)} aria-label="Open Chat">
                    <MessageSquare className="h-5 w-5" />
                </Button>
                 <span className="text-sm text-muted-foreground hidden md:inline">
                    Operator: <span className="font-semibold text-primary">{currentStaff.name}</span>
                </span>
                <Button variant="outline" size="sm" onClick={handleEmployeeSwitch}>Switch Employee</Button>
                <Button variant="destructive" size="sm" onClick={handleStoreLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout Store
                </Button>
            </div>
        }
      />
       <Dialog open={isChatDialogOpen} onOpenChange={setIsChatDialogOpen}>
        <DialogContent className="sm:max-w-lg h-[70vh] p-0 flex flex-col border-t-4 border-t-primary shadow-lg">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Chat with Admin ({currentStore.name})</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-0">
            <ChatInterface storeId={currentStore.id} currentUserId={currentStaff.id} currentUserName={currentStaff.name} />
          </div>
        </DialogContent>
      </Dialog>

      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
            <Image 
              src="https://placehold.co/64x64.png" 
              alt={`${APP_NAME} Logo`} 
              width={48} 
              height={48} 
              className="mb-2 rounded-lg animate-pulse" 
              data-ai-hint="logo company"
            />
            <p className="text-lg text-muted-foreground">Loading Billing Interface...</p>
        </div>
      }>
        <BillingForm 
            key={modeFromUrl || currentStore.id} // Key changes if mode or storeId changes, forcing remount
            initialModeProp={modeFromUrl}
            billedByStaffId={currentStaff.id}
            storeId={currentStore.id}
            allowedModes={currentStore.allowedOperations}
        />
      </Suspense>
    </div>
  );
}
