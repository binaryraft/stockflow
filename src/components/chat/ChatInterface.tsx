
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import type { ChatMessage } from '@/types';
import { ChatMessageItem } from './ChatMessageItem';
import { Send } from 'lucide-react';

interface ChatInterfaceProps {
  storeId: string;
  currentUserId: 'admin' | string; // 'admin' if admin is sending, or storeId if store terminal is sending
  currentUserName: string;
}

export function ChatInterface({ storeId, currentUserId, currentUserName }: ChatInterfaceProps) {
  const { 
    messagesByStore, 
    addChatMessage, 
    getMessagesForStore,
    fetchMessagesForStore // Added fetch function
  } = useInventoryStore((state) => ({
    messagesByStore: state.messagesByStore,
    addChatMessage: state.addChatMessage,
    getMessagesForStore: state.getMessagesForStore,
    fetchMessagesForStore: state.fetchMessagesForStore,
  }));

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const companyIdFromStorage = localStorage.getItem('companyId');
    if (companyIdFromStorage) {
      setCurrentCompanyId(companyIdFromStorage);
    } else {
      console.error("ChatInterface: Company ID not found in localStorage.");
      // Handle missing companyId, perhaps show an error or disable chat
    }
  }, []);

  useEffect(() => {
    if (storeId && currentCompanyId) {
      fetchMessagesForStore(storeId, currentCompanyId);
    }
  }, [storeId, currentCompanyId, fetchMessagesForStore]);
  
  useEffect(() => {
    // This effect reacts to changes in messagesByStore from the Zustand store
    // (which should be updated after fetchMessagesForStore completes or addChatMessage is called)
    setMessages(getMessagesForStore(storeId));
  }, [storeId, getMessagesForStore, messagesByStore]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newMessage.trim() && currentCompanyId) {
      // Pass companyId to addChatMessage for server-side validation context
      await addChatMessage(storeId, currentUserId, currentUserName, newMessage.trim(), currentCompanyId);
      setNewMessage('');
      // Messages will update via the useEffect listening to messagesByStore
    } else if (!currentCompanyId) {
        console.error("Cannot send message: Company ID is missing.");
        // Optionally, show a toast to the user
    }
  };

  return (
    <div className="flex flex-col h-full bg-card text-card-foreground">
      <ScrollArea className="flex-1 p-4 space-y-4" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} currentUserId={currentUserId} />
          ))
        )}
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="p-3 border-t bg-background">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            autoComplete="off"
            disabled={!currentCompanyId} // Disable if no company context
          />
          <Button type="submit" size="icon" aria-label="Send message" disabled={!currentCompanyId}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}

    