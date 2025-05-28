
"use client";

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, UserCircle, LogOut, Settings as SettingsIcon, User as UserIcon, Wifi, WifiOff, Database } from 'lucide-react';
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
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch'; // For the toggle
import { Label } from '@/components/ui/label';   // For the label
import { cn } from '@/lib/utils';

export function HeaderMain() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const { userProfile, setDataMode } = useInventoryStore((state) => ({
    userProfile: state.userProfile,
    setDataMode: state.setDataMode,
  }));

  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== 'undefined') {
      setIsAdminLoggedIn(localStorage.getItem('isAdminLoggedIn') === 'true');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('authenticatedStore_') || key.startsWith('currentStaff_')) {
        sessionStorage.removeItem(key);
      }
    });
    router.push('/');
  };

  const handleDataModeToggle = (isGlobal: boolean) => {
    const newMode = isGlobal ? 'global' : 'local';
    setDataMode(newMode);
    toast({
      title: `Switched to ${newMode === 'global' ? 'Global' : 'Local'} Mode`,
      description: newMode === 'global' ? "Data sync is simulated." : "Using local browser storage.",
    });
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

  const currentDataMode = userProfile?.dataMode || 'local';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <div className="md:hidden">
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
                  href="/admin"
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

      <div className="flex w-full items-center justify-end gap-3 md:ml-auto">
        <div className="flex items-center space-x-2">
          <Switch
            id="data-mode-toggle"
            checked={currentDataMode === 'global'}
            onCheckedChange={handleDataModeToggle}
            aria-label={`Switch to ${currentDataMode === 'local' ? 'Global' : 'Local'} Mode`}
          />
          <Label htmlFor="data-mode-toggle" className="text-xs flex items-center gap-1.5 cursor-pointer">
            {currentDataMode === 'global' ? <Wifi size={14} className="text-primary" /> : <Database size={14} className="text-secondary"/>}
            <span className={cn(currentDataMode === 'global' ? "text-primary" : "text-secondary")}>
              {currentDataMode === 'global' ? 'Global' : 'Local'}
            </span>
          </Label>
        </div>
        <ThemeToggle />
        {isAdminLoggedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle className="h-6 w-6" />
                <span className="sr-only">User Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
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
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href="/">Admin Login</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
