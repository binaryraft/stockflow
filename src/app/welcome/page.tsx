
import { LandingHeader } from '@/components/landing/landing-header';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { PricingSectionLanding } from '@/components/landing/pricing-section-landing';
import { CallToActionSection } from '@/components/landing/call-to-action-section';
import { LandingFooter } from '@/components/landing/landing-footer';

export default function WelcomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow">
        <HeroSection />
        <FeaturesSection />
        <PricingSectionLanding />
        <CallToActionSection />
      </main>
      <LandingFooter />
    </div>
  );
}
