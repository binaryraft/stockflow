
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSectionLanding } from '@/components/landing/PricingSectionLanding';
import { OtherSection } from '@/components/landing/OtherSection';
import { ContactSection } from '@/components/landing/ContactSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { CallToActionSection } from '@/components/landing/call-to-action-section';
import { AdminLoginEmbedded } from '@/components/auth/AdminLoginEmbedded';
import { StoreSelectorEmbedded } from '@/components/auth/StoreSelectorEmbedded';
import { AdminSignupEmbedded } from '@/components/auth/AdminSignupEmbedded';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';

type UIMode = 'landing' | 'adminLogin' | 'adminSignup' | 'storeSelect';

const SHARED_AUTH_TOKEN_KEY = "appAuthToken";
const ADMIN_ROLE = "admin";

export default function HomePage() {
  const router = useRouter();
  const [uiMode, setUiMode] = useState<UIMode>('landing');
  const [hasMounted, setHasMounted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(true); // Start as true to show loader

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      const adminToken = localStorage.getItem(SHARED_AUTH_TOKEN_KEY);
      const adminRole = localStorage.getItem('userRole');
      const lastAuthStoreId = sessionStorage.getItem('lastAuthenticatedStoreId');
      const isStoreStillAuthenticated = lastAuthStoreId && sessionStorage.getItem(`authenticatedStore_${lastAuthStoreId}`) === 'true';

      let redirected = false;
      if (adminToken && adminRole === ADMIN_ROLE) {
        router.replace('/admin');
        redirected = true;
      } else if (isStoreStillAuthenticated && lastAuthStoreId) {
        router.replace(`/storeportal/${lastAuthStoreId}/billing`);
        redirected = true;
      } else {
        // Clean up potentially stale store session info if admin is not logged in
        if (lastAuthStoreId) sessionStorage.removeItem('lastAuthenticatedStoreId');
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('authenticatedStore_')) {
                sessionStorage.removeItem(key);
            }
        });
      }
      
      setIsRedirecting(false); // Stop showing loader after check

      if (!redirected && uiMode !== 'adminLogin' && uiMode !== 'adminSignup' && uiMode !== 'storeSelect') {
        setUiMode('landing');
      }
    }
  }, [hasMounted, router, uiMode]);


  const showAdminLogin = () => setUiMode('adminLogin');
  const showAdminSignup = () => setUiMode('adminSignup');
  const hideAuthFormsAndRecheck = () => {
    setUiMode('landing');
    setIsRedirecting(true); // Trigger re-check of auth state
  };

  const showStoreSelect = () => setUiMode('storeSelect');
  const hideStoreSelect = () => setUiMode('landing');

  if (!hasMounted || isRedirecting) {
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
        <p className="text-lg text-muted-foreground">Loading Application...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {uiMode === 'landing' && (
        <>
          <LandingHeader onAdminLoginClick={showAdminLogin} onStoreSelectClick={showStoreSelect} />
          <main className="flex-grow">
            <HeroSection onAdminLoginClick={showAdminLogin} onStoreSelectClick={showStoreSelect} />
            <FeaturesSection />
            <PricingSectionLanding />
            <OtherSection />
            <CallToActionSection />
            <ContactSection />
          </main>
          <LandingFooter />
        </>
      )}

      {uiMode === 'adminLogin' && (
        <AdminLoginEmbedded
          onLoginSuccess={hideAuthFormsAndRecheck}
          onCancel={() => setUiMode('landing')}
          onSwitchToSignup={showAdminSignup}
        />
      )}

      {uiMode === 'adminSignup' && (
        <AdminSignupEmbedded
          onSignupSuccess={hideAuthFormsAndRecheck}
          onCancel={() => setUiMode('landing')}
          onSwitchToLogin={showAdminLogin}
        />
      )}

      {uiMode === 'storeSelect' && (
        <StoreSelectorEmbedded onCancel={hideStoreSelect} />
      )}
    </div>
  );
}

    