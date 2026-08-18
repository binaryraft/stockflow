
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import type { Store, User } from '@/types';

const routeNamePrefix = "[API_STORES_SINGLE /api/stores/[storeId]]";

export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  try {
    const { db } = await connectToDatabase();
    const { storeId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId || !storeId) return NextResponse.json({ success: false, message: 'Company and Store ID are required.' }, { status: 400 });

    const store = await db.collection<Store>('stores').findOne({ id: storeId, companyId: companyId });

    if (!store) return NextResponse.json({ success: false, message: 'Store not found.' }, { status: 404 });

    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { storeId: string } }) {
  try {
    const { db } = await connectToDatabase();
    const { storeId } = params;
    const body = await req.json();
    const { storeData, companyId } = body;

    if (!companyId || !storeData || !storeId) {
      return NextResponse.json({ success: false, message: 'Company ID, Store ID, and data are required.' }, { status: 400 });
    }

    const updateFields: Partial<Store> = { ...storeData };
    delete updateFields.id;
    delete updateFields.companyId;

    if (storeData.username) {
      updateFields.username = storeData.username.trim();
      // Check for uniqueness if username is being changed
      const existingUsername = await db.collection<Store>('stores').findOne({
        companyId: companyId,
        username: updateFields.username,
        id: { $ne: storeId } // Exclude current store
      });
      if (existingUsername) {
        return NextResponse.json({ success: false, message: 'Store Username already exists in your company. Please choose another.' }, { status: 400 });
      }
    }

    if (storeData.passkey && storeData.passkey.trim() !== "") {
      if (storeData.passkey.length < 4) {
        return NextResponse.json({ success: false, message: 'New passkey must be at least 4 characters long.' }, { status: 400 });
      }
    } else {
      delete updateFields.passkey;
    }

    const result = await db.collection<Store>('stores').updateOne(
      { id: storeId, companyId: companyId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) return NextResponse.json({ success: false, message: 'Store not found.' }, { status: 404 });

    const updatedStore = await db.collection<Store>('stores').findOne({ id: storeId });
    return NextResponse.json({ success: true, data: updatedStore });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { storeId: string } }) {
  try {
    const { db } = await connectToDatabase();
    const { storeId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId || !storeId) return NextResponse.json({ success: false, message: 'Company and Store ID are required.' }, { status: 400 });

    const result = await db.collection<Store>('stores').deleteOne({ id: storeId, companyId: companyId });
    if (result.deletedCount === 0) return NextResponse.json({ success: false, message: 'Store not found.' }, { status: 404 });

    // Remove this storeId from any staff member's assignedStoreIds
    await db.collection<User>('users').updateMany(
      { companyId: companyId, assignedStoreIds: storeId },
      { $pull: { assignedStoreIds: storeId } }
    );

    return NextResponse.json({ success: true, message: 'Store deleted successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
