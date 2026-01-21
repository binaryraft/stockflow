
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { APP_NAME, SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import { LocalAppShell } from '@/components/layout/local-app-shell';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';

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

  const fetchStores = useInventoryStore(state => state.fetchStores);
  const addStore = useInventoryStore(state => state.addStore);
  const stores = useInventoryStore(state => state.stores);

  useEffect(() => {
    const setupLocalEnv = async () => {
      try {
        setInitStatus("Checking Local Credentials...");
        let credsString = localStorage.getItem(LOCAL_CREDS_KEY);
        let creds = credsString ? JSON.parse(credsString) : null;

        let token = "";
        let companyId = "";
        let userId = "";
        let userName = "";

        if (!creds) {
          setInitStatus("Creating Local Profile...");
          const timestamp = Date.now();
          const newEmail = `local_user_${timestamp}@stockflow.local`;
          const newPassword = `local_pass_${timestamp}_${Math.random().toString(36).substring(7)}`;
          
          const signupRes = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyName: "My Local Company",
              adminName: "Local Admin",
              email: newEmail,
              password: newPassword,
              planId: SUBSCRIPTION_PLAN_IDS.PRO,
              subscriptionType: "monthly"
            })
          });

          const signupData = await signupRes.json();
          if (!signupData.success) {
            throw new Error(signupData.message || "Failed to create local profile.");
          }

          token = signupData.token;
          companyId = signupData.user.companyId;
          userId = signupData.user.id;
          userName = signupData.user.name;

          creds = { email: newEmail, password: newPassword, companyId, userId, userName };
          localStorage.setItem(LOCAL_CREDS_KEY, JSON.stringify(creds));

        } else {
            setInitStatus("Authenticating Local Profile...");
            const loginRes = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    loginType: 'admin',
                    email: creds.email,
                    password: creds.password
                })
            });
            const loginData = await loginRes.json();
            
            if (!loginData.success) {
                console.warn("Local login failed, resetting local profile.");
                localStorage.removeItem(LOCAL_CREDS_KEY);
                // Retry setup by calling recursive or reloading. Reloading is safer.
                window.location.reload();
                return;
            }

            token = loginData.token;
            companyId = creds.companyId; // Ensure we keep using the stored ID or update from loginData if user object has it (login returns user without password)
            userId = loginData.user.id;
            userName = loginData.user.name;
        }

        // Set Session
        localStorage.setItem(SHARED_AUTH_TOKEN_KEY, token);
        localStorage.setItem('companyId', companyId);
        localStorage.setItem('userId', userId);
        localStorage.setItem('userName', userName);
        localStorage.setItem('userRole', 'admin');

        // Check Store
        setInitStatus("Checking Local Store...");
        // We need to fetch stores. The store hook might have cached data, but we just logged in.
        // It's safer to call API directly here to ensure we block until store exists.
        const storesRes = await fetch(`/api/stores?companyId=${companyId}`);
        const storesData = await storesRes.json();
        
        if (storesData.success && Array.isArray(storesData.data)) {
             if (storesData.data.length === 0) {
                 setInitStatus("Creating Default Local Store...");
                 const newStoreRes = await fetch('/api/stores', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                         companyId,
                         storeData: {
                             name: "Main Store",
                             username: `store_${Date.now()}`,
                             passkey: "123456",
                             location: "Local",
                             email: `store_${Date.now()}@local.app`,
                             phone: "0000000000",
                             allowedOperations: ["bill_create", "bill_view", "inventory_view", "inventory_manage"],
                             allowedStaffIds: []
                         }
                     })
                 });
                 const newStoreData = await newStoreRes.json();
                 if (!newStoreData.success) {
                     throw new Error("Failed to create default store: " + newStoreData.message);
                 }
             }
        }

        setInitStatus("Ready.");
        setIsInitializing(false);

      } catch (error) {
        console.error("Local setup error:", error);
        setInitStatus("Error setting up local mode.");
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
