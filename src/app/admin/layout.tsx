
"use client";

import { AppShell } from '@/components/layout/app-shell';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';

const SHARED_AUTH_TOKEN_KEY = "appAuthToken";
const ADMIN_ROLE = "admin";

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
    const userRole = localStorage.getItem('userRole'); // Role is stored upon login

    if (token && userRole === ADMIN_ROLE) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      // If token exists but role is not admin, or no token, clear all auth-related local storage
      localStorage.removeItem(SHARED_AUTH_TOKEN_KEY);
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
      localStorage.removeItem('companyId');
      localStorage.removeItem('assignedStoreIds'); // Clear employee-specific data too
      router.replace('/'); // Redirect to main landing page (which handles login)
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
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
