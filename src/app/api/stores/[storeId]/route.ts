
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Store } from '@/types';

// GET a single store by ID
export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeName = `[API_STORES_GET /api/stores/${params.storeId}]`;
  console.log(`${routeName} Received request.`);
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url); 
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeName} Company ID is required for authorization.`);
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }
    if (!storeId) {
      console.warn(`${routeName} Store ID is required.`);
      return NextResponse.json({ success: false, message: 'Store ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId && s.companyId === companyId); 

    if (!store) {
      console.warn(`${routeName} Store not found (ID: ${storeId}) or does not belong to company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Store not found or does not belong to this company' }, { status: 404 });
    }
    console.log(`${routeName} Store found and returned successfully.`);
    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a store by ID
export async function PUT(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeName = `[API_STORES_PUT /api/stores/${params.storeId}]`;
  console.log(`${routeName} Received request to update store.`);
  try {
    const { storeId } = params;
    const body = await req.json();
    const { storeData, companyId } = body; 

    if (!companyId || !storeData) {
      console.warn(`${routeName} Company ID and store data are required.`);
      return NextResponse.json({ success: false, message: 'Company ID and store data are required' }, { status: 400 });
    }
    if (!storeId) {
      console.warn(`${routeName} Store ID is required.`);
      return NextResponse.json({ success: false, message: 'Store ID is required' }, { status: 400 });
    }
    if (!storeData.name || !storeData.location || !storeData.email || !storeData.phone) {
      console.warn(`${routeName} Store name, location, email, and phone are required in store data.`);
      return NextResponse.json({ success: false, message: 'Store name, location, email, and phone are required' }, { status: 400 });
    }
    if (!storeData.allowedOperations || !Array.isArray(storeData.allowedOperations) || storeData.allowedOperations.length === 0) {
      console.warn(`${routeName} At least one operation must be allowed for the store.`);
      return NextResponse.json({ success: false, message: 'At least one operation must be allowed for the store' }, { status: 400 });
    }

    const db = await readDB();
    const storeIndex = db.stores.findIndex(s => s.id === storeId);

    if (storeIndex === -1) {
      console.warn(`${routeName} Store not found (ID: ${storeId}).`);
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }

    if (db.stores[storeIndex].companyId !== companyId) {
      console.warn(`${routeName} Unauthorized attempt to update store (ID: ${storeId}) belonging to another company.`);
      return NextResponse.json({ success: false, message: 'Unauthorized to update this store' }, { status: 403 });
    }
    
    const originalStore = db.stores[storeIndex];
    const updatedStoreDataPartial = { ...storeData };
    
    if (storeData.passkey && typeof storeData.passkey === 'string' && storeData.passkey.trim() !== "") {
      if (storeData.passkey.length < 4) {
        console.warn(`${routeName} New passkey must be at least 4 characters long if provided.`);
        return NextResponse.json({ success: false, message: 'New passkey must be at least 4 characters long if you intend to change it.' }, { status: 400 });
      }
      // Passkey will be updated from storeData
    } else {
      delete updatedStoreDataPartial.passkey; // Explicitly remove if empty or not provided, to keep existing
    }

    const updatedStore: Store = {
      ...originalStore, // Start with all original fields
      ...updatedStoreDataPartial, // Override with validated fields from payload
      id: storeId, // Ensure ID is not changed
      companyId: originalStore.companyId, // Ensure companyId is not changed
    };

    db.stores[storeIndex] = updatedStore;
    await writeDB(db);

    console.log(`${routeName} Store (ID: ${storeId}) updated successfully.`);
    return NextResponse.json({ success: true, data: updatedStore });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a store by ID
export async function DELETE(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeName = `[API_STORES_DELETE /api/stores/${params.storeId}]`;
  console.log(`${routeName} Received request.`);
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url); 
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeName} Company ID is required for deletion.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion' }, { status: 400 });
    }
    if (!storeId) {
      console.warn(`${routeName} Store ID is required.`);
      return NextResponse.json({ success: false, message: 'Store ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const storeIndex = db.stores.findIndex(s => s.id === storeId);

    if (storeIndex === -1) {
      console.warn(`${routeName} Store not found (ID: ${storeId}).`);
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }

    if (db.stores[storeIndex].companyId !== companyId) {
      console.warn(`${routeName} Unauthorized attempt to delete store (ID: ${storeId}) belonging to another company.`);
      return NextResponse.json({ success: false, message: 'Unauthorized to delete this store' }, { status: 403 });
    }
    
    // Remove this storeId from any staff member's assignedStoreIds for this company
    db.users = db.users.map(user => {
        if (user.companyId === companyId && user.assignedStoreIds?.includes(storeId)) {
            return {
                ...user,
                assignedStoreIds: user.assignedStoreIds.filter(id => id !== storeId)
            };
        }
        return user;
    });

    db.stores.splice(storeIndex, 1);
    await writeDB(db);

    console.log(`${routeName} Store (ID: ${storeId}) deleted successfully.`);
    return NextResponse.json({ success: true, message: 'Store deleted successfully' });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
