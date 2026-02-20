
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Activity, AlertCircle } from 'lucide-react';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

interface AccountingSummaryCardsProps {
    startDate?: Date;
    endDate?: Date;
    storeId: string;
}

export function AccountingSummaryCards({ startDate, endDate, storeId }: AccountingSummaryCardsProps) {
    const { fetchAccountingReport, userProfile } = useInventoryStore((state) => ({
        fetchAccountingReport: state.fetchAccountingReport,
        userProfile: state.userProfile
    }));

    const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;
    const [overviewData, setOverviewData] = React.useState<any[] | null>(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const loadOverview = async () => {
            if (!companyId) return;
            setLoading(true);
            try {
                const response = await fetch(`/api/accounting?companyId=${companyId}&reportType=overview&storeId=${storeId}&startDate=${startDate?.toISOString() || ''}&endDate=${endDate?.toISOString() || ''}`);
                const result = await response.json();
                if (result.success) {
                    setOverviewData(result.data);
                }
            } catch (err) {
                console.error("Failed to load accounting overview:", err);
            } finally {
                setLoading(false);
            }
        };

        loadOverview();
    }, [startDate, endDate, storeId, companyId]);

    const metrics = useMemo(() => {
        if (!overviewData) return null;

        const sales = overviewData.find(d => d._id === 'sell') || { totalAmount: 0, sgst: 0, cgst: 0, igst: 0, totalCOGS: 0 };
        const buy = overviewData.find(d => d._id === 'buy') || { totalAmount: 0, sgst: 0, cgst: 0, igst: 0 };

        const totalSales = sales.totalAmount;
        const totalExpenses = buy.totalAmount;
        const totalGSTCollected = (sales.sgst || 0) + (sales.cgst || 0) + (sales.igst || 0);
        const totalGSTPaid = (buy.sgst || 0) + (buy.cgst || 0) + (buy.igst || 0);
        const netGST = totalGSTCollected - totalGSTPaid;
        const netProfit = totalSales - sales.totalCOGS - totalExpenses;

        return {
            totalSales,
            totalExpenses,
            netProfit,
            netGST,
        };
    }, [overviewData]);

    if (loading || !metrics) {
        return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted/40 rounded-xl"></div>)}
        </div>;
    }

    const cards = [
        {
            title: "Total Sales",
            value: formatCurrency(metrics.totalSales),
            icon: TrendingUp,
            color: "text-green-600",
            bg: "bg-green-100/50 dark:bg-green-900/20",
            desc: "Revenue from invoices"
        },
        {
            title: "Total Expenses",
            value: formatCurrency(metrics.totalExpenses),
            icon: TrendingDown,
            color: "text-red-600",
            bg: "bg-red-100/50 dark:bg-red-900/20",
            desc: "Purchases & Costs"
        },
        {
            title: "Net Profit / Loss",
            value: formatCurrency(metrics.netProfit),
            icon: metrics.netProfit >= 0 ? DollarSign : AlertCircle,
            color: metrics.netProfit >= 0 ? "text-primary" : "text-orange-600",
            bg: "bg-primary/10",
            desc: "Sales - COGS - Expenses"
        },
        {
            title: "GST Payable (Net)",
            value: formatCurrency(Math.max(0, metrics.netGST)),
            icon: PieChart,
            color: "text-purple-600",
            bg: "bg-purple-100/50 dark:bg-purple-900/20",
            desc: "Output - Input Tax"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card, index) => (
                <div
                    key={card.title}
                    className="animate-fadeInUp"
                    style={{ animationDelay: `${index * 0.1}s` }}
                >
                    <Card className="border-none shadow-sm h-full hover:shadow-md transition-shadow group overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl rounded-full opacity-10 transition-opacity group-hover:opacity-20 translate-x-12 -translate-y-12 ${card.bg}`} />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                {card.title}
                            </CardTitle>
                            <div className={`p-2 rounded-xl transition-transform group-hover:scale-110 ${card.bg}`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
                                {card.value}
                            </div>
                            <p className="text-[10px] font-medium text-muted-foreground mt-1.5 uppercase tracking-widest opacity-70">
                                {card.desc}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            ))}
        </div>
    );
}
