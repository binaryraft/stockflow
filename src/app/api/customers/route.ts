
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import type { Customer, Bill } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const routeNamePrefix = "[API_CUSTOMERS_COLLECTION /api/customers]";

export async function GET(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} GET`;
  console.log(`${routeLogName} Received request to fetch customers.`);
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }

    const customersMap = new Map<string, Customer>();

    const billsCursor = db.collection<Bill>('bills').find({ 
      companyId: companyId, 
      type: { $in: ['sell', 'return'] } 
    });

    for await (const bill of billsCursor) {
      const customerKey = bill.customerPhone || (bill.vendorOrCustomerName?.trim().toLowerCase() || `unknown_${bill.id}`);
      if (customerKey.startsWith('unknown_')) continue;

      let customer = customersMap.get(customerKey);
      const billDate = new Date(bill.date).toISOString();

      if (!customer) {
        customer = {
          id: bill.customerPhone || `cust_${uuidv4()}`,
          companyId: companyId,
          name: bill.vendorOrCustomerName,
          phone: bill.customerPhone,
          firstSeen: billDate,
          lastSeen: billDate,
        };
      } else {
        if (new Date(billDate) < new Date(customer.firstSeen)) customer.firstSeen = billDate;
        if (new Date(billDate) > new Date(customer.lastSeen)) customer.lastSeen = billDate;
        if (!customer.name && bill.vendorOrCustomerName) customer.name = bill.vendorOrCustomerName;
      }
      customersMap.set(customerKey, customer);
    }
    
    // In a real app, you would also fetch from a dedicated 'customers' collection
    // and merge the results. For this derived logic, we just use the map.
    const derivedCustomers = Array.from(customersMap.values())
      .sort((a,b) => (a.name || "").localeCompare(b.name || ""));

    console.log(`${routeLogName} Found/derived ${derivedCustomers.length} customers for company ${companyId}.`);
    return NextResponse.json({ success: true, data: derivedCustomers });
  } catch (error) {
    console.error(`${routeLogName} Error fetching customers:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ success: false, message: "Adding new customers directly is not yet implemented." }, { status: 501 });
}
