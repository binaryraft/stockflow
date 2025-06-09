
"use client";

import type { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Shield } from 'lucide-react'; // User for staff, Shield for Admin

interface ChatMessageItemProps {
  message: ChatMessage;
  currentUserId: string;
}

export function ChatMessageItem({ message, currentUserId }: ChatMessageItemProps) {
  const isCurrentUser = message.senderId === currentUserId;
  const senderInitial = message.senderName ? message.senderName.charAt(0).toUpperCase() : (message.senderId === 'admin' ? 'A' : 'S');
  const isAdminSender = message.senderId === 'admin';

  return (
    <div
      className={cn(
        "flex items-end gap-2 my-2",
        isCurrentUser ? "justify-end" : "justify-start"
      )}
    >
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={isAdminSender ? `https://placehold.co/40x40/A673D9/F0F8FF.png?text=${senderInitial}` : `https://placehold.co/40x40/6699CC/F0F8FF.png?text=${senderInitial}`} alt={message.senderName} data-ai-hint={isAdminSender ? "admin shield" : "user initial"}/>
          <AvatarFallback className={cn("text-xs", isAdminSender ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground")}>
            {isAdminSender ? <Shield size={16} /> : <User size={16} />}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[75%] p-3 rounded-xl shadow-md",
          isCurrentUser
            ? "bg-primary text-primary-foreground rounded-br-none" // Sender's bubble
            : "bg-card text-card-foreground rounded-bl-none border"  // Receiver's bubble
        )}
      >
        {!isCurrentUser && (
          <p className="text-xs font-semibold mb-0.5 opacity-80">
            {message.senderName}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
        <p className={cn(
            "text-xs opacity-60 mt-1",
            isCurrentUser ? "text-right" : "text-left"
          )}>
          {format(new Date(message.timestamp), 'p')}
        </p>
      </div>
      {isCurrentUser && (
         <Avatar className="h-8 w-8 shrink-0">
           <AvatarImage src={`https://placehold.co/40x40/6699CC/F0F8FF.png?text=${senderInitial}`} alt={message.senderName} data-ai-hint="user initial" />
           <AvatarFallback className="text-xs bg-primary text-primary-foreground">
             <User size={16} />
           </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
