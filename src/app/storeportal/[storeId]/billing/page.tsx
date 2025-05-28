
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { BillingForm } from '@/components/billing/billing-form';
import type { Store, BillMode, Staff } from '@/types';
import { PageTitle } from '@/components/common/page-title';
import { Button } from '@/components/ui/button';
import { LogOut, ShoppingCart, MessageSquare, LogIn as LogInIcon, UserX } from 'lucide-react'; // Added LogInIcon, UserX
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { EmployeePasskeyDialog } from '@/components/billing/employee-passkey-dialog';

export default function StoreBillingPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;
  const nextSearchParams = useNextSearchParams();

  const { getStoreById, getStaffById } = useInventoryStore();

  const [isStoreAuthenticated, setIsStoreAuthenticated] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [isEmployeeAuthDialogOpen, setIsEmployeeAuthDialogOpen] = useState(false);


  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Store authentication and initial employee load
  useEffect(() => {
    if (!hasMounted || !storeId) {
      setIsLoading(true); // Ensure loading is true if we can't proceed
      return;
    }

    setIsLoading(true);
    const store = getStoreById(storeId);

    if (!store) {
      setCurrentStore(null);
      router.replace('/storeportal'); 
      setIsLoading(false);
      return;
    }
    setCurrentStore(store);

    const authenticatedStoreSession = sessionStorage.getItem(`authenticatedStore_${storeId}`) === 'true';
    if (authenticatedStoreSession) {
      setIsStoreAuthenticated(true);
      // Try to load current staff from session
      const staffSessionData = sessionStorage.getItem(`currentStaff_${storeId}`);
      if (staffSessionData) {
        try {
          const staffInfo = JSON.parse(staffSessionData);
          if (staffInfo && staffInfo.id) {
            const staffDetails = getStaffById(staffInfo.id); // Fetch full staff details
            if (staffDetails) setCurrentStaff(staffDetails);
            else sessionStorage.removeItem(`currentStaff_${storeId}`); // Clear if staff no longer exists
          }
        } catch (e) {
          console.error("Error parsing staff session data:", e);
          sessionStorage.removeItem(`currentStaff_${storeId}`);
        }
      }
    } else {
      setIsStoreAuthenticated(false);
      router.replace(`/storeportal/${storeId}/login`);
    }
    setIsLoading(false);
  }, [storeId, router, getStoreById, hasMounted, getStaffById]);

  // Mode redirection logic
  useEffect(() => {
    if (!hasMounted || isLoading || !isStoreAuthenticated || !currentStore || !storeId) {
      return;
    }

    const currentMode = nextSearchParams.get('mode') as BillMode | null;
    const allowedOps = currentStore.allowedOperations || [];

    if (allowedOps.length === 0) {
      console.warn(`Store ${storeId} has no allowed operations. Defaulting to sell for URL.`);
      if (currentMode !== 'sell') {
        router.replace(`/storeportal/${storeId}/billing?mode=sell`);
      }
      return;
    }

    if (!currentMode) {
      router.replace(`/storeportal/${storeId}/billing?mode=${allowedOps[0]}`);
    } else if (!allowedOps.includes(currentMode)) {
      console.warn(`Mode ${currentMode} not allowed for store ${storeId}. Redirecting to ${allowedOps[0]}.`);
      router.replace(`/storeportal/${storeId}/billing?mode=${allowedOps[0]}`);
    }
  }, [storeId, isStoreAuthenticated, currentStore, nextSearchParams, router, hasMounted, isLoading]);

  const handleStoreLogout = () => {
    if (hasMounted && storeId) {
      sessionStorage.removeItem(`authenticatedStore_${storeId}`);
      sessionStorage.removeItem(`currentStaff_${storeId}`);
    }
    setIsStoreAuthenticated(false);
    setCurrentStaff(null);
    if (storeId) router.push(`/storeportal/${storeId}/login`);
    else router.push('/storeportal');
  };
  
  const handleEmployeeAuthenticatedFromDialog = (staff: Staff) => {
    setCurrentStaff(staff);
    if (storeId) {
      sessionStorage.setItem(`currentStaff_${storeId}`, JSON.stringify({ id: staff.id, name: staff.name }));
    }
    setIsEmployeeAuthDialogOpen(false);
  };

  const handleBillSavedWithEmployee = (staff: Staff) => {
    // This is called by BillingForm if it had to prompt for an employee transactionally.
    // Update the page's currentStaff to reflect this.
    setCurrentStaff(staff);
     if (storeId) {
      sessionStorage.setItem(`currentStaff_${storeId}`, JSON.stringify({ id: staff.id, name: staff.name }));
    }
  };

  const handleClearOperator = () => {
    setCurrentStaff(null);
    if(storeId) sessionStorage.removeItem(`currentStaff_${storeId}`);
  };


  if (!hasMounted || (!storeId && hasMounted)) {
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
        <p className="text-lg text-muted-foreground">Initializing Store Portal...</p>
      </div>
    );
  }

  if (isLoading) {
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
        <p className="text-lg text-muted-foreground">Loading {currentStore ? currentStore.name : 'Store'} Terminal...</p>
      </div>
    );
  }

  if (!currentStore && !isLoading) { 
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
        <p className="text-lg text-destructive mb-4">Store not found. Redirecting...</p>
      </div>
    );
  }

  if (currentStore && !isStoreAuthenticated && !isLoading) { 
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
        <p className="text-lg text-muted-foreground mb-4">Redirecting to login for {currentStore.name}...</p>
      </div>
    );
  }
  
  const modeFromUrl = nextSearchParams.get('mode') as BillMode | null;

  if (!currentStore || !isStoreAuthenticated) { // Fallback if other checks missed or in transition
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
              <p className="text-lg text-muted-foreground">Preparing Store Terminal...</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
       <EmployeePasskeyDialog
          isOpen={isEmployeeAuthDialogOpen}
          onOpenChange={setIsEmployeeAuthDialogOpen}
          storeId={currentStore.id}
          onAuthenticated={handleEmployeeAuthenticatedFromDialog}
        />
      <PageTitle
        title={`${currentStore.name} - Billing Terminal`}
        icon={ShoppingCart}
        actions={
          <div className="flex items-center gap-2">
            {currentStaff && (
              <span className="text-sm text-muted-foreground hidden md:inline">Operator: <span className="font-semibold text-foreground">{currentStaff.name}</span></span>
            )}
            <Button variant={currentStaff ? "outline" : "default"} size="sm" onClick={() => setIsEmployeeAuthDialogOpen(true)}>
              <LogInIcon className="mr-2 h-4 w-4" /> {currentStaff ? "Switch Operator" : "Login Employee"}
            </Button>
            {currentStaff && (
                <Button variant="ghost" size="sm" onClick={handleClearOperator} className="text-muted-foreground hover:text-destructive">
                    <UserX className="mr-2 h-4 w-4"/> Clear Operator
                </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => setIsChatDialogOpen(true)} aria-label="Open Chat">
              <MessageSquare className="h-5 w-5" />
            </Button>
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
            <ChatInterface storeId={currentStore.id} currentUserId={currentStaff?.id || currentStore.id} currentUserName={currentStaff?.name || currentStore.name} />
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
          key={modeFromUrl || currentStore.id}
          initialModeProp={modeFromUrl}
          storeId={currentStore.id}
          allowedModes={currentStore.allowedOperations}
          isAdminContext={false}
          identifiedStaffProp={currentStaff}
          onEmployeeIdentifiedForBill={handleBillSavedWithEmployee}
        />
      </Suspense>
    </div>
  );
}
