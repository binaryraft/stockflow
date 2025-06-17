
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Bill } from '@/types';

// GET a single bill by ID
export async function GET(req: NextRequest, { params }: { params: { billId: string } }) {
  try {
    const { billId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const bill = db.bills.find(b => b.id === billId && b.companyId === companyId);

    if (!bill) {
      return NextResponse.json({ success: false, message: 'Bill not found or does not belong to this company' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: bill });
  } catch (error) {
    console.error(`API GET /api/bills/${params.billId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) non-critical details of a bill by ID (e.g., paymentStatus, notes)
export async function PUT(req: NextRequest, { params }: { params: { billId: string } }) {
  try {
    const { billId } = params;
    const body = await req.json();
    const { companyId, paymentStatus, notes } = body;

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }
    if (paymentStatus === undefined && notes === undefined) {
        return NextResponse.json({ success: false, message: 'At least one field (paymentStatus or notes) must be provided for update' }, { status: 400 });
    }


    const db = await readDB();
    const billIndex = db.bills.findIndex(b => b.id === billId && b.companyId === companyId);

    if (billIndex === -1) {
      return NextResponse.json({ success: false, message: 'Bill not found or not associated with this company' }, { status: 404 });
    }

    const billToUpdate = db.bills[billIndex];

    if (paymentStatus !== undefined) {
        if (billToUpdate.type === 'sell' || billToUpdate.type === 'buy') {
            billToUpdate.paymentStatus = paymentStatus;
        } else {
            // Payment status might not be applicable for returns or estimates
        }
    }
    if (notes !== undefined) {
      billToUpdate.notes = notes;
    }
    
    db.bills[billIndex] = billToUpdate;
    await writeDB(db);

    return NextResponse.json({ success: true, data: billToUpdate });
  } catch (error) {
    console.error(`API PUT /api/bills/${params.billId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a bill by ID
export async function DELETE(req: NextRequest, { params }: { params: { billId: string } }) {
  try {
    const { billId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion' }, { status: 400 });
    }

    const db = await readDB();
    const initialLength = db.bills.length;
    db.bills = db.bills.filter(b => !(b.id === billId && b.companyId === companyId));

    if (db.bills.length === initialLength) {
      return NextResponse.json({ success: false, message: 'Bill not found or not associated with this company' }, { status: 404 });
    }

    // IMPORTANT: Inventory stock levels are NOT automatically readjusted upon bill deletion in this simplified db.json implementation.
    // True transactional rollbacks would require a more sophisticated database system.
    await writeDB(db);
    return NextResponse.json({ success: true, message: 'Bill deleted successfully. Note: Stock levels were not automatically readjusted.' });
  } catch (error) {
    console.error(`API DELETE /api/bills/${params.billId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
