export const handleSalesIntent = (p: string) => {
    // Enhanced pattern matching for various billing commands
    // Matches patterns like:
    // - add 20 apples
    // - bill 10 shirts
    // - 5 bananas
    // - sold 15 mangoes
    // - 1 brocode
    const salesPattern = /^(?:add|bill|sold|sell)?\s*(\d+)\s+(.+?)(?:\s+at\s+([0-9.]+)(?:\s*rs|\s*rupees)?)?(?:\s+to stock)?$/i;
    const match = p.match(salesPattern);

    if (match) {
        const qty = parseInt(match[1]);
        const price = match[3] ? parseFloat(match[3]) : undefined;
        let productName = match[2].trim();

        // Remove trailing 's' or 'es' if it looks like a simple plural
        if (productName.toLowerCase().endsWith('s') && productName.length > 3) {
            // Very basic plural to singular for better matching (can be improved)
            // productName = productName.slice(0, -1); 
        }

        return {
            intent: 'sales' as const,
            action: 'add_to_bill',
            message: `I've prepared a bill for ${qty} x ${productName}${price ? ` at ₹${price}` : ''}. Please confirm.`,
            data: { qty, productName, price },
            requiresConfirmation: true
        };
    }

    // Only trigger scan_bill if explicitly asked or just mentions "bill" without numbers
    if (p.includes('scan') || p.includes('camera') || (p.includes('bill') && !/\d/.test(p))) {
        return {
            intent: 'sales' as const,
            action: 'scan_bill',
            message: 'Scanner mode activated. Please point your camera at the bill.'
        };
    }

    // Fallback for sales-related queries that didn't match the specific pattern
    return {
        intent: 'sales' as const,
        message: 'I can help you add items to a bill. Try saying "bill 20 apples" or "add 10 shirts". Would you like to open the billing section now?',
        suggestions: ['New Sales Bill', 'New Expense Bill', 'Scan Bill'],
        action: 'open_billing'
    };
};
