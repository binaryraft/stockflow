
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { User, Company } from '@/types'; 
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const companyStaff = db.users.filter(u => u.companyId === companyId && u.role === 'employee')
                           .map(({ password, ...staffWithoutPassword }) => staffWithoutPassword); // Exclude passwords
    return NextResponse.json({ success: true, data: companyStaff });
  } catch (error) {
    console.error('API GET /api/staff error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffData, companyId } = body;

    if (!companyId || !staffData || !staffData.name || !staffData.email || !staffData.password) {
      return NextResponse.json({ success: false, message: 'Company ID and complete staff data (name, email, password) are required' }, { status: 400 });
    }
    if (staffData.password.length < 6) {
        return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }


    const db = await readDB();

    const company = db.companies.find(c => c.id === companyId);
    if (!company) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === company.activeSubscriptionId);
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Company subscription plan not found or invalid.' }, { status: 400 });
    }

    const currentStaffCount = db.users.filter(u => u.companyId === companyId && u.role === 'employee').length;
    if (currentStaffCount >= plan.maxEmployees) {
      return NextResponse.json({ success: false, message: `Employee limit reached for your current plan (${plan.name}). Max ${plan.maxEmployees} employees allowed.` }, { status: 403 });
    }
    
    const existingUser = db.users.find(u => u.email === staffData.email && (u.companyId === companyId || u.role === 'admin'));
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'This email is already registered.' }, { status: 409 });
    }

    const hashedPassword = bcrypt.hashSync(staffData.password, SALT_ROUNDS);

    const newStaff: User = {
      id: `user_emp_${uuidv4()}`,
      companyId: companyId,
      name: staffData.name,
      email: staffData.email,
      employeeId: staffData.employeeId || `EMP${String(currentStaffCount + 1).padStart(3, '0')}`, 
      password: hashedPassword,
      role: 'employee',
      assignedStoreIds: staffData.assignedStoreIds || [],
      // phone: staffData.phone, // Ensure phone is included if part of staffData
    };
    if (staffData.phone) (newStaff as any).phone = staffData.phone;


    db.users.push(newStaff);
    await writeDB(db);

    const { password, ...staffWithoutPassword } = newStaff;
    return NextResponse.json({ success: true, data: staffWithoutPassword }, { status: 201 });
  } catch (error) {
    console.error('API POST /api/staff error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
