
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get('companyId');
        const storeId = searchParams.get('storeId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const reportType = searchParams.get('reportType') || 'gst';

        if (!companyId) {
            return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
        }

        const dateMatch: any = { companyId };
        if (startDate || endDate) {
            dateMatch.date = {};
            if (startDate) dateMatch.date.$gte = startDate;
            if (endDate) dateMatch.date.$lte = endDate;
        }
        if (storeId && storeId !== 'all') {
            dateMatch.storeId = storeId;
        }
        dateMatch.isEstimate = { $ne: true };

        if (reportType === 'gst') {
            // Aggregated GST Report
            const gstResult = await db.collection('bills').aggregate([
                { $match: dateMatch },
                {
                    $group: {
                        _id: "$type",
                        taxableValue: { $sum: "$subTotal" },
                        sgst: { $sum: "$totalSGST" },
                        cgst: { $sum: "$totalCGST" },
                        totalAmount: { $sum: "$totalAmount" },
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            // Detailed GST breakdown (optional, for the table)
            // If the user has "lakhs" of sales, we should probably return only the first 1000 or paginate
            const limit = 5000; // Limit for "detailed" view in report to keep it printable
            const detailedBills = await db.collection('bills')
                .find(dateMatch)
                .project({ id: 1, date: 1, type: 1, vendorOrCustomerName: 1, subTotal: 1, totalSGST: 1, totalCGST: 1, totalAmount: 1, billNo: 1 })
                .sort({ date: -1 })
                .limit(limit)
                .toArray();

            return NextResponse.json({
                success: true,
                data: {
                    summary: gstResult,
                    detailed: detailedBills,
                    isTruncated: detailedBills.length === limit
                }
            });
        }

        if (reportType === 'pnl') {
            const pnlResult = await db.collection('bills').aggregate([
                { $match: dateMatch },
                {
                    $group: {
                        _id: "$type",
                        subTotal: { $sum: "$subTotal" },
                        totalAmount: { $sum: "$totalAmount" },
                        totalCOGS: { $sum: { $cond: [{ $eq: ["$type", "sell"] }, "$totalCostOfGoodsSold", 0] } }
                    }
                }
            ]).toArray();

            return NextResponse.json({ success: true, data: pnlResult });
        }

        if (reportType === 'overview') {
            const result = await db.collection('bills').aggregate([
                { $match: dateMatch },
                {
                    $group: {
                        _id: "$type",
                        subTotal: { $sum: "$subTotal" },
                        totalAmount: { $sum: "$totalAmount" },
                        sgst: { $sum: "$totalSGST" },
                        cgst: { $sum: "$totalCGST" },
                        igst: { $sum: "$totalIGST" },
                        totalCOGS: { $sum: { $cond: [{ $eq: ["$type", "sell"] }, "$totalCostOfGoodsSold", 0] } }
                    }
                }
            ]).toArray();

            return NextResponse.json({ success: true, data: result });
        }

        return NextResponse.json({ success: false, message: 'Invalid report type' }, { status: 400 });

    } catch (error) {
        console.error("Accounting API Error:", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
