
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Company } from '@/types';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

// GET a single company by ID
export async function GET(req: NextRequest, { params }: { params: { companyId: string } }) {
  const routeName = `[API_COMPANIES_GET /api/companies/${params.companyId}]`;
  console.log(`${routeName} Received request.`);
  try {
    const { companyId } = params;

    if (!companyId) {
      console.warn(`${routeName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const company = db.companies.find(c => c.id === companyId);

    if (!company) {
      console.warn(`${routeName} Company not found (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }
    console.log(`${routeName} Company found and returned successfully.`);
    return NextResponse.json({ success: true, data: company });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a company by ID
export async function PUT(req: NextRequest, { params }: { params: { companyId: string } }) {
  const routeName = `[API_COMPANIES_PUT /api/companies/${params.companyId}]`;
  console.log(`${routeName} Received request to update company.`);
  try {
    const { companyId } = params;
    const companyDataToUpdate = await req.json();

    if (!companyId) {
      console.warn(`${routeName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }
    if (!companyDataToUpdate || Object.keys(companyDataToUpdate).length === 0) {
      console.warn(`${routeName} Company data is required for update.`);
      return NextResponse.json({ success: false, message: 'Company data is required for update' }, { status: 400 });
    }

    const db = await readDB();
    const companyIndex = db.companies.findIndex(c => c.id === companyId);

    if (companyIndex === -1) {
      console.warn(`${routeName} Company not found (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    const { id, token, ...updateableData } = companyDataToUpdate;

    if (updateableData.name !== undefined && (typeof updateableData.name !== 'string' || updateableData.name.trim() === '')) {
        console.warn(`${routeName} Company name cannot be empty if provided for update.`);
        return NextResponse.json({ success: false, message: 'Company name cannot be empty if provided for update.' }, { status: 400 });
    }
    if (updateableData.activeSubscriptionId) {
      const validPlan = SUBSCRIPTION_PLANS.find(p => p.id === updateableData.activeSubscriptionId);
      if (!validPlan) {
          console.warn(`${routeName} Invalid subscription plan ID provided: ${updateableData.activeSubscriptionId}.`);
          return NextResponse.json({ success: false, message: 'Invalid subscription plan ID provided' }, { status: 400 });
      }
    }
    if (updateableData.defaultSalesPaymentStatus && !['paid', 'unpaid'].includes(updateableData.defaultSalesPaymentStatus)){
        console.warn(`${routeName} Invalid default sales payment status: ${updateableData.defaultSalesPaymentStatus}.`);
        return NextResponse.json({ success: false, message: 'Invalid default sales payment status.' }, { status: 400 });
    }
    if (updateableData.defaultPurchasePaymentStatus && !['paid', 'unpaid'].includes(updateableData.defaultPurchasePaymentStatus)){
        console.warn(`${routeName} Invalid default purchase payment status: ${updateableData.defaultPurchasePaymentStatus}.`);
        return NextResponse.json({ success: false, message: 'Invalid default purchase payment status.' }, { status: 400 });
    }

    const originalCompany = db.companies[companyIndex];
    const updatedCompany = { ...originalCompany, ...updateableData };
    if (updateableData.name) updatedCompany.name = updateableData.name.trim();

    db.companies[companyIndex] = updatedCompany;
    await writeDB(db);

    console.log(`${routeName} Company (ID: ${companyId}) updated successfully.`);
    return NextResponse.json({ success: true, data: updatedCompany });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
