
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
          <section className="relative section-padding bg-gradient-to-br from-primary/5 via-background to-background/0 overflow-hidden">
              <div className="section-container text-center">
                  <div className="animate-pulse">
                      <div className="h-32 w-32 bg-muted rounded-3xl mx-auto mb-8 shadow-2xl"></div>
                      <div className="h-14 bg-muted rounded-md w-3/4 mx-auto mb-6"></div>
                      <div className="h-10 bg-muted rounded-md w-1/2 mx-auto mb-10"></div>
                      <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6">
                          <div className="h-14 bg-muted rounded-lg w-64"></div>
                          <div className="h-14 bg-muted rounded-lg w-64"></div>
                      </div>
                  </div>
              </div>
          </section>
      );
  }

  return (
    <section className="relative section-padding bg-gradient-to-br from-primary/5 via-background to-background/0 overflow-hidden">
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <div className="absolute top-0 left-0 w-72 h-72 md:w-96 md:h-96 bg-primary/20 dark:bg-primary/10 rounded-full -translate-x-1/2 -translate-y-1/3 blur-3xl pointer-events-none animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 md:w-96 md:h-96 bg-secondary/20 dark:bg-secondary/10 rounded-full translate-x-1/2 translate-y-1/3 blur-3xl pointer-events-none animate-pulse-slow delay-200"></div>
      </div>
      <div className="section-container text-center relative z-10">
        <div className="flex flex-col items-center mb-12 md:mb-16">
          <div className="animate-fadeInDown delay-100">
            <Image
              src="https://placehold.co/150x150.png"
              alt={`${APP_NAME} Logo`}
              width={140} 
              height={140}
              className="rounded-3xl shadow-2xl mb-10 border-4 border-card/80"
              data-ai-hint="modern tech logo"
              priority
            />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-foreground animate-fadeInDown delay-300">
            Manage Your Business with <span className="text-gradient-primary">{APP_NAME}</span>
          </h1>
          <p className="mt-8 max-w-3xl text-lg md:text-xl text-muted-foreground animate-fadeInDown delay-500">
            The ultimate solution for modern inventory management, seamless billing, staff, and multi-store operations. Streamline with efficiency and insight, beautifully.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 md:gap-6 animate-fadeInUp delay-700">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-lg hover:shadow-primary/40 transition-all duration-300 px-10 py-3.5 text-lg rounded-lg group transform hover:scale-105 focus:scale-105 focus:ring-4 focus:ring-primary/30" 
            onClick={handleAdminAccessClick}
          >
            {isAdminLoggedIn ? 'Go to Admin Dashboard' : 'Admin Access'}
            <ArrowRight className="ml-2.5 h-5 w-5 group-hover:translate-x-1.5 transition-transform duration-300" /> 
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="shadow-md hover:shadow-lg transition-all duration-300 border-secondary/50 hover:border-secondary text-secondary hover:bg-secondary/5 px-10 py-3.5 text-lg rounded-lg group transform hover:scale-105 focus:scale-105 focus:ring-4 focus:ring-secondary/30" 
            onClick={onStoreSelectClick}
          >
            <Building className="mr-2.5 h-5 w-5" /> Store Terminal
            <ArrowRight className="ml-2 h-4 w-4 text-secondary/70 group-hover:translate-x-1 transition-transform duration-300" /> 
          </Button>
        </div>
        <p className="mt-12 text-base text-muted-foreground animate-fadeInUp delay-700">
          Empowering businesses with intuitive tools for <span className="font-semibold text-foreground">sustainable growth</span>.
        </p>
      </div>
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.05); }
        }
        .animate-pulse-slow { animation: pulse-slow 8s infinite ease-in-out; }
        .animate-pulse-slow.delay-200 { animation-delay: 2s; }
      `}</style>
    </section>
  );
}
