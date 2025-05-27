
"use client";

import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import { Package2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle'; // Re-use existing theme toggle

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/welcome" className="flex items-center gap-2">
          <Package2 className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-primary">{APP_NAME}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="#features" className="font-medium text-muted-foreground transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#pricing" className="font-medium text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </Link>
          {/* Add more links if needed */}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild>
            <Link href="/">Admin Login</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
