
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

    if (!companyId || !storeData || !storeData.name || !storeData.username || !storeData.location || !storeData.passkey || !storeData.email || !storeData.phone) {
      return NextResponse.json({ success: false, message: 'Complete store data, including Username, and Company ID are required.' }, { status: 400 });
    }

    const company = await db.collection<Company>('companies').findOne({ id: companyId });
    if (!company) return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === company.activeSubscriptionId);
    const currentStoresCount = await db.collection<Store>('stores').countDocuments({ companyId: companyId });
    if (plan && currentStoresCount >= plan.maxStores) {
      return NextResponse.json({ success: false, message: `Store limit reached for your current plan.` }, { status: 403 });
    }

    // Check username uniqueness within company (?) or global?
    // "make sure the admin dont contain same store usernames" implies per company/admin.
    // However, for login we use (Admin Email + Store Username). So uniqueness per Company is sufficient.
    const existingUsername = await db.collection<Store>('stores').findOne({ companyId, username: storeData.username.trim() });
    if (existingUsername) {
      return NextResponse.json({ success: false, message: 'Store Username already exists in your company. Please choose another.' }, { status: 400 });
    }

    // Generate a unique 6-digit access code (Legacy support or secondary method)
    let accessCode = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 50) {
      accessCode = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await db.collection<Store>('stores').findOne({ accessCode });
      if (!existing) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json({ success: false, message: 'Failed to generate a unique Store Access Key. Please try again.' }, { status: 500 });
    }

    const newStore: Store = {
      id: `store_${uuidv4()}`,
      companyId: companyId,
      name: storeData.name.trim(),
      username: storeData.username.trim(),
      location: storeData.location.trim(),
      email: storeData.email.toLowerCase(),
      phone: storeData.phone.trim(),
      accessCode: accessCode,
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
