"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
    X, Send, Camera, Image as ImageIcon, Sparkles, BookOpen, Activity,
    ShoppingCart, DollarSign, RefreshCcw, LayoutDashboard, Search,
    Command, ArrowRight, CheckCircle2, AlertCircle, ChevronRight,
    TrendingUp, Package, Users, Store, ArrowUpRight, ArrowDownRight,
    MessageSquare, Cpu, Layers, Zap, Info, Play
} from 'lucide-react'
import { analyzeIntent } from '@/lib/ai/algorithm'
import { cn } from '@/lib/utils'
import { useInventoryStore } from '@/hooks/use-inventory-store'
import { toast } from '@/hooks/use-toast'

interface AIWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

type FlowType = 'none' | 'sale' | 'purchase' | 'return' | 'product_add' | 'dashboard';
type StepType = 'idle' | 'asking_product' | 'asking_quantity' | 'asking_variant' | 'asking_price' | 'confirming';

export function AIWidget({ isOpen, onClose }: AIWidgetProps) {
    // Basic State
    const [input, setInput] = useState('')
    const [isThinking, setIsThinking] = useState(false)
    const [messages, setMessages] = useState<Array<{
        role: 'user' | 'ai',
        content: string,
        data?: any,
        status?: 'pending' | 'success' | 'executing' | 'info'
    }>>([
        { role: 'ai', content: 'Neural Engine initialized. Ready for command execution.' }
    ])

    // UI State
    const [isFocused, setIsFocused] = useState(false)
    const [activeSidebarTab, setActiveSidebarTab] = useState<'ops' | 'stats' | 'help'>('ops')

    // Logic Flow State
    const [currentFlow, setCurrentFlow] = useState<FlowType>('none')
    const [flowStep, setFlowStep] = useState<StepType>('idle')
    const [flowData, setFlowData] = useState<any>({})

    const scrollRef = useRef<HTMLDivElement>(null)

    // Store Hooks
    const {
        products,
        bills,
        dashboardAnalytics,
        userProfile,
        addBill,
        fetchDashboardAnalytics
    } = useInventoryStore()

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isThinking])

    // Load Analytics if missing
    useEffect(() => {
        if (isOpen && !dashboardAnalytics && (userProfile as any)?.companyId) {
            fetchDashboardAnalytics((userProfile as any).companyId, 'daily')
        }
    }, [isOpen])

    if (!isOpen) return null

    // --- Conversational Intelligence ---

    const handleSend = (textOverride?: string) => {
        const userMsg = textOverride || input.trim()
        if (!userMsg) return

        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setInput('')
        setIsThinking(true)

        // Process thinking
        setTimeout(() => {
            processIntelligence(userMsg)
            setIsThinking(false)
        }, 800)
    }

    const processIntelligence = (msg: string) => {
        const p = msg.toLowerCase();

        // Check for specific Quick Command initiations
        if (p === 'sale' || p === 'sell' || p === 'billing') {
            startFlow('sale');
            return;
        }
        if (p === 'purchase' || p === 'buy' || p === 'restock') {
            startFlow('purchase');
            return;
        }
        if (p === 'dashboard' || p === 'analytics') {
            handleDashboardAI();
            return;
        }

        // Handle active flows
        if (currentFlow !== 'none') {
            handleFlowInput(msg);
            return;
        }

        // Fallback to standard algorithm
        const response = analyzeIntent(msg)
        setMessages(prev => [...prev, {
            role: 'ai',
            content: response.message,
            data: response.data,
            status: response.requiresConfirmation ? 'pending' : undefined
        }])
    }

    const startFlow = (type: FlowType) => {
        setCurrentFlow(type);
        setFlowStep('asking_product');
        setFlowData({});

        const prompt = type === 'sale'
            ? "Sure, let's start a sale. Which product are we selling?"
            : "Starting a purchase entry. Which product did we buy?";

        setMessages(prev => [...prev, { role: 'ai', content: prompt }]);
    }

    const handleFlowInput = (msg: string) => {
        switch (flowStep) {
            case 'asking_product':
                const foundProduct = products.find(p => p.name.toLowerCase().includes(msg.toLowerCase()));
                if (foundProduct) {
                    setFlowData({ ...flowData, product: foundProduct, productName: foundProduct.name });

                    if (foundProduct.variants && foundProduct.variants.length > 0) {
                        setFlowStep('asking_variant');
                        setMessages(prev => [...prev, {
                            role: 'ai',
                            content: `Great choice: ${foundProduct.name}. Which variant? (${foundProduct.variants.map(v => v.name).join(', ')})`
                        }]);
                    } else {
                        setFlowStep('asking_quantity');
                        setMessages(prev => [...prev, { role: 'ai', content: `How many ${foundProduct.name}?` }]);
                    }
                } else {
                    setMessages(prev => [...prev, { role: 'ai', content: `I couldn't find "${msg}" in your inventory. Please check the name or say "cancel".` }]);
                }
                break;

            case 'asking_variant':
                // For simplicity, just store the variant name in this version
                setFlowData({ ...flowData, variant: msg });
                setFlowStep('asking_quantity');
                setMessages(prev => [...prev, { role: 'ai', content: `Understood, ${msg} variant. What is the quantity?` }]);
                break;

            case 'asking_quantity':
                const qty = parseInt(msg);
                if (!isNaN(qty)) {
                    setFlowData({ ...flowData, qty });
                    setFlowStep('asking_price');
                    const pricePrompt = currentFlow === 'sale' ? "At what price per unit?" : "What was the cost price per unit?";
                    setMessages(prev => [...prev, { role: 'ai', content: pricePrompt }]);
                } else {
                    setMessages(prev => [...prev, { role: 'ai', content: "Please provide a valid number for quantity." }]);
                }
                break;

            case 'asking_price':
                const price = parseFloat(msg.replace(/[^0-9.]/g, ''));
                if (!isNaN(price)) {
                    const finalData = { ...flowData, price };
                    setFlowData(finalData);
                    setFlowStep('confirming');
                    setMessages(prev => [...prev, {
                        role: 'ai',
                        content: `Excellent. I have prepared a ${currentFlow} for ${finalData.qty} x ${finalData.productName}${finalData.variant ? ` (${finalData.variant})` : ''} at ₹${price}.`,
                        data: { qty: finalData.qty, productName: finalData.productName, price: finalData.price, action: currentFlow === 'sale' ? 'add_to_bill' : 'purchase' },
                        status: 'pending'
                    }]);
                } else {
                    setMessages(prev => [...prev, { role: 'ai', content: "Please provide a valid numeric price." }]);
                }
                break;
        }
    }

    const handleDashboardAI = () => {
        const stats = dashboardAnalytics?.summary;
        if (!stats) {
            setMessages(prev => [...prev, { role: 'ai', content: "Dashboard data is currently syncing. One moment..." }]);
            return;
        }

        const report = `Neural Overview for Today:\n\n` +
            `💰 Revenue: ₹${stats.totalRevenue.toLocaleString()}\n` +
            `📈 Gross Profit: ₹${stats.grossProfit.toLocaleString()}\n` +
            `🛒 Transactions: ${stats.transactionsToday}\n` +
            `📉 Expenses: ₹${stats.totalExpenses.toLocaleString()}\n\n` +
            `Your profit margin is currently ${((stats.grossProfit / (stats.totalRevenue || 1)) * 100).toFixed(1)}%.`;

        setMessages(prev => [...prev, { role: 'ai', content: report, status: 'info' }]);
    }

    const executeAction = async (msgIndex: number) => {
        const msg = messages[msgIndex];
        if (!msg.data) return;

        setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, status: 'executing' as const } : m));

        try {
            const { qty, productName, price, action } = msg.data;
            const product = products.find(p => p.name === productName);

            if (!product) throw new Error("Product verification failed.");

            const billData: any = {
                type: action === 'add_to_bill' ? 'sell' : 'buy',
                date: new Date().toISOString().split('T')[0],
                timestamp: Date.now(),
                companyId: (userProfile as any).companyId || 'local',
                items: [],
                totalAmount: price * qty
            };

            const itemData: any = {
                productId: product.id,
                productName: product.name,
                quantity: qty,
                costPrice: action === 'purchase' ? price : 0,
                sellPrice: action === 'add_to_bill' ? price : 0,
            };

            await addBill(billData, [itemData]);

            setMessages(prev => [
                ...prev.map((m, i) => i === msgIndex ? { ...m, status: 'success' as const } : m),
                { role: 'ai', content: `✅ Atomic operation complete. ${qty} units processed for ${productName}.` }
            ]);

            // Success reset
            setCurrentFlow('none');
            setFlowStep('idle');

        } catch (error: any) {
            setMessages(prev => [
                ...prev.map((m, i) => i === msgIndex ? { ...m, status: 'pending' as const } : m),
                { role: 'ai', content: `🛑 Transaction Blocked: ${error.message}` }
            ]);
        }
    }

    // --- Computed Components ---

    const QuickStats = () => {
        const stats = dashboardAnalytics?.summary;
        if (!stats) return <div className="text-white/20 text-xs animate-pulse p-4">Neural data pending...</div>;

        return (
            <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Revenue Today</p>
                        <p className="text-lg font-black text-white">₹{stats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl">
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Orders</p>
                        <p className="text-lg font-black text-white">{stats.transactionsToday}</p>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">System Health</span>
                        <span className="text-[10px] text-emerald-500 font-bold">OPTIMAL</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[92%] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start pt-4 sm:pt-6 px-0 sm:px-4 leading-normal font-sans">
            {/* Ultra Dark Background */}
            <div
                className="absolute inset-0 bg-[#000000]/80 backdrop-blur-3xl animate-in fade-in duration-500"
                onClick={onClose}
            />

            {/* Close Button */}
            <button
                onClick={onClose}
                className="fixed top-6 right-6 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:scale-110 active:scale-95 transition-all z-[110] backdrop-blur-md"
            >
                <X className="w-6 h-6" />
            </button>

            {/* COMMAND CENTER CONTAINER */}
            <div className={cn(
                "w-full max-w-5xl bg-[#080809] border border-white/10 relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col sm:flex-row shadow-[0_0_100px_-20px_rgba(16,185,129,0.15)] transition-all duration-700 animate-slideDown",
                isThinking && "ring-1 ring-emerald-500/20"
            )}>

                {/* 1. LEFT SIDEBAR/DASHBOARD (Desktop Only, Tabs on Mobile) */}
                <div className="hidden sm:flex w-72 border-r border-white/5 flex-col bg-white/[0.01]">
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <Cpu className="w-4 h-4 text-emerald-950" />
                            </div>
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Neural Core</h3>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6 space-y-8">
                            {/* Operational Stats */}
                            <section>
                                <h4 className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-4">Real-time Metrics</h4>
                                <QuickStats />
                            </section>

                            {/* Quick Executables */}
                            <section>
                                <h4 className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-4">Command Presets</h4>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Sale Entry', icon: <DollarSign className="w-4 h-4" />, action: () => startFlow('sale') },
                                        { label: 'Purchase Order', icon: <ShoppingCart className="w-4 h-4" />, action: () => startFlow('purchase') },
                                        { label: 'View Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, action: handleDashboardAI },
                                        { label: 'Stock Audit', icon: <Package className="w-4 h-4" />, action: () => handleSend('Show me low stock items') }
                                    ].map((btn, idx) => (
                                        <button
                                            key={idx}
                                            onClick={btn.action}
                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:text-emerald-400">
                                                    {btn.icon}
                                                </div>
                                                <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors uppercase tracking-tight">{btn.label}</span>
                                            </div>
                                            <ArrowUpRight className="w-3 h-3 text-white/20 group-hover:text-emerald-500" />
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="p-6 bg-black/20 border-t border-white/5">
                        <div className="flex items-center gap-2 opacity-30">
                            <Layers className="w-3 h-3 text-emerald-500" />
                            <span className="text-[9px] font-black tracking-widest text-white">SYSTEM UPTIME: 99.9%</span>
                        </div>
                    </div>
                </div>

                {/* 2. MAIN CONVERSATION ENGINE (Scrollable) */}
                <div className="flex-1 flex flex-col min-h-0 bg-transparent">
                    {/* Header */}
                    <div className="px-6 sm:px-8 py-6 border-b border-white/5 flex items-center justify-between backdrop-blur-md bg-white/[0.01] sticky top-0 z-20">
                        <div className="flex items-center gap-4">
                            <div className="sm:hidden w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <MessageSquare className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-white tracking-tight italic uppercase">EcBills Artificial Intelligence</h1>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />)}
                                    </div>
                                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Processing Layer 7</span>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Stats Indicator */}
                        <div className="sm:hidden flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Conversation */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 sm:px-8 py-8 space-y-10 scroll-smooth custom-scrollbar">
                        {messages.map((m, i) => (
                            <div key={i} className={cn(
                                "flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-500",
                                m.role === 'user' ? "items-end" : "items-start"
                            )}>
                                {m.role === 'ai' && (
                                    <div className="flex items-center gap-2 mb-2 ml-1">
                                        <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-500/20" />
                                        <span className="text-[10px] text-emerald-500/60 font-black uppercase tracking-[0.2em]">Neural Output</span>
                                    </div>
                                )}

                                <div className={cn(
                                    "max-w-[90%] sm:max-w-[80%] p-5 sm:p-6 rounded-[1.75rem] text-sm sm:text-base leading-relaxed group shadow-2xl transition-all",
                                    m.role === 'user'
                                        ? "bg-white/[0.08] text-white font-medium border border-white/20 rounded-tr-none"
                                        : m.status === 'info'
                                            ? "bg-emerald-500/5 text-white/90 border border-emerald-500/20 rounded-tl-none font-mono"
                                            : "bg-white/[0.02] text-white/90 border border-white/5 rounded-tl-none"
                                )}>
                                    {m.content.split('\n').map((line, idx) => (
                                        <p key={idx} className={idx > 0 ? "mt-1" : ""}>{line}</p>
                                    ))}

                                    {/* Verification & Action UI */}
                                    {m.status === 'pending' && (
                                        <div className="mt-8 p-6 rounded-[2rem] bg-black/60 border border-white/10 animate-in zoom-in-95 duration-500">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-emerald-950 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                    <Play className="w-6 h-6 fill-emerald-950" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-white/80">Operation Verification</h4>
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="w-3 h-3 text-emerald-500" />
                                                        <p className="text-[10px] text-white/40 uppercase font-medium">Validation Success</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                                    <span className="text-[10px] text-white/20 font-black uppercase tracking-tighter">Identity</span>
                                                    <p className="text-sm font-black text-white truncate">{m.data?.productName}</p>
                                                </div>
                                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                                                    <span className="text-[10px] text-white/20 font-black uppercase tracking-tighter">Payload</span>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-bold text-white">x{m.data?.qty}</span>
                                                        <span className="text-sm font-black text-emerald-400">₹{m.data?.price}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => executeAction(i)}
                                                    className="flex-1 h-14 rounded-2xl bg-emerald-500 text-emerald-950 font-black text-xs uppercase tracking-widest hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/10"
                                                >
                                                    Execute Transaction <ArrowRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setMessages(p => p.filter((_, idx) => idx !== i))}
                                                    className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all active:scale-95"
                                                >
                                                    <X className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {m.status === 'executing' && (
                                        <div className="mt-4 flex items-center gap-4 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                                            <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Transacting on mainnet...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Advanced Input System */}
                    <div className="px-6 sm:px-8 pb-8 pt-4 bg-white/[0.01] border-t border-white/5 z-20">
                        {/* Intelligent Guidance */}
                        <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar">
                            <div className="sm:hidden flex items-center gap-2 pr-2 border-r border-white/10 mr-2 shrink-0">
                                <button
                                    onClick={() => startFlow('sale')}
                                    className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                    <DollarSign className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => startFlow('purchase')}
                                    className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                    <ShoppingCart className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 text-white/30 italic text-xs shrink-0">
                                <Info className="w-3.5 h-3.5" />
                                <span>Try "I sold 15 Red T-Shirts"</span>
                            </div>

                            <button
                                onClick={() => startFlow('sale')}
                                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                            >
                                <DollarSign className="w-3.5 h-3.5" /> Start Sale
                            </button>

                            <button
                                onClick={() => startFlow('purchase')}
                                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                            >
                                <ShoppingCart className="w-3.5 h-3.5" /> Buy Entry
                            </button>
                        </div>

                        {/* Quantum Input Bar */}
                        <div className={cn(
                            "relative flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-[2rem] p-3 transition-all duration-700",
                            isFocused && "bg-black border-emerald-500/50 shadow-[0_0_60px_rgba(16,185,129,0.1)]"
                        )}>
                            <div className="flex items-center ml-2 border-r border-white/10 pr-3">
                                <Cpu className={cn("w-5 h-5 transition-colors", isFocused ? "text-emerald-500" : "text-white/20")} />
                            </div>

                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder={currentFlow === 'none' ? "Tell AI your store activity..." : "Answer the question above..."}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/10 text-base sm:text-lg py-1 font-medium italic"
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />

                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isThinking}
                                className={cn(
                                    "w-12 h-12 flex items-center justify-center rounded-[1.25rem] transition-all overflow-hidden relative group/send shadow-2xl",
                                    input.trim() ? "bg-emerald-500 scale-105" : "bg-white/5 opacity-40"
                                )}
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600 to-emerald-400 opacity-0 group-hover/send:opacity-100 transition-opacity" />
                                <Send className={cn(
                                    "w-6 h-6 relative z-10 transition-all duration-500",
                                    input.trim() ? "text-emerald-950 scale-110 -rotate-[15deg] group-hover/send:rotate-0" : "text-white/60"
                                )} />
                            </button>
                        </div>

                        <div className="mt-6 flex items-center justify-between px-3 text-[10px] uppercase font-black tracking-[0.3em] opacity-30">
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Voice Analysis Ready
                            </span>
                            <span className="text-white/50">V7.2 Quantum AI</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16,185,129,0.2); }
                
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                @keyframes slideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slideDown {
                    animation: slideDown 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }
            `}</style>
        </div>
    )
}
