
import { NextRequest, NextResponse } from 'next/server';
import { readDB } from '@/lib/db-access';
import type { User, Store } from '@/types';
import bcrypt from 'bcryptjs';

const SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE_V2";
const routeNamePrefix = "[API_AUTH_LOGIN /api/auth/login]";

export async function POST(req: NextRequest) {
  console.log(`${routeNamePrefix} Received login request.`);
  try {
    const body = await req.json();
    const { loginType, email, password, employeeId, companyId, storeId, storePasskey } = body;

    if (!loginType) {
      console.warn(`${routeNamePrefix} Login type is required.`);
      return NextResponse.json({ success: false, message: 'Login type is required.' }, { status: 400 });
    }

    const db = await readDB();
    let authenticatedUser: User | undefined = undefined;
    let authenticatedStore: Store | undefined = undefined;

    if (loginType === 'admin') {
      if (!email || !password) {
        console.warn(`${routeNamePrefix} Email and password are required for admin login.`);
        return NextResponse.json({ success: false, message: 'Email and password are required for admin login.' }, { status: 400 });
      }
      const userToVerify = db.users.find(u => u.role === 'admin' && u.email?.toLowerCase() === email.toLowerCase());
      if (userToVerify) {
        console.log(`${routeNamePrefix} Admin user found by email: ${email}. Attempting password verification.`);
        if (userToVerify.password && bcrypt.compareSync(password, userToVerify.password)) {
          authenticatedUser = userToVerify;
          console.log(`${routeNamePrefix} Admin user ${email} password verified successfully.`);
        } else {
          console.warn(`${routeNamePrefix} Admin user ${email} password verification FAILED. Provided password did not match stored hash.`);
        }
      } else {
        console.warn(`${routeNamePrefix} No admin user found with email: ${email}.`);
      }
    } else if (loginType === 'employee') {
      if (!employeeId || !password || !companyId) {
        console.warn(`${routeNamePrefix} Employee ID, password, and company context are required for employee login.`);
        return NextResponse.json({ success: false, message: 'Employee ID, password, and company context are required for employee login.' }, { status: 400 });
      }
      const userToVerify = db.users.find(u => u.role === 'employee' && u.employeeId === employeeId && u.companyId === companyId);
      if (userToVerify) {
        console.log(`${routeNamePrefix} Employee found: ID ${employeeId} for company ${companyId}. Attempting password verification.`);
        if (userToVerify.password && bcrypt.compareSync(password, userToVerify.password)) {
          authenticatedUser = userToVerify;
          console.log(`${routeNamePrefix} Employee ${employeeId} password verified successfully.`);
        } else {
          console.warn(`${routeNamePrefix} Employee ${employeeId} password verification FAILED. Provided password did not match stored hash.`);
        }
      } else {
        console.warn(`${routeNamePrefix} No employee found with ID: ${employeeId} for company ${companyId}.`);
      }
    } else if (loginType === 'store') {
      if (!companyId || !storeId || !storePasskey) {
        console.warn(`${routeNamePrefix} Company ID, Store ID, and Store Passkey are required for store terminal login.`);
        return NextResponse.json({ success: false, message: 'Company ID, Store ID, and Store Passkey are required for store terminal login.' }, { status: 400 });
      }
      authenticatedStore = db.stores.find(s => s.companyId === companyId && s.id === storeId && s.passkey === storePasskey);
      if (authenticatedStore) {
        console.log(`${routeNamePrefix} Store terminal ${storeId} for company ${companyId} authenticated successfully.`);
        return NextResponse.json({
          success: true,
          message: `Store terminal for ${authenticatedStore.name} authenticated.`,
          store: {
            id: authenticatedStore.id,
            name: authenticatedStore.name,
            companyId: authenticatedStore.companyId,
            location: authenticatedStore.location,
            allowedOperations: authenticatedStore.allowedOperations,
          }
        });
      } else {
        console.warn(`${routeNamePrefix} Store terminal login failed for storeId: ${storeId}, companyId: ${companyId}. Invalid store credentials.`);
        return NextResponse.json({ success: false, message: 'Invalid store credentials.' }, { status: 401 });
      }
    } else {
      console.warn(`${routeNamePrefix} Invalid login type: ${loginType}.`);
      return NextResponse.json({ success: false, message: 'Invalid login type specified.' }, { status: 400 });
    }

    if (authenticatedUser) {
      const { password: _, ...userWithoutPassword } = authenticatedUser;
      console.log(`${routeNamePrefix} Authentication successful for ${authenticatedUser.role} ${authenticatedUser.email || authenticatedUser.employeeId}. Returning user data and token.`);
      return NextResponse.json({
        success: true,
        token: SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE,
        user: userWithoutPassword,
      });
    } else {
      console.warn(`${routeNamePrefix} Authentication failed for loginType: ${loginType}. Credentials did not match or user not found.`);
      return NextResponse.json({ success: false, message: 'Invalid credentials or user not found.' }, { status: 401 });
    }

  } catch (error) {
    console.error(`${routeNamePrefix} Critical error during login process:`, error);
    const message = error instanceof Error ? error.message : 'An unexpected internal server error occurred during login.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
