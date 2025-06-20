
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/lib/constants';
import { Rocket } from 'lucide-react';

export function CallToActionSection() {
  return (
    <section className="section-padding bg-gradient-to-r from-primary via-green-500 to-primary/80 text-primary-foreground">
      <div className="section-container text-center">
        <Rocket className="h-16 w-16 mx-auto mb-6 opacity-80" />
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
          Ready to Transform Your Business?
        </h2>
        <p className="mt-6 max-w-xl mx-auto text-lg md:text-xl opacity-90">
          Join hundreds of businesses streamlining their inventory and billing with {APP_NAME}.
          Sign up today and experience the difference.
        </p>
        <div className="mt-10">
          <Button 
            asChild 
            size="lg" 
            className="bg-card hover:bg-card/90 text-primary shadow-xl hover:shadow-2xl transition-all px-10 py-3 text-lg rounded-lg group transform hover:scale-105"
          >
            <Link href="/admin"> {/* Points to admin login/dashboard */}
              Get Started Now <span className="ml-2 text-2xl group-hover:translate-x-1 transition-transform">🚀</span>
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
