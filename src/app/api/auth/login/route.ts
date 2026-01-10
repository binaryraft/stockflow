
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { User, Store } from '@/types';
import bcrypt from 'bcryptjs';

const SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE_V2";
const routeNamePrefix = "[API_AUTH_LOGIN /api/auth/login]";

export async function POST(req: NextRequest) {
  console.log(`${routeNamePrefix} Received login request.`);
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const { loginType, email, password, employeeId, companyId, storeId, storePasskey } = body;

    if (!loginType) {
      console.warn(`${routeNamePrefix} Login type is required.`);
      return NextResponse.json({ success: false, message: 'Login type is required.' }, { status: 400 });
    }

    let authenticatedUser: User | null = null;
    let authenticatedStore: Store | null = null;

    if (loginType === 'admin') {
      if (!email || !password) {
        console.warn(`${routeNamePrefix} Email and password are required for admin login.`);
        return NextResponse.json({ success: false, message: 'Email and password are required for admin login.' }, { status: 400 });
      }
      const userToVerify = await db.collection<User>('users').findOne({ role: 'admin', email: email.toLowerCase() });
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
      const userToVerify = await db.collection<User>('users').findOne({ role: 'employee', employeeId: employeeId, companyId: companyId });
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
      const { adminEmail, storeUsername, storePasskey } = body;

      if (!adminEmail || !storeUsername || !storePasskey) {
        console.warn(`${routeNamePrefix} Admin Email, Store Username, and Store Passkey are required.`);
        return NextResponse.json({ success: false, message: 'Admin Email, Store Username, and Store Passkey are required.' }, { status: 400 });
      }

      // 1. Find Admin User to get Company ID
      const adminUser = await db.collection<User>('users').findOne({ role: 'admin', email: adminEmail.toLowerCase() });
      if (!adminUser) {
        console.warn(`${routeNamePrefix} Admin user not found with email: ${adminEmail}.`);
        // Security best practice: Don't reveal strict user existence, but here for debugging/UX in internal tool:
        return NextResponse.json({ success: false, message: 'Invalid Admin Email.' }, { status: 404 });
      }

      const companyId = adminUser.companyId;

      // 2. Find the Store by Username and Company ID
      authenticatedStore = await db.collection<Store>('stores').findOne({ companyId: companyId, username: storeUsername });

      if (!authenticatedStore) {
        console.warn(`${routeNamePrefix} Store not found with Username: ${storeUsername} in company ${companyId}.`);
        return NextResponse.json({ success: false, message: 'Invalid Store Username.' }, { status: 404 });
      }

      // 3. Verify Store Passkey
      // Note: Store passkey is stored as plain text or simple string in 'passkey' field based on current schema. 
      // Ideally should be hashed, but keeping consistent with existing pattern which seemed to treat it as a shared secret.
      // If it should be hashed, we would use bcrypt.compareSync. But typically 'passkey' suggests a simpler code. 
      // The store form saves it directly. 
      if (authenticatedStore.passkey !== storePasskey) {
        console.warn(`${routeNamePrefix} Invalid passkey for store ${authenticatedStore.id}.`);
        return NextResponse.json({ success: false, message: 'Invalid Store Passkey.' }, { status: 401 });
      }

      console.log(`${routeNamePrefix} Store terminal ${authenticatedStore.id} authenticated.`);

      // Return success with store details
      // We don't return a specific user object since this is terminal processing. 
      // The frontend might need a dummy user or just handle store session. 
      // I will return a placeholder user object representing the "Store Terminal" if needed by frontend consistency.

      const terminalUser = {
        id: `terminal_${authenticatedStore.id}`,
        name: `${authenticatedStore.name} Terminal`,
        role: 'employee', // Treat as employee role for permission purposes in frontend?
        companyId: authenticatedStore.companyId
      };

      return NextResponse.json({
        success: true,
        message: `Welcome to ${authenticatedStore.name}. Terminal Authenticated.`,
        store: {
          id: authenticatedStore.id,
          name: authenticatedStore.name,
          companyId: authenticatedStore.companyId,
          location: authenticatedStore.location,
          allowedOperations: authenticatedStore.allowedOperations,
        },
        user: terminalUser
      });

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
