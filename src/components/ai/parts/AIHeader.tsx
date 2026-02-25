"use client"

import React from 'react'
import { X, Network, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIHeaderProps {
    isLocalMode: boolean;
    onClose: () => void;
}

export function AIHeader({ isLocalMode, onClose }: AIHeaderProps) {
    return (
        <div className="h-20 sm:h-24 px-6 sm:px-10 border-b border-white/5 flex items-center justify-between backdrop-blur-3xl bg-black/60 sticky top-0 z-30">
            <div className="flex items-center gap-4 sm:gap-6">
                <button
                    onClick={onClose}
                    className="sm:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center active:scale-95 transition-all text-white/40"
                >
                    <X className="w-5 h-5" />
                </button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-base sm:text-xl font-black text-white tracking-widest italic uppercase">Personal Assistant <span className="text-emerald-500">v8</span></h1>
                        <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[8px] sm:text-[10px] uppercase font-black px-1.5 py-0 rounded">Active</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 opacity-40">
                        <Network className="w-3 h-3 text-white" />
                        <span className="text-[9px] sm:text-[10px] text-white font-bold uppercase tracking-[0.2em]">{isLocalMode ? 'Mesh Local' : 'Global Cloud'}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-4 border-r border-white/10 pr-4 mr-2">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Protocol</span>
                        <span className="text-[10px] font-bold text-white uppercase italic">STORM-X</span>
                    </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 fill-emerald-500" />
                </div>
            </div>
        </div>
    )
}
