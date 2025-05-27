
"use client";

import { APP_NAME } from '@/lib/constants';
import Link from 'next/link';
import { Github, Linkedin, Twitter } from 'lucide-react'; // Example social icons

export function LandingFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="py-8 border-t bg-muted/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} {APP_NAME}. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="#" aria-label="Github" className="text-muted-foreground hover:text-primary transition-colors">
              <Github className="h-5 w-5" />
            </Link>
            <Link href="#" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
              <Linkedin className="h-5 w-5" />
            </Link>
            <Link href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors">
              <Twitter className="h-5 w-5" />
            </Link>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span className="mx-2">|</span>
          <Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
