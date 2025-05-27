
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/lib/constants';
import { LogIn, Building } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <div className="flex flex-col items-center mb-10">
          <Image
            src="https://placehold.co/128x128.png"
            alt={`${APP_NAME} Logo`}
            width={100} 
            height={100}
            className="rounded-2xl shadow-lg mb-6"
            data-ai-hint="logo company app"
            priority // Added priority
          />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
            Manage Your Business with <span className="text-primary">{APP_NAME}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground">
            The ultimate solution for modern inventory management, seamless billing, staff, and multi-store operations. Streamline with efficiency and insight.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-shadow px-8 py-3">
            <Link href="/admin">
              <LogIn className="mr-2 h-5 w-5" /> Admin Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="shadow-md hover:shadow-lg transition-shadow border-primary/50 hover:border-primary text-primary hover:bg-primary/5 px-8 py-3">
            <Link href="/storeportal"> 
              <Building className="mr-2 h-5 w-5" /> Access Store Terminal
            </Link>
          </Button>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Empowering businesses with intuitive tools for growth.
        </p>
      </div>
       <div className="absolute top-0 left-0 w-32 h-32 md:w-64 md:h-64 bg-primary/5 rounded-full opacity-30 -translate-x-1/4 -translate-y-1/4 blur-2xl pointer-events-none"></div>
       <div className="absolute bottom-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-accent/5 rounded-full opacity-40 translate-x-1/4 translate-y-1/4 blur-2xl pointer-events-none"></div>
    </section>
  );
}
