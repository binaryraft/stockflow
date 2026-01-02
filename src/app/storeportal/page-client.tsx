
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { APP_NAME } from '@/lib/constants';
import { KeyRound, LogIn, Loader2, Building, Fingerprint } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export function StoreLoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [companyIdInput, setCompanyIdInput] = useState('');
  const [storeIdInput, setStoreIdInput] = useState('');
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [passkey, setPasskey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    // Pre-fill from query params if available (e.g., from a direct link or old redirect)
    const queryStoreId = searchParams.get('storeId');
    const queryCompanyId = searchParams.get('companyId');

    if (queryStoreId) setStoreIdInput(queryStoreId);
    else {
      const lastStore = localStorage.getItem('lastStoreAccessCode');
      if (lastStore) setStoreIdInput(lastStore);
    }

    if (queryCompanyId) setCompanyIdInput(queryCompanyId);
    else {
      const lastComp = localStorage.getItem('lastCompanyId');
      if (lastComp) setCompanyIdInput(lastComp);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMounted) return;

    if (!companyIdInput.trim() || !storeIdInput.trim() || !employeeIdInput.trim() || !passkey.trim()) {
      toast({ variant: "destructive", title: "Login Failed", description: "Company ID, Store Access Code, Employee ID, and Password are required." });
      return;
    }
    if (storeIdInput.trim().length !== 6) {
      toast({ variant: "destructive", title: "Login Failed", description: "Store Access Code must be 6 digits." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginType: 'store',
          companyId: companyIdInput.trim(),
          storeAccessCode: storeIdInput.trim(),
          employeeId: employeeIdInput.trim(),
          employeePasskey: passkey,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.store) {
        sessionStorage.setItem(`authenticatedStore_${data.store.id}`, 'true');
        sessionStorage.setItem('lastAuthenticatedStoreId', data.store.id);
        sessionStorage.setItem(`store_${data.store.id}_companyId`, data.store.companyId);

        // Persist for convenience
        localStorage.setItem('lastCompanyId', data.store.companyId);
        localStorage.setItem('lastStoreAccessCode', storeIdInput.trim());

        toast({
          title: "Login Successful",
          description: `Welcome to ${data.store.name} terminal.`,
        });
        router.replace(`/storeportal/${data.store.id}/billing`);
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: data.message || "Invalid credentials or server error.",
        });
      }
    } catch (error) {
      console.error("Store login error:", error);
      toast({ variant: "destructive", title: "Login Error", description: "Could not connect to the server." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/logo.svg"
          alt={`${APP_NAME} Logo`}
          width={64}
          height={64}
          className="mb-3 animate-pulse"
        />
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="text-muted-foreground">Store Terminal Access</p>
      </div>
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Terminal Login</CardTitle>
          <CardDescription>Enter unique store code and your staff credentials.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyId" className="flex items-center">
                <Fingerprint className="mr-2 h-4 w-4 text-muted-foreground" /> Company ID*
              </Label>
              <Input
                id="companyId"
                type="text"
                value={companyIdInput}
                onChange={(e) => setCompanyIdInput(e.target.value)}
                required
                placeholder="Enter Company ID"
                className="h-11"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="storeAccessCode" className="flex items-center">
                <Building className="mr-2 h-4 w-4 text-muted-foreground" /> Store Access Code (6 digits)*
              </Label>
              <Input
                id="storeAccessCode"
                type="text"
                value={storeIdInput}
                onChange={(e) => setStoreIdInput(e.target.value)}
                required
                placeholder="Ex: 123456"
                className="h-11 font-mono tracking-widest text-center text-lg"
                maxLength={6}
                disabled={isSubmitting}
              />
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Staff verification</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="employeeId" className="flex items-center">
                <Fingerprint className="mr-2 h-4 w-4 text-muted-foreground" /> Employee ID*
              </Label>
              <Input
                id="employeeId"
                type="text"
                value={employeeIdInput}
                onChange={(e) => setEmployeeIdInput(e.target.value)}
                required
                placeholder="Enter your Employee ID"
                className="h-11"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passkey" className="flex items-center">
                <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" /> Employee Passkey (Password)*
              </Label>
              <Input
                id="passkey"
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                required
                placeholder="Enter your password"
                className="h-11"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
              {isSubmitting ? 'Verifying...' : 'Access Terminal'}
            </Button>
            <Button variant="link" asChild className="text-xs">
              <Link href="/">Back to Main Site</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
