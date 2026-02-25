export type FlowType = 'none' | 'sale' | 'purchase' | 'return' | 'product_add' | 'dashboard' | 'adding_missing_product' | 'support';

export type StepType =
    | 'idle'
    | 'asking_product'
    | 'asking_quantity'
    | 'asking_variant'
    | 'asking_price'
    | 'confirming'
    | 'confirming_add_missing';

export interface AIMessage {
    role: 'user' | 'ai';
    content: string;
    data?: any;
    status?: 'pending' | 'success' | 'executing' | 'info';
}

export interface IntentResponse {
    intent: string;
    message: string;
    action?: string;
    data?: any;
    suggestions?: string[];
    requiresConfirmation?: boolean;
}
