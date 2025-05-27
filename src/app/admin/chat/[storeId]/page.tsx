
"use client";

import { useParams } from 'next/navigation';
import { PageTitle } from '@/components/common/page-title';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { MessageSquare } from 'lucide-react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useEffect, useState } from 'react';
import type { Store } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function AdminStoreChatPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const getStoreById = useInventoryStore((state) => state.getStoreById);
  const [store, setStore] = useState<Store | null | undefined>(undefined); // undefined for loading

  useEffect(() => {
    if (storeId) {
      setStore(getStoreById(storeId));
    }
  }, [storeId, getStoreById]);

  if (store === undefined) {
    return <div className="flex-1 flex items-center justify-center">Loading store information...</div>;
  }

  if (store === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-lg text-destructive">Store not found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/chat">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Chat List
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh_-_var(--header-height)_-_theme(spacing.12))]"> {/* Adjust for header and page padding */}
      <PageTitle 
        title={`Chat with ${store.name}`} 
        icon={MessageSquare} 
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/chat">
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to List
            </Link>
          </Button>
        }
      />
      <div className="flex-1 overflow-hidden">
        <ChatInterface storeId={store.id} currentUserId="admin" currentUserName="Admin" />
      </div>
    </div>
  );
}
