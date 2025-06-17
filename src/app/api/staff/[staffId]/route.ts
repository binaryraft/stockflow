
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { User } from '@/types'; 
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function GET(req: NextRequest, { params }: { params: { staffId: string } }) {
  try {
    const { staffId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
        return NextResponse.json({ success: false, message: 'Company ID is required for authorization' }, { status: 400 });
    }

    const db = await readDB();
    const staffMember = db.users.find(u => u.id === staffId && u.role === 'employee' && u.companyId === companyId);

    if (!staffMember) {
      return NextResponse.json({ success: false, message: 'Staff member not found or not part of this company' }, { status: 404 });
    }
    const { password, ...staffWithoutPassword } = staffMember;
    return NextResponse.json({ success: true, data: staffWithoutPassword });
  } catch (error) {
    console.error(`API GET /api/staff/${params.staffId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { staffId: string } }) {
  try {
    const { staffId } = params;
    const body = await req.json();
    const { staffData, companyId } = body; 

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
    
    if (staffData.email) {
        const existingUserWithNewEmail = db.users.find(u => u.email === staffData.email && u.id !== staffId && (u.companyId === companyId || u.role === 'admin'));
        if (existingUserWithNewEmail) {
            return NextResponse.json({ success: false, message: 'This email is already registered by another user.' }, { status: 409 });
        }
    }
    
    const updatedStaffData = { ...staffData };
    if (staffData.password && staffData.password.trim() !== "") {
        if (staffData.password.length < 6) {
           return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
        }
      updatedStaffData.password = bcrypt.hashSync(staffData.password, SALT_ROUNDS);
    } else {
      delete updatedStaffData.password; // Don't update password if not provided or empty
    }


    const updatedStaff: User = {
      ...db.users[staffIndex],
      ...updatedStaffData,
      id: staffId, 
      companyId: db.users[staffIndex].companyId, 
      role: 'employee', 
    };

    db.users[staffIndex] = updatedStaff;
    await writeDB(db);

    const { password, ...staffWithoutPassword } = updatedStaff;
    return NextResponse.json({ success: true, data: staffWithoutPassword });
  } catch (error) {
    console.error(`API PUT /api/staff/${params.staffId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { staffId: string } }) {
  try {
    const { staffId } = params;
    const { searchParams } = new URL(req.url); 
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

    return NextResponse.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (error)
{
    console.error(`API DELETE /api/staff/${params.staffId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
