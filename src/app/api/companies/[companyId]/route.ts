
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import type { Company } from '@/types';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS, SUPPORTED_CURRENCIES } from '@/lib/constants';

const routeNamePrefix = "[API_COMPANIES_SINGLE /api/companies/[companyId]]";

export async function GET(req: NextRequest, { params }: { params: { companyId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/companies/${params.companyId}`;
  try {
    const { db } = await connectToDatabase();
    const { companyId } = params;

    if (!companyId) return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });

    const company = await db.collection<Company>('companies').findOne({ id: companyId });

    if (!company) return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });
    
    return NextResponse.json({ success: true, data: company });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { companyId: string } }) {
  const routeLogName = `${routeNamePrefix} PUT /api/companies/${params.companyId}`;
  try {
    const { db } = await connectToDatabase();
    const { companyId } = params;
    const companyDataToUpdate = await req.json();

    if (!companyId || !companyDataToUpdate || Object.keys(companyDataToUpdate).length === 0) {
      return NextResponse.json({ success: false, message: 'Company ID and data are required.' }, { status: 400 });
    }

    const { id, token, creationDate, ...updateableData } = companyDataToUpdate;

    // Validation
    if (updateableData.name !== undefined && (typeof updateableData.name !== 'string' || updateableData.name.trim() === '')) {
        return NextResponse.json({ success: false, message: 'Company name cannot be empty.' }, { status: 400 });
    }
    if (updateableData.activeSubscriptionId && !SUBSCRIPTION_PLANS.some(p => p.id === updateableData.activeSubscriptionId)) {
        return NextResponse.json({ success: false, message: 'Invalid subscription plan ID.' }, { status: 400 });
    }

    // Intercept subscription change to require admin approval
    if (updateableData.activeSubscriptionId) {
        const currentCompany = await db.collection<Company>('companies').findOne({ id: companyId });
        if (currentCompany && currentCompany.activeSubscriptionId !== updateableData.activeSubscriptionId) {
            updateableData.pendingSubscriptionId = updateableData.activeSubscriptionId;
            delete updateableData.activeSubscriptionId; // Do not update active plan immediately
        }
    }

    const result = await db.collection<Company>('companies').updateOne({ id: companyId }, { $set: updateableData });
    
    if (result.matchedCount === 0) return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });

    const updatedCompany = await db.collection<Company>('companies').findOne({ id: companyId });
    return NextResponse.json({ success: true, data: updatedCompany });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
