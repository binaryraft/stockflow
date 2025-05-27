
"use client"; 

import { AppShell } from '@/components/layout/app-shell';
import { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // For loading state
import { APP_NAME } from '@/lib/constants';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Ensure Zustand store is hydrated on client for admin section
  useEffect(() => {
    // Zustand's persist middleware handles rehydration automatically.
  }, []);

  useEffect(() => {
    if (!hasMounted) return; // Only run auth check on client after mount

    const adminLoggedIn = localStorage.getItem('isAdminLoggedIn');
    if (adminLoggedIn === 'true') {
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } else {
      router.replace('/admin/login');
      // It's important to set isLoadingAuth to false even after redirect
      // so the component knows it's done checking.
      // isAuthenticated will remain false.
      setIsLoadingAuth(false); 
    }
  }, [router, hasMounted]);

  if (isLoadingAuth || !hasMounted) { // Also wait for hasMounted
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Image 
          src="https://placehold.co/128x128.png" 
          alt={`${APP_NAME} Logo`} 
          width={80} 
          height={80} 
          className="mb-6 rounded-xl shadow-lg animate-pulse"
          data-ai-hint="logo company"
        />
        <p className="text-lg text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // This state might be visible briefly if router.replace is not instantaneous,
    // or if hasMounted is true but localStorage check already happened.
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Image 
          src="https://placehold.co/128x128.png" 
          alt={`${APP_NAME} Logo`} 
          width={80} 
          height={80} 
          className="mb-6 rounded-xl shadow-lg"
          data-ai-hint="logo company"
        />
        <p className="text-lg text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  // If we reach here, isLoadingAuth is false, hasMounted is true, AND isAuthenticated is true.
  return <AppShell>{children}</AppShell>;
}
