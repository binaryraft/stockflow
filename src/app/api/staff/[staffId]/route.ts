
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { User } from '@/types'; // User type represents staff

// GET a single staff member by ID (might not be strictly needed)
export async function GET(req: NextRequest, { params }: { params: { staffId: string } }) {
  try {
    const { staffId } = params;
    // const { searchParams } = new URL(req.url); // Potentially get companyId
    // const companyId = searchParams.get('companyId');

    const db = await readDB();
    const staffMember = db.users.find(u => u.id === staffId && u.role === 'employee'); // Add && u.companyId === companyId

    if (!staffMember) {
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: staffMember });
  } catch (error) {
    console.error(`API GET /api/staff/${params.staffId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a staff member by ID
export async function PUT(req: NextRequest, { params }: { params: { staffId: string } }) {
  try {
    const { staffId } = params;
    const body = await req.json();
    const { staffData, companyId } = body; // Expect staffData and companyId to verify ownership

    if (!companyId || !staffData) {
      return NextResponse.json({ success: false, message: 'Company ID and staff data are required' }, { status: 400 });
    }

    const db = await readDB();
    const staffIndex = db.users.findIndex(u => u.id === staffId && u.role === 'employee');

    if (staffIndex === -1) {
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 });
    }

    if (db.users[staffIndex].companyId !== companyId) {
      return NextResponse.json({ success: false, message: 'Unauthorized to update this staff member' }, { status: 403 });
    }
    
    const existingUserWithNewEmail = db.users.find(u => u.email === staffData.email && u.id !== staffId && (u.companyId === companyId || u.role === 'admin'));
    if (existingUserWithNewEmail) {
        return NextResponse.json({ success: false, message: 'This email is already registered by another user.' }, { status: 409 });
    }
    
    const passwordToUpdate = staffData.password?.trim();
    const updatedStaffData = { ...staffData };
     if (!passwordToUpdate) { // If password is empty or undefined in payload, keep existing
      delete updatedStaffData.password;
    } else {
      updatedStaffData.password = passwordToUpdate;
    }


    const updatedStaff: User = {
      ...db.users[staffIndex],
      ...updatedStaffData,
      id: staffId, // Ensure ID is not changed
      companyId: db.users[staffIndex].companyId, // Ensure companyId is not changed
      role: 'employee', // Ensure role remains employee
    };

    db.users[staffIndex] = updatedStaff;
    await writeDB(db);

    return NextResponse.json({ success: true, data: updatedStaff });
  } catch (error) {
    console.error(`API PUT /api/staff/${params.staffId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a staff member by ID
export async function DELETE(req: NextRequest, { params }: { params: { staffId: string } }) {
  try {
    const { staffId } = params;
    const { searchParams } = new URL(req.url); // Get companyId from query for ownership check
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion' }, { status: 400 });
    }

    const db = await readDB();
    const staffIndex = db.users.findIndex(u => u.id === staffId && u.role === 'employee');

    if (staffIndex === -1) {
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 });
    }

    if (db.users[staffIndex].companyId !== companyId) {
      return NextResponse.json({ success: false, message: 'Unauthorized to delete this staff member' }, { status: 403 });
    }
    
    // Also remove this staffId from any store's allowedStaffIds
    db.stores = db.stores.map(store => {
        if (store.allowedStaffIds?.includes(staffId)) {
            return {
                ...store,
                allowedStaffIds: store.allowedStaffIds.filter(id => id !== staffId)
            };
        }
        return store;
    });


    db.users.splice(staffIndex, 1);
    await writeDB(db);

    return NextResponse.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error(`API DELETE /api/staff/${params.staffId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
