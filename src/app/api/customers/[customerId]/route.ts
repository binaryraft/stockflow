
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { Customer, Bill } from '@/types';
import { v4 as uuidv4 } from 'uuid';


const routeNamePrefix = "[API_CUSTOMERS_SINGLE /api/customers/[customerId]]";

export async function GET(req: NextRequest, { params }: { params: { customerId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/customers/${params.customerId}`;
  try {
    const { db } = await connectToDatabase();
    const { customerId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId || !customerId) {
      return NextResponse.json({ success: false, message: 'Company and Customer ID are required.' }, { status: 400 });
    }
    
    // This is derived logic. In a real app, you'd query a customers collection first.
    // For now, we replicate the logic from the collection GET to find a specific customer.
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
      }
      customersMap.set(customerKey, customer);
    }
    
    const derivedCustomers = Array.from(customersMap.values());
    const customer = derivedCustomers.find(c => c.id === customerId);

    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { customerId: string } }) {
  return NextResponse.json({ success: false, message: "Updating customers is not yet implemented." }, { status: 501 });
}

export async function DELETE(req: NextRequest, { params }: { params: { customerId: string } }) {
 return NextResponse.json({ success: false, message: "Deleting customers is not yet implemented." }, { status: 501 });
}
