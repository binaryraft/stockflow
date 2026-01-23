
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { APP_NAME, SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import { LocalAppShell } from '@/components/layout/local-app-shell';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { Store } from '@/types';

const LOCAL_CREDS_KEY = "stockflow_local_creds";
const SHARED_AUTH_TOKEN_KEY = "appAuthToken";

export default function LocalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initStatus, setInitStatus] = useState("Initializing Local Mode...");

  useEffect(() => {
    const setupLocalEnv = async () => {
      try {
        setInitStatus("Checking Local Data...");
        let credsString = localStorage.getItem(LOCAL_CREDS_KEY);
        let creds = credsString ? JSON.parse(credsString) : null;

        if (!creds) {
          setInitStatus("Initializing Local Profile...");
          const timestamp = Date.now();
          const userId = `local_user_${timestamp}`;
          const companyId = `local_comp_${timestamp}`;
          const userName = "Local User";

          creds = {
            email: `local@stockflow.app`,
            password: 'local',
            companyId,
            userId,
            userName
          };
          localStorage.setItem(LOCAL_CREDS_KEY, JSON.stringify(creds));
        }

        // Set Session (Offline)
        localStorage.setItem(SHARED_AUTH_TOKEN_KEY, "offline_token");
        localStorage.setItem('companyId', creds.companyId);
        localStorage.setItem('userId', creds.userId);
        localStorage.setItem('userName', creds.userName);
        localStorage.setItem('userRole', 'admin');

        // Initialize Store State for Local Mode
        setInitStatus("Synchronizing Store...");

        // We ensure the store's userProfile has local mode set
        useInventoryStore.setState((state) => ({
          userProfile: {
            ...state.userProfile,
            companyName: "Local Company",
            dataMode: 'local',
            activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.PRO, // Give all features locally
          }
        }));

        // Ensure at least one store exists locally
        const currentStores = useInventoryStore.getState().stores;
        if (currentStores.length === 0) {
          setInitStatus("Creating Local Store...");
          const defaultStore: Store = {
            id: `local_store_${Date.now()}`,
            companyId: creds.companyId,
            name: "Main Local Store",
            username: "main_store",
            passkey: "123456",
            accessCode: "LOCAL",
            location: "Local",
            email: "local@store.app",
            phone: "0000000000",
            allowedOperations: ["buy", "sell", "return"],
            allowedStaffIds: []
          };
          useInventoryStore.setState((state) => ({
            stores: [defaultStore]
          }));
        }

        setInitStatus("Ready.");
        setIsInitializing(false);

      } catch (error) {
        console.error("Local setup error:", error);
        setInitStatus("Error setting up offline mode.");
        toast({ variant: "destructive", title: "Setup Error", description: (error as Error).message });
      }
    };

    setupLocalEnv();
  }, []); // Run once on mount

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
        <Image
          src="/logo.svg"
          alt={`${APP_NAME} Logo`}
          width={80}
          height={80}
          className="mb-6 animate-pulse"
        />
        <div className="flex items-center gap-2 text-lg text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{initStatus}</span>
        </div>
      </div>
    );
  }

  return <LocalAppShell>{children}</LocalAppShell>;
}
