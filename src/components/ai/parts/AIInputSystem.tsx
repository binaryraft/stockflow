"use client"

import React, { useState } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, Bot, Send, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIInputSystemProps {
    input: string;
    setInput: (val: string) => void;
    suggestion: string;
    isThinking: boolean;
    isVoiceActive: boolean;
    isSpeaking: boolean;
    isListening: boolean;
    hasError: boolean;
    currentFlow: string;
    onSend: () => void;
    onToggleVoice: () => void;
    onStartFlow: (type: any) => void;
    onDashboardAI: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}

export function AIInputSystem({
    input, setInput, suggestion, isThinking, isVoiceActive, isSpeaking, isListening,
    hasError, currentFlow, onSend, onToggleVoice, onStartFlow, onDashboardAI, onKeyDown
}: AIInputSystemProps) {
    const [isFocused, setIsFocused] = useState(false)

    return (
        <div className="px-5 sm:px-10 pb-8 sm:pb-12 pt-6 bg-black/80 backdrop-blur-2xl border-t border-white/5 z-40">
            {/* Mobile Action Bar */}
            <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar lg:hidden">
                <button
                    onClick={() => onStartFlow('sale')}
                    className="h-12 px-6 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shrink-0 active:scale-95 transition-all"
                >
                    <DollarSign className="w-4 h-4" /> Sale
                </button>
                <button
                    onClick={() => onStartFlow('purchase')}
                    className="h-12 px-6 rounded-2xl bg-white/[0.05] border border-white/10 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shrink-0 active:scale-95 transition-all"
                >
                    <ShoppingCart className="w-4 h-4" /> Stock In
                </button>
                <button
                    onClick={onDashboardAI}
                    className="h-12 px-6 rounded-2xl bg-white/[0.05] border border-white/10 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shrink-0 active:scale-95 transition-all"
                >
                    <TrendingUp className="w-4 h-4" /> Analytics
                </button>
            </div>

            {/* Quantum Input Bar */}
            <div className={cn(
                "relative flex items-center gap-3 bg-white/[0.04] border rounded-[2.5rem] p-3 transition-all duration-700 group",
                isFocused ? "bg-white/[0.07] border-emerald-500/40 shadow-[0_0_80px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20" : "border-white/10",
                hasError && "border-red-500/50 ring-1 ring-red-500/20 shadow-[0_0_80px_rgba(239,68,68,0.1)]"
            )}>
                <div className="hidden sm:flex items-center ml-3 border-r border-white/10 pr-4">
                    <Bot className={cn("w-6 h-6 transition-all duration-700", isFocused ? "text-emerald-400 rotate-12" : "text-white/20")} />
                </div>

                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={currentFlow === 'none' ? "How can I help you today?" : "..."}
                        className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-white/10 text-base sm:text-lg font-medium py-2"
                        onKeyDown={onKeyDown}
                    />
                    {suggestion && isFocused && (
                        <div className="absolute left-0 top-0 h-full flex items-center pointer-events-none text-base sm:text-lg opacity-30 italic font-medium py-2 ml-[var(--input-offset,0px)]">
                            <span className="text-transparent">{input}</span>
                            <span>{suggestion} <span className="text-[10px] bg-white/10 px-1 rounded ml-2 uppercase tracking-tighter not-italic font-black">Tab</span></span>
                        </div>
                    )}
                </div>

                <button
                    onClick={onToggleVoice}
                    className={cn(
                        "hidden sm:flex w-12 h-12 items-center justify-center rounded-[1.5rem] transition-all relative group/voice active:scale-95",
                        isVoiceActive ? "bg-emerald-500 text-emerald-950" : "bg-white/5 text-white/40 hover:bg-white/10"
                    )}
                >
                    <Activity className={cn("w-4 h-4", isListening && "animate-pulse")} />
                </button>

                <button
                    onClick={onSend}
                    disabled={!input.trim() || isThinking}
                    className={cn(
                        "w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-[1.5rem] transition-all relative group/send shadow-2xl shrink-0 overflow-hidden",
                        input.trim() ? "bg-emerald-500 scale-105" : "bg-white/5 opacity-20"
                    )}
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600 to-emerald-400 opacity-0 group-hover/send:opacity-100 transition-opacity" />
                    <Send className={cn(
                        "w-5 h-5 sm:w-6 sm:h-6 relative z-10 transition-all duration-500",
                        input.trim() ? "text-emerald-950 scale-110 -rotate-[20deg] group-hover/send:rotate-0" : "text-white/60"
                    )} />
                </button>
            </div>

            {/* System Status Line */}
            <div className="mt-6 flex items-center justify-between px-4 text-[9px] uppercase font-black tracking-[0.4em] opacity-20">
                <span className="flex items-center gap-2">
                    <span className={cn("w-1.5 h-1.5 rounded-full bg-emerald-500", isVoiceActive && "animate-pulse")} />
                    {isVoiceActive ? (isSpeaking ? 'AI is Speaking' : (isListening ? 'Listening...' : 'Voice Active')) : 'Secure Connection Active'}
                </span>
                <span className="text-white hidden sm:block">StockFlow Assistant v8.0</span>
            </div>
        </div>
    )
}
