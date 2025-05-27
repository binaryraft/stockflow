
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { BillingForm } from '@/components/billing/billing-form';
import { EmployeePasskeyDialog } from '@/components/billing/employee-passkey-dialog';
import type { Staff, Store } from '@/types';
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);


  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || !storeId) return;
    setIsLoading(true);
    const store = getStoreById(storeId);
    if (!store) {
      router.replace('/storeportal'); 
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
            const verifiedStaff = getStaffById(parsedStaff.id);
            if (verifiedStaff && (verifiedStaff.accessibleStoreIds.length === 0 || verifiedStaff.accessibleStoreIds.includes(storeId))) {
                 if(store.allowedStaffIds.length === 0 || store.allowedStaffIds.includes(verifiedStaff.id)) {
                    setCurrentStaff(verifiedStaff);
                 } else {
                    console.warn("Staff member from session no longer has access to this store's operations.");
                    sessionStorage.removeItem(`currentStaff_${storeId}`); 
                    setCurrentStaff(null);
                    setIsEmployeeAuthDialogOpen(true);
                 }
            } else {
                console.warn("Staff member from session no longer exists or has access to this store.");
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
        setIsEmployeeAuthDialogOpen(true);
      }
    } else {
      router.replace(`/storeportal/${storeId}/login`);
    }
    setIsLoading(false);
  }, [storeId, router, getStoreById, getStaffById, hasMounted]);

  useEffect(() => {
    if (hasMounted && storeId && isStoreAuthenticated && currentStaff && currentStore) {
      const currentMode = nextSearchParams.get('mode');
      const allowedOps = currentStore.allowedOperations || [];
      
      if (!currentMode) {
        if (allowedOps.length > 0) {
          router.replace(`/storeportal/${storeId}/billing?mode=${allowedOps[0]}`);
        } else {
           console.warn(`Store ${storeId} has no allowed operations configured. Defaulting to sell.`);
           router.replace(`/storeportal/${storeId}/billing?mode=sell`);
        }
      } else if (currentMode && allowedOps.length > 0 && !allowedOps.includes(currentMode as any)) {
        console.warn(`Mode ${currentMode} not allowed for store ${storeId}. Redirecting to ${allowedOps[0]}.`);
        router.replace(`/storeportal/${storeId}/billing?mode=${allowedOps[0]}`);
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
    router.push(`/storeportal/${storeId}/login`);
  };
  
  const handleEmployeeSwitch = () => {
    sessionStorage.removeItem(`currentStaff_${storeId}`);
    setCurrentStaff(null);
    setIsEmployeeAuthDialogOpen(true);
  };

  if (!hasMounted || isLoading) { 
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Image src="https://placehold.co/64x64.png" alt={`${APP_NAME} Logo`} width={48} height={48} className="mb-2 rounded-lg" data-ai-hint="logo company"/>
        <p className="text-lg text-muted-foreground">Loading Store Terminal...</p>
      </div>
    );
  }
  
  if (!isStoreAuthenticated || !currentStore) { 
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
            if(!open && !currentStaff) { setIsEmployeeAuthDialogOpen(true); } // Force open if no staff
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
  
  const modeFromUrl = nextSearchParams.get('mode') as any;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 h-screen"> {/* Ensure full height for chat layout */}
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
            <Image src="https://placehold.co/64x64.png" alt={`${APP_NAME} Logo`} width={48} height={48} className="mb-2 rounded-lg" data-ai-hint="logo company"/>
            <p className="text-lg text-muted-foreground">Loading Billing Interface...</p>
        </div>
      }>
        <BillingForm 
            key={modeFromUrl || 'default_store_bill_form'} // Ensure remount if mode changes
            initialModeProp={modeFromUrl}
            billedByStaffId={currentStaff.id}
            storeId={currentStore.id}
            allowedModes={currentStore.allowedOperations}
        />
      </Suspense>
    </div>
  );
}
