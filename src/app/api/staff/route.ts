
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { User, Company } from '@/types'; 
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// GET all staff for a company
export async function GET(req: NextRequest) {
  const routeName = "[API_STAFF_GET_ALL /api/staff]";
  console.log(`${routeName} Received request.`);
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const companyStaff = db.users.filter(u => u.companyId === companyId && u.role === 'employee')
                           .map(({ password, ...staffWithoutPassword }) => staffWithoutPassword);
    console.log(`${routeName} Found ${companyStaff.length} staff members for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyStaff });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new staff member for a company
export async function POST(req: NextRequest) {
  const routeName = "[API_STAFF_POST /api/staff]";
  console.log(`${routeName} Received request to create a new staff member.`);
  try {
    const body = await req.json();
    const { staffData, companyId } = body;

    if (!companyId || !staffData || !staffData.name || !staffData.email || !staffData.password || !staffData.phone) {
      console.warn(`${routeName} Missing required fields: companyId, staffData (name, email, password, phone).`);
      return NextResponse.json({ success: false, message: 'Company ID and complete staff data (name, email, password, phone) are required' }, { status: 400 });
    }
    if (staffData.password.length < 6) {
      console.warn(`${routeName} Password too short.`);
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
     if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffData.email)) {
      console.warn(`${routeName} Invalid email format for staff.`);
      return NextResponse.json({ success: false, message: 'Invalid email format for staff member.' }, { status: 400 });
    }


    const db = await readDB();
    const company = db.companies.find(c => c.id === companyId);
    if (!company) {
      console.warn(`${routeName} Company not found (ID: ${companyId}). Cannot add staff.`);
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === company.activeSubscriptionId);
    if (!plan) {
      console.warn(`${routeName} Company subscription plan not found or invalid for company ${companyId}.`);
      // Fallback to a default behavior or return error, for now, let's assume a default or check won't block if plan is missing
      // For production, this should be a hard error or a clearly defined default limit.
      // return NextResponse.json({ success: false, message: 'Company subscription plan not found or invalid.' }, { status: 400 });
    }

    const currentStaffCount = db.users.filter(u => u.companyId === companyId && u.role === 'employee').length;
    if (plan && currentStaffCount >= plan.maxEmployees) {
      console.warn(`${routeName} Employee limit reached for company ${companyId} on plan ${plan.name}.`);
      return NextResponse.json({ success: false, message: `Employee limit reached for your current plan (${plan.name}). Max ${plan.maxEmployees} employees allowed.` }, { status: 403 });
    }
    
    const existingUser = db.users.find(u => u.email && u.email.toLowerCase() === staffData.email.toLowerCase() && (u.companyId === companyId || u.role === 'admin'));
    if (existingUser) {
      console.warn(`${routeName} Email "${staffData.email}" is already registered.`);
      return NextResponse.json({ success: false, message: 'This email is already registered.' }, { status: 409 });
    }

    const hashedPassword = bcrypt.hashSync(staffData.password, SALT_ROUNDS);
    const newStaffId = `user_emp_${uuidv4()}`;
    const newStaffEmployeeId = staffData.employeeId || `EMP${String(currentStaffCount + 1).padStart(3, '0')}_${newStaffId.slice(-4)}`;


    const newStaff: User = {
      id: newStaffId,
      companyId: companyId,
      name: staffData.name,
      email: staffData.email.toLowerCase(),
      employeeId: newStaffEmployeeId,
      password: hashedPassword,
      role: 'employee',
      assignedStoreIds: staffData.assignedStoreIds || [],
      phone: staffData.phone,
    };

    db.users.push(newStaff);
    await writeDB(db);

    const { password, ...staffWithoutPassword } = newStaff;
    console.log(`${routeName} New staff member "${newStaff.name}" (ID: ${newStaff.id}) created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: staffWithoutPassword }, { status: 201 });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
