
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import type { Bill } from '@/types';

const routeNamePrefix = "[API_BILLS_SINGLE /api/bills/[billId]]";

export async function GET(req: NextRequest, { params }: { params: { billId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/bills/${params.billId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { db } = await connectToDatabase();
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

    const bill = await db.collection<Bill>('bills').findOne({ id: billId, companyId: companyId });

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

export async function PUT(req: NextRequest, { params }: { params: { billId: string } }) {
  const routeLogName = `${routeNamePrefix} PUT /api/bills/${params.billId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { db } = await connectToDatabase();
    const { billId } = params;
    const body = await req.json();
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
      return NextResponse.json({ success: false, message: 'At least one field (paymentStatus or notes) must be provided for update.' }, { status: 400 });
    }
    if (paymentStatus !== undefined && !['paid', 'unpaid'].includes(paymentStatus)) {
      return NextResponse.json({ success: false, message: "Invalid payment status provided. Must be 'paid' or 'unpaid'." }, { status: 400 });
    }

    const billToUpdate = await db.collection<Bill>('bills').findOne({ id: billId, companyId: companyId });

    if (!billToUpdate) {
      return NextResponse.json({ success: false, message: 'Bill not found or not associated with this company.' }, { status: 404 });
    }

    const updateFields: Partial<Bill> = {};
    if (paymentStatus !== undefined && (billToUpdate.type === 'sell' || billToUpdate.type === 'buy') && !billToUpdate.isEstimate) {
      updateFields.paymentStatus = paymentStatus;
    }
    if (notes !== undefined) {
      updateFields.notes = notes;
    }

    if (Object.keys(updateFields).length > 0) {
      const result = await db.collection<Bill>('bills').updateOne({ id: billId, companyId: companyId }, { $set: updateFields });
      if (result.modifiedCount === 1) {
        const updatedBill = { ...billToUpdate, ...updateFields };
        console.log(`${routeLogName} Bill details updated successfully for bill ID: ${billId}.`);
        return NextResponse.json({ success: true, data: updatedBill });
      }
    }
    
    console.log(`${routeLogName} No applicable fields were updated for bill ID: ${billId}.`);
    return NextResponse.json({ success: true, message: "No applicable fields updated.", data: billToUpdate });
  } catch (error) {
    console.error(`${routeLogName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { billId: string } }) {
  const routeLogName = `${routeNamePrefix} DELETE /api/bills/${params.billId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { db } = await connectToDatabase();
    const { billId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion.' }, { status: 400 });
    }
    if (!billId) {
      return NextResponse.json({ success: false, message: 'Bill ID is required for deletion.' }, { status: 400 });
    }
    
    const result = await db.collection('bills').deleteOne({ id: billId, companyId: companyId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Bill not found or not associated with this company.' }, { status: 404 });
    }

    console.log(`${routeLogName} Bill (ID: ${billId}) deleted successfully for company (ID: ${companyId}). Stock levels were NOT automatically readjusted.`);
    return NextResponse.json({ success: true, message: 'Bill deleted successfully. Note: Stock levels were not automatically readjusted by this operation.' });
  } catch (error) {
    console.error(`${routeLogName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
