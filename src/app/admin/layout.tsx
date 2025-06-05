"use client"; 

import { AppShell } from '@/components/layout/app-shell';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';

const SHARED_AUTH_TOKEN_KEY = "appAuthToken"; // Key for storing the token
const ADMIN_ROLE = "admin"; // Define the role for admin access

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
    if (!hasMounted) {
      return; 
    }

    setIsLoadingAuth(true); 
    const token = localStorage.getItem(SHARED_AUTH_TOKEN_KEY);
    const userRole = localStorage.getItem('userRole');

    if (token && userRole === ADMIN_ROLE) { // Check for token and admin role
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false); // Set auth state first
      if (token && userRole !== ADMIN_ROLE) {
        // Token exists but not admin role, clear and redirect (or handle differently)
        localStorage.removeItem(SHARED_AUTH_TOKEN_KEY);
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
      }
      router.replace('/'); // Redirect to main landing page for embedded login
    }
    setIsLoadingAuth(false); 
  }, [router, hasMounted]);

  if (!hasMounted) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
        <Image 
          src="https://placehold.co/128x128.png" 
          alt={`${APP_NAME} Logo`} 
          width={80} 
          height={80} 
          className="mb-6 rounded-xl shadow-lg animate-pulse"
          data-ai-hint="logo company"
        />
        <p className="text-lg text-muted-foreground">Initializing Admin Portal...</p>
      </div>
    );
  }
  
  if (isLoadingAuth) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
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
    // This state should ideally be brief as router.replace('/') would have been called.
    // Returning null lets the router handle the redirect without flashing content.
    return null; 
  }

  return <AppShell>{children}</AppShell>;
}