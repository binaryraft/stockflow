"use client"

import React from 'react'
import { X, Bot, Activity, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIVoiceOverlayProps {
    isSpeaking: boolean;
    isListening: boolean;
    onClose: () => void;
    onStartTalk: () => void;
    onToggleVoice: () => void;
}

export function AIVoiceOverlay({ isSpeaking, isListening, onClose, onStartTalk, onToggleVoice }: AIVoiceOverlayProps) {
    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="absolute top-10 right-10">
                <button
                    onClick={onClose}
                    className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all group"
                >
                    <X className="w-8 h-8 text-white/40 group-hover:text-white" />
                </button>
            </div>

            <div className="flex flex-col items-center gap-12 text-center max-w-2xl px-10">
                <div className="relative">
                    {/* Pulse Rings */}
                    <div className={cn(
                        "absolute inset-0 rounded-full border-2 border-emerald-500/20 transition-all duration-1000",
                        isSpeaking || isListening ? "scale-[3] opacity-0" : "scale-100 opacity-0"
                    )} />
                    <div className={cn(
                        "absolute inset-0 rounded-full border-2 border-emerald-500/10 transition-all duration-1000 delay-300",
                        isSpeaking || isListening ? "scale-[2.5] opacity-0" : "scale-100 opacity-0"
                    )} />

                    <div className={cn(
                        "w-48 h-48 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_100px_rgba(16,185,129,0.3)] transition-all duration-500",
                        isSpeaking ? "scale-110 shadow-[0_0_150px_rgba(16,185,129,0.5)]" : "scale-100"
                    )}>
                        {isSpeaking ? (
                            <Bot className="w-24 h-24 text-emerald-950 animate-bounce" />
                        ) : isListening ? (
                            <Activity className="w-24 h-24 text-emerald-950" />
                        ) : (
                            <MessageSquare className="w-24 h-24 text-emerald-950" />
                        )}
                    </div>
                </div>

                <div>
                    <h2 className="text-4xl font-black text-white italic tracking-widest uppercase mb-4">
                        {isSpeaking ? "AI is Talking" : isListening ? "I'm Listening" : "Voice Control"}
                    </h2>
                    <p className="text-emerald-500 font-bold tracking-[0.3em] uppercase text-sm animate-pulse">
                        {isSpeaking ? "Generating Audio..." : isListening ? "Waiting for you..." : "Say something"}
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onStartTalk}
                        className="h-16 px-10 rounded-3xl bg-emerald-600 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                        Tap to Talk
                    </button>
                    <button
                        onClick={onToggleVoice}
                        className="h-16 px-10 rounded-3xl bg-white/5 text-white/60 font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-all"
                    >
                        Close Voice
                    </button>
                </div>
            </div>

            {/* Simple Waveform */}
            <div className="absolute bottom-20 flex items-end gap-1.5 h-32">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="w-1.5 bg-emerald-500/40 rounded-full transition-all duration-100"
                        style={{
                            height: (isSpeaking || isListening) ? `${Math.random() * 100}%` : '5px',
                            transitionDelay: `${i * 50}ms`
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
