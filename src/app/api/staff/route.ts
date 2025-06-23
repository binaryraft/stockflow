
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { User, Company } from '@/types'; 
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const routeNamePrefix = "[API_STAFF_COLLECTION /api/staff]";

// GET all staff for a company
export async function GET(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} GET`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }

    const db = await readDB();
    const companyStaff = db.users
                           .filter(u => u.companyId === companyId && u.role === 'employee')
                           .map(({ password, ...staffWithoutPassword }) => staffWithoutPassword); // Exclude passwords

    console.log(`${routeLogName} Found ${companyStaff.length} staff members for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyStaff });
  } catch (error) {
    console.error(`${routeLogName} Error fetching staff:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new staff member for a company
export async function POST(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} POST`;
  console.log(`${routeLogName} Received request to create a new staff member.`);
  try {
    const body = await req.json();
    // Expect staffData and companyId in the body
    const { staffData, companyId } = body; 

    if (!companyId || !staffData || 
        !staffData.name || typeof staffData.name !== 'string' || staffData.name.trim() === '' ||
        !staffData.email || typeof staffData.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffData.email) ||
        !staffData.password || typeof staffData.password !== 'string' || staffData.password.trim() === '' ||
        !staffData.phone || typeof staffData.phone !== 'string' || staffData.phone.trim().length < 10) {
      console.warn(`${routeNamePrefix} Missing or invalid fields. Required: companyId, staffData (name, valid email, password, phone min 10 digits).`);
      return NextResponse.json({ success: false, message: 'Company ID and complete staff data (name, valid email, password, phone min 10 digits) are required.' }, { status: 400 });
    }
    if (staffData.password.length < 6) { // Password policy
      console.warn(`${routeNamePrefix} Password too short. Must be at least 6 characters.`);
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const db = await readDB();
    const company = db.companies.find(c => c.id === companyId);
    if (!company) {
      console.warn(`${routeNamePrefix} Company not found (ID: ${companyId}). Cannot add staff.`);
      return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === company.activeSubscriptionId);
    if (!plan) {
      console.warn(`${routeNamePrefix} Company subscription plan not found or invalid for company ${companyId}. Allowing add by default but this is an issue.`);
      // In a production app, this might be a hard error or a fallback to a very restrictive default.
    }

    const currentStaffCount = db.users.filter(u => u.companyId === companyId && u.role === 'employee').length;
    if (plan && currentStaffCount >= plan.maxEmployees) {
      console.warn(`${routeNamePrefix} Employee limit (${plan.maxEmployees}) reached for company ${companyId} on plan ${plan.name}.`);
      return NextResponse.json({ success: false, message: `Employee limit reached for your current plan (${plan.name}). Max ${plan.maxEmployees} employees allowed.` }, { status: 403 }); // 403 Forbidden
    }
    
    // Check for email collision within the same company or with an admin email
    const newEmailLower = staffData.email.toLowerCase();
    const existingUser = db.users.find(u => 
        u.email && u.email.toLowerCase() === newEmailLower && 
        (u.companyId === companyId || u.role === 'admin') // Check if email exists in this company OR as any admin
    );
    if (existingUser) {
      console.warn(`${routeNamePrefix} Email "${staffData.email}" is already registered in this company or by an admin.`);
      return NextResponse.json({ success: false, message: 'This email is already registered.' }, { status: 409 }); // 409 Conflict
    }

    const hashedPassword = bcrypt.hashSync(staffData.password, SALT_ROUNDS);
    const newStaffId = `user_emp_${uuidv4()}`;
    // Generate a more robust employeeId if not provided
    const newStaffEmployeeId = staffData.employeeId || `EMP${String(currentStaffCount + 1).padStart(3, '0')}_${newStaffId.substring(newStaffId.length - 4)}`;


    const newStaff: User = {
      id: newStaffId,
      companyId: companyId,
      name: staffData.name.trim(),
      email: newEmailLower,
      employeeId: newStaffEmployeeId,
      password: hashedPassword,
      role: 'employee',
      assignedStoreIds: Array.isArray(staffData.assignedStoreIds) ? staffData.assignedStoreIds : [],
      phone: staffData.phone.trim(),
    };

    db.users.push(newStaff);
    await writeDB(db);

    const { password, ...staffWithoutPassword } = newStaff; // Exclude password from response
    console.log(`${routeNamePrefix} New staff member "${newStaff.name}" (ID: ${newStaff.id}) created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: staffWithoutPassword }, { status: 201 }); // 201 Created
  } catch (error) {
    console.error(`${routeNamePrefix} Error creating staff member:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
