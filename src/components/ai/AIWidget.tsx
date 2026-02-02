"use client"

import React, { useState, useRef, useEffect } from 'react'
import { X, Send, Camera, Image as ImageIcon, Sparkles, BookOpen, ChevronDown } from 'lucide-react'
import { analyzeIntent, AIResponse } from '@/lib/ai/algorithm'
import { cn } from '@/lib/utils'

interface AIWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AIWidget({ isOpen, onClose }: AIWidgetProps) {
    const [input, setInput] = useState('')
    const [isThinking, setIsThinking] = useState(false)
    const [messages, setMessages] = useState<Array<{
        role: 'user' | 'ai',
        content: string,
        type?: 'system' | 'split',
        requiresConfirmation?: boolean,
        action?: string,
        data?: any
    }>>([
        { role: 'ai', content: 'How can I help you? Choose an option below or type your request.' }
    ])
    const [isFocused, setIsFocused] = useState(false)
    const [showTutorial, setShowTutorial] = useState(false)
    const [activeView, setActiveView] = useState<'chat' | 'split'>('chat')
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isThinking])

    // Tutorial check
    useEffect(() => {
        const tutorialDone = localStorage.getItem('ai_tutorial_v6')
        if (!tutorialDone && isOpen) {
            setShowTutorial(true)
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleSend = (textOverride?: string) => {
        const userMsg = textOverride || input.trim()
        if (!userMsg) return

        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setInput('')
        setIsThinking(true)

        // Process intent
        setTimeout(() => {
            const response = analyzeIntent(userMsg)

            if (response.intent === 'tutorial') {
                setShowTutorial(true)
                setMessages(prev => [...prev, { role: 'ai', content: "Starting walkthrough..." }])
            } else if (response.intent === 'sales' && response.action === 'scan_bill') {
                setActiveView('split')
                setMessages(prev => [...prev, { role: 'ai', content: "Scanner mode activated. Please point your camera at the bill." }])
            } else {
                setMessages(prev => [...prev, {
                    role: 'ai',
                    content: response.message,
                    requiresConfirmation: response.requiresConfirmation,
                    action: response.action,
                    data: response.data
                }])
            }

            setIsThinking(false)
        }, 1200)
    }

    const options = [
        { label: 'Dashboard', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: '📊', id: 'dashboard' },
        { label: 'Sales', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: '💰', id: 'sales' },
        { label: 'Purchase', color: 'text-rose-400', bg: 'bg-rose-500/10', icon: '🛒', id: 'purchase' },
        { label: 'Returns', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: '🔄', id: 'returns' },
        { label: 'Help', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: '❓', id: 'help' },
    ]

    const finishTutorial = () => {
        localStorage.setItem('ai_tutorial_v6', 'true')
        setShowTutorial(false)
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start pt-6 sm:pt-10 px-0 sm:px-4">
            {/* Background Blur */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500"
                onClick={onClose}
            />

            {/* Close Button */}
            <button
                onClick={onClose}
                className="fixed top-6 right-6 w-12 h-12 flex items-center justify-center glass-convex text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all z-[110]"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Main Container */}
            <div className={cn(
                "w-full max-w-2xl glass-ai-panel relative rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col transition-all duration-700 animate-slideDown shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]",
                isThinking ? "emerald-glow" : "border-white/20"
            )}>

                {/* Tutorial Overlay */}
                {showTutorial && (
                    <div className="absolute inset-0 z-50 bg-emerald-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 emerald-glow">
                            <BookOpen className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Welcome to StockFlow AI v6</h3>
                        <p className="text-emerald-100/70 mb-8 max-w-sm">
                            Experience the future of inventory management. Scan bills, add products by voice or text, and manage your store with intelligence.
                        </p>
                        <div className="space-y-3 w-full max-w-xs">
                            <button
                                onClick={() => { setInput("How do I add stock?"); setShowTutorial(false); }}
                                className="w-full py-3 bg-emerald-500 text-emerald-950 font-bold rounded-2xl hover:bg-emerald-400 transition-all"
                            >
                                Learn "Add Stock"
                            </button>
                            <button
                                onClick={finishTutorial}
                                className="w-full py-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all"
                            >
                                Skip Tutorial
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                            isThinking && "animate-pulse emerald-glow"
                        )}>
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                AI Assistant
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">V6 PREMIUM</span>
                            </h2>
                            <p className="text-xs text-white/40">Powered by StockFlow Intelligence</p>
                        </div>
                    </div>
                    {activeView === 'split' && (
                        <button
                            onClick={() => setActiveView('chat')}
                            className="text-xs text-white/60 hover:text-white flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"
                        >
                            Exit Split View
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col h-[70vh] sm:h-[60vh]">

                    {activeView === 'split' ? (
                        <div className="flex-1 flex flex-col">
                            {/* Top: Scanner / Image */}
                            <div className="h-1/2 bg-black/40 relative overflow-hidden flex items-center justify-center border-b border-white/10">
                                <div className="absolute inset-0 animate-pulse bg-emerald-500/5" />
                                <Camera className="w-12 h-12 text-white/20" />
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10">
                                    <span className="text-xs text-white/70">Align bill within frame</span>
                                    <div className="flex gap-2">
                                        <button className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><ImageIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                            {/* Bottom: Analysis Result */}
                            <div className="h-1/2 overflow-y-auto p-6 space-y-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Analysis Result</h4>
                                        <button className="text-[10px] text-white/40 hover:text-white transition-colors underline">Edit Data</button>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/10">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-white font-medium">Cotton Kurthi</span>
                                                <span className="text-[10px] text-white/40">Qty: 20 • SKU: CK-2026</span>
                                            </div>
                                            <span className="text-sm font-mono text-emerald-400">₹12,400</span>
                                        </div>
                                        <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                            <span className="text-xs text-white/60">Total Bill Amount</span>
                                            <span className="text-lg font-bold text-white">₹12,400</span>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex gap-2">
                                        <button
                                            onClick={() => {
                                                setActiveView('chat');
                                                setMessages(prev => [...prev, { role: 'ai', content: "Bill created successfully! Checking stock availability..." }]);
                                            }}
                                            className="flex-1 py-3 bg-emerald-500 text-emerald-950 font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            Confirm Bill
                                        </button>
                                        <button
                                            onClick={() => setActiveView('chat')}
                                            className="px-4 py-3 bg-white/5 text-white/60 rounded-xl hover:bg-white/10 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                            {messages.map((m, i) => (
                                <div key={i} className={cn(
                                    "flex flex-col animate-in slide-in-from-bottom-2 duration-300",
                                    m.role === 'user' ? "items-end" : "items-start"
                                )}>
                                    {m.role === 'ai' && (
                                        <span className="text-[10px] text-emerald-400 font-bold mb-1 ml-1 uppercase tracking-widest">Assistant</span>
                                    )}
                                    <div className={cn(
                                        "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed",
                                        m.role === 'user'
                                            ? "bg-emerald-500/20 text-white rounded-tr-none border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                                            : "bg-white/5 text-white/90 rounded-tl-none border border-white/10"
                                    )}>
                                        {m.content}

                                        {m.requiresConfirmation && (
                                            <div className="mt-4 flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setMessages(prev => [...prev, { role: 'ai', content: `Processing ${m.action?.replace(/_/g, ' ')} for ${m.data?.productName || 'items'}...` }]);
                                                        // Here you would trigger the actual store action
                                                        setTimeout(() => {
                                                            setMessages(prev => [...prev, { role: 'ai', content: "✅ Task completed successfully!" }]);
                                                        }, 1000);
                                                    }}
                                                    className="px-4 py-2 bg-emerald-500 text-emerald-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                                                >
                                                    Confirm & Execute
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setMessages(prev => [...prev, { role: 'ai', content: "Hello! I'm your EcBills AI assistant. How can I help you today?" }]);
                                                    }}
                                                    className="px-4 py-2 bg-white/10 text-white/60 rounded-xl text-xs hover:bg-white/20 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isThinking && (
                                <div className="flex flex-col items-start animate-in fade-in">
                                    <span className="text-[10px] text-emerald-400 font-bold mb-1 ml-1 uppercase tracking-widest">Assistant</span>
                                    <div className="bg-white/5 text-white/50 p-4 rounded-2xl rounded-tl-none border border-white/10 text-xs flex gap-1">
                                        <span className="animate-bounce">.</span>
                                        <span className="animate-bounce delay-100">.</span>
                                        <span className="animate-bounce delay-200">.</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 sm:p-6 bg-white/[0.02] border-t border-white/10">
                    {/* Quick Actions */}
                    {!activeView && (
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                            {options.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleSend(opt.label)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap border border-white/5 transition-all active:scale-95 text-xs font-medium",
                                        opt.bg, opt.color, "hover:border-white/20 hover:bg-white/10"
                                    )}
                                >
                                    <span>{opt.icon}</span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Bar */}
                    <div className={cn(
                        "relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 transition-all duration-500 group",
                        isFocused && "emerald-focus-glow bg-black/40 border-emerald-500/40"
                    )}>
                        <div className="flex gap-1 ml-1">
                            <button className="p-2.5 rounded-xl text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                                <Camera className="w-5 h-5" />
                            </button>
                            <button className="hidden sm:block p-2.5 rounded-xl text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                                <ImageIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="Describe what you want to do..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/30 text-sm sm:text-base py-2"
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />

                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isThinking}
                            className={cn(
                                "w-11 h-11 flex items-center justify-center rounded-xl transition-all active:scale-90",
                                input.trim()
                                    ? "bg-emerald-500 text-emerald-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                                    : "bg-white/5 text-white/20"
                            )}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-[10px] text-center text-white/20 mt-4 tracking-widest font-bold">
                        ENHANCED WITH QUANTUM AI CORE
                    </p>
                </div>
            </div>

            <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
        }
      `}</style>
        </div>
    )
}
