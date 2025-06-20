
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Store, Company, BillMode } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

const routeNamePrefix = "[API_STORES_COLLECTION /api/stores]";

// GET all stores for a company
export async function GET(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} GET`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }

    const db = await readDB();
    const companyStores = db.stores.filter(s => s.companyId === companyId);
    console.log(`${routeLogName} Found ${companyStores.length} stores for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyStores });
  } catch (error) {
    console.error(`${routeLogName} Error fetching stores:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new store for a company
export async function POST(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} POST`;
  console.log(`${routeLogName} Received request to create a new store.`);
  try {
    const body = await req.json();
    // Expect storeData and companyId in the body
    const { storeData, companyId } = body; 

    if (!companyId || !storeData || 
        !storeData.name || typeof storeData.name !== 'string' || storeData.name.trim() === '' ||
        !storeData.location || typeof storeData.location !== 'string' || storeData.location.trim() === '' ||
        !storeData.passkey || typeof storeData.passkey !== 'string' || storeData.passkey.trim() === '' ||
        !storeData.email || typeof storeData.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storeData.email) ||
        !storeData.phone || typeof storeData.phone !== 'string' || storeData.phone.trim().length < 10) {
      console.warn(`${routeLogName} Missing or invalid fields. Required: companyId, storeData (name, location, passkey, valid email, phone min 10 digits).`);
      return NextResponse.json({ success: false, message: 'Company ID and complete store data (name, location, passkey, valid email, phone min 10 digits) are required.' }, { status: 400 });
    }
    if (storeData.passkey.length < 4) { // Passkey policy
      console.warn(`${routeLogName} Passkey too short. Must be at least 4 characters.`);
      return NextResponse.json({ success: false, message: 'Store passkey must be at least 4 characters long.' }, { status: 400 });
    }
    if (!storeData.allowedOperations || !Array.isArray(storeData.allowedOperations) || storeData.allowedOperations.length === 0 ||
        !storeData.allowedOperations.every((op: BillMode) => ['sell', 'buy', 'return'].includes(op))) {
      console.warn(`${routeLogName} Allowed operations not specified or invalid. Must be a non-empty array of 'sell', 'buy', 'return'.`);
      return NextResponse.json({ success: false, message: 'At least one valid operation (sell, buy, return) must be allowed for the store.' }, { status: 400 });
    }

    const db = await readDB();
    const company = db.companies.find(c => c.id === companyId);
    if (!company) {
      console.warn(`${routeLogName} Company not found (ID: ${companyId}). Cannot add store.`);
      return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === company.activeSubscriptionId);
    if (!plan) {
      console.warn(`${routeLogName} Company subscription plan not found or invalid for company ${companyId}. Allowing add by default, but this is an issue.`);
      // In a production app, this might be a hard error or a fallback to a very restrictive default.
    }

    const currentStoresCount = db.stores.filter(s => s.companyId === companyId).length;
    if (plan && currentStoresCount >= plan.maxStores) {
      console.warn(`${routeLogName} Store limit (${plan.maxStores}) reached for company ${companyId} on plan ${plan.name}.`);
      return NextResponse.json({ success: false, message: `Store limit reached for your current plan (${plan.name}). Max ${plan.maxStores} stores allowed.` }, { status: 403 }); // 403 Forbidden
    }

    const newStore: Store = {
      id: `store_${uuidv4()}`,
      companyId: companyId,
      name: storeData.name.trim(),
      location: storeData.location.trim(),
      email: storeData.email.toLowerCase(),
      phone: storeData.phone.trim(),
      passkey: storeData.passkey, // Assuming it's already trimmed and validated
      allowedStaffIds: Array.isArray(storeData.allowedStaffIds) ? storeData.allowedStaffIds : [],
      allowedOperations: storeData.allowedOperations,
    };

    db.stores.push(newStore);
    await writeDB(db);

    console.log(`${routeLogName} New store "${newStore.name}" (ID: ${newStore.id}) created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: newStore }, { status: 201 }); // 201 Created
  } catch (error) {
    console.error(`${routeLogName} Error creating store:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
