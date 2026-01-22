
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Activity, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

interface AccountingSummaryCardsProps {
    startDate?: Date;
    endDate?: Date;
    storeId: string;
}

export function AccountingSummaryCards({ startDate, endDate, storeId }: AccountingSummaryCardsProps) {
    const { bills, userProfile } = useInventoryStore((state) => ({
        bills: state.bills,
        userProfile: state.userProfile
    }));

    const metrics = useMemo(() => {
        if (!startDate || !endDate || !bills) return null;

        const relevantBills = bills.filter(bill => {
            // 1. Filter by Store
            if (storeId !== 'all' && bill.storeId !== storeId) {
                // strict check on storeId
                if (bill.storeId !== storeId) return false;
            }

            // 2. Filter by Date
            const billDate = new Date(bill.date);
            return isWithinInterval(billDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
        });

        let totalSales = 0;
        let totalExpenses = 0;
        let totalGSTCollected = 0;
        let totalGSTPaid = 0;
        let pendingCollections = 0;

        relevantBills.forEach(bill => {
            // Sales
            if (bill.type === 'sell' && !bill.isEstimate) {
                totalSales += bill.totalAmount;
                totalGSTCollected += (bill.totalSGST || 0) + (bill.totalCGST || 0) + (bill.totalIGST || 0);

                if (bill.paymentStatus === 'unpaid') {
                    pendingCollections += bill.totalAmount;
                }
            }

            // Expenses (Purchases)
            if (bill.type === 'buy') {
                totalExpenses += bill.totalAmount;
                // Assuming expense bills record tax paid similarly, or derived from items
                // Simplified: assuming input tax is captured in bill totals if structured that way.
                // For now, if buy bill has tax fields, add them.
                totalGSTPaid += (bill.totalSGST || 0) + (bill.totalCGST || 0) + (bill.totalIGST || 0);
            }
        });

        const netProfit = totalSales - totalExpenses; // Very simplified gross profit
        const netGST = totalGSTCollected - totalGSTPaid;

        return {
            totalSales,
            totalExpenses,
            netProfit,
            totalGSTCollected,
            totalGSTPaid,
            netGST,
            pendingCollections,
            txCount: relevantBills.length
        };
    }, [bills, startDate, endDate, storeId]);

    if (!metrics) {
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
            desc: "Sales - Expenses"
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
                <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                    <Card className="border-none shadow-sm h-full hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {card.title}
                            </CardTitle>
                            <div className={`p-2 rounded-full ${card.bg}`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {card.desc}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
