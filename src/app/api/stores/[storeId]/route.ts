
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Store } from '@/types';

// GET a single store by ID (might not be strictly needed if client fetches all for company)
export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    // const { searchParams } = new URL(req.url); // Potentially get companyId for stricter check
    // const companyId = searchParams.get('companyId');

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId); // Add && s.companyId === companyId for strict check

    if (!store) {
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error(`API GET /api/stores/${params.storeId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a store by ID
export async function PUT(req: NextRequest, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    const body = await req.json();
    const { storeData, companyId } = body; // Expect storeData and companyId to verify ownership

    if (!companyId || !storeData) {
      return NextResponse.json({ success: false, message: 'Company ID and store data are required' }, { status: 400 });
    }

    const db = await readDB();
    const storeIndex = db.stores.findIndex(s => s.id === storeId);

    if (storeIndex === -1) {
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }

    if (db.stores[storeIndex].companyId !== companyId) {
      return NextResponse.json({ success: false, message: 'Unauthorized to update this store' }, { status: 403 });
    }
    
    const passkeyToUpdate = storeData.passkey?.trim();
    const updatedStoreData = { ...storeData };
    if (!passkeyToUpdate) { // If passkey is empty or undefined in payload, keep existing
      delete updatedStoreData.passkey;
    } else {
      updatedStoreData.passkey = passkeyToUpdate;
    }


    const updatedStore: Store = {
      ...db.stores[storeIndex],
      ...updatedStoreData,
      id: storeId, // Ensure ID is not changed
      companyId: db.stores[storeIndex].companyId, // Ensure companyId is not changed
    };

    db.stores[storeIndex] = updatedStore;
    await writeDB(db);

    return NextResponse.json({ success: true, data: updatedStore });
  } catch (error) {
    console.error(`API PUT /api/stores/${params.storeId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a store by ID
export async function DELETE(req: NextRequest, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url); // Get companyId from query for ownership check
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion' }, { status: 400 });
    }

    const db = await readDB();
    const storeIndex = db.stores.findIndex(s => s.id === storeId);

    if (storeIndex === -1) {
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }

    if (db.stores[storeIndex].companyId !== companyId) {
      return NextResponse.json({ success: false, message: 'Unauthorized to delete this store' }, { status: 403 });
    }
    
    // Also remove this storeId from any staff member's assignedStoreIds
    db.users = db.users.map(user => {
        if (user.assignedStoreIds?.includes(storeId)) {
            return {
                ...user,
                assignedStoreIds: user.assignedStoreIds.filter(id => id !== storeId)
            };
        }
        return user;
    });


    db.stores.splice(storeIndex, 1);
    await writeDB(db);

    return NextResponse.json({ success: true, message: 'Store deleted successfully' });
  } catch (error) {
    console.error(`API DELETE /api/stores/${params.storeId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
