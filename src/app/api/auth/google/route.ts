
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import type { User } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE_V2";
const routeNamePrefix = "[API_AUTH_GOOGLE /api/auth/google]";

interface GooglePayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

async function verifyGoogleCredential(credential: string): Promise<GooglePayload | null> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );
    if (!response.ok) return null;
    const payload: GooglePayload = await response.json();
    if (!payload.sub || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  console.log(`${routeNamePrefix} Received Google auth request.`);
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json({ success: false, message: 'Google credential is required.' }, { status: 400 });
    }

    const googleUser = await verifyGoogleCredential(credential);
    if (!googleUser) {
      return NextResponse.json({ success: false, message: 'Invalid Google credential.' }, { status: 401 });
    }

    const email = googleUser.email.toLowerCase();

    let existingUser = await db.collection<User>('users').findOne({ email, role: 'admin' });

    if (!existingUser) {
      const newCompanyId = `comp_${uuidv4()}`;
      
      const newCompany = {
        id: newCompanyId,
        name: `${googleUser.name}'s Company`,
        token: `TOKEN_${uuidv4().toUpperCase()}`,
        activeSubscriptionId: 'growth',
        logoUrl: '',
        slogan: '',
        phone: '',
        address: '',
        gstNo: '',
        defaultBillNotes: 'Thank you for your business!',
        defaultSalesPaymentStatus: 'paid',
        defaultPurchasePaymentStatus: 'paid',
        currency: 'INR',
        subscriptionType: 'monthly',
        paymentStatus: 'pending',
        creationDate: new Date().toISOString(),
        subscriptionStartDate: null,
        subscriptionExpiryDate: null,
      };
      await db.collection('companies').insertOne(newCompany);
      console.log(`${routeNamePrefix} New company created for Google user: ${newCompany.name} (ID: ${newCompanyId}).`);

      const newUser: User = {
        id: `user_admin_${uuidv4()}`,
        companyId: newCompanyId,
        name: googleUser.name,
        email: email,
        role: 'admin',
      };
      await db.collection<User>('users').insertOne(newUser);
      console.log(`${routeNamePrefix} New admin user created via Google: ${newUser.name} (Email: ${newUser.email}).`);
      existingUser = newUser;
    } else {
      console.log(`${routeNamePrefix} Existing admin user found via Google: ${existingUser.name} (Email: ${email}).`);
    }

    const { password: _, ...userWithoutPassword } = existingUser as User;

    return NextResponse.json({
      success: true,
      message: `Welcome, ${userWithoutPassword.name}!`,
      token: SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE,
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error(`${routeNamePrefix} Critical error during Google auth:`, error);
    const message = error instanceof Error ? error.message : 'An unexpected internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
