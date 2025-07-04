
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { User, Store } from '@/types'; 
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const routeNamePrefix = "[API_STAFF_SINGLE /api/staff/[staffId]]";

export async function GET(req: NextRequest, { params }: { params: { staffId: string } }) {
  try {
    const { db } = await connectToDatabase();
    const { staffId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId || !staffId) return NextResponse.json({ success: false, message: 'Company and Staff ID are required.' }, { status: 400 });

    const staffMember = await db.collection<User>('users').findOne(
      { id: staffId, role: 'employee', companyId: companyId },
      { projection: { password: 0 } }
    );

    if (!staffMember) return NextResponse.json({ success: false, message: 'Staff member not found.' }, { status: 404 });
    
    return NextResponse.json({ success: true, data: staffMember });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { staffId: string } }) {
  try {
    const { db } = await connectToDatabase();
    const { staffId } = params;
    const body = await req.json();
    const { staffData, companyId } = body;

    if (!companyId || !staffData || !staffId) {
      return NextResponse.json({ success: false, message: 'Company ID, Staff ID, and data are required.' }, { status: 400 });
    }

    const updateFields: Partial<User> = { ...staffData };
    delete updateFields.id;
    delete updateFields.companyId;
    delete updateFields.role;

    if (staffData.password && staffData.password.trim() !== "") {
      updateFields.password = bcrypt.hashSync(staffData.password, SALT_ROUNDS);
    } else {
      delete updateFields.password;
    }

    const result = await db.collection<User>('users').updateOne(
      { id: staffId, companyId: companyId, role: 'employee' },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) return NextResponse.json({ success: false, message: 'Staff member not found.' }, { status: 404 });
    
    const updatedStaff = await db.collection<User>('users').findOne({ id: staffId }, { projection: { password: 0 } });
    return NextResponse.json({ success: true, data: updatedStaff });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { staffId: string } }) {
  try {
    const { db } = await connectToDatabase();
    const { staffId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId || !staffId) return NextResponse.json({ success: false, message: 'Company and Staff ID are required.' }, { status: 400 });

    const result = await db.collection<User>('users').deleteOne({ id: staffId, companyId: companyId, role: 'employee' });
    if (result.deletedCount === 0) return NextResponse.json({ success: false, message: 'Staff member not found.' }, { status: 404 });

    // Also remove from any store's allowedStaffIds
    await db.collection<Store>('stores').updateMany(
      { companyId: companyId, allowedStaffIds: staffId },
      { $pull: { allowedStaffIds: staffId } }
    );

    return NextResponse.json({ success: true, message: 'Staff member deleted successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
