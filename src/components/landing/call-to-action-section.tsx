
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/lib/constants';

export function CallToActionSection() {
  return (
    <section className="py-16 md:py-24 bg-tertiary">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
          Ready to Transform Your Business?
        </h2>
        <p className="mt-4 max-w-xl mx-auto text-lg text-muted-foreground">
          Join hundreds of businesses streamlining their inventory and billing with {APP_NAME}.
          Sign up today and experience the difference.
        </p>
        <div className="mt-8">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all px-10 py-6 text-lg">
            <Link href="/">
              Get Started with {APP_NAME}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
