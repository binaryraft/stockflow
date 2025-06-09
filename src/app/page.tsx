
"use client";

import { useState, useEffect } from 'react';
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
import { useRouter } from 'next/navigation';
import { getEmployeeTokenFromStorage } from '@/api/staffHandler';

type UIMode = 'landing' | 'adminLogin' | 'storeSelect';

export default function HomePage() {
  const [uiMode, setUiMode] = useState<UIMode>('landing');
  const [hasMounted, setHasMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('adminToken') ?? '';
    const empToken = getEmployeeTokenFromStorage() ?? '';
  
    if (token && empToken && token === empToken) {
      console.log('Tokens are equal');
      router.push('/storeportal');
    } else if (token && !empToken) {
      console.log('Admin logged in, employee not present');
      localStorage.setItem('isAdminLoggedIn', 'true');
      router.push('/admin');
    }
  
    setHasMounted(true);
  }, []);
  

  const showAdminLogin = () => setUiMode('adminLogin');
  const hideAdminLogin = () => setUiMode('landing');

  const showStoreSelect = () => setUiMode('storeSelect');
  const hideStoreSelect = () => setUiMode('landing');

  if (!hasMounted) {
    // Render nothing or a minimal loader to prevent hydration mismatch with uiMode
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
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
        <AdminLoginEmbedded onLoginSuccess={hideAdminLogin} onCancel={hideAdminLogin} />
      )}

      {uiMode === 'storeSelect' && (
        <StoreSelectorEmbedded onCancel={hideStoreSelect} />
      )}
    </div>
  );
}

    