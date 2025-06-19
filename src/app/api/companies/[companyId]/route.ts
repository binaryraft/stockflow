
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Company } from '@/types';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

export async function GET(req: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const company = db.companies.find(c => c.id === companyId);

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: company });
  } catch (error) {
    console.error(`API GET /api/companies/${params.companyId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
    const companyDataToUpdate = await req.json();

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }
    if (!companyDataToUpdate || Object.keys(companyDataToUpdate).length === 0) {
      return NextResponse.json({ success: false, message: 'Company data is required for update' }, { status: 400 });
    }

    const db = await readDB();
    const companyIndex = db.companies.findIndex(c => c.id === companyId);

    if (companyIndex === -1) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    // Exclude fields that should not be updatable via this endpoint directly
    const { id, token, ...updateableData } = companyDataToUpdate;

    if (updateableData.name !== undefined && (typeof updateableData.name !== 'string' || updateableData.name.trim() === '')) {
        return NextResponse.json({ success: false, message: 'Company name cannot be empty if provided for update.' }, { status: 400 });
    }

    if (updateableData.activeSubscriptionId) {
      const validPlan = SUBSCRIPTION_PLANS.find(p => p.id === updateableData.activeSubscriptionId);
      if (!validPlan) {
          return NextResponse.json({ success: false, message: 'Invalid subscription plan ID provided' }, { status: 400 });
      }
    }
    if (updateableData.defaultSalesPaymentStatus && !['paid', 'unpaid'].includes(updateableData.defaultSalesPaymentStatus)){
        return NextResponse.json({ success: false, message: 'Invalid default sales payment status.' }, { status: 400 });
    }
    if (updateableData.defaultPurchasePaymentStatus && !['paid', 'unpaid'].includes(updateableData.defaultPurchasePaymentStatus)){
        return NextResponse.json({ success: false, message: 'Invalid default purchase payment status.' }, { status: 400 });
    }

    // Merge existing data with updateable data
    db.companies[companyIndex] = {
      ...db.companies[companyIndex],
      ...updateableData,
    };
    // Ensure name is trimmed if updated
    if (updateableData.name) db.companies[companyIndex].name = updateableData.name.trim();


    await writeDB(db);

    return NextResponse.json({ success: true, data: db.companies[companyIndex] });
  } catch (error) {
    console.error(`API PUT /api/companies/${params.companyId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

    