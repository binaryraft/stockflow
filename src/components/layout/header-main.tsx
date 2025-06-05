
"use client";

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, UserCircle, LogOut, Settings as SettingsIcon, User as UserIcon } from 'lucide-react';
import { NAV_LINKS, APP_NAME } from '@/lib/constants';
import Link from 'next/link';
import { Package2 } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const SHARED_AUTH_TOKEN_KEY = "appAuthToken";

export function HeaderMain() {
  const router = useRouter();
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  const updateAuthState = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(SHARED_AUTH_TOKEN_KEY);
      const name = localStorage.getItem('userName');
      const role = localStorage.getItem('userRole');
      setIsUserLoggedIn(!!token);
      setUserName(name);
      setUserRole(role);
    }
  };

  useEffect(() => {
    setHasMounted(true);
    updateAuthState(); // Initial check
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    const handleStorageChange = () => {
      updateAuthState();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange); // Check on focus as well

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, [hasMounted]);


  const handleLogout = () => {
    localStorage.removeItem(SHARED_AUTH_TOKEN_KEY);
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('companyId');
    localStorage.removeItem('assignedStoreIds');

    setIsUserLoggedIn(false);
    setUserName(null);
    setUserRole(null);

    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('authenticatedStore_') || key.startsWith('currentStaff_')) {
        sessionStorage.removeItem(key);
      }
    });
    router.push('/');
  };


  if (!hasMounted) {
    return (
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <div className="flex w-full items-center justify-end gap-2 md:ml-auto">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
        </div>
      </header>
    );
  }


  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <div className="md:hidden">
           <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <>
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <nav className="grid gap-2 text-lg font-medium p-4">
                <Link
                  href={userRole === 'admin' ? "/admin" : "/"} // Redirect to admin if admin, else homepage
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <Package2 className="h-6 w-6 text-primary" />
                  <span className="">{APP_NAME}</span>
                </Link>
                {NAV_LINKS.map(link => ( // Assuming NAV_LINKS are for admin. Employee nav would be different.
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

      <div className="flex w-full items-center justify-end gap-3 md:ml-auto">
        <ThemeToggle />
        {isUserLoggedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <>
                  <UserCircle className="h-6 w-6" />
                  <span className="sr-only">User Menu</span>
                </>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{userName || (userRole === 'admin' ? 'Admin Account' : 'My Account')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userRole === 'admin' && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/profile">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/settings">
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href="/">Login</Link> {/* Landing page handles showing login options */}
          </Button>
        )}
      </div>
    </header>
  );
}
