
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { User } from '@/types'; 
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// GET a single staff member by ID
export async function GET(req: NextRequest, { params }: { params: { staffId: string } }) {
  const routeName = `[API_STAFF_GET /api/staff/${params.staffId}]`;
  console.log(`${routeName} Received request.`);
  try {
    const { staffId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
        console.warn(`${routeName} Company ID is required for authorization.`);
        return NextResponse.json({ success: false, message: 'Company ID is required for authorization' }, { status: 400 });
    }
    if (!staffId) {
        console.warn(`${routeName} Staff ID is required.`);
        return NextResponse.json({ success: false, message: 'Staff ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const staffMember = db.users.find(u => u.id === staffId && u.role === 'employee' && u.companyId === companyId);

    if (!staffMember) {
      console.warn(`${routeName} Staff member not found (ID: ${staffId}) or not part of company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Staff member not found or not part of this company' }, { status: 404 });
    }
    const { password, ...staffWithoutPassword } = staffMember;
    console.log(`${routeName} Staff member found and returned successfully.`);
    return NextResponse.json({ success: true, data: staffWithoutPassword });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a staff member by ID
export async function PUT(req: NextRequest, { params }: { params: { staffId: string } }) {
  const routeName = `[API_STAFF_PUT /api/staff/${params.staffId}]`;
  console.log(`${routeName} Received request to update staff.`);
  try {
    const { staffId } = params;
    const body = await req.json();
    const { staffData, companyId } = body; 

    if (!companyId || !staffData) {
      console.warn(`${routeName} Company ID and staff data are required.`);
      return NextResponse.json({ success: false, message: 'Company ID and staff data are required' }, { status: 400 });
    }
    if (!staffId) {
      console.warn(`${routeName} Staff ID is required.`);
      return NextResponse.json({ success: false, message: 'Staff ID is required' }, { status: 400 });
    }
    if (!staffData.name || !staffData.email || !staffData.phone) {
      console.warn(`${routeName} Name, email, and phone are required in staff data.`);
      return NextResponse.json({ success: false, message: 'Staff name, email, and phone are required.' }, { status: 400 });
    }


    const db = await readDB();
    const staffIndex = db.users.findIndex(u => u.id === staffId && u.role === 'employee');

    if (staffIndex === -1) {
      console.warn(`${routeName} Staff member not found (ID: ${staffId}).`);
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 });
    }

    if (db.users[staffIndex].companyId !== companyId) {
      console.warn(`${routeName} Unauthorized attempt to update staff (ID: ${staffId}) belonging to another company.`);
      return NextResponse.json({ success: false, message: 'Unauthorized to update this staff member' }, { status: 403 });
    }
    
    if (staffData.email) {
        const existingUserWithNewEmail = db.users.find(u => u.email && u.email.toLowerCase() === staffData.email.toLowerCase() && u.id !== staffId && (u.companyId === companyId || u.role === 'admin'));
        if (existingUserWithNewEmail) {
            console.warn(`${routeName} Email "${staffData.email}" is already registered by another user in the company or as an admin.`);
            return NextResponse.json({ success: false, message: 'This email is already registered by another user.' }, { status: 409 });
        }
    }
    
    const updatedStaffData = { ...staffData };
    if (staffData.password && typeof staffData.password === 'string' && staffData.password.trim() !== "") {
        if (staffData.password.length < 6) {
           console.warn(`${routeName} Password must be at least 6 characters long.`);
           return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
        }
      updatedStaffData.password = bcrypt.hashSync(staffData.password, SALT_ROUNDS);
    } else {
      delete updatedStaffData.password; // Don't update password if not provided or empty
    }

    const originalStaff = db.users[staffIndex];
    const updatedStaff: User = {
      ...originalStaff,
      ...updatedStaffData,
      email: staffData.email ? staffData.email.toLowerCase() : originalStaff.email, // Ensure email is lowercased
      id: staffId, 
      companyId: originalStaff.companyId, 
      role: 'employee', 
    };

    db.users[staffIndex] = updatedStaff;
    await writeDB(db);

    const { password, ...staffWithoutPassword } = updatedStaff;
    console.log(`${routeName} Staff member (ID: ${staffId}) updated successfully.`);
    return NextResponse.json({ success: true, data: staffWithoutPassword });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a staff member by ID
export async function DELETE(req: NextRequest, { params }: { params: { staffId: string } }) {
  const routeName = `[API_STAFF_DELETE /api/staff/${params.staffId}]`;
  console.log(`${routeName} Received request.`);
  try {
    const { staffId } = params;
    const { searchParams } = new URL(req.url); 
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeName} Company ID is required for deletion.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion' }, { status: 400 });
    }
    if (!staffId) {
      console.warn(`${routeName} Staff ID is required.`);
      return NextResponse.json({ success: false, message: 'Staff ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const staffIndex = db.users.findIndex(u => u.id === staffId && u.role === 'employee');

    if (staffIndex === -1) {
      console.warn(`${routeName} Staff member not found (ID: ${staffId}).`);
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 });
    }

    if (db.users[staffIndex].companyId !== companyId) {
      console.warn(`${routeName} Unauthorized attempt to delete staff (ID: ${staffId}) belonging to another company.`);
      return NextResponse.json({ success: false, message: 'Unauthorized to delete this staff member' }, { status: 403 });
    }
    
    // Remove staff member from any store's allowedStaffIds list
    db.stores = db.stores.map(store => {
        if (store.companyId === companyId && store.allowedStaffIds?.includes(staffId)) {
            return {
                ...store,
                allowedStaffIds: store.allowedStaffIds.filter(id => id !== staffId)
            };
        }
        return store;
    });

    db.users.splice(staffIndex, 1);
    await writeDB(db);

    console.log(`${routeName} Staff member (ID: ${staffId}) deleted successfully.`);
    return NextResponse.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
