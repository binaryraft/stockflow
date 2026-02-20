"use client"

import React, { useState, useRef, useEffect } from 'react'
import { X, Send, Camera, Image as ImageIcon, Sparkles, BookOpen, ChevronRight, Activity, ShoppingCart, DollarSign, RefreshCcw, LayoutDashboard, Search, Command, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { analyzeIntent } from '@/lib/ai/algorithm'
import { cn } from '@/lib/utils'
import { useInventoryStore } from '@/hooks/use-inventory-store'
import { toast } from '@/hooks/use-toast'

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
        data?: any,
        status?: 'pending' | 'success' | 'executing'
    }>>([
        { role: 'ai', content: 'Welcome to StockFlow Intelligence. How can I assist you with your inventory today?' }
    ])
    const [isFocused, setIsFocused] = useState(false)
    const [showTutorial, setShowTutorial] = useState(false)
    const [activeView, setActiveView] = useState<'chat' | 'split'>('chat')
    const scrollRef = useRef<HTMLDivElement>(null)

    const addBill = useInventoryStore((state) => state.addBill);
    const userProfile = useInventoryStore((state) => state.userProfile);
    const products = useInventoryStore((state) => state.products);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isThinking])

    // Tutorial check
    useEffect(() => {
        const tutorialDone = localStorage.getItem('ai_tutorial_v7')
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
                    data: response.data,
                    status: response.requiresConfirmation ? 'pending' : undefined
                }])
            }

            setIsThinking(false)
        }, 1200)
    }

    const executeAction = async (msgIndex: number) => {
        const msg = messages[msgIndex];
        if (!msg.data || !msg.action) return;

        // Update status to executing
        setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, status: 'executing' as const } : m));

        try {
            if (msg.action === 'add_to_bill') {
                const { qty, productName, price } = msg.data;

                // Find product
                const product = products.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));
                if (!product) throw new Error(`Product "${productName}" not found. Please add it to inventory first.`);

                const billData: any = {
                    type: 'sell',
                    date: new Date().toISOString().split('T')[0],
                    timestamp: Date.now(),
                    companyId: (userProfile as any).companyId || 'local',
                    items: [],
                    totalAmount: (price || 0) * qty
                };

                const itemData: any = {
                    productId: product.id,
                    productName: product.name,
                    quantity: qty,
                    costPrice: 0, // Should ideally be fetched
                    sellPrice: price || 0,
                };

                await addBill(billData, [itemData]);

                setMessages(prev => [
                    ...prev.map((m, i) => i === msgIndex ? { ...m, status: 'success' as const } : m),
                    { role: 'ai', content: `✅ Successfully added ${qty} x ${product.name} to a new sale bill.` }
                ]);

                toast({
                    title: "Action Executed",
                    description: `Added ${qty} ${product.name} to sales.`
                });
            }
        } catch (error: any) {
            setMessages(prev => [
                ...prev.map((m, i) => i === msgIndex ? { ...m, status: 'pending' as const } : m),
                { role: 'ai', content: `❌ Error: ${error.message}` }
            ]);
        }
    }

    const quickCommands = [
        { label: 'Sale', icon: <DollarSign className="w-4 h-4" />, id: 'sales', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { label: 'Purchase', icon: <ShoppingCart className="w-4 h-4" />, id: 'purchase', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, id: 'dashboard', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
        { label: 'Returns', icon: <RefreshCcw className="w-4 h-4" />, id: 'returns', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    ]

    const finishTutorial = () => {
        localStorage.setItem('ai_tutorial_v7', 'true')
        setShowTutorial(false)
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start pt-6 sm:pt-10 px-0 sm:px-4 leading-normal">
            {/* Background Blur */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in duration-500"
                onClick={onClose}
            />

            {/* Close Button */}
            <button
                onClick={onClose}
                className="fixed top-6 right-6 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all z-[110] backdrop-blur-md"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Main Container */}
            <div className={cn(
                "w-full max-w-2xl bg-[#0a0a0b] relative rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col transition-all duration-700 animate-slideDown shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] border border-white/10",
                isThinking && "border-emerald-500/30"
            )}>
                {/* Decorative Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />

                {/* Tutorial Overlay */}
                {showTutorial && (
                    <div className="absolute inset-0 z-50 bg-[#0a0a0b]/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-500">
                        <div className="relative mb-8">
                            <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <Sparkles className="w-12 h-12 text-emerald-400 animate-pulse" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-emerald-950 font-black text-xs shadow-lg shadow-emerald-500/50">V7</div>
                        </div>
                        <h3 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">Intelligence v7</h3>
                        <p className="text-white/60 mb-10 max-w-sm leading-relaxed">
                            Natural language execution is here. Simply tell me what happens in your store, and I'll update everything in real-time.
                        </p>
                        <div className="space-y-4 w-full max-w-xs">
                            <button
                                onClick={() => { setInput("Add 10 apples to sales at 50 rs"); setShowTutorial(false); }}
                                className="group w-full py-4 bg-emerald-500 text-emerald-950 font-black rounded-2xl hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                Try Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={finishTutorial}
                                className="w-full py-4 bg-white/5 text-white/50 rounded-2xl hover:bg-white/10 transition-all font-bold"
                            >
                                Enter Assistant
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner",
                            isThinking && "animate-pulse"
                        )}>
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-white tracking-tight uppercase italic">StockFlow AI</h2>
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse delay-100" />
                                    <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse delay-200" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-500/70">Neural Engine Active</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-[10px] text-white/20 font-black tracking-widest uppercase">Memory</span>
                            <span className="text-xs text-white/60 font-mono tracking-tighter">0.8s Latency</span>
                        </div>
                        <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white cursor-pointer transition-colors">
                            <Command className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col h-[75vh] sm:h-[65vh]">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scrollbar-hide">
                        {messages.map((m, i) => (
                            <div key={i} className={cn(
                                "flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-500",
                                m.role === 'user' ? "items-end" : "items-start"
                            )}>
                                {m.role === 'ai' && (
                                    <div className="flex items-center gap-2 mb-2 ml-1">
                                        <div className="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <Sparkles className="w-3 h-3 text-emerald-400" />
                                        </div>
                                        <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Assistant</span>
                                    </div>
                                )}

                                <div className={cn(
                                    "max-w-[85%] p-5 rounded-[1.5rem] text-sm sm:text-base leading-relaxed group relative",
                                    m.role === 'user'
                                        ? "bg-white/5 text-white font-medium border border-white/10 rounded-tr-none shadow-2xl"
                                        : "bg-white/[0.03] text-white/90 rounded-tl-none border border-white/5"
                                )}>
                                    {m.role === 'user' && (
                                        <div className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                                <Search className="w-4 h-4" />
                                            </div>
                                        </div>
                                    )}

                                    {m.content}

                                    {/* Action UI */}
                                    {m.requiresConfirmation && m.status !== 'success' && (
                                        <div className="mt-6 p-4 rounded-3xl bg-black/40 border border-white/10 animate-in zoom-in-95 duration-500 overflow-hidden relative">
                                            <div className="absolute top-0 right-0 p-3">
                                                <Activity className="w-4 h-4 text-emerald-400/20" />
                                            </div>

                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-emerald-950 flex items-center justify-center">
                                                    <ShoppingCart className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-white/80">Pending Action</h4>
                                                    <p className="text-[10px] text-white/40 uppercase font-medium">Verify data before execution</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2 mb-6">
                                                <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/5 border border-white/5 group/row hover:bg-white/10 transition-all">
                                                    <span className="text-xs text-white/40 font-medium">Product</span>
                                                    <span className="text-sm text-white font-bold group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{m.data?.productName}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/5 border border-white/5">
                                                        <span className="text-[10px] text-white/40 font-medium uppercase">Qty</span>
                                                        <span className="text-sm text-white font-black">{m.data?.qty}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/5 border border-white/5">
                                                        <span className="text-[10px] text-white/40 font-medium uppercase">Rate</span>
                                                        <span className="text-sm text-white font-black">₹{m.data?.price || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    disabled={m.status === 'executing'}
                                                    onClick={() => executeAction(i)}
                                                    className={cn(
                                                        "flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg",
                                                        m.status === 'executing'
                                                            ? "bg-white/10 text-white/30 cursor-not-allowed"
                                                            : "bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-emerald-500/20"
                                                    )}
                                                >
                                                    {m.status === 'executing' ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-emerald-950/30 border-t-emerald-950 rounded-full animate-spin" />
                                                            Executing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="w-5 h-5" />
                                                            Confirm Sale
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setMessages(prev => prev.filter((_, idx) => idx !== i));
                                                    }}
                                                    className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 text-white/40 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                                                >
                                                    <X className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isThinking && (
                            <div className="flex flex-col items-start animate-in fade-in">
                                <span className="text-[10px] text-emerald-400 font-bold mb-3 ml-1 uppercase tracking-[0.3em]">Processing</span>
                                <div className="bg-white/5 px-6 py-4 rounded-3xl rounded-tl-none border border-white/10 flex gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce delay-150" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce delay-300" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Input Area */}
                <div className="px-8 pb-8 pt-4 bg-white/[0.01] border-t border-white/5">
                    {/* Guidance / Quick Commands */}
                    <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar">
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-2 rounded-xl border border-emerald-500/20 mr-2 shrink-0">
                            <Command className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Global Ops</span>
                        </div>
                        {quickCommands.map(cmd => (
                            <button
                                key={cmd.id}
                                onClick={() => handleSend(cmd.label)}
                                className={cn(
                                    "flex items-center gap-2.5 px-5 py-2.5 rounded-2xl whitespace-nowrap border transition-all active:scale-95 text-xs font-bold uppercase tracking-tight",
                                    cmd.color, "hover:brightness-125"
                                )}
                            >
                                {cmd.icon}
                                {cmd.label}
                            </button>
                        ))}
                        <div className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-white/20 text-xs flex items-center gap-2 italic">
                            <Sparkles className="w-3 h-3" />
                            Try "Add 10 jackets at 1500"
                        </div>
                    </div>

                    {/* Enhanced Input Bar */}
                    <div className={cn(
                        "relative flex items-center gap-3 bg-white/5 border border-white/10 rounded-[2rem] p-3 transition-all duration-700 group",
                        isFocused && "ring-0 bg-[#121214] border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.1)]"
                    )}>
                        <div className="flex gap-1 ml-2">
                            <button className="w-10 h-10 flex items-center justify-center rounded-2xl text-white/30 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all">
                                <Camera className="w-5 h-5" />
                            </button>
                        </div>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="Type a command (ex: 'Sell 5 Red Shirts')"
                            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/20 text-base sm:text-lg py-1 font-medium italic tracking-tight"
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />

                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isThinking}
                            className={cn(
                                "w-12 h-12 flex items-center justify-center rounded-[1.25rem] transition-all active:scale-90 shadow-2xl overflow-hidden group/send relative",
                                input.trim()
                                    ? "bg-emerald-500 scale-110"
                                    : "bg-white/5 grayscale"
                            )}
                        >
                            {input.trim() && (
                                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600 to-emerald-400 group-hover/send:scale-110 transition-transform" />
                            )}
                            <Send className={cn(
                                "w-6 h-6 relative z-10 transition-all",
                                input.trim() ? "text-emerald-950 scale-110 rotate-[15deg] group-hover/send:rotate-0" : "text-white/20"
                            )} />
                        </button>
                    </div>

                    <div className="mt-6 flex items-center justify-between px-2 opacity-30 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Voice Mode Ready</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Secure RSA-4096</span>
                            </div>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Powered by EcBills v7</span>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                .glass-ai-panel {
                    background: linear-gradient(145deg, rgba(10,10,11,0.9), rgba(15,15,18,0.9));
                    box-shadow: 
                        0 20px 40px -10px rgba(0,0,0,0.5),
                        inset 0 1px 1px 0 rgba(255,255,255,0.05);
                }

                @keyframes slideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slideDown {
                    animation: slideDown 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
                }
            `}</style>
        </div>
    )
}
