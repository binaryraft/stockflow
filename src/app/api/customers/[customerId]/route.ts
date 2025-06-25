
import { NextRequest, NextResponse } from 'next/server';
import { readDB } from '@/lib/db-access';
import type { Customer } from '@/types';

const routeNamePrefix = "[API_CUSTOMERS_SINGLE /api/customers/[customerId]]";

// GET a single customer by ID (or phone number if used as ID)
export async function GET(req: NextRequest, { params }: { params: { customerId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/customers/${params.customerId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { customerId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }
    if (!customerId) {
      console.warn(`${routeLogName} Customer ID is required.`);
      return NextResponse.json({ success: false, message: 'Customer ID is required.' }, { status: 400 });
    }

    const db = await readDB();

    // First, check explicitly created customers
    let customer = db.customers?.find(c => c.id === customerId && c.companyId === companyId);

    if (!customer) {
      // If not found in explicit customers, try to derive from bills (as in the GET all route)
      const customersMap = new Map<string, Customer>();
      db.bills.forEach(bill => {
        if (bill.companyId === companyId && (bill.type === 'sell' || bill.type === 'return')) {
          const customerKey = bill.customerPhone || bill.vendorOrCustomerName?.trim().toLowerCase() || `unknown_${bill.id}`;
          const currentId = bill.customerPhone || `cust_${bill.id}`; // Approximate ID from bill
          
          let potentialMatch = false;
          if (currentId === customerId) potentialMatch = true;
          else if (bill.customerPhone === customerId) potentialMatch = true;
          else if (bill.vendorOrCustomerName && bill.vendorOrCustomerName.trim().toLowerCase() === customerId.toLowerCase() && !bill.customerPhone) potentialMatch = true;
          
          if(potentialMatch) {
            let tempCustomer = customersMap.get(customerKey);
            const billDate = new Date(bill.date).toISOString();
            if (!tempCustomer) {
              tempCustomer = {
                id: currentId,
                companyId: companyId,
                name: bill.vendorOrCustomerName,
                phone: bill.customerPhone,
                firstSeen: billDate,
                lastSeen: billDate,
              };
            } else {
              if (new Date(billDate) < new Date(tempCustomer.firstSeen)) tempCustomer.firstSeen = billDate;
              if (new Date(billDate) > new Date(tempCustomer.lastSeen)) tempCustomer.lastSeen = billDate;
              if (!tempCustomer.name && bill.vendorOrCustomerName) tempCustomer.name = bill.vendorOrCustomerName;
            }
            customersMap.set(customerKey, tempCustomer);
          }
        }
      });
      // In a multi-key scenario for derivation, we might get multiple entries if ID is not phone.
      // For simplicity, take the first one if derived.
      const derivedCustomers = Array.from(customersMap.values());
      if (derivedCustomers.length > 0) {
          customer = derivedCustomers.find(c => c.id === customerId) || 
                     derivedCustomers.find(c => c.phone === customerId) || 
                     derivedCustomers.find(c => c.name?.trim().toLowerCase() === customerId.toLowerCase());
      }
    }


    if (!customer) {
      console.warn(`${routeLogName} Customer not found (ID: ${customerId}) or does not belong to company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Customer not found or does not belong to this company.' }, { status: 404 });
    }
    console.log(`${routeLogName} Customer (ID: ${customerId}) found and returned successfully.`);
    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error(`${routeLogName} Error fetching customer:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (Update customer) - Placeholder
export async function PUT(req: NextRequest, { params }: { params: { customerId: string } }) {
  return NextResponse.json({ success: false, message: "Updating customers is not yet implemented." }, { status: 501 });
}

// DELETE (Delete customer) - Placeholder
export async function DELETE(req: NextRequest, { params }: { params: { customerId: string } }) {
 return NextResponse.json({ success: false, message: "Deleting customers is not yet implemented." }, { status: 501 });
}

    