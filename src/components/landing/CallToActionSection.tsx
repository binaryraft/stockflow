
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/lib/constants';
import { Rocket, Sparkles } from 'lucide-react';

export function CallToActionSection() {
  return (
    <section className="section-padding bg-gradient-to-br from-primary via-green-600 to-secondary text-primary-foreground">
      <div className="section-container text-center animate-fadeInUp" style={{animationDelay: '0.3s'}}>
        <div className="inline-block p-5 bg-primary-foreground/20 rounded-full mb-8 shadow-lg">
          <Sparkles className="h-16 w-16 text-primary-foreground" />
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
          Ready to Transform Your Business?
        </h2>
        <p className="mt-8 max-w-2xl mx-auto text-lg md:text-xl opacity-90 leading-relaxed">
          Join hundreds of businesses streamlining their inventory and billing with {APP_NAME}.
          Sign up today and experience the difference efficiency makes.
        </p>
        <div className="mt-12">
          <Button 
            asChild 
            size="lg" 
            className="bg-card hover:bg-card/90 text-primary shadow-xl hover:shadow-2xl transition-all duration-300 px-12 py-4 text-xl rounded-lg group transform hover:scale-105 focus:scale-105 focus:ring-4 focus:ring-card/50"
          >
            <Link href="/admin"> {/* Points to admin login/dashboard */}
              Get Started Now <Rocket className="ml-3 h-6 w-6 group-hover:translate-x-1.5 group-hover:-translate-y-0.5 group-hover:rotate-[15deg] transition-transform duration-300" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
