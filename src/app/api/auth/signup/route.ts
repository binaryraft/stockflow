
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { User, Company } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import bcrypt from 'bcryptjs';

const SHARED_AUTH_TOKEN = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE";
const SALT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, adminName, email, password } = body;

    if (!companyName || !adminName || !email || !password) {
      return NextResponse.json({ success: false, message: 'All fields are required for signup (Company Name, Admin Name, Email, Password).' }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }


    const db = await readDB();

    const existingAdmin = db.users.find(u => u.email === email && u.role === 'admin');
    if (existingAdmin) {
      return NextResponse.json({ success: false, message: 'An admin account with this email already exists.' }, { status: 409 });
    }

    const newCompanyId = `comp_${uuidv4()}`;
    const newCompany: Company = {
      id: newCompanyId,
      name: companyName,
      token: `TOKEN_${uuidv4().toUpperCase()}`,
      activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.STARTER, 
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

    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);

    const newAdminUser: User = {
      id: `user_admin_${uuidv4()}`,
      companyId: newCompanyId,
      name: adminName,
      email: email,
      password: hashedPassword,
      role: 'admin',
    };
    db.users.push(newAdminUser);

    await writeDB(db);
    
    const { password: _, ...userWithoutPassword } = newAdminUser;


    return NextResponse.json({
      success: true,
      message: `Company "${newCompany.name}" and admin user "${newAdminUser.name}" created successfully.`,
      token: SHARED_AUTH_TOKEN,
      user: userWithoutPassword,
      // Deprecated direct fields:
      userId: newAdminUser.id,
      userName: newAdminUser.name,
      role: newAdminUser.role,
      companyId: newAdminUser.companyId,
    });

  } catch (error) {
    console.error('Signup API error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred during signup.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
