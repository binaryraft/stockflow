
"use client";

import { useParams } from 'next/navigation';
import { PageTitle } from '@/components/common/page-title';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { MessageSquare, Trash2, AlertTriangle } from 'lucide-react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useEffect, useState } from 'react';
import type { Store } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function AdminStoreChatPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { getStoreById, clearChatForStore } = useInventoryStore((state) => ({
    getStoreById: state.getStoreById,
    clearChatForStore: state.clearChatForStore,
  }));
  const { toast } = useToast();

  const [store, setStore] = useState<Store | null | undefined>(undefined); // undefined for loading

  useEffect(() => {
    if (storeId) {
      setStore(getStoreById(storeId));
    }
  }, [storeId, getStoreById]);

  const handleClearChat = () => {
    if (storeId) {
      clearChatForStore(storeId);
      toast({
        title: "Chat Cleared",
        description: `All messages for ${store?.name || 'this store'} have been deleted.`,
      });
    }
  };

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
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/50">
                  <Trash2 className="mr-2 h-4 w-4" /> Clear Chat
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" /> Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all chat messages for <strong>{store.name}</strong>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearChat} className="bg-destructive hover:bg-destructive/90">
                    Yes, Clear Chat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/chat">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to List
              </Link>
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-hidden">
        <ChatInterface storeId={store.id} currentUserId="admin" currentUserName="Admin" />
      </div>
    </div>
  );
}
    