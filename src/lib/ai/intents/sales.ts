export const handleSalesIntent = (p: string) => {
    // Enhanced Stock addition pattern: "add 20 kurthis at 200rs"
    const stockMatch = p.match(/add (\d+)\s+(.+?)(?:\s+at\s+([0-9.]+)(?:\s*rs|\s*rupees)?)?(?:\s+to stock)?$/i);

    if (stockMatch) {
        const qty = parseInt(stockMatch[1]);
        const price = stockMatch[3] ? parseFloat(stockMatch[3]) : undefined;
        const productName = stockMatch[2].replace(/'s$/, '').trim();

        return {
            intent: 'sales' as const,
            action: 'add_to_stock',
            message: `I've prepared a bill for ${qty} x ${productName}${price ? ` at ₹${price}` : ''}. Please confirm.`,
            data: { qty, productName, price },
            requiresConfirmation: true
        };
    }

    if (p.includes('scan') || p.includes('camera') || p.includes('bill')) {
        return {
            intent: 'sales' as const,
            action: 'scan_bill',
            message: 'Opening camera for bill scanning...'
        };
    }

    return {
        intent: 'sales' as const,
        message: 'Opening Sales section. Would you like to scan a bill or enter items manually?',
        suggestions: ['Scan Bill', 'Manual Entry', 'Add 10 Shirts']
    };
};
