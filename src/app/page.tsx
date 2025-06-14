
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Added
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

const SHARED_AUTH_TOKEN_KEY = "appAuthToken"; // Added

export default function HomePage() {
  const router = useRouter(); // Added
  const [uiMode, setUiMode] = useState<UIMode>('landing');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Bypass logic for logged-in users
  useEffect(() => {
    if (hasMounted) {
      const adminToken = localStorage.getItem(SHARED_AUTH_TOKEN_KEY);
      const adminRole = localStorage.getItem('userRole');

      if (adminToken && adminRole === 'admin') {
        router.replace('/admin');
        return; // Admin is logged in, no need to check for store
      }

      const lastAuthStoreId = sessionStorage.getItem('lastAuthenticatedStoreId');
      if (lastAuthStoreId) {
        const isStoreStillAuthenticated = sessionStorage.getItem(`authenticatedStore_${lastAuthStoreId}`) === 'true';
        if (isStoreStillAuthenticated) {
          router.replace(`/storeportal/${lastAuthStoreId}/billing`);
          return; // Store is logged in
        } else {
          // Clean up if store session is invalid but lastAuthStoreId still exists
          sessionStorage.removeItem('lastAuthenticatedStoreId');
        }
      }
      // If no redirect happened, ensure UI mode is landing (might be redundant if default is landing)
      // Only set to landing if not actively trying to show login/signup/storeSelect
      if (uiMode !== 'adminLogin' && uiMode !== 'adminSignup' && uiMode !== 'storeSelect') {
        setUiMode('landing');
      }
    }
  }, [hasMounted, router, uiMode]); // Added uiMode to dependencies to re-evaluate if mode changes externally


  const showAdminLogin = () => setUiMode('adminLogin');
  const showAdminSignup = () => setUiMode('adminSignup');
  const hideAuthForms = () => setUiMode('landing'); // This will also trigger the bypass useEffect if user logs in

  const showStoreSelect = () => setUiMode('storeSelect');
  const hideStoreSelect = () => setUiMode('landing');

  if (!hasMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <p className="text-lg text-muted-foreground">Loading Application...</p>
      </div>
    );
  }

  // If redirection is in progress (e.g. adminToken exists but router.replace hasn't completed),
  // we might want to show a loader or null to prevent rendering landing page briefly.
  // Check if we are in landing mode and if a redirection condition is met.
  const adminToken = localStorage.getItem(SHARED_AUTH_TOKEN_KEY);
  const adminRole = localStorage.getItem('userRole');
  const lastAuthStoreId = sessionStorage.getItem('lastAuthenticatedStoreId');
  const isStoreStillAuthenticated = lastAuthStoreId && sessionStorage.getItem(`authenticatedStore_${lastAuthStoreId}`) === 'true';

  if (hasMounted && ((adminToken && adminRole === 'admin') || isStoreStillAuthenticated) && uiMode === 'landing') {
      // Actively redirecting or about to, show minimal content
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
              <p className="text-lg text-muted-foreground">Loading Dashboard...</p>
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
