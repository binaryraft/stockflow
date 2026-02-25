"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { analyzeIntent } from '@/lib/ai/algorithm'
import { useInventoryStore } from '@/hooks/use-inventory-store'
import { toast } from '@/hooks/use-toast'
import { FlowType, StepType, AIMessage } from '@/types/ai'

export function useAIChat(isOpen: boolean) {
    const pathname = usePathname();
    const isLocalMode = pathname.includes('/local');

    const [input, setInput] = useState('')
    const [isThinking, setIsThinking] = useState(false)
    const [messages, setMessages] = useState<AIMessage[]>([
        { role: 'ai', content: `Neural Core v8.0 online. Synchronized in ${isLocalMode ? 'Local-First' : 'Cloud'} mode.` }
    ])

    const [currentFlow, setCurrentFlow] = useState<FlowType>('none')
    const [flowStep, setFlowStep] = useState<StepType>('idle')
    const [flowData, setFlowData] = useState<any>({})
    const [suggestion, setSuggestion] = useState('')
    const [isVoiceActive, setIsVoiceActive] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [hasError, setHasError] = useState(false)

    const { products, dashboardAnalytics, userProfile, addBill, fetchDashboardAnalytics } = useInventoryStore()

    // --- Voice Logic ---
    const speak = useCallback((text: string) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    }, []);

    const stopListening = useCallback(() => {
        if ((window as any).recognition) {
            (window as any).recognition.stop();
        }
        setIsListening(false);
    }, []);

    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast({ title: "Voice not supported", description: "Your browser doesn't support voice recognition." });
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result: any) => result.transcript)
                .join('');

            if (event.results[0].isFinal) {
                handleSend(transcript);
            }
        };
        (window as any).recognition = recognition;
        recognition.start();
    }, []);

    const toggleVoice = useCallback(() => {
        if (!isVoiceActive) {
            setIsVoiceActive(true);
            startListening();
        } else {
            setIsVoiceActive(false);
            stopListening();
        }
    }, [isVoiceActive, startListening, stopListening]);

    // --- Intelligence Handling ---
    const handleFlowInput = useCallback((msg: string) => {
        const p = msg.toLowerCase();
        switch (flowStep) {
            case 'asking_product':
                const foundProduct = products.find(prod => prod.name.toLowerCase() === p || prod.name.toLowerCase().includes(p));
                if (foundProduct) {
                    setFlowData(prev => ({ ...prev, product: foundProduct, productName: foundProduct.name }));
                    if (foundProduct.variants && foundProduct.variants.length > 0) {
                        setFlowStep('asking_variant');
                        const prompt = `Found it: ${foundProduct.name}. Which variant? [${foundProduct.variants.map(v => v.name).join(', ')}]`;
                        setMessages(prev => [...prev, { role: 'ai', content: prompt }]);
                        if (isVoiceActive) speak(prompt);
                    } else {
                        setFlowStep('asking_quantity');
                        const prompt = `How many ${foundProduct.name}?`;
                        setMessages(prev => [...prev, { role: 'ai', content: prompt }]);
                        if (isVoiceActive) speak(prompt);
                    }
                } else {
                    setFlowStep('confirming_add_missing');
                    setFlowData(prev => ({ ...prev, productName: msg }));
                    const prompt = `I couldn't find "${msg}" in your list. Should I add it as a new product? (Yes/No)`;
                    setMessages(prev => [...prev, { role: 'ai', content: prompt }]);
                    if (isVoiceActive) speak(prompt);
                }
                break;

            case 'confirming_add_missing':
                if (p === 'yes' || p === 'add it' || p === 'ok' || p === 'y') {
                    setFlowStep('asking_quantity');
                    const prompt = `Got it, I'll add "${flowData.productName}". How many do you have?`;
                    setMessages(prev => [...prev, { role: 'ai', content: prompt }]);
                    if (isVoiceActive) speak(prompt);
                } else {
                    setCurrentFlow('none');
                    setFlowStep('idle');
                    const prompt = "No problem. Operation cancelled. What else can I do for you?";
                    setMessages(prev => [...prev, { role: 'ai', content: prompt }]);
                    if (isVoiceActive) speak(prompt);
                }
                break;

            case 'asking_variant':
                setFlowData(prev => ({ ...prev, variant: msg }));
                setFlowStep('asking_quantity');
                const vPrompt = `Variant ${msg} saved. How many?`;
                setMessages(prev => [...prev, { role: 'ai', content: vPrompt }]);
                if (isVoiceActive) speak(vPrompt);
                break;

            case 'asking_quantity':
                const qty = parseInt(msg);
                if (!isNaN(qty)) {
                    setFlowData(prev => ({ ...prev, qty }));
                    setFlowStep('asking_price');
                    const pricePrompt = currentFlow === 'sale' ? "What's the price per unit?" : "What was the cost per unit?";
                    setMessages(prev => [...prev, { role: 'ai', content: pricePrompt }]);
                    if (isVoiceActive) speak(pricePrompt);
                } else {
                    const errorPrompt = "Please enter a number for quantity:";
                    setMessages(prev => [...prev, { role: 'ai', content: errorPrompt }]);
                    if (isVoiceActive) speak(errorPrompt);
                }
                break;

            case 'asking_price':
                const price = parseFloat(msg.replace(/[^0-9.]/g, ''));
                if (!isNaN(price)) {
                    setFlowStep('confirming');
                    const confirmPrompt = `Perfect. That's ${flowData.qty} ${flowData.productName} at ₹${price} each. Total: ₹${(price * flowData.qty).toLocaleString()}. Ready to save?`;
                    setMessages(prev => [...prev, {
                        role: 'ai',
                        content: confirmPrompt,
                        data: { qty: flowData.qty, productName: flowData.productName, price, action: currentFlow === 'sale' ? 'add_to_bill' : 'purchase' },
                        status: 'pending'
                    }]);
                    if (isVoiceActive) speak(confirmPrompt);
                } else {
                    const errorPrompt = "Please enter a valid price:";
                    setMessages(prev => [...prev, { role: 'ai', content: errorPrompt }]);
                    if (isVoiceActive) speak(errorPrompt);
                }
                break;
        }
    }, [flowStep, products, flowData, currentFlow, isVoiceActive, speak]);

    const handleDashboardAI = useCallback(() => {
        const stats = dashboardAnalytics?.summary;
        if (!stats) {
            const prompt = "Checking your stats... one moment.";
            setMessages(prev => [...prev, { role: 'ai', content: prompt }]);
            if (isVoiceActive) speak(prompt);
            return;
        }

        const report = `Here's your business summary:\n\n` +
            `💰 Sales: ₹${stats.totalRevenue.toLocaleString()}\n` +
            `📈 Profit: ₹${stats.grossProfit.toLocaleString()}\n` +
            `🧾 Invoices: ${stats.transactionsToday}\n` +
            `💸 Expenses: ₹${stats.totalExpenses.toLocaleString()}\n\n` +
            `You are operating at ${((stats.grossProfit / (stats.totalRevenue || 1)) * 100).toFixed(1)}% profit. Looking good!`;

        setMessages(prev => [...prev, { role: 'ai', content: report, status: 'info' }]);
        if (isVoiceActive) speak(report.replace(/[^a-zA-Z0-9. :₹\n%]/g, ''));
    }, [dashboardAnalytics, isVoiceActive, speak]);

    const processIntelligence = useCallback((msg: string) => {
        const p = msg.toLowerCase();
        if (p.includes('cancel') || p === 'stop' || p === 'exit') {
            setCurrentFlow('none');
            setFlowStep('idle');
            const prompt = 'Operation aborted. Awaiting new instructions.';
            setMessages(prev => [...prev, { role: 'ai', content: prompt }]);
            if (isVoiceActive) speak(prompt);
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

        if (currentFlow !== 'none') {
            handleFlowInput(msg);
            return;
        }

        const response = analyzeIntent(msg)
        if (response.intent === 'unknown') {
            setHasError(true);
        }
        setMessages(prev => [...prev, {
            role: 'ai',
            content: response.message,
            data: response.data,
            status: response.requiresConfirmation ? 'pending' : undefined
        }])
        if (isVoiceActive) speak(response.message);
    }, [currentFlow, handleFlowInput, handleDashboardAI, isVoiceActive, speak]);

    const handleSend = useCallback((textOverride?: string) => {
        const userMsg = textOverride || input.trim()
        if (!userMsg) return
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setInput('')
        setIsThinking(true)
        setTimeout(() => {
            processIntelligence(userMsg)
            setIsThinking(false)
        }, 600)
    }, [input, processIntelligence]);

    const startFlow = useCallback((type: FlowType) => {
        setCurrentFlow(type);
        setFlowStep('asking_product');
        setFlowData({});
        const prompt = type === 'sale' ? "Okay, let's make a sale. What product are we selling?" : "Adding stock. What product did you get?";
        setMessages(prev => [...prev, { role: 'ai', content: prompt }]);
        if (isVoiceActive) speak(prompt);
    }, [isVoiceActive, speak]);

    const executeAction = useCallback(async (msgIndex: number) => {
        const msg = messages[msgIndex];
        if (!msg.data) return;
        setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, status: 'executing' as const } : m));
        try {
            const { qty, productName, price, action } = msg.data;
            const product = products.find(p => p.name === productName);
            if (!product && action !== 'purchase') throw new Error("Product validation failure.");

            const billData: any = {
                type: action === 'add_to_bill' ? 'sell' : 'buy',
                date: new Date().toISOString().split('T')[0],
                timestamp: Date.now(),
                companyId: (userProfile as any).companyId || 'local',
                items: [],
                totalAmount: price * qty
            };

            const itemData: any = {
                productId: product?.id || `NEW_${Date.now()}`,
                productName: productName,
                quantity: qty,
                costPrice: action === 'purchase' ? price : 0,
                sellPrice: action === 'add_to_bill' ? price : 0,
            };

            await addBill(billData, [itemData]);
            setCurrentFlow('none');
            setFlowStep('idle');
            const successMsg = `Action recorded! Successfully saved to ${isLocalMode ? 'local storage' : 'cloud'}.`;
            setMessages(prev => [
                ...prev.map((m, i) => i === msgIndex ? { ...m, status: 'success' as const } : m),
                { role: 'ai', content: successMsg }
            ]);
            if (isVoiceActive) speak(successMsg);
        } catch (error: any) {
            const errMsg = `Sorry, I hit a snag: ${error.message}`;
            setMessages(prev => [...prev.map((m, i) => i === msgIndex ? { ...m, status: 'pending' as const } : m), { role: 'ai', content: errMsg }]);
            if (isVoiceActive) speak(errMsg);
        }
    }, [messages, products, userProfile, addBill, isLocalMode, isVoiceActive, speak]);

    // --- Autocomplete Effect ---
    useEffect(() => {
        if (input.length > 1) {
            const match = products.find(p => p.name.toLowerCase().startsWith(input.toLowerCase()));
            setSuggestion(match ? match.name.slice(input.length) : '');
        } else {
            setSuggestion('');
        }
    }, [input, products]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Tab' && suggestion) {
            e.preventDefault();
            setInput(prev => prev + suggestion);
            setSuggestion('');
        }
        if (e.key === 'Enter') handleSend();
    }, [suggestion, handleSend]);

    // --- External Data Sync ---
    useEffect(() => {
        if (isOpen && !dashboardAnalytics && (userProfile as any)?.companyId) {
            fetchDashboardAnalytics((userProfile as any).companyId, 'daily')
        }
    }, [isOpen, dashboardAnalytics, userProfile, fetchDashboardAnalytics]);

    return {
        input, setInput,
        isThinking,
        messages, setMessages,
        currentFlow, flowStep, flowData,
        suggestion,
        isVoiceActive, setIsVoiceActive,
        isSpeaking, isListening,
        hasError, setHasError,
        isLocalMode,
        handleSend,
        executeAction,
        toggleVoice,
        startFlow,
        handleDashboardAI,
        handleKeyDown,
        speak,
        startListening,
        stopListening
    };
}
