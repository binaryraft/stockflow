export const handleSalesIntent = (p: string) => {
    // Stock addition pattern: "add 20 kurthi's to stock"
    const stockMatch = p.match(/add (\d+)\s+(.+?)(?:\s+to stock)?$/i);
    if (stockMatch) {
        const qty = parseInt(stockMatch[1]);
        const productName = stockMatch[2].replace(/'s$/, '').trim();

        return {
            intent: 'sales' as const,
            action: 'add_to_stock',
            message: `I've prepared a bill for ${qty} x ${productName}. Please confirm.`,
            data: { qty, productName },
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
