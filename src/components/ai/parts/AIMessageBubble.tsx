"use client"

import React from 'react'
import { Bot, User, Play, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AIMessage } from '@/types/ai'

interface AIMessageBubbleProps {
    message: AIMessage;
    index: number;
    onExecute: (index: number) => void;
    onRemove: (index: number) => void;
}

export function AIMessageBubble({ message, index, onExecute, onRemove }: AIMessageBubbleProps) {
    return (
        <div className={cn(
            "flex flex-col w-full animate-in slide-in-from-bottom-6 fade-in duration-700",
            message.role === 'user' ? "items-end" : "items-start"
        )}>
            {/* Identity Indicator */}
            <div className={cn(
                "flex items-center gap-2 mb-3 px-2",
                message.role === 'user' ? "flex-reverse text-right" : "text-left"
            )}>
                {message.role === 'ai' ? (
                    <>
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <Bot className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">AI Assistant</span>
                    </>
                ) : (
                    <>
                        <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">Authorized User</span>
                        <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-white/60" />
                        </div>
                    </>
                )}
            </div>

            {/* Bubble */}
            <div className={cn(
                "max-w-[92%] sm:max-w-[75%] p-5 sm:p-7 rounded-[2rem] text-sm sm:text-base leading-relaxed relative group transition-all duration-500 shadow-2xl",
                message.role === 'user'
                    ? "bg-white/[0.08] text-white border border-white/10 rounded-tr-none hover:bg-white/[0.12] hover:border-white/20"
                    : message.status === 'info'
                        ? "bg-emerald-500/5 text-emerald-50 border border-emerald-500/20 rounded-tl-none font-medium italic shadow-[0_0_50px_-20px_rgba(16,185,129,0.3)]"
                        : "bg-white/[0.02] text-white/90 border border-white/5 rounded-tl-none backdrop-blur-sm"
            )}>
                {message.content.split('\n').map((line, idx) => (
                    <p key={idx} className={idx > 0 ? "mt-2" : ""}>{line}</p>
                ))}

                {/* Action UI Enhancement */}
                {message.status === 'pending' && (
                    <div className="mt-8 p-6 sm:p-8 rounded-[2.5rem] bg-black/80 border border-emerald-500/20 animate-in zoom-in-95 duration-700 shadow-3xl">
                        <div className="flex items-center gap-5 mb-8">
                            <div className="w-14 h-14 rounded-full bg-emerald-500 text-emerald-950 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                                <Play className="w-7 h-7 fill-emerald-950" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500">Confirmation Required</h4>
                                <p className="text-[10px] text-white/40 uppercase font-black tracking-tighter mt-0.5">Ready for injection</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-white/[0.03] p-5 rounded-3xl border border-white/5">
                                <span className="text-[9px] text-white/20 font-black uppercase tracking-widest block mb-1">Target</span>
                                <p className="text-sm font-black text-white truncate italic">{message.data?.productName}</p>
                            </div>
                            <div className="bg-white/[0.03] p-5 rounded-3xl border border-white/5">
                                <span className="text-[9px] text-white/20 font-black uppercase tracking-widest block mb-1">Impact</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white/60">x{message.data?.qty}</span>
                                    <span className="text-xs font-black text-emerald-400">₹{message.data?.price}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => onExecute(index)}
                                className="flex-1 h-14 flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-emerald-500/20 group/exec"
                            >
                                Sync & Execute <ArrowRight className="w-5 h-5 group-hover/exec:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => onRemove(index)}
                                className="w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-white/30 rounded-[1.5rem] transition-all active:scale-95"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                )}

                {message.status === 'executing' && (
                    <div className="mt-5 flex items-center gap-4 bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 animate-pulse">
                        <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[60%] animate-progress-glow" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 whitespace-nowrap">Injecting Mesh...</span>
                    </div>
                )}
            </div>
        </div>
    )
}
