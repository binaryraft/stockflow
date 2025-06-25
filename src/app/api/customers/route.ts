
import { NextRequest, NextResponse } from 'next/server';
import { readDB } from '@/lib/db-access';
import type { Customer, Bill } from '@/types'; // Assuming Customer type is defined
import { v4 as uuidv4 } from 'uuid';

const routeNamePrefix = "[API_CUSTOMERS_COLLECTION /api/customers]";

// GET all customers for a company (derived from bills for now)
export async function GET(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} GET`;
  console.log(`${routeLogName} Received request to fetch customers.`);
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }

    const db = await readDB();
    
    // For now, derive customers from bills data.
    // In a future iteration with direct customer creation, this would also query db.customers.
    const customersMap = new Map<string, Customer>();

    db.bills.forEach(bill => {
      if (bill.companyId === companyId && (bill.type === 'sell' || bill.type === 'return')) {
        const customerKey = bill.customerPhone || (bill.vendorOrCustomerName?.trim().toLowerCase() || `unknown_${bill.id}`);
        
        if (customerKey.startsWith('unknown_') && !bill.vendorOrCustomerName && !bill.customerPhone) {
            return; // Skip bills with no customer identifiers
        }
        
        let customer = customersMap.get(customerKey);
        const billDate = new Date(bill.date).toISOString();

        if (!customer) {
          customer = {
            id: bill.customerPhone || `cust_${uuidv4()}`, // Use phone as ID if available, else generate
            companyId: companyId,
            name: bill.vendorOrCustomerName,
            phone: bill.customerPhone,
            // email: undefined, // Add if available from bills or a dedicated customer record
            // address: undefined,
            firstSeen: billDate,
            lastSeen: billDate,
          };
        } else {
          if (new Date(billDate) < new Date(customer.firstSeen)) {
            customer.firstSeen = billDate;
          }
          if (new Date(billDate) > new Date(customer.lastSeen)) {
            customer.lastSeen = billDate;
          }
          // Update name if a more recent bill has one and current is undefined
          if (!customer.name && bill.vendorOrCustomerName) {
            customer.name = bill.vendorOrCustomerName;
          }
        }
        customersMap.set(customerKey, customer);
      }
    });

    const derivedCustomers = Array.from(customersMap.values());
    
    // Combine with explicitly created customers (if any, in future)
    // For now, this would just be an empty array.
    const explicitCustomers = db.customers?.filter(c => c.companyId === companyId) || [];
    const allCompanyCustomers = [...derivedCustomers, ...explicitCustomers];
    
    // Deduplicate if necessary (e.g., if an explicit customer matches a derived one)
    const finalCustomersMap = new Map<string, Customer>();
    allCompanyCustomers.forEach(cust => {
        const key = cust.phone || cust.name?.trim().toLowerCase() || cust.id;
        if (!finalCustomersMap.has(key) || (finalCustomersMap.get(key) && !finalCustomersMap.get(key)?.name && cust.name)) {
             finalCustomersMap.set(key, cust);
        } else {
            const existing = finalCustomersMap.get(key)!;
            if (new Date(cust.firstSeen) < new Date(existing.firstSeen)) existing.firstSeen = cust.firstSeen;
            if (new Date(cust.lastSeen) > new Date(existing.lastSeen)) existing.lastSeen = cust.lastSeen;
            if (!existing.name && cust.name) existing.name = cust.name;
            if (!existing.email && cust.email) existing.email = cust.email;
            if (!existing.address && cust.address) existing.address = cust.address;
        }
    });


    const finalCustomersList = Array.from(finalCustomersMap.values()).sort((a,b) => (a.name || "").localeCompare(b.name || ""));

    console.log(`${routeLogName} Found/derived ${finalCustomersList.length} customers for company ${companyId}.`);
    return NextResponse.json({ success: true, data: finalCustomersList });
  } catch (error) {
    console.error(`${routeLogName} Error fetching customers:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST (Add new customer) - Placeholder for future implementation
export async function POST(req: NextRequest) {
  return NextResponse.json({ success: false, message: "Adding new customers directly is not yet implemented." }, { status: 501 });
}

    