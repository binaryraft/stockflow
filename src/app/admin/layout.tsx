
"use client";

import { AppShell } from '@/components/layout/app-shell';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { AppBlocker } from '@/components/layout/AppBlocker';
import type { PaymentStatus } from '@/types';

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
  const { fetchCompanyProfile, userProfile } = useInventoryStore();

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

  useEffect(() => {
    if (!hasMounted) return;

    const checkAuthAndSubscription = async () => {
      setIsLoadingAuth(true);
      const token = localStorage.getItem(SHARED_AUTH_TOKEN_KEY);
      const userRole = localStorage.getItem('userRole');
      const companyId = localStorage.getItem('companyId');

      if (token && userRole === ADMIN_ROLE && companyId) {
        setIsAuthenticated(true);
        const companyProfile = await fetchCompanyProfile(companyId);
        
        if (companyProfile) {
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
              // Legacy user with no creation date, default to payment pending
              setBlockReason('pending');
            }
          } else {
            // Unrecognized payment status, block for safety
            setBlockReason('expired');
          }
        } else {
          // If profile fails to load, maybe default to blocked or redirect
          console.error("AdminLayout: Failed to fetch company profile for auth check.");
          setBlockReason('expired'); // Block if we can't verify subscription
        }
      } else {
        setIsAuthenticated(false);
        // Clear all session/local storage on logout/auth failure
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
    };

    checkAuthAndSubscription();
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
    return loadingScreen("Checking authentication & subscription...");
  }

  if (!isAuthenticated) {
    return null; // Redirect is handled in useEffect
  }
  
  if (blockReason) {
    return <AppBlocker reason={blockReason} />;
  }

  return <AppShell>{children}</AppShell>;
}
