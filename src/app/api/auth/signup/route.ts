
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import type { User, Company, SubscriptionType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLAN_IDS, DEFAULT_CURRENCY_CODE } from '@/lib/constants';
import bcrypt from 'bcryptjs';

const SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE_V2";
const SALT_ROUNDS = 10;
const routeNamePrefix = "[API_AUTH_SIGNUP /api/auth/signup]";

export async function POST(req: NextRequest) {
  console.log(`${routeNamePrefix} Received signup request.`);
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const { companyName, adminName, email, password, planId, subscriptionType } = body;

    if (!companyName || !adminName || !email || !password || !planId || !subscriptionType) {
      console.warn(`${routeNamePrefix} Missing required fields for signup.`);
      return NextResponse.json({ success: false, message: 'All fields, including plan and billing cycle, are required.' }, { status: 400 });
    }
    if (password.length < 6) {
      console.warn(`${routeNamePrefix} Password too short for email: ${email}.`);
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.warn(`${routeNamePrefix} Invalid email format: ${email}.`);
      return NextResponse.json({ success: false, message: 'Please enter a valid email address.' }, { status: 400 });
    }

    const existingAdmin = await db.collection<User>('users').findOne({ email: email.toLowerCase(), role: 'admin' });
    if (existingAdmin) {
      console.warn(`${routeNamePrefix} Signup attempt with existing admin email: ${email}.`);
      return NextResponse.json({ success: false, message: 'An admin account with this email already exists.' }, { status: 409 });
    }

    const newCompanyId = `comp_${uuidv4()}`;
    const newCompany: Company = {
      id: newCompanyId,
      name: companyName.trim(),
      token: `TOKEN_${uuidv4().toUpperCase()}`,
      activeSubscriptionId: planId,
      logoUrl: '',
      slogan: '',
      phone: '',
      address: '',
      gstNo: '',
      defaultBillNotes: 'Thank you for your business!',
      defaultSalesPaymentStatus: 'paid',
      defaultPurchasePaymentStatus: 'paid',
      currency: DEFAULT_CURRENCY_CODE,
      subscriptionType: subscriptionType as SubscriptionType,
      paymentStatus: 'pending',
      creationDate: new Date().toISOString(),
      subscriptionStartDate: null,
      subscriptionExpiryDate: null,
    };
    await db.collection<Company>('companies').insertOne(newCompany);
    console.log(`${routeNamePrefix} New company created: ${newCompany.name} (ID: ${newCompanyId}). Payment status: PENDING.`);

    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);
    const newAdminUser: User = {
      id: `user_admin_${uuidv4()}`,
      companyId: newCompanyId,
      name: adminName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
    };
    await db.collection<User>('users').insertOne(newAdminUser);
    console.log(`${routeNamePrefix} New admin user created: ${newAdminUser.name} (Email: ${newAdminUser.email}) for company ${newCompanyId}.`);
    
    const { password: _, ...userWithoutPassword } = newAdminUser;

    return NextResponse.json({
      success: true,
      message: `Company "${newCompany.name}" and admin user "${newAdminUser.name}" created successfully.`,
      token: SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE,
      user: userWithoutPassword,
    }, { status: 201 });

  } catch (error) {
    console.error(`${routeNamePrefix} Critical error during signup process:`, error);
    const message = error instanceof Error ? error.message : 'An unexpected internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
