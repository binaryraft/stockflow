
export const INSIGHT_MAP: Record<string, string[]> = {
    general: [
        "Analyzing system vitals...",
        "Synthesizing data stream...",
        "Optimizing workflow paths...",
        "Initializing secure protocols...",
        "Aligning interface modules...",
        "Calibrating neural data engines...",
    ],
    dashboard: [
        "Predicting sales trends for the next 48 hours...",
        "Identifying high-performing inventory clusters...",
        "Anomalies detected: None. System health at 99.8%...",
        "Correlating customer behavior with seasonal peaks...",
        "Drafting daily performance summary...",
        "Optimizing dashboard widgets for peak efficiency...",
    ],
    sales: [
        "Calculating transaction velocity...",
        "Cross-referencing revenue with previous quarter...",
        "Identifying top growth categories...",
        "Mapping sales geographic distribution...",
        "Projecting month-end closing figures...",
    ],
    inventory: [
        "Auditing stock levels across all nodes...",
        "Predicting restock requirements...",
        "Evaluating turnover speed for electronics...",
        "Detecting potential supply chain bottlenecks...",
        "Comparing current stock with demand forecasts...",
    ],
    customers: [
        "Segmenting user cohorts by purchasing power...",
        "Calculating customer lifetime value metrics...",
        "Identifying churn risks in active accounts...",
        "Personalizing engagement strategies...",
        "Analyzing sentiment trends in customer feedback...",
    ],
    billing: [
        "Validating secure payment gateway connections...",
        "Processing tax calculation algorithms...",
        "Generating cryptographically signed invoices...",
        "Optimizing ledger entries for archival...",
        "Synchronizing transaction history with cloud...",
    ],
    products: [
        "Enhancing product descriptions with semantic SEO...",
        "Optimizing high-resolution asset delivery...",
        "Analyzing competitor pricing benchmarks...",
        "Generating smart tags for catalog indexing...",
        "Validating SKU integrity across categories...",
    ],
    auth: [
        "Verifying biometric and token handshakes...",
        "Establishing end-to-end encrypted session...",
        "Checking security headers and CSP...",
        "Initializing user environment profile...",
        "Auditing access logs for suspicious activity...",
    ],
    staff: [
        "Analyzing personnel productivity metrics...",
        "Synchronizing permission matrices...",
        "Optimizing shift distribution patterns...",
        "Validating employee access credentials...",
        "Evaluating team performance clusters...",
    ],
    stores: [
        "Mapping regional performance nodes...",
        "Synchronizing multi-store inventory sync...",
        "Optimizing node-to-node data routing...",
        "Analyzing local market demand trends...",
        "Verifying store-specific geometric constraints...",
    ]
};

export function getAIInsight(context: string = 'general'): string {
    const currentContext = INSIGHT_MAP[context] || INSIGHT_MAP['general'];
    const randomIndex = Math.floor(Math.random() * currentContext.length);
    return currentContext[randomIndex];
}

export function getRandomSlowInsight(context: string = 'general'): string {
    const currentContext = INSIGHT_MAP[context] || INSIGHT_MAP['general'];
    // Return something that feels more "process heavy"
    return currentContext[0];
}
