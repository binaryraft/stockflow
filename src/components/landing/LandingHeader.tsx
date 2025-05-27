
"use client";

import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import { Package2, LogIn, Store as StoreIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';

interface LandingHeaderProps {
  onAdminLoginClick: () => void;
  onStoreSelectClick: () => void;
}

export function LandingHeader({ onAdminLoginClick, onStoreSelectClick }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Package2 className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-primary">{APP_NAME}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <a href="#features" className="font-medium text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="font-medium text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
          <a href="#other" className="font-medium text-muted-foreground transition-colors hover:text-foreground">
            Learn More
          </a>
          <a href="#contact" className="font-medium text-muted-foreground transition-colors hover:text-foreground">
            Contact
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={onStoreSelectClick}>
            <StoreIcon className="mr-2 h-4 w-4" /> Store Login
          </Button>
          <Button size="sm" onClick={onAdminLoginClick}>
            <LogIn className="mr-2 h-4 w-4" /> Admin Login
          </Button>
        </div>
      </div>
    </header>
  );
}
