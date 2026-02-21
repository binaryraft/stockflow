"use client"

import React, { useState, useRef, useEffect } from 'react'
import {
    X, Send, Activity, ShoppingCart, DollarSign, LayoutDashboard,
    ArrowRight, TrendingUp, Package, ArrowUpRight,
    MessageSquare, Cpu, Layers, Zap, Info, Play, User, Bot,
    Smartphone, Network, Cloud, Lock
} from 'lucide-react'
import { analyzeIntent } from '@/lib/ai/algorithm'
import { cn } from '@/lib/utils'
import { useInventoryStore } from '@/hooks/use-inventory-store'
import { toast } from '@/hooks/use-toast'
import { usePathname } from 'next/navigation'

interface AIWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

type FlowType = 'none' | 'sale' | 'purchase' | 'return' | 'product_add' | 'dashboard';
type StepType = 'idle' | 'asking_product' | 'asking_quantity' | 'asking_variant' | 'asking_price' | 'confirming';

export function AIWidget({ isOpen, onClose }: AIWidgetProps) {
    const pathname = usePathname();
    const isLocalMode = pathname.includes('/local');

    // Basic State
    const [input, setInput] = useState('')
    const [isThinking, setIsThinking] = useState(false)
    const [messages, setMessages] = useState<Array<{
        role: 'user' | 'ai',
        content: string,
        data?: any,
        status?: 'pending' | 'success' | 'executing' | 'info'
    }>>([
        { role: 'ai', content: `Neural Core v8.0 online. Synchronized in ${isLocalMode ? 'Local-First' : 'Cloud'} mode.` }
    ])

    // UI State
    const [isFocused, setIsFocused] = useState(false)
    const [currentFlow, setCurrentFlow] = useState<FlowType>('none')
    const [flowStep, setFlowStep] = useState<StepType>('idle')
    const [flowData, setFlowData] = useState<any>({})

    const scrollRef = useRef<HTMLDivElement>(null)

    // Store Hooks
    const {
        products,
        dashboardAnalytics,
        userProfile,
        addBill,
        fetchDashboardAnalytics
    } = useInventoryStore()

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isThinking])

    // Load Analytics
    useEffect(() => {
        if (isOpen && !dashboardAnalytics && (userProfile as any)?.companyId) {
            fetchDashboardAnalytics((userProfile as any).companyId, 'daily')
        }
    }, [isOpen])

    if (!isOpen) return null

    // --- Intelligence Layer ---

    const handleSend = (textOverride?: string) => {
        const userMsg = textOverride || input.trim()
        if (!userMsg) return

        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setInput('')
        setIsThinking(true)

        setTimeout(() => {
            processIntelligence(userMsg)
            setIsThinking(false)
        }, 600)
    }

    const processIntelligence = (msg: string) => {
        const p = msg.toLowerCase();

        // Global Command Hijacking
        if (p.includes('cancel') || p === 'stop' || p === 'exit') {
            setCurrentFlow('none');
            setFlowStep('idle');
            setMessages(prev => [...prev, { role: 'ai', content: 'Operation aborted. Awaiting new instructions.' }]);
            return;
        }

        if (p === 'sale' || p === 'sell' || p === 'billing') {
            startFlow('sale');
            return;
        }
        if (p === 'purchase' || p === 'buy' || p === 'restock') {
            startFlow('purchase');
            return;
        }
        if (p === 'dashboard' || p === 'analytics' || p === 'status') {
            handleDashboardAI();
            return;
        }

        // Contextual Flow Handling
        if (currentFlow !== 'none') {
            handleFlowInput(msg);
            return;
        }

        // General Intent Mapping
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
            ? "Initiating Sales protocol. Identifying product target? (Provide name)"
            : "Purchase logging active. Which entity was acquired?";

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
                            content: `Product found: ${foundProduct.name}. Specify the variant [${foundProduct.variants.map(v => v.name).join(', ')}]?`
                        }]);
                    } else {
                        setFlowStep('asking_quantity');
                        setMessages(prev => [...prev, { role: 'ai', content: `Specify the quantity for ${foundProduct.name}:` }]);
                    }
                } else {
                    setMessages(prev => [...prev, { role: 'ai', content: `Product "${msg}" not recognized. Please re-state or type 'cancel'.` }]);
                }
                break;

            case 'asking_variant':
                setFlowData({ ...flowData, variant: msg });
                setFlowStep('asking_quantity');
                setMessages(prev => [...prev, { role: 'ai', content: `Variant ${msg} logged. Input quantity:` }]);
                break;

            case 'asking_quantity':
                const qty = parseInt(msg);
                if (!isNaN(qty)) {
                    setFlowData({ ...flowData, qty });
                    setFlowStep('asking_price');
                    const pricePrompt = currentFlow === 'sale' ? "Set the execution price (per unit):" : "Input the acquisition cost (per unit):";
                    setMessages(prev => [...prev, { role: 'ai', content: pricePrompt }]);
                } else {
                    setMessages(prev => [...prev, { role: 'ai', content: "Numeric value required for quantity. Re-enter:" }]);
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
                        content: `Manifest generated for ${currentFlow.toUpperCase()}. Totaling ₹${(price * finalData.qty).toLocaleString()} for ${finalData.qty}x ${finalData.productName}.`,
                        data: { qty: finalData.qty, productName: finalData.productName, price: finalData.price, action: currentFlow === 'sale' ? 'add_to_bill' : 'purchase' },
                        status: 'pending'
                    }]);
                } else {
                    setMessages(prev => [...prev, { role: 'ai', content: "Price must be numeric. Re-enter:" }]);
                }
                break;
        }
    }

    const handleDashboardAI = () => {
        const stats = dashboardAnalytics?.summary;
        if (!stats) {
            setMessages(prev => [...prev, { role: 'ai', content: "Synchronizing with telemetry... please wait." }]);
            return;
        }

        const report = `Quantum Intelligence Summary:\n\n` +
            `🔹 Revenue Flow: ₹${stats.totalRevenue.toLocaleString()}\n` +
            `🔹 Yield (Profit): ₹${stats.grossProfit.toLocaleString()}\n` +
            `🔹 Mesh Activity: ${stats.transactionsToday} Ops\n` +
            `🔹 Resource Drain: ₹${stats.totalExpenses.toLocaleString()}\n\n` +
            `Performance Index: ${((stats.grossProfit / (stats.totalRevenue || 1)) * 100).toFixed(1)}% Efficiency.`;

        setMessages(prev => [...prev, { role: 'ai', content: report, status: 'info' }]);
    }

    const executeAction = async (msgIndex: number) => {
        const msg = messages[msgIndex];
        if (!msg.data) return;

        setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, status: 'executing' as const } : m));

        try {
            const { qty, productName, price, action } = msg.data;
            const product = products.find(p => p.name === productName);

            if (!product) throw new Error("Product validation failure.");

            const billData: any = {
                type: action === 'add_to_bill' ? 'sell' : 'buy',
                date: new Date().toISOString().split('T')[0],
                timestamp: Date.now(),
                // SENSITIVE: Determine if cloud or local sync based on active role
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

            // Call store action - this handles cloud sync if logged in
            await addBill(billData, [itemData]);

            setMessages(prev => [
                ...prev.map((m, i) => i === msgIndex ? { ...m, status: 'success' as const } : m),
                { role: 'ai', content: `✅ Synchronization Complete. Data injected into ${isLocalMode ? 'Local Cache' : 'Cloud Ledger'}.` }
            ]);

            setCurrentFlow('none');
            setFlowStep('idle');

        } catch (error: any) {
            setMessages(prev => [
                ...prev.map((m, i) => i === msgIndex ? { ...m, status: 'pending' as const } : m),
                { role: 'ai', content: `❌ Protocol Error: ${error.message}` }
            ]);
        }
    }

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
                isThinking && "ring-1 ring-emerald-500/30"
            )}>

                {/* 1. LEFT SIDEBAR (Desktop Only Intelligence Hub) */}
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
                        {/* Live Mode Indicators */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">Data Flow</span>
                                <Badge variant="outline" className="text-[9px] border-emerald-500/20 text-emerald-400 font-black uppercase tracking-tighter">
                                    {isLocalMode ? 'Local First' : 'Cloud Sync'}
                                </Badge>
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

                        {/* Quick Actions */}
                        <section className="space-y-4">
                            <h4 className="text-[10px] text-white/30 font-black uppercase tracking-widest px-2">Fast Injection</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { label: 'Perform Sale', icon: <DollarSign className="w-4 h-4" />, action: () => startFlow('sale') },
                                    { label: 'Stock Intake', icon: <ShoppingCart className="w-4 h-4" />, action: () => startFlow('purchase') },
                                    { label: 'Mesh Analytics', icon: <LayoutDashboard className="w-4 h-4" />, action: handleDashboardAI },
                                ].map((btn, idx) => (
                                    <button
                                        key={idx}
                                        onClick={btn.action}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-emerald-500 hover:text-emerald-950 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:text-emerald-950">
                                                {btn.icon}
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-tighter">{btn.label}</span>
                                        </div>
                                        <ArrowUpRight className="w-4 h-4 opacity-20 group-hover:opacity-100" />
                                    </button>
                                ))}
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

                {/* 2. CHAT ENGINE (Full Width on Mobile) */}
                <div className="flex-1 flex flex-col min-h-0 bg-transparent relative">
                    {/* Header */}
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
                                    <h1 className="text-base sm:text-xl font-black text-white tracking-widest italic uppercase">Quantum AI <span className="text-emerald-500">v8</span></h1>
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] sm:text-[10px] uppercase font-black px-1.5 py-0">Online</Badge>
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

                    {/* SCROLLABLE CHAT ZONE (Better Alignment) */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-10 py-10 space-y-12 scroll-smooth custom-scrollbar bg-gradient-to-b from-transparent to-black/40">
                        {messages.map((m, i) => (
                            <div key={i} className={cn(
                                "flex flex-col w-full animate-in slide-in-from-bottom-6 fade-in duration-700",
                                m.role === 'user' ? "items-end" : "items-start"
                            )}>
                                {/* Identity Indicator */}
                                <div className={cn(
                                    "flex items-center gap-2 mb-3 px-2",
                                    m.role === 'user' ? "flex-reverse text-right" : "text-left"
                                )}>
                                    {m.role === 'ai' ? (
                                        <>
                                            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                                            </div>
                                            <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">Quantum Engine</span>
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
                                    m.role === 'user'
                                        ? "bg-white/[0.08] text-white border border-white/10 rounded-tr-none hover:bg-white/[0.12] hover:border-white/20"
                                        : m.status === 'info'
                                            ? "bg-emerald-500/5 text-emerald-50 border border-emerald-500/20 rounded-tl-none font-medium italic shadow-[0_0_50px_-20px_rgba(16,185,129,0.3)]"
                                            : "bg-white/[0.02] text-white/90 border border-white/5 rounded-tl-none backdrop-blur-sm"
                                )}>
                                    {m.content.split('\n').map((line, idx) => (
                                        <p key={idx} className={idx > 0 ? "mt-2" : ""}>{line}</p>
                                    ))}

                                    {/* Action UI Enhancement */}
                                    {m.status === 'pending' && (
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
                                                    <p className="text-sm font-black text-white truncate italic">{m.data?.productName}</p>
                                                </div>
                                                <div className="bg-white/[0.03] p-5 rounded-3xl border border-white/5">
                                                    <span className="text-[9px] text-white/20 font-black uppercase tracking-widest block mb-1">Impact</span>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-white/60">x{m.data?.qty}</span>
                                                        <span className="text-xs font-black text-emerald-400">₹{m.data?.price}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => executeAction(i)}
                                                    className="flex-1 h-14 flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-emerald-500/20 group/exec"
                                                >
                                                    Sync & Execute <ArrowRight className="w-5 h-5 group-hover/exec:translate-x-1 transition-transform" />
                                                </button>
                                                <button
                                                    onClick={() => setMessages(p => p.filter((_, idx) => idx !== i))}
                                                    className="w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-white/30 rounded-[1.5rem] transition-all active:scale-95"
                                                >
                                                    <X className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {m.status === 'executing' && (
                                        <div className="mt-5 flex items-center gap-4 bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 animate-pulse">
                                            <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 w-[60%] animate-progress-glow" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 whitespace-nowrap">Injecting Mesh...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isThinking && (
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

                    {/* INPUT SYSTEM (Anchor Sticky on Mobile) */}
                    <div className="px-5 sm:px-10 pb-8 sm:pb-12 pt-6 bg-black/80 backdrop-blur-2xl border-t border-white/5 z-40">
                        {/* Mobile Action Bar */}
                        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar lg:hidden">
                            <button
                                onClick={() => startFlow('sale')}
                                className="h-12 px-6 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shrink-0 active:scale-95 transition-all"
                            >
                                <DollarSign className="w-4 h-4" /> Sale
                            </button>
                            <button
                                onClick={() => startFlow('purchase')}
                                className="h-12 px-6 rounded-2xl bg-white/[0.05] border border-white/10 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shrink-0 active:scale-95 transition-all"
                            >
                                <ShoppingCart className="w-4 h-4" /> Stock In
                            </button>
                            <button
                                onClick={handleDashboardAI}
                                className="h-12 px-6 rounded-2xl bg-white/[0.05] border border-white/10 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shrink-0 active:scale-95 transition-all"
                            >
                                <TrendingUp className="w-4 h-4" /> Analytics
                            </button>
                        </div>

                        {/* Quantum Input Bar */}
                        <div className={cn(
                            "relative flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-[2.5rem] p-3 transition-all duration-700 group",
                            isFocused && "bg-white/[0.07] border-emerald-500/40 shadow-[0_0_80px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20"
                        )}>
                            <div className="hidden sm:flex items-center ml-3 border-r border-white/10 pr-4">
                                <Cpu className={cn("w-6 h-6 transition-all duration-700", isFocused ? "text-emerald-400 rotate-90" : "text-white/20")} />
                            </div>

                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder={currentFlow === 'none' ? "Ask Quantum AI anything..." : "Awaiting parameter..."}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/10 text-base sm:text-lg font-medium italic py-2"
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />

                            <button
                                onClick={() => handleSend()}
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
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Secure Mesh Bridge Active
                            </span>
                            <span className="text-white hidden sm:block">StockFlow Intelligent Layer</span>
                        </div>
                    </div>
                </div>
            </div>

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

function Badge({ children, className, variant = "default" }: any) {
    return (
        <span className={cn(
            "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
            variant === "outline" ? "bg-transparent ring-white/10" : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
            className
        )}>
            {children}
        </span>
    )
}
