
"use client"; 

import { AppShell } from '@/components/layout/app-shell';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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

  useEffect(() => {
    if (!hasMounted) return; 

    setIsLoadingAuth(true); 
    const adminLoggedIn = localStorage.getItem('isAdminLoggedIn');
    if (adminLoggedIn === 'true') {
      setIsAuthenticated(true);
      setIsLoadingAuth(false); 
    } else {
      router.replace('/admin/login');
      // It's important to set isLoadingAuth to false even when redirecting,
      // so the "Redirecting to login..." message can appear if needed,
      // rather than being stuck on "Checking authentication...".
      setIsLoadingAuth(false); 
    }
  }, [router, hasMounted]);

  if (!hasMounted || isLoadingAuth) { 
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
    // This state implies isLoadingAuth is false & isAuthenticated is false.
    // router.replace should have been called. This UI is a fallback.
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
