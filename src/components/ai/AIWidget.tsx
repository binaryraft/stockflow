"use client"

import React, { useRef, useEffect } from 'react'
import { Bot, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIChat } from '@/hooks/use-ai-chat'

// Modular Parts
import { AIHeader } from './parts/AIHeader'
import { AISidebar } from './parts/AISidebar'
import { AIMessageBubble } from './parts/AIMessageBubble'
import { AIInputSystem } from './parts/AIInputSystem'
import { AIVoiceOverlay } from './parts/AIVoiceOverlay'

interface AIWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AIWidget({ isOpen, onClose }: AIWidgetProps) {
    const chat = useAIChat(isOpen)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [chat.messages, chat.isThinking])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-0 sm:p-4 leading-normal font-sans overflow-hidden">
            {/* Dark Cinematic Backdrop */}
            <div
                className="absolute inset-0 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-700"
                onClick={onClose}
            />

            {/* Desktop Center Wrapper */}
            <div className={cn(
                "w-full h-full sm:h-[85vh] max-w-6xl bg-[#050506] border-0 sm:border border-white/10 relative sm:rounded-[3rem] overflow-hidden flex flex-col sm:flex-row shadow-[0_0_120px_-20px_rgba(27,133,74,0.25)] transition-all duration-700 animate-slideUp",
                chat.isThinking && "ring-1 ring-emerald-500/30"
            )}>

                <AISidebar
                    isLocalMode={chat.isLocalMode}
                    isVoiceActive={chat.isVoiceActive}
                    onStartFlow={chat.startFlow}
                    onDashboardAI={chat.handleDashboardAI}
                    onToggleVoice={chat.toggleVoice}
                />

                <div className="flex-1 flex flex-col min-h-0 bg-transparent relative">
                    <AIHeader isLocalMode={chat.isLocalMode} onClose={onClose} />

                    {/* SCROLLABLE CHAT ZONE */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-10 py-10 space-y-12 scroll-smooth custom-scrollbar bg-gradient-to-b from-transparent to-black/40">
                        {chat.messages.map((m, i) => (
                            <AIMessageBubble
                                key={i}
                                message={m}
                                index={i}
                                onExecute={chat.executeAction}
                                onRemove={(idx) => chat.setMessages(prev => prev.filter((_, i) => i !== idx))}
                                isEditing={chat.editingMsgIndex === i}
                                onStartEdit={(idx) => chat.setEditingMsgIndex(idx)}
                                onSaveEdit={(idx, data) => {
                                    chat.updateMessageData(idx, data);
                                    chat.setEditingMsgIndex(null);
                                }}
                                onCancelEdit={() => chat.setEditingMsgIndex(null)}
                            />
                        ))}

                        {chat.isThinking && (
                            <div className="flex flex-col items-start w-full animate-in fade-in duration-300">
                                <div className="flex items-center gap-2 mb-3 px-2">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                        <Bot className="w-3.5 h-3.5 text-emerald-400" />
                                    </div>
                                    <span className="text-[9px] text-white/30 font-black uppercase tracking-widest animate-pulse">Processing...</span>
                                </div>
                                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] rounded-tl-none">
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500/40 animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-2 h-2 rounded-full bg-emerald-500/60 animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <AIInputSystem
                        input={chat.input}
                        setInput={chat.setInput}
                        suggestion={chat.suggestion}
                        isThinking={chat.isThinking}
                        isVoiceActive={chat.isVoiceActive}
                        isSpeaking={chat.isSpeaking}
                        isListening={chat.isListening}
                        hasError={chat.hasError}
                        currentFlow={chat.currentFlow}
                        onSend={chat.handleSend}
                        onToggleVoice={chat.toggleVoice}
                        onStartFlow={chat.startFlow}
                        onDashboardAI={chat.handleDashboardAI}
                        onKeyDown={chat.handleKeyDown}
                    />
                </div>
            </div>

            <AIVoiceOverlay
                isSpeaking={chat.isSpeaking}
                isListening={chat.isListening}
                onClose={() => chat.setIsVoiceActive(false)}
                onStartTalk={() => { chat.speak("I am ready. Tell me what to do."); chat.startListening(); }}
                onToggleVoice={chat.toggleVoice}
            />

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.1); border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16,185,129,0.3); }
                
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slideUp {
                    animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                @keyframes progress-glow {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                .animate-progress-glow {
                    animation: progress-glow 1.5s linear infinite;
                }

                @media (max-width: 640px) {
                    .animate-slideUp {
                        animation: slideUp 0.5s ease-out forwards;
                    }
                }
            `}</style>
        </div>
    )
}
