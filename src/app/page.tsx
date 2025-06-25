
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
import { CallToActionSection } from '@/components/landing/CallToActionSection';
import { AdminLoginEmbedded } from '@/components/auth/AdminLoginEmbedded';
import { AdminSignupEmbedded } from '@/components/auth/AdminSignupEmbedded';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import { StoreSelectorEmbedded } from '@/components/auth/StoreSelectorEmbedded';

type UIMode = 'landing' | 'adminLogin' | 'adminSignup' | 'storeSelector';

const SHARED_AUTH_TOKEN_KEY = "appAuthToken";
const ADMIN_ROLE = "admin";

export default function HomePage() {
  const router = useRouter();
  const [uiMode, setUiMode] = useState<UIMode>('landing');
  const [hasMounted, setHasMounted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(true);

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
        if (lastAuthStoreId) sessionStorage.removeItem('lastAuthenticatedStoreId');
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('authenticatedStore_')) {
                sessionStorage.removeItem(key);
            }
        });
      }
      
      setIsRedirecting(false);

      if (!redirected && uiMode !== 'adminLogin' && uiMode !== 'adminSignup') {
        setUiMode('landing');
      }
    }
  }, [hasMounted, router, uiMode]);


  const showAdminLogin = () => setUiMode('adminLogin');
  const showAdminSignup = () => setUiMode('adminSignup');
  const showStoreSelector = () => setUiMode('storeSelector');
  const hideAuthFormsAndRecheck = () => {
    setUiMode('landing');
    setIsRedirecting(true); 
  };


  if (!hasMounted || isRedirecting) {
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
         <div className="flex items-center gap-2 text-lg text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading Application...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {uiMode === 'landing' && (
        <>
          <LandingHeader onAdminLoginClick={showAdminLogin} onStoreSelectClick={showStoreSelector} />
          <main className="flex-grow">
            <HeroSection onAdminLoginClick={showAdminLogin} onStoreSelectClick={showStoreSelector} />
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

      {uiMode === 'storeSelector' && (
          <StoreSelectorEmbedded
            onCancel={() => setUiMode('landing')}
          />
      )}
    </div>
  );
}
