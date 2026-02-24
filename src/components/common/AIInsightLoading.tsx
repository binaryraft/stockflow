
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getAIInsight } from '@/lib/ai-insights';
import { cn } from '@/lib/utils';
import { Bot, Sparkles, Zap, Cpu, Activity, ShieldCheck } from 'lucide-react';

interface AIInsightLoadingProps {
    context?: string;
    size?: 'sm' | 'md' | 'lg' | 'full';
    className?: string;
    showIcon?: boolean;
    minimal?: boolean;
}

export function AIInsightLoading({
    context = 'general',
    size = 'md',
    className,
    showIcon = true,
    minimal = false,
}: AIInsightLoadingProps) {
    const [insight, setInsight] = useState('');
    const [displayInsight, setDisplayInsight] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Icons based on context
    const Icon = useMemo(() => {
        switch (context) {
            case 'dashboard': return Activity;
            case 'sales': return Zap;
            case 'inventory': return Cpu;
            case 'customers': return Sparkles;
            case 'auth': return ShieldCheck;
            default: return Bot;
        }
    }, [context]);

    // Initial insight and rotation
    useEffect(() => {
        const pickNewInsight = () => {
            const newInsight = getAIInsight(context);
            setInsight(newInsight);
            setIsTyping(true);
            setDisplayInsight('');
        };

        pickNewInsight();
        const interval = setInterval(pickNewInsight, 4000); // Change insight every 4 seconds

        return () => clearInterval(interval);
    }, [context]);

    // Typing effect
    useEffect(() => {
        if (!isTyping || !insight) return;

        let i = 0;
        const typingInterval = setInterval(() => {
            if (i < insight.length) {
                setDisplayInsight((prev) => prev + insight.charAt(i));
                i++;
            } else {
                setIsTyping(false);
                clearInterval(typingInterval);
            }
        }, 30); // Speed of typing

        return () => clearInterval(typingInterval);
    }, [insight, isTyping]);

    if (size === 'full') {
        return (
            <div className={cn("flex flex-col items-center justify-center min-h-[400px] w-full p-8 space-y-8 animate-in fade-in zoom-in duration-500", className)}>
                <div className="relative group">
                    <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all animate-pulse" />
                    <div className="relative bg-background border-2 border-primary/20 p-6 rounded-3xl shadow-2xl backdrop-blur-sm">
                        <Icon size={48} className="text-primary animate-pulse" />
                    </div>
                    <div className="absolute -top-1 -right-1">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        </div>
                    </div>
                </div>

                <div className="max-w-md w-full text-center space-y-4">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] uppercase tracking-widest font-bold text-primary animate-pulse">
                        <Activity size={12} />
                        <span>AI Neural Processing</span>
                    </div>

                    <div className="h-16 flex items-center justify-center font-mono text-lg text-foreground/80 leading-relaxed">
                        {displayInsight}
                        {isTyping && <span className="inline-block w-2 h-5 ml-1 bg-primary animate-pulse" />}
                    </div>

                    <div className="w-full bg-muted/30 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-shimmer" style={{ width: '100%', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, transparent 25%, rgba(var(--primary), 0.5) 50%, transparent 75%)' }} />
                    </div>
                </div>
            </div>
        );
    }

    if (minimal) {
        return (
            <div className={cn("flex items-center space-x-3 text-muted-foreground", className)}>
                <div className="relative">
                    <Icon size={16} className="text-primary animate-pulse" />
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                </div>
                <span className="text-xs font-mono truncate max-w-[200px]">
                    {displayInsight}
                    {isTyping && <span className="inline-block w-1 h-3 ml-0.5 bg-primary animate-pulse" />}
                </span>
            </div>
        )
    }

    return (
        <div className={cn("flex flex-col items-center justify-center p-4 space-y-3", className)}>
            {showIcon && (
                <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10 mb-1">
                    <Icon size={24} className="text-primary animate-pulse" />
                </div>
            )}
            <div className="h-10 text-center font-mono text-sm text-foreground/70 px-4">
                {displayInsight}
                {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse" />}
            </div>
            <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
            </div>
        </div>
    );
}
