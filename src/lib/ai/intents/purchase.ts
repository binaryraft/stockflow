export const handlePurchaseIntent = (p: string) => {
    if (p.includes('scan') || p.includes('bill') || p.includes('upload')) {
        return {
            intent: 'purchase' as const,
            action: 'scan_purchase_bill',
            message: 'Ready to scan purchase invoice. Please upload or capture the bill image.'
        };
    }

    return {
        intent: 'purchase' as const,
        message: 'Purchase module ready. I can help you record incoming stock from bills.',
        suggestions: ['Scan Purchase Bill', 'Recent Purchases']
    };
};
