
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { BillingForm } from '@/components/billing/billing-form';
import type { Store, BillMode, Staff } from '@/types';
import { PageTitle } from '@/components/common/page-title';
import { Button } from '@/components/ui/button';
import { LogOut, ShoppingCart, MessageSquare, Trash2, AlertTriangle } from 'lucide-react'; // Added Trash2, AlertTriangle
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'; // DialogDescription
import { ChatInterface } from '@/components/chat/ChatInterface';
import { EmployeePasskeyDialog } from '@/components/billing/employee-passkey-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTrigger,
  // AlertDialogDescription, // Already imported from ui/dialog, use that one
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle, // Already imported from ui/dialog
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';


export default function StoreBillingPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;
  const nextSearchParams = useNextSearchParams();
  const { toast } = useToast();

  const { getStoreById, clearChatForStore } = useInventoryStore((state) => ({
     getStoreById: state.getStoreById,
     clearChatForStore: state.clearChatForStore,
  }));


  const [isStoreAuthenticated, setIsStoreAuthenticated] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  // Removed page-level currentStaff and dialog state, as billing form handles it transactionally

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Store authentication
  useEffect(() => {
    if (!hasMounted || !storeId) {
      setIsLoading(true); // Ensure loading is true if not mounted or no storeId
      return;
    }

    setIsLoading(true);
    const store = getStoreById(storeId);

    if (!store) {
      setCurrentStore(null);
      router.replace('/storeportal'); // Redirect to main store portal selection
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
      // This case means the store is misconfigured, perhaps default to 'sell' or show error.
      // For now, if no allowed ops, it won't render any tabs in BillingForm.
      // A better approach might be to ensure stores always have at least one allowed op.
      // Or, if no mode is set and no allowed ops, we might need to display an error message.
      // For now, let's just try to set a default if no mode is specified.
      if (!currentMode) {
        router.replace(`/storeportal/${storeId}/billing?mode=sell`); // Fallback to sell if no ops defined and no mode
      }
      return;
    }

    if (!currentMode) {
      router.replace(`/storeportal/${storeId}/billing?mode=${allowedOps[0]}`);
    } else if (!allowedOps.includes(currentMode)) {
      router.replace(`/storeportal/${storeId}/billing?mode=${allowedOps[0]}`);
    }
  }, [storeId, isStoreAuthenticated, currentStore, nextSearchParams, router, hasMounted, isLoading]);

  const handleStoreLogout = () => {
    if (hasMounted && storeId) {
      sessionStorage.removeItem(`authenticatedStore_${storeId}`);
      // No global currentStaff session to remove at page level anymore
    }
    setIsStoreAuthenticated(false); // Update state immediately
    if (storeId) router.push(`/storeportal/${storeId}/login`);
    else router.push('/storeportal');
  };

  const handleClearChat = () => {
    if (storeId && currentStore) {
      clearChatForStore(storeId);
      toast({
        title: "Chat Cleared",
        description: `All messages for ${currentStore.name} have been deleted.`,
      });
      setIsChatDialogOpen(false); // Close dialog after clearing
    }
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

  if (!currentStore && !isLoading) { // Should be caught by the useEffect, but good fallback
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

  if (currentStore && !isStoreAuthenticated && !isLoading) { // Should be caught by useEffect
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

  // Final check before rendering the main content
  if (!currentStore || !isStoreAuthenticated) { 
      return ( // This is a fallback, should ideally be handled by isLoading or redirects
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
          <DialogHeader className="p-4 border-b flex flex-row justify-between items-center">
            <DialogTitle>Chat with Admin ({currentStore.name})</DialogTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear Chat
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                     <AlertTriangle className="h-5 w-5 text-destructive" /> Are you absolutely sure?
                  </AlertDialogTitle>
                  <DialogDescription> {/* Use DialogDescription here for consistency */}
                    This action cannot be undone. This will permanently delete all chat messages for <strong>{currentStore.name}</strong>.
                  </DialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearChat} className="bg-destructive hover:bg-destructive/90">
                    Yes, Clear Chat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-0">
            {/* Pass currentStore.id as currentUserId for store context, and currentStore.name as currentUserName */}
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
          key={modeFromUrl || currentStore.id} 
          initialModeProp={modeFromUrl}
          storeId={currentStore.id} // Pass the storeId for transactional employee verification context
          allowedModes={currentStore.allowedOperations}
          isAdminContext={false}
          // No identifiedStaffProp or onEmployeeIdentifiedForBill from page level anymore
        />
      </Suspense>
    </div>
  );
}
    