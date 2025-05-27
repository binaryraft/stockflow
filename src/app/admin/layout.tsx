
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

  // Ensure Zustand store is hydrated on client for admin section
  useEffect(() => {
    // Zustand's persist middleware handles rehydration automatically.
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const adminLoggedIn = localStorage.getItem('isAdminLoggedIn');
      if (adminLoggedIn === 'true') {
        setIsAuthenticated(true);
      } else {
        router.replace('/admin/login');
      }
      setIsLoadingAuth(false);
    };
    checkAuth();
  }, [router]);

  if (isLoadingAuth) {
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
    // This will typically not be seen due to the redirect, but it's a fallback.
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

  return <AppShell>{children}</AppShell>;
}
