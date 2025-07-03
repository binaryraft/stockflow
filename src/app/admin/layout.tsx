"use client";

import { AppShell } from '@/components/layout/app-shell';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { AppBlocker } from '@/components/layout/AppBlocker';
import type { PaymentStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';

const SHARED_AUTH_TOKEN_KEY = "appAuthToken";
const ADMIN_ROLE = "admin";
const THEME_STORAGE_KEY = "app-color-theme";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { fetchCompanyProfile } = useInventoryStore();
  const { toast } = useToast();

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [blockReason, setBlockReason] = useState<'pending' | 'expired' | null>(null);

  useEffect(() => {
    setHasMounted(true);
    // Apply theme on initial load
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const handleLogout = useCallback((reason: 'auth' | 'fetch_error') => {
    if (reason === 'fetch_error') {
      toast({
        variant: "destructive",
        title: "Session Error",
        description: "Could not load company profile. Logging out for security.",
      });
    }
    // Full logout logic
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
  }, [router, toast]);


  useEffect(() => {
    if (!hasMounted) return;

    const checkAuthAndSubscription = async () => {
      setIsLoadingAuth(true);
      const token = localStorage.getItem(SHARED_AUTH_TOKEN_KEY);
      const userRole = localStorage.getItem('userRole');
      const companyId = localStorage.getItem('companyId');

      if (token && userRole === ADMIN_ROLE && companyId) {
        const companyProfile = await fetchCompanyProfile(companyId);
        
        if (companyProfile) {
          setIsAuthenticated(true); // Set authenticated only if profile fetch succeeds
          if (companyProfile.paymentStatus === 'paid') {
            if (companyProfile.subscriptionExpiryDate && new Date(companyProfile.subscriptionExpiryDate) < new Date()) {
              setBlockReason('expired');
            } else {
              setBlockReason(null);
            }
          } else if (companyProfile.paymentStatus === 'pending') {
            if (companyProfile.creationDate) {
              const creationDate = new Date(companyProfile.creationDate);
              const trialEndDate = new Date(creationDate);
              trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

              if (new Date() < trialEndDate) {
                setBlockReason(null); // Still in trial period
              } else {
                setBlockReason('pending'); // Trial expired, payment pending
              }
            } else {
              setBlockReason('pending');
            }
          } else {
            setBlockReason('expired');
          }
        } else {
          console.error("AdminLayout: Failed to fetch company profile for auth check. Logging out.");
          setIsAuthenticated(false);
          handleLogout('fetch_error');
        }
      } else {
        setIsAuthenticated(false);
        handleLogout('auth');
      }
      setIsLoadingAuth(false);
    };

    checkAuthAndSubscription();
  }, [router, hasMounted, fetchCompanyProfile, pathname, handleLogout]);


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
    return loadingScreen("Checking authentication & subscription...");
  }

  if (!isAuthenticated) {
    return null; // Redirect is handled in useEffect via handleLogout
  }
  
  if (blockReason) {
    return <AppBlocker reason={blockReason} />;
  }

  return <AppShell>{children}</AppShell>;
}
