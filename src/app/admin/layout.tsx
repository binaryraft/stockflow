
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
      setIsAuthenticated(false); // Explicitly set to false
      router.replace('/admin/login');
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
        <p className="text-lg text-muted-foreground">
          {!hasMounted ? "Initializing Admin Portal..." : "Checking authentication..."}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; 
  }

  return <AppShell>{children}</AppShell>;
}
