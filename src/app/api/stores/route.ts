
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Store, Company } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

// GET all stores for a company
export async function GET(req: NextRequest) {
  const routeName = "[API_STORES_GET_ALL /api/stores]";
  console.log(`${routeName} Received request.`);
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const companyStores = db.stores.filter(s => s.companyId === companyId);
    console.log(`${routeName} Found ${companyStores.length} stores for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyStores });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new store for a company
export async function POST(req: NextRequest) {
  const routeName = "[API_STORES_POST /api/stores]";
  console.log(`${routeName} Received request to create a new store.`);
  try {
    const body = await req.json();
    const { storeData, companyId } = body;

    if (!companyId || !storeData || !storeData.name || !storeData.location || !storeData.passkey || !storeData.email || !storeData.phone) {
      console.warn(`${routeName} Missing required fields: companyId, storeData (name, location, passkey, email, phone).`);
      return NextResponse.json({ success: false, message: 'Company ID and complete store data (name, location, passkey, email, phone) are required' }, { status: 400 });
    }
    if (storeData.passkey.length < 4) {
      console.warn(`${routeName} Passkey too short.`);
      return NextResponse.json({ success: false, message: 'Store passkey must be at least 4 characters long.' }, { status: 400 });
    }
    if (!storeData.allowedOperations || !Array.isArray(storeData.allowedOperations) || storeData.allowedOperations.length === 0) {
      console.warn(`${routeName} Allowed operations not specified or empty.`);
      return NextResponse.json({ success: false, message: 'At least one operation must be allowed for the store.' }, { status: 400 });
    }


    const db = await readDB();
    const company = db.companies.find(c => c.id === companyId);
    if (!company) {
      console.warn(`${routeName} Company not found (ID: ${companyId}). Cannot add store.`);
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === company.activeSubscriptionId);
    if (!plan) {
      console.warn(`${routeName} Company subscription plan not found or invalid for company ${companyId}.`);
      // Fallback to a default behavior or return error. For now, assume a default or check won't block if plan is missing.
      // For production, this should be a hard error or a clearly defined default limit.
      // return NextResponse.json({ success: false, message: 'Company subscription plan not found or invalid.' }, { status: 400 });
    }

    const currentStoresCount = db.stores.filter(s => s.companyId === companyId).length;
    if (plan && currentStoresCount >= plan.maxStores) {
      console.warn(`${routeName} Store limit reached for company ${companyId} on plan ${plan.name}.`);
      return NextResponse.json({ success: false, message: `Store limit reached for your current plan (${plan.name}). Max ${plan.maxStores} stores allowed.` }, { status: 403 });
    }

    const newStore: Store = {
      id: `store_${uuidv4()}`,
      companyId: companyId,
      name: storeData.name,
      location: storeData.location,
      email: storeData.email,
      phone: storeData.phone,
      passkey: storeData.passkey,
      allowedStaffIds: storeData.allowedStaffIds || [],
      allowedOperations: storeData.allowedOperations,
    };

    db.stores.push(newStore);
    await writeDB(db);

    console.log(`${routeName} New store "${newStore.name}" (ID: ${newStore.id}) created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: newStore }, { status: 201 });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
