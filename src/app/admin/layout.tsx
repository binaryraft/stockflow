
"use client";

import { AppShell } from '@/components/layout/app-shell';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import { useInventoryStore } from '@/hooks/use-inventory-store';

const SHARED_AUTH_TOKEN_KEY = "appAuthToken";
const ADMIN_ROLE = "admin";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { fetchCompanyProfile } = useInventoryStore();

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
    const companyId = localStorage.getItem('companyId');

    if (token && userRole === ADMIN_ROLE && companyId) {
      setIsAuthenticated(true);
      fetchCompanyProfile(companyId).catch(err => {
        console.error("AdminLayout: Failed to fetch company profile on auth check:", err);
      });
    } else {
      setIsAuthenticated(false);
      localStorage.removeItem(SHARED_AUTH_TOKEN_KEY);
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
      localStorage.removeItem('companyId');
      localStorage.removeItem('assignedStoreIds');
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('authenticatedStore_') || key === 'lastAuthenticatedStoreId') {
          sessionStorage.removeItem(key);
        }
      });
      router.replace('/');
    }
    setIsLoadingAuth(false);
  }, [router, hasMounted, fetchCompanyProfile, pathname]);

  const loadingScreen = (message: string) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
      <Image
        src="https://placehold.co/128x128.png"
        alt={`${APP_NAME} Logo`}
        width={80}
        height={80}
        className="mb-6 rounded-xl shadow-lg animate-pulse"
        data-ai-hint="logo company"
      />
      <p className="text-lg text-muted-foreground">{message}</p>
    </div>
  );

  if (!hasMounted) {
    return loadingScreen("Initializing Admin Portal...");
  }

  if (isLoadingAuth) {
    return loadingScreen("Checking authentication...");
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
