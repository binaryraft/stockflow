
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { Store, Company } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

const routeNamePrefix = "[API_STORES_COLLECTION /api/stores]";

export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });

    const companyStores = await db.collection<Store>('stores').find({ companyId: companyId }).toArray();
    return NextResponse.json({ success: true, data: companyStores });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const { storeData, companyId } = body;

    if (!companyId || !storeData || !storeData.name || !storeData.location || !storeData.passkey || !storeData.email || !storeData.phone) {
      return NextResponse.json({ success: false, message: 'Complete store data and Company ID are required.' }, { status: 400 });
    }
    
    const company = await db.collection<Company>('companies').findOne({ id: companyId });
    if (!company) return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === company.activeSubscriptionId);
    const currentStoresCount = await db.collection<Store>('stores').countDocuments({ companyId: companyId });
    if (plan && currentStoresCount >= plan.maxStores) {
      return NextResponse.json({ success: false, message: `Store limit reached for your current plan.` }, { status: 403 });
    }

    const newStore: Store = {
      id: `store_${uuidv4()}`,
      companyId: companyId,
      name: storeData.name.trim(),
      location: storeData.location.trim(),
      email: storeData.email.toLowerCase(),
      phone: storeData.phone.trim(),
      passkey: storeData.passkey,
      allowedStaffIds: Array.isArray(storeData.allowedStaffIds) ? storeData.allowedStaffIds : [],
      allowedOperations: storeData.allowedOperations,
    };

    await db.collection<Store>('stores').insertOne(newStore);
    return NextResponse.json({ success: true, data: newStore }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
