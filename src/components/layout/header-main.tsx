"use client";

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, UserCircle } from 'lucide-react';
import { NAV_LINKS, APP_NAME } from '@/lib/constants';
import Link from 'next/link';
import { Package2 } from 'lucide-react';


export function HeaderMain() {
  // This component is simplified for now. It can be expanded with user menus, search bars, etc.
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <div className="md:hidden"> {/* SidebarTrigger for small screens */}
           <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <nav className="grid gap-2 text-lg font-medium p-4">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <Package2 className="h-6 w-6 text-primary" />
                  <span className="">{APP_NAME}</span>
                </Link>
                {NAV_LINKS.map(link => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                    >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                    </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="hidden md:block"> {/* SidebarTrigger for larger screens, integrated into Sidebar component */}
            {/* The main Sidebar component will handle its own trigger if needed, or can be always visible */}
        </div>

      <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
        {/* Placeholder for future elements like search or user avatar */}
        {/* <form className="ml-auto flex-1 sm:flex-initial">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
            />
          </div>
        </form> */}
        <Button variant="ghost" size="icon" className="rounded-full">
          <UserCircle className="h-6 w-6" />
          <span className="sr-only">User Profile</span>
        </Button>
      </div>
    </header>
  );
}
