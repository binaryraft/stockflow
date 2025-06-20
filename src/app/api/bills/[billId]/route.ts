
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Bill } from '@/types';

const routeNamePrefix = "[API_BILLS_SINGLE /api/bills/[billId]]";

// GET a single bill by ID
export async function GET(req: NextRequest, { params }: { params: { billId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/bills/${params.billId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { billId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }
    if (!billId) {
      console.warn(`${routeLogName} Bill ID is required.`);
      return NextResponse.json({ success: false, message: 'Bill ID is required.' }, { status: 400 });
    }

    const db = await readDB();
    const bill = db.bills.find(b => b.id === billId && b.companyId === companyId);

    if (!bill) {
      console.warn(`${routeLogName} Bill not found (ID: ${billId}) or does not belong to company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Bill not found or does not belong to this company.' }, { status: 404 });
    }
    console.log(`${routeLogName} Bill found and returned successfully.`);
    return NextResponse.json({ success: true, data: bill });
  } catch (error) {
    console.error(`${routeLogName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a bill by ID (for non-critical details like payment status and notes)
export async function PUT(req: NextRequest, { params }: { params: { billId: string } }) {
  const routeLogName = `${routeNamePrefix} PUT /api/bills/${params.billId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { billId } = params;
    const body = await req.json();
    // Ensure companyId is passed in the body for PUT requests for authorization context
    const { companyId, paymentStatus, notes } = body; 

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required in the request body.`);
      return NextResponse.json({ success: false, message: 'Company ID is required in the request body.' }, { status: 400 });
    }
    if (!billId) {
      console.warn(`${routeLogName} Bill ID is required.`);
      return NextResponse.json({ success: false, message: 'Bill ID is required.' }, { status: 400 });
    }
    if (paymentStatus === undefined && notes === undefined) {
      console.warn(`${routeLogName} At least one field (paymentStatus or notes) must be provided for update.`);
      return NextResponse.json({ success: false, message: 'At least one field (paymentStatus or notes) must be provided for update.' }, { status: 400 });
    }
    if (paymentStatus !== undefined && !['paid', 'unpaid'].includes(paymentStatus)) {
      console.warn(`${routeLogName} Invalid payment status: ${paymentStatus}. Must be 'paid' or 'unpaid'.`);
      return NextResponse.json({ success: false, message: "Invalid payment status provided. Must be 'paid' or 'unpaid'." }, { status: 400 });
    }

    const db = await readDB();
    const billIndex = db.bills.findIndex(b => b.id === billId && b.companyId === companyId);

    if (billIndex === -1) {
      console.warn(`${routeLogName} Bill not found (ID: ${billId}) or not associated with company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Bill not found or not associated with this company.' }, { status: 404 });
    }

    const billToUpdate = { ...db.bills[billIndex] };
    let updated = false;

    if (paymentStatus !== undefined) {
        // Payment status updates are generally only for 'sell' or 'buy' bills that are not estimates
        if ((billToUpdate.type === 'sell' || billToUpdate.type === 'buy') && !billToUpdate.isEstimate) {
            billToUpdate.paymentStatus = paymentStatus;
            updated = true;
        } else {
             console.warn(`${routeLogName} Payment status update attempted for bill type '${billToUpdate.type}' (ID: ${billId}) which does not support it or is an estimate.`);
             // Optionally return an error or just proceed without updating payment status.
             // For now, we'll just log and not update if not applicable.
        }
    }
    if (notes !== undefined) { // notes can be an empty string
      billToUpdate.notes = notes;
      updated = true;
    }
    
    if (updated) {
      db.bills[billIndex] = billToUpdate;
      await writeDB(db);
      console.log(`${routeLogName} Bill details updated successfully for bill ID: ${billId}.`);
      return NextResponse.json({ success: true, data: billToUpdate });
    } else {
      console.log(`${routeLogName} No applicable fields were updated for bill ID: ${billId}.`);
      return NextResponse.json({ success: true, message: "No applicable fields updated.", data: billToUpdate });
    }

  } catch (error) {
    console.error(`${routeLogName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a bill by ID
export async function DELETE(req: NextRequest, { params }: { params: { billId: string } }) {
  const routeLogName = `${routeNamePrefix} DELETE /api/bills/${params.billId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { billId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required for deletion.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion.' }, { status: 400 });
    }
    if (!billId) {
      console.warn(`${routeLogName} Bill ID is required for deletion.`);
      return NextResponse.json({ success: false, message: 'Bill ID is required for deletion.' }, { status: 400 });
    }

    const db = await readDB();
    const initialLength = db.bills.length;
    
    // Filter out the bill to be deleted, ensuring it belongs to the correct company
    db.bills = db.bills.filter(b => !(b.id === billId && b.companyId === companyId));

    if (db.bills.length === initialLength) {
      console.warn(`${routeLogName} Bill not found (ID: ${billId}) or not associated with company (ID: ${companyId}). No deletion occurred.`);
      return NextResponse.json({ success: false, message: 'Bill not found or not associated with this company.' }, { status: 404 });
    }

    await writeDB(db);
    console.log(`${routeLogName} Bill (ID: ${billId}) deleted successfully for company (ID: ${companyId}). Stock levels were NOT automatically readjusted.`);
    // Note: Re-adjusting stock from a deleted bill is complex and depends on FIFO/LIFO etc.
    // For this application, we assume deletion is an admin action and stock adjustments are manual or handled elsewhere.
    return NextResponse.json({ success: true, message: 'Bill deleted successfully. Note: Stock levels were not automatically readjusted by this operation.' });
  } catch (error) {
    console.error(`${routeLogName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
