
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { User, Company } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import bcrypt from 'bcryptjs';

const SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE_V2";
const SALT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  console.log("[API_AUTH_SIGNUP] Received signup request.");
  try {
    const body = await req.json();
    const { companyName, adminName, email, password } = body;

    if (!companyName || !adminName || !email || !password) {
      console.warn("[API_AUTH_SIGNUP] Missing required fields for signup.");
      return NextResponse.json({ success: false, message: 'All fields are required: Company Name, Admin Name, Email, Password.' }, { status: 400 });
    }
    if (password.length < 6) {
      console.warn("[API_AUTH_SIGNUP] Password too short.");
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.warn("[API_AUTH_SIGNUP] Invalid email format.");
      return NextResponse.json({ success: false, message: 'Invalid email format.' }, { status: 400 });
    }

    const db = await readDB();

    const existingAdmin = db.users.find(u => u.email?.toLowerCase() === email.toLowerCase() && u.role === 'admin');
    if (existingAdmin) {
      console.warn(`[API_AUTH_SIGNUP] Signup attempt with existing admin email: ${email}.`);
      return NextResponse.json({ success: false, message: 'An admin account with this email already exists.' }, { status: 409 });
    }

    const newCompanyId = `comp_${uuidv4()}`;
    const newCompany: Company = {
      id: newCompanyId,
      name: companyName.trim(),
      token: `TOKEN_${uuidv4().toUpperCase()}`,
      activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.STARTER,
      logoUrl: '', slogan: '', phone: '', address: '', gstNo: '',
      defaultBillNotes: 'Thank you for your business!',
      defaultSalesPaymentStatus: 'paid',
      defaultPurchasePaymentStatus: 'paid',
    };
    db.companies.push(newCompany);
    console.log(`[API_AUTH_SIGNUP] New company created: ${newCompany.name} (ID: ${newCompanyId}).`);

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
    console.log(`[API_AUTH_SIGNUP] New admin user created: ${newAdminUser.name} for company ${newCompanyId}.`);

    await writeDB(db);
    console.log("[API_AUTH_SIGNUP] Database updated with new company and admin user.");
    
    const { password: _, ...userWithoutPassword } = newAdminUser;

    return NextResponse.json({
      success: true,
      message: `Company "${newCompany.name}" and admin user "${newAdminUser.name}" created successfully.`,
      token: SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE,
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error('[API_AUTH_SIGNUP] Error during signup:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred during signup.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
