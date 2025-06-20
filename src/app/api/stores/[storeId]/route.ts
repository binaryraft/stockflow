
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Store, BillMode } from '@/types';

const routeNamePrefix = "[API_STORES_SINGLE /api/stores/[storeId]]";

// GET a single store by ID
export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/stores/${params.storeId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url); 
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required for authorization.`);
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }
    if (!storeId) {
      console.warn(`${routeLogName} Store ID is required.`);
      return NextResponse.json({ success: false, message: 'Store ID is required.' }, { status: 400 });
    }

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId && s.companyId === companyId); 

    if (!store) {
      console.warn(`${routeLogName} Store not found (ID: ${storeId}) or does not belong to company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Store not found or does not belong to this company.' }, { status: 404 });
    }
    console.log(`${routeLogName} Store (ID: ${storeId}) found and returned successfully.`);
    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error(`${routeLogName} Error fetching store:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a store by ID
export async function PUT(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeLogName = `${routeNamePrefix} PUT /api/stores/${params.storeId}`;
  console.log(`${routeLogName} Received request to update store.`);
  try {
    const { storeId } = params;
    const body = await req.json();
    // Expect storeData and companyId in the body for authorization and data
    const { storeData, companyId } = body; 

    if (!companyId || !storeData) {
      console.warn(`${routeLogName} Company ID and store data are required in the request body.`);
      return NextResponse.json({ success: false, message: 'Company ID and store data are required.' }, { status: 400 });
    }
    if (!storeId) {
      console.warn(`${routeLogName} Store ID is required in URL path.`);
      return NextResponse.json({ success: false, message: 'Store ID is required in URL path.' }, { status: 400 });
    }
    // Basic validation for core store data fields
    if (!storeData.name || typeof storeData.name !== 'string' || storeData.name.trim() === '' ||
        !storeData.location || typeof storeData.location !== 'string' || storeData.location.trim() === '' ||
        !storeData.email || typeof storeData.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storeData.email) ||
        !storeData.phone || typeof storeData.phone !== 'string' || storeData.phone.trim().length < 10) {
      console.warn(`${routeLogName} Store name, location, valid email, and phone (min 10 digits) are required in store data.`);
      return NextResponse.json({ success: false, message: 'Store name, location, a valid email, and a phone number (min 10 digits) are required.' }, { status: 400 });
    }
    if (!storeData.allowedOperations || !Array.isArray(storeData.allowedOperations) || storeData.allowedOperations.length === 0 || 
        !storeData.allowedOperations.every((op: BillMode) => ['sell', 'buy', 'return'].includes(op))) {
      console.warn(`${routeLogName} At least one valid operation (sell, buy, return) must be allowed for the store.`);
      return NextResponse.json({ success: false, message: 'At least one valid operation (sell, buy, return) must be allowed for the store.' }, { status: 400 });
    }

    const db = await readDB();
    const storeIndex = db.stores.findIndex(s => s.id === storeId);

    if (storeIndex === -1) {
      console.warn(`${routeLogName} Store not found (ID: ${storeId}).`);
      return NextResponse.json({ success: false, message: 'Store not found.' }, { status: 404 });
    }

    // Authorization: Ensure the store being updated belongs to the requesting company
    if (db.stores[storeIndex].companyId !== companyId) {
      console.warn(`${routeLogName} Unauthorized attempt to update store (ID: ${storeId}) belonging to company ${db.stores[storeIndex].companyId} by company ${companyId}.`);
      return NextResponse.json({ success: false, message: 'Unauthorized to update this store.' }, { status: 403 });
    }
    
    const originalStore = db.stores[storeIndex];
    const updatedStoreDataPartial = { ...storeData };
    
    // Handle passkey update: only update if a new, non-empty passkey is provided and meets length requirement
    if (storeData.passkey && typeof storeData.passkey === 'string' && storeData.passkey.trim() !== "") {
      if (storeData.passkey.length < 4) { // Passkey policy
        console.warn(`${routeLogName} New passkey must be at least 4 characters long if provided.`);
        return NextResponse.json({ success: false, message: 'New passkey must be at least 4 characters long if you intend to change it.' }, { status: 400 });
      }
      // Passkey will be updated from storeData if valid
    } else {
      delete updatedStoreDataPartial.passkey; // Remove passkey from update if not provided or empty, to keep existing one
    }

    const updatedStore: Store = {
      ...originalStore, // Start with all original fields
      ...updatedStoreDataPartial, // Override with validated fields from payload
      // Ensure these critical fields are not changed from original record
      id: storeId, 
      companyId: originalStore.companyId, 
    };

    db.stores[storeIndex] = updatedStore;
    await writeDB(db);

    console.log(`${routeLogName} Store (ID: ${storeId}) updated successfully.`);
    return NextResponse.json({ success: true, data: updatedStore });
  } catch (error) {
    console.error(`${routeLogName} Error updating store:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a store by ID
export async function DELETE(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeLogName = `${routeNamePrefix} DELETE /api/stores/${params.storeId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url); 
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required for deletion authorization.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion authorization.' }, { status: 400 });
    }
    if (!storeId) {
      console.warn(`${routeLogName} Store ID is required.`);
      return NextResponse.json({ success: false, message: 'Store ID is required.' }, { status: 400 });
    }

    const db = await readDB();
    const storeIndex = db.stores.findIndex(s => s.id === storeId);

    if (storeIndex === -1) {
      console.warn(`${routeLogName} Store not found (ID: ${storeId}).`);
      return NextResponse.json({ success: false, message: 'Store not found.' }, { status: 404 });
    }

    // Authorization: Ensure the store being deleted belongs to the requesting company
    if (db.stores[storeIndex].companyId !== companyId) {
      console.warn(`${routeLogName} Unauthorized attempt to delete store (ID: ${storeId}) belonging to another company.`);
      return NextResponse.json({ success: false, message: 'Unauthorized to delete this store.' }, { status: 403 });
    }
    
    // Remove this storeId from any staff member's assignedStoreIds list within the same company
    db.users = db.users.map(user => {
        if (user.companyId === companyId && user.assignedStoreIds?.includes(storeId)) {
            return {
                ...user,
                assignedStoreIds: user.assignedStoreIds.filter(id => id !== storeId)
            };
        }
        return user;
    });
    // Also remove from company's 'staffs' array if it's being used and relevant
    // db.staffs = db.staffs.map(staff => { ... similar logic ... });

    db.stores.splice(storeIndex, 1); // Remove the store
    await writeDB(db);

    console.log(`${routeLogName} Store (ID: ${storeId}) deleted successfully from company (ID: ${companyId}).`);
    return NextResponse.json({ success: true, message: 'Store deleted successfully.' });
  } catch (error) {
    console.error(`${routeLogName} Error deleting store:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
