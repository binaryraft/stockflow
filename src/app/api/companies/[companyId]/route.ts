
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Company } from '@/types';

// GET a single company by ID
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

// PUT (update) a company by ID
export async function PUT(req: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
    const companyData = await req.json();

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }
    if (!companyData) {
      return NextResponse.json({ success: false, message: 'Company data is required for update' }, { status: 400 });
    }

    const db = await readDB();
    const companyIndex = db.companies.findIndex(c => c.id === companyId);

    if (companyIndex === -1) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    // Selectively update fields, don't allow changing id or token this way
    const { id, token, ...updateableData } = companyData;

    db.companies[companyIndex] = {
      ...db.companies[companyIndex],
      ...updateableData,
    };

    await writeDB(db);

    return NextResponse.json({ success: true, data: db.companies[companyIndex] });
  } catch (error) {
    console.error(`API PUT /api/companies/${params.companyId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

    