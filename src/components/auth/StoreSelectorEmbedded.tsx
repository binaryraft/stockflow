
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import type { Store } from '@/types';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { XCircle, Building, LogIn } from 'lucide-react';
import { useThemeLogo } from '@/hooks/use-theme-logo';

interface StoreSelectorEmbeddedProps {
  onCancel: () => void;
}

export function StoreSelectorEmbedded({ onCancel }: StoreSelectorEmbeddedProps) {
  const router = useRouter();
  const { getAllStores } = useInventoryStore();
  const themeLogo = useThemeLogo();
  const [stores, setStores] = useState<Store[]>([]);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    setStores(getAllStores());
  }, [getAllStores]);

  if (!hasMounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
        <Image
          src={themeLogo}
          alt={`${APP_NAME} Logo`}
          width={64}
          height={64}
          className="mb-3 rounded-lg shadow-md animate-pulse"
        />
        <p className="text-muted-foreground">Loading Store Selector...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close store selector">
          <XCircle className="h-6 w-6 text-muted-foreground hover:text-foreground" />
        </Button>
      </div>
      <div className="flex flex-col items-center mb-8">
        <Image
          src={themeLogo}
          alt={`${APP_NAME} Logo`}
          width={64}
          height={64}
          className="mb-3 rounded-lg shadow-md"
        />
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="text-muted-foreground">Store Terminal Access</p>
      </div>
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Select Your Store</CardTitle>
          <CardDescription>Choose your store location to proceed to login.</CardDescription>
        </CardHeader>
        <CardContent>
          {stores.length === 0 ? (
            <p className="text-center text-muted-foreground">No stores available. Please contact an administrator.</p>
          ) : (
            <ScrollArea className="h-[200px] w-full pr-3">
              <div className="space-y-3">
                {stores.map((store) => (
                  <Button
                    key={store.id}
                    variant="outline"
                    className="w-full justify-start h-12 text-left"
                    onClick={() => router.push(`/storeportal/${store.id}/login`)}
                  >
                    <Building className="mr-3 h-5 w-5 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{store.name}</span>
                      <span className="text-xs text-muted-foreground">{store.location}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="ghost" onClick={onCancel} className="w-full text-muted-foreground">
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    