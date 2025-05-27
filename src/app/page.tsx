
"use client";

import { useState } from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSectionLanding } from '@/components/landing/PricingSectionLanding';
import { OtherSection } from '@/components/landing/OtherSection';
import { ContactSection } from '@/components/landing/ContactSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { CallToActionSection } from '@/components/landing/call-to-action-section';
import { AdminLoginEmbedded } from '@/components/auth/AdminLoginEmbedded'; // New component

type UIMode = 'landing' | 'adminLogin'; // Add more modes later if needed

export default function HomePage() {
  const [uiMode, setUiMode] = useState<UIMode>('landing');

  const showAdminLogin = () => setUiMode('adminLogin');
  const hideAdminLogin = () => setUiMode('landing');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {uiMode === 'landing' && (
        <>
          <LandingHeader onAdminLoginClick={showAdminLogin} />
          <main className="flex-grow">
            <HeroSection onAdminLoginClick={showAdminLogin} />
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
    </div>
  );
}
