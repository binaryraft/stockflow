
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import { LogIn, Store as StoreIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';

interface LandingHeaderProps {
  onAdminLoginClick: () => void;
  onStoreLoginClick: () => void;
}

export function LandingHeader({ onAdminLoginClick, onStoreLoginClick }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-lg shadow-sm">
      <div className="section-container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80 group">
          <Image src="/logo.svg" alt="logo" width={32} height={32} className="h-8 w-8 group-hover:scale-105 transition-transform" />
          <span className="text-2xl font-bold text-primary">{APP_NAME}</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          {[
            { href: "#features", label: "Features" },
            { href: "#pricing", label: "Pricing" },
            { href: "#other", label: "Learn More" },
            { href: "#contact", label: "Contact" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="font-medium text-muted-foreground transition-colors hover:text-primary text-base py-2 relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={onStoreLoginClick}
              className="border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary hover:border-secondary/70 transition-all-fast rounded-lg shadow-sm hover:shadow-md"
            >
              <StoreIcon className="mr-2 h-4 w-4" /> Store Login
            </Button>
            <Button
              size="default"
              onClick={onAdminLoginClick}
              className="bg-primary hover:bg-primary/85 text-primary-foreground transition-all-fast rounded-lg shadow-md hover:shadow-lg"
            >
              <LogIn className="mr-2 h-4 w-4" /> Admin Login
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
