
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { User, Company } from '@/types'; // User type represents staff
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

// GET all staff for a company
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    // Filter users by companyId and role 'employee'
    const companyStaff = db.users.filter(u => u.companyId === companyId && u.role === 'employee');
    return NextResponse.json({ success: true, data: companyStaff });
  } catch (error) {
    console.error('API GET /api/staff error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new staff member for a company
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffData, companyId } = body;

    if (!companyId || !staffData || !staffData.name || !staffData.email || !staffData.password) {
      return NextResponse.json({ success: false, message: 'Company ID and complete staff data (name, email, password) are required' }, { status: 400 });
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
    
    // Check if email is already used by another employee in the same company or by an admin
    const existingUser = db.users.find(u => u.email === staffData.email && (u.companyId === companyId || u.role === 'admin'));
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'This email is already registered.' }, { status: 409 });
    }


    const newStaff: User = {
      id: `user_emp_${uuidv4()}`,
      companyId: companyId,
      name: staffData.name,
      email: staffData.email,
      employeeId: staffData.employeeId || `EMP${String(currentStaffCount + 1).padStart(3, '0')}`, // Simple Employee ID generation
      password: staffData.password, // Plaintext for prototype
      role: 'employee',
      assignedStoreIds: staffData.assignedStoreIds || [],
    };

    db.users.push(newStaff);
    await writeDB(db);

    return NextResponse.json({ success: true, data: newStaff }, { status: 201 });
  } catch (error) {
    console.error('API POST /api/staff error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
