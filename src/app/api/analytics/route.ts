
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';

export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get('companyId');
        const period = searchParams.get('period') || 'daily';

        if (!companyId) {
            return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
        }

        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        switch (period) {
            case 'weekly':
                startDate = startOfWeek(now, { weekStartsOn: 1 });
                endDate = endOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'monthly':
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                break;
            case 'yearly':
                startDate = startOfYear(now);
                endDate = endOfYear(now);
                break;
            case 'daily':
            default:
                startDate = startOfDay(now);
                endDate = endOfDay(now);
                break;
        }

        const dateQuery = {
            companyId,
            date: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString(),
            },
            isEstimate: { $ne: true }
        };

        // 1. Basic Stats Aggregation
        const statsResult = await db.collection('bills').aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: "$type",
                    totalAmount: { $sum: "$totalAmount" },
                    count: { $sum: 1 },
                    totalCOGS: { $sum: { $cond: [{ $eq: ["$type", "sell"] }, "$totalCostOfGoodsSold", 0] } } // Assuming we might add this field to Bill later, but for now we iterate items.
                }
            }
        ]).toArray();

        let totalRevenue = 0;
        let totalExpenses = 0;
        let transactionsCount = 0;
        let totalReturns = 0;

        statsResult.forEach(res => {
            if (res._id === 'sell') {
                totalRevenue = res.totalAmount;
                transactionsCount = res.count;
            } else if (res._id === 'buy') {
                totalExpenses = res.totalAmount;
            } else if (res._id === 'return') {
                totalReturns = res.totalAmount;
            }
        });

        // 2. Gross Profit Aggregation (requires unwinding items)
        const profitResult = await db.collection('bills').aggregate([
            { $match: { ...dateQuery, type: 'sell' } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: null,
                    grossProfit: {
                        $sum: {
                            $multiply: [
                                { $subtract: ["$items.sellPrice", "$items.costPrice"] },
                                "$items.quantity"
                            ]
                        }
                    }
                }
            }
        ]).toArray();

        const grossProfit = profitResult[0]?.grossProfit || 0;

        // 3. Top Products Aggregation
        const topProducts = await db.collection('bills').aggregate([
            { $match: { ...dateQuery, type: 'sell' } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productName",
                    revenue: { $sum: { $multiply: ["$items.sellPrice", "$items.quantity"] } },
                    quantity: { $sum: "$items.quantity" },
                    profit: {
                        $sum: {
                            $multiply: [
                                { $subtract: ["$items.sellPrice", "$items.costPrice"] },
                                "$items.quantity"
                            ]
                        }
                    }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 }
        ]).toArray();

        // 4. Low Stock Count
        // This is expensive to calculate via SKUs. If possible, we should have a 'totalQty' field on Product or SKU.
        // For now, let's just return a placeholder or implement it carefully.
        const lowStockThreshold = 5;
        const productsWithLowStock = await db.collection('products').aggregate([
            { $match: { companyId, trackQuantity: true } },
            { $unwind: "$productSKUs" },
            {
                $project: {
                    name: 1,
                    skuId: "$productSKUs.id",
                    totalQty: { $sum: "$productSKUs.stockLayers.quantity" }
                }
            },
            { $match: { totalQty: { $lt: lowStockThreshold } } },
            { $count: "count" }
        ]).toArray();

        const lowStockCount = productsWithLowStock[0]?.count || 0;

        // 5. Time-Series Aggregation for Charts
        let groupByFormat = "%Y-%m-%d";
        if (period === 'yearly') groupByFormat = "%Y-%m";
        if (period === 'weekly') groupByFormat = "%Y-%U"; // Week of year

        const timeSeriesResult = await db.collection('bills').aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: groupByFormat, date: { $toDate: "$date" } } },
                        type: "$type"
                    },
                    amount: { $sum: "$totalAmount" }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    sales: { $sum: { $cond: [{ $eq: ["$_id.type", "sell"] }, "$amount", 0] } },
                    expenses: { $sum: { $cond: [{ $eq: ["$_id.type", "buy"] }, "$amount", 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        const timeSeriesData = timeSeriesResult.map(item => ({
            date: item._id,
            sales: item.sales,
            expenses: item.expenses
        }));

        // 6. Recent Activity (Latest 5 bills)
        const recentBills = await db.collection('bills')
            .find({ companyId })
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalRevenue,
                    totalExpenses,
                    grossProfit,
                    transactionsCount,
                    totalReturns,
                    lowStockCount
                },
                topProducts: topProducts.map(p => ({
                    name: p._id,
                    revenue: p.revenue,
                    quantity: p.quantity,
                    profit: p.profit
                })),
                timeSeriesData: timeSeriesData,
                recentBills: recentBills
            }
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
