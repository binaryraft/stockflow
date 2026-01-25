import { handleSalesIntent } from './intents/sales';
import { handlePurchaseIntent } from './intents/purchase';
import { handleDashboardIntent } from './intents/dashboard';
import { handleReturnsIntent } from './intents/returns';

export type IntentType = 'dashboard' | 'sales' | 'purchase' | 'returns' | 'help' | 'tutorial' | 'unknown';

export interface AIResponse {
    intent: IntentType;
    message: string;
    action?: string;
    data?: any;
    suggestions?: string[];
    requiresConfirmation?: boolean;
}

export const analyzeIntent = (prompt: string): AIResponse => {
    const p = prompt.toLowerCase().trim();

    // Navigation shortcuts
    if (p === 'dashboard' || p.includes('show dashboard') || p.includes('overview'))
        return handleDashboardIntent(p);

    if (p.includes('sales') || p.includes('bill') || p.includes('add'))
        return handleSalesIntent(p);

    if (p.includes('purchase') || p.includes('buy') || p.includes('stock in'))
        return handlePurchaseIntent(p);

    if (p.includes('return'))
        return handleReturnsIntent(p);

    if (p.includes('help') || p.includes('tutorial') || p.includes('how to'))
        return { intent: 'tutorial', message: 'I can show you around! Let’s start the tutorial.' };

    if (p === 'confirm' || p === 'yes' || p === 'ok' || p === 'correct') {
        return {
            intent: 'unknown',
            message: "Great! I've processed that for you. Anything else?"
        };
    }

    return {
        intent: 'unknown',
        message: "I'm not sure I understood. Try saying 'add 20 shirts to stock' or 'open dashboard'.",
        suggestions: ['Dashboard', 'Sales', 'Purchase', 'Help']
    };
};
