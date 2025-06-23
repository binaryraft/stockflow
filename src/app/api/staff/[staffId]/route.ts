
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { User } from '@/types'; 
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const routeNamePrefix = "[API_STAFF_SINGLE /api/staff/[staffId]]";

// GET a single staff member by ID
export async function GET(req: NextRequest, { params }: { params: { staffId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/staff/${params.staffId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { staffId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
        console.warn(`${routeLogName} Company ID is required for authorization.`);
        return NextResponse.json({ success: false, message: 'Company ID is required for authorization.' }, { status: 400 });
    }
    if (!staffId) {
        console.warn(`${routeLogName} Staff ID is required.`);
        return NextResponse.json({ success: false, message: 'Staff ID is required.' }, { status: 400 });
    }

    const db = await readDB();
    // Ensure we only fetch users with 'employee' role for this endpoint
    const staffMember = db.users.find(u => u.id === staffId && u.role === 'employee' && u.companyId === companyId);

    if (!staffMember) {
      console.warn(`${routeLogName} Staff member not found (ID: ${staffId}), not an employee, or not part of company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Staff member not found, not an employee, or not part of this company.' }, { status: 404 });
    }
    const { password, ...staffWithoutPassword } = staffMember; // Exclude password from response
    console.log(`${routeLogName} Staff member (ID: ${staffId}) found and returned successfully.`);
    return NextResponse.json({ success: true, data: staffWithoutPassword });
  } catch (error) {
    console.error(`${routeLogName} Error fetching staff member:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a staff member by ID
export async function PUT(req: NextRequest, { params }: { params: { staffId: string } }) {
  const routeLogName = `${routeNamePrefix} PUT /api/staff/${params.staffId}`;
  console.log(`${routeLogName} Received request to update staff.`);
  try {
    const { staffId } = params;
    const body = await req.json();
    // Expect staffData and companyId in the body for authorization and data
    const { staffData, companyId } = body; 

    if (!companyId || !staffData) {
      console.warn(`${routeLogName} Company ID and staff data are required in the request body.`);
      return NextResponse.json({ success: false, message: 'Company ID and staff data are required.' }, { status: 400 });
    }
    if (!staffId) {
      console.warn(`${routeLogName} Staff ID is required in URL path.`);
      return NextResponse.json({ success: false, message: 'Staff ID is required in URL path.' }, { status: 400 });
    }
    // Basic validation for core staff data fields
    if (!staffData.name || typeof staffData.name !== 'string' || staffData.name.trim() === '' || 
        !staffData.email || typeof staffData.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffData.email) ||
        !staffData.phone || typeof staffData.phone !== 'string' || staffData.phone.trim().length < 10) {
      console.warn(`${routeNamePrefix} Name (non-empty), valid email, and phone (min 10 digits) are required in staff data.`);
      return NextResponse.json({ success: false, message: 'Staff name, a valid email, and a phone number (min 10 digits) are required.' }, { status: 400 });
    }


    const db = await readDB();
    const staffIndex = db.users.findIndex(u => u.id === staffId && u.role === 'employee');

    if (staffIndex === -1) {
      console.warn(`${routeLogName} Staff member not found (ID: ${staffId}) or is not an employee.`);
      return NextResponse.json({ success: false, message: 'Staff member not found or is not an employee.' }, { status: 404 });
    }

    // Authorization: Ensure the staff member being updated belongs to the requesting company
    if (db.users[staffIndex].companyId !== companyId) {
      console.warn(`${routeLogName} Unauthorized attempt to update staff (ID: ${staffId}) belonging to company ${db.users[staffIndex].companyId} by company ${companyId}.`);
      return NextResponse.json({ success: false, message: 'Unauthorized to update this staff member.' }, { status: 403 });
    }
    
    // Check for email collision within the same company or with an admin email
    if (staffData.email) {
        const newEmailLower = staffData.email.toLowerCase();
        const existingUserWithNewEmail = db.users.find(u => 
            u.email && u.email.toLowerCase() === newEmailLower && u.id !== staffId && 
            (u.companyId === companyId || u.role === 'admin') // Check within company or if it's an admin email
        );
        if (existingUserWithNewEmail) {
            console.warn(`${routeNamePrefix} Email "${staffData.email}" is already registered by another user in this company or as an admin.`);
            return NextResponse.json({ success: false, message: 'This email is already registered.' }, { status: 409 }); // 409 Conflict
        }
    }
    
    const updatedStaffData = { ...staffData };
    // Handle password update: only hash and update if a new, non-empty password is provided
    if (staffData.password && typeof staffData.password === 'string' && staffData.password.trim() !== "") {
        if (staffData.password.length < 6) { // Password policy check
           console.warn(`${routeNamePrefix} Password must be at least 6 characters long.`);
           return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
        }
      updatedStaffData.password = bcrypt.hashSync(staffData.password, SALT_ROUNDS);
    } else {
      delete updatedStaffData.password; // Ensure password isn't accidentally cleared if not provided
    }

    const originalStaff = db.users[staffIndex];
    const updatedStaff: User = {
      ...originalStaff,
      ...updatedStaffData, // Apply updates from staffData
      email: staffData.email ? staffData.email.toLowerCase() : originalStaff.email, // Ensure email is lowercased
      // Ensure these critical fields are not changed from original record or are explicitly set
      id: staffId, 
      companyId: originalStaff.companyId, 
      role: 'employee', // Role should not change via this endpoint
    };

    db.users[staffIndex] = updatedStaff;
    await writeDB(db);

    const { password, ...staffWithoutPassword } = updatedStaff; // Exclude password from response
    console.log(`${routeNamePrefix} Staff member (ID: ${staffId}) updated successfully.`);
    return NextResponse.json({ success: true, data: staffWithoutPassword });
  } catch (error) {
    console.error(`${routeLogName} Error updating staff member:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a staff member by ID
export async function DELETE(req: NextRequest, { params }: { params: { staffId: string } }) {
  const routeLogName = `${routeNamePrefix} DELETE /api/staff/${params.staffId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { staffId } = params;
    const { searchParams } = new URL(req.url); 
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required for deletion authorization.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion authorization.' }, { status: 400 });
    }
    if (!staffId) {
      console.warn(`${routeLogName} Staff ID is required.`);
      return NextResponse.json({ success: false, message: 'Staff ID is required.' }, { status: 400 });
    }

    const db = await readDB();
    const staffIndex = db.users.findIndex(u => u.id === staffId && u.role === 'employee');

    if (staffIndex === -1) {
      console.warn(`${routeLogName} Staff member not found (ID: ${staffId}) or is not an employee.`);
      return NextResponse.json({ success: false, message: 'Staff member not found or is not an employee.' }, { status: 404 });
    }

    // Authorization: Ensure the staff member being deleted belongs to the requesting company
    if (db.users[staffIndex].companyId !== companyId) {
      console.warn(`${routeLogName} Unauthorized attempt to delete staff (ID: ${staffId}) belonging to another company.`);
      return NextResponse.json({ success: false, message: 'Unauthorized to delete this staff member.' }, { status: 403 });
    }
    
    // Remove staff member from any store's allowedStaffIds list within the same company
    db.stores = db.stores.map(store => {
        if (store.companyId === companyId && store.allowedStaffIds?.includes(staffId)) {
            return {
                ...store,
                allowedStaffIds: store.allowedStaffIds.filter(id => id !== staffId)
            };
        }
        return store;
    });

    db.users.splice(staffIndex, 1); // Remove the staff user
    await writeDB(db);

    console.log(`${routeNamePrefix} Staff member (ID: ${staffId}) deleted successfully from company (ID: ${companyId}).`);
    return NextResponse.json({ success: true, message: 'Staff member deleted successfully.' });
  } catch (error) {
    console.error(`${routeNamePrefix} Error deleting staff member:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
