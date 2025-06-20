
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { APP_NAME } from '@/lib/constants';
import { KeyRound, LogIn, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function StoreLoginPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;

  const { getStoreById, fetchStores } = useInventoryStore(); // Added fetchStores
  const { toast } = useToast();

  const [passkey, setPasskey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [companyIdForStore, setCompanyIdForStore] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    if (!storeId) {
      toast({ variant: "destructive", title: "Invalid URL", description: "Store identifier is missing."});
      router.replace('/storeportal'); 
      setInitialLoading(false);
      return;
    }

    const loadStoreData = async () => {
      let store = getStoreById(storeId);
      if (!store) {
        // If store not in Zustand, try fetching all stores for the current company
        // This assumes we are in a context where a companyId might be known, 
        // e.g. if an admin is navigating or if we embed companyId in store portal URL.
        // For now, we assume the app's general companyId from localStorage is relevant if admin linked.
        const generalCompanyId = localStorage.getItem('companyId');
        if (generalCompanyId) {
          await fetchStores(generalCompanyId); // Fetch stores for the general company context
          store = getStoreById(storeId); // Try getting again
        }
      }

      if (store) {
        setStoreName(store.name);
        setCompanyIdForStore(store.companyId);
        if (sessionStorage.getItem(`authenticatedStore_${storeId}`) === 'true') {
          router.replace(`/storeportal/${storeId}/billing`);
          return; 
        }
      } else {
        toast({
          variant: "destructive",
          title: "Store Not Found",
          description: "The requested store may not exist or is not accessible.",
        });
        router.replace('/storeportal');
      }
      setInitialLoading(false);
    };

    loadStoreData();

  }, [storeId, getStoreById, fetchStores, router, toast, hasMounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMounted || !storeId || !companyIdForStore) {
      toast({ variant: "destructive", title: "Error", description: "Store information or company context is missing."});
      return;
    }
    if (passkey.length < 4) {
      toast({ variant: "destructive", title: "Login Failed", description: "Passkey must be at least 4 characters." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginType: 'store',
          companyId: companyIdForStore,
          storeId: storeId,
          storePasskey: passkey,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.store) {
        sessionStorage.setItem(`authenticatedStore_${storeId}`, 'true');
        sessionStorage.setItem('lastAuthenticatedStoreId', storeId);
        sessionStorage.setItem(`store_${storeId}_companyId`, data.store.companyId);

        toast({
          title: "Login Successful",
          description: `Welcome to ${data.store.name || storeName} terminal.`,
        });
        router.replace(`/storeportal/${storeId}/billing`);
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: data.message || "Invalid store passkey or server error.",
        });
      }
    } catch (error) {
      console.error("Store login error:", error);
      toast({ variant: "destructive", title: "Login Error", description: "Could not connect to the server." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasMounted || initialLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
        <Image
          src="https://placehold.co/128x128.png"
          alt={`${APP_NAME} Logo`}
          width={64}
          height={64}
          className="mb-3 rounded-lg shadow-md animate-pulse"
          data-ai-hint="logo company"
        />
        <p className="text-lg text-muted-foreground">Loading store information...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="flex flex-col items-center mb-8">
        <Image
          src="https://placehold.co/128x128.png"
          alt={`${APP_NAME} Logo`}
          width={64}
          height={64}
          className="mb-3 rounded-lg shadow-md"
          data-ai-hint="logo company"
        />
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="text-muted-foreground">Store Terminal Access</p>
      </div>
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Login to {storeName || 'Store'}</CardTitle>
          <CardDescription>Enter the passkey for this store terminal.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="passkey" className="flex items-center">
                <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" /> Store Passkey* (min. 4 characters)
              </Label>
              <Input
                id="passkey"
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                required
                placeholder="Enter store passkey"
                className="text-center text-lg py-2 h-12"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting || !companyIdForStore}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
              {isSubmitting ? 'Verifying...' : 'Access Terminal'}
            </Button>
          </CardFooter>
        </form>
      </Card>
       <Button variant="link" onClick={() => router.push('/storeportal')} className="mt-8 text-sm" disabled={isSubmitting}>
        Back to Store Portal
      </Button>
    </div>
  );
}
