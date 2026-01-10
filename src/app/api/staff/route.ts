
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { User, Company } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const routeNamePrefix = "[API_STAFF_COLLECTION /api/staff]";

export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });

    const companyStaff = await db.collection<User>('users')
      .find({ companyId: companyId, role: 'employee' })
      .toArray();

    return NextResponse.json({ success: true, data: companyStaff });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const { staffData, companyId } = body;

    if (!companyId || !staffData || !staffData.name || !staffData.email || !staffData.password || !staffData.phone) {
      return NextResponse.json({ success: false, message: 'Complete staff data and Company ID are required.' }, { status: 400 });
    }

    const company = await db.collection<Company>('companies').findOne({ id: companyId });
    if (!company) return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === company.activeSubscriptionId);
    const currentStaffCount = await db.collection<User>('users').countDocuments({ companyId: companyId, role: 'employee' });
    if (plan && currentStaffCount >= plan.maxEmployees) {
      return NextResponse.json({ success: false, message: `Employee limit reached for your current plan.` }, { status: 403 });
    }

    const existingUser = await db.collection<User>('users').findOne({ email: staffData.email.toLowerCase(), companyId: companyId });
    if (existingUser) return NextResponse.json({ success: false, message: 'This email is already registered.' }, { status: 409 });

    // Store as plain text as per request to allow admin visibility
    // const hashedPassword = bcrypt.hashSync(staffData.password, SALT_ROUNDS);
    const newStaffId = `user_emp_${uuidv4()}`;
    const newStaffEmployeeId = staffData.employeeId || `EMP${String(currentStaffCount + 1).padStart(3, '0')}`;

    const newStaff: User = {
      id: newStaffId,
      companyId: companyId,
      name: staffData.name.trim(),
      email: staffData.email.toLowerCase(),
      employeeId: newStaffEmployeeId,
      password: staffData.password, // Plain text storage
      role: 'employee',
      assignedStoreIds: Array.isArray(staffData.assignedStoreIds) ? staffData.assignedStoreIds : [],
      phone: staffData.phone.trim(),
    };

    await db.collection<User>('users').insertOne(newStaff);

    const { password, ...staffWithoutPassword } = newStaff;
    return NextResponse.json({ success: true, data: staffWithoutPassword }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
