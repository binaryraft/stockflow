
"use client";

import { APP_NAME } from '@/lib/constants';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="py-8 border-t bg-background">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear} {APP_NAME}. All rights reserved.
        </p>
        {/* Add other footer links if needed */}
      </div>
    </footer>
  );
}
