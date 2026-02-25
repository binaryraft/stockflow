"use client"

import React from 'react'
import { Cpu, Smartphone, Cloud, DollarSign, ShoppingCart, LayoutDashboard, ArrowUpRight, Activity, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AISidebarProps {
    isLocalMode: boolean;
    isVoiceActive: boolean;
    onStartFlow: (type: any) => void;
    onDashboardAI: () => void;
    onToggleVoice: () => void;
}

export function AISidebar({ isLocalMode, isVoiceActive, onStartFlow, onDashboardAI, onToggleVoice }: AISidebarProps) {
    return (
        <div className="hidden lg:flex w-80 border-r border-white/5 flex-col bg-black/40">
            <div className="p-8 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        <Cpu className="w-5 h-5 text-emerald-950" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] italic">Neural Engine</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Active v8.0</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10">
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">Data Flow</span>
                        <div className="text-[9px] border border-emerald-500/20 text-emerald-400 font-black uppercase tracking-tighter px-2 py-1 rounded">
                            {isLocalMode ? 'Local First' : 'Cloud Sync'}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl group hover:bg-white/5 transition-all cursor-default">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    {isLocalMode ? <Smartphone className="w-4 h-4 text-blue-400" /> : <Cloud className="w-4 h-4 text-blue-400" />}
                                </div>
                                <span className="text-[10px] font-black uppercase text-white/50 tracking-wider">Sync Type</span>
                            </div>
                            <p className="text-sm font-bold text-white tracking-tight">{isLocalMode ? 'P2P Offline Reliable' : 'API Global High-Speed'}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-[10px] text-white/30 font-black uppercase tracking-widest px-2">Common Actions</h4>
                    <div className="grid grid-cols-1 gap-2">
                        {[
                            { label: 'Sell Something', icon: <DollarSign className="w-4 h-4" />, action: () => onStartFlow('sale') },
                            { label: 'Buy Something', icon: <ShoppingCart className="w-4 h-4" />, action: () => onStartFlow('purchase') },
                            { label: 'Show Analytics', icon: <LayoutDashboard className="w-4 h-4" />, action: onDashboardAI },
                        ].map((btn, idx) => (
                            <button
                                key={idx}
                                onClick={btn.action}
                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-emerald-500 hover:text-emerald-950 transition-all group/btn"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover/btn:text-emerald-950">
                                        {btn.icon}
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-tighter">{btn.label}</span>
                                </div>
                                <ArrowUpRight className="w-4 h-4 opacity-20 group-hover/btn:opacity-100" />
                            </button>
                        ))}
                        <button
                            onClick={onToggleVoice}
                            className={cn(
                                "w-full flex items-center justify-between p-4 rounded-2xl border transition-all group/voice",
                                isVoiceActive ? "bg-emerald-500 border-emerald-500 text-emerald-950" : "bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/5"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isVoiceActive ? "bg-emerald-950/10" : "bg-white/5")}>
                                    <Activity className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-tighter">Voice Mode</span>
                            </div>
                            <div className={cn("w-2 h-2 rounded-full animate-pulse", isVoiceActive ? "bg-emerald-950" : "bg-white/20")} />
                        </button>
                    </div>
                </section>
            </div>

            <div className="p-8 border-t border-white/5 bg-black/20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Lock className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">E2E Secured</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
