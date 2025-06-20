
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { User, Company } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import bcrypt from 'bcryptjs';

const SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE_V2"; // Placeholder for real token mechanism
const SALT_ROUNDS = 10; // Standard salt rounds for bcrypt
const routeNamePrefix = "[API_AUTH_SIGNUP /api/auth/signup]";

export async function POST(req: NextRequest) {
  console.log(`${routeNamePrefix} Received signup request.`);
  try {
    const body = await req.json();
    const { companyName, adminName, email, password } = body;

    // Basic validation for required fields
    if (!companyName || !adminName || !email || !password) {
      console.warn(`${routeNamePrefix} Missing required fields for signup.`);
      return NextResponse.json({ success: false, message: 'All fields (Company Name, Admin Name, Email, Password) are required.' }, { status: 400 });
    }
    if (password.length < 6) {
      console.warn(`${routeNamePrefix} Password too short.`);
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { // Simple email format validation
      console.warn(`${routeNamePrefix} Invalid email format.`);
      return NextResponse.json({ success: false, message: 'Please enter a valid email address.' }, { status: 400 });
    }

    const db = await readDB();

    // Check if an admin with this email already exists
    const existingAdmin = db.users.find(u => u.email?.toLowerCase() === email.toLowerCase() && u.role === 'admin');
    if (existingAdmin) {
      console.warn(`${routeNamePrefix} Signup attempt with existing admin email: ${email}.`);
      return NextResponse.json({ success: false, message: 'An admin account with this email already exists.' }, { status: 409 }); // 409 Conflict
    }

    // Create new company
    const newCompanyId = `comp_${uuidv4()}`;
    const newCompany: Company = {
      id: newCompanyId,
      name: companyName.trim(),
      token: `TOKEN_${uuidv4().toUpperCase()}`, // Placeholder token, ideally more secure
      activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.STARTER, // Default to starter plan
      logoUrl: '', 
      slogan: '', 
      phone: '', 
      address: '', 
      gstNo: '',
      defaultBillNotes: 'Thank you for your business!',
      defaultSalesPaymentStatus: 'paid',
      defaultPurchasePaymentStatus: 'paid',
    };
    db.companies.push(newCompany);
    console.log(`${routeNamePrefix} New company created: ${newCompany.name} (ID: ${newCompanyId}).`);

    // Create new admin user for this company
    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);
    const newAdminUser: User = {
      id: `user_admin_${uuidv4()}`,
      companyId: newCompanyId,
      name: adminName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
    };
    db.users.push(newAdminUser);
    console.log(`${routeNamePrefix} New admin user created: ${newAdminUser.name} for company ${newCompanyId}.`);

    await writeDB(db);
    console.log(`${routeNamePrefix} Database updated with new company and admin user.`);
    
    // Exclude password from the user object returned to the client
    const { password: _, ...userWithoutPassword } = newAdminUser;

    return NextResponse.json({
      success: true,
      message: `Company "${newCompany.name}" and admin user "${newAdminUser.name}" created successfully.`,
      token: SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE, // In a real app, generate a unique JWT
      user: userWithoutPassword,
    }, { status: 201 }); // 201 Created

  } catch (error) {
    console.error(`${routeNamePrefix} Error during signup process:`, error);
    const message = error instanceof Error ? error.message : 'An unexpected internal server error occurred during signup.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
