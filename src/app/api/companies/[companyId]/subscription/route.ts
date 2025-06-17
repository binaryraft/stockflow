
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Company } from '@/types';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

export async function PUT(req: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
    const body = await req.json();
    const { activeSubscriptionId } = body;

    if (!companyId || !activeSubscriptionId) {
      return NextResponse.json({ success: false, message: 'Company ID and new subscription ID are required' }, { status: 400 });
    }

    const validPlan = SUBSCRIPTION_PLANS.find(p => p.id === activeSubscriptionId);
    if (!validPlan) {
        return NextResponse.json({ success: false, message: 'Invalid subscription plan ID' }, { status: 400 });
    }

    const db = await readDB();
    const companyIndex = db.companies.findIndex(c => c.id === companyId);

    if (companyIndex === -1) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    db.companies[companyIndex].activeSubscriptionId = activeSubscriptionId;
    await writeDB(db);

    return NextResponse.json({ success: true, message: 'Company subscription updated successfully', data: db.companies[companyIndex] });
  } catch (error) {
    console.error(`API PUT /api/companies/${params.companyId}/subscription error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
