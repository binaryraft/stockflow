
"use client";

import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import { Package2, LogIn, Store as StoreIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';

interface LandingHeaderProps {
  onAdminLoginClick: () => void;
  onStoreSelectClick: () => void;
}

export function LandingHeader({ onAdminLoginClick, onStoreSelectClick }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg shadow-sm">
      <div className="container mx-auto flex h-18 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Package2 className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary">{APP_NAME}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {[
            { href: "#features", label: "Features" },
            { href: "#pricing", label: "Pricing" },
            { href: "#other", label: "Learn More" },
            { href: "#contact", label: "Contact" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="font-medium text-muted-foreground transition-colors hover:text-primary text-base"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={onStoreSelectClick} className="border-primary/50 text-primary hover:bg-primary/5 hover:text-primary">
            <StoreIcon className="mr-2 h-4 w-4" /> Store Login
          </Button>
          <Button size="sm" onClick={onAdminLoginClick} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <LogIn className="mr-2 h-4 w-4" /> Admin Login
          </Button>
        </div>
      </div>
    </header>
  );
}
