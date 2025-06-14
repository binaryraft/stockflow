
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
import { AdminSignupEmbedded } from '@/components/auth/AdminSignupEmbedded'; // New import

type UIMode = 'landing' | 'adminLogin' | 'adminSignup' | 'storeSelect';

export default function HomePage() {
  const [uiMode, setUiMode] = useState<UIMode>('landing');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const showAdminLogin = () => setUiMode('adminLogin');
  const showAdminSignup = () => setUiMode('adminSignup');
  const hideAuthForms = () => setUiMode('landing');

  const showStoreSelect = () => setUiMode('storeSelect');
  const hideStoreSelect = () => setUiMode('landing');

  if (!hasMounted) {
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
        <AdminLoginEmbedded 
          onLoginSuccess={hideAuthForms} 
          onCancel={hideAuthForms} 
          onSwitchToSignup={showAdminSignup}
        />
      )}
      
      {uiMode === 'adminSignup' && (
        <AdminSignupEmbedded 
          onSignupSuccess={hideAuthForms} 
          onCancel={hideAuthForms}
          onSwitchToLogin={showAdminLogin}
        />
      )}

      {uiMode === 'storeSelect' && (
        <StoreSelectorEmbedded onCancel={hideStoreSelect} />
      )}
    </div>
  );
}
    
    