
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
import { KeyRound, LogIn } from 'lucide-react';
import Image from 'next/image';

export default function StoreLoginPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;
  
  const { getStoreById } = useInventoryStore();
  const { toast } = useToast();

  const [passkey, setPasskey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeName, setStoreName] = useState('');
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

    const store = getStoreById(storeId);
    if (store) {
      setStoreName(store.name);
      if (sessionStorage.getItem(`authenticatedStore_${storeId}`) === 'true') {
        router.replace(`/storeportal/${storeId}/billing`);
        return; 
      }
    } else {
      toast({
        variant: "destructive",
        title: "Store Not Found",
        description: "The requested store does not exist.",
      });
      router.replace('/storeportal'); 
      setInitialLoading(false); 
      return;
    }
    setInitialLoading(false); 
  }, [storeId, getStoreById, router, toast, hasMounted]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMounted) return;

    setIsSubmitting(true);
    const store = getStoreById(storeId);

    if (store && store.passkey === passkey) {
      sessionStorage.setItem(`authenticatedStore_${storeId}`, 'true');
      toast({
        title: "Login Successful",
        description: `Welcome to ${store.name} terminal.`,
      });
      router.replace(`/storeportal/${storeId}/billing`);
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid store passkey. Please try again.",
      });
      setIsSubmitting(false);
    }
  };
  
  if (!hasMounted || initialLoading) { 
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
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
    <div className="flex min-h-screen flex-col items-center justify-center p-4"> {/* Page handles its own full-screen centering */}
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
                <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" /> Store Passkey
              </Label>
              <Input
                id="passkey"
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                required
                placeholder="Enter store passkey"
                className="text-center text-lg py-2 h-12"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <LogIn className="mr-2 h-5 w-5" /> {isSubmitting ? 'Verifying...' : 'Access Terminal'}
            </Button>
          </CardFooter>
        </form>
      </Card>
       <Button variant="link" onClick={() => router.push('/storeportal')} className="mt-8 text-sm">
        Back to Store Portal
      </Button>
    </div>
  );
}
