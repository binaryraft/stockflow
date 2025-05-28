
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { BillingForm } from '@/components/billing/billing-form';
import type { Store, BillMode } from '@/types';
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

  const { getStoreById } = useInventoryStore();

  const [isStoreAuthenticated, setIsStoreAuthenticated] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Store authentication
  useEffect(() => {
    if (!hasMounted || !storeId) {
      setIsLoading(true);
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
    } else {
      setIsStoreAuthenticated(false);
      router.replace(`/storeportal/${storeId}/login`);
    }
    setIsLoading(false);
  }, [storeId, router, getStoreById, hasMounted]);

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
      // No currentStaff session to remove at page level anymore
    }
    setIsStoreAuthenticated(false);
    if (storeId) router.push(`/storeportal/${storeId}/login`);
    else router.push('/storeportal');
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
      <PageTitle
        title={`${currentStore.name} - Billing Terminal`}
        icon={ShoppingCart}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsChatDialogOpen(true)} aria-label="Open Chat with Admin">
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
            <ChatInterface storeId={currentStore.id} currentUserId={currentStore.id} currentUserName={currentStore.name} />
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
          key={modeFromUrl || currentStore.id} // Ensures form remounts if store or mode changes significantly
          initialModeProp={modeFromUrl}
          storeId={currentStore.id}
          allowedModes={currentStore.allowedOperations}
          isAdminContext={false}
          // No identifiedStaffProp or onEmployeeIdentifiedForBill needed from here
        />
      </Suspense>
    </div>
  );
}
