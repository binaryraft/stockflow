
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/lib/constants';
import { LogIn, Building, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  onAdminLoginClick: () => void;
  onStoreSelectClick: () => void;
}

const SHARED_AUTH_TOKEN_KEY = "appAuthToken"; 

export function HeroSection({ onAdminLoginClick, onStoreSelectClick }: HeroSectionProps) {
  const router = useRouter(); 
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false); 
  const [hasMounted, setHasMounted] = useState(false); 

  useEffect(() => { 
    setHasMounted(true);
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(SHARED_AUTH_TOKEN_KEY);
      const role = localStorage.getItem('userRole');
      setIsAdminLoggedIn(!!token && role === 'admin');
    }
  }, []);

  const handleAdminAccessClick = () => { 
    if (isAdminLoggedIn) {
      router.push('/admin');
    } else {
      onAdminLoginClick();
    }
  };

  if (!hasMounted) { 
      return (
          <section className="relative section-padding bg-gradient-to-br from-primary/5 via-background to-background/0">
              <div className="section-container text-center">
                  <div className="animate-pulse">
                      <div className="h-24 w-24 bg-muted rounded-2xl mx-auto mb-8 shadow-lg"></div>
                      <div className="h-12 bg-muted rounded-md w-3/4 mx-auto mb-6"></div>
                      <div className="h-8 bg-muted rounded-md w-1/2 mx-auto mb-10"></div>
                      <div className="flex flex-col sm:flex-row justify-center gap-4">
                          <div className="h-12 bg-muted rounded-lg w-60"></div>
                          <div className="h-12 bg-muted rounded-lg w-60"></div>
                      </div>
                  </div>
              </div>
          </section>
      );
  }

  return (
    <section className="relative section-padding overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background/0">
      <div className="absolute inset-0 opacity-20">
        {/* Decorative shapes */}
        <div className="absolute top-0 left-0 w-64 h-64 md:w-96 md:h-96 bg-primary/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-accent/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl pointer-events-none"></div>
      </div>
      <div className="section-container text-center relative z-10">
        <div className="flex flex-col items-center mb-10 md:mb-12">
          <div className="animate-fadeInDown">
            <Image
              src="https://placehold.co/150x150.png"
              alt={`${APP_NAME} Logo`}
              width={120} 
              height={120}
              className="rounded-3xl shadow-2xl mb-8 border-4 border-card/80"
              data-ai-hint="modern tech logo"
              priority
            />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-foreground animate-fadeInDown delay-200">
            Manage Your Business with <span className="text-gradient-primary">{APP_NAME}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground animate-fadeInDown delay-400">
            The ultimate solution for modern inventory management, seamless billing, staff, and multi-store operations. Streamline with efficiency and insight.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 md:gap-6 animate-fadeInUp delay-600">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-lg hover:shadow-primary/40 transition-all px-8 py-3 text-base rounded-lg group" 
            onClick={handleAdminAccessClick}
          >
            {isAdminLoggedIn ? 'Go to Admin Dashboard' : 'Admin Access'}
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" /> 
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="shadow-md hover:shadow-lg transition-shadow border-primary/40 hover:border-primary text-primary hover:bg-primary/5 px-8 py-3 text-base rounded-lg group" 
            onClick={onStoreSelectClick}
          >
            <Building className="mr-2 h-5 w-5" /> Store Terminal
            <ArrowRight className="ml-2 h-4 w-4 text-primary/70 group-hover:translate-x-0.5 transition-transform duration-200" /> 
          </Button>
        </div>
        <p className="mt-10 text-sm text-muted-foreground animate-fadeInUp delay-600">
          Empowering businesses with intuitive tools for sustainable growth.
        </p>
      </div>
    </section>
  );
}
