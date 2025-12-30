
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
      const { storeAccessCode, employeeId, employeePasskey } = body;

      if (!storeAccessCode || !employeeId || !employeePasskey) {
        console.warn(`${routeNamePrefix} Store Access Code, Employee ID, and Password are required.`);
        return NextResponse.json({ success: false, message: 'Store Access Code, Employee ID, and Password are required.' }, { status: 400 });
      }

      // 1. Find the Store by Access Code (Global Unique 6-digit)
      authenticatedStore = await db.collection<Store>('stores').findOne({ accessCode: storeAccessCode });

      if (!authenticatedStore) {
        console.warn(`${routeNamePrefix} Store not found with Access Code: ${storeAccessCode}.`);
        return NextResponse.json({ success: false, message: 'Invalid Store Access Code.' }, { status: 404 });
      }

      // 2. Find the Employee in the same company
      const employee = await db.collection<User>('users').findOne({
        role: 'employee',
        employeeId: employeeId,
        companyId: authenticatedStore.companyId
      });

      if (!employee) {
        console.warn(`${routeNamePrefix} Employee ${employeeId} not found in company ${authenticatedStore.companyId}.`);
        return NextResponse.json({ success: false, message: 'Invalid Employee ID.' }, { status: 401 });
      }

      // 3. Authenticate Employee (Passkey/Password)
      // Check if employee has password and it matches
      if (!employee.password || !bcrypt.compareSync(employeePasskey, employee.password)) {
        console.warn(`${routeNamePrefix} Invalid passkey for employee ${employeeId}.`);
        return NextResponse.json({ success: false, message: 'Invalid Employee Passkey.' }, { status: 401 });
      }

      // 4. Authorization: Check if Employee is allowed in this store
      // Logic: If allowedStaffIds is defined and not empty, user MUST be in it.
      // If allowedStaffIds is empty, we might allow all? Or allow none?
      // Default is strictly allowed list.
      // However, typical business logic: if list is empty, maybe only Admin/Owner? But `employee` role implies restricted.
      // Let's assume strict: Must be in allowedStaffIds.

      const isAllowed = authenticatedStore.allowedStaffIds && authenticatedStore.allowedStaffIds.includes(employee.id);

      if (!isAllowed) {
        console.warn(`${routeNamePrefix} Employee ${employee.name} (${employee.id}) not authorized for store ${authenticatedStore.name}.`);
        return NextResponse.json({ success: false, message: 'You are not authorized to access this store terminal.' }, { status: 403 });
      }

      console.log(`${routeNamePrefix} Store terminal ${authenticatedStore.id} authenticated by employee ${employee.id}.`);

      // Return success with store details
      return NextResponse.json({
        success: true,
        message: `Welcome, ${employee.name}. Terminal Authenticated.`,
        store: {
          id: authenticatedStore.id,
          name: authenticatedStore.name,
          companyId: authenticatedStore.companyId,
          location: authenticatedStore.location,
          allowedOperations: authenticatedStore.allowedOperations,
        },
        user: {
          id: employee.id,
          name: employee.name,
          role: employee.role
        }
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
