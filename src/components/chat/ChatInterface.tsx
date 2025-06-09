
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
  currentUserId: 'admin' | string;
  currentUserName: string;
}

export function ChatInterface({ storeId, currentUserId, currentUserName }: ChatInterfaceProps) {
  const { messagesByStore, addChatMessage, getMessagesForStore } = useInventoryStore((state) => ({
    messagesByStore: state.messagesByStore,
    addChatMessage: state.addChatMessage,
    getMessagesForStore: state.getMessagesForStore,
  }));

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages(getMessagesForStore(storeId));
  }, [storeId, getMessagesForStore, messagesByStore]); // Depend on messagesByStore to re-fetch when new messages are added

  useEffect(() => {
    // Scroll to bottom
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    // Focus input on initial load or when dialog opens
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newMessage.trim()) {
      addChatMessage(storeId, currentUserId, currentUserName, newMessage.trim());
      setNewMessage('');
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
          />
          <Button type="submit" size="icon" aria-label="Send message">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
