export const handleDashboardIntent = (p: string) => {
    return {
        intent: 'dashboard' as const,
        message: 'Switching to Dashboard. Here you can see your sales overview and top products.',
        suggestions: ['Sales Report', 'Inventory Status']
    };
};
