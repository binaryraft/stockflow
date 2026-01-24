export const handleReturnsIntent = (p: string) => {
    return {
        intent: 'returns' as const,
        message: 'Returns section. You can process customer returns or view return history here.',
        suggestions: ['New Return', 'Return History']
    };
};
