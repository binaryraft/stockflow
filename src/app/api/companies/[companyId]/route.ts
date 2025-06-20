
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Company } from '@/types';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS, SUPPORTED_CURRENCIES } from '@/lib/constants';

const routeNamePrefix = "[API_COMPANIES_SINGLE /api/companies/[companyId]]";

// GET a single company by ID
export async function GET(req: NextRequest, { params }: { params: { companyId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/companies/${params.companyId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { companyId } = params;

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }

    const db = await readDB();
    const company = db.companies.find(c => c.id === companyId);

    if (!company) {
      console.warn(`${routeLogName} Company not found (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });
    }
    console.log(`${routeLogName} Company (ID: ${companyId}) found and returned successfully.`);
    return NextResponse.json({ success: true, data: company });
  } catch (error) {
    console.error(`${routeLogName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a company by ID
export async function PUT(req: NextRequest, { params }: { params: { companyId: string } }) {
  const routeLogName = `${routeNamePrefix} PUT /api/companies/${params.companyId}`;
  console.log(`${routeLogName} Received request to update company.`);
  try {
    const { companyId } = params;
    const companyDataToUpdate = await req.json();

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required in URL path.`);
      return NextResponse.json({ success: false, message: 'Company ID is required in URL path.' }, { status: 400 });
    }
    if (!companyDataToUpdate || Object.keys(companyDataToUpdate).length === 0) {
      console.warn(`${routeLogName} Company data is required in the request body for update.`);
      return NextResponse.json({ success: false, message: 'Company data is required in the request body for update.' }, { status: 400 });
    }

    const db = await readDB();
    const companyIndex = db.companies.findIndex(c => c.id === companyId);

    if (companyIndex === -1) {
      console.warn(`${routeLogName} Company not found (ID: ${companyId}). Cannot update.`);
      return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });
    }

    const { id, token, ...updateableData } = companyDataToUpdate;

    if (updateableData.name !== undefined && (typeof updateableData.name !== 'string' || updateableData.name.trim() === '')) {
        console.warn(`${routeLogName} Company name cannot be empty if provided for update.`);
        return NextResponse.json({ success: false, message: 'Company name cannot be empty if provided for update.' }, { status: 400 });
    }
    if (updateableData.activeSubscriptionId) {
      const validPlan = SUBSCRIPTION_PLANS.find(p => p.id === updateableData.activeSubscriptionId);
      if (!validPlan || updateableData.activeSubscriptionId === SUBSCRIPTION_PLAN_IDS.ENTERPRISE) { 
          console.warn(`${routeLogName} Invalid or restricted subscription plan ID provided: ${updateableData.activeSubscriptionId}.`);
          return NextResponse.json({ success: false, message: 'Invalid or restricted subscription plan ID provided.' }, { status: 400 });
      }
    }
    if (updateableData.defaultSalesPaymentStatus && !['paid', 'unpaid'].includes(updateableData.defaultSalesPaymentStatus)){
        console.warn(`${routeLogName} Invalid default sales payment status: ${updateableData.defaultSalesPaymentStatus}. Must be 'paid' or 'unpaid'.`);
        return NextResponse.json({ success: false, message: "Invalid default sales payment status. Must be 'paid' or 'unpaid'." }, { status: 400 });
    }
    if (updateableData.defaultPurchasePaymentStatus && !['paid', 'unpaid'].includes(updateableData.defaultPurchasePaymentStatus)){
        console.warn(`${routeLogName} Invalid default purchase payment status: ${updateableData.defaultPurchasePaymentStatus}. Must be 'paid' or 'unpaid'.`);
        return NextResponse.json({ success: false, message: "Invalid default purchase payment status. Must be 'paid' or 'unpaid'." }, { status: 400 });
    }
    if (updateableData.currency && !SUPPORTED_CURRENCIES.find(c => c.code === updateableData.currency)) {
        console.warn(`${routeLogName} Invalid currency code provided: ${updateableData.currency}.`);
        return NextResponse.json({ success: false, message: 'Invalid currency code provided.' }, { status: 400 });
    }


    const originalCompany = db.companies[companyIndex];
    const updatedCompany = { ...originalCompany, ...updateableData };
    if (updateableData.name) updatedCompany.name = updateableData.name.trim();

    db.companies[companyIndex] = updatedCompany;
    await writeDB(db);

    console.log(`${routeLogName} Company (ID: ${companyId}) updated successfully.`);
    return NextResponse.json({ success: true, data: updatedCompany });
  } catch (error) {
    console.error(`${routeLogName} Error updating company:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
