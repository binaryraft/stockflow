
"use client";

import { APP_NAME } from '@/lib/constants';
import Link from 'next/link';
import { Github, Linkedin, Twitter, Package2 } from 'lucide-react'; 

export function LandingFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="py-10 md:py-12 border-t bg-muted/30">
      <div className="section-container">
        <div className="grid md:grid-cols-3 gap-8 items-center">
          <div className="flex flex-col items-center md:items-start">
             <Link href="/" className="flex items-center gap-2.5 mb-3">
                <Package2 className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold text-primary">{APP_NAME}</span>
            </Link>
            <p className="text-sm text-muted-foreground text-center md:text-left">
              Modern inventory solutions.
            </p>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
            <Link href="#contact" className="hover:text-primary transition-colors">Contact</Link>
            <Link href="/admin" className="hover:text-primary transition-colors">Admin Login</Link>
          </nav>

          <div className="flex justify-center md:justify-end gap-5">
            <Link href="#" aria-label="Github" className="text-muted-foreground hover:text-primary transition-colors">
              <Github className="h-6 w-6" />
            </Link>
            <Link href="#" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
              <Linkedin className="h-6 w-6" />
            </Link>
            <Link href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors">
              <Twitter className="h-6 w-6" />
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/50 text-center text-xs text-muted-foreground">
          &copy; {currentYear} {APP_NAME}. All rights reserved. 
          <Link href="/privacy-policy" className="ml-2 hover:text-primary transition-colors">Privacy Policy</Link>
          <span className="mx-1.5">|</span>
          <Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
