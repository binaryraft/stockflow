"use client"

import React, { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { AIWidget } from './AIWidget'
import { cn } from '@/lib/utils'

export function AITrigger() {
    const [isOpen, setIsOpen] = useState(false)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Small delay to show entry animation
        const timer = setTimeout(() => setIsVisible(true), 1000)
        return () => clearTimeout(timer)
    }, [])

    return (
        <>
            <button
                id="v6-ai-trigger"
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500 text-emerald-950 shadow-2xl shadow-emerald-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[90] emerald-glow group overflow-hidden",
                    !isVisible && "translate-y-20 opacity-0",
                    isOpen && "scale-0 opacity-0 rotate-90"
                )}
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600 to-emerald-400 group-hover:scale-110 transition-transform duration-500" />
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 relative z-10 group-hover:rotate-12 transition-transform" />

                {/* Subtle Ring */}
                <div className="absolute inset-0 border-2 border-white/20 rounded-2xl z-20" />
            </button>

            <AIWidget isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    )
}
