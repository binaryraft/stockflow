
"use client"; // Assuming some landing components might use client hooks eventually

import { LandingHeader } from '@/components/landing/landing-header';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { PricingSectionLanding } from '@/components/landing/pricing-section-landing';
import { OtherSection } from '@/components/landing/other-section';
import { ContactSection } from '@/components/landing/contact-section';
import { LandingFooter } from '@/components/landing/landing-footer';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow">
        <HeroSection />
        <FeaturesSection />
        <PricingSectionLanding />
        <OtherSection />
        <ContactSection />
      </main>
      <LandingFooter />
    </div>
  );
}
