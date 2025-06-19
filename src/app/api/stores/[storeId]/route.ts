
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Store } from '@/types';

export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url); 
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }
    if (!storeId) {
      return NextResponse.json({ success: false, message: 'Store ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId && s.companyId === companyId); 

    if (!store) {
      return NextResponse.json({ success: false, message: 'Store not found or does not belong to this company' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error(`API GET /api/stores/${params.storeId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    const body = await req.json();
    const { storeData, companyId } = body; 

    if (!companyId || !storeData) {
      return NextResponse.json({ success: false, message: 'Company ID and store data are required' }, { status: 400 });
    }
    if (!storeId) {
      return NextResponse.json({ success: false, message: 'Store ID is required' }, { status: 400 });
    }
    if (!storeData.name || !storeData.location || !storeData.email || !storeData.phone) {
        return NextResponse.json({ success: false, message: 'Store name, location, email, and phone are required' }, { status: 400 });
    }
    if (!storeData.allowedOperations || storeData.allowedOperations.length === 0) {
        return NextResponse.json({ success: false, message: 'At least one operation must be allowed for the store' }, { status: 400 });
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

    if (passkeyToUpdate && passkeyToUpdate.length >= 4) {
      updatedStoreData.passkey = passkeyToUpdate;
    } else if (passkeyToUpdate && passkeyToUpdate.length > 0 && passkeyToUpdate.length < 4) {
        return NextResponse.json({ success: false, message: 'New passkey must be at least 4 characters long if you intend to change it.' }, { status: 400 });
    } else {
      // If passkey is empty string "" or undefined in payload, keep existing passkey from db
      // If passkey is explicitly null, it might mean to clear it, but our schema implies passkey is required.
      // So, we ensure it's always present by falling back to existing.
      updatedStoreData.passkey = db.stores[storeIndex].passkey;
    }

    const updatedStore: Store = {
      ...db.stores[storeIndex],
      ...updatedStoreData,
      id: storeId, 
      companyId: db.stores[storeIndex].companyId, 
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

export async function DELETE(req: NextRequest, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url); 
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion' }, { status: 400 });
    }
    if (!storeId) {
      return NextResponse.json({ success: false, message: 'Store ID is required' }, { status: 400 });
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

    