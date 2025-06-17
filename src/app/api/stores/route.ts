
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Store, Company } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

// GET all stores for a company
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const companyStores = db.stores.filter(s => s.companyId === companyId);
    return NextResponse.json({ success: true, data: companyStores });
  } catch (error) {
    console.error('API GET /api/stores error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new store for a company
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeData, companyId } = body;

    if (!companyId || !storeData || !storeData.name || !storeData.location || !storeData.passkey) {
      return NextResponse.json({ success: false, message: 'Company ID and complete store data (name, location, passkey) are required' }, { status: 400 });
    }

    const db = await readDB();

    const company = db.companies.find(c => c.id === companyId);
    if (!company) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === company.activeSubscriptionId);
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Company subscription plan not found or invalid.' }, { status: 400 });
    }

    const currentStoresCount = db.stores.filter(s => s.companyId === companyId).length;
    if (currentStoresCount >= plan.maxStores) {
      return NextResponse.json({ success: false, message: `Store limit reached for your current plan (${plan.name}). Max ${plan.maxStores} stores allowed.` }, { status: 403 });
    }

    const newStore: Store = {
      id: `store_${uuidv4()}`,
      companyId: companyId,
      name: storeData.name,
      location: storeData.location,
      email: storeData.email || '',
      phone: storeData.phone || '',
      passkey: storeData.passkey,
      allowedStaffIds: storeData.allowedStaffIds || [],
      allowedOperations: storeData.allowedOperations || ['sell', 'buy', 'return'],
    };

    db.stores.push(newStore);
    await writeDB(db);

    return NextResponse.json({ success: true, data: newStore }, { status: 201 });
  } catch (error) {
    console.error('API POST /api/stores error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
